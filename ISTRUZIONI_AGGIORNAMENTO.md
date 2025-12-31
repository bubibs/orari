# ISTRUZIONI PER RISOLVERE IL PROBLEMA DI SCRITTURA

## PROBLEMA
La webapp riesce a leggere i dati ma non riesce a scrivere (salvare report, contatti, impostazioni, ecc.)

## SOLUZIONE

### 1. AGGIORNA IL GOOGLE APPS SCRIPT

1. Apri il file `google-apps-script-code.js` nella cartella del progetto
2. Copia TUTTO il contenuto del file
3. Vai su https://script.google.com
4. Apri il tuo progetto Apps Script
5. **SOSTITUISCI COMPLETAMENTE** tutto il codice esistente con quello del file `google-apps-script-code.js`
6. Salva il progetto (Ctrl+S o Cmd+S)

### 2. RIPUBBLICA LA WEB APP

**IMPORTANTE**: Dopo aver aggiornato il codice, DEVI ripubblicare la Web App!

1. Nel Google Apps Script, vai su **"Distribuisci"** → **"Gestisci distribuzioni"**
2. Clicca sull'icona della matita (modifica) accanto alla distribuzione esistente
3. Clicca su **"Nuova versione"**
4. **VERIFICA** che:
   - **"Esegui come"** sia impostato su **"Me"**
   - **"Chi può accedere"** sia impostato su **"Tutti"** (NON "Solo io"!)
5. Clicca su **"Distribuisci"**
6. **COPIA IL NUOVO URL** che viene generato
7. Apri il file `api.js` nel progetto
8. Alla riga 2, sostituisci l'URL esistente con il nuovo URL:
   ```javascript
   const API_BASE_URL = 'IL_TUO_NUOVO_URL_QUI';
   ```

### 3. VERIFICA I FOGLI NEL GOOGLE SHEET

Assicurati che nel tuo Google Sheet ci siano questi fogli con gli header corretti:

#### Foglio "Reports"
Header nella prima riga:
```
id | data | tipoLavoro | assenza | oraInizio | oraFine | pausaMensa | luogoIntervento | note | oreTotali | oreStraordinarie | createdAt | settingsSnapshot
```

#### Foglio "Contacts"
Header nella prima riga:
```
id | azienda | citta | via | referente | telefono
```

#### Foglio "Settings"
Header nella prima riga:
```
chiave | valore
```

Righe successive (esempio):
```
pagaBase | 2000
pagaOraria | 12.5
indennitaRientro | 15
indennitaPernottamento | 50
indennitaEstero | 100
aliquota | 25
```

#### Foglio "PagaBaseMensile" (opzionale, viene creato automaticamente)
Header nella prima riga:
```
anno | mese | pagaBase
```

### 4. VERIFICA I PERMESSI

1. Apri il tuo Google Sheet
2. Clicca su **"Condividi"** (in alto a destra)
3. Assicurati che l'account che esegue lo script abbia almeno i permessi di **"Editor"**

### 5. TEST

Dopo aver fatto tutte le modifiche:

1. Apri la console del browser (F12)
2. Prova a salvare un report o un contatto
3. Controlla i messaggi nella console:
   - Dovresti vedere "Saving report:" o "Saving contact:" con i dati
   - Dovresti vedere "Response status: 200"
   - Dovresti vedere "Save result:" con `{success: true}`

### 6. SE ANCORA NON FUNZIONA

Se dopo tutti questi passaggi ancora non funziona:

1. Controlla la console del browser per errori specifici
2. Vai su Google Apps Script → **"Esecuzioni"** (menu a sinistra)
3. Controlla se ci sono errori nelle esecuzioni recenti
4. Clicca su un'esecuzione per vedere i dettagli dell'errore

## NOTE IMPORTANTI

- **NON dimenticare di ripubblicare la Web App** dopo ogni modifica al codice!
- L'URL cambia ogni volta che pubblichi una nuova versione
- Assicurati sempre che "Chi può accedere" sia "Tutti" e non "Solo io"
- Il codice è stato migliorato con:
  - Migliore gestione degli errori
  - Creazione automatica degli header se mancanti
  - `SpreadsheetApp.flush()` per assicurare il salvataggio immediato
  - Logging dettagliato per debug



