// ID del tuo foglio di lavoro
var SPREADSHEET_ID = '1-IR2NTqTg57R3JovdQacis1v7MWG0XysT5f1kmTmAzI';

// Nomi dei fogli
var SHEET_REPORTS = 'Reports';
var SHEET_CONTACTS = 'Contacts';
var SHEET_SETTINGS = 'Settings';
var SHEET_PAGA_BASE_MENSILE = 'PagaBaseMensile';

// Funzione principale che gestisce tutte le richieste POST
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid request'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var result = {};
    
    if (action === 'ping') {
      result = { success: true, message: 'Connected' };
    } else if (action === 'saveReport') {
      result = saveReport(data.data);
    } else if (action === 'getReports') {
      result = getReports(data.filters || {});
    } else if (action === 'updateReport') {
      result = updateReport(data.id, data.data);
    } else if (action === 'deleteReport') {
      result = deleteReport(data.id);
    } else if (action === 'saveContact') {
      result = saveContact(data.data);
    } else if (action === 'getContacts') {
      result = getContacts();
    } else if (action === 'updateContact') {
      result = updateContact(data.id, data.data);
    } else if (action === 'deleteContact') {
      result = deleteContact(data.id);
    } else if (action === 'getSalaryData') {
      result = getSalaryData(data.month, data.year);
    } else if (action === 'saveSettings') {
      result = saveSettings(data.data);
    } else if (action === 'getSettings') {
      result = getSettings();
    } else if (action === 'savePagaBaseMensile') {
      result = savePagaBaseMensile(
        parseInt(data.month),
        parseInt(data.year),
        parseFloat(data.pagaBase)
      );
    } else {
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
  try {
    if (!e || !e.parameter) {
      return ContentService.createTextOutput(JSON.stringify({
        success: false,
        error: 'Invalid request'
      })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var action = e.parameter.action;
    var result = {};
    
    if (action === 'ping') {
      result = { success: true, message: 'Connected' };
    } else if (action === 'getReports') {
      result = getReports(e.parameter);
    } else if (action === 'getContacts') {
      result = getContacts();
    } else if (action === 'getSalaryData') {
      var month = parseInt(e.parameter.month);
      var year = parseInt(e.parameter.year);
      result = getSalaryData(month, year);
    } else if (action === 'getSettings') {
      result = getSettings();
    } else {
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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    
    if (!reportData) {
      return { success: false, error: 'No data provided' };
    }
    
    if (!reportData.id) {
      reportData.id = Date.now().toString();
      reportData.createdAt = new Date().toISOString();
    }
    
    var row = [];
    row.push(reportData.id);
    row.push(reportData.data || '');
    row.push(reportData.tipoLavoro || '');
    row.push(reportData.assenza || '');
    row.push(reportData.oraInizio || '');
    row.push(reportData.oraFine || '');
    row.push(reportData.pausaMensa || false);
    row.push(reportData.luogoIntervento || '');
    row.push(reportData.note || '');
    row.push(reportData.oreTotali || 0);
    row.push(reportData.oreStraordinarie || 0);
    row.push(reportData.createdAt || new Date().toISOString());
    // Add settings snapshot as JSON string
    var settingsSnapshot = reportData.settingsSnapshot || {};
    row.push(JSON.stringify(settingsSnapshot));
    
    // Cerca se esiste già
    var data = sheet.getDataRange().getValues();
    var found = false;
    var i;
    
    for (i = 1; i < data.length; i++) {
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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    var reports = [];
    var i;
    var row;
    var report;
    var reportDate;
    
    for (i = 1; i < data.length; i++) {
      row = data[i];
      report = {};
      report.id = row[0];
      report.data = row[1];
      report.tipoLavoro = row[2];
      report.assenza = row[3];
      report.oraInizio = row[4];
      report.oraFine = row[5];
      report.pausaMensa = row[6];
      report.luogoIntervento = row[7];
      report.note = row[8];
      report.oreTotali = row[9];
      report.oreStraordinarie = row[10];
      report.createdAt = row[11];
      // Parse settings snapshot if present
      if (row[12]) {
        try {
          report.settingsSnapshot = JSON.parse(row[12]);
        } catch (e) {
          report.settingsSnapshot = null;
        }
      } else {
        report.settingsSnapshot = null;
      }
      
      // Applica filtri se presenti
      if (filters && filters.month && filters.year) {
        reportDate = new Date(report.data);
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
  if (!reportData) {
    reportData = {};
  }
  var updatedData = {};
  updatedData.id = id;
  updatedData.data = reportData.data;
  updatedData.tipoLavoro = reportData.tipoLavoro;
  updatedData.assenza = reportData.assenza;
  updatedData.oraInizio = reportData.oraInizio;
  updatedData.oraFine = reportData.oraFine;
  updatedData.pausaMensa = reportData.pausaMensa;
  updatedData.luogoIntervento = reportData.luogoIntervento;
  updatedData.note = reportData.note;
  updatedData.oreTotali = reportData.oreTotali;
  updatedData.oreStraordinarie = reportData.oreStraordinarie;
  updatedData.createdAt = reportData.createdAt;
  updatedData.settingsSnapshot = reportData.settingsSnapshot;
  return saveReport(updatedData);
}

function deleteReport(id) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_REPORTS);
    var data = sheet.getDataRange().getValues();
    var i;
    
    for (i = 1; i < data.length; i++) {
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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    
    if (!contactData) {
      return { success: false, error: 'No data provided' };
    }
    
    if (!contactData.id) {
      contactData.id = Date.now().toString();
    }
    
    var row = [];
    row.push(contactData.id);
    row.push(contactData.azienda || '');
    row.push(contactData.citta || '');
    row.push(contactData.via || '');
    row.push(contactData.referente || '');
    row.push(contactData.telefono || '');
    
    var data = sheet.getDataRange().getValues();
    var found = false;
    var i;
    
    for (i = 1; i < data.length; i++) {
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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      return { success: true, data: [] };
    }
    
    var contacts = [];
    var i;
    var row;
    var contact;
    
    for (i = 1; i < data.length; i++) {
      row = data[i];
      contact = {};
      contact.id = row[0];
      contact.azienda = row[1];
      contact.citta = row[2];
      contact.via = row[3];
      contact.referente = row[4];
      contact.telefono = row[5];
      contacts.push(contact);
    }
    
    return { success: true, data: contacts };
  } catch (error) {
    return { success: false, error: error.toString(), data: [] };
  }
}

function updateContact(id, contactData) {
  if (!contactData) {
    contactData = {};
  }
  var updatedData = {};
  updatedData.id = id;
  updatedData.azienda = contactData.azienda;
  updatedData.citta = contactData.citta;
  updatedData.via = contactData.via;
  updatedData.referente = contactData.referente;
  updatedData.telefono = contactData.telefono;
  return saveContact(updatedData);
}

function deleteContact(id) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_CONTACTS);
    var data = sheet.getDataRange().getValues();
    var i;
    
    for (i = 1; i < data.length; i++) {
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
    var reportsResult = getReports({ month: month, year: year });
    var reports = reportsResult.data || [];
    
    var giorniLavorati = 0;
    var giorniTrasferta = 0;
    var giorniAssenza = 0;
    var oreSede = 0;
    var oreTrasfertaRientro = 0;
    var oreTrasfertaPernottamento = 0;
    var oreTrasfertaEstero = 0;
    var oreStraordinarie = 0;
    var i;
    var report;
    var ore;
    var straordinarie;
    
    for (i = 0; i < reports.length; i++) {
      report = reports[i];
      if (report.assenza) {
        giorniAssenza++;
      } else {
        giorniLavorati++;
        ore = parseFloat(report.oreTotali) || 0;
        straordinarie = parseFloat(report.oreStraordinarie) || 0;
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
    }
    
    var resultData = {};
    resultData.giorniLavorati = giorniLavorati;
    resultData.giorniTrasferta = giorniTrasferta;
    resultData.giorniAssenza = giorniAssenza;
    resultData.oreSede = oreSede;
    resultData.oreTrasfertaRientro = oreTrasfertaRientro;
    resultData.oreTrasfertaPernottamento = oreTrasfertaPernottamento;
    resultData.oreTrasfertaEstero = oreTrasfertaEstero;
    resultData.oreStraordinarie = oreStraordinarie;
    
    return {
      success: true,
      data: resultData
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Funzioni per gestire le Settings
function saveSettings(settings) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SETTINGS);
    var data = sheet.getDataRange().getValues();
    
    var settingsMap = {};
    settingsMap.pagaBase = settings.pagaBase;
    settingsMap.pagaOraria = settings.pagaOraria;
    settingsMap.indennitaRientro = settings.indennitaRientro;
    settingsMap.indennitaPernottamento = settings.indennitaPernottamento;
    settingsMap.indennitaEstero = settings.indennitaEstero;
    settingsMap.aliquota = settings.aliquota;
    
    var i;
    var key;
    
    for (i = 1; i < data.length; i++) {
      key = data[i][0];
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
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_SETTINGS);
    var data = sheet.getDataRange().getValues();
    
    var settings = {};
    settings.pagaBase = 2000;
    settings.pagaOraria = 12.5;
    settings.indennitaRientro = 15;
    settings.indennitaPernottamento = 50;
    settings.indennitaEstero = 100;
    settings.aliquota = 25;
    
    var i;
    var key;
    var value;
    
    for (i = 1; i < data.length; i++) {
      key = data[i][0];
      value = data[i][1];
      if (settings.hasOwnProperty(key)) {
        settings[key] = parseFloat(value) || settings[key];
      }
    }
    
    return { success: true, data: settings };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

// Funzioni per gestire la Paga Base Mensile
function getPagaBaseMensile(month, year) {
  try {
    var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_PAGA_BASE_MENSILE);
    if (!sheet) {
      return { success: true, data: null };
    }
    
    var data = sheet.getDataRange().getValues();
    var i;
    var row;
    
    for (i = 1; i < data.length; i++) {
      row = data[i];
      if (parseInt(row[0]) === year && parseInt(row[1]) === month) {
        return { success: true, data: parseFloat(row[2]) || null };
      }
    }
    
    return { success: true, data: null };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

function savePagaBaseMensile(month, year, pagaBase) {
  try {
    var spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = spreadsheet.getSheetByName(SHEET_PAGA_BASE_MENSILE);
    
    // Create sheet if it doesn't exist
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SHEET_PAGA_BASE_MENSILE);
      sheet.getRange(1, 1, 1, 3).setValues([['anno', 'mese', 'pagaBase']]);
    }
    
    var data = sheet.getDataRange().getValues();
    var found = false;
    var i;
    
    for (i = 1; i < data.length; i++) {
      if (parseInt(data[i][0]) === year && parseInt(data[i][1]) === month) {
        sheet.getRange(i + 1, 3).setValue(pagaBase);
        found = true;
        break;
      }
    }
    
    if (!found) {
      sheet.appendRow([year, month, pagaBase]);
    }
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}
