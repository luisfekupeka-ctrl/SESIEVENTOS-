const Database = require('better-sqlite3');
const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');

const data = `
| Circo                                      | Sexta                   |   |
| Circo                                      | Quarta                  |   |
| Clube da Música                            | Terça                   |   |
| Clube da Música                            | Quinta                  |   |
| Conversação em Inglês                      | Segunda                 |   |
| Cosmética                                  | Quinta                  |   |
| Cosmética                                  | Sexta                   |   |
| Creative Journaling – Sketchbook           | Segunda                 |   |
| Crochê                                     | Terça e Quinta          |   |
| Culinária                                  | Segunda                 |   |
| Culinária                                  | Terça                   |   |
| Culinária                                  | Quarta                  |   |
| Culinária                                  | Quinta                  |   |
| Culinária                                  | Sexta                   |   |
| Curso de Desenho                           | Terça                   |   |
| Curso de Desenho                           | Sexta                   |   |
| Dança Terapia                              | Quarta                  |   |
| Dança Terapia                              | Sexta                   |   |
| Desenho em Mesa Digital                    | Segunda                 |   |
| Desenho Técnico – Engenharia e Arquitetura | Segunda                 |   |
| Futebol de Botão                           | Terça                   |   |
| Futebol de Botão                           | Quinta                  |   |
| Futsal (Fem./Mas.)                         | Terça                   |   |
| Futsal (Masculino)                         | Segunda                 |   |
| Futsal (Masculino)                         | Terça                   |   |
| Gabarita SESI                              | Segunda                 |   |
| Gabarita SESI                              | Terça                   |   |
| Gabarita SESI                              | Quarta                  |   |
| Geocraft                                   | Terça                   |   |
| Geocraft                                   | Sexta                   |   |
| Ilustração                                 | Terça e Quinta          |   |
| Karaokê in English                         | Segunda                 |   |
| K-POP                                      | Sexta                   |   |
| Law School                                 | Terça e Quinta          |   |
| Memórias Urbanas dos Bairros de Curitiba   | Terça                   |   |
| Memórias Urbanas dos Bairros de Curitiba   | Sexta                   |   |
| Microsoft Start                            | Quinta                  |   |
| Mini-MUN                                   | Segunda                 |   |
| Modelagem Plana                            | Terça                   |   |
| Modelagem Plana                            | Quinta                  |   |
| Muay Thai                                  | Sexta                   |   |
| Musicalização                              | Segunda                 |   |
| Musicalização                              | Segunda                 |   |
| Musicalização                              | Terça e Quinta          |   |
| Oficina de Leitura                         | Segunda                 |   |
| Passaporte Global                          | Quarta                  |   |
| Passaporte Global                          | Quinta                  |   |
| Produção Audiovisual                       | Quinta                  |   |
| Programação com Scratch                    | Terça e Quinta          |   |
| Quadrinhos                                 | Segunda                 |   |
| Quadrinhos                                 | Quarta                  |   |
| Robótica                                   | Segunda e Terça         |   |
| Robótica                                   | Quinta                  |   |
| RPG                                        | Segunda e Quarta        |   |
| RPG                                        | Quarta e Sexta          |   |
| Street Jazz                                | Segunda                 |   |
| Street Jazz                                | Quarta                  |   |
| Street Jazz                                | Sexta                   |   |
| Taekwondo                                  | Segunda e Quarta        |   |
| Taekwondo                                  | Terça e Quinta          |   |
| Teatro                                     | Segunda                 |   |
| Teatro                                     | Sexta                   |   |
| Tênis de Mesa                              | Quarta                  |   |
| Vintage Game                               | Segunda e Quarta        |   |
| Violino                                    | Terça e Quinta          |   |
| Vôlei (Fem./Mas.)                          | Segunda                 |   |
| Vôlei (Fem./Mas.)                          | Sexta                   |   |
| Xadrez                                     | Quarta                  |   |
| Yoga                                       | Segunda                 |   |
| Yoga                                       | Terça                   |   |
| Yoga                                       | Quinta                  |   |
`;

const lines = data.trim().split('\n');
const table2Days = {};

const parseDays = (dayStr) => {
  return dayStr.split(/,| e /).map(s => s.trim()).filter(s => s);
};

for (const line of lines) {
  if (!line.trim() || !line.includes('|')) continue;
  const parts = line.split('|').map(p => p.trim()).slice(1, -1);
  if (parts.length < 2) continue;
  
  let name = parts[0];
  if (name.includes('Nome')) continue;
  if (name.includes('---')) continue;
  
  // Programação com Scratch has (ECO.C0350)
  if (name.includes('Programação com Scratch')) name = 'Programação com Scratch';
  
  let dayStr = parts[1];
  
  if (!table2Days[name]) {
    table2Days[name] = [];
  }
  table2Days[name].push(dayStr);
}

const updateStmt = db.prepare('UPDATE events SET restringir_dias = 1, dias_semana = ? WHERE id = ?');
let updatedCount = 0;

db.transaction(() => {
  // Process Culinária specially (aggregate)
  if (table2Days['Culinária']) {
    let allDays = [];
    table2Days['Culinária'].forEach(d => { allDays.push(...parseDays(d)); });
    allDays = [...new Set(allDays)];
    
    const cullEvents = db.prepare('SELECT id FROM events WHERE name = ?').all('Culinária');
    for (const e of cullEvents) {
      updateStmt.run(JSON.stringify(allDays), e.id);
      updatedCount++;
    }
  }

  // Process all other events by mapping 1-to-1 ordered by rowid
  for (const name of Object.keys(table2Days)) {
    if (name === 'Culinária') continue; // handled above

    const eventsInDb = db.prepare('SELECT id FROM events WHERE name = ? ORDER BY rowid ASC').all(name);
    const dayRows = table2Days[name];

    if (eventsInDb.length === dayRows.length) {
      for (let i = 0; i < eventsInDb.length; i++) {
        const parsed = parseDays(dayRows[i]);
        updateStmt.run(JSON.stringify(parsed), eventsInDb[i].id);
        updatedCount++;
      }
    } else {
      console.log(`Mismatch for ${name}! DB has ${eventsInDb.length}, T2 has ${dayRows.length}. Applying aggregated.`);
      let allDays = [];
      dayRows.forEach(d => { allDays.push(...parseDays(d)); });
      allDays = [...new Set(allDays)];
      for (const e of eventsInDb) {
        updateStmt.run(JSON.stringify(allDays), e.id);
        updatedCount++;
      }
    }
  }
})();

console.log("Successfully assigned days for " + updatedCount + " events!");
