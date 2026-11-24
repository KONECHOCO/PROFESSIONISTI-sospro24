// Pannello amministratore di SOSPro24: sospro24.com/admin.html
// Accesso con l'account SOSPro24; entra solo chi è in private.admins (supabase/admin.sql).
import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard, Users as UsersIcon, Megaphone, MessageSquare, AlertTriangle, BellRing, Contact, Mail, Settings as SettingsIcon, LogOut, Zap,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Btn, Field, inputCls, cx } from './ui';
import Dashboard, { Emails } from './Dashboard';
import Users from './Users';
import { Listings, Requests, Reports, Waitlist } from './Content';
import Contacts from './Contacts';
import Settings from './Settings';
import * as api from './api';

const PAGES = [
  ['dashboard', 'Dashboard', LayoutDashboard, Dashboard],
  ['users', 'Account', UsersIcon, Users],
  ['listings', 'Annunci', Megaphone, Listings],
  ['requests', 'Richieste', MessageSquare, Requests],
  ['reports', 'Segnalazioni', AlertTriangle, Reports],
  ['contacts', 'Contatti da invitare', Contact, Contacts],
  ['emails', 'Email inviate', Mail, Emails],
  ['waitlist', "Lista d'attesa", BellRing, Waitlist],
  ['settings', 'Impostazioni', SettingsIcon, Settings],
];

const pageFromHash = () => {
  const h = window.location.hash.replace('#', '');
  return PAGES.some(([id]) => id === h) ? h : 'dashboard';
};

export default function AdminApp() {
  const [session, setSession] = useState(undefined);
  const [admin, setAdmin] = useState(null); // null = verifico, true/false
  const [page, setPage] = useState(pageFromHash);
  const [toasts, setToasts] = useState([]);

  const toast = useCallback((text, type = 'ok') => {
    const id = Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), type === 'error' ? 8000 : 3500);
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    if (api.MOCK) { setSession({ user: { email: 'admin@example.com (prova)' } }); return undefined; }
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setAdmin(null); return; }
    api.isAdmin().then((v) => setAdmin(!!v)).catch(() => setAdmin(false));
  }, [session]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const go = (id) => { window.location.hash = id; setPage(id); };

  if (!isSupabaseConfigured) return <Center>Configurazione Supabase mancante.</Center>;
  if (session === undefined) return <Center>Caricamento…</Center>;
  if (!session) return <Login />;
  if (admin === null) return <Center>Verifico i permessi…</Center>;
  if (!admin) {
    return (
      <Center>
        <p className="font-bold mb-1">Accesso riservato</p>
        <p className="text-sm text-slate-600 mb-4">{session.user.email} non è amministratore di SOSPro24.</p>
        <Btn variant="ghost" onClick={() => supabase.auth.signOut()}>Esci</Btn>
      </Center>
    );
  }

  const Page = PAGES.find(([id]) => id === page)[3];

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 md:flex">
      <aside className="md:w-56 md:min-h-screen bg-slate-900 text-slate-200 md:sticky md:top-0 md:h-screen flex md:flex-col">
        <div className="hidden md:flex items-center gap-2 px-4 py-4 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center"><Zap className="w-4 h-4 fill-white text-white" /></div>
          <div>
            <div className="font-extrabold text-white leading-none">SOSPro<span className="text-blue-400">24</span></div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Amministrazione</div>
          </div>
        </div>
        <nav className="flex md:flex-col overflow-x-auto md:overflow-visible p-2 gap-1 flex-1">
          {PAGES.map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => go(id)}
              aria-current={page === id ? 'page' : undefined}
              className={cx('flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition',
                page === id ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-300')}
            >
              <Icon className="w-4 h-4 shrink-0" /> <span className={page === id ? '' : 'hidden md:inline'}>{label}</span>
            </button>
          ))}
        </nav>
        <div className="hidden md:block p-3 border-t border-slate-800 text-xs">
          <div className="truncate text-slate-400 mb-2">{session.user.email}</div>
          <div className="flex gap-2">
            <a href="/" className="text-blue-300 hover:underline">Apri il sito</a>
            <button type="button" onClick={() => supabase.auth.signOut()} className="ml-auto inline-flex items-center gap-1 text-slate-300 hover:text-white"><LogOut className="w-3.5 h-3.5" /> Esci</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0 p-4 md:p-6">
        <h1 className="text-xl font-extrabold mb-4">{PAGES.find(([id]) => id === page)[1]}</h1>
        <Page key={page} toast={toast} go={go} />
      </main>

      <div className="fixed bottom-4 right-4 z-[60] space-y-2 max-w-sm" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} role={t.type === 'error' ? 'alert' : 'status'} className={cx('px-4 py-2.5 rounded-xl shadow-lg text-sm font-semibold', t.type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white')}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}

function Center({ children }) {
  return <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100"><div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 text-center max-w-sm w-full">{children}</div></div>;
}

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) setError(err.message === 'Invalid login credentials' ? 'Email o password non corretti' : err.message);
    setBusy(false);
  };
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-100">
      <form onSubmit={submit} className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-sm w-full space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center"><Zap className="w-5 h-5 fill-white text-white" /></div>
          <div>
            <div className="font-extrabold text-lg leading-none">SOSPro<span className="text-blue-600">24</span></div>
            <div className="text-xs text-slate-500">Pannello amministratore</div>
          </div>
        </div>
        <Field label="Email"><input type="email" autoComplete="username" required className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input type="password" autoComplete="current-password" required className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p role="alert" className="text-sm text-rose-700">{error}</p>}
        <Btn className="w-full" disabled={busy} type="submit">{busy ? 'Accesso…' : 'Accedi'}</Btn>
      </form>
    </div>
  );
}
