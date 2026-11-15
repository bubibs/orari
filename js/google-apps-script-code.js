
// --- CONFIGURATION ---
const SHEET_REPORTS = "Reports";
const SHEET_CONTACTS = "Contacts";
const SHEET_SETTINGS = "Settings";
const SHEET_USERS = "Users";
const API_VERSION = 2;   // 2 = impostazioni per utente + getUsers
const SETTINGS_HEADERS = ['month', 'baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate', 'userId', 'updatedAt'];
const SETTINGS_NUMERIC = ['baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate'];

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
  if (action === 'getUsers') return getUsers();
  
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

  // 3. Settings (per mese e per utente)
  const settingsMap = readSettingsFor(ss, userId, isPrimary);

  // 4. Users
  const users = readUsers(ss);

  // 5. Daily Quote
  const quote = getDailyQuote();

  return ContentService.createTextOutput(JSON.stringify({
    reports: reports,
    contacts: contacts,
    settings: settingsMap,
    users: users,
    quote: quote,
    apiVersion: API_VERSION
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
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = getOrCreateSheet(ss, SHEET_SETTINGS);
    ensureHeaders(sheet, SETTINGS_HEADERS);

    const month = normalizeMonthCell(params.month, ss);
    if (!month) return jsonOut({ success: false, error: 'Mese non valido' });

    // Le impostazioni dell'amministratore restano con userId vuoto (compatibile con le righe gia' presenti).
    const owner = (params.isPrimary === true || params.isPrimary === 'true') ? '' : String(params.userId || '');
    const updatedAt = Number(params.updatedAt) || new Date().getTime();

    const headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const col = h => headers.indexOf(h);
    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    for (let r = 1; r < data.length; r++) {
      const sameMonth = normalizeMonthCell(data[r][col('month')], ss) === month;
      const sameOwner = String(col('userId') > -1 ? (data[r][col('userId')] || '') : '') === owner;
      if (sameMonth && sameOwner) { rowIndex = r; break; }
    }

    // Una scrittura piu' vecchia (es. inviata in ritardo dopo un periodo offline) non sovrascrive quella piu' recente.
    if (rowIndex > -1 && col('updatedAt') > -1 && (Number(data[rowIndex][col('updatedAt')]) || 0) > updatedAt) {
      return jsonOut({ success: true, ignored: true });
    }

    const parseNum = (v) => {
      if (v === undefined || v === null || v === '') return 0;
      const n = parseFloat(String(v).replace(',', '.'));
      return isNaN(n) ? 0 : n;
    };
    const rec = { month: month, userId: owner, updatedAt: updatedAt };
    SETTINGS_NUMERIC.forEach(f => { rec[f] = parseNum(params[f]); });
    const row = headers.map(h => (rec.hasOwnProperty(h) ? rec[h] : ''));

    const targetRow = rowIndex > -1 ? rowIndex + 1 : sheet.getLastRow() + 1;
    // Mese come TESTO: altrimenti Google Fogli lo trasforma in data ("2026-10" -> 1 ottobre 2026).
    sheet.getRange(targetRow, col('month') + 1).setNumberFormat('@');
    sheet.getRange(targetRow, 1, 1, row.length).setValues([row]);

    return jsonOut({ success: true });
  } finally {
    lock.releaseLock();
  }
}

function saveUser(user) {
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
}

function deleteUser(params) {
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

// --- SETTINGS / USERS HELPERS ---

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Il mese puo' arrivare come testo "2026-10" oppure come data (se Fogli l'ha convertito): restituisce sempre "YYYY-MM" o "default".
function normalizeMonthCell(v, ss) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, ss.getSpreadsheetTimeZone(), 'yyyy-MM');
  const t = String(v === undefined || v === null ? '' : v).trim();
  if (t === 'default') return 'default';
  const m = t.match(/^(\d{4})-(\d{2})/);
  return m ? (m[1] + '-' + m[2]) : '';
}

// Impostazioni dell'utente richiedente. Amministratore: righe con userId vuoto (storiche) o proprio. Altri: solo le proprie.
function readSettingsFor(ss, userId, isPrimary) {
  const sheet = getOrCreateSheet(ss, SHEET_SETTINGS);
  ensureHeaders(sheet, SETTINGS_HEADERS);
  const values = sheet.getDataRange().getValues();
  const shared = {}, own = {};
  if (values.length > 1) {
    const headers = values[0];
    const col = h => headers.indexOf(h);
    for (let r = 1; r < values.length; r++) {
      const row = values[r];
      const month = normalizeMonthCell(row[col('month')], ss);
      if (!month) continue;
      const owner = col('userId') > -1 ? String(row[col('userId')] || '') : '';
      const isOwn = owner !== '' && owner === String(userId);
      const visible = isOwn || (isPrimary && owner === '');
      if (!visible) continue;
      const s = { month: month, updatedAt: col('updatedAt') > -1 ? (Number(row[col('updatedAt')]) || 0) : 0 };
      SETTINGS_NUMERIC.forEach(f => {
        const c = col(f);
        const n = c > -1 ? parseFloat(String(row[c]).replace(',', '.')) : NaN;
        s[f] = isNaN(n) ? 0 : n;
      });
      (isOwn ? own : shared)[month] = s;
    }
  }
  const map = Object.assign({}, shared, own);   // la riga propria vince su quella storica

  // Solo per l'amministratore: crea la riga "default" se manca
  if (isPrimary && !map['default']) {
    const def = { month: 'default', baseSalary: 3480.76, hourlyRate: 17.23, allowanceReturn: 30, allowanceOvernight: 60, allowanceForeign: 105, taxRate: 27, updatedAt: 0 };
    const hdr = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    const row = hdr.map(h => (def.hasOwnProperty(h) ? def[h] : ''));
    const target = sheet.getLastRow() + 1;
    sheet.getRange(target, hdr.indexOf('month') + 1).setNumberFormat('@');
    sheet.getRange(target, 1, 1, row.length).setValues([row]);
    map['default'] = def;
  }
  return map;
}

function readUsers(ss) {
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
  return users;
}

// Leggero: solo gli utenti (usato dal login)
function getUsers() {
  return jsonOut({ users: readUsers(SpreadsheetApp.getActiveSpreadsheet()), apiVersion: API_VERSION });
}

// --- RECUPERO PASSWORD AMMINISTRATORE (da eseguire a mano dall'editor di Apps Script) ---
// 1) Impostazioni progetto > Proprieta' script > aggiungi  ADMIN_PASSWORD  = nuova password (almeno 8 caratteri)
// 2) Seleziona la funzione impostaPasswordAdmin e premi Esegui. La proprieta' viene poi cancellata.
// Solo chi possiede lo script puo' farlo: la password non passa mai da internet ne' dal codice pubblico.
function impostaPasswordAdmin() {
  const props = PropertiesService.getScriptProperties();
  const pwd = props.getProperty('ADMIN_PASSWORD');
  if (!pwd || pwd.length < 8) throw new Error('Aggiungi la proprieta script ADMIN_PASSWORD (almeno 8 caratteri) e riesegui.');
  const hash = sha256Hex_(pwd);
  saveUser({ id: 'fabio_sandrini', name: 'Fabio Sandrini', username: 'bubibs', email: 'bubibs@gmail.com', passwordHash: hash, isPrimary: true, createdAt: new Date().toISOString() });
  props.deleteProperty('ADMIN_PASSWORD');
  Logger.log('Password amministratore aggiornata. Proprieta ADMIN_PASSWORD rimossa.');
}

function sha256Hex_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}
