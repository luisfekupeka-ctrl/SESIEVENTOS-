require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function run() {
  const { data: cat } = await s.from('categories').select('id').limit(1);
  const catId = cat[0].id;

  const { data: events } = await s.from('events').insert([
    { name: 'EV1', max_capacity: 10, category_id: catId, restringir_duplicidade: 1 },
    { name: 'EV2', max_capacity: 10, category_id: catId, restringir_duplicidade: 1 }
  ]).select('id, subcategory_id');

  const ev1 = events[0].id;
  const ev2 = events[1].id;
  console.log("Events:", events);

  // Register on EV1
  const r1 = await s.rpc('register_participant', {
    p_event_id: ev1, p_student_name: 'Bug', p_student_surname: 'Test', p_student_grade: '6º Ano EF', p_student_class: 'A', p_participant_type: 'student', p_form_data: {}
  });
  console.log("R1:", r1.data);

  // Register on EV2
  const r2 = await s.rpc('register_participant', {
    p_event_id: ev2, p_student_name: 'Bug', p_student_surname: 'Test', p_student_grade: '6º Ano EF', p_student_class: 'A', p_participant_type: 'student', p_form_data: {}
  });
  console.log("R2:", r2.data);

  // delete().in('id', [ev1, ev2]);
}
run();
