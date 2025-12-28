function goTo(page) {
  window.location.href = page;
}

const cloudStatus = document.getElementById("cloud-status");

// finché non inseriamo il link reale
cloudStatus.innerText = "☁️ Cloud non configurato";
cloudStatus.className = "cloud pending";
