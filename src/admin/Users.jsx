import React, { useEffect, useMemo, useState } from 'react';
import { UserPlus, Mail, Pencil, Ban, Trash2, RotateCcw, PlusCircle, RefreshCw, KeyRound } from 'lucide-react';
import { Card, Btn, Badge, Modal, Field, Empty, inputCls, inputBase, fmtDate, matches } from './ui';
import { COUNTRIES } from '../data';
import EmailModal from './EmailModal';
import ListingFormModal from './ListingForm';
import * as api from './api';

const COUNTRY_OPTS = COUNTRIES.filter((c) => c.code !== 'ALL');

export default function Users({ toast }) {
  const [rows, setRows] = useState(null);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('all');
  const [edit, setEdit] = useState(null);
  const [creating, setCreating] = useState(false);
  const [mailTo, setMailTo] = useState(null);
  const [listingFor, setListingFor] = useState(null);

  const load = () => api.listUsers().then(setRows).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const list = useMemo(() => (rows || []).filter((u) =>
    (role === 'all' || (role === 'banned' ? u.banned : role === 'unconfirmed' ? !u.confirmed : u.role === role))
    && matches(q, u.email, u.name, u.city, u.country)), [rows, q, role]);

  const ban = async (u) => {
    const reason = window.prompt(u.banned ? `Sbloccare ${u.email}?` : `Bloccare ${u.email}? Non potrà più accedere e i suoi annunci verranno nascosti.\n\nMotivo (facoltativo):`, '');
    if (reason === null) return;
    try { await api.setBanned(u.id, !u.banned, reason); toast(u.banned ? 'Account sbloccato' : 'Account bloccato'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  // Nuova email di benvenuto con il link (pagina benvenuto.html, valida 7 giorni) per scegliere la password
  const resendWelcome = async (u) => {
    if (!window.confirm(`Mandare a ${u.email} una nuova email di benvenuto con il link per scegliere la password?`)) return;
    try { await api.sendWelcome(u.id); toast('Email di benvenuto inviata'); } catch (e) { toast(e.message, 'error'); }
  };

  // Per chi non riesce a confermare l'email (spam, filtri aziendali): conferma a mano dal pannello
  const confirm = async (u) => {
    if (!window.confirm(`Confermare a mano l'email di ${u.email}? Potrà accedere subito con la password scelta all'iscrizione.`)) return;
    try { await api.confirmEmail(u.id); toast('Email confermata'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  const del = async (u) => {
    const typed = window.prompt(`ELIMINAZIONE DEFINITIVA di ${u.email}\nProfilo, ${u.listings} annunci, ${u.requests} richieste e ${u.reviews} recensioni verranno cancellati e non si possono recuperare.\n\nScrivi ELIMINA per confermare:`);
    if (typed !== 'ELIMINA') return;
    const reason = window.prompt('Motivo (facoltativo, finisce solo nella notifica Telegram):', '') || '';
    try { await api.deleteUser(u.id, reason); toast('Account eliminato'); load(); } catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <Card
        title={`Account${rows ? ` (${rows.length})` : ''}`}
        actions={<>
          <input className={`${inputBase} w-56`} placeholder="Cerca email, nome, città…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inputBase} w-40`} value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">Tutti</option>
            <option value="pro">Professionisti</option>
            <option value="client">Clienti</option>
            <option value="unconfirmed">Email non confermata</option>
            <option value="banned">Bloccati</option>
          </select>
          {list.length > 0 && <Btn variant="ghost" onClick={() => setMailTo(list)}><Mail className="w-4 h-4" /> Email a {list.length}</Btn>}
          <Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>
          <Btn onClick={() => setCreating(true)}><UserPlus className="w-4 h-4" /> Nuovo account</Btn>
        </>}
      >
        {!rows ? <Empty>Caricamento…</Empty> : list.length === 0 ? <Empty>Nessun account.</Empty> : (
          <div className="overflow-x-auto -mx-4">
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr><th className="px-4 py-2">Account</th><th className="px-2 py-2">Ruolo</th><th className="px-2 py-2">Luogo</th><th className="px-2 py-2">Attività</th><th className="px-2 py-2">Date</th><th className="px-4 py-2 text-right">Azioni</th></tr>
              </thead>
              <tbody>
                {list.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50 align-top">
                    <td className="px-4 py-2.5">
                      <div className="font-semibold text-slate-900">{u.name || '—'} {u.is_admin && <Badge color="blue">admin</Badge>}</div>
                      <div className="text-xs text-slate-600 break-all">{u.email}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {!u.confirmed && (
                          <button type="button" onClick={() => confirm(u)} title="Conferma a mano: potrà accedere subito con la sua password">
                            <Badge color="amber">email da confermare · Conferma ora</Badge>
                          </button>
                        )}
                        {u.banned && <Badge color="red">bloccato</Badge>}
                        {u.opted_out && <Badge color="slate">no email</Badge>}
                        {u.reported > 0 && <Badge color="red">{u.reported} segnalaz.</Badge>}
                      </div>
                    </td>
                    <td className="px-2 py-2.5"><Badge color={u.role === 'pro' ? 'green' : 'slate'}>{u.role === 'pro' ? 'professionista' : 'cliente'}</Badge></td>
                    <td className="px-2 py-2.5 text-xs">{[u.city, u.country].filter(Boolean).join(', ') || '—'}</td>
                    <td className="px-2 py-2.5 text-xs whitespace-nowrap">{u.listings} annunci<br />{u.requests} richieste<br />{u.reviews} recensioni</td>
                    <td className="px-2 py-2.5 text-xs whitespace-nowrap">Iscritto {fmtDate(u.created_at)}<br />Ultimo accesso {fmtDate(u.last_sign_in_at)}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-wrap justify-end gap-1">
                        <Btn size="sm" variant="ghost" onClick={() => setMailTo([u])} disabled={u.opted_out} title="Invia email"><Mail className="w-3.5 h-3.5" /></Btn>
                        <Btn size="sm" variant="ghost" onClick={() => setEdit(u)} title="Modifica"><Pencil className="w-3.5 h-3.5" /></Btn>
                        {!u.is_admin && <Btn size="sm" variant="ghost" onClick={() => resendWelcome(u)} title="Reinvia benvenuto (link per scegliere la password)"><KeyRound className="w-3.5 h-3.5" /></Btn>}
                        {u.role === 'pro' && <Btn size="sm" variant="ghost" onClick={() => setListingFor(u)} title="Crea annuncio per questo account"><PlusCircle className="w-3.5 h-3.5" /></Btn>}
                        {!u.is_admin && <Btn size="sm" variant={u.banned ? 'ok' : 'warn'} onClick={() => ban(u)} title={u.banned ? 'Sblocca' : 'Blocca'}>{u.banned ? <RotateCcw className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}</Btn>}
                        {!u.is_admin && <Btn size="sm" variant="danger" onClick={() => del(u)} title="Elimina"><Trash2 className="w-3.5 h-3.5" /></Btn>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {edit && <EditUserModal user={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast('Account aggiornato'); load(); }} toast={toast} />}
      {creating && <CreateUserModal onClose={() => setCreating(false)} onCreated={(r, u) => { setCreating(false); toast(r.email_sent === false && r.email_error ? `Account creato, email NON inviata: ${r.email_error}` : 'Account creato'); load(); if (u.role === 'pro' && window.confirm('Creare subito il suo annuncio?')) setListingFor({ id: r.id, name: u.name, country: u.country, city: u.city }); }} toast={toast} />}
      {mailTo && (
        <EmailModal
          recipients={mailTo.map((u) => ({ email: u.email, nome: u.name, citta: u.city, lang: u.lang, userId: u.id, optedOut: u.opted_out }))}
          onClose={() => setMailTo(null)}
        />
      )}
      {listingFor && <ListingFormModal owner={listingFor} onClose={() => setListingFor(null)} onSaved={() => { setListingFor(null); toast('Annuncio salvato'); load(); }} toast={toast} />}
    </>
  );
}

function EditUserModal({ user, onClose, onSaved, toast }) {
  const [f, setF] = useState({ name: user.name || '', email: user.email, role: user.role || 'client', country: user.country || '', city: user.city || '' });
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    try { await api.updateUser(user.id, f); onSaved(); } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="Modifica account" onClose={onClose}>
      <UserFields f={f} setF={setF} />
      <p className="text-[11px] text-slate-500 mt-3">Cambiare l'email richiede la chiave di servizio Supabase nelle Impostazioni.</p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn onClick={save} disabled={busy || !f.name.trim()}>{busy ? 'Salvo…' : 'Salva'}</Btn>
      </div>
    </Modal>
  );
}

export function CreateUserModal({ onClose, onCreated, toast, initial = {} }) {
  const [f, setF] = useState({ name: '', email: '', role: 'pro', country: 'IT', city: '', lang: 'it', welcome: true, ...initial });
  const [busy, setBusy] = useState(false);
  const create = async () => {
    setBusy(true);
    try { const r = await api.createUser(f); onCreated(r, f); } catch (e) { toast(e.message, 'error'); setBusy(false); }
  };
  return (
    <Modal title="Nuovo account" onClose={onClose}>
      <UserFields f={f} setF={setF} withLang />
      <label className="flex items-start gap-2 mt-4 text-sm cursor-pointer">
        <input type="checkbox" className="mt-1" checked={f.welcome} onChange={(e) => setF({ ...f, welcome: e.target.checked })} />
        <span>Invia l'email di benvenuto con il link per scegliere la password <span className="text-slate-500">(l'account è già confermato)</span></span>
      </label>
      <p className="text-[11px] text-slate-500 mt-3">Crea l'account solo con il consenso della persona. Servono la chiave di servizio Supabase e, per l'email, la chiave SendGrid (Impostazioni).</p>
      <div className="mt-5 flex justify-end gap-2">
        <Btn variant="ghost" onClick={onClose}>Annulla</Btn>
        <Btn onClick={create} disabled={busy || !f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email)}>{busy ? 'Creo…' : 'Crea account'}</Btn>
      </div>
    </Modal>
  );
}

function UserFields({ f, setF, withLang }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const cities = COUNTRY_OPTS.find((c) => c.code === f.country)?.cities || [];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Nome / attività"><input className={inputCls} value={f.name} onChange={set('name')} /></Field>
      <Field label="Email"><input type="email" className={inputCls} value={f.email} onChange={set('email')} /></Field>
      <Field label="Ruolo">
        <select className={inputCls} value={f.role} onChange={set('role')}>
          <option value="pro">Professionista</option>
          <option value="client">Cliente</option>
        </select>
      </Field>
      <Field label="Paese">
        <select className={inputCls} value={f.country} onChange={set('country')}>
          <option value="">—</option>
          {COUNTRY_OPTS.map((c) => <option key={c.code} value={c.code}>{c.names.it}</option>)}
        </select>
      </Field>
      <Field label="Città">
        <input className={inputCls} list="admin-cities" value={f.city} onChange={set('city')} />
        <datalist id="admin-cities">{cities.map((c) => <option key={c.id} value={c.id} />)}</datalist>
      </Field>
      {withLang && (
        <Field label="Lingua delle email">
          <select className={inputCls} value={f.lang} onChange={set('lang')}>
            <option value="it">Italiano</option><option value="fr">Français</option><option value="en">English</option>
            <option value="es">Español</option><option value="de">Deutsch</option>
          </select>
        </Field>
      )}
    </div>
  );
}
