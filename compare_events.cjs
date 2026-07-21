const fs = require('fs');

const imageEvents = [
  { name: 'A Geografia dos Animes', day: 'Quarta', max: 30, rest: '6º/7º' },
  { name: 'A Geografia dos Animes', day: 'Quinta', max: 30, rest: '8º/9º' },
  { name: 'After Vôlei - (Fem/Mas)', day: 'Terça', max: 24, rest: 'Ensino Médio' },
  { name: 'After Vôlei - (Fem/Mas)', day: 'Quinta', max: 24, rest: 'Ensino Médio' },
  { name: 'Astronomia', day: 'Sexta', max: 20, rest: 'Misto (Fund/Médio)' },
  { name: 'Ateliê Maker', day: 'Sexta', max: 30, rest: '6º/7º' },
  { name: 'Biscuit', day: 'Terça', max: 20, rest: '6º/7º' },
  { name: 'Biscuit', day: 'Quarta', max: 20, rest: '8º/9º' },
  { name: 'Bordado', day: 'Quarta', max: 26, rest: 'Misto (Fund)' },
  { name: 'Bordado', day: 'Sexta', max: 26, rest: 'Misto (Fund)' },
  { name: 'Cerâmica Fria', day: 'Terça', max: 20, rest: '6º/7º' },
  { name: 'Cerâmica Fria', day: 'Quarta', max: 20, rest: '8º/9º e EM' },
  { name: 'Cine Club in English (ECO.C0343)', day: 'Quinta', max: 36, rest: 'Ensino Médio' },
  { name: 'Circo', day: 'Sexta', max: 21, rest: '6º/7º' },
  { name: 'Circo', day: 'Quarta', max: 20, rest: '8º/9º' },
  { name: 'Clube da Música', day: 'Terça', max: 15, rest: '6º/7º' },
  { name: 'Clube da Música', day: 'Quinta', max: 20, rest: '8º/9º' },
  { name: 'Clube de Narrativas', day: 'Segunda', max: 30, rest: 'Ensino Médio' },
  { name: 'Conversação em Inglês', day: 'Segunda', max: 30, rest: 'Ensino Médio' },
  { name: 'Cosmética', day: 'Quinta', max: 20, rest: '6º/7º' },
  { name: 'Cosmética', day: 'Sexta', max: 20, rest: '8º/9º' },
  { name: 'Creative Journaling - Sketchbook', day: 'Segunda', max: 30, rest: '6º/7º' },
  { name: 'Crochê', day: 'Terça/Quinta', max: 30, rest: 'Misto (Fund/Médio)' },
  { name: 'Culinária', day: 'Segunda', max: 20, rest: 'Misto (Fund)' },
  { name: 'Culinária', day: 'Terça', max: 20, rest: 'Misto (Fund)' },
  { name: 'Culinária', day: 'Quarta', max: 20, rest: 'Ensino Médio' },
  { name: 'Culinária', day: 'Quinta', max: 20, rest: 'Misto (Fund)' },
  { name: 'Culinária', day: 'Sexta', max: 20, rest: 'Ensino Médio' },
  { name: 'Curso de desenho', day: 'Terça', max: 32, rest: '8º/9º' },
  { name: 'Curso de desenho', day: 'Sexta', max: 32, rest: 'Ensino Médio' },
  { name: 'Dança Terapia', day: 'Quarta', max: 36, rest: '8º/9º/EM' },
  { name: 'Dança Terapia', day: 'Sexta', max: 36, rest: '6º/7º' },
  { name: 'Desenho Mesa Digital', day: 'Segunda', max: 20, rest: 'Ensino Médio' },
  { name: 'Desenho Técnico Engenharia e Arquitetura', day: 'Segunda', max: 36, rest: 'Ensino Médio' },
  { name: 'Futebol de botão', day: 'Terça', max: 20, rest: '6º/7º' },
  { name: 'Futebol de botão', day: 'Quinta', max: 25, rest: '8º/9º' },
  { name: 'Futsal (Fem/Mas)', day: 'Terça', max: 30, rest: '6º/7º' },
  { name: 'Futsal (Masculino)', day: 'Terça', max: 20, rest: '8º/9º' },
  { name: 'Futsal (Masculino)', day: 'Segunda', max: 20, rest: 'Ensino Médio' },
  { name: 'Gabarita Sesi', day: 'Segunda', max: 36, rest: 'Ensino Médio' },
  { name: 'Gabarita Sesi', day: 'Terça', max: 36, rest: 'Ensino Médio' },
  { name: 'Gabarita Sesi', day: 'Quarta', max: 36, rest: 'Ensino Médio' },
  { name: 'Geocraft', day: 'Terça', max: 20, rest: '6º/7º' },
  { name: 'Geocraft', day: 'Sexta', max: 20, rest: '8º/9º' },
  { name: 'Ilustração', day: 'Terça/Quinta', max: 20, rest: 'Ensino Médio' },
  { name: 'Jogos de Cartas', day: 'Quinta', max: 30, rest: '6º/7º' },
  { name: 'Jogos de Cartas', day: 'Sexta', max: 30, rest: '8º/9º' },
  { name: 'Karaokê in English', day: 'Segunda', max: 36, rest: '8º/9º/EM' },
  { name: 'K-POP', day: 'Sexta', max: 25, rest: 'Misto (Fund)' },
  { name: 'Law School', day: 'Terça/Quinta', max: 15, rest: 'Ensino Médio' },
  { name: 'Memórias Urbanas dos Bairros de Curitiba', day: 'Terça', max: 30, rest: '8º/9º' },
  { name: 'Memórias Urbanas dos Bairros de Curitiba', day: 'Sexta', max: 30, rest: '6º/7º' },
  { name: 'Microsoft Start', day: 'Quinta', max: 30, rest: '8º/9º' },
  { name: 'Mini-MUN', day: 'Segunda', max: 20, rest: '6º/7º/8º' },
  { name: 'Modelagem Plana', day: 'Terça', max: 20, rest: '8º/9º' },
  { name: 'Modelagem Plana', day: 'Quinta', max: 20, rest: '8º/9º' },
  { name: 'Muay Thay', day: 'Sexta', max: 1, rest: 'Misto (Fund)' },
  { name: 'Musicalização', day: 'Terça/Quinta', max: 17, rest: 'Ensino Médio' },
  { name: 'Musicalização', day: 'Quinta', max: 15, rest: '8º/9º' },
  { name: 'Musicalização', day: 'Segunda', max: 20, rest: '6º/7º' },
  { name: 'Oficina de Leitura (ECO.C0339)', day: 'Segunda', max: 20, rest: 'Misto (Fund)' },
  { name: 'Passaporte Global', day: 'Quarta', max: 30, rest: '6º/7º' },
  { name: 'Passaporte Global', day: 'Quinta', max: 30, rest: '8º/9º' },
  { name: 'Produção Audiovisual', day: 'Quinta', max: 36, rest: '8º/9º/EM' },
  { name: 'Programação com Scratch (ECO.C0350)', day: 'Terça', max: 26, rest: 'Misto (Fund)' },
  { name: 'Programação com Scratch (ECO.C0350)', day: 'Quinta', max: 26, rest: 'Misto (Fund)' },
  { name: 'Quadrinhos', day: 'Quarta', max: 20, rest: '8º/9º' },
  { name: 'Quadrinhos', day: 'Segunda', max: 20, rest: '6º/7º' },
  { name: 'Robótica', day: 'Quinta', max: 30, rest: 'Misto' },
  { name: 'Robótica', day: 'Segunda/Terça', max: 30, rest: 'Misto' },
  { name: 'RPG', day: 'Quarta/Sexta', max: 36, rest: '8º/9º/EM' },
  { name: 'RPG', day: 'Segunda/Quarta', max: 30, rest: '6º/7º' },
  { name: 'Street Jazz', day: 'Quarta', max: 20, rest: '8º/9º' },
  { name: 'Street Jazz', day: 'Sexta', max: 20, rest: '8º/9º' },
  { name: 'Street Jazz', day: 'Segunda', max: 30, rest: 'Ensino Médio' },
  { name: 'taekwondo', day: 'Segunda/Quarta', max: 14, rest: 'Misto (Fund)' },
  { name: 'taekwondo', day: 'Terça/Quinta', max: 2, rest: 'Ensino Médio' },
  { name: 'Teatro', day: 'Segunda', max: 6, rest: '8º/9º' },
  { name: 'Teatro', day: 'Sexta', max: 20, rest: '6º/7º' },
  { name: 'Tênis de mesa', day: 'Quarta', max: 10, rest: '6º/7º' },
  { name: 'Vintage Game', day: 'Segunda/Quarta', max: 30, rest: '6º ao 9º' },
  { name: 'Violino', day: 'Terça/Quinta', max: 10, rest: '6º/7º' },
  { name: 'Vôlei - (Fem/Mas)', day: 'Sexta', max: 20, rest: '6º/7º' },
  { name: 'Vôlei - (Fem/Mas)', day: 'Segunda', max: 24, rest: '6º/7º' },
  { name: 'Xadrez', day: 'Quarta', max: 30, rest: '8º/9º' },
  { name: 'Yoga', day: 'Segunda', max: 36, rest: '8º/9º' },
  { name: 'Yoga', day: 'Terça', max: 36, rest: '6º/7º' },
  { name: 'Yoga EM', day: 'Quinta', max: 36, rest: 'EM' }
];

const dbEvents = JSON.parse(fs.readFileSync('supabase_events.json', 'utf8'));

// Normalize names for comparison
function normalizeStr(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Convert image restrictions to DB format
function normalizeRest(rest) {
  if (rest === 'Misto' || rest === 'Misto (Fund/Médio)') return 'misto';
  if (rest === 'Misto (Fund)') return 'mistofund';
  if (rest === 'Ensino Médio' || rest === 'EM') return 'em';
  return rest.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function parseDbRestrictions(restStr) {
  if (!restStr) return 'misto'; // No restrictions usually means all
  let r = restStr;
  if (typeof restStr === 'string') {
    try { r = JSON.parse(restStr); } catch(e) { return restStr.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  }
  if (r && r.type === 'years') {
    const vals = r.values;
    const isEM = vals.some(v => v.includes('EM'));
    const isFund = vals.some(v => v.includes('EF'));
    if (isEM && !isFund) return 'em';
    if (!isEM && isFund) {
        return vals.map(v => v.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()).sort().join('');
    }
    return 'misto'; // both?
  }
  if (typeof restStr === 'string') return restStr.toLowerCase().replace(/[^a-z0-9]/g, '');
  return '';
}

for (const imgEv of imageEvents) {
  const normName = normalizeStr(imgEv.name);
  
  // Find matching events by name
  let matches = dbEvents.filter(e => normalizeStr(e.name) === normName);
  
  // Check if we can find one with matching day
  const dbDays = matches.map(m => Array.isArray(m.dias_semana) ? m.dias_semana.join('/') : (m.dias_semana ? JSON.parse(m.dias_semana).join('/') : ''));
  
  let found = matches.find(m => {
    let days = [];
    if (Array.isArray(m.dias_semana)) {
      days = m.dias_semana;
    } else if (m.dias_semana) {
      try { days = JSON.parse(m.dias_semana); } catch(e){}
    }
    const dayStr = days.join('/');
    return dayStr.toLowerCase() === imgEv.day.toLowerCase();
  });
  
  if (!found) {
     console.log(`❌ EVENTO FALTANDO OU DIA ERRADO: ${imgEv.name} (Planilha: ${imgEv.day}) - Encontrados no DB: ${dbDays.length > 0 ? dbDays.join(', ') : 'Nenhum'}`);
  } else {
     // Check capacity
     if (found.max_capacity !== imgEv.max) {
       console.log(`⚠️ CAPACIDADE DIFERENTE: ${imgEv.name} (${imgEv.day}) - Planilha: ${imgEv.max}, DB: ${found.max_capacity}`);
     }
     
     // Check rest
     const dbRest = parseDbRestrictions(found.restrictions);
     // Note: comparison of restrictions is fuzzy, so we might just log it if we really need to.
     // Let's rely on name/day/capacity for now and just output the DB restrictions for manual check.
     // console.log(`✅ OK: ${imgEv.name} (${imgEv.day})`);
  }
}
