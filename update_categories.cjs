const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');
const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

const categoryMap = {
  'Artes Cênicas': ['Circo', 'Teatro'],
  'Música': ['Clube da Música', 'Musicalização', 'Violino'],
  'Idiomas': ['Conversação em Inglês', 'Karaokê in English', 'Passaporte Global'],
  'Artes Visuais': ['Cosmética', 'Creative Journaling', 'Desenho', 'Ilustração', 'Modelagem Plana', 'Quadrinhos'],
  'Artesanato': ['Crochê'],
  'Gastronomia': ['Culinária'],
  'Dança': ['Dança Terapia', 'K-POP', 'Street Jazz'],
  'Tecnologia': ['Desenho em Mesa Digital', 'Desenho Técnico', 'Geocraft', 'Microsoft Start', 'Programação com Scratch'],
  'Jogos e Estratégia': ['Futebol de Botão', 'RPG', 'Vintage Game', 'Xadrez'],
  'Esportes': ['Futsal', 'Muay Thai', 'Taekwondo', 'Tênis de Mesa', 'Vôlei'],
  'Apoio Acadêmico': ['Gabarita SESI'],
  'Ciências Humanas': ['Law School', 'Memórias Urbanas', 'Mini-MUN'],
  'Comunicação e Mídia': ['Produção Audiovisual'],
  'Robótica': ['Robótica'],
  'Bem-estar': ['Yoga']
};

async function run() {
  console.log('Fetching categories from Supabase...');
  const { data: currentCategories } = await supabase.from('categories').select('*');
  
  const catNameToId = {};
  for (const cat of (currentCategories || [])) {
    catNameToId[cat.name] = cat.id;
  }

  // Create missing categories
  const newCats = [];
  for (const catName of Object.keys(categoryMap)) {
    if (!catNameToId[catName]) {
      const id = crypto.randomUUID();
      catNameToId[catName] = id;
      newCats.push({ id, name: catName });
    }
  }

  if (newCats.length > 0) {
    console.log(`Inserting ${newCats.length} new categories...`);
    await supabase.from('categories').insert(newCats);
  }

  // Update events in local DB and prepare for Supabase
  console.log('Updating events...');
  const events = db.prepare('SELECT * FROM events').all();
  
  const updatedEvents = [];
  let updatedCount = 0;
  
  for (const event of events) {
    let matchedCatName = null;
    for (const [catName, eventNames] of Object.entries(categoryMap)) {
      if (eventNames.some(name => event.name.includes(name))) {
        matchedCatName = catName;
        break;
      }
    }

    const catId = matchedCatName ? catNameToId[matchedCatName] : null;
    if (catId) updatedCount++;
    
    // Update local (also end_time and end_date)
    db.prepare(`UPDATE events SET category_id = ?, end_date = '2026-08-01', end_time = '08:00' WHERE id = ?`).run(catId, event.id);
    
    updatedEvents.push({
      ...event,
      category_id: catId,
      end_date: '2026-08-01',
      end_time: '08:00',
      restrictions: event.restrictions ? JSON.parse(event.restrictions) : null,
      dias_semana: event.dias_semana ? JSON.parse(event.dias_semana) : [],
      form_fields: event.form_fields ? JSON.parse(event.form_fields) : []
    });
  }

  console.log(`Matched ${updatedCount} out of ${events.length} events to a category.`);
  console.log(`Syncing ${updatedEvents.length} events to Supabase...`);
  
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validEvents = updatedEvents.filter(e => uuidRegex.test(e.id));
  
  const { error } = await supabase.from('events').upsert(validEvents, { onConflict: 'id' });
  if (error) {
    console.error('Error syncing:', error);
  } else {
    console.log('Successfully synced events!');
  }
}

run();
