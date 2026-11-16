# SOSPro24 Global

Bacheca multilingua (IT, EN, FR, ES, DE) di piccoli annunci di professioniste, classificati per **paese → città → zona → categoria**, con una sezione **SOS pronto intervento**. La piattaforma è solo **intermediario**: non è parte dei contratti tra utente e professionista (vedi Condizioni di Utilizzo nell'app).

> **Stato: prototipo dimostrativo.** Non c'è ancora un server: account, annunci e recensioni creati dagli utenti vengono salvati solo nel browser (`localStorage`). Gli annunci precompilati sono **fittizi** e marcati `DEMO` nell'interfaccia.

## Avvio

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # build di produzione in dist/
```

## Struttura

```
src/
  App.jsx                  stato, filtri, ricerca, orchestrazione
  components/
    ListingCard.jsx        scheda annuncio
    ListingModal.jsx       profilo, contatto, recensioni
    Modals.jsx             accesso, pubblica annuncio, SOS, profilo, condizioni
    ui.jsx                 Modal accessibile, Avatar, Stelle, Toast
  lib/utils.js             storage sicuro, date relative, telefono, calcolo valutazioni
  data/
    i18n.js                testi base, paesi/città/zone, categorie
    i18nExtra.js           testi aggiuntivi + sezioni legali (5 lingue)
    index.js               unisce i testi (italiano come lingua di riserva)
    mockListings.js        12 annunci DEMO fittizi
```

## Come sono trattati i dati (importante)

- **Valutazione e numero di recensioni sono sempre calcolati** dalle recensioni presenti: non esistono più valori scritti a mano.
- Gli annunci demo stanno nel codice; nel browser si salva **solo** ciò che crea l'utente (`sospro_ads_v2`, `sospro_reviews_v2`, …). Aggiornare i dati demo non richiede più di svuotare il browser.
- Nessun annuncio è "verificato" automaticamente: il badge e il filtro compaiono solo se esiste almeno un annuncio con `verified: true` assegnato da un processo reale.
- I numeri di telefono demo sono fittizi (`+39 000 000 0001`…): i pulsanti Chiama / WhatsApp sono attivi (`tel:` e `wa.me`) solo per gli annunci creati dagli utenti.
- Una recensione per utente per annuncio, non sul proprio annuncio; i nomi nelle recensioni sono abbreviati ("Maria R.").

## Prima del lancio pubblico (da fare)

1. **Backend e login reale** (es. Supabase o Firebase): email verificata, password/magic link, database condiviso per annunci e recensioni, regole di sicurezza lato server.
2. **Verifica professionisti**: documento d'identità, P.IVA/albo professionale, poi assegnazione manuale di `verified`.
3. **Moderazione**: le segnalazioni oggi vengono solo salvate (`sospro_reports_v2`); serve una dashboard admin.
4. **Revisione legale** di Condizioni e Privacy (GDPR, DSA, normativa consumatori per ogni Paese) e pagina Privacy/Cookie dedicata.
5. **Foto reali** caricate dalle professioniste (storage) al posto delle iniziali.
6. **PWA completa** (service worker, icone PNG 192/512) e URL condivisibili con filtri (`?citta=Milano&cat=home_sos`).
7. **Flag SVG** al posto delle emoji (Windows non mostra le bandiere emoji).
