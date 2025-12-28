function goTo(page) {
  window.location.href = page;
}

// SIMULAZIONE CONTROLLO CLOUD
const cloudStatus = document.getElementById("cloud-status");

setTimeout(() => {
  cloudStatus.innerText = "🟢 Sincronizzato con il cloud";
  cloudStatus.className = "sync ok";
}, 1200);
