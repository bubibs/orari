// Report page functionality
let editingReportId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check if editing
    const urlParams = new URLSearchParams(window.location.search);
    editingReportId = urlParams.get('id');
    
    // Check cloud status
    await checkCloudStatus();
    
    // Load contacts for autocomplete
    await loadContacts();
    
    // Set today's date as default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = today;
    
    // Set time inputs to 30-minute steps (already set in HTML, but ensure it's correct)
    const oraInizioInput = document.getElementById('oraInizio');
    const oraFineInput = document.getElementById('oraFine');
    oraInizioInput.setAttribute('step', '1800');
    oraFineInput.setAttribute('step', '1800');
    
    // Round to nearest 30 minutes when user selects a time
    oraInizioInput.addEventListener('change', function() {
        const time = this.value;
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const roundedMinutes = Math.round(minutes / 30) * 30;
            const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
            const finalHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;
            this.value = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
            calculateHours();
        }
    });
    
    oraFineInput.addEventListener('change', function() {
        const time = this.value;
        if (time) {
            const [hours, minutes] = time.split(':').map(Number);
            const roundedMinutes = Math.round(minutes / 30) * 30;
            const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
            const finalHours = roundedMinutes === 60 ? (hours + 1) % 24 : hours;
            this.value = `${String(finalHours).padStart(2, '0')}:${String(finalMinutes).padStart(2, '0')}`;
            calculateHours();
        }
    });
    
    // Setup event listeners
    setupEventListeners();
    
    // Load report if editing
    if (editingReportId) {
        await loadReport(editingReportId);
    }
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

function setupEventListeners() {
    const form = document.getElementById('reportForm');
    const tipoLavoro = document.getElementById('tipoLavoro');
    const oraInizio = document.getElementById('oraInizio');
    const oraFine = document.getElementById('oraFine');
    const pausaMensa = document.getElementById('pausaMensa');
    const assenza = document.getElementById('assenza');
    
    // Auto-fill for "in sede"
    tipoLavoro.addEventListener('change', () => {
        if (tipoLavoro.value === 'in sede') {
            oraInizio.value = '08:00';
            oraFine.value = '17:00';
            pausaMensa.checked = true;
            document.getElementById('luogoIntervento').value = 'Tecnosistem';
            calculateHours();
        }
    });
    
    // Calculate hours when times change
    oraInizio.addEventListener('change', calculateHours);
    oraFine.addEventListener('change', calculateHours);
    pausaMensa.addEventListener('change', calculateHours);
    
    // Disable time fields if assenza is selected
    assenza.addEventListener('change', () => {
        const hasAssenza = assenza.value !== '';
        oraInizio.disabled = hasAssenza;
        oraFine.disabled = hasAssenza;
        tipoLavoro.disabled = hasAssenza;
        if (!hasAssenza) {
            calculateHours();
        } else {
            document.getElementById('oreTotali').value = '';
            document.getElementById('oreStraordinarie').value = '';
        }
    });
    
    // Form submission
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveReport();
    });
}

function calculateHours() {
    const oraInizio = document.getElementById('oraInizio').value;
    const oraFine = document.getElementById('oraFine').value;
    const pausaMensa = document.getElementById('pausaMensa').checked;
    const data = document.getElementById('data').value;
    const assenza = document.getElementById('assenza').value;
    
    if (!oraInizio || !oraFine || assenza) {
        document.getElementById('oreTotali').value = '';
        document.getElementById('oreStraordinarie').value = '';
        return;
    }
    
    const start = new Date(`2000-01-01T${oraInizio}`);
    const end = new Date(`2000-01-01T${oraFine}`);
    
    if (end <= start) {
        // Assume next day
        end.setDate(end.getDate() + 1);
    }
    
    let diffHours = (end - start) / (1000 * 60 * 60);
    
    // Subtract lunch break if checked
    if (pausaMensa) {
        diffHours -= 1;
    }
    
    // Round to nearest 0.5
    diffHours = Math.round(diffHours * 2) / 2;
    
    document.getElementById('oreTotali').value = diffHours.toFixed(1);
    
    // Calculate overtime
    const reportDate = new Date(data);
    const dayOfWeek = reportDate.getDay(); // 0 = Sunday, 6 = Saturday
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    
    let straordinarie = 0;
    if (isWeekend) {
        // All hours are overtime on weekends
        straordinarie = diffHours;
    } else if (diffHours > 8) {
        // Hours over 8 are overtime
        straordinarie = diffHours - 8;
    }
    
    document.getElementById('oreStraordinarie').value = straordinarie.toFixed(1);
}

async function loadContacts() {
    try {
        const result = await API.getContacts();
        const datalist = document.getElementById('luoghiList');
        datalist.innerHTML = '';
        
        if (result.data && result.data.length > 0) {
            result.data.forEach(contact => {
                const option = document.createElement('option');
                option.value = contact.azienda;
                datalist.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading contacts:', error);
    }
}

async function loadReport(id) {
    try {
        const report = await API.getReportById(id);
        if (report) {
            document.getElementById('data').value = report.data || '';
            document.getElementById('tipoLavoro').value = report.tipoLavoro || '';
            document.getElementById('assenza').value = report.assenza || '';
            document.getElementById('oraInizio').value = report.oraInizio || '';
            document.getElementById('oraFine').value = report.oraFine || '';
            document.getElementById('pausaMensa').checked = report.pausaMensa || false;
            document.getElementById('luogoIntervento').value = report.luogoIntervento || '';
            document.getElementById('note').value = report.note || '';
            document.getElementById('oreTotali').value = report.oreTotali || '';
            document.getElementById('oreStraordinarie').value = report.oreStraordinarie || '';
            
            // Trigger change event for tipoLavoro if needed
            if (report.tipoLavoro) {
                document.getElementById('tipoLavoro').dispatchEvent(new Event('change'));
            }
        }
    } catch (error) {
        showNotification('Errore nel caricamento del report', 'error');
    }
}

async function saveReport() {
    const saveButton = document.getElementById('saveButton');
    const form = document.getElementById('reportForm');
    
    // Validate form
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Disable button and show loading
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
    const reportData = {
        data: document.getElementById('data').value,
        tipoLavoro: document.getElementById('tipoLavoro').value,
        assenza: document.getElementById('assenza').value || null,
        oraInizio: document.getElementById('oraInizio').value,
        oraFine: document.getElementById('oraFine').value,
        pausaMensa: document.getElementById('pausaMensa').checked,
        luogoIntervento: document.getElementById('luogoIntervento').value,
        note: document.getElementById('note').value,
        oreTotali: parseFloat(document.getElementById('oreTotali').value) || 0,
        oreStraordinarie: parseFloat(document.getElementById('oreStraordinarie').value) || 0
    };
    
    if (editingReportId) {
        reportData.id = editingReportId;
    }
    
    try {
        // Try cloud save first
        let result;
        if (editingReportId) {
            result = await API.updateReport(editingReportId, reportData);
        } else {
            result = await API.saveReport(reportData);
        }
        
        // Save contact if new location
        if (reportData.luogoIntervento && reportData.luogoIntervento !== 'Tecnosistem') {
            await saveContactIfNew(reportData.luogoIntervento);
        }
        
        showNotification('Report salvato con successo!', 'success');
        
        // Redirect after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);
        
    } catch (error) {
        showNotification('Errore nel salvataggio. Riprova.', 'error');
    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
        saveButton.textContent = 'Salva Report';
    }
}

async function saveContactIfNew(azienda) {
    try {
        const contacts = await API.getContacts();
        const exists = contacts.data.some(c => c.azienda.toLowerCase() === azienda.toLowerCase());
        
        if (!exists) {
            await API.saveContact({
                azienda: azienda,
                citta: '',
                via: '',
                referente: '',
                telefono: ''
            });
        }
    } catch (error) {
        console.error('Error saving contact:', error);
    }
}

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        const result = await API.checkSync();
        if (result.synced) {
            statusIcon.textContent = '✅';
            statusIcon.classList.add('synced');
            statusText.textContent = 'Sincronizzato';
            statusIcon.style.filter = 'none';
        } else {
            statusIcon.textContent = '☁️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
            statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
        }
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
        statusIcon.style.filter = 'none';
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

