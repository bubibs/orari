const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

async function caricaDatiSito() {
    updateSyncStatus('working'); // Icona Gialla + rotazione
    console.log("Tentativo di connessione a:", WEB_APP_URL);

    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await response.json();
        
        if (json.success) {
            console.log("Connessione riuscita!", json.data);
            popolaUI(json.data, []); // Prova a caricare almeno le tariffe
            updateSyncStatus('success'); // Icona Verde
        } else {
            throw new Error("Il server ha risposto con un errore");
        }
    } catch (e) {
        console.error("Errore fatale:", e);
        updateSyncStatus('error'); // Icona Rossa
        alert("Errore di connessione: controlla di aver impostato 'Chiunque' nel deploy di Google!");
    }
}

// Gestione icone e colori come richiesto
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.className = "fas"; 
    
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; // Giallo durante il caricamento
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; // Verde se OK
    } else {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; // Rosso se errore
    }
}
