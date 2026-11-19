# SOSPro24 Global

Bacheca multilingua (IT, EN, FR, ES, DE) di piccoli annunci di professioniste, classificati per **paese → città → zona → categoria**, con una sezione **SOS pronto intervento**. La piattaforma è solo **intermediario**: non è parte dei contratti tra utente e professionista (vedi Condizioni di Utilizzo nell'app).

Strategia di lancio: si parte **vuoti**, le professioniste si iscrivono da sole. Quando una ricerca non trova nessuno, il cliente può lasciare l'email (lista d'attesa) e le professioniste vedono l'invito a essere le prime nella zona.

## Avvio

```bash
npm install
cp .env.example .env.local   # poi inserisci URL e chiave publishable di Supabase
npm run dev                  # http://localhost:5173
npm run build                # build di produzione in dist/
```

`VITE_SHOW_DEMO=true` in `.env.local` mostra anche 12 annunci dimostrativi fittizi (solo per prove, mai al lancio).

## Configurare Supabase (una volta sola)

1. **Tabelle e sicurezza**: Supabase → *SQL Editor* → *New query* → incolla tutto `supabase/schema.sql` → *Run*. Si può rieseguire senza danni.
2. **Indirizzi**: *Authentication → URL Configuration*
   - Site URL: l'indirizzo pubblico del sito (in sviluppo `http://localhost:5173`)
   - Redirect URLs: `http://localhost:5173/**`, `http://localhost:5174/**` e poi il dominio vero
3. **Email (SendGrid, stesso account di IT Helpdesk e portale partner)**: *Authentication → Emails → SMTP Settings*
   - Sender: `supporto@ikonetsolutions.com` (mittente già verificato su SendGrid), nome `SOSPro24`
   - Host `smtp.sendgrid.net`, porta `587`, username `apikey`, password = una chiave API SendGrid con permesso *Mail Send* (meglio una chiave dedicata a SOSPro24, revocabile da sola)
   - Poi riattiva *Confirm email* in *Authentication → Sign In / Providers*
4. **Modelli email in 5 lingue**: *Authentication → Emails → Templates* → incolla `supabase/email-templates/confirm-signup.html` (Confirm signup, fa anche da email di benvenuto) e `reset-password.html` (Reset password). La lingua arriva da `user_metadata.lang`, salvata dall'app alla registrazione.
   - Il pulsante porta a `{{ .SiteURL }}/?token_hash=…&type=…` e la verifica la fa l'app (`verifyOtp` in `App.jsx`), con messaggio "Email confermata" o "link scaduto". Quindi **Site URL deve essere l'indirizzo pubblico del sito**: con `localhost` il link funziona solo sul PC di sviluppo.
5. **Consegna nella posta (anti-spam)**: SPF, DKIM e DMARC di `ikonetsolutions.com` sono già a posto. Per uscire dallo spam: sito su un dominio vero (niente link a `localhost`), *Link Branding* su SendGrid (record DNS), poi DMARC da `p=none` a `p=quarantine` quando tutto è stabile. Alza il limite email in *Authentication → Rate Limits* prima del lancio.

## Pubblicazione (https://sospro24.com)

Il sito gira sul VPS Hetzner `23.88.32.156` (utente `choco`), con nginx e certificato Let's Encrypt che si rinnova da solo. Dominio e DNS sono su Namecheap.

```bash
bash deploy/deploy.sh   # compila e pubblica; non serve sudo
```

La prima configurazione (già fatta il 17/11/2026) è `deploy/setup-vps.sh`, lanciata una volta con sudo. La config nginx è in `deploy/nginx-sospro24.conf`. Le email partono da `supporto@sospro24.com` (dominio verificato su SendGrid); le risposte arrivano tramite l'inoltro email di Namecheap.

**Google**: il sito è registrato in Google Search Console (proprietà `https://sospro24.com/`, verificata con il file `public/google6797cf6280bde93d.html`: non cancellarlo). Anche su Bing Webmaster Tools (verificato con il meta tag `msvalidate.01` in `index.html`: non toglierlo). Sitemap inviata a entrambi: `public/sitemap.xml`. Titolo, descrizione, anteprima social (`public/og-image.png`) e testo per i motori di ricerca sono in `index.html`.

Moderazione (per ora): dal *Table Editor* di Supabase puoi leggere `reports`, mettere `status = 'removed'` a un annuncio o `verified = true` dopo una verifica reale. La lista d'attesa è nella tabella `waitlist`.

## Struttura

```
supabase/schema.sql        tabelle, regole di sicurezza (RLS), trigger
src/
  App.jsx                  stato, filtri, ricerca, orchestrazione
  lib/supabase.js          connessione a Supabase
  lib/api.js               tutte le chiamate al database
  lib/utils.js             date, telefono, paese del dispositivo, città vicina
  components/
    ListingCard.jsx        scheda annuncio
    ListingModal.jsx       profilo, contatto, recensioni
    EmptyState.jsx         lista d'attesa + invito professioniste
    Modals.jsx             accesso, nuova password, pubblica, SOS, profilo, condizioni
    Flag.jsx, ui.jsx       bandiere SVG, modale accessibile, avatar, toast
  data/                    testi in 5 lingue, paesi/città/categorie, annunci demo
```

## Sicurezza dei dati (in breve)

- Il **telefono** è in una tabella separata, leggibile solo da utenti registrati.
- **Valutazioni** calcolate dalle recensioni; nome dell'autore preso dal profilo ("Maria R."), non dal browser.
- Una recensione per utente per annuncio, mai sul proprio; voti "Utile" uno per utente.
- Nessun utente può mettersi "verificato" da solo; massimo 5 annunci per account.
- La lista d'attesa non è leggibile da nessuno tranne l'amministratore; l'app vede solo il numero di persone in attesa.

## Prossimi passi

- Tutti i paesi del mondo e città libera (oggi 6 paesi fissi)
- Pagina dedicata alle professioniste, pulsante "Invita una collega", link tracciati per le campagne
- Email automatica alla lista d'attesa quando arriva una professionista nella zona
- Pannello di moderazione, foto profilo, login con Google
- Revisione legale di Condizioni e Privacy per ogni paese
