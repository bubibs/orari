function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

// Inserisci qui l’URL diretto al tuo Google Sheet pubblicato
const SHEET_PUB_CSV = "https://docs.google.com/spreadsheets/d/1-IR2NTqTg57R3JovdQacis1v7MWG0XysT5f1kmTmAzI/pub?output=csv";

function setCloudStatus(status) {
  cloudIcon.className = `cloud-icon ${status}`;
}

async function testCloudConnection() {
  setCloudStatus("pending");
  try {
    const response = await fetch(SHEET_PUB_CSV);
    if (!response.ok) throw new Error("Network response not OK");
    
    // prova a leggere una riga
    const text = await response.text();
    if (text.length > 0) {
      setCloudStatus("ok");
      console.log("✔ Cloud access OK");
    } else {
      throw new Error("Foglio vuoto o non accessibile");
    }
  } catch (err) {
    console.error("✖ Cloud access error:", err);
    setCloudStatus("error");
  }
}

testCloudConnection();
