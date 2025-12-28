function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

// ============================
// CONFIGURAZIONE FOGLIO
// ============================

// Usa l'ID classico del tuo documento Google Sheet
const SPREADSHEET_ID = "1-IR2NTqTg57R3JovdQacis1v7MWG0XysT5f1kmTmAzI";
const SHEET_NAME = "Reports"; // nome esatto del foglio

// ============================
// STATO CLOUD
// ============================
function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

// ============================
// TEST CONNESSIONE CLOUD
// ============================
function checkCloud() {
  setCloudStatus("pending"); // grigia

  // URL GViz JSONP
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${SHEET_NAME}&tqx=out:json&callback=cloudCallback`;

  // crea uno script dinamico
  const script = document.createElement("script");
  script.src = url;
  script.onerror = () => setCloudStatus("error"); // rossa se fallisce
  document.body.appendChild(script);

  // callback JSONP
  window.cloudCallback = function(data) {
    if (data.table && data.table.rows.length > 0) {
      setCloudStatus("ok"); // verde se ci sono dati
      console.log("✔ Cloud access OK");
    } else {
      setCloudStatus("error"); // rossa se vuoto
      console.error("✖ Foglio vuoto o non accessibile");
    }
    document.body.removeChild(script);
  };
}

// Avvia test al caricamento della pagina
checkCloud();
