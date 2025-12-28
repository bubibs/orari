const cloudIcon = document.getElementById("cloud-status");
const SHEET_JSON_URL = "https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec";

// Controllo semplice cloud
async function testCloudConnection() {
  cloudIcon.className = "cloud-icon pending"; // grigia
  try {
    const res = await fetch(SHEET_JSON_URL);
    const data = await res.json();
    if (data && data.rows && data.rows.length > 0) {
      cloudIcon.className = "cloud-icon ok"; // verde
      console.log("Cloud access OK");
    } else {
      cloudIcon.className = "cloud-icon error"; // rosso
      console.error("Foglio vuoto");
    }
  } catch (err) {
    cloudIcon.className = "cloud-icon error"; // rosso
    console.error("Errore cloud:", err);
  }
}

testCloudConnection();
