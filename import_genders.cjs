const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

// Nome do arquivo CSV (coloque o seu arquivo na mesma pasta que este script)
const CSV_FILE_NAME = 'lista_alunos.csv'; 

// Conectar ao banco de dados SQLite
const dbPath = path.join(__dirname, 'database.db');
const db = new Database(dbPath);

async function importGenders() {
  const csvPath = path.join(__dirname, CSV_FILE_NAME);
  
  if (!fs.existsSync(csvPath)) {
    console.error(`❌ Erro: O arquivo ${CSV_FILE_NAME} não foi encontrado na pasta!`);
    console.log(`Por favor, salve sua lista de excel como CSV (separado por vírgulas) com o nome '${CSV_FILE_NAME}'.`);
    console.log(`A primeira coluna deve ser o Nome e a segunda o Gênero.`);
    return;
  }

  const fileContent = fs.readFileSync(csvPath, 'utf-8');
  const lines = fileContent.split('\n');
  
  let updatedCount = 0;
  let notFoundCount = 0;

  console.log('Iniciando atualização de gêneros...');

  const updateStmt = db.prepare('UPDATE students SET gender = ? WHERE id = ?');
  const selectStmt = db.prepare('SELECT id, name, surname FROM students');
  const allStudents = selectStmt.all();

  // Função para normalizar strings para comparação
  const normalize = (str) => {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Suporta delimitador tab, vírgula ou ponto e vírgula
    const parts = line.split(/[\t;,]/);
    if (parts.length < 2) continue;

    const nomeNaLista = parts[0];
    const generoNaLista = parts[1].toLowerCase().includes('f') ? 'Feminino' : 'Masculino';

    const nomeNormalizado = normalize(nomeNaLista);

    // Encontrar o aluno correspondente no banco
    const student = allStudents.find(s => {
      const dbFullName = normalize(`${s.name || ''} ${s.surname || ''}`);
      const dbNameOnly = normalize(s.name || '');
      return dbFullName === nomeNormalizado || dbNameOnly === nomeNormalizado;
    });

    if (student) {
      updateStmt.run(generoNaLista, student.id);
      updatedCount++;
    } else {
      console.log(`⚠️ Aluno não encontrado no sistema: ${nomeNaLista}`);
      notFoundCount++;
    }
  }

  console.log('\n✅ Atualização concluída!');
  console.log(`Alunos atualizados com sucesso: ${updatedCount}`);
  if (notFoundCount > 0) {
    console.log(`Alunos na planilha que não estavam no sistema (ou nome muito diferente): ${notFoundCount}`);
  }
}

importGenders();
