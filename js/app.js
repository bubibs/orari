function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");
const fraseElem = document.getElementById("frase-motivazionale");

// ============================
// CLOUD APPS SCRIPT
// ============================
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

// ============================
// FRASE MOTIVAZIONALE DAL WEB
// ============================
async function mostraFraseWeb() {
  try {
    const response = await fetch("https://type.fit/api/quotes");
    const quotes = await response.json();
    const frase = quotes[Math.floor(Math.random() * quotes.length)];
    fraseElem.innerText = `"${frase.text}" - ${frase.author || "Anonimo"}`;
  } catch (err) {
    console.error("Errore fetch frase:", err);
    // fallback locale
    const fallback = [
      "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.",
      "Non aspettare l'opportunità, creala.",
      "Il lavoro di squadra divide i compiti e moltiplica il successo."
    ];
    const frase = fallback[Math.floor(Math.random() * fallback.length)];
    fraseElem.innerText = frase;
  }
}

// ============================
// UTILI
// ============================
function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

// ============================
// AVVIO ALLA PARTENZA
// ============================
testCloudConnection();
mostraFraseWeb();
