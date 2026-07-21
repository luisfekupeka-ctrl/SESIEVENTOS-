const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);
const crypto = require('crypto');

async function runStressTest() {
  console.log('Iniciando Teste de Estresse V2...');
  
  // 1. Pegar todos os eventos
  const { data: events, error } = await supabase.from('events').select('*');
  if (error || !events) {
    console.error('Erro ao buscar eventos:', error);
    return;
  }
  
  console.log(`Encontrados ${events.length} eventos para testar.`);
  
  let successCount = 0;
  let blockedCount = 0;
  let duplicateSuccessCount = 0;
  let duplicateBlockedCount = 0;
  
  // Testar 5 eventos aleatórios para ser mais rápido e preciso
  const testEvents = events.slice(0, 5);

  const testPromises = testEvents.map(async (event) => {
    const capacity = event.max_capacity > 0 ? event.max_capacity : 5; // Se for infinito, usa 5
    const targetRegistrations = capacity + 2; // Tenta colocar +2 além do limite
    
    // CRIAR ALUNOS FAKES PARA O EVENTO
    const studentsToInsert = Array.from({ length: targetRegistrations }).map((_, i) => ({
      name: `StressTesterV2_${crypto.randomUUID().substring(0,8)}`,
      surname: 'Bot',
      grade: '8º Ano',
      created_at: new Date().toISOString()
    }));
    
    const { data: insertedStudents, error: stuErr } = await supabase
      .from('students')
      .insert(studentsToInsert)
      .select();
      
    if (stuErr || !insertedStudents) {
      console.log('Erro inserindo estudantes falsos:', stuErr);
      return;
    }
    
    // ---------------------------------------------------------
    // TESTE 1: BURLAR LIMITE DE VAGAS (com alunos diferentes)
    // ---------------------------------------------------------
    const registrationPromises = insertedStudents.map(student => {
      return supabase.from('registrations').insert({
        event_id: event.id,
        student_id: student.id,
        form_data: {}
      });
    });
    
    const results = await Promise.all(registrationPromises);
    
    let eventAccepted = 0;
    let eventBlocked = 0;
    
    results.forEach(res => {
      if (res.error) {
        eventBlocked++;
      } else {
        eventAccepted++;
      }
    });
    
    console.log(`[LIMITE] Evento "${event.name}" (Vagas: ${event.max_capacity}) -> Aceitos: ${eventAccepted}, Bloqueados: ${eventBlocked}`);
    
    // ---------------------------------------------------------
    // TESTE 2: BURLAR DUPLICIDADE (mesmo aluno via form_data sem student_id)
    // ---------------------------------------------------------
    // Tenta inserir a mesma pessoa 5 vezes ao mesmo tempo
    const duplicatePromises = Array.from({ length: 5 }).map(() => {
      return supabase.from('registrations').insert({
        event_id: event.id,
        student_id: null,
        form_data: { nome: 'Clone Maligno', 'nome completo': 'Clone Maligno' }
      });
    });
    
    const dupResults = await Promise.all(duplicatePromises);
    let dupAccepted = 0;
    let dupBlocked = 0;
    
    dupResults.forEach(res => {
      if (res.error) {
        dupBlocked++;
      } else {
        dupAccepted++;
      }
    });
    
    console.log(`[DUPLICIDADE] Evento "${event.name}" (Form_Data Clone) -> Aceitos: ${dupAccepted}, Bloqueados: ${dupBlocked}`);
  });

  await Promise.all(testPromises);
  console.log('Teste finalizado! Verifique o console acima para os resultados.');
}

runStressTest();
