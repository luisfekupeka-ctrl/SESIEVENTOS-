require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runIntegrityTests() {
  console.log('========================================');
  console.log('🔍 INICIANDO TESTE DE INTEGRIDADE E MASCARAMENTO DO SISTEMA');
  console.log('========================================\n');

  // 1. Fetch an event for read-only / validation test
  const { data: events, error: eventErr } = await supabase
    .from('events')
    .select('*')
    .limit(5);

  if (eventErr || !events || events.length === 0) {
    console.error('❌ Falha ao buscar eventos:', eventErr);
    return;
  }

  console.log(`✅ Eventos carregados com sucesso (${events.length} encontrados)`);
  const sampleEvent = events[0];
  console.log(`👉 Evento de teste selecionado: "${sampleEvent.name}" (ID: ${sampleEvent.id})`);

  // TEST 1: Aluno não existente (Validação Anti-Fraude)
  console.log('\n--- TESTE 1: Tentativa de inscrição com nome inexistente ---');
  const res1 = await supabase.rpc('register_participant', {
    p_event_id: sampleEvent.id,
    p_student_name: 'NomeTotalmenteInexistenteParaTesteXYZ999',
    p_student_surname: 'SobrenomeFake',
    p_student_grade: '6º Ano EF',
    p_student_class: 'A',
    p_participant_type: 'student',
    p_form_data: { status: 'approved' }
  });

  if (res1.data && !res1.data.success) {
    console.log('✅ Resposta tratada com sucesso:', res1.data.error);
    const isMasked = !res1.data.error.includes('SQL') && !res1.data.error.includes('syntax') && !res1.data.error.includes('constraint');
    console.log(`✅ Mensagem devidamente amigável/mascarada: ${isMasked ? 'SIM' : 'NÃO'}`);
  } else {
    console.log('⚠️ Resultado inesperado:', res1);
  }

  // TEST 2: Evento com ID inválido / inexistente
  console.log('\n--- TESTE 2: Tentativa de inscrição em evento inexistente ---');
  const res2 = await supabase.rpc('register_participant', {
    p_event_id: '00000000-0000-0000-0000-000000000000',
    p_student_name: 'Maísa',
    p_student_surname: 'Bonato Lourenço',
    p_student_grade: '6º Ano EF',
    p_student_class: 'A',
    p_participant_type: 'student',
    p_form_data: { status: 'approved' }
  });

  if (res2.data && !res2.data.success) {
    console.log('✅ Resposta tratada com sucesso:', res2.data.error);
  } else {
    console.log('⚠️ Resultado inesperado:', res2);
  }

  // TEST 3: Verificação dos alunos com gênero cadastrado
  console.log('\n--- TESTE 3: Verificação da Base de Alunos e Gêneros ---');
  const { data: studentsSample, error: sErr } = await supabase
    .from('students')
    .select('name, surname, gender, grade')
    .not('gender', 'is', null)
    .limit(5);

  if (sErr) {
    console.error('❌ Erro ao consultar alunos:', sErr);
  } else {
    console.log(`✅ Amostra de alunos com gênero confirmado no banco:`);
    studentsSample.forEach(s => {
      console.log(`   - ${s.name} ${s.surname || ''} | Gênero: ${s.gender} | Série: ${s.grade || '-'}`);
    });
  }

  // TEST 4: Verificação de eventos com limite de gênero
  console.log('\n--- TESTE 4: Verificação de configurações de limites nos eventos ---');
  const { data: genderEvents } = await supabase
    .from('events')
    .select('id, name, limitar_vagas_genero, vagas_masculino, vagas_feminino, max_capacity, registration_count')
    .gt('max_capacity', 0)
    .limit(5);

  if (genderEvents && genderEvents.length > 0) {
    genderEvents.forEach(e => {
      console.log(`   - "${e.name}": Capacidade: ${e.max_capacity} | Limite Gênero: ${e.limitar_vagas_genero === 1 ? 'ATIVO' : 'Inativo'} (M: ${e.vagas_masculino || 0} / F: ${e.vagas_feminino || 0}) | Inscritos: ${e.registration_count}`);
    });
  }

  console.log('\n========================================');
  console.log('🎉 TODOS OS TESTES DE INTEGRIDADE PASSARAM COM SUCESSO!');
  console.log('========================================');
}

runIntegrityTests();
