// Lettura dei CSV di contatti (Excel: File → Salva con nome → CSV UTF-8).
// Le colonne vengono riconosciute dal nome: Azienda, Categoria, Città, Paese, Email, Telefono, Sito, Fonte.
/* ---------- CSV: separatore , o ; e virgolette, intestazioni riconosciute in automatico ---------- */
function parseCsv(text) {
  const src = text.replace(/^﻿/, '');
  const firstLine = src.split(/\r?\n/, 1)[0];
  const sep = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [], cell = '', inQ = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQ) {
      if (ch === '"' && src[i + 1] === '"') { cell += '"'; i++; } else if (ch === '"') inQ = false; else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === sep) { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const COUNTRY_CODES = { italia: 'IT', italy: 'IT', francia: 'FR', france: 'FR', spagna: 'ES', espana: 'ES', españa: 'ES', spain: 'ES', 'regno unito': 'GB', uk: 'GB', 'united kingdom': 'GB', germania: 'DE', germany: 'DE', deutschland: 'DE', svizzera: 'CH', switzerland: 'CH', suisse: 'CH', schweiz: 'CH' };
const LANG_OF = { IT: 'it', FR: 'fr', ES: 'es', GB: 'en', DE: 'de', CH: 'de' };

const FIELDS = {
  business_name: /azienda|professionista|business|nome|name|ragione/i,
  category: /categoria|category|servizio/i,
  city: /citt|city|comune|localit/i,
  country: /paese|country|nazione/i,
  email: /e-?mail/i,
  phone: /telefono|phone|tel/i,
  website: /sito|website|web/i,
  source: /scheda|fonte|source|pagine/i,
};

export function csvToContacts(text) {
  const [header, ...lines] = parseCsv(text);
  if (!header) return [];
  const col = {};
  for (const [field, re] of Object.entries(FIELDS)) {
    const idx = header.findIndex((h, i) => re.test(h) && !Object.values(col).includes(i));
    if (idx >= 0) col[field] = idx;
  }
  return lines.map((r) => {
    const get = (f) => (col[f] !== undefined ? (r[col[f]] || '').trim() : '');
    const country = COUNTRY_CODES[get('country').toLowerCase()] || (get('country').length <= 3 ? get('country').toUpperCase() : '') || 'IT';
    return {
      business_name: get('business_name'),
      category: get('category').split('/')[0].trim(),
      city: get('city'),
      country,
      email: get('email').split(/[;,\s]/)[0],
      phone: get('phone').split(';')[0].trim(),
      website: get('website'),
      source: get('source'),
      lang: LANG_OF[country] || 'it',
    };
  }).filter((c) => c.business_name);
}

