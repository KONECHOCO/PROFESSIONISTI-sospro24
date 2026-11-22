// Scene 16:9 (1920x1080) per il video tutorial HeyGen di SOSPro24.
// Usa l'app vera in sviluppo con gli annunci dimostrativi (VITE_SHOW_DEMO=true) e simula, solo dentro il browser
// di Playwright, alcune richieste di esempio e un utente registrato: nel database reale non viene scritto nulla.
// Prerequisito: dev server dimostrativo su http://localhost:5175 (config "sospro-demo" in .claude/launch.json)
// Uso: node scripts/capture-heygen.mjs
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const BASE = 'http://localhost:5175';
const OUT = 'marketing/heygen/scene';
await mkdir(OUT, { recursive: true });

const SB_KEY = 'sb-qpwdczbhazahlytvpdrb-auth-token';
const ME = { id: '00000000-0000-4000-8000-000000000001', email: 'marco.demo@example.com', name: 'Marco Bianchi' };
const ago = (min) => new Date(Date.now() - min * 60000).toISOString();
const inDays = (d) => new Date(Date.now() + d * 86400000).toISOString();

// Richieste di esempio (persone e numeri fittizi)
const req = (id, owner, author, city, zone, cat, sub, body, urgent, min) => ({
  id, owner_id: owner, author_name: author, country: 'IT', city, zone, category_id: cat, subcategory_id: sub,
  body, urgent, status: 'active', created_at: ago(min), expires_at: inDays(30 - min / 1440),
});
const REQUESTS = [
  req('r1', 'u-giulia', 'Giulia M.', 'Piacenza', 'Centro Storico', 'home_sos', 'plumber', 'Cerco un idraulico zona Piacenza: perdita sotto il lavello della cucina, possibilmente oggi pomeriggio.', true, 12),
  req('r2', 'u-luca', 'Luca R.', 'Milano', 'Isola / Garibaldi', 'home_sos', 'electrician', 'Mi salta il salvavita quando accendo il forno. Cerco un elettricista per un controllo entro domani.', true, 47),
  req('r3', 'u-sara', 'Sara T.', 'Torino', '', 'care_person', 'babysitter', 'Cerco una babysitter per due bambini (4 e 7 anni) il martedì e il giovedì dalle 16 alle 19.', false, 180),
  req('r4', 'u-paolo', 'Paolo V.', 'Roma', 'Centro / Prati', 'consulting_tech', 'it_repair', 'Il portatile non si accende più dopo un aggiornamento. Cerco un tecnico PC che venga a domicilio.', false, 320),
  req('r5', 'u-anna', 'Anna B.', 'Bologna', '', 'beauty_events', 'hair_makeup', 'Cerco parrucchiera e truccatrice a domicilio per un matrimonio il 14 dicembre, per 3 persone.', false, 900),
  req('r6', ME.id, 'Marco B.', 'Piacenza', '', 'consulting_tech', 'legal_tax', 'Cerco un consulente fiscale a Piacenza per aprire la partita IVA a gennaio.', false, 1500),
];

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const fakeSession = () => {
  const exp = Math.floor(Date.now() / 1000) + 30 * 86400;
  const user = { id: ME.id, aud: 'authenticated', role: 'authenticated', email: ME.email, user_metadata: { name: ME.name, role: 'client', country: 'IT', city: 'Piacenza' }, app_metadata: {}, created_at: ago(5000) };
  return {
    access_token: `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: ME.id, exp, role: 'authenticated', aud: 'authenticated' })}.demo`,
    refresh_token: 'demo', token_type: 'bearer', expires_in: 30 * 86400, expires_at: exp, user,
  };
};

const browser = await chromium.launch();

async function newContext({ loggedIn }) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, locale: 'it-IT', timezoneId: 'Europe/Rome' });
  await ctx.addInitScript(([key, session]) => {
    localStorage.setItem('sospro_lang', JSON.stringify('it'));
    localStorage.setItem('sospro_dark_v1', 'false');
    localStorage.setItem('sospro_saved_searches_v1', '[]');
    if (session) localStorage.setItem(key, JSON.stringify(session));
  }, [SB_KEY, loggedIn ? fakeSession() : null]);
  const json = (route, body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  const wantsObject = (route) => (route.request().headers().accept || '').includes('vnd.pgrst.object');
  await ctx.route('**/rest/v1/requests**', (route) => json(route, REQUESTS));
  await ctx.route('**/rest/v1/request_contacts**', (route) => json(route, wantsObject(route) ? { phone: '+39 000 000 0142' } : [{ phone: '+39 000 000 0142' }]));
  await ctx.route('**/rest/v1/profiles**', (route) => {
    const p = { id: ME.id, name: ME.name, role: 'client', country: 'IT', city: 'Piacenza' };
    return json(route, wantsObject(route) ? p : [p]);
  });
  await ctx.route('**/rest/v1/review_votes**', (route) => json(route, []));
  await ctx.route('**/rest/v1/rpc/**', (route) => json(route, 0));
  // Gli annunci veri si leggono con la chiave pubblica (senza il token finto)
  await ctx.route('**/rest/v1/listings**', (route) => {
    const headers = { ...route.request().headers() };
    delete headers.authorization;
    return route.continue({ headers });
  });
  await ctx.route('**/auth/v1/**', (route) => json(route, fakeSession().user));
  return ctx;
}

const STYLE = `
  .font-mono { display: none !important; }
  *, *::before, *::after { transition: none !important; animation-duration: 0s !important; }
  .hg-hl { outline: 5px solid #f59e0b !important; outline-offset: 6px; box-shadow: 0 0 0 16px rgba(245, 158, 11, .28) !important; border-radius: 16px; }
  #hg-badge { position: fixed; left: 14px; bottom: 14px; z-index: 9999; padding: 6px 12px; border-radius: 999px; background: rgba(15, 23, 42, .82); color: #fde68a; font: 600 12px/1.2 system-ui, sans-serif; letter-spacing: .3px; }
`;
async function prep(page) {
  await page.addStyleTag({ content: STYLE });
  await page.evaluate(() => {
    if (!document.getElementById('hg-badge')) {
      const b = document.createElement('div');
      b.id = 'hg-badge';
      b.textContent = 'Simulazione con dati di esempio';
      document.body.appendChild(b);
    }
  });
}
const highlight = (page, locator) => locator.first().evaluate((el) => {
  document.querySelectorAll('.hg-hl').forEach((x) => x.classList.remove('hg-hl'));
  el.classList.add('hg-hl');
});
const clearHl = (page) => page.evaluate(() => document.querySelectorAll('.hg-hl').forEach((x) => x.classList.remove('hg-hl')));
// Porta un elemento sotto l'header fisso
const scrollTo = (page, locator, offset = 110) => locator.first().evaluate((el, off) => {
  window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - off);
}, offset);
const shot = async (page, name) => {
  await page.waitForTimeout(700);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('scena', name);
};
const open = async (ctx, path = '/') => {
  const page = await ctx.newPage();
  await page.goto(`${BASE}${path}`);
  await page.waitForSelector('[role=tablist]');
  await page.waitForTimeout(1200);
  await prep(page);
  return page;
};

/* ---------------- Visitatore (non registrato) ---------------- */
let ctx = await newContext({ loggedIn: false });
let page = await open(ctx);

await shot(page, '01-home');

await highlight(page, page.locator('#f-search').locator('xpath=ancestor::div[contains(@class,"rounded-2xl")][1]'));
await shot(page, '02-ricerca');

await page.selectOption('#f-country', 'IT');
await page.selectOption('#f-city', 'Milano');
await highlight(page, page.getByRole('button', { name: /Solo SOS|SOS Disponibil/i }));
await shot(page, '03-filtro-sos');

await clearHl(page);
await scrollTo(page, page.locator('[role=tablist]'));
await highlight(page, page.locator('main article'));
await shot(page, '04-risultati');

// Registrazione
await page.getByRole('button', { name: 'Accedi / Registrati' }).first().click();
await page.getByRole('tab', { name: /Registrati/i }).click();
await page.waitForSelector('[role=radiogroup]');
await prep(page);
await highlight(page, page.locator('[role=radiogroup]'));
await shot(page, '07-registrazione');
await page.close();
await ctx.close();

/* ---------------- Utente registrato (simulato) ---------------- */
ctx = await newContext({ loggedIn: true });
page = await open(ctx);

// Dettaglio annuncio con contatto diretto
await page.selectOption('#f-country', 'IT');
await page.selectOption('#f-city', 'Milano');
await scrollTo(page, page.locator('[role=tablist]'));
await page.locator('main article').first().locator('button').nth(1).click();
await page.waitForSelector('[role=dialog]');
await prep(page);
await highlight(page, page.locator('[role=dialog] .bg-slate-900.rounded-2xl'));
await shot(page, '05-annuncio-contatto');

// Recensioni, segnala e blocca
const reviews = page.locator('[role=dialog] .border-t.pt-6').first();
await reviews.evaluate((el) => {
  const box = el.closest('[role=dialog]');
  box.scrollTop = el.offsetTop - 140;
});
await highlight(page, reviews);
await shot(page, '06-recensioni');
await page.keyboard.press('Escape');

// Bacheca richieste
await page.selectOption('#f-country', 'IT');
await page.selectOption('#f-city', 'ALL');
await page.getByRole('tab', { name: /Richieste/ }).click();
await scrollTo(page, page.locator('[role=tablist]'));
await highlight(page, page.locator('[role=tablist]'));
await shot(page, '08-bacheca-richieste');

// Pubblica una richiesta
await page.getByRole('button', { name: 'Pubblica una richiesta' }).first().click();
await page.waitForSelector('[role=dialog] textarea');
await prep(page);
await page.fill('[role=dialog] textarea', 'Cerco un idraulico zona Piacenza: perdita sotto il lavello della cucina, possibilmente oggi pomeriggio.');
const sel = page.locator('[role=dialog] select');
await sel.nth(3).selectOption('Piacenza');
await sel.nth(4).selectOption('Centro Storico');
await highlight(page, page.locator('[role=dialog] textarea'));
await shot(page, '09-pubblica-richiesta');
await page.locator('[role=dialog] input[type=tel]').fill('+39 000 000 0142');
await page.locator('[role=dialog] input[type=tel]').evaluate((el) => el.closest('form').querySelector('textarea').closest('label').scrollIntoView());
await page.locator('[role=dialog] input[type=checkbox]').first().check();
await page.locator('[role=dialog] input[type=checkbox]').last().check();
await page.locator('[role=dialog] input[type=tel]').evaluate((el) => el.scrollIntoView({ block: 'center' }));
await highlight(page, page.locator('[role=dialog] input[type=tel]').locator('xpath=ancestor::label[1]'));
await shot(page, '10-telefono-urgente');
await page.keyboard.press('Escape');

// Il professionista apre una richiesta e risponde
await page.locator('main article').filter({ hasText: 'Giulia M.' }).getByRole('button').click();
await page.waitForSelector('[role=dialog]');
await prep(page);
await highlight(page, page.locator('[role=dialog] .bg-slate-900.rounded-2xl'));
await shot(page, '11-rispondi-richiesta');
await page.keyboard.press('Escape');

// Pubblica un annuncio
await page.getByRole('button', { name: '+ Pubblica Annuncio' }).first().click();
await page.waitForSelector('[role=dialog] form');
await prep(page);
const f = page.locator('[role=dialog] form');
await f.locator('input[type=text]').first().fill('Idraulica Rossi');
await f.locator('input[type=tel]').fill('+39 000 000 0199');
await f.locator('select').nth(1).selectOption('Piacenza');
await f.locator('input[maxlength="110"]').fill('Idraulico pronto intervento 24/7 • perdite, scarichi, caldaie');
await f.locator('textarea').fill('Intervengo in tutta Piacenza e provincia entro un\'ora per perdite, scarichi otturati e piccoli lavori. Preventivo gratuito.');
await highlight(page, f);
await shot(page, '12-pubblica-annuncio');
await page.keyboard.press('Escape');

// Profilo
await page.getByRole('button', { name: /Marco/ }).first().click();
await page.waitForSelector('[role=dialog]');
await prep(page);
await highlight(page, page.locator('[role=dialog] section').filter({ hasText: 'Le mie richieste' }));
await shot(page, '13-profilo');
await page.keyboard.press('Escape');

// SOS Smart Match
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole('button', { name: /Smart Match/ }).first().click();
await page.waitForSelector('[role=dialog]');
await prep(page);
await highlight(page, page.locator('[role=dialog] .space-y-2\\.5'));
await shot(page, '14-sos-smart-match');
await page.close();
await ctx.close();

/* ---------------- Premium (interfaccia dell'app) ---------------- */
ctx = await newContext({ loggedIn: false });
page = await open(ctx, '/?storeshot');
await page.getByRole('button', { name: 'SOSPro24 Premium' }).click();
await page.waitForSelector('[role=dialog]');
await prep(page);
await shot(page, '15-premium-app');
await page.close();

/* ---------------- Cartello finale ---------------- */
page = await ctx.newPage();
await page.setViewportSize({ width: 1280, height: 720 });
await page.setContent(`<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; margin: 0; }
  body { width: 1280px; height: 720px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 22px; color: #fff; font-family: 'Segoe UI', Inter, Arial, sans-serif;
    background: radial-gradient(circle at 80% 15%, #2563eb 0%, transparent 45%), linear-gradient(160deg, #0f172a, #1e293b 60%, #0f172a); }
  .brand { display: flex; align-items: center; gap: 18px; font-size: 64px; font-weight: 900; letter-spacing: -1px; }
  .logo { width: 96px; height: 96px; border-radius: 26px; background: linear-gradient(135deg, #2563eb, #0f172a); display: grid; place-items: center; font-size: 54px; box-shadow: 0 10px 30px rgba(37,99,235,.55); }
  b { color: #60a5fa; }
  .url { font-size: 44px; font-weight: 800; padding: 14px 34px; border-radius: 20px; background: #2563eb; }
  .row { display: flex; gap: 18px; font-size: 24px; font-weight: 700; color: #cbd5e1; }
  .pill { padding: 10px 22px; border-radius: 999px; border: 2px solid #334155; background: rgba(15,23,42,.6); }
  p { font-size: 26px; color: #94a3b8; }
</style></head><body>
  <div class="brand"><div class="logo">⚡</div><div>SOSPro<b>24</b></div></div>
  <p>Professionisti e pronto intervento nella tua zona</p>
  <div class="url">sospro24.com</div>
  <div class="row"><span class="pill">App Store</span><span class="pill">Android in arrivo</span><span class="pill">Gratis</span></div>
</body></html>`);
await page.screenshot({ path: `${OUT}/16-finale.png` });
console.log('scena 16-finale');

await browser.close();
