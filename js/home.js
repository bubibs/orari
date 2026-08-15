// Home page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Update backup status
    updateBackupStatus();
    
    // Load motivational quote
    loadMotivationalQuote();
    
    // Setup backup buttons
    setupBackupButtons();
    
    // Update backup status every minute
    setInterval(updateBackupStatus, 60000);
});

function updateBackupStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    const lastBackupInfo = document.getElementById('lastBackupInfo');
    
    statusIcon.textContent = '💾';
    statusIcon.style.filter = 'none';
    statusText.textContent = 'Salvataggio Locale';
    
    const lastBackup = Storage.getLastBackupDate();
    if (lastBackup) {
        const now = new Date();
        const hoursAgo = Math.floor((now - lastBackup) / (1000 * 60 * 60));
        if (hoursAgo < 24) {
            lastBackupInfo.textContent = `Ultimo backup: ${hoursAgo} ore fa`;
        } else {
            const daysAgo = Math.floor(hoursAgo / 24);
            lastBackupInfo.textContent = `Ultimo backup: ${daysAgo} giorno${daysAgo > 1 ? 'i' : ''} fa`;
        }
    } else {
        lastBackupInfo.textContent = 'Nessun backup ancora creato';
    }
}

function setupBackupButtons() {
    // Export backup
    document.getElementById('exportBackupBtn').addEventListener('click', async () => {
        const btn = document.getElementById('exportBackupBtn');
        btn.disabled = true;
        btn.textContent = 'Esportazione...';
        
        try {
            const result = await Storage.exportBackup();
            if (result.success) {
                showNotification('Backup esportato con successo!', 'success');
                updateBackupStatus();
            } else {
                showNotification('Errore nell\'esportazione: ' + (result.error || 'Errore sconosciuto'), 'error');
            }
        } catch (error) {
            showNotification('Errore nell\'esportazione: ' + error.message, 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = '📥 Esporta Backup';
        }
    });
    
    // Import backup
    document.getElementById('importBackupInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const label = document.querySelector('label[for="importBackupInput"]');
        label.textContent = 'Caricamento...';
        label.style.pointerEvents = 'none';
        
        try {
            const result = await Storage.importBackup(file);
            if (result.success) {
                showNotification('Backup caricato con successo! Ricarica la pagina per vedere i nuovi dati.', 'success');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                showNotification('Errore nel caricamento: ' + (result.error || 'Errore sconosciuto'), 'error');
            }
        } catch (error) {
            showNotification('Errore nel caricamento: ' + error.message, 'error');
        } finally {
            label.textContent = '📤 Carica Backup';
            label.style.pointerEvents = 'auto';
            e.target.value = ''; // Reset input
        }
    });
}

function loadMotivationalQuote() {
    const quoteElement = document.getElementById('motivationalQuote');
    if (!quoteElement) return;
    
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
    
    try {
        const today = new Date().toDateString();
        let quote = localStorage.getItem(`quote_${today}`);
        if (!quote) {
            quote = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
            localStorage.setItem(`quote_${today}`, quote);
        }
        quoteElement.innerHTML = `<p>${quote}</p>`;
    } catch (error) {
        quoteElement.innerHTML = `<p>${fallbackQuotes[0]}</p>`;
    }
}

