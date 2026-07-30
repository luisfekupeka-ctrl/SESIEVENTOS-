const Database = require('better-sqlite3');
const db = new Database('./database.db');

console.log('\n====== INTEGRIDADE DO BANCO ======');
const integrity = db.prepare('PRAGMA integrity_check').get();
console.log('integrity_check:', integrity);

console.log('\n====== FOREIGN KEY CHECK ======');
db.prepare('PRAGMA foreign_keys = ON').run();
const fkErrors = db.prepare('PRAGMA foreign_key_check').all();
console.log('FK Errors:', fkErrors.length, fkErrors.length > 0 ? fkErrors : '(nenhum)');

console.log('\n====== CONTAGEM DE REGISTROS ======');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all();
tables.forEach(t => {
  try {
    const count = db.prepare('SELECT COUNT(*) as c FROM ' + t.name).get();
    console.log(`  ${t.name}: ${count.c} registros`);
  } catch(e) {
    console.log(`  ${t.name}: ERRO - ${e.message}`);
  }
});

console.log('\n====== EVENTOS ======');
const events = db.prepare('SELECT id, name, registration_count, max_capacity FROM events ORDER BY name').all();
events.forEach(e => {
  const pct = e.max_capacity > 0 ? Math.round((e.registration_count / e.max_capacity) * 100) : '-';
  console.log(`  ${e.name} | ${e.registration_count}/${e.max_capacity > 0 ? e.max_capacity : '∞'} inscritos (${pct === '-' ? 'sem limite' : pct + '%'})`);
});

console.log('\n====== CATEGORIAS ======');
const cats = db.prepare('SELECT c.id, c.name, COUNT(s.id) as subcats FROM categories c LEFT JOIN subcategories s ON s.category_id = c.id GROUP BY c.id ORDER BY c.name').all();
cats.forEach(c => console.log(`  [${c.id}] ${c.name} - ${c.subcats} subcategorias`));

console.log('\n====== ALUNOS ======');
const studentTypes = db.prepare("SELECT type, COUNT(*) as total FROM students GROUP BY type").all();
studentTypes.forEach(s => console.log(`  ${s.type}: ${s.total}`));

console.log('\n====== INSCRIÇÕES RECENTES (últimas 5) ======');
const regs = db.prepare(`
  SELECT r.id, r.status, r.timestamp, e.name as event_name, s.name || ' ' || COALESCE(s.surname,'') as student_name
  FROM registrations r
  LEFT JOIN events e ON e.id = r.event_id
  LEFT JOIN students s ON s.id = r.student_id
  ORDER BY r.timestamp DESC LIMIT 5
`).all();
regs.forEach(r => console.log(`  [${r.status}] ${r.student_name || 'sem aluno'} -> ${r.event_name} (${r.timestamp})`));

console.log('\n====== EVENTOS SEM CATEGORIA VÁLIDA ======');
const orphanEvents = db.prepare(`
  SELECT e.id, e.name, e.category_id
  FROM events e
  LEFT JOIN categories c ON c.id = e.category_id
  WHERE c.id IS NULL
`).all();
console.log('Eventos órfãos:', orphanEvents.length, orphanEvents.length > 0 ? orphanEvents : '(nenhum)');

console.log('\n====== SYSTEM_SETTINGS ======');
try {
  const settings = db.prepare('SELECT key, value FROM system_settings').all();
  settings.forEach(s => console.log(`  ${s.key}: ${s.value}`));
} catch(e) {
  console.log('  Tabela system_settings não encontrada:', e.message);
}

console.log('\n====== STATUS FINAL ======');
const totalRegs = db.prepare('SELECT COUNT(*) as c FROM registrations').get();
const totalStudents = db.prepare('SELECT COUNT(*) as c FROM students').get();
const totalEvents = db.prepare('SELECT COUNT(*) as c FROM events').get();
console.log(`  Eventos: ${totalEvents.c} | Alunos: ${totalStudents.c} | Inscrições: ${totalRegs.c}`);
console.log('  Banco pronto para inscrições:', fkErrors.length === 0 && integrity['integrity_check'] === 'ok' ? '✅ SIM' : '❌ VERIFICAR');

db.close();
