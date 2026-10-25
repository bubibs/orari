
// --- CONFIGURATION ---
const SHEET_REPORTS = "Reports";
const SHEET_CONTACTS = "Contacts";
const SHEET_SETTINGS = "Settings";

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

  // 4. Daily Quote
  const quote = getDailyQuote();

  return ContentService.createTextOutput(JSON.stringify({
    reports: reports,
    contacts: contacts,
    settings: settingsMap,
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
