// Pagina sospro24.com/anteprima.html?t=<codice>: il professionista invitato vede la bozza del suo
// annuncio (dati pubblici della sua attività, mai pubblicata senza di lui), la corregge e la pubblica
// con un click. Oppure "Non mi interessa": non verrà più contattato.
import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapPin, Phone, ShieldCheck, Zap, CheckCircle2, Siren } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CATEGORIES } from '../data';
import { pick } from '../lib/utils';
import '../index.css';

const T = {
  it: {
    hello: 'Ciao', intro: 'Abbiamo preparato una bozza del tuo annuncio su SOSPro24 con i dati pubblici della tua attività. Non è visibile a nessuno finché non la pubblichi tu.',
    preview: 'Anteprima', edit: 'Controlla e completa', name: 'Nome dell’attività', category: 'Categoria', service: 'Servizio', city: 'Città', zone: 'Zona / quartiere (facoltativo)',
    phone: 'Telefono / WhatsApp mostrato ai clienti', email: 'La tua email (per accedere e gestire l’annuncio)', title: 'Titolo dell’annuncio', description: 'Descrizione',
    rate: 'Tariffa oraria indicativa (€)', ratePh: 'es. 35', sos: 'Disponibile per urgenze (SOS 24/7)', accept: 'Accetto le', terms: 'Condizioni di utilizzo', and: 'e ho letto l’', privacy: 'Informativa privacy',
    publish: 'Pubblica gratis il mio annuncio', publishing: 'Pubblico…', decline: 'Non mi interessa, non contattatemi più', free: 'Gratis, nessuna commissione sul tuo lavoro: i clienti ti contattano direttamente.',
    doneTitle: 'Il tuo annuncio è online!', doneText: 'Ti abbiamo mandato un’email per scegliere la password: così potrai accedere e modificarlo quando vuoi.', see: 'Vedi il mio annuncio',
    activeTitle: 'Annuncio già attivo', activeText: 'Questo annuncio è già stato pubblicato. Accedi su sospro24.com per modificarlo.',
    declinedTitle: 'Ricevuto', declinedText: 'Non ti contatteremo più. Se cambi idea puoi iscriverti quando vuoi su sospro24.com.',
    bad: 'Questo link non è valido.', help: 'Domande? Scrivi a supporto@sospro24.com o su WhatsApp al +39 329 618 5600.', perHour: '/ora',
    descTpl: (s, c) => `Servizi di ${s.toLowerCase()} a ${c} e dintorni. Contattami per informazioni e preventivi.`, titleTpl: (s, c) => `${s} a ${c}`,
  },
  en: {
    hello: 'Hello', intro: 'We have prepared a draft of your SOSPro24 listing with your business’s public details. Nobody can see it until you publish it.',
    preview: 'Preview', edit: 'Check and complete', name: 'Business name', category: 'Category', service: 'Service', city: 'City', zone: 'Area / district (optional)',
    phone: 'Phone / WhatsApp shown to customers', email: 'Your email (to sign in and manage your listing)', title: 'Listing title', description: 'Description',
    rate: 'Indicative hourly rate', ratePh: 'e.g. 35', sos: 'Available for emergencies (SOS 24/7)', accept: 'I accept the', terms: 'Terms of use', and: 'and have read the', privacy: 'Privacy policy',
    publish: 'Publish my listing for free', publishing: 'Publishing…', decline: 'Not interested, please don’t contact me again', free: 'Free, no commission on your work: customers contact you directly.',
    doneTitle: 'Your listing is live!', doneText: 'We have sent you an email to choose your password, so you can sign in and edit it anytime.', see: 'See my listing',
    activeTitle: 'Listing already active', activeText: 'This listing has already been published. Sign in at sospro24.com to edit it.',
    declinedTitle: 'Got it', declinedText: 'We won’t contact you again. If you change your mind you can join anytime at sospro24.com.',
    bad: 'This link is not valid.', help: 'Questions? Write to supporto@sospro24.com or on WhatsApp at +39 329 618 5600.', perHour: '/h',
    descTpl: (s, c) => `${s} services in ${c} and nearby. Contact me for information and quotes.`, titleTpl: (s, c) => `${s} in ${c}`,
  },
  fr: {
    hello: 'Bonjour', intro: 'Nous avons préparé un brouillon de votre annonce SOSPro24 avec les informations publiques de votre entreprise. Personne ne la voit tant que vous ne la publiez pas.',
    preview: 'Aperçu', edit: 'Vérifiez et complétez', name: 'Nom de l’entreprise', category: 'Catégorie', service: 'Service', city: 'Ville', zone: 'Quartier (facultatif)',
    phone: 'Téléphone / WhatsApp affiché aux clients', email: 'Votre e-mail (pour vous connecter et gérer l’annonce)', title: 'Titre de l’annonce', description: 'Description',
    rate: 'Tarif horaire indicatif', ratePh: 'ex. 35', sos: 'Disponible pour les urgences (SOS 24/7)', accept: 'J’accepte les', terms: 'Conditions d’utilisation', and: 'et j’ai lu la', privacy: 'Politique de confidentialité',
    publish: 'Publier gratuitement mon annonce', publishing: 'Publication…', decline: 'Pas intéressé, ne me contactez plus', free: 'Gratuit, aucune commission sur votre travail : les clients vous contactent directement.',
    doneTitle: 'Votre annonce est en ligne !', doneText: 'Nous vous avons envoyé un e-mail pour choisir votre mot de passe : vous pourrez vous connecter et la modifier à tout moment.', see: 'Voir mon annonce',
    activeTitle: 'Annonce déjà active', activeText: 'Cette annonce est déjà publiée. Connectez-vous sur sospro24.com pour la modifier.',
    declinedTitle: 'C’est noté', declinedText: 'Nous ne vous contacterons plus. Si vous changez d’avis, inscrivez-vous quand vous voulez sur sospro24.com.',
    bad: 'Ce lien n’est pas valide.', help: 'Des questions ? Écrivez à supporto@sospro24.com ou sur WhatsApp au +39 329 618 5600.', perHour: '/h',
    descTpl: (s, c) => `${s} à ${c} et environs. Contactez-moi pour informations et devis.`, titleTpl: (s, c) => `${s} à ${c}`,
  },
  es: {
    hello: 'Hola', intro: 'Hemos preparado un borrador de tu anuncio en SOSPro24 con los datos públicos de tu negocio. Nadie lo ve hasta que lo publiques tú.',
    preview: 'Vista previa', edit: 'Revisa y completa', name: 'Nombre del negocio', category: 'Categoría', service: 'Servicio', city: 'Ciudad', zone: 'Zona / barrio (opcional)',
    phone: 'Teléfono / WhatsApp que verán los clientes', email: 'Tu correo (para entrar y gestionar el anuncio)', title: 'Título del anuncio', description: 'Descripción',
    rate: 'Tarifa por hora orientativa', ratePh: 'p. ej. 35', sos: 'Disponible para urgencias (SOS 24/7)', accept: 'Acepto las', terms: 'Condiciones de uso', and: 'y he leído la', privacy: 'Política de privacidad',
    publish: 'Publicar gratis mi anuncio', publishing: 'Publicando…', decline: 'No me interesa, no volváis a contactarme', free: 'Gratis, sin comisiones sobre tu trabajo: los clientes te contactan directamente.',
    doneTitle: '¡Tu anuncio ya está publicado!', doneText: 'Te hemos enviado un correo para elegir tu contraseña: así podrás entrar y modificarlo cuando quieras.', see: 'Ver mi anuncio',
    activeTitle: 'Anuncio ya activo', activeText: 'Este anuncio ya está publicado. Entra en sospro24.com para modificarlo.',
    declinedTitle: 'Entendido', declinedText: 'No volveremos a contactarte. Si cambias de idea puedes registrarte cuando quieras en sospro24.com.',
    bad: 'Este enlace no es válido.', help: '¿Dudas? Escribe a supporto@sospro24.com o por WhatsApp al +39 329 618 5600.', perHour: '/h',
    descTpl: (s, c) => `Servicios de ${s.toLowerCase()} en ${c} y alrededores. Contáctame para información y presupuestos.`, titleTpl: (s, c) => `${s} en ${c}`,
  },
  de: {
    hello: 'Guten Tag', intro: 'Wir haben einen Entwurf Ihrer SOSPro24-Anzeige mit den öffentlichen Daten Ihres Betriebs vorbereitet. Niemand sieht ihn, bevor Sie ihn veröffentlichen.',
    preview: 'Vorschau', edit: 'Prüfen und ergänzen', name: 'Name des Betriebs', category: 'Kategorie', service: 'Leistung', city: 'Stadt', zone: 'Stadtteil (optional)',
    phone: 'Telefon / WhatsApp für Kunden', email: 'Ihre E-Mail (zum Anmelden und Verwalten der Anzeige)', title: 'Titel der Anzeige', description: 'Beschreibung',
    rate: 'Richtwert Stundensatz', ratePh: 'z. B. 35', sos: 'Für Notfälle verfügbar (SOS 24/7)', accept: 'Ich akzeptiere die', terms: 'Nutzungsbedingungen', and: 'und habe die', privacy: 'Datenschutzerklärung gelesen',
    publish: 'Anzeige kostenlos veröffentlichen', publishing: 'Wird veröffentlicht…', decline: 'Kein Interesse, bitte nicht mehr kontaktieren', free: 'Kostenlos, keine Provision: Kunden kontaktieren Sie direkt.',
    doneTitle: 'Ihre Anzeige ist online!', doneText: 'Wir haben Ihnen eine E-Mail zum Festlegen des Passworts geschickt – damit können Sie sich anmelden und die Anzeige jederzeit ändern.', see: 'Meine Anzeige ansehen',
    activeTitle: 'Anzeige bereits aktiv', activeText: 'Diese Anzeige wurde bereits veröffentlicht. Melden Sie sich auf sospro24.com an, um sie zu ändern.',
    declinedTitle: 'Verstanden', declinedText: 'Wir kontaktieren Sie nicht mehr. Wenn Sie es sich anders überlegen, können Sie sich jederzeit auf sospro24.com anmelden.',
    bad: 'Dieser Link ist ungültig.', help: 'Fragen? Schreiben Sie an supporto@sospro24.com oder per WhatsApp an +39 329 618 5600.', perHour: '/Std.',
    descTpl: (s, c) => `${s} in ${c} und Umgebung. Kontaktieren Sie mich für Informationen und Angebote.`, titleTpl: (s, c) => `${s} in ${c}`,
  },
};

const token = new URLSearchParams(window.location.search).get('t') || '';
const MOCK = import.meta.env.DEV && new URLSearchParams(window.location.search).has('mock');

async function rpc(name, args) {
  if (import.meta.env.DEV && MOCK) {
    await new Promise((r) => setTimeout(r, 300));
    if (name === 'preview_get') return { status: 'draft', name: 'Idraulica Esempio', category: 'idraulici', city: 'Piacenza', country: 'IT', phone: '0523 000000', website: 'https://example.com', email: 'info@example.com', lang: 'it', category_id: 'home_sos', subcategory_id: 'plumber' };
    if (name === 'preview_activate') return { ok: true, listing_id: 'demo', new_account: true, email_sent: true };
    return true;
  }
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(error.message);
  return data;
}

const inputCls = 'w-full px-3 py-2.5 rounded-xl border border-slate-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const Field = ({ label, children }) => (<label className="block"><span className="block text-xs font-bold text-slate-700 mb-1">{label}</span>{children}</label>);

// Fuori da App: se fossero definiti dentro, a ogni tasto premuto React ricreerebbe il modulo (perdendo il cursore)
function Shell({ t, children }) {
  return (
    <div className="min-h-screen">
      <div className="bg-red-700 text-white text-xs text-center py-1.5 font-semibold flex items-center justify-center gap-2"><Siren className="w-4 h-4" /> SOSPro24</div>
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-slate-900 flex items-center justify-center text-white"><Zap className="w-5 h-5 fill-white" /></div>
          <span className="font-extrabold text-lg">SOSPro<span className="text-blue-600">24</span></span>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}<p className="text-xs text-slate-500 text-center mt-8">{t.help}</p></main>
    </div>
  );
}

function Message({ t, title, text, children }) {
  return (
    <Shell t={t}><div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-sm max-w-md mx-auto">
      <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto mb-2" /><h1 className="text-xl font-extrabold mb-1">{title}</h1><p className="text-sm text-slate-600 mb-4">{text}</p>{children}
    </div></Shell>
  );
}

function App() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const lang = (d?.lang && T[d.lang]) ? d.lang : 'it';
  const t = T[lang];

  useEffect(() => {
    if (!/^[0-9a-f]{12,40}$/.test(token) && !MOCK) { setErr('bad'); return; }
    rpc('preview_get', { p_token: token }).then((r) => {
      setD(r);
      if (r.status === 'draft') {
        const tt = T[T[r.lang] ? r.lang : 'it'];
        const cat = CATEGORIES.find((c) => c.id === r.category_id) || CATEGORIES[0];
        const sub = cat.subcategories.find((s) => s.id === r.subcategory_id) || cat.subcategories[0];
        const sname = pick(sub.names, r.lang);
        setF({
          name: r.name, category_id: cat.id, subcategory_id: sub.id, city: r.city, zone: '', phone: r.phone, email: r.email,
          title: tt.titleTpl(sname, r.city).slice(0, 110),
          description: (tt.descTpl(sname, r.city) + (r.website ? `\n${r.website}` : '')).slice(0, 800),
          hourly_rate: '', sos: false, accept: false,
        });
      }
    }).catch(() => setErr('bad'));
  }, []);

  useEffect(() => { document.documentElement.lang = lang; }, [lang]);

  const cat = useMemo(() => f && (CATEGORIES.find((c) => c.id === f.category_id) || CATEGORIES[0]), [f]);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  const publish = async (e) => {
    e.preventDefault();
    setBusy(true); setErr('');
    try {
      const r = await rpc('preview_activate', { p_token: token, p: { ...f, accept: String(!!f.accept), sos: !!f.sos } });
      setDone(r);
    } catch (ex) { setErr(ex.message); }
    setBusy(false);
  };

  const decline = async () => {
    if (!window.confirm(t.decline + '?')) return;
    try { await rpc('preview_decline', { p_token: token }); setD({ ...d, status: 'declined' }); } catch (ex) { setErr(ex.message); }
  };

  if (err === 'bad') return <Shell t={t}><p className="text-center text-slate-700 font-semibold">{t.bad}</p></Shell>;
  if (!d) return <Shell t={t}><p className="text-center text-slate-500">…</p></Shell>;
  if (done) return <Message t={t} title={t.doneTitle} text={t.doneText}><a href={`/?ad=${done.listing_id}`} className="inline-block px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm">{t.see}</a></Message>;
  if (d.status === 'active') return <Message t={t} title={t.activeTitle} text={t.activeText}><a href={d.listing_id ? `/?ad=${d.listing_id}` : '/'} className="inline-block px-5 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm">{t.see}</a></Message>;
  if (d.status === 'declined') return <Message t={t} title={t.declinedTitle} text={t.declinedText} />;
  if (!f) return null;

  const sub = cat.subcategories.find((s) => s.id === f.subcategory_id) || cat.subcategories[0];

  return (
    <Shell t={t}>
      <h1 className="text-2xl font-extrabold text-slate-900 mb-1">{t.hello} {d.name}</h1>
      <p className="text-sm text-slate-600 mb-1">{t.intro}</p>
      <p className="text-sm font-semibold text-emerald-700 mb-5">{t.free}</p>

      {/* Anteprima dal vivo */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{t.preview}</h2>
      <article className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 text-xs font-semibold text-slate-700">
          <MapPin className="w-3.5 h-3.5 text-blue-600" /> {f.city}{f.zone ? ` · ${f.zone}` : ''}
          {f.sos && <span className="ml-auto px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 text-[10px] font-extrabold">SOS 24/7</span>}
        </div>
        <div className="p-4">
          <div className="text-xs font-semibold text-blue-700">{pick(sub.names, lang)}</div>
          <h3 className="font-extrabold text-lg text-slate-900">{f.title || '…'}</h3>
          <div className="text-sm font-semibold text-slate-700">{f.name}</div>
          <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{f.description}</p>
          <div className="flex items-center justify-between mt-3 text-sm">
            <span className="font-extrabold text-slate-900">{f.hourly_rate ? `€${f.hourly_rate}${t.perHour}` : '€ …'}</span>
            {f.phone && <span className="inline-flex items-center gap-1 text-slate-700"><Phone className="w-4 h-4" /> {f.phone}</span>}
          </div>
        </div>
      </article>

      {/* Modulo */}
      <form onSubmit={publish} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
        <h2 className="font-extrabold text-slate-900">{t.edit}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t.name}><input className={inputCls} value={f.name} onChange={set('name')} maxLength={80} required /></Field>
          <Field label={t.city}><input className={inputCls} value={f.city} onChange={set('city')} maxLength={80} required /></Field>
          <Field label={t.category}>
            <select className={inputCls} value={f.category_id} onChange={(e) => { const c = CATEGORIES.find((x) => x.id === e.target.value); setF({ ...f, category_id: c.id, subcategory_id: c.subcategories[0].id }); }}>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{pick(c.names, lang)}</option>)}
            </select>
          </Field>
          <Field label={t.service}>
            <select className={inputCls} value={f.subcategory_id} onChange={set('subcategory_id')}>
              {cat.subcategories.map((s) => <option key={s.id} value={s.id}>{pick(s.names, lang)}</option>)}
            </select>
          </Field>
          <Field label={t.zone}><input className={inputCls} value={f.zone} onChange={set('zone')} maxLength={80} /></Field>
          <Field label={t.phone}><input className={inputCls} value={f.phone} onChange={set('phone')} inputMode="tel" /></Field>
        </div>
        <Field label={t.email}><input type="email" className={inputCls} value={f.email} onChange={set('email')} required /></Field>
        <Field label={`${t.title} (${f.title.length}/110)`}><input className={inputCls} value={f.title} onChange={set('title')} maxLength={110} required /></Field>
        <Field label={`${t.description} (${f.description.length}/800)`}><textarea className={inputCls} rows={4} value={f.description} onChange={set('description')} maxLength={800} required /></Field>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
          <Field label={t.rate}><input className={inputCls} value={f.hourly_rate} onChange={set('hourly_rate')} inputMode="decimal" placeholder={t.ratePh} required /></Field>
          <label className="flex items-center gap-2 text-sm font-semibold cursor-pointer pb-2.5"><input type="checkbox" checked={f.sos} onChange={set('sos')} /> {t.sos}</label>
        </div>
        <label className="flex items-start gap-2 text-sm cursor-pointer">
          <input type="checkbox" className="mt-1" checked={f.accept} onChange={set('accept')} required />
          <span>{t.accept} <a href={`/terms.html#${lang}`} target="_blank" rel="noopener" className="text-blue-700 underline">{t.terms}</a> {t.and} <a href={`/privacy.html#${lang}`} target="_blank" rel="noopener" className="text-blue-700 underline">{t.privacy}</a></span>
        </label>
        {err && err !== 'bad' && <p role="alert" className="text-sm font-semibold text-rose-700">{err}</p>}
        <button type="submit" disabled={busy} className="w-full px-5 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-extrabold">
          <ShieldCheck className="w-5 h-5 inline -mt-0.5 mr-1" /> {busy ? t.publishing : t.publish}
        </button>
      </form>
      <div className="text-center mt-4"><button type="button" onClick={decline} className="text-xs text-slate-500 underline hover:text-slate-700">{t.decline}</button></div>
    </Shell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
