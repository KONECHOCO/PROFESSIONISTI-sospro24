// Pagina sospro24.com/unsubscribe.html?e=<email>&t=<firma>: link presente in fondo a ogni email.
// Chiede una conferma con un click (così i filtri antispam che aprono i link non disiscrivono nessuno).
import { supabase } from './lib/supabase';

const T = {
  it: { title: 'Non ricevere più email', ask: 'Vuoi smettere di ricevere email da SOSPro24 a', btn: 'Sì, disiscrivimi', ok: 'Fatto: non ti scriveremo più. Ci scusiamo per il disturbo.', bad: 'Link non valido o incompleto. Scrivi a supporto@sospro24.com e ti togliamo subito.' },
  en: { title: 'Stop receiving emails', ask: 'Do you want to stop receiving emails from SOSPro24 at', btn: 'Yes, unsubscribe me', ok: 'Done: we will not write to you again. Sorry for the trouble.', bad: 'Invalid or incomplete link. Write to supporto@sospro24.com and we will remove you right away.' },
  fr: { title: 'Ne plus recevoir d’e-mails', ask: 'Voulez-vous ne plus recevoir d’e-mails de SOSPro24 à', btn: 'Oui, me désinscrire', ok: 'C’est fait : nous ne vous écrirons plus. Désolés pour le dérangement.', bad: 'Lien non valide ou incomplet. Écrivez à supporto@sospro24.com et nous vous retirons tout de suite.' },
  es: { title: 'No recibir más correos', ask: '¿Quieres dejar de recibir correos de SOSPro24 en', btn: 'Sí, darme de baja', ok: 'Hecho: no te escribiremos más. Perdona las molestias.', bad: 'Enlace no válido o incompleto. Escribe a supporto@sospro24.com y te damos de baja enseguida.' },
  de: { title: 'Keine E-Mails mehr erhalten', ask: 'Möchten Sie keine E-Mails von SOSPro24 mehr erhalten an', btn: 'Ja, abmelden', ok: 'Erledigt: Wir schreiben Ihnen nicht mehr. Entschuldigen Sie die Störung.', bad: 'Ungültiger oder unvollständiger Link. Schreiben Sie an supporto@sospro24.com, wir tragen Sie sofort aus.' },
};
const lang = (navigator.language || 'it').slice(0, 2);
const t = T[lang] || T.it;
document.documentElement.lang = T[lang] ? lang : 'it';

const params = new URLSearchParams(window.location.search);
const email = params.get('e') || '';
const token = params.get('t') || '';
const $ = (id) => document.getElementById(id);

$('title').textContent = t.title;
if (!email || !token || !supabase) {
  $('text').textContent = t.bad;
} else {
  $('text').textContent = `${t.ask} ${email}?`;
  const btn = $('btn');
  btn.textContent = t.btn;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    const { data, error } = await supabase.rpc('email_unsubscribe', { p_email: email, p_token: token });
    btn.hidden = true;
    $('text').textContent = !error && data ? t.ok : t.bad;
  });
}
