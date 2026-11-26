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
  es: `Ikonet Solutions
SOSPro24
📞 Teléfono y WhatsApp: ${PHONE}
💬 Escríbenos por WhatsApp: ${WHATSAPP}`,
  de: `Ikonet Solutions
SOSPro24
📞 Telefon & WhatsApp: ${PHONE}
💬 Schreiben Sie uns auf WhatsApp: ${WHATSAPP}`,
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
  es: `📱 Descarga la app SOSPro24:
- iPhone: ${APP_IOS}
- Android: ${APP_ANDROID || 'próximamente en Google Play; mientras tanto todo funciona en https://sospro24.com'}`,
  de: `📱 Laden Sie die SOSPro24-App herunter:
- iPhone: ${APP_IOS}
- Android: ${APP_ANDROID || 'bald bei Google Play; bis dahin funktioniert alles auf https://sospro24.com'}`,
};

// Categoria e città dei contatti sono scritte in italiano (dai file PagineGialle e dalle ricerche):
// nelle email in altre lingue vengono tradotte, es. "idraulici" → "fontaneros", "Parigi" → "Paris".
const CATEGORY_WORDS = [
  [/idraulic|plumb/i, { it: 'idraulici', en: 'plumbers', fr: 'plombiers', es: 'fontaneros', de: 'Klempner' }],
  [/elettric|electric/i, { it: 'elettricisti', en: 'electricians', fr: 'électriciens', es: 'electricistas', de: 'Elektriker' }],
  [/fabbr|apertura porte|locksmith/i, { it: 'fabbri e apertura porte', en: 'locksmiths', fr: 'serruriers', es: 'cerrajeros', de: 'Schlüsseldienste' }],
  [/informatic|IT repair|computer/i, { it: 'assistenza informatica', en: 'IT repair services', fr: 'dépannage informatique', es: 'servicio técnico informático', de: 'IT-Service und Computerreparatur' }],
  [/pulizi|cleaning/i, { it: 'imprese di pulizia', en: 'cleaning services', fr: 'entreprises de nettoyage', es: 'empresas de limpieza', de: 'Reinigungsfirmen' }],
];
const CITY_NAMES = {
  parigi: { fr: 'Paris', en: 'Paris', es: 'París', de: 'Paris' },
  berlino: { de: 'Berlin', en: 'Berlin', fr: 'Berlin', es: 'Berlín' },
  londra: { en: 'London', fr: 'Londres', es: 'Londres', de: 'London' },
  zurigo: { de: 'Zürich', en: 'Zurich', fr: 'Zurich', es: 'Zúrich' },
  ginevra: { fr: 'Genève', en: 'Geneva', es: 'Ginebra', de: 'Genf' },
  monaco: { de: 'München', en: 'Munich', fr: 'Munich', es: 'Múnich' },
  roma: { en: 'Rome', fr: 'Rome', es: 'Roma', de: 'Rom' },
  milano: { en: 'Milan', fr: 'Milan', es: 'Milán', de: 'Mailand' },
};

export function localizeVar(key, value, lang) {
  const v = String(value || '').trim();
  if (!v) return v;
  if (key === 'categoria') {
    const hit = CATEGORY_WORDS.find(([re]) => re.test(v));
    return hit ? hit[1][lang] || v : v;
  }
  if (key === 'citta' && lang !== 'it') return CITY_NAMES[v.toLowerCase()]?.[lang] || v;
  return v;
}

export const TEMPLATES = [
  {
    id: 'invite',
    label: 'Invito professionista',
    forContacts: true,
    text: {
      it: {
        subject: 'Un annuncio gratuito su SOSPro24 per {nome}',
        body: `Buongiorno,

sono fondatore di Ikonet Solutions e ho creato SOSPro24 ({link}), un sito e un'app che aiutano le persone a trovare professionisti nella propria zona, anche per le urgenze.

Ho trovato {nome} cercando {categoria} a {citta} e vi scrivo perché stiamo aprendo questa categoria nella vostra città.

- Il profilo e l'annuncio sono gratuiti.
- Il cliente vi contatta direttamente, per telefono o WhatsApp: SOSPro24 non prende commissioni sul vostro lavoro.
- Nella sezione "Richieste" trovate anche i clienti che scrivono cosa cercano, per esempio "Cerco un idraulico in zona".

${appLines.it}

👉 Per farvi risparmiare tempo ho già preparato una bozza del vostro annuncio con i dati pubblici della vostra attività. Non è visibile a nessuno: potete guardarla, correggerla e pubblicarla gratis con un click qui:
{anteprima}

Se preferite, rispondete a questa email e lo preparo io insieme a voi. Potete modificarlo o cancellarlo quando volete.

Se non vi interessa, basta ignorare questa email: non vi scriverò di nuovo.

Grazie e buon lavoro,
${signature.it}`,
      },
      fr: {
        subject: 'Une annonce gratuite sur SOSPro24 pour {nome}',
        body: `Bonjour,

je suis le fondateur d'Ikonet Solutions et j'ai créé SOSPro24 ({link}), un site et une application qui aident les gens à trouver des professionnels près de chez eux, y compris en urgence.

J'ai trouvé {nome} en cherchant {categoria} à {citta} et je vous écris car nous ouvrons cette catégorie dans votre ville.

- Le profil et l'annonce sont gratuits.
- Le client vous contacte directement par téléphone ou WhatsApp : SOSPro24 ne prend aucune commission sur votre travail.
- Dans la rubrique « Demandes », vous trouvez aussi les clients qui écrivent ce qu'ils cherchent.

${appLines.fr}

👉 Pour vous faire gagner du temps, j'ai déjà préparé un brouillon de votre annonce avec les informations publiques de votre entreprise. Personne ne le voit : vous pouvez le consulter, le corriger et le publier gratuitement en un clic ici :
{anteprima}

Si vous préférez, répondez à cet e-mail et je le prépare avec vous. Vous pouvez le modifier ou le supprimer à tout moment.

Sinon, ignorez simplement cet e-mail : je ne vous écrirai plus.

Merci et bonne journée,
${signature.fr}`,
      },
      en: {
        subject: 'A free listing on SOSPro24 for {nome}',
        body: `Hello,

I'm the founder of Ikonet Solutions and I created SOSPro24 ({link}), a website and app that helps people find local professionals, including for emergencies.

I found {nome} while looking for {categoria} in {citta} and I'm writing because we are opening this category in your city.

- Your profile and listing are free.
- Customers contact you directly by phone or WhatsApp: SOSPro24 takes no commission on your work.
- In the "Requests" section you also find customers describing what they need.

${appLines.en}

👉 To save you time, I've already prepared a draft of your listing with your business's public details. Nobody can see it: you can check it, edit it and publish it for free with one click here:
{anteprima}

If you prefer, just reply to this email and I'll set it up with you. You can edit or delete it at any time.

If not, simply ignore this email: I won't write again.

Thank you,
${signature.en}`,
      },
      es: {
        subject: 'Un anuncio gratuito en SOSPro24 para {nome}',
        body: `Buenos días:

soy el fundador de Ikonet Solutions y he creado SOSPro24 ({link}), una web y una app que ayudan a las personas a encontrar profesionales en su zona, también para urgencias.

He encontrado {nome} buscando {categoria} en {citta} y les escribo porque estamos abriendo esta categoría en su ciudad.

- El perfil y el anuncio son gratuitos.
- El cliente les contacta directamente por teléfono o WhatsApp: SOSPro24 no cobra comisiones sobre su trabajo.
- En la sección «Solicitudes» también encontrarán clientes que escriben lo que buscan, por ejemplo «Busco un fontanero en la zona».

${appLines.es}

👉 Para ahorrarles tiempo, ya he preparado un borrador de su anuncio con los datos públicos de su negocio. Nadie lo ve: pueden revisarlo, corregirlo y publicarlo gratis con un clic aquí:
{anteprima}

Si lo prefieren, respondan a este correo y lo preparo con ustedes. Pueden modificarlo o eliminarlo cuando quieran.

Si no les interesa, basta con ignorar este correo: no volveré a escribirles.

Gracias y buen trabajo,
${signature.es}`,
      },
      de: {
        subject: 'Eine kostenlose Anzeige auf SOSPro24 für {nome}',
        body: `Guten Tag,

ich bin der Gründer von Ikonet Solutions und habe SOSPro24 ({link}) entwickelt – eine Website und App, mit der Menschen Fachleute in ihrer Nähe finden, auch im Notfall.

Ich habe {nome} bei der Suche nach {categoria} in {citta} gefunden und schreibe Ihnen, weil wir diese Kategorie gerade in Ihrer Stadt eröffnen.

- Profil und Anzeige sind kostenlos.
- Kunden kontaktieren Sie direkt per Telefon oder WhatsApp: SOSPro24 nimmt keine Provision auf Ihre Arbeit.
- Im Bereich „Gesuche“ finden Sie außerdem Kunden, die beschreiben, was sie brauchen.

${appLines.de}

👉 Um Ihnen Zeit zu sparen, habe ich bereits einen Entwurf Ihrer Anzeige mit den öffentlichen Daten Ihres Betriebs vorbereitet. Niemand sieht ihn: Sie können ihn ansehen, korrigieren und mit einem Klick kostenlos veröffentlichen:
{anteprima}

Wenn Sie möchten, antworten Sie einfach auf diese E-Mail und ich erstelle ihn gemeinsam mit Ihnen. Sie können ihn jederzeit ändern oder löschen.

Falls kein Interesse besteht, ignorieren Sie diese E-Mail einfach: Ich schreibe Ihnen nicht noch einmal.

Vielen Dank und gute Arbeit,
${signature.de}`,
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

come concordato il vostro profilo è ora pubblicato su SOSPro24: {link}

I clienti di {citta} che cercano {categoria} possono trovarvi e contattarvi direttamente. Se volete cambiare qualcosa (testo, orari, telefono) rispondete a questa email e lo sistemo subito.

${appLines.it}

Grazie,
${signature.it}`,
      },
      fr: {
        subject: 'Le profil de {nome} est en ligne sur SOSPro24',
        body: `Bonjour,

comme convenu, votre profil est maintenant publié sur SOSPro24 : {link}

Les clients de {citta} qui cherchent des {categoria} peuvent vous trouver et vous contacter directement. Pour modifier quelque chose (texte, horaires, téléphone), répondez simplement à cet e-mail et je m'en occupe tout de suite.

${appLines.fr}

Merci,
${signature.fr}`,
      },
      en: {
        subject: "{nome}'s profile is live on SOSPro24",
        body: `Hello,

as agreed, your profile is now published on SOSPro24: {link}

Customers in {citta} looking for {categoria} can find you and contact you directly. If you want to change anything (text, opening hours, phone), just reply to this email and I'll fix it right away.

${appLines.en}

Thank you,
${signature.en}`,
      },
      es: {
        subject: 'El perfil de {nome} ya está en SOSPro24',
        body: `Buenos días:

como acordamos, su perfil ya está publicado en SOSPro24: {link}

Los clientes de {citta} que buscan {categoria} pueden encontrarles y contactarles directamente. Si quieren cambiar algo (texto, horario, teléfono), respondan a este correo y lo arreglo enseguida.

${appLines.es}

Gracias,
${signature.es}`,
      },
      de: {
        subject: 'Das Profil von {nome} ist jetzt auf SOSPro24 online',
        body: `Guten Tag,

wie besprochen ist Ihr Profil jetzt auf SOSPro24 veröffentlicht: {link}

Kunden in {citta}, die {categoria} suchen, können Sie finden und direkt kontaktieren. Wenn Sie etwas ändern möchten (Text, Öffnungszeiten, Telefon), antworten Sie einfach auf diese E-Mail – ich kümmere mich sofort darum.

${appLines.de}

Vielen Dank,
${signature.de}`,
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
  const fill = (s) => s.replace(/\{link\}/g, vars.link || 'https://sospro24.com')
    .replace(/\{anteprima\}/g, vars.preview || 'https://sospro24.com')
    .replace(/\{(nome|categoria|citta)\}/g, (_, k) => (vars[k] || '').trim() || '…');
  return { subject: fill(variant.subject), body: fill(variant.body), lang: t.text[lang] ? lang : 'it' };
}
