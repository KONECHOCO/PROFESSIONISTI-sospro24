# SOSPro24 — riepilogo per una nuova sessione (aggiornato al 27/11/2026)

Da leggere all'inizio di una nuova sessione di Claude Code nella cartella `C:\Users\rebic\Desktop\master\PROFESSIONISTI`.
Per la procedura store usare la skill **pubblica-app** (credenziali e script sono lì, mai chiederle all'utente).

## Regole dell'utente
- Si parla in **italiano**. Utente: INZA KONE (Ikonet Solutions).
- **Mai distribuire in Cina** (App Store: CHN esclusa; Play: tutti i paesi tranne Cina).
- Mai scrivere password, token o chiavi nei campi o in chat. Le chiavi le incolla l'utente nel pannello (restano nel Vault di Supabase). La password dell'account demo per i revisori la inserisce l'utente. Mai stampare la password del keystore Android.
- Conferma prima di commit/push, deploy, build store, invii in revisione, prezzi e invii di email (salvo richiesta esplicita). Schema abituale: si propone → l'utente risponde "Sì, tutto" → commit + `bash deploy/deploy.sh` + `git push origin main`.
- **Niente dati inventati spacciati per veri**: gli esempi vanno sempre dichiarati (bollino "ESEMPIO", "Foto illustrativa").
- Niente pubblicazione di annunci di professionisti **senza il loro consenso** (proposta rifiutata il 26/11: si usa l'anteprima opt-in, vedi sotto).

## Il progetto
- **Web app** Vite + React + Tailwind, dati su **Supabase** (progetto `qpwdczbhazahlytvpdrb`). SQL in `supabase/schema.sql` e `supabase/admin.sql`, entrambi rieseguibili; si applicano dal SQL Editor di Supabase.
- **Sito**: https://sospro24.com (VPS Hetzner `choco@23.88.32.156`), pubblicazione `bash deploy/deploy.sh` (fa anche la build). HSTS e CSP attivi (`deploy/nginx-sospro24.conf`; `img-src` solo `'self'`, `data:`, `blob:` e Supabase → le immagini vanno messe in `public/`).
- Pagine (Vite multi-page, `vite.config.js`): `index.html` (sito), `admin.html` (pannello), `anteprima.html` (annuncio già pronto), `benvenuto.html` (primo accesso), `unsubscribe.html`; escluse da `robots.txt`. `/terms.html` generata da `scripts/build-terms.mjs`.
- **App** Capacitor 8 (`com.ikonet.sospro24`): AdMob, Premium `sospro24_pro` 2,99 €, tracciabilità ambasciatori (app `sospro24` attiva nel portale partner).
- Repo: `KONECHOCO/PROFESSIONISTI-sospro24`, branch `main` (ultimo commit `a59d2df`).
- Funzioni: ricerca paese/città/zona/categoria, SOS 24/7, "Vicino a me", annunci con contatto diretto, recensioni, segnalazioni, Smart Match, **Bacheca Richieste** (`?view=requests`, `?req=<id>`, `?ad=<id>`), 5 lingue (it, en, fr, es, de), 6 paesi.

## Pannello amministratore — https://sospro24.com/admin.html
- Codice `src/admin/*`, backend `supabase/admin.sql` (funzioni `admin_*` SECURITY DEFINER con `private.require_admin()`; amministratori in `private.admins`; schema `private` non esposto).
- Sezioni: Dashboard (aperture e pubblicati inclusi), Account (crea/modifica/blocca/elimina, "Conferma ora" per email non confermate, 🔑 reinvia benvenuto), Annunci, Richieste, Segnalazioni, **Contatti da invitare** (import CSV, "Nuovo contatto", invito con un click, 🔗 copia link anteprima, WhatsApp solo per cellulari italiani, indicatori 👀 aperto / 🤖 aperto da antivirus, filtro "aperti"), Email inviate, Lista d'attesa, Impostazioni.
- Segreti nel Vault: `sospro_sendgrid_key`, `sospro_telegram_token`, `sospro_service_key` (chiave `sb_secret_`: va solo come header `apikey`), `sospro_unsub_key`. `admin_set_secret` rifiuta chiavi sbagliate (publishable, SendGrid senza `SG.`).
- Chiamate esterne: estensione http (`private.http_json`, timeout 8 s + 1 nuovo tentativo), pg_net per Telegram, pg_cron job `sospro24-hourly`. API Auth via `private.auth_admin`.
- **Email** (SendGrid): mittente `supporto@ikonetsolutions.com`, Reply-To `supporto@sospro24.com` → inoltro Namecheap a konechoco@gmail.com. SMTP di Supabase Auth = SendGrid (mittente `supporto@sospro24.com`, DKIM ok). Ogni email ha piè di pagina con disiscrizione (token HMAC). Firma: Ikonet Solutions / SOSPro24, tel. e WhatsApp +39 329 618 5600, link App Store e Play.
- Inviti: modelli in 5 lingue in `src/admin/templates.js` con variabili `{nome}`, `{categoria}`, `{citta}` (tradotte nella lingua dell'email), `{link}` (link personale `?inv=<token>` → `invite_open`), `{anteprima}`. Aperture entro 3 minuti dall'invio = antivirus (`bot_clicks`, niente Telegram).
- **Anti-antivirus** (Microsoft 365/Barracuda aprono i link): nessun link monouso si consuma all'apertura. Benvenuto → `benvenuto.html` con pulsante (`welcome_start`); link di conferma dell'app (`token_hash`) → finestra con pulsante.
- **Anteprima opt-in** (`anteprima.html`, `src/preview/main.jsx`): il professionista vede il suo annuncio già compilato, lo corregge e lo pubblica con un click (`preview_get` / `preview_activate` crea account + annuncio + benvenuto + Telegram 🎉; `preview_decline` per rifiutare). Prova locale: `?mock`.
- Telegram: notifiche in tempo reale + riepilogo mattutino.
- Prova locale senza database: `npm run dev` → `http://localhost:5173/admin.html?mock`.
- **Test SQL**: `cd supabase/tests && npm install && npm test` (PGlite con estensioni simulate; ultimo esito 95/95).

### Lavorare da Claude (procedure già usate)
- **Applicare SQL su Supabase**: in Chrome, SQL Editor del progetto; impostare il testo dell'editor Monaco via `javascript_tool` (`String.raw`, solo se il testo non contiene backtick o `${`), verificare lunghezza e hash rispetto al file, poi Run con click via JS. Le schede Chrome in background possono bloccarsi → aprirne una nuova.
- **Chiamare le funzioni admin da Chrome**: nella scheda `admin.html` leggere la sessione da `localStorage` (`sb-*-auth-token`), trovare la chiave `sb_publishable_` nei file JS caricati (anche `modulepreload`), poi `fetch` a `/rest/v1/rpc/<funzione>`. Dopo un deploy ricaricare la pagina admin (i vecchi file vengono cancellati).
- Server di prova: `.claude/launch.json` → `sospro` (5173, ma la porta può essere occupata da altri progetti), `sospro-demo` (5175, con annunci demo), `sospro-csp` (5180, con CSP del server).

## Situazione al 27/11/2026
- **Contatti**: 895 (Italia: Piacenza, Parma, Cremona, Lodi, Reggio Emilia e altre; più estero in pausa). Tutti i 335 con email sono stati invitati (332 "invited", 1 "consented", 2 disiscritti); 560 senza email (solo telefono → WhatsApp/telefonata).
- Email inviate: 509 negli ultimi 7 giorni (217 il 27/11), nessun errore SendGrid.
- Aperture vere: 4 (Avanzi Nicola Tinteggiature – Soresina; BEMA JUNIOR – Piacenza; Elektro Eichler e Scholz Elektrotechnik – Berlino).
- **Account**: 5 (3 pro, 2 clienti). BEMA JUNIOR (informatico, Piacenza, account del 25/11) e Simone Orlandini (Saimon Impianti, 23/11, confermato a mano) **non hanno ancora pubblicato l'annuncio**. Unico annuncio attivo: quello di Ikonet (Piacenza).
- **Sito**: annunci di esempio dichiarati (bollino ESEMPIO, nome fittizio, tariffa d'esempio, nessun contatto, fuori dai conteggi, pulsante "Pubblica il tuo annuncio gratis") con **foto illustrative** (20 foto Unsplash in `public/examples/<sottocategoria>.webp`). In home sotto i risultati quando gli annunci veri sono meno di 6; nelle zone vuote uno con titolo "Servizio a Città". Codice: `src/components/ExampleCard.jsx`, `EmptyState.jsx`, `App.jsx`. Spegnere: `VITE_SHOW_EXAMPLES=false` in `.env.production` e ripubblicare.

## Stato store (al 24/11, da riverificare)
| Store | Stato |
|---|---|
| **App Store** (app id `6836977205`) | **1.1.0 in vendita** + Premium approvato. Tutti i paesi tranne Cina. |
| **Google Play** (developer `5589065625633699180`, app `4972074224714168006`) | Solo **test chiuso** (Alpha `tester4` + Community `testers-community@googlegroups.com`). 1.1.0 (versionCode 2) inviata in revisione il 22/11 — esito da verificare. |

- Build iOS: Codemagic app `6aff6905f3bfce05eff65c54`, workflow `ios-app-store`, poi `ikonet_asc.py attach-build` e `submit --send`.
- Build Android: AAB locale (firma in `C:\Users\rebic\Desktop\master\SOSPRO24_ANDROID_SIGNING\`), Node 22 per `cap sync`, prossimo versionCode **3**, solo ABI ARM.
- Versione 1.1.0 in `package.json`, `android/app/build.gradle`, `MARKETING_VERSION` (pbxproj), `APP_VERSION` in `src/services/referral.js`. Testi store: `store-assets/listing.json` (`node scripts/check-listing.mjs`).
- Marketing pronto in `marketing/` (post social, storia del fondatore, tutorial HeyGen 16 scene).

## Da fare / idee aperte
1. **Seguire BEMA JUNIOR e Simone Orlandini** (account senza annuncio): telefonata/WhatsApp o email con il link anteprima per pubblicare.
2. Ricontattare chi ha aperto (Avanzi Nicola, Berlino ×2).
3. Promemoria facoltativo agli invitati con il link anteprima (non ancora inviato; chiedere conferma prima).
4. I 560 contatti senza email: contatto via WhatsApp (pulsante nel pannello, solo cellulari) o telefono.
5. Trovare altri professionisti (fonte usata: PagineGialle, trasferimento dati tra schede via `window.name`).
6. Store: esito revisione Play 1.1.0, descrizione Play con sezione Richieste, AdMob "Aggiungi negozio" iOS, produzione Play dopo 12 tester × 14 giorni.
7. Prossima versione app 1.2.0 (versionCode 3) quando ci saranno novità da portare nell'app (gli esempi e l'anteprima sono solo sul sito).
