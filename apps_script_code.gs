
// --- CONFIGURATION ---
const SHEET_REPORTS = "Reports";
const SHEET_CONTACTS = "Contacts";
const SHEET_SETTINGS = "Settings";

// --- DO POST ---
function doPost(e) {
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
  const dataReports = sheetReports.getDataRange().getValues();
  const headersReports = dataReports.shift();
  const numericReportFields = ['totalhours', 'overtime', 'overtime25', 'overtime50'];

  const reports = dataReports.map(row => {
    let r = {};
    headersReports.forEach((h, i) => {
        let val = row[i];
        
        // 1. Handle Dates (Force String YYYY-MM-DD)
        if (h === 'date') {
             if (val instanceof Date) {
                 r[h] = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
             } else {
                 r[h] = val;
             }
             return;
        }

        // 2. Handle Numeric Fields (Block Dates/TimeObjects)
        if (numericReportFields.includes(h)) {
             if (val instanceof Date) {
                 r[h] = 0; // Prevent "1899" or huge timestamps
             } else {
                 let n = parseFloat(String(val).replace(',', '.'));
                 r[h] = isNaN(n) ? 0 : n;
             }
             return;
        }

        // 3. Default
        r[h] = val;
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
  const dataSettings = sheetSettings.getDataRange().getValues();
  const headersSettings = dataSettings.shift();
  
  // Transform settings rows into a map: { "2025-01": {...}, "default": {...} }
  let settingsMap = {};
  if (headersSettings && headersSettings.length > 0) {
      // Define known numeric fields to avoid parsing 'month' or accidental Dates
      const numericFields = ['baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate'];

      dataSettings.forEach(row => {
          let s = {};
          headersSettings.forEach((h, i) => s[h] = row[i]);
          
          if (s.month) {
             // Parse ONLY numeric fields safely
             Object.keys(s).forEach(k => {
                 if (numericFields.includes(k)) {
                     // If cell is a Date (bad formatting), Number(date) creates a huge timestamp. Prevent this.
                     if (s[k] instanceof Date) {
                         s[k] = 0; 
                     } else {
                         // Parse float, replace comma with dot if string, handle errors
                         let val = s[k];
                         if (typeof val === 'string') val = val.replace(',', '.');
                         s[k] = parseFloat(val) || 0;
                     }
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
    
    const row = [
        params.month,
        params.baseSalary,
        params.hourlyRate,
        params.allowanceReturn,
        params.allowanceOvernight,
        params.allowanceForeign,
        params.taxRate || 27
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
