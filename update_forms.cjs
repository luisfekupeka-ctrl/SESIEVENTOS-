const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://ecuifnclxvozwdbprnvy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVjdWlmbmNseHZvendkYnBybnZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM2MDIzNDAsImV4cCI6MjA4OTE3ODM0MH0.ZAuhm9F9hxAuj-X77hf90oteIldsrtFXVuYrHv3BLv0';
const supabase = createClient(supabaseUrl, supabaseKey);

async function updateForms() {
  const standardFields = [
    {
      id: "field_name",
      label: "Nome completo",
      type: "text",
      required: true
    },
    {
      id: "field_grade",
      label: "Série",
      type: "select",
      options: ["6º Ano EF", "7º Ano EF", "8º Ano EF", "9º Ano EF", "1º Ano EM", "2º Ano EM", "3º Ano EM"],
      required: true
    },
    {
      id: "field_class",
      label: "Turma",
      type: "select",
      options: ["A", "B", "C", "D", "E"],
      required: true
    }
  ];

  console.log('Atualizando todos os eventos para o novo padrao de formulario...');
  
  const { data, error } = await supabase.from('events').update({
    form_fields: standardFields
  }).neq('id', '00000000-0000-0000-0000-000000000000').select();
  
  if (error) {
    console.error('Erro ao atualizar eventos:', error);
  } else {
    console.log(`Sucesso! ${data.length} eventos foram atualizados.`);
  }
}

updateForms();
