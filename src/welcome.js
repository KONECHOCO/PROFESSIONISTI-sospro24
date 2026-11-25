// Pagina sospro24.com/benvenuto.html?t=<codice>: link dell'email di benvenuto (account creato dal pannello).
// Il link monouso di Supabase si crea solo quando la persona preme il pulsante, così gli antivirus
// delle caselle aziendali (che aprono i link delle email) non lo consumano prima di lei.
import { supabase } from './lib/supabase';

const T = {
  it: { title: 'Benvenuto su SOSPro24', text: 'Il tuo account è pronto. Premi il pulsante per scegliere la tua password: poi potrai accedere e controllare il tuo profilo e il tuo annuncio.', btn: 'Scegli la tua password', wait: 'Un attimo…', bad: 'Questo link non è valido o è scaduto (vale 7 giorni).', help: 'Problemi? Scrivi a supporto@sospro24.com o su WhatsApp al +39 329 618 5600: ti mandiamo un nuovo link.', err: 'Non è stato possibile continuare. Riprova tra un minuto.' },
  en: { title: 'Welcome to SOSPro24', text: 'Your account is ready. Tap the button to choose your password, then sign in and check your profile and ad.', btn: 'Choose your password', wait: 'Just a moment…', bad: 'This link is invalid or has expired (valid for 7 days).', help: 'Problems? Write to supporto@sospro24.com or on WhatsApp at +39 329 618 5600 and we will send you a new link.', err: 'Something went wrong. Please try again in a minute.' },
  fr: { title: 'Bienvenue sur SOSPro24', text: 'Votre compte est prêt. Touchez le bouton pour choisir votre mot de passe, puis connectez-vous et vérifiez votre profil et votre annonce.', btn: 'Choisir mon mot de passe', wait: 'Un instant…', bad: 'Ce lien n’est pas valide ou a expiré (valable 7 jours).', help: 'Un problème ? Écrivez à supporto@sospro24.com ou sur WhatsApp au +39 329 618 5600 : nous vous enverrons un nouveau lien.', err: 'Impossible de continuer. Réessayez dans une minute.' },
  es: { title: 'Bienvenido a SOSPro24', text: 'Tu cuenta está lista. Toca el botón para elegir tu contraseña; después inicia sesión y revisa tu perfil y tu anuncio.', btn: 'Elegir mi contraseña', wait: 'Un momento…', bad: 'Este enlace no es válido o ha caducado (vale 7 días).', help: '¿Problemas? Escribe a supporto@sospro24.com o por WhatsApp al +39 329 618 5600 y te enviamos un nuevo enlace.', err: 'No se ha podido continuar. Inténtalo de nuevo en un minuto.' },
  de: { title: 'Willkommen bei SOSPro24', text: 'Ihr Konto ist bereit. Tippen Sie auf die Schaltfläche, um Ihr Passwort festzulegen, und melden Sie sich dann an.', btn: 'Passwort festlegen', wait: 'Einen Moment…', bad: 'Dieser Link ist ungültig oder abgelaufen (7 Tage gültig).', help: 'Probleme? Schreiben Sie an supporto@sospro24.com oder per WhatsApp an +39 329 618 5600 – wir senden Ihnen einen neuen Link.', err: 'Es ist ein Fehler aufgetreten. Bitte versuchen Sie es in einer Minute erneut.' },
};
const lang = (navigator.language || 'it').slice(0, 2);
const t = T[lang] || T.it;
document.documentElement.lang = T[lang] ? lang : 'it';

const token = new URLSearchParams(window.location.search).get('t') || '';
const $ = (id) => document.getElementById(id);
$('title').textContent = t.title;
$('help').textContent = t.help;

if (!/^[0-9a-f]{32}$/.test(token) || !supabase) {
  $('text').textContent = t.bad;
} else {
  $('text').textContent = t.text;
  const btn = $('btn');
  btn.textContent = t.btn;
  btn.hidden = false;
  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.textContent = t.wait;
    const { data, error } = await supabase.rpc('welcome_start', { p_token: token });
    if (!error && typeof data === 'string' && data.startsWith('https://')) {
      window.location.href = data; // Supabase verifica e riporta su sospro24.com per scegliere la password
      return;
    }
    const msg = error?.message || '';
    $('text').textContent = /scaduto|non valido/i.test(msg) ? t.bad : t.err;
    btn.disabled = false;
    btn.textContent = t.btn;
  });
}
