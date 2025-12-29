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
    document.getElementById('monthSelect').addEventListener('change', () => {
        if (!annualViewVisible) {
            loadSalaryData();
        }
    });
    document.getElementById('yearSelect').addEventListener('change', () => {
        if (annualViewVisible) {
            loadAnnualData();
        } else {
            loadSalaryData();
        }
    });
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

let annualViewVisible = false;
let chartInstance = null;

function toggleAnnualView() {
    annualViewVisible = !annualViewVisible;
    const annualView = document.getElementById('annualView');
    const salarySummary = document.getElementById('salarySummary');
    const viewBtn = document.getElementById('viewAnnualBtn');
    
    if (annualViewVisible) {
        annualView.style.display = 'block';
        salarySummary.style.display = 'none';
        viewBtn.textContent = 'Vista Mensile';
        // Wait a bit for the view to be visible before loading data
        setTimeout(() => {
            loadAnnualData();
        }, 100);
    } else {
        annualView.style.display = 'none';
        salarySummary.style.display = 'block';
        viewBtn.textContent = 'Vista Annuale';
    }
}

async function loadAnnualData() {
    const year = parseInt(document.getElementById('yearSelect').value);
    const annualSummary = document.getElementById('annualSummary');
    const selectedYear = document.getElementById('selectedYear');
    const canvas = document.getElementById('salaryChart');
    
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    selectedYear.textContent = year;
    annualSummary.innerHTML = '<p>Caricamento dati annuali...</p>';
    
    // Set canvas size immediately
    const container = canvas.parentElement;
    if (container && container.clientWidth > 0) {
        const containerWidth = container.clientWidth;
        canvas.width = containerWidth - 40;
        canvas.height = 300;
    } else {
        canvas.width = Math.min(window.innerWidth - 60, 600);
        canvas.height = 300;
    }
    canvas.style.width = canvas.width + 'px';
    canvas.style.height = canvas.height + 'px';
    
    try {
        const settings = await API.getSettings();
        const months = [];
        const lordoData = [];
        const nettoData = [];
        let totalLordo = 0;
        let totalNetto = 0;
        
        for (let month = 1; month <= 12; month++) {
            const result = await API.getSalaryData(month, year);
            if (result.success && result.data) {
                const data = result.data;
                const reportsResult = await API.getReports({ month: month, year: year });
                const reports = reportsResult.data || [];
                
                // Get effective settings
                let effectiveSettings = settings;
                if (reports.length > 0 && reports[0].settingsSnapshot) {
                    effectiveSettings = reports[0].settingsSnapshot;
                }
                
                // Get paga base for this month
                const pagaBaseMensile = await API.getPagaBaseMensile(month, year);
                const pagaBase = pagaBaseMensile || parseFloat(effectiveSettings.pagaBase) || 2000;
                const pagaOraria = parseFloat(effectiveSettings.pagaOraria) || 12.5;
                const pagaOrariaMaggiorata = pagaOraria * 1.25;
                const valoreStraordinarie = data.oreStraordinarie * pagaOrariaMaggiorata;
                
                const indennitaRientro = parseFloat(effectiveSettings.indennitaRientro) || 15;
                const indennitaPernottamento = parseFloat(effectiveSettings.indennitaPernottamento) || 50;
                const indennitaEstero = parseFloat(effectiveSettings.indennitaEstero) || 100;
                
                let giorniRientro = 0;
                let giorniPernottamento = 0;
                let giorniEstero = 0;
                
                reports.forEach(report => {
                    if (!report.assenza) {
                        if (report.tipoLavoro === 'trasferta con rientro') {
                            giorniRientro++;
                        } else if (report.tipoLavoro === 'trasferta con pernottamento') {
                            giorniPernottamento++;
                        } else if (report.tipoLavoro === 'trasferta estero') {
                            giorniEstero++;
                        }
                    }
                });
                
                const valoreIndennitaRientro = giorniRientro * indennitaRientro;
                const valoreIndennitaPernottamento = giorniPernottamento * indennitaPernottamento;
                const valoreIndennitaEstero = giorniEstero * indennitaEstero;
                
                const lordo = pagaBase + valoreStraordinarie + valoreIndennitaRientro + 
                              valoreIndennitaPernottamento + valoreIndennitaEstero;
                
                const aliquota = parseFloat(effectiveSettings.aliquota) || 25;
                const tasse = lordo * (aliquota / 100);
                const netto = lordo - tasse;
                
                const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
                months.push(monthNames[month - 1]);
                lordoData.push(Math.round(lordo * 100) / 100);
                nettoData.push(Math.round(netto * 100) / 100);
                totalLordo += lordo;
                totalNetto += netto;
            } else {
                const monthNames = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
                months.push(monthNames[month - 1]);
                lordoData.push(0);
                nettoData.push(0);
            }
        }
        
        // Draw chart - wait a bit for canvas to be ready
        setTimeout(() => {
            drawChart(months, lordoData, nettoData);
        }, 200);
        
        // Display summary
        annualSummary.innerHTML = `
            <div class="salary-total" style="margin-top: 20px;">
                <div class="salary-row">
                    <span class="salary-label">Totale Lordo Annuale</span>
                    <span class="salary-value" style="color: var(--accent-color);">€${Math.round(totalLordo * 100) / 100}</span>
                </div>
                <div class="salary-row">
                    <span class="salary-label">Totale Netto Annuale</span>
                    <span class="salary-value" style="color: var(--success-color);">€${Math.round(totalNetto * 100) / 100}</span>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Error loading annual data:', error);
        annualSummary.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei dati annuali</p>';
    }
}

function drawChart(months, lordoData, nettoData) {
    const canvas = document.getElementById('salaryChart');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    // Ensure canvas has dimensions
    if (canvas.width === 0 || canvas.height === 0) {
        const container = canvas.parentElement;
        if (container) {
            const containerWidth = container.clientWidth || Math.min(window.innerWidth - 60, 600);
            canvas.width = containerWidth - 40;
            canvas.height = 300;
        } else {
            canvas.width = Math.min(window.innerWidth - 60, 600);
            canvas.height = 300;
        }
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2d context');
        return;
    }
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const width = canvas.width;
    const height = canvas.height;
    const padding = 50;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    // Find max value
    const allValues = [...lordoData, ...nettoData].filter(v => v > 0);
    const maxValue = allValues.length > 0 ? Math.max(...allValues) : 1;
    const step = maxValue / 5;
    
    // Draw grid and labels
    ctx.strokeStyle = '#ddd';
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 5; i++) {
        const y = padding + chartHeight - (i * chartHeight / 5);
        const value = Math.round(i * step);
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(width - padding, y);
        ctx.stroke();
        ctx.fillText('€' + value.toLocaleString('it-IT'), padding - 10, y);
    }
    
    // Draw bars
    const barWidth = Math.min(chartWidth / months.length / 2.5, 20);
    const spacing = barWidth / 2;
    const totalBarWidth = barWidth * 2 + spacing;
    const startX = padding + (chartWidth - (totalBarWidth * months.length)) / 2;
    
    months.forEach((month, index) => {
        const x = startX + index * totalBarWidth + spacing;
        
        // Lordo bar
        const lordoHeight = lordoData[index] > 0 ? (lordoData[index] / maxValue) * chartHeight : 0;
        if (lordoHeight > 0) {
            ctx.fillStyle = '#0f3460';
            ctx.fillRect(x, padding + chartHeight - lordoHeight, barWidth, lordoHeight);
            
            // Value on bar
            ctx.fillStyle = '#fff';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('€' + Math.round(lordoData[index]).toLocaleString('it-IT'), x + barWidth/2, padding + chartHeight - lordoHeight - 8);
        }
        
        // Netto bar
        const nettoHeight = nettoData[index] > 0 ? (nettoData[index] / maxValue) * chartHeight : 0;
        if (nettoHeight > 0) {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(x + barWidth, padding + chartHeight - nettoHeight, barWidth, nettoHeight);
            
            // Value on bar
            ctx.fillStyle = '#fff';
            ctx.font = '9px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('€' + Math.round(nettoData[index]).toLocaleString('it-IT'), x + barWidth + barWidth/2, padding + chartHeight - nettoHeight - 8);
        }
        
        // Month label
        ctx.fillStyle = '#333';
        ctx.textAlign = 'center';
        ctx.font = '11px Arial';
        ctx.fillText(month, x + barWidth, height - 20);
    });
    
    // Legend
    const legendX = width - 130;
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(legendX, 15, 15, 15);
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left';
    ctx.font = '12px Arial';
    ctx.fillText('Lordo', legendX + 20, 22);
    
    ctx.fillStyle = '#4caf50';
    ctx.fillRect(legendX, 35, 15, 15);
    ctx.fillStyle = '#333';
    ctx.fillText('Netto', legendX + 20, 42);
}

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
        if (!result.success) {
            throw new Error(result.error || 'Errore nel caricamento');
        }
        const data = result.data;
        const settings = await API.getSettings();
        
        // Calculate salary
        const calcolo = await calculateSalary(data, settings);
        
        // Display summary
        displaySalarySummary(data, calcolo);
        
    } catch (error) {
        console.error('Error loading salary data:', error);
        summaryDiv.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei dati: ' + error.message + '</p>';
    }
}

async function calculateSalary(data, settings) {
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
    
    // Get reports to count travel days accurately and get settings from reports
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const reportsResult = await API.getReports({ month: month, year: year });
    const reports = reportsResult.data || [];
    
    // Use settings from first report if available, otherwise use current settings
    let effectiveSettings = settings;
    if (reports.length > 0 && reports[0].settingsSnapshot) {
        effectiveSettings = reports[0].settingsSnapshot;
    }
    
    // Get paga base for this month/year
    const pagaBaseMensile = await API.getPagaBaseMensile(month, year);
    const pagaBase = pagaBaseMensile || parseFloat(effectiveSettings.pagaBase) || 2000;
    const pagaOraria = parseFloat(effectiveSettings.pagaOraria) || 12.5;
    
    // Overtime calculation (25% increase)
    const pagaOrariaMaggiorata = pagaOraria * 1.25;
    const valoreStraordinarie = oreStraordinarie * pagaOrariaMaggiorata;
    
    // Travel allowances
    const indennitaRientro = parseFloat(effectiveSettings.indennitaRientro) || 15;
    const indennitaPernottamento = parseFloat(effectiveSettings.indennitaPernottamento) || 50;
    const indennitaEstero = parseFloat(effectiveSettings.indennitaEstero) || 100;
    
    let giorniRientro = 0;
    let giorniPernottamento = 0;
    let giorniEstero = 0;
    
    reports.forEach(report => {
        if (!report.assenza) {
            if (report.tipoLavoro === 'trasferta con rientro') {
                giorniRientro++;
            } else if (report.tipoLavoro === 'trasferta con pernottamento') {
                giorniPernottamento++;
            } else if (report.tipoLavoro === 'trasferta estero') {
                giorniEstero++;
            }
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
            <span class="salary-label">Ore trasf. rientro</span>
            <span class="salary-value">${data.oreTrasfertaRientro.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore trasf. pernott.</span>
            <span class="salary-value">${data.oreTrasfertaPernottamento.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore trasf. estero</span>
            <span class="salary-value">${data.oreTrasfertaEstero.toFixed(1)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ore straordinarie</span>
            <span class="salary-value">${data.oreStraordinarie.toFixed(1)}</span>
        </div>
        
        <h3 style="margin-top: 20px; margin-bottom: 10px;">Calcolo Stipendio</h3>
        <div class="salary-row">
            <span class="salary-label">Paga base</span>
            <span class="salary-value">€ ${calcolo.pagaBase.toFixed(2)}</span>
        </div>
        ${data.oreStraordinarie > 0 ? `
        <div class="salary-row">
            <span class="salary-label">Ore str. (${data.oreStraordinarie.toFixed(1)}h)</span>
            <span class="salary-value">€ ${calcolo.valoreStraordinarie.toFixed(2)}</span>
        </div>
        ` : ''}
        <div class="salary-row">
            <span class="salary-label">Ind. rientro (${calcolo.giorniRientro}g)</span>
            <span class="salary-value">€ ${calcolo.valoreIndennitaRientro.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ind. pernott. (${calcolo.giorniPernottamento}g)</span>
            <span class="salary-value">€ ${calcolo.valoreIndennitaPernottamento.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Ind. estero (${calcolo.giorniEstero}g)</span>
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


