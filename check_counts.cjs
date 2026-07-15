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
| Gabarita SESI                              | Segunda, Terça e Quarta |   |
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
const table2Counts = {};
const table2Days = {};

for (const line of lines) {
  if (!line.trim() || !line.includes('|')) continue;
  const parts = line.split('|').map(p => p.trim()).slice(1, -1);
  if (parts.length < 2) continue;
  
  let name = parts[0];
  if (name.includes('Nome')) continue;
  if (name.includes('---')) continue;
  
  let dayStr = parts[1];
  
  if (!table2Counts[name]) {
    table2Counts[name] = 0;
    table2Days[name] = [];
  }
  table2Counts[name]++;
  table2Days[name].push(dayStr);
}

const eventsInDb = db.prepare('SELECT name, count(*) as c FROM events GROUP BY name').all();
for (const row of eventsInDb) {
  let nameInT2 = row.name;
  if (!table2Counts[nameInT2]) {
     // try removing ECO stuff or matching
     const matched = Object.keys(table2Counts).find(k => k.includes(row.name) || row.name.includes(k));
     if (matched) nameInT2 = matched;
  }
  
  const countT2 = table2Counts[nameInT2] || 0;
  if (countT2 !== row.c) {
    console.log(`Mismatch: ${row.name} - DB: ${row.c}, T2: ${countT2}`);
  }
}
