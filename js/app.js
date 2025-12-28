function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

// ============================
// CONFIGURAZIONE FOGLIO
// ============================
const SPREADSHEET_ID = "2PACX-1vSk18AbYypWlNTxK9KzWVRSImHV847cAvhIpUn9aZu1Wgi9OKl27-4S6AK2S6AK2NfXSO2yI0bdvqjVHKgQa";
const SHEET_NAME = "Report"; // inserisci qui il nome esatto del foglio

// ============================
// STATO CLOUD
// ============================
function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

// ============================
// TEST CONNESSIONE CLOUD
// ============================
function checkCloudGviz() {
  setCloudStatus("pending");

  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?sheet=${SHEET_NAME}&tqx=out:json&callback=googleSheetCallback`;

  const script = document.createElement("script");
  script.src = url;
  script.onerror = () => setCloudStatus("error");
  document.body.appendChild(script);

  window.googleSheetCallback = function (data) {
    if (data.table && data.table.rows.length > 0) {
      setCloudStatus("ok"); // verde
      console.log("✔ Cloud access OK");
    } else {
      setCloudStatus("error"); // rossa
      console.error("✖ Foglio vuoto o non accessibile");
    }
    document.body.removeChild(script);
  };
}

// Avvia test al caricamento
checkCloudGviz();

