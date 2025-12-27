// ASSICURATI CHE QUESTO URL SIA QUELLO NUOVO APPENA COPIATO
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

async function caricaDatiSito() {
    updateSyncStatus('working'); // Diventa Giallo
    try {
        const urlImpo = `${WEB_APP_URL}?azione=leggi_impostazioni`;
        const response = await fetch(urlImpo);
        
        if (!response.ok) throw new Error("Errore di rete: " + response.status);
        
        const json = await response.json();
        if (json.success) {
            popolaUI(json.data, []); 
            updateSyncStatus('success'); // Diventa Verde
        } else {
            console.error("Errore server:", json.error);
            updateSyncStatus('error');
        }
    } catch (e) {
        console.error("Dettaglio Errore:", e);
        updateSyncStatus('error'); // Diventa Rosso
        // Questo alert ci dice il colpevole
        if(e.message.includes("Failed to fetch")) {
            alert("Il browser blocca la connessione. Controlla che il Deploy sia su 'Chiunque'!");
        }
    }
}
