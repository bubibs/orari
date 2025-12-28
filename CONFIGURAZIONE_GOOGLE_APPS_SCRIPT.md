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

### Struttura Foglio "Reports"

Nella prima riga (header), inserisci queste colonne:
```
A: id
B: data
C: tipoLavoro
D: assenza
E: oraInizio
F: oraFine
G: pausaMensa
H: luogoIntervento
I: note
J: oreTotali
K: oreStraordinarie
L: createdAt
```

### Struttura Foglio "Contacts"

Nella prima riga (header), inserisci:
```
A: id
B: azienda
C: citta
D: via
E: referente
F: telefono
```

### Struttura Foglio "Settings"

Nella prima riga (header), inserisci:
```
A: chiave
B: valore
```

Nelle righe successive, inserisci:
```
A2: pagaBase | B2: 2000
A3: pagaOraria | B3: 12.5
A4: indennitaRientro | B4: 15
A5: indennitaPernottamento | B5: 50
A6: indennitaEstero | B6: 100
A7: aliquota | B7: 25
```

### Struttura Foglio "PagaBaseMensile" (NUOVO)

Crea un nuovo foglio chiamato **PagaBaseMensile** con questa struttura:

Nella prima riga (header), inserisci:
```
A: anno
B: mese
C: pagaBase
```

Questo foglio permetterà di salvare la paga base per ogni mese/anno specifico.

## 🔧 Passo 2: Creare lo Script Google Apps Script

1. Nel foglio di lavoro, vai su **Estensioni** → **Apps Script**
2. Cancella il codice di esempio
3. Copia e incolla il seguente codice:

```javascript
// ID del tuo foglio di lavoro (lo trovi nell'URL del foglio)
const SPREADSHEET_ID = 'INSERISCI_QUI_L_ID_DEL_TUO_FOGLIO';

// Nomi dei fogli
const SHEET_REPORTS = 'Reports';
const SHEET_CONTACTS = 'Contacts';
const SHEET_SETTINGS = 'Settings';

// Funzione principale che gestisce tutte le richieste
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    let result = {};
    
    switch(action) {
      case 'ping':
        result = { success: true, message: 'Connected' };
        break;
        
      case 'saveReport':
        result = saveReport(data.data);
        break;
        
      case 'getReports':
        result = getReports(data.filters || {});
        break;
        
      case 'updateReport':
        result = updateReport(data.id, data.data);
        break;
        
      case 'deleteReport':
        result = deleteReport(data.id);
        break;
        
      case 'saveContact':
        result = saveContact(data.data);
        break;
        
      case 'getContacts':
        result = getContacts();
        break;
        
      case 'updateContact':
        result = updateContact(data.id, data.data);
        break;
        
      case 'deleteContact':
        result = deleteContact(data.id);
        break;
        
      case 'getSalaryData':
        result = getSalaryData(data.month, data.year);
        break;
        
      case 'saveSettings':
        result = saveSettings(data.data);
        break;
        
      case 'getSettings':
        result = getSettings();
        break;
        
      default:
        result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Gestisce anche le richieste GET
function doGet(e) {
  const action = e.parameter.action;
  
  let result = {};
  
  switch(action) {
    case 'ping':
      result = { success: true, message: 'Connected' };
      break;
      
    case 'getReports':
      result = getReports(e.parameter);
      break;
      
    case 'getContacts':
      result = getContacts();
      break;
      
    case 'getSalaryData':
      result = getSalaryData(
        parseInt(e.parameter.month),
        parseInt(e.parameter.year)
      );
      break;
      
    case 'getSettings':
      result = getSettings();
      break;
      
    default:
      result = { success: false, error: 'Unknown action' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// Funzioni per gestire i Reports
function saveReport(reportData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    
    if (!reportData.id) {
      reportData.id = Date.now().toString();
      reportData.createdAt = new Date().toISOString();
    }
    
    const row = [
      reportData.id,
      reportData.data,
      reportData.tipoLavoro || '',
      reportData.assenza || '',
      reportData.oraInizio || '',
      reportData.oraFine || '',
      reportData.pausaMensa || false,
      reportData.luogoIntervento || '',
      reportData.note || '',
      reportData.oreTotali || 0,
      reportData.oreStraordinarie || 0,
      reportData.createdAt || new Date().toISOString()
    ];
    
    // Cerca se esiste già
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === reportData.id) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow(row);
    }
    
    return { success: true, id: reportData.id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getReports(filters) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    const headers = data[0];
    const reports = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const report = {
        id: row[0],
        data: row[1],
        tipoLavoro: row[2],
        assenza: row[3],
        oraInizio: row[4],
        oraFine: row[5],
        pausaMensa: row[6],
        luogoIntervento: row[7],
        note: row[8],
        oreTotali: row[9],
        oreStraordinarie: row[10],
        createdAt: row[11]
      };
      
      // Applica filtri se presenti
      if (filters.month && filters.year) {
        const reportDate = new Date(report.data);
        if (reportDate.getMonth() !== parseInt(filters.month) - 1 ||
            reportDate.getFullYear() !== parseInt(filters.year)) {
          continue;
        }
      }
      
      reports.push(report);
    }
    
    return { success: true, data: reports };
  } catch (error) {
    return { success: false, error: error.toString(), data: [] };
  }
}

function updateReport(id, reportData) {
  return saveReport({ ...reportData, id: id });
}

function deleteReport(id) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Report not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Funzioni per gestire i Contacts
function saveContact(contactData) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    
    if (!contactData.id) {
      contactData.id = Date.now().toString();
    }
    
    const row = [
      contactData.id,
      contactData.azienda || '',
      contactData.citta || '',
      contactData.via || '',
      contactData.referente || '',
      contactData.telefono || ''
    ];
    
    const data = sheet.getDataRange().getValues();
    let found = false;
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === contactData.id) {
        sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow(row);
    }
    
    return { success: true, id: contactData.id };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getContacts() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    const data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    const contacts = [];
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      contacts.push({
        id: row[0],
        azienda: row[1],
        citta: row[2],
        via: row[3],
        referente: row[4],
        telefono: row[5]
      });
    }
    
    return { success: true, data: contacts };
  } catch (error) {
    return { success: false, error: error.toString(), data: [] };
  }
}

function updateContact(id, contactData) {
  return saveContact({ ...contactData, id: id });
}

function deleteContact(id) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    const data = sheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === id) {
        sheet.deleteRow(i + 1);
        return { success: true };
      }
    }
    
    return { success: false, error: 'Contact not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Funzioni per gestire lo Stipendio
function getSalaryData(month, year) {
  try {
    const reportsResult = getReports({ month: month, year: year });
    const reports = reportsResult.data || [];
    
    let giorniLavorati = 0;
    let giorniTrasferta = 0;
    let giorniAssenza = 0;
    let oreSede = 0;
    let oreTrasfertaRientro = 0;
    let oreTrasfertaPernottamento = 0;
    let oreTrasfertaEstero = 0;
    let oreStraordinarie = 0;
    
    reports.forEach(report => {
      if (report.assenza) {
        giorniAssenza++;
      } else {
        giorniLavorati++;
        const ore = parseFloat(report.oreTotali) || 0;
        const straordinarie = parseFloat(report.oreStraordinarie) || 0;
        oreStraordinarie += straordinarie;
        
        if (report.tipoLavoro === 'in sede') {
          oreSede += ore;
        } else if (report.tipoLavoro === 'trasferta con rientro') {
          giorniTrasferta++;
          oreTrasfertaRientro += ore;
        } else if (report.tipoLavoro === 'trasferta con pernottamento') {
          giorniTrasferta++;
          oreTrasfertaPernottamento += ore;
        } else if (report.tipoLavoro === 'trasferta estero') {
          giorniTrasferta++;
          oreTrasfertaEstero += ore;
        }
      }
    });
    
    return {
      success: true,
      data: {
        giorniLavorati,
        giorniTrasferta,
        giorniAssenza,
        oreSede,
        oreTrasfertaRientro,
        oreTrasfertaPernottamento,
        oreTrasfertaEstero,
        oreStraordinarie
      }
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Funzioni per gestire le Settings
function saveSettings(settings) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SETTINGS);
    const data = sheet.getDataRange().getValues();
    
    const settingsMap = {
      'pagaBase': settings.pagaBase,
      'pagaOraria': settings.pagaOraria,
      'indennitaRientro': settings.indennitaRientro,
      'indennitaPernottamento': settings.indennitaPernottamento,
      'indennitaEstero': settings.indennitaEstero,
      'aliquota': settings.aliquota
    };
    
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      if (settingsMap.hasOwnProperty(key)) {
        sheet.getRange(i + 1, 2).setValue(settingsMap[key]);
      }
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function getSettings() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SETTINGS);
    const data = sheet.getDataRange().getValues();
    
    const settings = {
      pagaBase: 2000,
      pagaOraria: 12.5,
      indennitaRientro: 15,
      indennitaPernottamento: 50,
      indennitaEstero: 100,
      aliquota: 25
    };
    
    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const value = data[i][1];
      if (settings.hasOwnProperty(key)) {
        settings[key] = parseFloat(value) || settings[key];
      }
    }
    
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.toString() };
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

2. **Sostituisci l'ID nello script:**
   - Nella riga 3 dello script, sostituisci `'INSERISCI_QUI_L_ID_DEL_TUO_FOGLIO'` con il tuo ID
   - Esempio: `const SPREADSHEET_ID = 'ABC123XYZ456';`

3. **Salva lo script:**
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
2. Trova la riga:
   ```javascript
   const API_BASE_URL = 'https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec';
   ```
3. Sostituisci l'URL con quello che hai copiato al passo 4

## ✅ Verifica

1. Apri la webapp nel browser
2. Controlla che la nuvoletta diventi verde (significa che la connessione funziona)
3. Prova a inserire un report
4. Controlla il foglio Google Sheets - dovresti vedere i dati apparire

## 🛠️ Risoluzione Problemi

### La nuvoletta non diventa verde
- Verifica che l'URL in `api.js` sia corretto
- Controlla che la distribuzione sia pubblicata come "Tutti"
- Apri la console del browser (F12) per vedere eventuali errori

### I dati non vengono salvati
- Verifica che l'ID del foglio sia corretto nello script
- Controlla che i nomi dei fogli (Reports, Contacts, Settings) siano esatti
- Verifica che le colonne header siano presenti nella prima riga

### Errori di permessi
- Assicurati che il foglio di lavoro sia accessibile
- Controlla che lo script abbia i permessi necessari (potrebbe chiederti di autorizzarlo la prima volta)

## 📝 Note Importanti

- **Sicurezza:** L'URL della Web App è pubblico, quindi chiunque lo conosce può accedere ai dati. Considera di aggiungere autenticazione se i dati sono sensibili.
- **Limiti:** Google Apps Script ha limiti di esecuzione (6 minuti per richiesta, 20.000 richieste/giorno per utente gratuito)
- **Backup:** I dati sono salvati nel foglio Google Sheets, quindi hai sempre un backup

## 🎉 Fatto!

Ora la tua webapp è collegata al foglio Google Sheets e tutti i dati verranno salvati e recuperati dal cloud!

