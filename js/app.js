function goTo(page) {
  window.location.href = page;
}

const cloudIcon = document.getElementById("cloud-status");

/*
  Stati possibili:
  pending = grigio
  ok = verde
  error = rosso
*/

// STATO INIZIALE
cloudIcon.className = "cloud-icon pending";
cloudIcon.title = "Cloud non configurato";

// Quando collegheremo Google Sheets:
// cloudIcon.className = "cloud-icon ok";
// cloudIcon.title = "Cloud sincronizzato";

// In caso di errore:
// cloudIcon.className = "cloud-icon error";
// cloudIcon.title = "Errore di sincronizzazione";
