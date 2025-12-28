// Salary page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Check cloud status
    await checkCloudStatus();
    
    // Setup year selector
    setupYearSelector();
    
    // Set current month/year
    const now = new Date();
    document.getElementById('monthSelect').value = now.getMonth() + 1;
    document.getElementById('yearSelect').value = now.getFullYear();
    
    // Load salary data
    await loadSalaryData();
    
    // Event listeners
    document.getElementById('monthSelect').addEventListener('change', loadSalaryData);
    document.getElementById('yearSelect').addEventListener('change', loadSalaryData);
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

function setupYearSelector() {
    const yearSelect = document.getElementById('yearSelect');
    const currentYear = new Date().getFullYear();
    
    // Add years from 2020 to current year + 1
    for (let year = 2020; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearSelect.appendChild(option);
    }
}

async function loadSalaryData() {
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const summaryDiv = document.getElementById('salarySummary');
    
    summaryDiv.innerHTML = '<p>Caricamento dati...</p>';
    
    try {
        const result = await API.getSalaryData(month, year);
        const data = result.data;
        const settings = await API.getSettings();
        
        // Calculate salary
        const calcolo = calculateSalary(data, settings);
        
        // Display summary
        displaySalarySummary(data, calcolo);
        
    } catch (error) {
        summaryDiv.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei dati</p>';
    }
}

function calculateSalary(data, settings) {
    const {
        giorniLavorati,
        giorniTrasferta,
        giorniAssenza,
        oreSede,
        oreTrasfertaRientro,
        oreTrasfertaPernottamento,
        oreTrasfertaEstero,
        oreStraordinarie
    } = data;
    
    // Base salary
    const pagaBase = parseFloat(settings.pagaBase) || 2000;
    const pagaOraria = parseFloat(settings.pagaOraria) || 12.5;
    
    // Overtime calculation (25% increase)
    const pagaOrariaMaggiorata = pagaOraria * 1.25;
    const valoreStraordinarie = oreStraordinarie * pagaOrariaMaggiorata;
    
    // Travel allowances
    const indennitaRientro = parseFloat(settings.indennitaRientro) || 15;
    const indennitaPernottamento = parseFloat(settings.indennitaPernottamento) || 50;
    const indennitaEstero = parseFloat(settings.indennitaEstero) || 100;
    
    // Count days for each travel type
    const reports = API.getLocalReports();
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    
    const filtered = reports.filter(r => {
        const reportDate = new Date(r.data);
        return reportDate.getMonth() === month - 1 && 
               reportDate.getFullYear() === year &&
               !r.assenza;
    });
    
    let giorniRientro = 0;
    let giorniPernottamento = 0;
    let giorniEstero = 0;
    
    filtered.forEach(report => {
        if (report.tipoLavoro === 'trasferta con rientro') {
            giorniRientro++;
        } else if (report.tipoLavoro === 'trasferta con pernottamento') {
            giorniPernottamento++;
        } else if (report.tipoLavoro === 'trasferta estero') {
            giorniEstero++;
        }
    });
    
    const valoreIndennitaRientro = giorniRientro * indennitaRientro;
    const valoreIndennitaPernottamento = giorniPernottamento * indennitaPernottamento;
    const valoreIndennitaEstero = giorniEstero * indennitaEstero;
    
    // Total gross
    const lordo = pagaBase + valoreStraordinarie + valoreIndennitaRientro + 
                  valoreIndennitaPernottamento + valoreIndennitaEstero;
    
    // Net calculation
    const aliquota = parseFloat(settings.aliquota) || 25;
    const tasse = lordo * (aliquota / 100);
    const netto = lordo - tasse;
    
    return {
        pagaBase,
        valoreStraordinarie,
        valoreIndennitaRientro,
        valoreIndennitaPernottamento,
        valoreIndennitaEstero,
        lordo,
        tasse,
        netto,
        giorniRientro,
        giorniPernottamento,
        giorniEstero
    };
}

function displaySalarySummary(data, calcolo) {
    const summaryDiv = document.getElementById('salarySummary');
    
    const html = `
        <h2>Riepilogo Mensile</h2>
        
        <div class="salary-row">
            <span class="salary-label">Giorni lavorati</span>
            <span class="salary-value">${data.giorniLavorati}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Giorni trasferta</span>
            <span class="salary-value">${data.giorniTrasferta}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Giorni assenza</span>
            <span class="salary-value">${data.giorniAssenza}</span>
        </div>
        
        <h3 style="margin-top: 20px; margin-bottom: 10px;">Ore lavorate</h3>
        <div class="salary-row">
            <span class="salary-label">Ore in sede</span>
            <span class="salary-value">${data.oreSede.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore trasferta con rientro</span>
            <span class="salary-value">${data.oreTrasfertaRientro.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore trasferta con pernottamento</span>
            <span class="salary-value">${data.oreTrasfertaPernottamento.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore trasferta estero</span>
            <span class="salary-value">${data.oreTrasfertaEstero.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore straordinarie</span>
            <span class="salary-value">${data.oreStraordinarie.toFixed(1)}</span>
        </div>
        
        <h3 style="margin-top: 20px; margin-bottom: 10px;">Calcolo Stipendio</h3>
        <div class="salary-row">
            <span class="salary-label">Paga base mensile</span>
            <span class="salary-value">€ ${calcolo.pagaBase.toFixed(2)}</span>
        </div>
        ${data.oreStraordinarie > 0 ? `
        <div class="salary-row">
            <span class="salary-label">Ore straordinarie (${data.oreStraordinarie.toFixed(1)}h × €${(calcolo.valoreStraordinarie / data.oreStraordinarie || 0).toFixed(2)})</span>
            <span class="salary-value">€ ${calcolo.valoreStraordinarie.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="salary-row">
            <span class="salary-label">Indennità trasferta rientro (${calcolo.giorniRientro} giorni)</span>
            <span class="salary-value">€ ${calcolo.valoreIndennitaRientro.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Indennità trasferta pernottamento (${calcolo.giorniPernottamento} giorni)</span>
            <span class="salary-value">€ ${calcolo.valoreIndennitaPernottamento.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Indennità trasferta estero (${calcolo.giorniEstero} giorni)</span>
            <span class="salary-value">€ ${calcolo.valoreIndennitaEstero.toFixed(2)}</span>
        </div>
        
        <div class="salary-row salary-total">
            <span class="salary-label">Lordo mensile</span>
            <span class="salary-value">€ ${calcolo.lordo.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Tasse (${((calcolo.tasse / calcolo.lordo) * 100).toFixed(1)}%)</span>
            <span class="salary-value">€ ${calcolo.tasse.toFixed(2)}</span>
        </div>
        <div class="salary-row salary-total">
            <span class="salary-label">Netto mensile</span>
            <span class="salary-value">€ ${calcolo.netto.toFixed(2)}</span>
        </div>
    `;
    
    summaryDiv.innerHTML = html;
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
        } else {
            statusIcon.textContent = '⚠️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
        }
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
    }
}

