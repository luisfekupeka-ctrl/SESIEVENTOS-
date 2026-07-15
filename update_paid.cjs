const Database = require('better-sqlite3');
const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');

const paidNames = [
  'Culinária%',
  'Muay Thai%',
  'Robótica%',
  'Taekwondo%'
];

db.transaction(() => {
  // Set default countdown to 10 for ALL events
  const countdownStmt = db.prepare("UPDATE events SET countdown_target_at = '10'");
  const countdownInfo = countdownStmt.run();
  console.log(`Updated ${countdownInfo.changes} events with 10 min countdown`);

  // Reset all is_paid to 0 just in case
  db.prepare('UPDATE events SET is_paid = 0').run();

  // Set is_paid = 1 for specific events
  const paidStmt = db.prepare('UPDATE events SET is_paid = 1 WHERE name LIKE ?');
  let totalPaid = 0;
  for (const name of paidNames) {
    const info = paidStmt.run(name);
    totalPaid += info.changes;
    console.log(`Set ${info.changes} rows to PAID for ${name}`);
  }
  console.log(`Total updated to PAID: ${totalPaid}`);
})();
