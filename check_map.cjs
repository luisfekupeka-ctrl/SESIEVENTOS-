const fs = require('fs');
const { SourceMapConsumer } = require('source-map');

async function check() {
  const mapUrl = 'https://sesieventos.vercel.app/assets/index-G_jiy0bJ.js.map';
  console.log('Downloading map...');
  const res = await fetch(mapUrl);
  const mapData = await res.json();
  
  console.log('Mapping...');
  await SourceMapConsumer.with(mapData, null, consumer => {
    console.log(consumer.originalPositionFor({
      line: 48,
      column: 57737
    }));
    console.log(consumer.originalPositionFor({
      line: 48,
      column: 50110
    }));
  });
}

check().catch(console.error);
