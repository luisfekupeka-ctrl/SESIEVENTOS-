const Database = require('better-sqlite3');
const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');

const namesToUpdate = [
  'Futsal%',
  'Modelagem Plana%',
  'Programação com Scratch%',
  'Robótica%',
  'Street Jazz%',
  'Vôlei (Fem./Mas.)%'
];

const stmt = db.prepare(`UPDATE events SET restringir_duplicidade = 1 WHERE name LIKE ?`);
let totalUpdated = 0;

for (const name of namesToUpdate) {
  const info = stmt.run(name);
  totalUpdated += info.changes;
  console.log(`Updated ${info.changes} rows for ${name}`);
}

console.log(`Total updated: ${totalUpdated}`);
