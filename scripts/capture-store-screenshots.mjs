// Screenshot per gli store dall'app web reale (dati veri di Supabase), nella lingua scelta.
// Prerequisito: `npm run dev -- --port 5174` avviato (modalità sviluppo: ?storeshot mostra l'interfaccia d'acquisto nativa).
// Uso: node scripts/capture-store-screenshots.mjs [iphone|ipad|android] [it|en|fr|es|de]
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const device = ['ipad', 'android'].includes(process.argv[2]) ? process.argv[2] : 'iphone';
const lang = process.argv[3] || 'it';
const SIZES = {
  iphone: { viewport: { width: 440, height: 956 }, deviceScaleFactor: 3, suffix: '1320x2868' },
  ipad: { viewport: { width: 1032, height: 1376 }, deviceScaleFactor: 2, suffix: 'ipad-2064x2752' },
  android: { viewport: { width: 360, height: 640 }, deviceScaleFactor: 3, suffix: 'android-1080x1920' },
};
const size = SIZES[device];
const OUT = `store-assets/screenshots/${lang}`;
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: size.viewport,
  deviceScaleFactor: size.deviceScaleFactor,
  isMobile: device !== 'ipad',
  hasTouch: true,
  locale: lang,
  timezoneId: 'Europe/Rome', // paese preselezionato: Italia, dove ci sono già annunci veri
});
await context.addInitScript((l) => {
  localStorage.setItem('sospro_lang', JSON.stringify(l));
}, lang);
const page = await context.newPage();
await page.goto('http://localhost:5174/?storeshot');
await page.waitForSelector('article', { timeout: 30000 });
// Il pannello diagnostico degli annunci di test non esiste nell'app pubblicata
const hideDebug = (p) => p.addStyleTag({ content: '.font-mono { display: none !important; }' });
await hideDebug(page);

const shot = async (name) => {
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-${size.suffix}.png` });
  console.log('saved', lang, device, name);
};
const closeModal = async () => {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
};

// 1) Home: ricerca per paese, città, zona e categoria
await shot('01-cerca');

// 2) Risultati a Piacenza
await page.selectOption('#f-city', 'Piacenza');
await page.waitForTimeout(800);
await page.evaluate(() => document.querySelector('main h2')?.scrollIntoView({ block: 'start' }));
await page.evaluate(() => window.scrollBy(0, -90));
await shot('02-risultati');

// 3) Dettaglio dell'annuncio
await page.locator('article button').nth(1).click();
await shot('03-annuncio');
await closeModal();

// 4) Con Premium: tema scuro e ricerche salvate (stato Premium simulato solo per lo screenshot)
const proPage = await context.newPage();
await proPage.addInitScript(() => {
  localStorage.setItem('sospro24.pro', 'true');
  localStorage.setItem('sospro_dark_v1', 'true');
  localStorage.setItem('sospro_saved_searches_v1', JSON.stringify([
    { id: 1, country: 'IT', city: 'Piacenza', zone: 'ALL', category: 'consulting_tech', subcategory: 'ALL', q: '', sos: false, verified: false },
    { id: 2, country: 'IT', city: 'Milano', zone: 'ALL', category: 'home_sos', subcategory: 'plumber', q: '', sos: true, verified: false },
  ]));
});
await proPage.goto('http://localhost:5174/?storeshot');
await proPage.waitForSelector('article', { timeout: 30000 });
await hideDebug(proPage);
await proPage.selectOption('#f-city', 'Piacenza');
await proPage.waitForTimeout(800);
await proPage.evaluate(() => document.querySelector('main h2')?.scrollIntoView({ block: 'start' }));
await proPage.evaluate(() => window.scrollBy(0, -90));
await proPage.waitForTimeout(1200);
await proPage.screenshot({ path: `${OUT}/04-premium-scuro-${size.suffix}.png` });
console.log('saved', lang, device, '04-premium-scuro');
await proPage.close();

// 5) Premium
await page.locator('header button[aria-label="SOSPro24 Premium"]').click();
await shot('05-premium');

await browser.close();
