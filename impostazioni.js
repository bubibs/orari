// Settings page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Check cloud status
    await checkCloudStatus();
    
    // Set current year/month as default
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    document.getElementById('settingsYear').value = currentYear;
    document.getElementById('settingsMonth').value = currentMonth;
    
    // Load settings for current month/year
    await loadSettings();
    
    // Form submission
    document.getElementById('settingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });
    
    // Reload settings when month/year changes
    document.getElementById('settingsMonth').addEventListener('change', async () => {
        await loadSettings();
    });
    document.getElementById('settingsYear').addEventListener('change', async () => {
        await loadSettings();
    });
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

async function loadSettings() {
    try {
        const month = parseInt(document.getElementById('settingsMonth').value);
        const year = parseInt(document.getElementById('settingsYear').value);
        
        // Get settings for this month/year
        const settingsResult = await API.getSettingsMensili(month, year);
        const settings = settingsResult.data || {};
        
        // Fill form with settings
        document.getElementById('pagaBase').value = settings.pagaBase || 2000;
        document.getElementById('pagaOraria').value = settings.pagaOraria || 12.5;
        document.getElementById('indennitaRientro').value = settings.indennitaRientro || 15;
        document.getElementById('indennitaPernottamento').value = settings.indennitaPernottamento || 50;
        document.getElementById('indennitaEstero').value = settings.indennitaEstero || 100;
    } catch (error) {
        console.error('Error loading settings:', error);
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
    
    const month = parseInt(document.getElementById('settingsMonth').value);
    const year = parseInt(document.getElementById('settingsYear').value);
    
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
        indennitaEstero: parseFloat(document.getElementById('indennitaEstero').value)
    };
    
    try {
        const result = await API.saveSettingsMensili(month, year, settings);
        
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
        
        const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 
                           'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
        showNotification(`Impostazioni salvate per ${monthNames[month - 1]} ${year}!`, 'success');
        
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
        saveButton.textContent = 'Salva Impostazioni Mensili';
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

