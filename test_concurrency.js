import fs from 'fs';

async function runTest() {
  const url = 'http://localhost:3001/api/events/test-event-1000/register';
  const totalRequests = 1000;
  let successes = 0;
  let failures = 0;
  let errors = [];

  console.log(`Disparando ${totalRequests} inscrições simultâneas...`);

  const requests = Array.from({ length: totalRequests }).map(async (_, index) => {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Aluno Teste ${index}`,
          participant_type: 'student',
          form_data: {}
        })
      });
      const data = await response.json();
      if (data.success) {
        successes++;
      } else {
        failures++;
        if (data.error && !errors.includes(data.error)) {
            errors.push(data.error);
        }
      }
    } catch (e) {
      failures++;
      if (!errors.includes(e.message)) errors.push(e.message);
    }
  });

  await Promise.all(requests);

  console.log(`=== Resultados do Teste ===`);
  console.log(`Sucessos: ${successes}`);
  console.log(`Falhas: ${failures}`);
  console.log(`Erros reportados: ${JSON.stringify(errors)}`);
}

runTest();
