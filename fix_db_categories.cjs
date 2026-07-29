const Database = require('better-sqlite3');
const db = new Database('database.db');

const categoryMap = {
  'Artes Cênicas': ['Circo', 'Teatro'],
  'Música': ['Clube da Música', 'Musicalização', 'Violino'],
  'Idiomas': ['Conversação em Inglês', 'Karaokê in English', 'Passaporte Global'],
  'Artes Visuais': ['Cosmética', 'Creative Journaling', 'Desenho', 'Ilustração', 'Modelagem Plana', 'Quadrinhos'],
  'Artesanato': ['Crochê'],
  'Gastronomia': ['Culinária'],
  'Dança': ['Dança Terapia', 'K-POP', 'Street Jazz'],
  'Tecnologia': ['Desenho em Mesa Digital', 'Desenho Técnico', 'Geocraft', 'Microsoft Start', 'Programação com Scratch'],
  'Jogos e Estratégia': ['Futebol de Botão', 'RPG', 'Vintage Game', 'Xadrez'],
  'Esportes': ['Futsal', 'Muay Thai', 'Taekwondo', 'Tênis de Mesa', 'Vôlei'],
  'Apoio Acadêmico': ['Gabarita SESI'],
  'Ciências Humanas': ['Law School', 'Memórias Urbanas', 'Mini-MUN'],
  'Comunicação e Mídia': ['Produção Audiovisual'],
  'Robótica': ['Robótica'],
  'Bem-estar': ['Yoga']
};

console.log('--- Resetting Categories and Subcategories ---');
db.prepare('DELETE FROM subcategories').run();
db.prepare('DELETE FROM categories').run();
db.prepare("DELETE FROM sqlite_sequence WHERE name IN ('categories', 'subcategories')").run();

const catNameToId = {};
const subcatNameToId = {};

for (const [catName, subcatList] of Object.entries(categoryMap)) {
  const catRes = db.prepare('INSERT INTO categories (name) VALUES (?)').run(catName);
  const catId = Number(catRes.lastInsertRowid);
  catNameToId[catName] = catId;

  for (const subName of subcatList) {
    const subRes = db.prepare('INSERT INTO subcategories (category_id, name) VALUES (?, ?)').run(catId, subName);
    const subId = Number(subRes.lastInsertRowid);
    subcatNameToId[subName] = subId;
  }
}

console.log('Inserted Categories:', db.prepare('SELECT * FROM categories').all().length);
console.log('Inserted Subcategories:', db.prepare('SELECT * FROM subcategories').all().length);

console.log('--- Mapping Events to Category and Subcategory ---');
const events = db.prepare('SELECT id, name FROM events').all();
let mappedCount = 0;

for (const ev of events) {
  let matchedCatId = null;
  let matchedSubId = null;

  for (const [catName, subcatList] of Object.entries(categoryMap)) {
    for (const subName of subcatList) {
      if (ev.name.toLowerCase().includes(subName.toLowerCase())) {
        matchedCatId = catNameToId[catName];
        matchedSubId = subcatNameToId[subName];
        break;
      }
    }
    if (matchedCatId) break;
  }

  // Fallback: Default to category 1 if not matched
  if (!matchedCatId) {
    matchedCatId = 1;
  }

  db.prepare('UPDATE events SET category_id = ?, subcategory_id = ? WHERE id = ?').run(matchedCatId, matchedSubId, ev.id);
  mappedCount++;
}

console.log(`Successfully mapped ${mappedCount} events to categories and subcategories.`);
