
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://ecuifnclxvozwdbprnvy.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0";
const EVENT_ID = "10e2023c-a69b-4c41-a14d-25bbf153355f";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function runTest(count: number) {
  console.log(`Starting stress test: ${count} simultaneous registrations...`);
  const startTime = Date.now();
  
  const promises = [];
  for (let i = 0; i < count; i++) {
    const name = `Test`;
    const surname = `Student ${i}`;
    const grade = "9º Ano EF";
    const className = "A";
    
    promises.push(
      supabase.rpc('register_participant', {
        p_event_id: EVENT_ID,
        p_student_name: name,
        p_student_surname: surname,
        p_student_grade: grade,
        p_student_class: className,
        p_participant_type: 'student',
        p_form_data: { nome: name, sobrenome: surname, série: grade, turma: className }
      }).then(res => {
        if (res.error) return { success: false, error: res.error.message };
        return { success: res.data?.success, error: res.data?.error };
      })
    );
  }

  const results = await Promise.all(promises);
  const duration = (Date.now() - startTime) / 1000;
  
  const successes = results.filter(r => r.success).length;
  const failures = results.filter(r => !r.success);
  
  console.log(`--- Stress Test Report ---`);
  console.log(`Total: ${count}`);
  console.log(`Success: ${successes}`);
  console.log(`Failures: ${failures.length}`);
  console.log(`Duration: ${duration.toFixed(2)}s`);
  
  if (failures.length > 0) {
    console.log(`Sample error: ${failures[0].error}`);
  }
}

runTest(1000); // Testing with 1000 for final validation
