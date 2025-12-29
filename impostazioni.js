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
    
    // Paga base mensile form submission
    document.getElementById('pagaBaseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await savePagaBaseMensile();
    });
    
    // Set current year as default
    const currentYear = new Date().getFullYear();
    document.getElementById('pagaBaseYear').value = currentYear;
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('pagaBaseMonth').value = currentMonth;
    
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
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    // Prevent double click
    if (saveButton.disabled) {
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
    // Update status icon
    if (statusIcon) {
        statusIcon.textContent = '💾';
        statusIcon.style.animation = 'cloudPulse 1s ease-in-out infinite';
    }
    if (statusText) {
        statusText.textContent = 'Salvataggio...';
    }
    
    const settings = {
        pagaBase: parseFloat(document.getElementById('pagaBase').value),
        pagaOraria: parseFloat(document.getElementById('pagaOraria').value),
        indennitaRientro: parseFloat(document.getElementById('indennitaRientro').value),
        indennitaPernottamento: parseFloat(document.getElementById('indennitaPernottamento').value),
        indennitaEstero: parseFloat(document.getElementById('indennitaEstero').value),
        aliquota: parseFloat(document.getElementById('aliquota').value)
    };
    
    try {
        const result = await API.saveSettings(settings);
        
        if (!result || !result.success) {
            throw new Error(result?.error || 'Errore nel salvataggio');
        }
        
        // Success
        if (statusIcon) {
            statusIcon.textContent = '💾';
            statusIcon.style.animation = 'none';
        }
        if (statusText) {
            statusText.textContent = 'Salvato';
        }
        
        showNotification('Impostazioni salvate con successo!', 'success');
        
        setTimeout(() => {
            window.location.href = 'stipendio.html';
        }, 1500);
    } catch (error) {
        console.error('Save error:', error);
        
        // Error
        if (statusIcon) {
            statusIcon.textContent = '💾';
            statusIcon.style.animation = 'none';
        }
        if (statusText) {
            statusText.textContent = 'Locale';
        }
        
        showNotification('Errore nel salvataggio: ' + (error.message || 'Errore sconosciuto'), 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
        saveButton.textContent = 'Salva Impostazioni';
    }
}


async function savePagaBaseMensile() {
    const form = document.getElementById('pagaBaseForm');
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    const month = parseInt(document.getElementById('pagaBaseMonth').value);
    const year = parseInt(document.getElementById('pagaBaseYear').value);
    const pagaBase = parseFloat(document.getElementById('pagaBaseValue').value);
    
    try {
        const result = await API.savePagaBaseMensile(month, year, pagaBase);
        if (result.success) {
            showNotification(`Paga base salvata per ${month}/${year}!`, 'success');
            document.getElementById('pagaBaseValue').value = '';
        } else {
            showNotification('Errore nel salvataggio: ' + (result.error || 'Errore sconosciuto'), 'error');
        }
    } catch (error) {
        console.error('Save error:', error);
        showNotification('Errore nel salvataggio', 'error');
    }
}

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    // Always synced for local storage
    if (statusIcon) {
        statusIcon.textContent = '💾';
        statusIcon.classList.add('synced');
    }
    if (statusText) {
        statusText.textContent = 'Salvataggio Locale';
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

