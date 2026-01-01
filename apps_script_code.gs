// --- COPIA QUESTO CODICE NEL TUO PROGETTO GOOGLE ACTIONS SCRIPT ---
// File: Code.gs

const SHEET_ID = ""; // <-- Se vuoi legarlo a uno sheet specifico, altrimenti usa ActiveSpreadsheet
// Se lo script è 'Container-Bound' (creato da dentro il foglio), usa getActiveSpreadsheet()

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
    let reportSheet = ss.getSheetByName("Reports");
    if (!reportSheet) {
      reportSheet = ss.insertSheet("Reports");
      reportSheet.appendRow(["ID", "Date", "Type", "Location", "StartTime", "EndTime", "TotalHours", "Overtime", "Absence", "LunchBreak", "Notes", "Timestamp"]);
    }

    // --- LOGICA ---
    const action = e.parameter.action || (e.postData ? "saveReport" : "ping");

    if (action === "ping") {
      return response({ status: "online" });
    }

    if (action === "saveReport" && e.postData) {
      const data = JSON.parse(e.postData.contents || e.parameter.data); // Supporta sia raw body che form-data
      
      reportSheet.appendRow([
        data.id,
        data.date,
        data.type,
        data.location,
        data.startTime,
        data.endTime,
        String(data.totalHours),
        String(data.overtime),
        data.absence,
        data.lunchBreak ? "Si" : "No",
        data.notes,
        new Date()
      ]);
      
      return response({ success: true });
    }

    if (action === "getData") {
        const rows = reportSheet.getDataRange().getValues();
        const headers = rows.shift(); // Rimuovi header
        const reports = rows.map(r => {
            return {
                id: r[0],
                date: r[1], // Nota: Google Sheets restituisce oggetti Date, andrebbero formattati
                type: r[2],
                location: r[3],
                startTime: r[4],
                endTime: r[5],
                totalHours: r[6],
                overtime: r[7],
                absence: r[8],
                lunchBreak: r[9] === "Si",
                notes: r[10]
            };
        });
        return response({ reports: reports });
    }

    return response({ error: "Action not found" });

  } catch (err) {
    return response({ error: err.toString() });
  } finally {
    lock.releaseLock();
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
    .setHeader("Access-Control-Allow-Origin", "*"); // IMPORTANTE PER CORS
}

function setup() {
    // Esegui questa funzione una volta per inizializzare i fogli se serve
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let s = ss.getSheetByName("Reports");
    if(!s) ss.insertSheet("Reports").appendRow(["ID", "Date", "Type", "Location", "StartTime", "EndTime", "TotalHours", "Overtime", "Absence", "LunchBreak", "Notes", "Timestamp"]);
}
