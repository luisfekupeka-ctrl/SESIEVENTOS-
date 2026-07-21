const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function runStressTest() {
  console.log('Cleaning up old test data...');
  await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('students').delete().eq('surname', 'Bot');
  
  // Reset all events to 0
  await supabase.from('events').update({ registration_count: 0 }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('Fetching all events...');
  const { data: events, error } = await supabase.from('events').select('*');
  if (error) {
    console.error('Error fetching events:', error);
    return;
  }

  console.log(`Found ${events.length} events. Starting stress test...`);

  let totalStudentsCreated = 0;
  let totalRegistrationsCreated = 0;
  
  // Create all students and registrations in parallel promises
  const promises = events.map(async (event) => {
    const capacity = event.max_capacity || 20;
    const targetCount = Math.floor(capacity * 1.5); // 50% above limit
    
    // Create students
    const students = Array.from({ length: targetCount }).map((_, i) => ({
      id: crypto.randomUUID(),
      name: `StressTester_${crypto.randomUUID().substring(0, 8)}_${i}`,
      surname: 'Bot',
      grade: 'Misto',
      type: 'student'
    }));
    
    const { error: studentErr } = await supabase.from('students').insert(students);
    if (studentErr) {
      console.error('Error inserting students:', studentErr.message);
      return;
    }
    
    totalStudentsCreated += students.length;

    // Create registrations concurrently (bypassing any frontend checks)
    const registrations = students.map(s => ({
      event_id: event.id,
      student_id: s.id
    }));

    const { error: regErr } = await supabase.from('registrations').insert(registrations);
    if (regErr) {
      console.error('Error inserting registrations:', regErr.message);
      return;
    }
    
    totalRegistrationsCreated += registrations.length;

    // Increment registration count (simulating frontend)
    const { error: incErr } = await supabase.rpc('increment_registration_count', { 
      row_id: event.id, 
      increment_by: registrations.length 
    });
    
    // If the RPC is missing on Supabase, fallback to direct update
    if (incErr) {
      // Direct update
      await supabase.from('events').update({ 
        registration_count: (event.registration_count || 0) + registrations.length 
      }).eq('id', event.id);
    }
  });

  await Promise.all(promises);
  console.log(`Stress test complete! Created ${totalStudentsCreated} students and ${totalRegistrationsCreated} registrations.`);
  
  // Verify bypass
  const { data: verifyEvents } = await supabase.from('events').select('name, max_capacity, registration_count');
  const bypassed = verifyEvents.filter(e => e.registration_count > e.max_capacity);
  console.log(`\nResults: ${bypassed.length} events successfully bypassed capacity limits!`);
  if (bypassed.length > 0) {
    console.log(`Example bypassed event: ${bypassed[0].name} (Vagas: ${bypassed[0].max_capacity}, Inscritos: ${bypassed[0].registration_count})`);
  }
}

runStressTest();
