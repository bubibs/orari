function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");
const fraseElem = document.getElementById("frase-motivazionale");

// URL Google Apps Script
const SHEET_JSON_URL = "https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec";

// Funzione cloud
async function testCloudConnection() {
  cloudIcon.className = "cloud-icon pending";
  try {
    const res = await fetch(SHEET_JSON_URL);
    const data = await res.json();
    if (data.length > 0) cloudIcon.className = "cloud-icon ok";
    else cloudIcon.className = "cloud-icon error";
  } catch (err) {
    cloudIcon.className = "cloud-icon error";
    console.error("Errore cloud:", err);
  }
}

// Frase motivazionale dal web
async function mostraFraseWeb() {
  try {
    const response = await fetch("https://type.fit/api/quotes");
    const quotes = await response.json();
    const frase = quotes[Math.floor(Math.random() * quotes.length)];
    fraseElem.innerText = `"${frase.text}" - ${frase.author || "Anonimo"}`;
  } catch (err) {
    console.error("Errore fetch frase:", err);
    const fallback = [
      "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.",
      "Non aspettare l'opportunità, creala."
    ];
    fraseElem.innerText = fallback[Math.floor(Math.random() * fallback.length)];
  }
}

// Avvio
testCloudConnection();
mostraFraseWeb();
