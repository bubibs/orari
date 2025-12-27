document.addEventListener('DOMContentLoaded', () => {
    aggiornaData();
    caricaFraseOnline();
    checkCloudStatus();
});

// 1. Gestione della Data nella card in basso
function aggiornaData() {
    const options = { weekday: 'long', day: 'numeric', month: 'long' };
    const today = new Date().toLocaleDateString('it-IT', options);
    const formattedDate = today.charAt(0).toUpperCase() + today.slice(1);
    const el = document.getElementById('date-display');
    if (el) el.innerText = formattedDate;
}

// 2. Caricamento frasi da API esterna (con fallback in italiano)
async function caricaFraseOnline() {
    const textEl = document.getElementById('motivation-text');
    const authEl = document.getElementById('motivation-author');
    
    // Frasi di emergenza in Italiano (se l'API è lenta o sei offline)
    const backupFrasi = [
        {t: "La qualità è fare le cose bene quando nessuno ti guarda.", a: "Henry Ford"},
        {t: "L'unico modo per fare un ottimo lavoro è amare quello che fai.", a: "Steve Jobs"},
        {t: "La precisione è la cortesia dei tecnici.", a: "Anonimo"},
        {t: "Sii così bravo che non potranno ignorarti.", a: "Steve Martin"},
        {t: "L'eccellenza non è un atto, ma un'abitudine.", a: "Aristotele"}
    ];

    try {
        // Tentativo di recupero frase da API (Citazioni famose)
        const response = await fetch('https://api.quotable.io/random?tags=wisdom|success');
        if (!response.ok) throw new Error("API non disponibile");
        
        const data = await response.json();
        textEl.innerText = `"${data.content}"`;
        authEl.innerText = `- ${data.author}`;
    } catch (e) {
        // Se l'API fallisce, usa una frase a caso dal backup italiano
        const random = backupFrasi[Math.floor(Math.random() * backupFrasi.length)];
        textEl.innerText = `"${random.t}"`;
        authEl.innerText = `- ${random.a}`;
    }
}

// 3. Controllo colore nuvola sincronizzazione
function checkCloudStatus() {
    const icon = document.getElementById('cloud-icon');
    if (!icon) return;

    if (navigator.onLine) {
        icon.className = 'fas fa-cloud status-success';
        // Opzionale: puoi aggiungere un console.log per debug
        console.log("Tecnosistem: Cloud Online");
    } else {
        icon.className = 'fas fa-cloud-slash status-error';
        console.log("Tecnosistem: Cloud Offline");
    }
}

// Ascoltatori per il cambio di connessione in tempo reale
window.addEventListener('online', checkCloudStatus);
window.addEventListener('offline', checkCloudStatus);
