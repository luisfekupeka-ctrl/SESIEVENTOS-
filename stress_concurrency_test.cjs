require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function runConcurrencyStressTest() {
  console.log('================================================================');
  console.log('⚡ TESTE DE CARGA E CONCORRÊNCIA: INSCRIÇÕES EM MASSA SIMULTÂNEAS');
  console.log('================================================================\n');

  // 1. Temporarily disable display mode so test requests are accepted
  const { data: displaySetting } = await supabase.from('system_settings').select('*').eq('key', 'display_mode').single();
  const originalDisplay = displaySetting?.value;
  await supabase.from('system_settings').update({ value: { enabled: false } }).eq('key', 'display_mode');

  // 2. Fetch category
  const { data: cats } = await supabase.from('categories').select('id').limit(1);
  const catId = cats[0].id;

  // 3. Create test event with 6 male spots, 4 female spots (Total = 10 spots)
  const testEventName = 'STRESS_TEST_MASS_REG_' + Date.now();
  const { data: event, error: evErr } = await supabase
    .from('events')
    .insert({
      name: testEventName,
      category_id: catId,
      description: 'Teste de estresse concorrente',
      max_capacity: 10,
      registration_count: 0,
      limitar_vagas_genero: 1,
      vagas_masculino: 6,
      vagas_feminino: 4,
      enable_autocomplete: true
    })
    .select('*')
    .single();

  if (evErr || !event) {
    console.error('❌ Falha ao criar evento de estresse:', evErr);
    await supabase.from('system_settings').update({ value: originalDisplay }).eq('key', 'display_mode');
    return;
  }

  const eventId = event.id;
  console.log(`✅ Evento de teste criado: "${testEventName}" (Capacidade: 10 | 6 Masc. | 4 Fem.)`);

  try {
    // 4. Fetch students from database (males and females)
    const { data: students } = await supabase
      .from('students')
      .select('*')
      .eq('type', 'student')
      .not('gender', 'is', null);

    const maleStudents = students.filter(s => s.gender?.toLowerCase().includes('masc'));
    const femaleStudents = students.filter(s => s.gender?.toLowerCase().includes('fem'));

    console.log(`📊 Base carregada: ${maleStudents.length} alunos masculinos, ${femaleStudents.length} alunas femininas.`);

    // Prepare 15 male registration requests and 10 female registration requests (25 total concurrent requests)
    const testMales = maleStudents.slice(0, 15);
    const testFemales = femaleStudents.slice(0, 10);

    const requests = [
      ...testMales.map(s => ({
        params: {
          p_event_id: eventId,
          p_student_name: s.name,
          p_student_surname: s.surname || '',
          p_student_grade: s.grade || '6º Ano EF',
          p_student_class: s.class || 'A',
          p_participant_type: 'student',
          p_form_data: { nome: `${s.name} ${s.surname || ''}`.trim(), status: 'approved' }
        },
        gender: 'Masculino'
      })),
      ...testFemales.map(s => ({
        params: {
          p_event_id: eventId,
          p_student_name: s.name,
          p_student_surname: s.surname || '',
          p_student_grade: s.grade || '6º Ano EF',
          p_student_class: s.class || 'A',
          p_participant_type: 'student',
          p_form_data: { nome: `${s.name} ${s.surname || ''}`.trim(), status: 'approved' }
        },
        gender: 'Feminino'
      }))
    ];

    console.log(`\n🚀 Disparando ${requests.length} requisições de inscrição SIMULTÂNEAS (Promise.all)...`);
    const startTime = Date.now();

    const results = await Promise.all(
      requests.map(req =>
        supabase.rpc('register_participant', req.params).then(res => ({
          req,
          data: res.data,
          error: res.error
        }))
      )
    );

    const elapsed = Date.now() - startTime;
    console.log(`⏱️ Tempo total de processamento: ${elapsed}ms (${(elapsed / requests.length).toFixed(1)}ms por requisição)\n`);

    const successes = results.filter(r => r.data?.success);
    const rejections = results.filter(r => !r.data?.success);

    const maleApproved = successes.filter(r => r.req.gender === 'Masculino').length;
    const femaleApproved = successes.filter(r => r.req.gender === 'Feminino').length;

    console.log('--- DETALHES DE REJEIÇÕES ---');
    rejections.forEach(r => {
      console.log(`- ${r.req.gender} (${r.req.params.p_student_name} ${r.req.params.p_student_surname}): ${r.data?.error || r.error?.message}`);
    });
    console.log('--- RESULTADOS DA EXECUÇÃO CONCORRENTE ---');
    console.log(`✅ Inscrições aceitas com sucesso: ${successes.length} / 10`);
    console.log(`   - Homens aceitos: ${maleApproved} / 6 vagas`);
    console.log(`   - Mulheres aceitas: ${femaleApproved} / 4 vagas`);
    console.log(`🚫 Inscrições rejeitadas por limite/lotação: ${rejections.length} / 15\n`);

    // Verify database counts
    const { data: finalEvent } = await supabase.from('events').select('registration_count').eq('id', eventId).single();
    const { data: dbRegistrations } = await supabase.from('registrations').select('id').eq('event_id', eventId);

    console.log('--- VERIFICAÇÃO DE INTEGRIDADE NO BANCO DE DADOS ---');
    console.log(`📊 events.registration_count: ${finalEvent.registration_count}`);
    console.log(`📊 Total de linhas em registrations: ${dbRegistrations.length}`);

    const isCapacityCorrect = finalEvent.registration_count === 10 && dbRegistrations.length === 10;
    const isGenderCorrect = maleApproved === 6 && femaleApproved === 4;

    if (isCapacityCorrect && isGenderCorrect) {
      console.log('\n🏆 SUCESSO ABSOLUTO: NENHUM OVERBOOKING OU RACE CONDITION OCORREU!');
    } else {
      console.error('\n❌ FALHA: Houve divergência de contagem ou overbooking!');
    }

  } finally {
    // Cleanup
    console.log('\n🧹 Limpando dados temporários do teste de estresse...');
    await supabase.from('registrations').delete().eq('event_id', eventId);
    await supabase.from('events').delete().eq('id', eventId);
    await supabase.from('system_settings').update({ value: originalDisplay }).eq('key', 'display_mode');
    console.log('✅ Ambiente restaurado.');
  }
}

runConcurrencyStressTest();
