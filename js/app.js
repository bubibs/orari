const cloudIcon = document.getElementById("cloud-status");

// URL CSV pubblicato
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSk18AbYypWlNTxK9KzWVRSImHV847cAvhIpUn9aZu1Wgi9OKl27-4S6AK2yI0bdvqjVHKgQa/pub?output=csv";

async function testCloudConnection() {
  cloudIcon.className = "cloud-icon pending";
  try {
    const res = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    if (text && text.length > 0) {
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
