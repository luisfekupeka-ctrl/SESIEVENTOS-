import fs from 'fs';

async function runTest() {
  const urlBase = 'http://localhost:3001/api/events';
  const urlRpc = 'http://localhost:3001/api/db';

  console.log('Criando 2 eventos da mesma categoria com restrição de duplicidade...');

  // Inject 2 events into SQLite via /api/db mock
  await fetch(urlRpc, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'insert',
      table: 'events',
      data: [
        { id: 'dup-event-1', name: 'Event Dup 1', category_id: 1, subcategory_id: 1, restringir_duplicidade: 1 },
        { id: 'dup-event-2', name: 'Event Dup 2', category_id: 1, subcategory_id: 1, restringir_duplicidade: 1 }
      ]
    })
  });

  console.log('Inscrevendo Aluno A no Evento 1...');
  const res1 = await fetch(`${urlBase}/dup-event-1/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Aluno Dup', form_data: {} })
  });
  const data1 = await res1.json();
  console.log('Resultado 1:', data1);

  console.log('Tentando inscrever o mesmo Aluno A no Evento 2 (deve falhar)...');
  const res2 = await fetch(`${urlBase}/dup-event-2/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Aluno Dup', form_data: {} })
  });
  const data2 = await res2.json();
  console.log('Resultado 2:', data2);
}

runTest();
