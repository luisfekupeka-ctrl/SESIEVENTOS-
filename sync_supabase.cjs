const Database = require('better-sqlite3');
const { createClient } = require('@supabase/supabase-js');

const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');
const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

// Basic UUID regex
const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function sync() {
  const events = db.prepare('SELECT * FROM events').all();
  
  // Transform events for Supabase if needed (parse JSON strings)
  const formattedEvents = events
    .filter(e => uuidRegex.test(e.id))
    .map(e => {
      return {
        ...e,
        restrictions: e.restrictions ? JSON.parse(e.restrictions) : null,
        dias_semana: e.dias_semana ? JSON.parse(e.dias_semana) : [],
        form_fields: e.form_fields ? JSON.parse(e.form_fields) : []
      };
    });

  console.log(`Syncing ${formattedEvents.length} valid UUID events to Supabase...`);

  // Insert or upsert
  const { data, error } = await supabase.from('events').upsert(formattedEvents, { onConflict: 'id' });
  
  if (error) {
    console.error('Error syncing to Supabase:', error);
  } else {
    console.log('Successfully synced events to Supabase!');
  }
}

sync();
