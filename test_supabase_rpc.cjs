require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
  console.log("Fetching an active event...");
  const { data: events } = await s.from('events').select('id, name, max_capacity, registration_count').order('created_at', {ascending: false}).limit(2);
  if (!events || events.length === 0) {
    console.log("No events found.");
    return;
  }
  
  const eventId = events[0].id;
  console.log(`Testing concurrency on event ${events[0].name} (ID: ${eventId}) with capacity ${events[0].max_capacity} and current registrations ${events[0].registration_count}`);

  console.log("\n--- TEST 1: Same Event Concurrency (100 simultaneous requests) ---");
  const promises = [];
  for (let i = 0; i < 100; i++) {
    promises.push(
      s.rpc('register_participant', {
        p_event_id: eventId,
        p_student_name: `TestName${i}`,
        p_student_surname: `TestSurname${i}`,
        p_student_grade: '6º Ano EF',
        p_student_class: 'A',
        p_participant_type: 'student',
        p_form_data: { nome: `TestName${i}`, sobrenome: `TestSurname${i}`, status: 'approved' }
      })
    );
  }
  
  const results = await Promise.all(promises);
  let successCount = 0;
  let failCount = 0;
  let errors = new Set();
  
  results.forEach(res => {
    if (res.data && res.data.success) {
      successCount++;
    } else {
      failCount++;
      if (res.data?.error) errors.add(res.data.error);
      if (res.error) errors.add(res.error.message);
    }
  });
  
  console.log(`Sucessos: ${successCount}`);
  console.log(`Falhas (Bloqueados pelo BD): ${failCount}`);
  console.log(`Erros observados:`, Array.from(errors));

  const { data: finalEvent } = await s.from('events').select('registration_count').eq('id', eventId).single();
  console.log(`Contagem real no BD após o teste: ${finalEvent.registration_count}`);
  
}

runTests();
