const Database = require('better-sqlite3');
const db = new Database('./database.db');

const stmt = db.prepare(`
  INSERT OR REPLACE INTO events (
    id, name, category_id, subcategory_id, description, image_url,
    start_date, start_time, end_date, end_time, restrictions,
    password_protected, max_capacity, registration_count, form_fields,
    enable_autocomplete, is_paid, restringir_duplicidade, restringir_dias,
    dias_semana, limitar_vagas_por_ano, vagas_por_ano
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

stmt.run(
  '6e58ddd7-162e-43c3-80e5-ac47ce671b94',
  'Cosmética EM',
  'f5774373-5f37-447a-8d6d-560a0f6d18e9',
  'fbcc6597-3863-422a-aecb-8d9a6ab00588',
  'Ministrado pela professora Gabrielle, o After Cosmética é voltado ao estudo e à prática do desenvolvimento de produtos cosméticos.',
  'https://ecuifnclxvozwdbprnvy.supabase.co/storage/v1/object/public/events/1784222090982-wbggni.png',
  '2026-07-27',
  '10:00',
  '2026-08-01',
  '08:00',
  JSON.stringify({ type: 'years', values: ['1º Ano EM', '2º Ano EM', '3º Ano EM'] }),
  0,
  20,
  0,
  JSON.stringify([{ id: 'field_name', type: 'text', label: 'Nome completo', required: true }]),
  1,
  0,
  1,
  1,
  JSON.stringify(['Quarta']),
  1,
  JSON.stringify({ '1º Ano EM': 7, '2º Ano EM': 7, '3º Ano EM': 6 })
);

console.log('Cosmética EM inserted into SQLite successfully');
db.close();
