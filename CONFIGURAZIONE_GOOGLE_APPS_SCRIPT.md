# Configurazione Google Apps Script per TECNOSISTEM WebApp

Questa guida ti spiega come configurare Google Apps Script per far comunicare la webapp con un foglio di lavoro Google Sheets.

## 📋 Prerequisiti

- Account Google
- Accesso a Google Sheets
- Accesso a Google Apps Script

## 🚀 Passo 1: Creare il Foglio di Lavoro

1. Vai su [Google Sheets](https://sheets.google.com)
2. Crea un nuovo foglio di lavoro
3. Rinominalo come preferisci (es. "TECNOSISTEM_Data")
4. Crea i seguenti fogli (tab in basso):
   - **Reports** - per i report degli interventi
   - **Contacts** - per la rubrica
   - **Settings** - per le impostazioni stipendio
   - **Users** - per la gestione utenti (.nuovo)

## 🔧 Passo 2: Creare lo Script Google Apps Script

1. Nel foglio di lavoro, vai su **Estensioni** → **Apps Script**
2. Cancella il codice di esempio
3. Copia e incolla il seguente codice completo:

```javascript
// --- CONFIGURATION ---
const SHEET_REPORTS = "Reports";
const SHEET_CONTACTS = "Contacts";
const SHEET_SETTINGS = "Settings";
const SHEET_USERS = "Users";

// --- DO POST ---
function doPost(e) {
  // Check if e exists
  if (!e || !e.postData) {
     return ContentService.createTextOutput(JSON.stringify({success:false, error:'No postData found. This function must be called via POST request.'})).setMimeType(ContentService.MimeType.JSON);
  }

  const params = typeof e.postData.contents === 'string' ? JSON.parse(e.postData.contents) : {};
  const action = e.parameter.action;
  
  if (action === 'saveReport') return saveReport(params);
  if (action === 'deleteReport') return deleteReport(params);
  if (action === 'saveContact') return saveContact(params);
  if (action === 'deleteContact') return deleteContact(params);
  if (action === 'saveSettings') return saveSettings(params);
  if (action === 'saveUser') return saveUser(params);
  if (action === 'deleteUser') return deleteUser(params);
  
  return ContentService.createTextOutput(JSON.stringify({success:false, error:'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
}

// --- DO GET ---
function doGet(e) {
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Error: No parameters found. If you are running this in the editor, use 'testDoGet' function instead.").setMimeType(ContentService.MimeType.TEXT);
  }

  const action = e.parameter.action;
  if (action === 'ping') return ContentService.createTextOutput("pong");
  if (action === 'getData') return getData(e.parameter);
  
  return ContentService.createTextOutput(JSON.stringify({success:false, error:'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
}

// --- TEST FUNCTION ---
function testDoGet() {
  const e = {
    parameter: {
      action: 'getData'
    }
  };
  const result = doGet(e);
  Logger.log(result.getContent());
}

// --- ACTIONS ---

function getData(params) {
  params = params || {};
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const userId = params.userId || '';
  const userEmail = params.userEmail ? params.userEmail.toLowerCase() : '';
  const isPrimary = params.isPrimary === '1' || !userId;
  
  // 1. Reports
  const sheetReports = getOrCreateSheet(ss, SHEET_REPORTS);
  const dataRange = sheetReports.getDataRange();
  const values = dataRange.getValues();
  const displayValues = dataRange.getDisplayValues();
  
  let reports = [];
  if (values && values.length > 1) {
    const headersReports = values.shift();
    displayValues.shift();

    reports = values.map((row, rowIndex) => {
      let r = {};
      headersReports.forEach((h, i) => {
          let val = row[i];
          let displayVal = displayValues[rowIndex][i];
          
          let key = String(h).toLowerCase().replace(/[^a-z0-9]/g, '');
          if (!key) key = 'column' + i;

          if (key === 'date') {
               if (val instanceof Date) {
                   r[key] = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
               } else {
                   r[key] = displayVal;
               }
               return;
          }

          const isNumeric = ['totalhours', 'overtime', 'overtime25', 'overtime50', 'straordinari', 'straord', 'ore'].some(term => key.includes(term));

          if (isNumeric) {
               if (displayVal.includes(':')) {
                   let parts = displayVal.split(':');
                   let h = parseInt(parts[0], 10) || 0;
                   let m = parseInt(parts[1], 10) || 0;
                   r[key] = parseFloat((h + (m / 60)).toFixed(2));
               } else {
                   let n = parseFloat(displayVal.replace(',', '.'));
                   r[key] = isNaN(n) ? 0 : n;
               }
               return;
          }

          r[key] = val;
      });
      return r;
    });

    // Filtro Multi-Utente:
    // Se utente primario (o nessun userId): restituisce tutti i record (inclusi i record legacy).
    // Se altro utente: restituisce solo i record associati al suo userId o userEmail.
    if (!isPrimary && userId) {
      reports = reports.filter(r => {
        const rUser = String(r.user || r.userid || '').trim();
        const rEmail = String(r.useremail || '').trim().toLowerCase();
        return rUser === String(userId) || (userEmail && rEmail === userEmail);
      });
    }
  }

  // 2. Contacts
  const sheetContacts = getOrCreateSheet(ss, SHEET_CONTACTS);
  const dataContacts = sheetContacts.getDataRange().getValues();
  let contacts = [];
  if (dataContacts && dataContacts.length > 1) {
    const headersContacts = dataContacts.shift();
    contacts = dataContacts.map(row => {
      let c = {};
      headersContacts.forEach((h, i) => c[h] = row[i]);
      return c;
    });

    if (!isPrimary && userId) {
      contacts = contacts.filter(c => String(c.user || c.userId || '') === String(userId));
    }
  }

  // 3. Settings (Month Specific)
  const sheetSettings = getOrCreateSheet(ss, SHEET_SETTINGS);
  const settingsRange = sheetSettings.getDataRange();
  const valuesSettings = settingsRange.getValues();
  const displaySettings = settingsRange.getDisplayValues();
  
  let settingsMap = {};
  if (valuesSettings && valuesSettings.length > 1) {
    const headersSettings = valuesSettings.shift();
    displaySettings.shift();
    
    if (headersSettings && headersSettings.length > 0) {
        const numericFields = ['baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate'];

        valuesSettings.forEach((row, rowIndex) => {
            let s = {};
            headersSettings.forEach((h, i) => s[h] = row[i]);
            
            if (s.month) {
               Object.keys(s).forEach(k => {
                   if (numericFields.includes(k)) {
                       let dVal = displaySettings[rowIndex][headersSettings.indexOf(k)];
                       let n = parseFloat(dVal.replace(/[^-0-9,.]/g, '').replace(',', '.'));
                       s[k] = isNaN(n) ? (parseFloat(s[k]) || 0) : n;
                   }
               });
               settingsMap[s.month] = s;
            }
        });
    }
  }

  // AUTO-INJECT DEFAULTS IF MISSING
  if (!settingsMap['default']) {
      const defaultSettings = {
          month: 'default',
          baseSalary: 3480.76,
          hourlyRate: 17.23,
          allowanceReturn: 30.00,
          allowanceOvernight: 60.00,
          allowanceForeign: 105.00,
          taxRate: 27
      };
      
      const sheet = getOrCreateSheet(ss, SHEET_SETTINGS);
      const headers = ['month', 'baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate'];
      ensureHeaders(sheet, headers);
      
      const row = [
          defaultSettings.month,
          defaultSettings.baseSalary,
          defaultSettings.hourlyRate,
          defaultSettings.allowanceReturn,
          defaultSettings.allowanceOvernight,
          defaultSettings.allowanceForeign,
          defaultSettings.taxRate
      ];
      sheet.appendRow(row);
      settingsMap['default'] = defaultSettings;
  }

  // 4. Users
  const sheetUsers = getOrCreateSheet(ss, SHEET_USERS);
  const dataUsers = sheetUsers.getDataRange().getValues();
  let users = [];
  if (dataUsers && dataUsers.length > 1) {
    const headersUsers = dataUsers.shift();
    users = dataUsers.map(row => {
      let u = {};
      headersUsers.forEach((h, i) => u[h] = row[i]);
      return u;
    });
  }

  // 5. Daily Quote
  const quote = getDailyQuote();

  return ContentService.createTextOutput(JSON.stringify({
    reports: reports,
    contacts: contacts,
    settings: settingsMap,
    users: users,
    quote: quote
  })).setMimeType(ContentService.MimeType.JSON);
}

function getDailyQuote() {
    try {
        const res = UrlFetchApp.fetch("https://zenquotes.io/api/today");
        const data = JSON.parse(res.getContentText());
        
        if (data && data.length > 0) {
            const quote = data[0];
            const itText = LanguageApp.translate(quote.q, 'en', 'it');
            return { text: itText, author: quote.a };
        }
    } catch (e) {
        return { text: "L'unico modo per fare un ottimo lavoro è amare quello che fai.", author: "Steve Jobs" };
    }
    return { text: "Tutto sembra impossibile finché non viene fatto.", author: "Nelson Mandela" };
}

function saveReport(report) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_REPORTS);
  
  // Headers con supporto Multi-Tenant (user, userEmail)
  const headers = ['id', 'date', 'type', 'location', 'starttime', 'endtime', 'totalhours', 'overtime', 'overtime25', 'overtime50', 'absence', 'lunchbreak', 'notes', 'timestamp', 'user', 'userEmail'];
  ensureHeaders(sheet, headers);
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = data.findIndex(r => r[0] == report.id);
  
  const row = [
    report.id, 
    report.date, 
    report.type, 
    report.location, 
    report.startTime, 
    report.endTime, 
    report.totalHours, 
    report.overtime,
    report.overtime25 || 0,
    report.overtime50 || 0,
    report.absence, 
    report.lunchBreak, 
    report.notes, 
    new Date(),
    report.userId || report.user || '',
    report.userEmail || ''
  ];
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

function deleteReport(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_REPORTS);
  const data = sheet.getDataRange().getValues();
  let rowIndex = data.findIndex(r => r[0] == params.id);
  
  if (rowIndex > -1) {
    sheet.deleteRow(rowIndex + 1);
    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
  }
  return ContentService.createTextOutput(JSON.stringify({success:false, error: 'Not found'})).setMimeType(ContentService.MimeType.JSON);
}

function saveContact(contact) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_CONTACTS);
  
  const headers = ['id', 'company', 'person', 'phone', 'city', 'street', 'number', 'user'];
  ensureHeaders(sheet, headers);
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = data.findIndex(r => r[0] == contact.id);
  
  const row = [
      contact.id, 
      contact.company, 
      contact.person, 
      contact.phone,
      contact.city || '',
      contact.street || '',
      contact.number || '',
      contact.userId || contact.user || ''
  ];
  
  if (rowIndex > -1) {
    sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
  
  return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

function deleteContact(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_CONTACTS);
    const data = sheet.getDataRange().getValues();
    let rowIndex = data.findIndex(r => r[0] == params.id);
    
    if (rowIndex > -1) {
        sheet.deleteRow(rowIndex + 1);
        return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({success:false, error: 'Not found'})).setMimeType(ContentService.MimeType.JSON);
}

function saveSettings(params) {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_SETTINGS);
    
    const headers = ['month', 'baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate'];
    ensureHeaders(sheet, headers);
    
    const data = sheet.getDataRange().getValues();
    let rowIndex = data.findIndex(r => r[0] == params.month);
    
    const parseNum = (v) => {
        if (v === undefined || v === null || v === '') return 0;
        let n = parseFloat(String(v).replace(',', '.'));
        return isNaN(n) ? 0 : n;
    };

    const row = [
        params.month,
        parseNum(params.baseSalary),
        parseNum(params.hourlyRate),
        parseNum(params.allowanceReturn),
        parseNum(params.allowanceOvernight),
        parseNum(params.allowanceForeign),
        parseNum(params.taxRate)
    ];

    if (rowIndex > -1) {
        sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
    } else {
        sheet.appendRow(row);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}

// --- USER MANAGEMENT FUNCTIONS ---

function saveUser(user) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_USERS);

    const headers = ['id', 'name', 'username', 'email', 'passwordHash', 'isPrimary', 'cloudUrl', 'hasFaceId', 'createdAt'];
    ensureHeaders(sheet, headers);

    const data = sheet.getDataRange().getValues();
    let rowIndex = data.findIndex(r => String(r[0]) === String(user.id) || (user.username && String(r[2]).toLowerCase() === String(user.username).toLowerCase()));

    const row = [
      user.id || ('user_' + new Date().getTime()),
      user.name || '',
      (user.username || '').toLowerCase(),
      (user.email || '').toLowerCase(),
      user.passwordHash || '',
      user.isPrimary === true || user.isPrimary === 'true' || user.isPrimary === 1,
      user.cloudUrl || '',
      user.hasFaceId === true || user.hasFaceId === 'true',
      user.createdAt || new Date().toISOString()
    ];

    if (rowIndex > -1) {
      sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
    } else {
      sheet.appendRow(row);
    }

    return ContentService.createTextOutput(JSON.stringify({success:true, user: user})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    console.error('saveUser error:', e.toString());
    return ContentService.createTextOutput(JSON.stringify({success:false, error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

function deleteUser(params) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_USERS);
    const data = sheet.getDataRange().getValues();
    let rowIndex = data.findIndex(r =>
      String(r[0]) === String(params.id) ||
      (params.username && String(r[2]).toLowerCase() === String(params.username).toLowerCase()) ||
      (params.email && String(r[3]).toLowerCase() === String(params.email).toLowerCase())
    );

    if (rowIndex > -1) {
      sheet.deleteRow(rowIndex + 1);
      return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
    }
    return ContentService.createTextOutput(JSON.stringify({success:false, error: 'User not found'})).setMimeType(ContentService.MimeType.JSON);
  } catch (e) {
    console.error('deleteUser error:', e.toString());
    return ContentService.createTextOutput(JSON.stringify({success:false, error: e.toString()})).setMimeType(ContentService.MimeType.JSON);
  }
}

// --- UTILITIES ---

function getOrCreateSheet(ss, name) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

function ensureHeaders(sheet, headers) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    return;
  }
  
  // Se mancano nuove colonne (es. user, userEmail), le aggiunge in coda
  const currentHeaders = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
  const missing = [];
  headers.forEach(h => {
    if (!currentHeaders.includes(h)) missing.push(h);
  });
  if (missing.length > 0) {
    sheet.getRange(1, currentHeaders.length + 1, 1, missing.length).setValues([missing]);
  }
}
```

## 🔑 Passo 3: Configurare lo Script

1. **Trova l'ID del tuo foglio di lavoro:**
   - Apri il foglio di lavoro
   - Guarda l'URL nella barra degli indirizzi
   - L'ID è la stringa lunga tra `/d/` e `/edit`
   - Esempio: `https://docs.google.com/spreadsheets/d/ABC123XYZ456/edit`
   - L'ID è `ABC123XYZ456`

2. **Salva lo script:**
   - Clicca su **Salva** (icona floppy disk)
   - Dai un nome al progetto (es. "TECNOSISTEM_API")

## 🌐 Passo 4: Pubblicare come Web App

1. Clicca su **Distribuisci** → **Nuova distribuzione**
2. Clicca sull'icona ingranaggio ⚙️ accanto a "Tipo" e seleziona **App Web**
3. Configura:
   - **Descrizione:** "API TECNOSISTEM"
   - **Esegui come:** "Me"
   - **Chi può accedere:** "Tutti" (importante!)
4. Clicca su **Distribuisci**
5. **Copia l'URL della Web App** che viene generato
   - Sarà qualcosa come: `https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec`

## 🔗 Passo 5: Collegare la WebApp

1. Apri il file `api.js` della tua webapp
2. Trova la riga con l'URL della Web App
3. Sostituisci l'URL con quello che hai copiato al passo 4

## ✅ Verifica Completa

### Verifica dei Fogli

Prima di procedere, assicurati che i seguenti fogli esistano nel tuo Google Sheet:

**1. Foglio "Users"** (nuovo)
- Prima riga (header): `id`, `name`, `username`, `email`, `passwordHash`, `isPrimary`, `cloudUrl`, `hasFaceId`, `createdAt`
- Esempio di riga dati:
  ```
  user_1234567890 | Admin User | admin | admin@example.com | hash123 | true | https://... | false | 2024-01-01T00:00:00.000Z
  ```

**2. Foglio "Reports"** 
- Prima riga (header): `id`, `date`, `type`, `location`, `starttime`, `endtime`, `totalhours`, `overtime`, `overtime25`, `overtime50`, `absence`, `lunchbreak`, `notes`, `timestamp`, `user`, `userEmail`

**3. Foglio "Contacts"**
- Prima riga (header): `id`, `company`, `person`, `phone`, `city`, `street`, `number`, `user`

**4. Foglio "Settings"**
- Prima riga (header): `month`, `baseSalary`, `hourlyRate`, `allowanceReturn`, `allowanceOvernight`, `allowanceForeign`, `taxRate`
- Almeno una riga dati con `default` come mese

### Test della Connessione

1. Apri la webapp nel browser
2. Apri i Developer Tools (F12 o Ctrl+Shift+I)
3. Vai alla scheda **Console**
4. Digita:
```javascript
fetch('URL_DELLA_TUA_WEBAPP?action=getData', { method: 'GET' })
  .then(r => r.json())
  .then(d => console.log(d))
```
5. Dovresti vedere un oggetto con proprietà `reports`, `contacts`, `settings`, `users`, `quote`

### Test della Creazione Utente

1. Registra un nuovo utente dalla webapp
2. Apri la console del browser
3. Verifica che l'utente appaia nel foglio Users
4. Chiudi e riapri la webapp con l'admin
5. Verifica che l'utente appaia nel profilo admin

## 🛠️ Risoluzione Problemi

### Utente creato ma non appare nel foglio Users
- Verifica che la Web App sia stata distrutta e ridistribuita dopo aver incollato il nuovo codice
- Controlla che l'ID del foglio sia corretto nello script (se usi `SpreadsheetApp.getActiveSpreadsheet()` è corretto)
- Se usi un ID fisso, sostituiscilo con: `SpreadsheetApp.openById('IL_TUO_ID')`

### La proprietà `isprimary` vs `isPrimary`
- Il codice usa `isPrimary` (camelCase con P maiuscola)
- Assicurati che il foglio Users abbia l'header esatto: `isPrimary`

### Errori di permessi
- Assicurati che il foglio di lavoro sia accessibile
- Controlla che lo script abbia i permessi necessari (potrebbe chiederti di autorizzarlo la prima volta)

## 📝 Note Importanti

- **Sicurezza:** L'URL della Web App è pubblico, quindi chiunque lo conosce può accedere ai dati. Considera di aggiungere autenticazione se i dati sono sensibili.
- **Limiti:** Google Apps Script ha limiti di esecuzione (6 minuti per richiesta, 20.000 richieste/giorno per utente gratuito)
- **Backup:** I dati sono salvati nel foglio Google Sheets, quindi hai sempre un backup

## 🎉 Fatto!

Ora la tua webapp è collegata al foglio Google Sheets e tutti i dati verranno salvati e recuperati dal cloud, inclusa la sincronizzazione degli utenti creati anche dal mobile!