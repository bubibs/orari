function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

// LINK CSV pubblico del tuo Google Sheet
const SHEET_PUB_CSV = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk18AbYypWlNTxK9KzWVRSImHV847cAvhIpUn9aZu1Wgi9OKl27-4S6AK2NfXSO2yI0bdvqjVHKgQa/pub?output=csv";

function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

// Test connessione al cloud
async function testCloudConnection() {
  setCloudStatus("pending"); // grigia

  try {
    const response = await fetch(SHEET_PUB_CSV);
    if (!response.ok) throw new Error("Network response not OK");

    const text = await response.text();

    if (text.length > 0) {
      setCloudStatus("ok"); // verde
      console.log("✔ Cloud access OK");
    } else {
      throw new Error("Foglio vuoto o non accessibile");
    }
  } catch (err) {
    console.error("✖ Cloud access error:", err);
    setCloudStatus("error"); // rossa
  }
}

// Avvia il test al caricamento della pagina
testCloudConnection();
