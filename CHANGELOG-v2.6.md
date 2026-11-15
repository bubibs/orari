# v2.6

## Nuovo
- **Festivi al 50%**: Capodanno, Epifania, 25 aprile, 1 maggio, 2 giugno, Ferragosto, Ognissanti, Immacolata, Natale, Santo Stefano
  e Lunedì dell'Angelo (Pasqua calcolata) sono pagati come sabato e domenica. I festivi non risultano più "giorni mancanti".
  I report già salvati non vengono ricalcolati: si aggiornano se li modifichi e li risalvi.
- **Impostazioni stipendio dal mese in poi**: paga base, oraria e indennità valgono dal mese in cui le cambi e per tutti i successivi;
  i mesi precedenti non cambiano. Se modifichi un mese passato, i mesi successivi già salvati ricevono i campi cambiati.
- **Cloud**: ogni modifica viene inviata al cloud (per mese e per utente). Se sei offline resta in coda e parte alla sincronizzazione.
- **Login da qualsiasi dispositivo**: le credenziali (anche quelle dell'amministratore) vengono dal cloud. Senza rete si entra con quelle salvate sul dispositivo.
- **Profilo → Cambia password** (serve quella attuale; vale subito su tutti i dispositivi).
- `impostaPasswordAdmin()` nello script cloud per il recupero della password admin.

## Correzioni ai problemi segnalati ("le impostazioni non venivano prese")
- Un lordo di **1500 o 2000** veniva scartato e sostituito con 3480,76 (un vecchio "azzeramento" dei valori di prova).
- Per i **nuovi utenti** le impostazioni venivano scritte su un array vuoto e andavano perse.
- Nel cloud le impostazioni erano **condivise tra tutti gli utenti** (chiave = solo il mese): un collega poteva sovrascrivere le tue.
- Google Fogli trasformava `2026-10` in una data; ora il mese è salvato come testo e le righe vecchie vengono lette comunque.
- Mancavano i valori del mese quando non era stato salvato esplicitamente: ora si prende l'ultimo mese precedente.
- L'assistente AI usava un suo calcolo (e importi di default dell'admin per tutti): ora usa lo stesso motore della pagina Stipendio.
- Se l'admin reimpostava la password di un utente, quell'utente veniva marcato amministratore nel cloud.

## Sicurezza (vedi anche v2.5 del precedente giro)
- Il recupero password con codice temporaneo è disattivato per l'amministratore.
- Solo l'admin collegato può reimpostare le password altrui, mai quella dell'admin.

## Test
- `npm test`: 61 test (calcoli, festivi, impostazioni, script cloud simulato, login su più dispositivi).
- `node tests/e2e-browser.js`: 14 test in un browser reale con due dispositivi (richiede Playwright).
