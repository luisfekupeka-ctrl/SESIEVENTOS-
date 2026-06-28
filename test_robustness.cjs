require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runTests() {
  console.log("=== INICIANDO TESTE DE ROBUSTEZ E ALTO FLUXO (2000 CLIQUES) ===");

  // 1. Setup Categorias e Eventos
  const { data: cat } = await s.from('categories').select('id').limit(1);
  if (!cat || cat.length === 0) {
    console.log("Nenhuma categoria encontrada.");
    return;
  }
  const catId = cat[0].id;

  // Criar 2 eventos de teste para Escolha Única
  const { data: events, error: errEvents } = await s.from('events').insert([
    {
      name: 'Teste Futsal Segunda',
      description: 'Teste',
      start_date: '2026-07-01',
      start_time: '14:00',
      end_time: '16:00',
      max_capacity: 50,
      registration_count: 0,
      
      
      category_id: catId,
      restringir_duplicidade: 1,
      restrictions: { type: 'years', values: ['6º Ano EF'] }
    },
    {
      name: 'Teste Futsal Quarta',
      description: 'Teste',
      start_date: '2026-07-03',
      start_time: '14:00',
      end_time: '16:00',
      max_capacity: 50,
      registration_count: 0,
      
      
      category_id: catId,
      restringir_duplicidade: 1,
      restrictions: { type: 'years', values: ['6º Ano EF'] }
    }
  ]).select('id, name');

  if (errEvents || !events || events.length < 2) {
    console.log("Erro ao criar eventos de teste", errEvents);
    return;
  }

  const evSegunda = events[0].id;
  const evQuarta = events[1].id;
  console.log(`Eventos de teste criados: \nSegunda ID: ${evSegunda}\nQuarta ID: ${evQuarta}`);

  // 2. Teste Extremo de Carga: 2000 inscrições simultâneas no Evento 1
  console.log("\n--- INICIANDO TESTE 1: 2000 INSCRIÇÕES SIMULTÂNEAS ---");
  const promises = [];
  // Para evitar esgotar a porta local, vamos processar em pequenos lotes assíncronos,
  // mas disparados todos no mesmo tick para simular carga no servidor
  for (let i = 0; i < 2000; i++) {
    promises.push(
      s.rpc('register_participant', {
        p_event_id: evSegunda,
        p_student_name: `Carga${i}`,
        p_student_surname: `CargaSurname${i}`,
        p_student_grade: '6º Ano EF',
        p_student_class: 'A',
        p_participant_type: 'student',
        p_form_data: { nome: `Carga${i}` }
      })
    );
  }

  console.log("Todas as 2000 requisições foram disparadas. Aguardando processamento do banco...");
  const results = await Promise.all(promises);
  
  let successCount = 0;
  let failCount = 0;
  let blockCount = 0;
  
  results.forEach(res => {
    if (res.data && res.data.success) {
      successCount++;
    } else {
      if (res.data?.error === 'Evento lotado') {
         blockCount++;
      } else {
         failCount++;
      }
    }
  });

  const { data: finalEvent } = await s.from('events').select('registration_count').eq('id', evSegunda).single();

  console.log(`\nRESULTADOS TESTE DE 2000 CLIQUES:`);
  console.log(`✅ Inscrições aceitas (Limite era 50): ${successCount}`);
  console.log(`🛡️  Bloqueios corretos de lotação (Acima de 50): ${blockCount}`);
  console.log(`❌ Outras falhas: ${failCount}`);
  console.log(`📊 Contagem no Banco após teste: ${finalEvent.registration_count}`);
  
  if (finalEvent.registration_count === 50) {
    console.log("=> SUCESSO ABSOLUTO: O banco resistiu perfeitamente ao ataque de 2000 conexões e parou exatamente em 50 vagas!");
  } else {
    console.log("=> ALERTA: Houve vazamento ou travamento.");
  }

  // 3. Teste de Escolha Única Cruzada (O Aluno que conseguiu a vaga tenta se inscrever na Quarta)
  console.log("\n--- TESTE 2: VERIFICAR ESCOLHA ÚNICA (CATEGORIA) ---");
  // O aluno 'Carga0' provavelmente não conseguiu se a ordem foi aleatória.
  // Vamos buscar um que conseguiu.
  const { data: approved } = await s.from('registrations').select('student_id, students(name, surname)').eq('event_id', evSegunda).eq('status', 'approved').limit(1);
  if (approved && approved.length > 0) {
    const luckyStudent = approved[0].students;
    console.log(`Aluno aprovado na Segunda: ${luckyStudent.name} ${luckyStudent.surname}. Tentando inscrevê-lo na Quarta...`);
    
    const tryDuplicate = await s.rpc('register_participant', {
      p_event_id: evQuarta,
      p_student_name: luckyStudent.name,
      p_student_surname: luckyStudent.surname,
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: luckyStudent.name }
    });

    if (!tryDuplicate.data.success && tryDuplicate.data.error.includes('da mesma categoria')) {
      console.log(`✅ SUCESSO: O sistema BLOQUEOU corretamente a inscrição do aluno na Quarta-feira, respeitando a Escolha Única! (${tryDuplicate.data.error})`);
    } else {
      console.log(`❌ FALHA: O aluno conseguiu se inscrever de novo ou deu outro erro:`, tryDuplicate.data);
    }
  }

  // 4. Teste de Validação de Ano Escolar
  console.log("\n--- TESTE 3: VALIDAÇÃO DE SÉRIE ---");
  const tryWrongYear = await s.rpc('register_participant', {
      p_event_id: evQuarta,
      p_student_name: 'ErradoName',
      p_student_surname: 'ErradoSurname',
      p_student_grade: '9º Ano EF', // Evento é só para 6º Ano EF
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Errado' }
  });

  if (!tryWrongYear.data.success && tryWrongYear.data.error.includes('não pertence aos anos escolares permitidos')) {
      console.log(`✅ SUCESSO: Sistema bloqueou aluno do 9º Ano de se inscrever no Futsal do 6º Ano! (${tryWrongYear.data.error})`);
  } else {
      console.log(`❌ FALHA: O aluno conseguiu se inscrever:`, tryWrongYear.data);
  }

  // Cleanup
  await s.from('events').delete().in('id', [evSegunda, evQuarta]);
  console.log("\n=== TESTES CONCLUÍDOS E LIXO LIMPO ===");
}

runTests();
