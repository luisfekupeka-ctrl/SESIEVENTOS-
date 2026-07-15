const Database = require('better-sqlite3');
const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');

const namesToUpdate = [
  'Modelagem Plana%',
  'Programação com Scratch%',
  'Street Jazz%',
  'Vôlei (Fem./Mas.)%'
];

db.transaction(() => {
  // Reset all to 0
  const resetStmt = db.prepare('UPDATE events SET restringir_duplicidade = 0');
  const resetInfo = resetStmt.run();
  console.log(`Reset ${resetInfo.changes} events to escolha_unica = 0`);

  // Set specific ones to 1
  const updateStmt = db.prepare('UPDATE events SET restringir_duplicidade = 1 WHERE name LIKE ?');
  let totalUpdated = 0;
  for (const name of namesToUpdate) {
    const info = updateStmt.run(name);
    totalUpdated += info.changes;
    console.log(`Updated ${info.changes} rows for ${name}`);
  }
  console.log(`Total updated to 1: ${totalUpdated}`);
})();
