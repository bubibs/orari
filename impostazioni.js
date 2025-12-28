// Settings page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Check cloud status
    await checkCloudStatus();
    
    // Load current settings
    await loadSettings();
    
    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

async function loadSettings() {
    try {
        const settings = await API.getSettings();
        
        document.getElementById('pagaBase').value = settings.pagaBase || 2000;
        document.getElementById('pagaOraria').value = settings.pagaOraria || 12.5;
        document.getElementById('indennitaRientro').value = settings.indennitaRientro || 15;
        document.getElementById('indennitaPernottamento').value = settings.indennitaPernottamento || 50;
        document.getElementById('indennitaEstero').value = settings.indennitaEstero || 100;
        document.getElementById('aliquota').value = settings.aliquota || 25;
    } catch (error) {
        showNotification('Errore nel caricamento delle impostazioni', 'error');
    }
}

async function saveSettings() {
    const saveButton = document.querySelector('.btn-primary');
    const form = document.getElementById('settingsForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
    const settings = {
        pagaBase: parseFloat(document.getElementById('pagaBase').value),
        pagaOraria: parseFloat(document.getElementById('pagaOraria').value),
        indennitaRientro: parseFloat(document.getElementById('indennitaRientro').value),
        indennitaPernottamento: parseFloat(document.getElementById('indennitaPernottamento').value),
        indennitaEstero: parseFloat(document.getElementById('indennitaEstero').value),
        aliquota: parseFloat(document.getElementById('aliquota').value)
    };
    
    try {
        await API.saveSettings(settings);
        showNotification('Impostazioni salvate con successo!', 'success');
        
        setTimeout(() => {
            window.location.href = 'stipendio.html';
        }, 1500);
    } catch (error) {
        showNotification('Errore nel salvataggio', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
        saveButton.textContent = 'Salva Impostazioni';
    }
}

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        const result = await API.checkSync();
        if (result.synced) {
            statusIcon.textContent = '☁️';
            statusIcon.classList.add('synced');
            statusText.textContent = 'Sincronizzato';
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

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

