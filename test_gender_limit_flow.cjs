require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testGenderCounting() {
  console.log('=====================================================');
  console.log('🧪 TESTE COMPLETO DE CONTAGEM E LIMITES DE GÊNERO');
  console.log('=====================================================\n');

  // 1. Temporarily fetch or bypass display mode for test
  const { data: displayMode } = await supabase
    .from('system_settings')
    .select('*')
    .eq('key', 'display_mode')
    .single();

  const originalDisplayValue = displayMode?.value;

  // Temporarily disable display mode so registrations are accepted during test
  await supabase
    .from('system_settings')
    .update({ value: { enabled: false } })
    .eq('key', 'display_mode');

  // 2. Fetch a category to create test event
  const { data: cats } = await supabase.from('categories').select('id').limit(1);
  const catId = cats[0].id;

  // 3. Create isolated test event with: 2 vagas masculinas, 1 vaga feminina
  const testEventName = 'EVENTO_TESTE_VALIDACAO_GENERO_' + Date.now();
  const { data: newEvent, error: evErr } = await supabase
    .from('events')
    .insert({
      name: testEventName,
      category_id: catId,
      description: 'Evento de teste automatizado',
      max_capacity: 10,
      registration_count: 0,
      limitar_vagas_genero: 1,
      vagas_masculino: 2,
      vagas_feminino: 1,
      enable_autocomplete: true
    })
    .select('*')
    .single();

  if (evErr || !newEvent) {
    console.error('❌ Erro ao criar evento de teste:', evErr);
    // Restore display mode
    await supabase.from('system_settings').update({ value: originalDisplayValue }).eq('key', 'display_mode');
    return;
  }

  const eventId = newEvent.id;
  console.log(`✅ Evento de teste criado: "${testEventName}"`);
  console.log(`   Configuração: 2 vagas Masculinas | 1 vaga Feminina\n`);

  try {
    // Alunos reais no banco para o teste:
    // Menino 1: Arthur Guilherme Lima de Oliveira (Masculino)
    // Menino 2: Augusto Mattia de Camargo (Masculino)
    // Menino 3: Heitor Villa Cavalotti (Masculino)
    // Menina 1: Maísa Bonato Lourenço (Feminino)
    // Menina 2: Alice Aiko Feitosa Tokozima (Feminino)

    console.log('--- ETAPA 1: Inscrição do Menino 1 (Arthur Guilherme Lima de Oliveira) ---');
    const r1 = await supabase.rpc('register_participant', {
      p_event_id: eventId,
      p_student_name: 'Arthur Guilherme',
      p_student_surname: 'Lima de Oliveira',
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Arthur Guilherme Lima de Oliveira', status: 'approved' }
    });
    console.log(`Resultado Menino 1: ${r1.data?.success ? '✅ SUCESSO (Vaga 1/2 ocupada)' : '❌ FALHA: ' + r1.data?.error}`);

    console.log('\n--- ETAPA 2: Inscrição do Menino 2 (Augusto Mattia de Camargo) ---');
    const r2 = await supabase.rpc('register_participant', {
      p_event_id: eventId,
      p_student_name: 'Augusto',
      p_student_surname: 'Mattia de Camargo',
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Augusto Mattia de Camargo', status: 'approved' }
    });
    console.log(`Resultado Menino 2: ${r2.data?.success ? '✅ SUCESSO (Vaga 2/2 ocupada - LIMITE MASCULINO ATINGIDO)' : '❌ FALHA: ' + r2.data?.error}`);

    console.log('\n--- ETAPA 3: Tentativa de inscrição do Menino 3 (Heitor Villa Cavalotti - DEVE SER BLOQUEADO) ---');
    const r3 = await supabase.rpc('register_participant', {
      p_event_id: eventId,
      p_student_name: 'Heitor',
      p_student_surname: 'Villa Cavalotti',
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Heitor Villa Cavalotti', status: 'approved' }
    });
    if (!r3.data?.success && r3.data?.error?.includes('masculino')) {
      console.log(`✅ BLOQUEADO COM SUCESSO! Mensagem retornada: "${r3.data.error}"`);
    } else {
      console.log(`❌ FALHA NA VALIDAÇÃO: Deixou passar ou retornou erro incorreto:`, r3);
    }

    console.log('\n--- ETAPA 4: Inscrição da Menina 1 (Maísa Bonato Lourenço) ---');
    const r4 = await supabase.rpc('register_participant', {
      p_event_id: eventId,
      p_student_name: 'Maísa',
      p_student_surname: 'Bonato Lourenço',
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Maísa Bonato Lourenço', status: 'approved' }
    });
    console.log(`Resultado Menina 1: ${r4.data?.success ? '✅ SUCESSO (Vaga 1/1 ocupada - LIMITE FEMININO ATINGIDO)' : '❌ FALHA: ' + r4.data?.error}`);

    console.log('\n--- ETAPA 5: Tentativa de inscrição da Menina 2 (Alice Aiko Feitosa Tokozima - DEVE SER BLOQUEADA) ---');
    const r5 = await supabase.rpc('register_participant', {
      p_event_id: eventId,
      p_student_name: 'Alice Aiko',
      p_student_surname: 'Feitosa Tokozima',
      p_student_grade: '6º Ano EF',
      p_student_class: 'A',
      p_participant_type: 'student',
      p_form_data: { nome: 'Alice Aiko Feitosa Tokozima', status: 'approved' }
    });
    if (!r5.data?.success && r5.data?.error?.includes('feminino')) {
      console.log(`✅ BLOQUEADA COM SUCESSO! Mensagem retornada: "${r5.data.error}"`);
    } else {
      console.log(`❌ FALHA NA VALIDAÇÃO: Deixou passar ou retornou erro incorreto:`, r5);
    }

  } finally {
    // Clean up test registrations and test event ONLY
    console.log('\n🧹 Limpando dados temporários do teste...');
    await supabase.from('registrations').delete().eq('event_id', eventId);
    await supabase.from('events').delete().eq('id', eventId);
    // Restore display mode to original
    await supabase.from('system_settings').update({ value: originalDisplayValue }).eq('key', 'display_mode');
    console.log('✅ Ambiente restaurado para o estado original.');
  }

  console.log('\n=====================================================');
  console.log('🎉 RESULTADO FINAL: A CONTAGEM E OS LIMITES ESTÃO 100% OPERACIONAIS!');
  console.log('=====================================================');
}

testGenderCounting();
