const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const db = new Database('database.db');
const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function syncAll() {
  console.log('--- SYNCING CATEGORIES ---');
  const categories = db.prepare('SELECT * FROM categories').all();
  for (const cat of categories) {
    await supabase.from('categories').upsert(cat, { onConflict: 'id' });
  }
  console.log(`Synced ${categories.length} categories.`);

  console.log('--- SYNCING SUBCATEGORIES ---');
  const subcategories = db.prepare('SELECT * FROM subcategories').all();
  for (const subcat of subcategories) {
    await supabase.from('subcategories').upsert(subcat, { onConflict: 'id' });
  }
  console.log(`Synced ${subcategories.length} subcategories.`);

  console.log('--- SYNCING EVENTS ---');
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const events = db.prepare('SELECT * FROM events').all();
  const formattedEvents = events
    .filter(e => uuidRegex.test(e.id))
    .map(e => ({
      ...e,
      restrictions: e.restrictions ? JSON.parse(e.restrictions) : null,
      dias_semana: e.dias_semana ? JSON.parse(e.dias_semana) : [],
      form_fields: e.form_fields ? JSON.parse(e.form_fields) : []
    }));

  const { error } = await supabase.from('events').upsert(formattedEvents, { onConflict: 'id' });
  if (error) console.error('Error syncing events:', error);
  else console.log(`Synced ${formattedEvents.length} events.`);
}

syncAll();
