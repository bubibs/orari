const WEB_APP_URL = "INSERISCI_TUO_URL_QUI"; 
let dati = [];

document.addEventListener('DOMContentLoaded', () => {
    // Inizializzazione comune
    const oggi = new Date();
    
    // Controlla se siamo in index.html (Inserimento)
    if(document.getElementById('ora-inizio')) {
        popolaOrari();
        document.getElementById('data').value = oggi.toISOString().split('T')[0];
    }
    
    // Controlla se siamo in calcoli.html (Storico)
    if(document.getElementById('mese-calcolo')) {
        document.getElementById('mese-calcolo').value = oggi.toISOString().slice(0, 7);
    }

    fetchData();
});

// Tutte le altre funzioni (salva, fetchData, logicModalita, renderTabella, etc.)
// rimangono identiche a quelle fornite prima. Il file JS è unico per semplicità.

// ... [Inserisci qui tutte le funzioni del messaggio precedente per fetchData, salva, renderTabella, popolaOrari] ...
