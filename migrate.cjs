const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrate() {
  console.log('Iniciando migracao...');

  const afterId = 'f5774373-5f37-447a-8d6d-560a0f6d18e9';

  // 1. Pegar categorias que sao materias (criadas no dia 15)
  const { data: categories } = await supabase.from('categories').select('*');
  const subjectCategories = categories.filter(c => c.created_at.includes('2026-07-15'));
  
  console.log(`Encontradas ${subjectCategories.length} categorias para migrar.`);

  for (const subject of subjectCategories) {
    // 2. Criar subcategoria
    let { data: subcat, error: errSub } = await supabase.from('subcategories').insert({
      name: subject.name,
      category_id: afterId
    }).select().single();
    
    if (errSub) {
      console.log('Erro ao criar subcategoria', subject.name, errSub);
      // Se ja existe, pega o ID
      const { data: existing } = await supabase.from('subcategories')
        .select('*')
        .eq('name', subject.name)
        .eq('category_id', afterId)
        .single();
        
      if (existing) {
        subcat = existing;
      } else {
        continue;
      }
    } else {
      console.log(`Subcategoria criada: ${subject.name}`);
    }

    // 3. Atualizar eventos que tem esse category_id
    const { data: events, error: errEvts } = await supabase.from('events')
      .update({ category_id: afterId, subcategory_id: subcat.id })
      .eq('category_id', subject.id)
      .select();
      
    console.log(`Atualizados ${events ? events.length : 0} eventos para subcategoria ${subject.name}`);
    
    // 4. Deletar a categoria original
    await supabase.from('categories').delete().eq('id', subject.id);
  }
  
  // Update ALL events to enable_autocomplete = true
  const { error: errAuto } = await supabase.from('events').update({ enable_autocomplete: true }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (errAuto) {
    console.error('Erro ao atualizar autocomplete', errAuto);
  } else {
    console.log('Autocomplete ativado em todos os eventos.');
  }

  console.log('Migracao concluida!');
}

migrate();
