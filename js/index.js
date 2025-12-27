document.addEventListener('DOMContentLoaded', () => {
    aggiornaData();
    mostraFrase();
    checkConnection();
});

function aggiornaData() {
    const d = new Date();
    const mesi = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
    document.getElementById('date-day').innerText = d.getDate();
    document.getElementById('date-month').innerText = mesi[d.getMonth()];
}

function mostraFrase() {
    const frasi = [
        "Un lavoro ben fatto è il miglior biglietto da visita.",
        "Ogni installazione è una firma sulla qualità Tecnosistem.",
        "La precisione oggi evita un problema domani.",
        "Puntualità e professionalità: facciamo la differenza.",
        "Nessun intervento è troppo piccolo per essere fatto alla perfezione.",
        "Fine giornata? Assicurati che tutto sia in ordine. Ottimo lavoro!",
        "La sicurezza sul lavoro inizia dalla tua attenzione.",
        "Un cliente soddisfatto è il risultato di un tecnico eccellente."
    ];
    const index = Math.floor(Math.random() * frasi.length);
    document.getElementById('motivation-text').innerText = frasi[index];
}

function checkConnection() {
    const icon = document.getElementById('cloud-icon');
    const text = document.getElementById('sync-text');
    
    if (navigator.onLine) {
        icon.className = 'fas fa-cloud status-success';
        text.innerText = "Cloud Sincronizzato";
        text.className = "status-success";
    } else {
        icon.className = 'fas fa-cloud-slash status-error';
        text.innerText = "Modalità Offline";
        text.className = "status-error";
    }
}

window.addEventListener('online', checkConnection);
window.addEventListener('offline', checkConnection);
