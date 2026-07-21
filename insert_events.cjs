const Database = require('better-sqlite3');
const crypto = require('crypto');

const db = new Database('C:/Users/luisk/Downloads/sesi-eventos/database.db');

const data = `
| Circo                                      |           | 30/07/2026  | 08:00       | 01/08/2026 |            21 | 6º Ano, 7º Ano                                  |
| Circo                                      |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Clube da Música                            |           | 30/07/2026  | 08:00       | 01/08/2026 |            15 | 6º Ano, 7º Ano                                  |
| Clube da Música                            |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Conversação em Inglês                      |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Cosmética                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Cosmética                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Creative Journaling – Sketchbook           |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano                                  |
| Crochê                                     |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 |                                                 |
| Culinária                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Culinária                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Curso de Desenho                           |           | 30/07/2026  | 08:00       | 01/08/2026 |            32 | 8º Ano, 9º Ano                                  |
| Curso de Desenho                           |           | 30/07/2026  | 08:00       | 01/08/2026 |            32 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Dança Terapia                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 8º Ano, 9º Ano, 1º Ano EM, 2º Ano EM, 3º Ano EM |
| Dança Terapia                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 6º Ano, 7º Ano                                  |
| Desenho em Mesa Digital                    |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Desenho Técnico – Engenharia e Arquitetura |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Futebol de Botão                           |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Futebol de Botão                           |           | 30/07/2026  | 08:00       | 01/08/2026 |            25 | 8º Ano, 9º Ano                                  |
| Futsal (Fem./Mas.)                         |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano                                  |
| Futsal (Masculino)                         |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Futsal (Masculino)                         |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Gabarita SESI                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Gabarita SESI                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Gabarita SESI                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Geocraft                                   |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Geocraft                                   |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Ilustração                                 |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Karaokê in English                         |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 8º Ano, 9º Ano, 1º Ano EM, 2º Ano EM, 3º Ano EM |
| K-POP                                      |           | 30/07/2026  | 08:00       | 01/08/2026 |            25 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Law School                                 |           | 30/07/2026  | 08:00       | 01/08/2026 |            15 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Memórias Urbanas dos Bairros de Curitiba   |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 8º Ano, 9º Ano                                  |
| Memórias Urbanas dos Bairros de Curitiba   |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano                                  |
| Microsoft Start                            |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 8º Ano, 9º Ano                                  |
| Mini-MUN                                   |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano, 8º Ano                          |
| Modelagem Plana                            |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Modelagem Plana                            |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Muay Thai                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |             1 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Musicalização                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            17 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Musicalização                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            15 | 8º Ano, 9º Ano                                  |
| Musicalização                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Oficina de Leitura                         |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Passaporte Global                          |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano                                  |
| Passaporte Global                          |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 8º Ano, 9º Ano                                  |
| Produção Audiovisual                       |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 8º Ano, 9º Ano, 1º Ano EM, 2º Ano EM, 3º Ano EM |
| Programação com Scratch                    |           | 30/07/2026  | 08:00       | 01/08/2026 |            26 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Quadrinhos                                 |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Quadrinhos                                 |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Robótica                                   |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 |                                                 |
| Robótica                                   |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 |                                                 |
| RPG                                        |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano                                  |
| RPG                                        |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 8º Ano, 9º Ano, 1º Ano EM, 2º Ano EM, 3º Ano EM |
| Street Jazz                                |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Street Jazz                                |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Street Jazz                                |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 8º Ano, 9º Ano                                  |
| Taekwondo                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |            14 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Taekwondo                                  |           | 30/07/2026  | 08:00       | 01/08/2026 |             2 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
| Teatro                                     |           | 30/07/2026  | 08:00       | 01/08/2026 |             6 | 8º Ano, 9º Ano                                  |
| Teatro                                     |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Tênis de Mesa                              |           | 30/07/2026  | 08:00       | 01/08/2026 |            10 | 6º Ano, 7º Ano                                  |
| Vintage Game                               |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 6º Ano, 7º Ano, 8º Ano, 9º Ano                  |
| Violino                                    |           | 30/07/2026  | 08:00       | 01/08/2026 |            10 | 6º Ano, 7º Ano                                  |
| Vôlei (Fem./Mas.)                          |           | 30/07/2026  | 08:00       | 01/08/2026 |            24 | 6º Ano, 7º Ano                                  |
| Vôlei (Fem./Mas.)                          |           | 30/07/2026  | 08:00       | 01/08/2026 |            20 | 6º Ano, 7º Ano                                  |
| Xadrez                                     |           | 30/07/2026  | 08:00       | 01/08/2026 |            30 | 8º Ano, 9º Ano                                  |
| Yoga                                       |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 8º Ano, 9º Ano                                  |
| Yoga                                       |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 6º Ano, 7º Ano                                  |
| Yoga                                       |           | 30/07/2026  | 08:00       | 01/08/2026 |            36 | 1º Ano EM, 2º Ano EM, 3º Ano EM                 |
`;

const mapGrade = (gradeStr) => {
  const clean = gradeStr.trim();
  if (!clean) return null;
  if (clean === '6º Ano') return '6º Ano EF';
  if (clean === '7º Ano') return '7º Ano EF';
  if (clean === '8º Ano') return '8º Ano EF';
  if (clean === '9º Ano') return '9º Ano EF';
  return clean;
};

const lines = data.trim().split('\n');
let inserted = 0;

const insertStmt = db.prepare('INSERT INTO events (id, name, description, start_date, start_time, end_date, max_capacity, restrictions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');

db.transaction(() => {
  for (const line of lines) {
    if (!line.trim() || !line.includes('|')) continue;
    const parts = line.split('|').map(p => p.trim()).slice(1, -1);
    if (parts.length < 7) continue;
    
    let name = parts[0];
    let desc = parts[1];
    let startDate = parts[2];
    let startTime = parts[3];
    let endDate = parts[4];
    let maxCap = parts[5];
    let restr = parts[6];

    if (name.includes('Nome') && name.includes('Descrição')) continue; // skip header
    if (name.includes('---')) continue; // skip separator
    
    // convert date DD/MM/YYYY to YYYY-MM-DD
    const partsStart = startDate.split('/');
    if (partsStart.length === 3) startDate = partsStart[2] + "-" + partsStart[1] + "-" + partsStart[0];
    
    const partsEnd = endDate.split('/');
    if (partsEnd.length === 3) endDate = partsEnd[2] + "-" + partsEnd[1] + "-" + partsEnd[0];

    const cap = parseInt(maxCap, 10);
    const id = crypto.randomUUID();

    let restrictionsJson = null;
    if (restr) {
      const grades = restr.split(',').map(mapGrade).filter(g => g);
      if (grades.length > 0) {
        restrictionsJson = JSON.stringify({ type: 'years', values: grades });
      }
    }

    insertStmt.run(id, name, desc || null, startDate, startTime, endDate || null, isNaN(cap) ? 0 : cap, restrictionsJson);
    inserted++;
  }
})();

console.log("Successfully inserted " + inserted + " events!");
