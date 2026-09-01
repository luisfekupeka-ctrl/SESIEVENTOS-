require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const normalize = (str) => {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/\s+/g, ' ');
};

async function syncGenders() {
  console.log('Fetching students from Supabase...');
  const { data: students, error } = await supabase.from('students').select('*');
  if (error) {
    console.error('Error fetching students:', error);
    return;
  }
  console.log(`Fetched ${students.length} students from Supabase.`);

  const csvPath = path.join(__dirname, 'lista_alunos.csv');
  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');

  const genderMap = new Map();
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;
    const parts = line.split(/[\t;,]/);
    if (parts.length < 2) continue;
    const name = parts[0].trim();
    if (name.toLowerCase() === 'nome aluno') continue;
    const gender = parts[1].toLowerCase().includes('f') ? 'Feminino' : 'Masculino';
    genderMap.set(normalize(name), { rawName: name, gender });
  }

  let updatedCount = 0;
  let notFoundList = [];

  for (const s of students) {
    const fullName = normalize(`${s.name || ''} ${s.surname || ''}`);
    const nameOnly = normalize(s.name || '');
    
    let match = genderMap.get(fullName) || genderMap.get(nameOnly);
    if (match) {
      const { error: updateErr } = await supabase
        .from('students')
        .update({ gender: match.gender })
        .eq('id', s.id);
      if (updateErr) {
        console.error(`Error updating student ${s.id}:`, updateErr.message);
      } else {
        updatedCount++;
      }
    }
  }

  console.log(`Updated ${updatedCount} students in Supabase with gender.`);

  // Now check if any students from CSV are not in Supabase at all
  const existingNames = new Set(students.map(s => normalize(`${s.name || ''} ${s.surname || ''}`)));
  let insertedCount = 0;

  for (const [normName, info] of genderMap.entries()) {
    if (!existingNames.has(normName)) {
      notFoundList.push(info);
      const nameParts = info.rawName.split(/\s+/);
      const firstName = nameParts[0];
      const surname = nameParts.slice(1).join(' ');
      const { error: insertErr } = await supabase.from('students').insert({
        name: firstName,
        surname: surname,
        grade: '-',
        class: '-',
        type: 'student',
        gender: info.gender
      });
      if (insertErr) {
        console.error(`Error inserting missing student ${info.rawName}:`, insertErr.message);
      } else {
        insertedCount++;
      }
    }
  }

  console.log(`Inserted ${insertedCount} missing students to Supabase.`);
  console.log('Sync complete!');
}

syncGenders();
