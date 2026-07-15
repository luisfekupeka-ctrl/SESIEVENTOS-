const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('PAGE LOG ERROR:', msg.text());
    } else {
      console.log('PAGE LOG:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
  });

  console.log('Navigating to http://localhost:4173');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });
  
  // Wait a bit to ensure it loads
  await new Promise(r => setTimeout(r, 2000));
  
  await browser.close();
})();
