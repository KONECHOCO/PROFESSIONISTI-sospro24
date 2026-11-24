import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { Card, Btn, Stat, Empty, Badge, fmtDate } from './ui';
import { countryName } from '../lib/utils';
import * as api from './api';

const ROWS = [
  ['users', 'Nuovi utenti'], ['pros', 'di cui professionisti'], ['listings', 'Annunci'], ['requests', 'Richieste'],
  ['reviews', 'Recensioni'], ['reports', 'Segnalazioni'], ['waitlist', "Lista d'attesa"], ['emails', 'Email inviate'],
];

export default function Dashboard({ toast, go }) {
  const [d, setD] = useState(null);
  const load = () => api.dashboard().then(setD).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!d) return <Empty>Caricamento…</Empty>;
  const t = d.totals;
  const max = Math.max(1, ...d.daily.map((x) => x.users + x.listings + x.requests));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat label="Utenti" value={t.users} sub={`${t.pros} professionisti · ${t.clients} clienti`} />
        <Stat label="Annunci attivi" value={t.listings_active} sub={`${t.listings_all} in totale`} />
        <Stat label="Richieste aperte" value={t.requests_active} />
        <Stat label="Segnalazioni da gestire" value={t.reports_open} color={t.reports_open ? 'text-rose-600' : 'text-slate-900'} sub={t.reports_open ? <button type="button" className="text-rose-700 underline" onClick={() => go('reports')}>Gestisci</button> : 'tutto in ordine'} />
        <Stat label="Lista d'attesa" value={t.waitlist} />
        <Stat label="Recensioni" value={t.reviews} />
        <Stat label="Contatti invitati" value={`${t.contacts_invited}/${t.contacts}`} sub={<button type="button" className="text-blue-700 underline" onClick={() => go('contacts')}>Apri contatti</button>} />
        <Stat label="Email da confermare" value={t.unconfirmed} sub="account che non hanno cliccato il link" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Movimenti" className="lg:col-span-1" actions={<Btn variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Btn>}>
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-slate-500"><tr><th className="text-left py-1"></th><th className="text-right">Oggi</th><th className="text-right">Ieri</th><th className="text-right">7 gg</th></tr></thead>
            <tbody>{ROWS.map(([k, label]) => (
              <tr key={k} className="border-t border-slate-100">
                <td className="py-1.5">{label}</td>
                <td className="text-right font-bold tabular-nums">{d.today[k]}</td>
                <td className="text-right tabular-nums">{d.yesterday[k]}</td>
                <td className="text-right tabular-nums">{d.week[k]}</td>
              </tr>
            ))}</tbody>
          </table>
        </Card>

        <Card title="Ultimi 30 giorni" className="lg:col-span-2">
          <div className="flex items-end gap-[3px] h-40" role="img" aria-label="Nuovi utenti, annunci e richieste per giorno">
            {d.daily.map((x) => {
              const tot = x.users + x.listings + x.requests;
              return (
                <div key={x.day} className="flex-1 flex flex-col justify-end h-full group relative" title={`${x.day}: ${x.users} utenti, ${x.listings} annunci, ${x.requests} richieste`}>
                  <div className="bg-amber-400 rounded-t-[2px]" style={{ height: `${(x.requests / max) * 100}%` }} />
                  <div className="bg-emerald-500" style={{ height: `${(x.listings / max) * 100}%` }} />
                  <div className="bg-blue-600" style={{ height: `${(x.users / max) * 100}%` }} />
                  {tot === 0 && <div className="bg-slate-200 h-[2px]" />}
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1"><span>{d.daily[0]?.day}</span><span>oggi</span></div>
          <div className="flex gap-3 text-xs mt-2">
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-blue-600 inline-block" /> utenti</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> annunci</span>
            <span className="inline-flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" /> richieste</span>
          </div>
        </Card>
      </div>

      <Card title="Annunci attivi per paese">
        {Object.keys(d.by_country).length === 0 ? <Empty>Ancora nessun annuncio attivo.</Empty> : (
          <div className="flex flex-wrap gap-2">
            {Object.entries(d.by_country).sort((a, b) => b[1] - a[1]).map(([c, n]) => <Badge key={c} color="blue">{countryName(c, 'it')}: {n}</Badge>)}
          </div>
        )}
      </Card>
    </div>
  );
}

export function Emails({ toast }) {
  const [rows, setRows] = useState(null);
  const load = () => api.emailLog(300).then(setRows).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card title="Email inviate" actions={<Btn variant="ghost" size="sm" onClick={load}><RefreshCw className="w-3.5 h-3.5" /></Btn>}>
      {!rows ? <Empty>Caricamento…</Empty> : rows.length === 0 ? <Empty>Nessuna email inviata. Si inviano da Account, Contatti o Segnalazioni.</Empty> : (
        <div className="space-y-1.5">
          {rows.map((m) => (
            <details key={m.id} className="rounded-lg border border-slate-200 px-3 py-2">
              <summary className="cursor-pointer text-sm flex flex-wrap items-center gap-2">
                <Badge color={m.status === 'sent' ? 'green' : 'red'}>{m.status === 'sent' ? 'inviata' : 'errore'}</Badge>
                <span className="font-semibold">{m.to_email}</span>
                <span className="text-slate-600 truncate">{m.subject}</span>
                <span className="text-xs text-slate-500 ml-auto">{m.kind} · {fmtDate(m.created_at)}</span>
              </summary>
              {m.error && <p className="text-xs text-rose-700 mt-2">{m.error}</p>}
              <pre className="mt-2 text-xs whitespace-pre-wrap font-sans text-slate-700">{m.body}</pre>
            </details>
          ))}
        </div>
      )}
    </Card>
  );
}
