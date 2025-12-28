const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

// Gestione universale dell'icona Cloud (Colori e Animazioni)
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    
    icon.className = "fas"; // Reset classi
    
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; // GIALLO
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; // VERDE
    } else {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; // ROSSO
    }
}
