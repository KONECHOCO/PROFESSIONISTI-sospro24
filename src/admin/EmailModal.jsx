// Invio email con un click: uno o più destinatari, modello modificabile,
// {nome} {categoria} {citta} completati per ciascun destinatario.
import React, { useMemo, useState } from 'react';
import { Send, CheckCircle2, AlertTriangle } from 'lucide-react';
import { Modal, Btn, Field, inputCls } from './ui';
import { TEMPLATES } from './templates';
import * as api from './api';

const LANGS = [['it', 'Italiano'], ['fr', 'Français'], ['en', 'English'], ['es', 'Español'], ['de', 'Deutsch']];

const fill = (s, r) => s.replace(/\{(nome|categoria|citta)\}/g, (_, k) => (r[k] || '').trim() || '…');

export default function EmailModal({ recipients, defaultTemplate = 'free', onClose, onSent }) {
  const forContacts = recipients.some((r) => r.contactId);
  const choices = TEMPLATES.filter((t) => (forContacts ? t.forContacts || t.id === 'free' : !t.forContacts || t.id === 'free'));
  const startTpl = choices.find((t) => t.id === defaultTemplate) || choices[0];
  const startLang = recipients[0]?.lang && startTpl.text[recipients[0].lang] ? recipients[0].lang : 'it';

  const valid = recipients.filter((r) => r.email && !r.optedOut);
  const skipped = recipients.length - valid.length;
  const preview = valid[0] || recipients[0] || {};
  // Un solo destinatario: il testo compare già completo con i suoi dati (nome, categoria, città).
  // Più destinatari: restano {nome} {categoria} {citta}, completati per ognuno al momento dell'invio.
  const single = valid.length === 1;

  const variant = (id, l) => {
    const t = TEMPLATES.find((x) => x.id === id);
    const v = t.text[l] || t.text.it;
    return single ? { subject: fill(v.subject, valid[0]), body: fill(v.body, valid[0]) } : v;
  };
  const [tpl, setTpl] = useState(startTpl.id);
  const [lang, setLang] = useState(startLang);
  const [subject, setSubject] = useState(() => variant(startTpl.id, startLang).subject);
  const [body, setBody] = useState(() => variant(startTpl.id, startLang).body);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState([]); // { email, ok, error }

  const applyTemplate = (id, l) => {
    const v = variant(id, l);
    setTpl(id); setLang(TEMPLATES.find((x) => x.id === id).text[l] ? l : 'it');
    setSubject(v.subject); setBody(v.body);
  };

  const available = useMemo(() => Object.keys(TEMPLATES.find((x) => x.id === tpl).text), [tpl]);

  const send = async () => {
    if (!valid.length || busy) return;
    if (valid.length > 1 && !window.confirm(`Inviare ${valid.length} email una alla volta?`)) return;
    setBusy(true);
    const out = [];
    for (const r of valid) {
      try {
        await api.sendEmail({
          to: r.email, subject: fill(subject, r), text: fill(body, r), lang,
          kind: tpl, userId: r.userId, contactId: r.contactId,
        });
        out.push({ email: r.email, ok: true });
      } catch (e) {
        out.push({ email: r.email, ok: false, error: e.message });
      }
      setResults([...out]);
    }
    setBusy(false);
    onSent?.(out);
  };

  const done = results.length === valid.length && results.length > 0;
  const okCount = results.filter((r) => r.ok).length;

  return (
    <Modal title={valid.length === 1 ? `Email a ${valid[0].email}` : `Email a ${valid.length} destinatari`} onClose={onClose} wide>
      {skipped > 0 && (
        <p className="mb-3 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {skipped} senza email o disiscritti: non verranno contattati.
        </p>
      )}
      {!done && (
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Modello">
              <select className={inputCls} value={tpl} onChange={(e) => applyTemplate(e.target.value, lang)} disabled={busy}>
                {choices.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </Field>
            <Field label="Lingua" hint={available.length < 5 ? `Modello disponibile in: ${available.join(', ')}` : undefined}>
              <select className={inputCls} value={lang} onChange={(e) => applyTemplate(tpl, e.target.value)} disabled={busy}>
                {LANGS.filter(([c]) => available.includes(c)).map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Oggetto">
            <input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} disabled={busy} />
          </Field>
          {single && (preview.nome || preview.categoria || preview.citta) && (
            <p className="text-xs text-slate-600 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              Dati presi dal contatto: <b>{preview.nome || '—'}</b> · {preview.categoria || 'categoria mancante'} · {preview.citta || 'città mancante'}
              {(!preview.categoria || !preview.citta || !preview.nome) && <span className="text-amber-800"> — dove manca un dato compare "…": correggilo nel testo.</span>}
            </p>
          )}
          <Field label="Testo" hint={single
            ? 'Testo già completato con i dati del destinatario: puoi modificarlo liberamente. Chi siamo e il link per disiscriversi si aggiungono da soli in fondo.'
            : '{nome}, {categoria} e {citta} vengono completati automaticamente per ogni destinatario. Chi siamo e il link per disiscriversi si aggiungono da soli in fondo.'}>
            <textarea className={`${inputCls} font-mono text-[13px]`} rows={14} value={body} onChange={(e) => setBody(e.target.value)} disabled={busy} />
          </Field>
          {!single && (
            <details className="text-sm">
              <summary className="cursor-pointer font-semibold text-slate-700">Anteprima e dati di ogni destinatario</summary>
              <ul className="mt-2 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                {valid.map((r) => (
                  <li key={r.email}><b>{r.nome || '—'}</b> · {r.categoria || <span className="text-amber-700">categoria mancante</span>} · {r.citta || <span className="text-amber-700">città mancante</span>} · <span className="text-slate-500">{r.email}</span></li>
                ))}
              </ul>
              <div className="mt-2 p-3 rounded-lg bg-slate-50 border border-slate-200 whitespace-pre-wrap text-[13px]">
                <div className="text-[11px] text-slate-500 mb-1">Come la riceve {preview.nome || preview.email}:</div>
                <div className="font-bold mb-2">{fill(subject, preview)}</div>
                {fill(body, preview)}
              </div>
            </details>
          )}
        </div>
      )}

      {results.length > 0 && (
        <div className="mt-4 max-h-48 overflow-y-auto space-y-1 text-xs">
          {results.map((r) => (
            <div key={r.email} className={`flex items-start gap-1.5 ${r.ok ? 'text-emerald-700' : 'text-rose-700'}`}>
              {r.ok ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-px" /> : <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />}
              <span><b>{r.email}</b>{r.error ? ` — ${r.error}` : ' — inviata'}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
        {busy && <span className="text-xs text-slate-500 mr-auto">Invio {results.length + 1} di {valid.length}…</span>}
        {done && <span className="text-sm font-semibold text-slate-700 mr-auto">Inviate {okCount} su {valid.length}</span>}
        <Btn variant="ghost" onClick={onClose} disabled={busy}>{done ? 'Chiudi' : 'Annulla'}</Btn>
        {!done && (
          <Btn onClick={send} disabled={busy || !valid.length || subject.trim().length < 2 || body.trim().length < 10}>
            <Send className="w-4 h-4" /> {busy ? 'Invio…' : `Invia${valid.length > 1 ? ` (${valid.length})` : ''}`}
          </Btn>
        )}
      </div>
    </Modal>
  );
}
