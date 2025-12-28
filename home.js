// Home page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Check cloud sync status
    await checkCloudStatus();
    
    // Load motivational quote
    loadMotivationalQuote();
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        const result = await API.checkSync();
        if (result.synced) {
            statusIcon.textContent = '☁️';
            statusIcon.classList.add('synced');
            statusText.textContent = 'Sincronizzato';
            // Force green color
            statusIcon.style.filter = 'grayscale(0%) brightness(1.2) hue-rotate(120deg) saturate(2.5) contrast(1.2)';
        } else {
            statusIcon.textContent = '☁️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
            statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
        }
    } catch (error) {
        statusIcon.textContent = '☁️';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
        statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
    }
}

async function loadMotivationalQuote() {
    const quoteElement = document.getElementById('motivationalQuote');
    
    try {
        // Try to get quote from cache (stored with today's date)
        const today = new Date().toDateString();
        const cachedQuote = localStorage.getItem(`quote_${today}`);
        
        if (cachedQuote) {
            quoteElement.innerHTML = `<p>${cachedQuote}</p>`;
            return;
        }
        
        // Fetch new quote from API (quotable doesn't support Italian, so we'll use fallback)
        // Try to fetch anyway, but use fallback if it fails
        try {
            const response = await fetch('https://api.quotable.io/random');
            if (response.ok) {
                const data = await response.json();
                // Use fallback quotes in Italian instead
                throw new Error('Using Italian quotes');
            } else {
                throw new Error('Failed to fetch quote');
            }
        } catch {
            throw new Error('Using fallback');
        }
    } catch (error) {
        // Fallback quotes in Italian
        const fallbackQuotes = [
            'Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.',
            'Non aspettare il momento perfetto, inizia da dove sei.',
            'La differenza tra l\'impossibile e il possibile sta nella determinazione.',
            'Ogni esperto è stato un giorno un principiante.',
            'Il futuro appartiene a coloro che credono nella bellezza dei propri sogni.',
            'Non contare i giorni, fai in modo che i giorni contino.',
            'Il lavoro duro batte il talento quando il talento non lavora sodo.',
            'Il successo non è definitivo, il fallimento non è fatale: è il coraggio di continuare che conta.'
        ];
        
        const randomQuote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
        quoteElement.innerHTML = `<p>${randomQuote}</p>`;
        const today = new Date().toDateString();
        localStorage.setItem(`quote_${today}`, randomQuote);
    }
}

