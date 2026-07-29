const Database = require('better-sqlite3');
const db = new Database('database.db');

console.log('=== 1. INTEGRITY CHECK ===');
console.log(db.pragma('integrity_check'));

console.log('=== 2. FOREIGN KEY CHECK ===');
console.log(db.pragma('foreign_key_check'));

console.log('=== 3. TABLE COUNTS & SCHEMAS ===');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();
tables.forEach(t => {
  const count = db.prepare(`SELECT COUNT(*) as c FROM "${t.name}"`).get().c;
  console.log(`Table ${t.name}: ${count} rows`);
});

console.log('=== 4. CHECK JSON FIELDS IN EVENTS ===');
const events = db.prepare('SELECT id, name, restrictions, form_fields, dias_semana, vagas_por_ano FROM events').all();
let jsonErrors = 0;
events.forEach(e => {
  ['restrictions', 'form_fields', 'dias_semana', 'vagas_por_ano'].forEach(field => {
    if (e[field] && typeof e[field] === 'string') {
      try {
        JSON.parse(e[field]);
      } catch (err) {
        console.error(`Invalid JSON in event ${e.id} (${e.name}) field ${field}: ${e[field]}`);
        jsonErrors++;
      }
    }
  });
});
console.log('JSON errors in events:', jsonErrors);

console.log('=== 5. CHECK REGISTRATIONS ORPHANS ===');
const orphanedRegs = db.prepare('SELECT count(*) as c FROM registrations WHERE event_id NOT IN (SELECT id FROM events)').get().c;
console.log('Orphaned registrations (missing event):', orphanedRegs);

console.log('=== 6. CHECK SUBCATEGORIES ORPHANS ===');
const orphanedSubcats = db.prepare('SELECT count(*) as c FROM subcategories WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)').get().c;
console.log('Orphaned subcategories (missing category):', orphanedSubcats);

console.log('=== 7. CHECK EVENT CATEGORY_ID MATCHES ===');
const orphanedEventCats = db.prepare('SELECT count(*) as c FROM events WHERE category_id IS NOT NULL AND category_id NOT IN (SELECT id FROM categories)').get().c;
console.log('Orphaned events (missing category_id):', orphanedEventCats);

console.log('=== 8. CHECK EVENT SUBCATEGORY_ID MATCHES ===');
const orphanedEventSubcats = db.prepare('SELECT count(*) as c FROM events WHERE subcategory_id IS NOT NULL AND subcategory_id NOT IN (SELECT id FROM subcategories)').get().c;
console.log('Orphaned events (missing subcategory_id):', orphanedEventSubcats);

console.log('=== 9. CHECK BUSY TIMEOUT & PRAGMAS ===');
console.log('Journal mode:', db.pragma('journal_mode', { simple: true }));
console.log('Busy timeout:', db.pragma('busy_timeout', { simple: true }));
