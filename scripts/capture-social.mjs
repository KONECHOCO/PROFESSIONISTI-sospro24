// Immagini per i post social (1080x1350, formato 4:5 per LinkedIn, Instagram e Facebook).
// 1) cattura schermate reali dell'app web in sviluppo; 2) le mette in una grafica con titolo e link.
// Prerequisito: `npm run dev` avviato su http://localhost:5173
// Uso: node scripts/capture-social.mjs
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';

const BASE = 'http://localhost:5173';
const OUT = 'marketing/social';
const RAW = `${OUT}/raw`;
await mkdir(RAW, { recursive: true });

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'it-IT',
  timezoneId: 'Europe/Rome',
});
await ctx.addInitScript(() => {
  localStorage.setItem('sospro_lang', JSON.stringify('it'));
  localStorage.setItem('sospro_dark_v1', 'false');
});
const hideDebug = (p) => p.addStyleTag({ content: '.font-mono { display: none !important; } * { transition: none !important; }' });
const shot = async (p, name) => {
  await p.waitForTimeout(900);
  await p.screenshot({ path: `${RAW}/${name}.png` });
  console.log('raw', name);
};
// Porta l'elemento appena sotto l'header fisso (alto ~140 px su telefono)
const scrollTo = (p, selector, offset = 150) => p.evaluate(([sel, off]) => {
  const el = document.querySelector(sel);
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
}, [selector, offset]);

// 1) Home: ricerca professionisti
let page = await ctx.newPage();
await page.goto(`${BASE}/`);
await page.waitForSelector('[role=tablist]');
await hideDebug(page);
await shot(page, 'home');

// 2) Professionisti a Piacenza
await page.selectOption('#f-city', 'Piacenza');
await scrollTo(page, 'main article', 230);
await shot(page, 'pros');

// 3) Bacheca richieste
await page.goto(`${BASE}/?view=requests`);
await page.waitForSelector('article');
await hideDebug(page);
await scrollTo(page, 'main article', 230);
await shot(page, 'requests');

// 4) Dettaglio richiesta
await page.locator('article button').first().click();
await shot(page, 'request-detail');
await page.close();

// 5) Modulo "Pubblica una richiesta" compilato con un esempio
page = await ctx.newPage();
await page.goto(`${BASE}/?shotreq`);
await page.waitForSelector('textarea');
await hideDebug(page);
await page.fill('textarea', 'Cerco un idraulico zona Piacenza per una perdita sotto il lavello, possibilmente oggi.');
const selects = page.locator('[role=dialog] select');
await selects.nth(3).selectOption('Piacenza');
await shot(page, 'request-form');
await page.close();

// ---------- Grafiche 1080x1350 ----------
const img = async (name) => `data:image/png;base64,${(await readFile(`${RAW}/${name}.png`)).toString('base64')}`;

const POSTS = [
  { file: '01-cerchi-un-professionista', shot: 'request-form', kicker: 'Per chi cerca', title: 'Cerchi un idraulico zona Piacenza?', text: 'Scrivilo su SOSPro24: i professionisti della tua zona vedono la richiesta e ti contattano. Gratis.' },
  { file: '02-bacheca-richieste', shot: 'requests', kicker: 'Per i professionisti', title: 'Clienti che cercano te, nella tua città', text: 'Apri la bacheca Richieste, scegli la tua città e rispondi per primo con una chiamata o su WhatsApp.' },
  { file: '03-pubblica-annuncio', shot: 'pros', kicker: 'Per i professionisti', title: 'Promuovi la tua attività gratis', text: 'Annuncio con tariffe, zona e disponibilità SOS 24/7. I clienti ti chiamano direttamente, senza commissioni.' },
  { file: '04-cerca-e-contatta', shot: 'home', kicker: 'Per tutti', title: 'Il professionista giusto, vicino a te', text: 'Idraulici, elettricisti, babysitter, colf, estetiste, tecnici e consulenti. Cerca per città e zona.' },
];

const html = (p, src) => `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1080px; height: 1350px; font-family: 'Segoe UI', Inter, Arial, sans-serif; color: #fff; overflow: hidden;
    background: radial-gradient(circle at 85% 10%, #2563eb 0%, transparent 45%), linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%); }
  .top { padding: 70px 80px 0; }
  .brand { display: flex; align-items: center; gap: 18px; font-weight: 800; font-size: 40px; letter-spacing: -0.5px; }
  .logo { width: 64px; height: 64px; border-radius: 18px; background: linear-gradient(135deg, #2563eb, #0f172a); display: grid; place-items: center; font-size: 36px; box-shadow: 0 8px 24px rgba(37,99,235,.5); }
  .brand b { color: #60a5fa; }
  .kicker { margin-top: 44px; display: inline-block; padding: 10px 22px; border-radius: 999px; background: rgba(239,68,68,.18); border: 2px solid rgba(248,113,113,.5); color: #fecaca; font-weight: 700; font-size: 26px; text-transform: uppercase; letter-spacing: 1.5px; }
  h1 { margin-top: 22px; font-size: 68px; line-height: 1.05; font-weight: 900; letter-spacing: -1.5px; max-width: 920px; }
  p { margin-top: 20px; font-size: 32px; line-height: 1.35; color: #cbd5e1; max-width: 900px; }
  .phone { position: absolute; left: 50%; transform: translateX(-50%); top: 600px; width: 520px; height: 1126px; border-radius: 64px; background: #020617; padding: 16px; box-shadow: 0 40px 80px rgba(0,0,0,.55), 0 0 0 3px #334155; }
  .phone img { width: 100%; height: 100%; object-fit: cover; object-position: top; border-radius: 50px; display: block; }
  .foot { position: absolute; left: 0; right: 0; bottom: 0; height: 120px; background: #020617; border-top: 2px solid #1e3a8a; display: flex; align-items: center; justify-content: center; gap: 26px; font-size: 32px; font-weight: 800; }
  .foot span { color: #93c5fd; font-weight: 600; font-size: 26px; }
</style></head><body>
  <div class="top">
    <div class="brand"><div class="logo">⚡</div><div>SOSPro<b>24</b></div></div>
    <div class="kicker">${p.kicker}</div>
    <h1>${p.title}</h1>
    <p>${p.text}</p>
  </div>
  <div class="phone"><img src="${src}"></div>
  <div class="foot">sospro24.com <span>· App Store · Android in arrivo</span></div>
</body></html>`;

const art = await browser.newPage({ viewport: { width: 1080, height: 1350 }, deviceScaleFactor: 1 });
for (const p of POSTS) {
  await art.setContent(html(p, await img(p.shot)), { waitUntil: 'load' });
  await art.screenshot({ path: `${OUT}/${p.file}.png` });
  console.log('post', p.file);
}
await browser.close();
