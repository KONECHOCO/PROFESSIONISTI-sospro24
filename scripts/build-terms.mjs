// Genera public/terms.html (Condizioni di utilizzo in 5 lingue) dagli stessi testi
// mostrati nell'app (LEGAL_SECTIONS + LEGAL_EXTRA), così sito e app non divergono mai.
// Si lancia da solo prima di ogni build: npm run build
import { writeFileSync } from 'node:fs';
import { LANGUAGES, UI_TEXT, LEGAL_SECTIONS } from '../src/data/i18n.js';
import { LEGAL_EXTRA } from '../src/data/i18nExtra.js';

// Da aggiornare quando cambia il contenuto delle Condizioni
const UPDATED = {
  it: 'Ultimo aggiornamento: 24 novembre 2026',
  en: 'Last updated: 24 November 2026',
  fr: 'Dernière mise à jour : 24 novembre 2026',
  es: 'Última actualización: 24 de noviembre de 2026',
  de: 'Zuletzt aktualisiert: 24. November 2026',
};
const PRIVACY = { it: 'Informativa privacy', en: 'Privacy policy', fr: 'Confidentialité', es: 'Privacidad', de: 'Datenschutz' };

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const linkify = (s) => esc(s)
  .replace(/supporto@sospro24\.com/g, '<a href="mailto:supporto@sospro24.com">supporto@sospro24.com</a>')
  .replace(/sospro24\.com\/terms\.html/g, '<a href="https://sospro24.com/terms.html">sospro24.com/terms.html</a>');

const sections = LANGUAGES.map(({ code, label }) => {
  const list = [...(LEGAL_SECTIONS[code] || LEGAL_SECTIONS.it), ...(LEGAL_EXTRA[code] || LEGAL_EXTRA.it)];
  return `<section id="${code}" lang="${code}">
<h1>${esc(UI_TEXT[code]?.termsTitle || UI_TEXT.it.termsTitle)}</h1>
<p class="muted">${UPDATED[code]} · <a href="/privacy.html#${code}">${PRIVACY[code]}</a></p>
${list.map((s) => `<h2>${esc(s.title)}</h2>\n<p>${linkify(s.body)}</p>`).join('\n')}
</section>`;
}).join('\n');

const nav = LANGUAGES.map(({ code, label }) => `<a href="#${code}">${esc(label)}</a>`).join(' · ');

const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>SOSPro24 – Condizioni di utilizzo</title>
<meta name="description" content="Condizioni generali di utilizzo di SOSPro24 (sito e app). Terms of use in Italiano, English, Français, Español, Deutsch.">
<link rel="icon" type="image/svg+xml" href="/icon.svg">
<link rel="canonical" href="https://sospro24.com/terms.html">
<style>
body{margin:0;font-family:Inter,system-ui,-apple-system,sans-serif;color:#0f172a;background:#f8fafc;line-height:1.6}
header{background:#0f172a;color:#fff;padding:16px}
header a{color:#93c5fd}
main{max-width:760px;margin:0 auto;padding:16px 16px 48px}
section{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:20px;margin:16px 0}
h1{font-size:24px;margin:0 0 4px}
h2{font-size:17px;margin:20px 0 4px}
p{margin:0 0 8px}
.muted{color:#475569;font-size:14px}
a{color:#1d4ed8}
</style>
</head>
<body>
<!-- File generato da scripts/build-terms.mjs: modificare i testi in src/data/i18n.js e src/data/i18nExtra.js -->
<header><strong><a href="/" style="color:#fff;text-decoration:none">SOSPro<span style="color:#93c5fd">24</span></a></strong> · ${nav}</header>
<main>
${sections}
</main>
</body>
</html>
`;

writeFileSync(new URL('../public/terms.html', import.meta.url), html);
console.log('public/terms.html aggiornato');
