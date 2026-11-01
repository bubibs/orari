
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
  // Check if e exists (it might be undefined if run manually from editor)
  if (!e || !e.parameter) {
    return ContentService.createTextOutput("Error: No parameters found. If you are running this in the editor, use 'testDoGet' function instead.").setMimeType(ContentService.MimeType.TEXT);
  }

  const action = e.parameter.action;
  if (action === 'ping') return ContentService.createTextOutput("pong");
  if (action === 'getData') return getData();
  
  return ContentService.createTextOutput(JSON.stringify({success:false, error:'Unknown action'})).setMimeType(ContentService.MimeType.JSON);
}

// --- TEST FUNCTION ---
// Run this function in the editor to test doGet without errors
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

function getData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. Reports
  const sheetReports = getOrCreateSheet(ss, SHEET_REPORTS);
  const dataRange = sheetReports.getDataRange();
  const values = dataRange.getValues();
  const displayValues = dataRange.getDisplayValues(); // GET WHAT USER SEES
  
  const headersReports = values.shift();
  displayValues.shift();

  const reports = values.map((row, rowIndex) => {
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
             // Use displayVal to avoid TZ issues
             // Might be "00:30", "0,5", "0.5", "8.50"
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

  // 2. Contacts
  const sheetContacts = getOrCreateSheet(ss, SHEET_CONTACTS);
  const dataContacts = sheetContacts.getDataRange().getValues();
  const headersContacts = dataContacts.shift();
  const contacts = dataContacts.map(row => {
    let c = {};
    headersContacts.forEach((h, i) => c[h] = row[i]);
    return c;
  });

  // 3. Settings (Month Specific)
  const sheetSettings = getOrCreateSheet(ss, SHEET_SETTINGS);
  const settingsRange = sheetSettings.getDataRange();
  const valuesSettings = settingsRange.getValues();
  const displaySettings = settingsRange.getDisplayValues();
  
  const headersSettings = valuesSettings.shift();
  displaySettings.shift();
  
  let settingsMap = {};
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

  // AUTO-INJECT DEFAULTS IF MISSING
  if (!settingsMap['default']) {
      // Create default object
      const defaultSettings = {
          month: 'default',
          baseSalary: 3480.76,
          hourlyRate: 17.23,
          allowanceReturn: 30.00,
          allowanceOvernight: 60.00,
          allowanceForeign: 105.00,
          taxRate: 27
      };
      
      // Save to Sheet so it persists
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
      
      // Add to map so it returns immediately to the app
      settingsMap['default'] = defaultSettings;
  }

  // 4. Daily Quote (Server Side "Online")
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
        // Fetch from ZenQuotes (Quote of the Day) - EXTERNAL SERVER
        // This satisfies the request to use an external source
        const res = UrlFetchApp.fetch("https://zenquotes.io/api/today");
        const data = JSON.parse(res.getContentText());
        
        if (data && data.length > 0) {
            const quote = data[0];
            
            // Translate to Italian using Google's Neural Translation
            // This ensures we have infinite variety but in the correct language
            const itText = LanguageApp.translate(quote.q, 'en', 'it');
            
            return { text: itText, author: quote.a };
        }
    } catch (e) {
        // Fallback in case of API downtime
        return { text: "L'unico modo per fare un ottimo lavoro è amare quello che fai.", author: "Steve Jobs" };
    }
    
    return { text: "Tutto sembra impossibile finché non viene fatto.", author: "Nelson Mandela" };
}

function saveReport(report) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = getOrCreateSheet(ss, SHEET_REPORTS);
  
  // Headers: id, date, type, location, starttime, endtime, totalhours, overtime, overtime25, overtime50, absence, lunchbreak, notes, timestamp
  const headers = ['id', 'date', 'type', 'location', 'starttime', 'endtime', 'totalhours', 'overtime', 'overtime25', 'overtime50', 'absence', 'lunchbreak', 'notes', 'timestamp'];
  ensureHeaders(sheet, headers);
  
  const data = sheet.getDataRange().getValues();
  let rowIndex = data.findIndex(r => r[0] == report.id);
  
  // Prepare row
  const row = [
    report.id, 
    report.date, 
    report.type, 
    report.location, 
    report.startTime, 
    report.endTime, 
    report.totalHours, 
    report.overtime,
    report.overtime25 || 0, // NEW
    report.overtime50 || 0, // NEW
    report.absence, 
    report.lunchBreak, 
    report.notes, 
    new Date()
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
  
  const headers = ['id', 'company', 'person', 'phone', 'city', 'street', 'number'];
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
      contact.number || ''
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
    // Expects: { month: "2025-01" (or "default"), baseSalary: 123, ... }
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
        parseNum(params.taxRate || 27)
    ];
    
    if (rowIndex > -1) {
        sheet.getRange(rowIndex + 1, 1, 1, row.length).setValues([row]);
    } else {
        sheet.appendRow(row);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success:true})).setMimeType(ContentService.MimeType.JSON);
}


// --- HELPERS ---

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
  } else {
      // Optional: Check if headers match and update if needed?
      // For now, assuming simple append if empty. 
      // User might need to manually add columns if sheet exists.
      // Or we can simple get first row and see if columns exist.
      const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
      if (currentHeaders.length < headers.length) {
          // Naive update: just set the headers again to extend
          sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      }
  }
}
