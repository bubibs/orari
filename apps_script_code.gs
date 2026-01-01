// --- COPIA QUESTO CODICE NEL TUO PROGETTO GOOGLE ACTIONS SCRIPT (SOVRASCRIVI TUTTO) ---
// Versione: 2.0 (Full Sync)

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- SETUP FOGLI ---
    let sheets = {
      reports: getOrCreateSheet(ss, "Reports", ["ID", "Date", "Type", "Location", "StartTime", "EndTime", "TotalHours", "Overtime", "Absence", "LunchBreak", "Notes", "Timestamp"]),
      contacts: getOrCreateSheet(ss, "Contacts", ["ID", "Company", "Address", "Person", "Phone", "Timestamp"]),
      settings: getOrCreateSheet(ss, "Settings", ["Key", "Value"]) // Key-Value store semplice
    };

    const action = e.parameter.action || (e.postData ? "save" : "ping");
    let data = null;
    if (e.postData) {
       data = JSON.parse(e.postData.contents || e.parameter.data);
    }

    // --- AZIONI ---

    if (action === "ping") return response({ status: "online" });

    // 1. SAVE REPORT (Update or Append)
    if (action === "saveReport" && data) {
      // Se ID esiste, aggiorna, altrimenti append
      if (data.id) {
         updateOrAppend(sheets.reports, data.id, [
            data.id, data.date, data.type, data.location, data.startTime, data.endTime,
            String(data.totalHours), String(data.overtime), data.absence, data.lunchBreak ? "Si" : "No",
            data.notes, new Date()
         ]);
      } else {
         // Fallback old style (no id?)
         sheets.reports.appendRow([/*...*/]);
      }
      return response({ success: true });
    }
    
    // 1b. DELETE REPORT
    if (action === "deleteReport" && data) {
        deleteRowById(sheets.reports, data.id);
        return response({ success: true });
    }

    // 2. SAVE CONTACT (Update or Append)
    if (action === "saveContact" && data) {
      updateOrAppend(sheets.contacts, data.id, [
        data.id, data.company, data.address, data.person, data.phone, new Date()
      ]);
      return response({ success: true });
    }

    // 3. DELETE CONTACT
    if (action === "deleteContact" && data) {
      deleteRowById(sheets.contacts, data.id);
      return response({ success: true });
    }

    // 4. SAVE SETTINGS (Overwrite)
    if (action === "saveSettings" && data) {
      // Data è un oggetto { baseSalary: 100, ... }
      // Cancelliamo tutto e riscriviamo
      sheets.settings.clearContents();
      sheets.settings.appendRow(["Key", "Value"]); // Header
      Object.keys(data).forEach(k => {
          sheets.settings.appendRow([k, data[k]]);
      });
      return response({ success: true });
    }

    // 5. GET ALL DATA (Sync iniziale)
    if (action === "getData") {
        return response({
            reports: sheetToJson(sheets.reports),
            contacts: sheetToJson(sheets.contacts),
            settings: sheetToSettings(sheets.settings)
        });
    }

    return response({ error: "Action not found: " + action });

  } catch (err) {
    return response({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

// --- HELPER FUNCTIONS ---

function getOrCreateSheet(ss, name, header) {
  let s = ss.getSheetByName(name);
  if (!s) {
    s = ss.insertSheet(name);
    s.appendRow(header);
  }
  return s;
}

function updateOrAppend(sheet, id, rowData) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      // Update
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  }
  // Append
  sheet.appendRow(rowData);
}

function deleteRowById(sheet, id) {
  const data = sheet.getDataRange().getValues();
  // Partiamo dal fondo per non sballare gli indici
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
    }
  }
}

function sheetToJson(sheet) {
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift(); // Rimuoviamo header
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => {
      // Convertiamo header in camelCase (es. "Total Hours" -> "totalHours") se serve, 
      // ma qui usiamo chiavi semplici. Mappiamo manualmente per sicurezza lato client 
      // o usiamo l'ordine posizionale.
      // Per semplicità qui restituiamo un oggetto con chiavi lowerCase degli header
      obj[h.toLowerCase()] = row[i];
    });
    return obj;
  });
}

function sheetToSettings(sheet) {
    const rows = sheet.getDataRange().getValues();
    rows.shift(); // Via header
    let settings = {};
    rows.forEach(r => {
        if(r[0]) settings[r[0]] = r[1];
    });
    return settings;
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
