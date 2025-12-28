function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

// STATO INIZIALE: cloud NON ancora collegato
cloudIcon.className = "cloud-icon pending";
cloudIcon.title = "Cloud non configurato";

// In futuro (quando collegheremo Google Sheets):
// cloudIcon.className = "cloud-icon ok";
// cloudIcon.title = "Sincronizzato con il cloud";

// In caso di errore:
// cloudIcon.className = "cloud-icon error";
// cloudIcon.title = "Errore di sincronizzazione";
