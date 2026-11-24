// Annunci, richieste, segnalazioni e lista d'attesa
import React, { useEffect, useMemo, useState } from 'react';
import { ExternalLink, Pencil, Trash2, ShieldCheck, Eye, EyeOff, CheckCircle2, RefreshCw, Mail } from 'lucide-react';
import { Card, Btn, Badge, Empty, inputCls, inputBase, fmtDate, matches } from './ui';
import { categoryName, subcategoryName } from '../lib/utils';
import ListingFormModal from './ListingForm';
import EmailModal from './EmailModal';
import * as api from './api';

const SITE = 'https://sospro24.com';
const STATUS_COLOR = { active: 'green', hidden: 'amber', removed: 'red', closed: 'slate' };
const STATUS_LABEL = { active: 'attivo', hidden: 'nascosto', removed: 'rimosso', closed: 'chiusa' };

function useList(fn, toast) {
  const [rows, setRows] = useState(null);
  const load = () => fn().then(setRows).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return [rows, load];
}

/* ------------------------------ ANNUNCI ------------------------------ */
export function Listings({ toast }) {
  const [rows, load] = useList(api.listListings, toast);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [edit, setEdit] = useState(null);

  const list = useMemo(() => (rows || []).filter((l) => (status === 'all' || l.status === status)
    && matches(q, l.title, l.name, l.city, l.country, l.owner_email, l.category_id)), [rows, q, status]);

  const act = async (fn, msg) => { try { await fn(); toast(msg); load(); } catch (e) { toast(e.message, 'error'); } };

  return (
    <>
      <Card
        title={`Annunci${rows ? ` (${rows.length})` : ''}`}
        actions={<>
          <input className={`${inputBase} w-56`} placeholder="Cerca titolo, nome, città…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select className={`${inputBase} w-36`} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">Tutti</option><option value="active">Attivi</option><option value="hidden">Nascosti</option><option value="removed">Rimossi</option>
          </select>
          <Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>
        </>}
      >
        {!rows ? <Empty>Caricamento…</Empty> : list.length === 0 ? <Empty>Nessun annuncio. Per crearne uno per un professionista: Account → icona +.</Empty> : (
          <div className="space-y-2">
            {list.map((l) => (
              <div key={l.id} className="flex flex-col md:flex-row md:items-start gap-3 p-3 rounded-lg border border-slate-200 hover:bg-slate-50">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-900">{l.title}</span>
                    <Badge color={STATUS_COLOR[l.status]}>{STATUS_LABEL[l.status]}</Badge>
                    {l.verified && <Badge color="blue">identità verificata</Badge>}
                    {l.sos_available && <Badge color="red">SOS</Badge>}
                    {l.reports_open > 0 && <Badge color="red">{l.reports_open} segnalaz.</Badge>}
                  </div>
                  <div className="text-xs text-slate-600 mt-0.5">
                    {l.name} · {categoryName(l.category_id, 'it')} › {subcategoryName(l.category_id, l.subcategory_id, 'it')} · {l.city}{l.zone && l.zone !== l.city ? ` (${l.zone})` : ''}, {l.country}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{l.owner_email} · {l.phone || 'senza telefono'} · {l.hourly_rate} {l.currency}/h · {l.reviews_count} recensioni · {fmtDate(l.created_at)}</div>
                </div>
                <div className="flex flex-wrap gap-1 md:justify-end shrink-0">
                  <a href={`${SITE}/?ad=${l.id}`} target="_blank" rel="noopener" className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100" title="Apri sul sito"><ExternalLink className="w-3.5 h-3.5" /></a>
                  <Btn size="sm" variant="ghost" onClick={() => setEdit(l)} title="Modifica"><Pencil className="w-3.5 h-3.5" /></Btn>
                  <Btn size="sm" variant={l.verified ? 'ghost' : 'ok'} onClick={() => act(() => api.setListing(l.id, null, !l.verified), l.verified ? 'Verifica tolta' : 'Segnato come identità verificata')} title="Identità verificata"><ShieldCheck className="w-3.5 h-3.5" /></Btn>
                  {l.status === 'active'
                    ? <Btn size="sm" variant="warn" onClick={() => act(() => api.setListing(l.id, 'hidden'), 'Annuncio nascosto')} title="Nascondi"><EyeOff className="w-3.5 h-3.5" /></Btn>
                    : <Btn size="sm" variant="ok" onClick={() => act(() => api.setListing(l.id, 'active'), 'Annuncio riattivato')} title="Riattiva"><Eye className="w-3.5 h-3.5" /></Btn>}
                  <Btn size="sm" variant="danger" onClick={() => window.confirm(`Eliminare definitivamente "${l.title}" e le sue recensioni?`) && act(() => api.deleteListing(l.id), 'Annuncio eliminato')} title="Elimina"><Trash2 className="w-3.5 h-3.5" /></Btn>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      {edit && <ListingFormModal listing={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); toast('Annuncio salvato'); load(); }} toast={toast} />}
    </>
  );
}

/* ------------------------------ RICHIESTE ------------------------------ */
export function Requests({ toast }) {
  const [rows, load] = useList(api.listRequests, toast);
  const [q, setQ] = useState('');
  const list = useMemo(() => (rows || []).filter((r) => matches(q, r.body, r.city, r.owner_email, r.category_id)), [rows, q]);
  const act = async (id, s) => { try { await api.setRequest(id, s); toast('Richiesta aggiornata'); load(); } catch (e) { toast(e.message, 'error'); } };
  const expired = (r) => r.status === 'active' && new Date(r.expires_at) < new Date();

  return (
    <Card title={`Richieste dei clienti${rows ? ` (${rows.length})` : ''}`} actions={<>
      <input className={`${inputBase} w-56`} placeholder="Cerca…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>
    </>}>
      {!rows ? <Empty>Caricamento…</Empty> : list.length === 0 ? <Empty>Nessuna richiesta.</Empty> : (
        <div className="space-y-2">
          {list.map((r) => (
            <div key={r.id} className="flex flex-col md:flex-row gap-3 p-3 rounded-lg border border-slate-200">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-1.5 mb-1">
                  <Badge color={expired(r) ? 'slate' : STATUS_COLOR[r.status]}>{expired(r) ? 'scaduta' : STATUS_LABEL[r.status]}</Badge>
                  {r.urgent && <Badge color="red">urgente</Badge>}
                  <span className="text-xs text-slate-600">{categoryName(r.category_id, 'it')} · {r.city}{r.zone ? ` (${r.zone})` : ''}, {r.country}</span>
                </div>
                <p className="text-sm text-slate-900">«{r.body}»</p>
                <div className="text-xs text-slate-500 mt-1">{r.author_name} · {r.owner_email} · {r.phone || '—'} · {fmtDate(r.created_at)}</div>
              </div>
              <div className="flex flex-wrap gap-1 md:justify-end shrink-0">
                <a href={`${SITE}/?req=${r.id}`} target="_blank" rel="noopener" className="inline-flex items-center px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold hover:bg-slate-100"><ExternalLink className="w-3.5 h-3.5" /></a>
                {r.status !== 'removed'
                  ? <Btn size="sm" variant="danger" onClick={() => window.confirm('Rimuovere questa richiesta dalla bacheca?') && act(r.id, 'removed')}>Rimuovi</Btn>
                  : <Btn size="sm" variant="ok" onClick={() => act(r.id, 'active')}>Ripristina</Btn>}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------------------------------ SEGNALAZIONI ------------------------------ */
export function Reports({ toast }) {
  const [rows, load] = useList(api.listReports, toast);
  const [mailTo, setMailTo] = useState(null);
  const run = async (fn, msg) => { try { await fn(); toast(msg); load(); } catch (e) { toast(e.message, 'error'); } };

  const target = (r) => r.listing ? { kind: 'Annuncio', text: `${r.listing.title} — ${r.listing.name}`, email: r.listing.owner_email, ownerId: r.listing.owner_id, link: `${SITE}/?ad=${r.listing.id}` }
    : r.request ? { kind: 'Richiesta', text: r.request.body, email: r.request.owner_email, ownerId: r.request.owner_id, link: `${SITE}/?req=${r.request.id}` }
    : r.review ? { kind: 'Recensione', text: `«${r.review.comment}» — ${r.review.author_name}`, link: `${SITE}/?ad=${r.review.listing_id}` }
    : { kind: 'Contenuto già eliminato', text: '' };

  return (
    <>
      <Card title={`Segnalazioni${rows ? ` (${rows.filter((r) => !r.resolved_at).length} da gestire)` : ''}`} actions={<Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>}>
        {!rows ? <Empty>Caricamento…</Empty> : rows.length === 0 ? <Empty>Nessuna segnalazione.</Empty> : (
          <div className="space-y-2">
            {rows.map((r) => {
              const t = target(r);
              return (
                <div key={r.id} className={`p-3 rounded-lg border ${r.resolved_at ? 'border-slate-200 opacity-60' : 'border-rose-200 bg-rose-50/40'}`}>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <Badge color={r.resolved_at ? 'slate' : 'red'}>{r.resolved_at ? `gestita: ${r.resolution}` : 'da gestire'}</Badge>
                    <b>{t.kind}</b> · segnalata {fmtDate(r.created_at)} {r.reporter_email ? `da ${r.reporter_email}` : '(anonimo)'}
                  </div>
                  {t.text && <p className="text-sm text-slate-900 mt-1">{t.text}</p>}
                  {r.reason && <p className="text-xs text-slate-600 mt-1">Motivo: {r.reason}</p>}
                  {!r.resolved_at && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {t.link && <a href={t.link} target="_blank" rel="noopener" className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-300 text-xs font-semibold bg-white hover:bg-slate-100"><ExternalLink className="w-3.5 h-3.5" /> Apri</a>}
                      {r.listing && r.listing.status !== 'removed' && <Btn size="sm" variant="danger" onClick={() => run(async () => { await api.setListing(r.listing.id, 'removed'); await api.resolveReport(r.id, 'annuncio rimosso'); }, 'Annuncio rimosso')}>Rimuovi annuncio</Btn>}
                      {r.request && r.request.status !== 'removed' && <Btn size="sm" variant="danger" onClick={() => run(async () => { await api.setRequest(r.request.id, 'removed'); await api.resolveReport(r.id, 'richiesta rimossa'); }, 'Richiesta rimossa')}>Rimuovi richiesta</Btn>}
                      {r.review && <Btn size="sm" variant="danger" onClick={() => window.confirm('Eliminare la recensione?') && run(async () => { await api.resolveReport(r.id, 'recensione eliminata'); await api.deleteReview(r.review.id); }, 'Recensione eliminata')}>Elimina recensione</Btn>}
                      {t.email && <Btn size="sm" variant="ghost" onClick={() => setMailTo({ email: t.email, userId: t.ownerId })}><Mail className="w-3.5 h-3.5" /> Avvisa l'autore</Btn>}
                      <Btn size="sm" variant="ghost" onClick={() => run(() => api.resolveReport(r.id, 'nessuna violazione'), 'Segnalazione archiviata')}><CheckCircle2 className="w-3.5 h-3.5" /> Nessuna violazione</Btn>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
      {mailTo && <EmailModal recipients={[{ ...mailTo, nome: '' }]} defaultTemplate="warning" onClose={() => setMailTo(null)} />}
    </>
  );
}

/* ------------------------------ LISTA D'ATTESA ------------------------------ */
export function Waitlist({ toast }) {
  const [rows, load] = useList(api.listWaitlist, toast);
  return (
    <Card title={`Lista d'attesa${rows ? ` (${rows.length})` : ''}`} actions={<Btn variant="ghost" onClick={load} aria-label="Aggiorna"><RefreshCw className="w-4 h-4" /></Btn>}>
      <p className="text-xs text-slate-500 mb-3">Clienti che hanno lasciato l'email perché nella loro zona non c'era ancora nessuno. Scrivi loro quando arriva un professionista.</p>
      {!rows ? <Empty>Caricamento…</Empty> : rows.length === 0 ? <Empty>Nessuno in attesa.</Empty> : (
        <table className="w-full text-sm">
          <thead className="text-left text-[11px] uppercase tracking-wider text-slate-500 border-b"><tr><th className="py-2">Email</th><th>Cerca</th><th>Dove</th><th>Data</th></tr></thead>
          <tbody>{rows.map((w) => (
            <tr key={w.id} className="border-b border-slate-100">
              <td className="py-2 break-all">{w.email}</td>
              <td className="text-xs">{w.category_id ? categoryName(w.category_id, 'it') : 'qualsiasi'}</td>
              <td className="text-xs">{[w.city, w.country].filter(Boolean).join(', ')}</td>
              <td className="text-xs whitespace-nowrap">{fmtDate(w.created_at)}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </Card>
  );
}
