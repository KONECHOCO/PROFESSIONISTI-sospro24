// Contatti da invitare (es. professionisti trovati su PagineGialle o siti ufficiali):
// importazione da CSV, invio dell'invito con un click, stato di ogni contatto.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Mail, UserPlus, Trash2, RefreshCw, ExternalLink, Phone, Plus, Eye } from 'lucide-react';
import { Card, Btn, Badge, Empty, Modal, Field, inputCls, inputBase, fmtDay, matches } from './ui';
import EmailModal from './EmailModal';
import { CreateUserModal } from './Users';
import * as api from './api';
import { csvToContacts } from './csv';

export const CONTACT_STATUS = {
  new: ['da contattare', 'slate'],
  invited: ['invitato', 'blue'],
  replied: ['ha risposto', 'amber'],
  consented: ['ha accettato', 'green'],
  published: ['pubblicato', 'green'],
  declined: ['non interessato', 'slate'],
  optout: ['disiscritto', 'red'],
  bounced: ['email errata', 'red'],
};

export default function Contacts({ toast }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [city, setCity] = useState('all');
  const [selected, setSelected] = useState(() => new Set());
  const [mailTo, setMailTo] = useState(null);
  const [accountFor, setAccountFor] = useState(null);
  const [edit, setEdit] = useState(null);
  const [importing, setImporting] = useState(null);
  const [creating, setCreating] = useState(false);
  const fileRef = useRef(null);

  const load = () => api.listContacts().then(setRows).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const cities = useMemo(() => [...new Set((rows || []).map((c) => c.city).filter(Boolean))].sort(), [rows]);
  const list = useMemo(() => (rows || []).filter((c) => (status === 'all' || (status === 'opened' ? c.clicks > 0 : c.status === status))
    && (city === 'all' || c.city === city)
    && matches(q, c.business_name, c.category, c.city, c.email, c.notes)), [rows, q, status, city]);
  const counts = useMemo(() => (rows || []).reduce((a, c) => ({ ...a, [c.status]: (a[c.status] || 0) + 1 }), {}), [rows]);
  const opened = useMemo(() => (rows || []).filter((c) => c.clicks > 0).length, [rows]);

  const toggle = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const allSelected = list.length > 0 && list.every((c) => selected.has(c.id));
  const selectedRows = (rows || []).filter((c) => selected.has(c.id));

  const toRecipient = (c) => ({
    email: c.email, nome: c.business_name, categoria: c.category, citta: c.city, lang: c.lang, contactId: c.id,
    optedOut: c.status === 'optout' || c.status === 'bounced',
    emailsSent: c.emails_sent || 0,
    // Link personale: quando lo apre, il pannello segna "ha aperto l'invito" e arriva un messaggio su Telegram
    link: c.token ? `https://sospro24.com/?inv=${c.token}` : undefined,
  });

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) return toast('Serve un file .csv (da Excel: File → Salva con nome → CSV UTF-8)', 'error');
    const parsed = csvToContacts(await file.text());
    if (!parsed.length) return toast('Nessuna riga riconosciuta nel file', 'error');
    setImporting({ name: file.name, rows: parsed });
  };

  const doImport = async () => {
    try {
      const r = await api.importContacts(importing.rows);
      toast(`Importati ${r.added} contatti${r.skipped ? `, ${r.skipped} già presenti o incompleti` : ''}`);
      setImporting(null);
      load();
    } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <Card
        title={`Contatti da invitare${rows ? ` (${rows.length})` : ''}`}
        actions={<>
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
          <Btn onClick={() => setCreating(true)}><Plus className="w-4 h-4" /> Nuovo contatto</Btn>
          <Btn variant="ghost" onClick={() => fileRef.current?.click()}><Upload className="w-4 h-4" /> Importa CSV</Btn>
          <Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>
        </>}
      >
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(CONTACT_STATUS).map(([k, [label, color]]) => counts[k] ? (
            <button key={k} type="button" onClick={() => setStatus(status === k ? 'all' : k)} className={status === k ? 'ring-2 ring-blue-500 rounded' : ''}>
              <Badge color={color}>{label}: {counts[k]}</Badge>
            </button>
          ) : null)}
          {opened > 0 && (
            <button type="button" onClick={() => setStatus(status === 'opened' ? 'all' : 'opened')} className={status === 'opened' ? 'ring-2 ring-blue-500 rounded' : ''}>
              <Badge color="green">👀 hanno aperto l'invito: {opened}</Badge>
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <input className={`${inputBase} w-56`} placeholder="Cerca nome, categoria, email…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inputBase} w-40`} value={city} onChange={(e) => setCity(e.target.value)}>
            <option value="all">Tutte le città</option>
            {cities.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select className={`${inputBase} w-44`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tutti gli stati</option>
            <option value="opened">👀 hanno aperto l'invito</option>
            {Object.entries(CONTACT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
          {selected.size > 0 && (
            <Btn onClick={() => setMailTo(selectedRows.map(toRecipient))}><Mail className="w-4 h-4" /> Invita i {selected.size} selezionati</Btn>
          )}
        </div>
        <p className="text-[11px] text-slate-500 mb-3">
          Scrivi solo ad aziende con email pubblica, in modo personale e senza insistere: chi non risponde non va ricontattato,
          chi si disiscrive viene bloccato da solo. Ogni email contiene chi sei e il link per disiscriversi.
        </p>

        {!rows ? <Empty>Caricamento…</Empty> : list.length === 0 ? (
          <Empty>{rows.length ? 'Nessun contatto con questi filtri.' : 'Nessun contatto. Importa un CSV con le colonne Azienda, Categoria, Città, Email, Telefono, Sito.'}</Empty>
        ) : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="pl-4 py-2 w-8"><input type="checkbox" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(list.filter((c) => c.email && c.status !== 'optout').map((c) => c.id)))} aria-label="Seleziona tutti" /></th>
                  <th className="px-2 py-2">Attività</th><th className="px-2 py-2">Contatti</th><th className="px-2 py-2">Stato</th><th className="px-4 py-2 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {list.map((c) => {
                  const [label, color] = CONTACT_STATUS[c.status] || [c.status, 'slate'];
                  return (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                      <td className="pl-4 py-2.5"><input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} disabled={!c.email || c.status === 'optout'} aria-label={`Seleziona ${c.business_name}`} /></td>
                      <td className="px-2 py-2.5">
                        <div className="font-semibold text-slate-900">{c.business_name}</div>
                        <div className="text-xs text-slate-600">{c.category} · {c.city}, {c.country}</div>
                        {c.notes && <div className="text-xs text-slate-500 mt-0.5 italic">{c.notes}</div>}
                      </td>
                      <td className="px-2 py-2.5 text-xs">
                        {c.email ? <div className="break-all">{c.email}</div> : <div className="text-slate-400">nessuna email</div>}
                        {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`} className="inline-flex items-center gap-1 text-blue-700"><Phone className="w-3 h-3" />{c.phone}</a>}
                        <div className="flex gap-2 mt-0.5">
                          {c.website && <a href={c.website} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-blue-700">sito <ExternalLink className="w-3 h-3" /></a>}
                          {c.source && c.source !== c.website && <a href={c.source} target="_blank" rel="noopener" className="inline-flex items-center gap-0.5 text-blue-700">fonte <ExternalLink className="w-3 h-3" /></a>}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-xs">
                        <Badge color={color}>{label}</Badge>
                        {c.emails_sent > 0 && <div className="text-slate-500 mt-1">{c.emails_sent} email · {fmtDay(c.last_contacted)}</div>}
                        {c.clicks > 0 && (
                          <div className="mt-1 inline-flex items-center gap-1 text-emerald-700 font-semibold" title={`Prima apertura ${fmtDay(c.first_click)}, ultima ${fmtDay(c.last_click)}`}>
                            <Eye className="w-3.5 h-3.5" /> ha aperto l'invito{c.clicks > 1 ? ` (${c.clicks} volte)` : ''} · {fmtDay(c.last_click)}
                          </div>
                        )}
                        {c.bot_clicks > 0 && !c.clicks && (
                          <div className="mt-1 text-slate-400" title="Aperto entro 3 minuti dall'invio: di solito è l'antivirus della casella, non una persona">
                            🤖 controllo automatico della casella
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap justify-end gap-1">
                          <Btn size="sm" onClick={() => setMailTo([toRecipient(c)])} disabled={!c.email || c.status === 'optout' || c.status === 'bounced'} title="Invia invito"><Mail className="w-3.5 h-3.5" /> {c.status === 'new' ? 'Invita' : ''}</Btn>
                          <Btn size="sm" variant="ghost" onClick={() => setEdit(c)} title="Stato e note">Stato</Btn>
                          {!c.user_id && <Btn size="sm" variant="ok" onClick={() => setAccountFor(c)} title="Ha accettato: crea il suo account"><UserPlus className="w-3.5 h-3.5" /></Btn>}
                          <Btn size="sm" variant="danger" onClick={async () => { if (!window.confirm(`Togliere ${c.business_name} dai contatti?`)) return; try { await api.deleteContact(c.id); load(); } catch (e) { toast(e.message, 'error'); } }} title="Elimina"><Trash2 className="w-3.5 h-3.5" /></Btn>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {importing && (
        <Modal title={`Importa ${importing.name}`} onClose={() => setImporting(null)} wide>
          <p className="text-sm mb-3">{importing.rows.length} righe riconosciute, {importing.rows.filter((r) => r.email).length} con email. I contatti già presenti (stessa email, o stesso nome nella stessa città) vengono saltati.</p>
          <div className="max-h-72 overflow-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 sticky top-0"><tr>{['Attività', 'Categoria', 'Città', 'Paese', 'Email', 'Telefono'].map((h) => <th key={h} className="text-left px-2 py-1.5">{h}</th>)}</tr></thead>
              <tbody>{importing.rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-slate-100"><td className="px-2 py-1">{r.business_name}</td><td className="px-2">{r.category}</td><td className="px-2">{r.city}</td><td className="px-2">{r.country}</td><td className="px-2">{r.email}</td><td className="px-2">{r.phone}</td></tr>
              ))}</tbody>
            </table>
          </div>
          {importing.rows.length > 50 && <p className="text-xs text-slate-500 mt-1">…e altre {importing.rows.length - 50}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setImporting(null)}>Annulla</Btn>
            <Btn onClick={doImport}><Upload className="w-4 h-4" /> Importa {importing.rows.length}</Btn>
          </div>
        </Modal>
      )}

      {edit && <EditContactModal contact={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); load(); }} toast={toast} />}
      {creating && <NewContactModal onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} toast={toast} />}
      {mailTo && <EmailModal recipients={mailTo} defaultTemplate="invite" onClose={() => setMailTo(null)} onSent={() => { setSelected(new Set()); load(); }} />}
      {accountFor && (
        <CreateUserModal
          initial={{ name: accountFor.business_name, email: accountFor.email || '', country: accountFor.country, city: accountFor.city, lang: accountFor.lang, contactId: accountFor.id }}
          onClose={() => setAccountFor(null)}
          onCreated={(r) => { setAccountFor(null); toast(r.email_sent === false && r.email_error ? `Account creato, email NON inviata: ${r.email_error}` : 'Account creato: ora crea il suo annuncio da Account'); load(); }}
          toast={toast}
        />
      )}
    </>
  );
}

// Inserimento a mano di un contatto (es. trovato su un gruppo Facebook o di persona)
const COUNTRY_LANG = { IT: 'it', FR: 'fr', GB: 'en', ES: 'es', DE: 'de', CH: 'de' };
function NewContactModal({ onClose, onSaved, toast }) {
  const [f, setF] = useState({ business_name: '', category: '', city: '', country: 'IT', email: '', phone: '', website: '', notes: '', lang: 'it' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === 'country' ? { lang: COUNTRY_LANG[e.target.value] || 'it' } : {}) });
  const emailOk = !f.email.trim() || /^\S+@\S+\.\S+$/.test(f.email.trim());
  const save = async () => {
    setBusy(true);
    try {
      const r = await api.importContacts([{ ...f, business_name: f.business_name.trim(), email: f.email.trim(), source: f.website.trim() }]);
      if (r.added) { toast('Contatto aggiunto'); onSaved(); } else { toast('Contatto già presente (stessa email, o stesso nome nella stessa città)', 'error'); setBusy(false); }
    } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="Nuovo contatto" onClose={onClose} wide>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Field label="Attività / nome *"><input className={inputCls} value={f.business_name} onChange={set('business_name')} maxLength={160} autoFocus /></Field>
        <Field label="Categoria" hint="Es. idraulici, elettricisti, imprese di pulizia: finisce nell'invito ({categoria})"><input className={inputCls} value={f.category} onChange={set('category')} maxLength={80} /></Field>
        <Field label="Città"><input className={inputCls} value={f.city} onChange={set('city')} maxLength={80} /></Field>
        <Field label="Paese">
          <select className={inputCls} value={f.country} onChange={set('country')}>
            {[['IT', 'Italia'], ['FR', 'Francia'], ['ES', 'Spagna'], ['GB', 'Regno Unito'], ['DE', 'Germania'], ['CH', 'Svizzera']].map(([c, n]) => <option key={c} value={c}>{n}</option>)}
          </select>
        </Field>
        <Field label="Email" hint={emailOk ? 'Solo email pubbliche dell\'attività' : 'Email non valida'}><input type="email" className={inputCls} value={f.email} onChange={set('email')} /></Field>
        <Field label="Telefono"><input className={inputCls} value={f.phone} onChange={set('phone')} /></Field>
        <Field label="Sito o pagina dove l'hai trovato"><input className={inputCls} value={f.website} onChange={set('website')} placeholder="https://…" /></Field>
        <Field label="Lingua delle email">
          <select className={inputCls} value={f.lang} onChange={set('lang')}>
            <option value="it">Italiano</option><option value="fr">Français</option><option value="en">English</option>
          </select>
        </Field>
      </div>
      <div className="mt-3">
        <Field label="Note"><textarea className={inputCls} rows={2} value={f.notes} onChange={set('notes')} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn onClick={save} disabled={busy || !f.business_name.trim() || !emailOk}><Plus className="w-4 h-4" /> {busy ? 'Salvo…' : 'Aggiungi'}</Btn>
      </div>
    </Modal>
  );
}

function EditContactModal({ contact, onClose, onSaved, toast }) {
  const [f, setF] = useState({ status: contact.status, notes: contact.notes || '', email: contact.email || '', phone: contact.phone || '' });
  const save = async () => { try { await api.updateContact(contact.id, f); onSaved(); } catch (e) { toast(e.message, 'error'); } };
  return (
    <Modal title={contact.business_name} onClose={onClose}>
      <div className="space-y-3">
        <Field label="Stato">
          <select className={inputCls} value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>
            {Object.entries(CONTACT_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Field>
        <Field label="Email"><input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
        <Field label="Telefono"><input className={inputCls} value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
        <Field label="Note" hint="Es. 'Ha risposto il 25/11, vuole il profilo con orari 8-18'. Se il consenso arriva per email, annota qui la data."><textarea className={inputCls} rows={3} value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} /></Field>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn onClick={save}>Salva</Btn>
      </div>
    </Modal>
  );
}
