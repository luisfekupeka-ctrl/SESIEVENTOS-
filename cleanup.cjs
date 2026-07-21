const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanup() {
  console.log('Cleaning up all test data...');
  
  // Delete all registrations to be safe (since the system was at 0 before the test)
  await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  // Delete all test students
  const { error: err1 } = await supabase.from('students').delete().like('name', 'StressTester_%');
  if (err1) console.error(err1);
  const { error: err2 } = await supabase.from('students').delete().eq('surname', 'Bot');
  if (err2) console.error(err2);
  
  // Reset all events to 0
  const { error: err3 } = await supabase.from('events').update({ registration_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (err3) console.error(err3);
  
  console.log('Verifying cleanup...');
  const { data: events } = await supabase.from('events').select('name, registration_count');
  
  const notZero = events.filter(e => e.registration_count !== 0);
  if (notZero.length > 0) {
    console.log(`Failed! ${notZero.length} events are not at 0.`);
  } else {
    console.log(`Success! All ${events.length} events have exactly 0 registrations.`);
  }
}

cleanup();
