# SOSPro24 — riepilogo per una nuova sessione (aggiornato al 24/11/2026)

Da incollare/leggere all'inizio di una nuova sessione di Claude Code nella cartella `C:\Users\rebic\Desktop\master\PROFESSIONISTI`.
Per la procedura store completa usare la skill **pubblica-app** (credenziali e script sono lì, mai chiederle all'utente).

## Regole dell'utente
- Si parla in **italiano**. Utente: INZA KONE (Ikonet Solutions).
- **Mai distribuire in Cina** (App Store: CHN esclusa; Play: tutti i paesi tranne Cina).
- Mai scrivere password, token o chiavi nei campi o in chat. La password dell'account demo per i revisori la inserisce l'utente.
- Conferma prima di push, build, invii in revisione e prezzi (salvo richiesta esplicita).
- Niente dati inventati spacciati per veri: i dati di esempio vanno sempre dichiarati ("Simulazione con dati di esempio").

## Il progetto
- **Web app** Vite + React + Tailwind, dati su **Supabase** (progetto `qpwdczbhazahlytvpdrb`, schema in `supabase/schema.sql`, rieseguibile; le modifiche si applicano dal SQL Editor di Supabase).
- **Sito**: https://sospro24.com (VPS Hetzner `choco@23.88.32.156`), pubblicazione con `bash deploy/deploy.sh`. Google Search Console e Bing già configurati (non cancellare `public/google6797cf6280bde93d.html` né il meta `msvalidate.01`).
- **App** Capacitor 8 (`com.ikonet.sospro24`): AdMob (apertura app, banner, interstitial ogni 2 azioni / 45 s), Premium non consumabile `sospro24_pro` a 2,99 €, tracciabilità ambasciatori (portale partner `ikonet_partner.py`, app `sospro24` **attiva**).
- Repo GitHub: `KONECHOCO/PROFESSIONISTI-sospro24`, branch `main`.

### Funzioni principali
Ricerca per paese/città/zona/categoria, filtro SOS 24/7, "Vicino a me", annunci dei professionisti con contatto diretto (telefono/WhatsApp solo per registrati), recensioni, segnala e blocca, Smart Match SOS, profilo, eliminazione account, 5 lingue (it, en, fr, es, de), 6 paesi.
Premium (solo app): niente pubblicità, ricerche salvate, tema scuro, preferiti illimitati, biglietto da visita QR.
**Bacheca Richieste** (dalla 1.1.0): i clienti pubblicano "Cerco un idraulico zona Piacenza", i professionisti rispondono.
- Tabelle `requests` + `request_contacts`, RLS: max 3 aperte e 5 al giorno per utente, scadenza 30 giorni, telefono visibile solo ai registrati finché aperta; segnalazioni con `reports.request_id`.
- Codice: `src/components/Requests.jsx`, `src/lib/api.js`, `src/App.jsx` (scheda Professionisti/Richieste), testi in `src/data/i18nApp.js` (chiavi `req*`).
- Link diretti: `https://sospro24.com/?view=requests`, `?req=<id>`, `?ad=<id>`.
- Moderazione: dal Table Editor di Supabase (`reports`; `status='removed'` su annunci o richieste).

### Pannello amministratore (dal 24/11/2026)
- **https://sospro24.com/admin.html** (accesso con l'account SOSPro24; amministratori in `private.admins`). Sezioni: Dashboard, Account (crea/modifica/blocca/elimina, crea annuncio per conto del professionista), Annunci, Richieste, Segnalazioni, Contatti da invitare (import CSV, invito con un click), Email inviate, Lista d'attesa, Impostazioni.
- Database: `supabase/admin.sql` (già eseguito il 24/11, rieseguibile). Funzioni `admin_*` che controllano l'amministratore; schema `private` non esposto; estensioni http, pg_net, pg_cron, Vault.
- Chiavi (SendGrid — stesso account di IT Helpdesk/ambasciatori —, token bot Telegram, chiave di servizio Supabase) si incollano nel pannello → Impostazioni e restano cifrate nel Vault: **mai in chat né nel codice**.
- Email: mittente predefinito `supporto@ikonetsolutions.com` (verificato su SendGrid), risposte a `supporto@sospro24.com`; piè di pagina con chi siamo + link di disiscrizione (`/unsubscribe.html`); limite giornaliero nelle impostazioni.
- Telegram: notifiche in tempo reale (registrazioni, annunci, richieste, segnalazioni, recensioni) + riepilogo ogni mattina (ora scelta nel pannello).
- Prova locale senza database: `npm run dev` → `http://localhost:5173/admin.html?mock` (dati finti, esclusi dalla build).
- Contatti da invitare: `C:\Users\rebic\Downloads\sospro24-contatti-italia-paginegialle.csv` (131 attività, 53 email) e `sospro24_contatti_professionisti_120.csv` (estero, in pausa).

### Strategia (24/11)
Tutti i 6 paesi restano aperti; il reclutamento manuale dei professionisti parte dall'Italia (iscrizione assistita: invito → consenso → account + annuncio creati dal pannello). Analisi di Manus AI in `C:\Users\rebic\Downloads\main.pdf`.
Testi del sito resi neutri ("professionisti", non più al femminile); pagina vera `/terms.html` generata da `scripts/build-terms.mjs` a ogni build; HSTS e CSP scritti in `deploy/nginx-sospro24.conf` (vanno applicati sul server con sudo).

## Stato store
| Store | Stato |
|---|---|
| **App Store** (app id `6836977205`) | **1.1.0 in vendita** (con Richieste) + Premium approvato. Tutti i paesi tranne Cina. https://apps.apple.com/app/id6836977205 |
| **Google Play** (developer `5589065625633699180`, app `4972074224714168006`) | Solo **test chiuso**: canale "Alpha" (lista `tester4`) e "Community" (gruppo `testers-community@googlegroups.com`), 177 paesi senza Cina. 1.0.0 approvata; **1.1.0 (versionCode 2) inviata in revisione il 22/11** — da verificare. Scheda Play: descrizione ancora senza la sezione Richieste. |

Link tester Android: prima https://groups.google.com/g/testers-community, poi https://play.google.com/apps/testing/com.ikonet.sospro24

### Build
- **iOS**: Codemagic, app `6aff6905f3bfce05eff65c54`, workflow `ios-app-store` (numero build automatico). Poi `ikonet_asc.py attach-build` e `submit --send`.
- **Android**: AAB in locale con lo script di firma (keystore e password in `C:\Users\rebic\Desktop\master\SOSPRO24_ANDROID_SIGNING\`, **mai stampare la password**): `npm run build`, `cap sync android` con Node 22, poi gradle `bundleRelease` con `BUILD_NUMBER` = versionCode successivo (prossimo: **3**). ABI solo ARM (AAB < 10 MB).
- Versione attuale: **1.1.0** (`package.json`, `android/app/build.gradle`, `MARKETING_VERSION` in `ios/App/App.xcodeproj/project.pbxproj`, `APP_VERSION` in `src/services/referral.js`).
- Testi store in 5 lingue: `store-assets/listing.json` (con `whatsNew`), controllo limiti `node scripts/check-listing.mjs`.

## Marketing già pronto (`marketing/`)
- `social/post-social.md` + 4 immagini 1080×1350 (`scripts/capture-social.mjs`).
- `social/post-storia.md`: la storia del fondatore (termosifone di domenica) in 4 versioni.
- `heygen/tutorial-heygen.md` + 16 scene 16:9 (`scripts/capture-heygen.mjs`, server demo `sospro-demo` in `.claude/launch.json`, porta 5175, con `VITE_SHOW_DEMO=true`; richieste e utente simulati solo nel browser di Playwright).
- `prompt-claude-design.md`, screenshot store in `store-assets/screenshots/`.

## Da fare / idee aperte
1. Verificare l'esito della revisione Play 1.1.0; aggiornare la **descrizione della scheda Play** in 5 lingue con la sezione Richieste.
2. Inserire (utente) la password dell'account demo in Play Console → Contenuti app → Dettagli di accesso, se non già fatto.
3. **AdMob → Aggiungi negozio** per l'app iOS (`~6115555936`): il 22/11 AdMob non trovava ancora l'app; riprovare. Per Android dopo l'uscita in produzione.
4. Produzione su Google Play dopo 12 tester attivi per 14 giorni consecutivi.
5. Facoltativo: notifiche ai professionisti quando arriva una richiesta nella loro città/categoria (email o push); scena verticale 9:16 per Reel/TikTok.
6. Raccogliere i suggerimenti degli utenti dopo i post e trasformarli in aggiornamenti (prossima versione 1.2.0, versionCode 3).
