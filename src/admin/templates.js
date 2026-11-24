// Modelli di email del pannello. {nome}, {categoria}, {citta} vengono sostituiti
// automaticamente; il testo si può sempre modificare prima dell'invio.
// Il piè di pagina (chi siamo + link di disiscrizione) lo aggiunge il database a ogni email.

// Link per scaricare l'app. Google Play è ancora in test chiuso (il link pubblico dà 404):
// quando l'app esce in produzione metti qui il link e i testi Android si aggiornano da soli.
export const APP_IOS = 'https://apps.apple.com/app/id6836977205';
export const APP_ANDROID = ''; // es. 'https://play.google.com/store/apps/details?id=com.ikonet.sospro24'

// Contatti mostrati nella firma di ogni email (telefono e WhatsApp, link wa.me cliccabile)
export const PHONE = '+39 329 618 5600';
export const WHATSAPP = 'https://wa.me/393296185600';

const signature = {
  it: `Ikonet Solutions
SOSPro24
📞 Telefono e WhatsApp: ${PHONE}
💬 Scrivici su WhatsApp: ${WHATSAPP}`,
  fr: `Ikonet Solutions
SOSPro24
📞 Téléphone et WhatsApp : ${PHONE}
💬 Écrivez-nous sur WhatsApp : ${WHATSAPP}`,
  en: `Ikonet Solutions
SOSPro24
📞 Phone & WhatsApp: ${PHONE}
💬 Message us on WhatsApp: ${WHATSAPP}`,
};

const appLines = {
  it: `📱 Scaricate l'app SOSPro24:
- iPhone: ${APP_IOS}
- Android: ${APP_ANDROID || 'in arrivo su Google Play; intanto funziona tutto dal sito https://sospro24.com'}`,
  fr: `📱 Téléchargez l'application SOSPro24 :
- iPhone : ${APP_IOS}
- Android : ${APP_ANDROID || 'bientôt sur Google Play ; en attendant tout fonctionne sur https://sospro24.com'}`,
  en: `📱 Download the SOSPro24 app:
- iPhone: ${APP_IOS}
- Android: ${APP_ANDROID || 'coming soon to Google Play; meanwhile everything works at https://sospro24.com'}`,
};

export const TEMPLATES = [
  {
    id: 'invite',
    label: 'Invito professionista',
    forContacts: true,
    text: {
      it: {
        subject: 'Un annuncio gratuito su SOSPro24 per {nome}',
        body: `Buongiorno,

sono fondatore di Ikonet Solutions e ho creato SOSPro24 (https://sospro24.com), un sito e un'app che aiutano le persone a trovare professionisti nella propria zona, anche per le urgenze.

Ho trovato {nome} cercando {categoria} a {citta} e vi scrivo perché stiamo aprendo questa categoria nella vostra città.

- Il profilo e l'annuncio sono gratuiti.
- Il cliente vi contatta direttamente, per telefono o WhatsApp: SOSPro24 non prende commissioni sul vostro lavoro.
- Nella sezione "Richieste" trovate anche i clienti che scrivono cosa cercano, per esempio "Cerco un idraulico in zona".

${appLines.it}

Se vi interessa, posso creare io il profilo in pochi minuti: mi basta una risposta con zona servita, servizi, orari e un numero di telefono da mostrare. Prima della pubblicazione vi mando il testo da approvare e potete modificarlo o cancellarlo quando volete.

Se non vi interessa, basta ignorare questa email: non vi scriverò di nuovo.

Grazie e buon lavoro,
${signature.it}`,
      },
      fr: {
        subject: 'Une annonce gratuite sur SOSPro24 pour {nome}',
        body: `Bonjour,

je suis le fondateur d'Ikonet Solutions et j'ai créé SOSPro24 (https://sospro24.com), un site et une application qui aident les gens à trouver des professionnels près de chez eux, y compris en urgence.

J'ai trouvé {nome} en cherchant {categoria} à {citta} et je vous écris car nous ouvrons cette catégorie dans votre ville.

- Le profil et l'annonce sont gratuits.
- Le client vous contacte directement par téléphone ou WhatsApp : SOSPro24 ne prend aucune commission sur votre travail.
- Dans la rubrique « Demandes », vous trouvez aussi les clients qui écrivent ce qu'ils cherchent.

${appLines.fr}

Si cela vous intéresse, je peux créer votre profil en quelques minutes : il me suffit d'une réponse avec la zone, les services, les horaires et un numéro de téléphone. Je vous envoie le texte à valider avant la publication, et vous pouvez le modifier ou le supprimer à tout moment.

Sinon, ignorez simplement cet e-mail : je ne vous écrirai plus.

Merci et bonne journée,
${signature.fr}`,
      },
      en: {
        subject: 'A free listing on SOSPro24 for {nome}',
        body: `Hello,

I'm the founder of Ikonet Solutions and I created SOSPro24 (https://sospro24.com), a website and app that helps people find local professionals, including for emergencies.

I found {nome} while looking for {categoria} in {citta} and I'm writing because we are opening this category in your city.

- Your profile and listing are free.
- Customers contact you directly by phone or WhatsApp: SOSPro24 takes no commission on your work.
- In the "Requests" section you also find customers describing what they need.

${appLines.en}

If you're interested, I can set up your profile in a few minutes: just reply with your area, services, opening hours and a phone number to show. I'll send you the text to approve before publishing, and you can edit or delete it at any time.

If not, simply ignore this email: I won't write again.

Thank you,
${signature.en}`,
      },
    },
  },
  {
    id: 'followup',
    label: 'Profilo pubblicato',
    forContacts: true,
    text: {
      it: {
        subject: 'Il profilo di {nome} è online su SOSPro24',
        body: `Buongiorno,

come concordato il vostro profilo è ora pubblicato su SOSPro24: https://sospro24.com

I clienti di {citta} che cercano {categoria} possono trovarvi e contattarvi direttamente. Se volete cambiare qualcosa (testo, orari, telefono) rispondete a questa email e lo sistemo subito.

${appLines.it}

Grazie,
${signature.it}`,
      },
    },
  },
  {
    id: 'warning',
    label: 'Avviso violazione',
    forContacts: false,
    text: {
      it: {
        subject: 'SOSPro24: il tuo contenuto è stato rimosso',
        body: `Ciao {nome},

un tuo contenuto su SOSPro24 è stato segnalato e, dopo un controllo, rimosso perché non rispetta le Condizioni di utilizzo (https://sospro24.com/terms.html).

Motivo: [scrivi qui il motivo]

Se pensi che sia un errore rispondi a questa email. In caso di nuove violazioni l'account potrà essere sospeso.

Il team di SOSPro24
📞 Telefono e WhatsApp: ${PHONE}`,
      },
    },
  },
  {
    id: 'free',
    label: 'Testo libero',
    forContacts: false,
    text: { it: { subject: '', body: `Ciao {nome},\n\n\n\nGrazie,\n${signature.it}` } },
  },
];

export function fillTemplate(templateId, lang, vars) {
  const t = TEMPLATES.find((x) => x.id === templateId) || TEMPLATES[TEMPLATES.length - 1];
  const variant = t.text[lang] || t.text.it;
  const fill = (s) => s.replace(/\{(nome|categoria|citta)\}/g, (_, k) => (vars[k] || '').trim() || '…');
  return { subject: fill(variant.subject), body: fill(variant.body), lang: t.text[lang] ? lang : 'it' };
}
