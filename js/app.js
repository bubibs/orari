function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

// URL del tuo Google Apps Script pubblicato
const SHEET_JSON_URL = "https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec";

async function testCloudConnection() {
  setCloudStatus("pending"); // grigia

  try {
    const res = await fetch(SHEET_JSON_URL);
    const data = await res.json();

    if (data.length > 0) {
      setCloudStatus("ok"); // verde
      console.log("✔ Cloud access OK");
    } else {
      setCloudStatus("error"); // rossa
      console.error("✖ Foglio vuoto");
    }
  } catch (err) {
    setCloudStatus("error"); // rossa
    console.error("✖ Errore cloud:", err);
  }
}

// Avvia il test al caricamento della pagina
testCloudConnection();
