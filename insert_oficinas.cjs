const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const OFICINA_CATEGORY_ID = '15b916e0-c7ea-404e-8c9f-b257d1733a50';

const eventsToCreate = [
  { name: 'InterAction', desc: '6A • 6B', grade: '6º Ano EF' },
  { name: 'Legacy', desc: '6C • 6D', grade: '6º Ano EF' },
  { name: 'Wellness', desc: '7A • 7B', grade: '7º Ano EF' },
  { name: '(R)Evolution', desc: '7C • 7D', grade: '7º Ano EF' },
  { name: 'Boo and the Fear Industry', desc: '8A • 8B', grade: '8º Ano EF' },
  { name: 'Knights and Robots', desc: '8C • 8D', grade: '8º Ano EF' },
  { name: 'Arrivals', desc: '9A • 9B', grade: '9º Ano EF' },
  { name: 'Departures', desc: '9C • 9D', grade: '9º Ano EF' },
];

async function insertEvents() {
  for (const ev of eventsToCreate) {
    const eventData = {
      id: crypto.randomUUID(),
      name: ev.name,
      description: ev.desc,
      category_id: OFICINA_CATEGORY_ID,
      restrictions: { type: 'years', values: [ev.grade] },
      is_hidden: 0,
      max_capacity: 0,
      registration_count: 0,
      password_protected: false,
      enable_autocomplete: true,
      is_paid: 0,
      restringir_duplicidade: 0,
      limitar_vagas_por_ano: 0,
      limitar_vagas_genero: 0,
      vagas_masculino: 0,
      vagas_feminino: 0
    };

    const { error } = await supabase.from('events').insert(eventData);
    if (error) {
      console.error('Error inserting', ev.name, error);
    } else {
      console.log('Inserted', ev.name);
    }
  }
}

insertEvents();
