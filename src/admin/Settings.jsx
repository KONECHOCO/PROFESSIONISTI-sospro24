// Chiavi (salvate cifrate nel Vault di Supabase e mai rilette), Telegram, email e notifiche
import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, KeyRound, Send } from 'lucide-react';
import { Card, Btn, Field, Empty, inputCls, inputBase } from './ui';
import * as api from './api';

const SECRETS = [
  {
    name: 'sospro_sendgrid_key', flag: 'has_sendgrid', label: 'Chiave API SendGrid',
    help: 'Stesso account di IT Helpdesk e del programma ambasciatori: SendGrid → Settings → API Keys → Create API Key (permesso "Mail Send"). Inizia con SG.',
  },
  {
    name: 'sospro_telegram_token', flag: 'has_telegram', label: 'Token del bot Telegram',
    help: 'Su Telegram apri @BotFather → /newbot → scegli nome e username (es. SOSPro24AdminBot) → copia il token.',
  },
  {
    name: 'sospro_service_key', flag: 'has_service', label: 'Chiave di servizio Supabase (secret / service_role)',
    help: 'Serve per creare account, bloccarli e cambiare email. Supabase → Project Settings → API Keys → secret key. Non metterla mai nell\'app o nel sito: va solo qui.',
  },
];

const NOTIFY = [
  ['notify_signup', 'Nuove registrazioni'], ['notify_listing', 'Nuovi annunci'], ['notify_request', 'Nuove richieste dei clienti'],
  ['notify_report', 'Segnalazioni'], ['notify_review', 'Recensioni'], ['notify_waitlist', "Iscrizioni alla lista d'attesa"],
];

export default function Settings({ toast }) {
  const [s, setS] = useState(null);
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState('');
  const load = () => api.getSettings().then(setS).catch((e) => toast(e.message, 'error'));
  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (key, fn, msg) => {
    setBusy(key);
    try { const r = await fn(); toast(typeof msg === 'function' ? msg(r) : msg); await load(); } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };

  if (!s) return <Empty>Caricamento…</Empty>;
  const set = (k, v) => setS({ ...s, [k]: v });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <Card title="Chiavi" className="lg:col-span-2">
        <p className="text-xs text-slate-600 mb-4">
          Le chiavi vengono salvate cifrate nel Vault di Supabase. Una volta salvate non si possono più leggere, nemmeno da qui:
          per cambiarle incolla quella nuova.
        </p>
        <div className="space-y-4">
          {SECRETS.map((x) => (
            <div key={x.name} className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-2 items-end">
              <Field label={<span className="inline-flex items-center gap-1.5">{s[x.flag] ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <Circle className="w-4 h-4 text-slate-400" />} {x.label} {s[x.flag] ? '— salvata' : '— mancante'}</span>} hint={x.help}>
                <input type="password" autoComplete="off" className={inputCls} placeholder={s[x.flag] ? '•••••••• (incolla per sostituire)' : 'Incolla qui'} value={values[x.name] || ''} onChange={(e) => setValues({ ...values, [x.name]: e.target.value })} />
              </Field>
              <Btn onClick={() => run(x.name, async () => { await api.setSecret(x.name, values[x.name]); setValues({ ...values, [x.name]: '' }); }, 'Chiave salvata')} disabled={!values[x.name] || busy === x.name}>
                <KeyRound className="w-4 h-4" /> Salva
              </Btn>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Telegram">
        <ol className="text-sm space-y-1.5 list-decimal pl-5 mb-4">
          <li>Salva il token del bot qui sopra.</li>
          <li>Su Telegram apri il tuo bot e premi <b>Avvia</b> (o scrivi /start).</li>
          <li>Premi <b>Collega la chat</b>: arriva un messaggio di conferma.</li>
        </ol>
        <p className="text-sm mb-3">Chat collegata: <b>{s.telegram_chat_id || 'nessuna'}</b></p>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={() => run('tg', api.telegramLink, (r) => `Collegato a ${r.name || r.chat_id}`)} disabled={!s.has_telegram || busy === 'tg'}>Collega la chat</Btn>
          <Btn variant="ghost" onClick={() => run('sum', () => api.sendSummary(true), 'Riepilogo di oggi inviato su Telegram')} disabled={!s.telegram_chat_id || busy === 'sum'}><Send className="w-4 h-4" /> Prova: riepilogo di oggi</Btn>
        </div>

        <h3 className="font-bold text-sm mt-6 mb-2">Notifiche in tempo reale</h3>
        <div className="space-y-1.5">
          {NOTIFY.map(([k, label]) => (
            <label key={k} className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={s[k] === 'true'} onChange={(e) => set(k, String(e.target.checked))} /> {label}
            </label>
          ))}
        </div>
        <Field label="Riepilogo giornaliero alle ore (ora italiana)">
          <select className={`${inputBase} w-28 mt-1`} value={s.daily_summary_hour} onChange={(e) => set('daily_summary_hour', e.target.value)}>
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={String(h)}>{String(h).padStart(2, '0')}:00</option>)}
          </select>
        </Field>
        {!s.has_cron && <p className="text-xs text-rose-700 mt-2">Il job orario (pg_cron) non risulta attivo: riesegui supabase/admin.sql.</p>}
      </Card>

      <Card title="Email (SendGrid)">
        <div className="space-y-3">
          <Field label="Mittente" hint="Deve essere un mittente verificato su SendGrid (Settings → Sender Authentication). supporto@ikonetsolutions.com lo è già; per usare supporto@sospro24.com verificalo prima su SendGrid.">
            <input className={inputCls} value={s.mail_from} onChange={(e) => set('mail_from', e.target.value)} />
          </Field>
          <Field label="Nome mittente"><input className={inputCls} value={s.mail_from_name} onChange={(e) => set('mail_from_name', e.target.value)} /></Field>
          <Field label="Rispondi a" hint="Le risposte dei professionisti arrivano qui."><input className={inputCls} value={s.mail_reply_to} onChange={(e) => set('mail_reply_to', e.target.value)} /></Field>
          <Field label="Massimo email nelle 24 ore" hint="Protezione contro gli invii per errore. Il piano SendGrid è condiviso con IT Helpdesk e ambasciatori.">
            <input type="number" min="1" max="2000" className={`${inputBase} w-32`} value={s.mail_daily_limit} onChange={(e) => set('mail_daily_limit', e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="lg:col-span-2 flex justify-end">
        <Btn onClick={() => run('save', () => api.updateSettings(Object.fromEntries(
          ['mail_from', 'mail_from_name', 'mail_reply_to', 'mail_daily_limit', 'daily_summary_hour', ...NOTIFY.map(([k]) => k)].map((k) => [k, s[k]]),
        )), 'Impostazioni salvate')} disabled={busy === 'save'}>Salva impostazioni</Btn>
      </div>
    </div>
  );
}
