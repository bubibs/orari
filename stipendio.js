// Salary page functionality
document.addEventListener('DOMContentLoaded', async () => {
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
    
    // Setup annual view button
    const viewAnnualBtn = document.getElementById('viewAnnualBtn');
    if (viewAnnualBtn) {
        viewAnnualBtn.addEventListener('click', toggleAnnualView);
    }
    
    // Make toggleAnnualView global for any inline handlers
    window.toggleAnnualView = toggleAnnualView;
});

let annualViewVisible = false;
let chartInstance = null;

function toggleAnnualView() {
    annualViewVisible = !annualViewVisible;
    const annualView = document.getElementById('annualView');
    const salarySummary = document.getElementById('salarySummary');
    const viewBtn = document.getElementById('viewAnnualBtn');
    
    if (!annualView || !salarySummary || !viewBtn) {
        console.error('Required elements not found for annual view toggle');
        return;
    }
    
    if (annualViewVisible) {
        annualView.style.display = 'block';
        salarySummary.style.display = 'none';
        viewBtn.textContent = 'Vista Mensile';
        // Wait a bit for the view to be visible before loading data
        setTimeout(() => {
            loadAnnualData();
        }, 150);
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
                
                // Get settings for this month/year (use settings from reports if available)
                let effectiveSettings = {};
                if (reports.length > 0 && reports[0].settingsSnapshot) {
                    // Use settings from the first report (they represent the settings used when the report was saved)
                    effectiveSettings = reports[0].settingsSnapshot;
                } else {
                    // Get current settings for this month/year
                    const settingsResult = await API.getSettingsMensili(month, year);
                    effectiveSettings = settingsResult.data || {};
                }
                
                const pagaBase = parseFloat(effectiveSettings.pagaBase) || 2000;
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
                
                // Net calculation according to CCNL Metalmeccanici
                const nettoCalcolo = calculateNettoCCNL(lordo);
                const netto = nettoCalcolo.netto;
                
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
        
        // Draw chart - wait a bit for canvas to be ready and ensure it's visible
        setTimeout(() => {
            const canvas = document.getElementById('salaryChart');
            if (canvas && canvas.offsetParent !== null) {
                drawChart(months, lordoData, nettoData);
            } else {
                // If canvas is not visible, try again after a longer delay
                setTimeout(() => {
                    drawChart(months, lordoData, nettoData);
                }, 300);
            }
        }, 300);
        
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
    try {
        const canvas = document.getElementById('salaryChart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }
        
        // Ensure canvas has dimensions
        const container = canvas.parentElement;
        let containerWidth = 600;
        if (container && container.clientWidth > 0) {
            containerWidth = container.clientWidth - 40;
        } else {
            containerWidth = Math.min(window.innerWidth - 60, 600);
        }
        
        // Set canvas dimensions
        canvas.width = containerWidth;
        canvas.height = 300;
        canvas.style.width = containerWidth + 'px';
        canvas.style.height = '300px';
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            console.error('Could not get 2d context');
            return;
        }
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Check if we have data
        if (!months || months.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Nessun dato disponibile', canvas.width / 2, canvas.height / 2);
            return;
        }
        
        const width = canvas.width;
        const height = canvas.height;
        const padding = 50;
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // Find max value
        const allValues = [];
        let i;
        for (i = 0; i < lordoData.length; i++) {
            if (lordoData[i] > 0) allValues.push(lordoData[i]);
        }
        for (i = 0; i < nettoData.length; i++) {
            if (nettoData[i] > 0) allValues.push(nettoData[i]);
        }
        const maxValue = allValues.length > 0 ? Math.max.apply(Math, allValues) : 1;
        const step = maxValue / 5;
        
        // Draw grid and labels
        ctx.strokeStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#555' : '#ddd';
        ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#aaa' : '#666';
        ctx.font = '12px Arial';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        for (i = 0; i <= 5; i++) {
            const y = padding + chartHeight - (i * chartHeight / 5);
            const value = Math.round(i * step);
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
            ctx.fillText('€' + value.toLocaleString('it-IT'), padding - 10, y);
        }
        
    // Draw bars - make them wider
    const barWidth = Math.min(chartWidth / months.length / 2.2, 25);
    const spacing = barWidth / 2;
    const totalBarWidth = barWidth * 2 + spacing;
    const startX = padding + (chartWidth - (totalBarWidth * months.length)) / 2;
        
        for (i = 0; i < months.length; i++) {
            const x = startX + i * totalBarWidth + spacing;
            
        // Lordo bar - wider
        const lordoHeight = lordoData[i] > 0 ? (lordoData[i] / maxValue) * chartHeight : 0;
        if (lordoHeight > 0) {
            ctx.fillStyle = '#0f3460';
            ctx.fillRect(x, padding + chartHeight - lordoHeight, barWidth, lordoHeight);
            
            // Value on bar - only if there's space
            if (lordoHeight > 20) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('€' + Math.round(lordoData[i]).toLocaleString('it-IT'), x + barWidth/2, padding + chartHeight - lordoHeight - 10);
            }
        }
        
        // Netto bar - wider
        const nettoHeight = nettoData[i] > 0 ? (nettoData[i] / maxValue) * chartHeight : 0;
        if (nettoHeight > 0) {
            ctx.fillStyle = '#4caf50';
            ctx.fillRect(x + barWidth, padding + chartHeight - nettoHeight, barWidth, nettoHeight);
            
            // Value on bar - only if there's space
            if (nettoHeight > 20) {
                ctx.fillStyle = '#fff';
                ctx.font = '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('€' + Math.round(nettoData[i]).toLocaleString('it-IT'), x + barWidth + barWidth/2, padding + chartHeight - nettoHeight - 10);
            }
        }
            
        // Month label - more readable
        ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#333';
        ctx.textAlign = 'center';
        ctx.font = 'bold 12px Arial';
        ctx.fillText(months[i], x + barWidth, height - 15);
        }
        
        // Legend
        const legendX = width - 130;
        ctx.fillStyle = '#0f3460';
        ctx.fillRect(legendX, 15, 15, 15);
        ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#333';
        ctx.textAlign = 'left';
        ctx.font = '12px Arial';
        ctx.fillText('Lordo', legendX + 20, 22);
        
        ctx.fillStyle = '#4caf50';
        ctx.fillRect(legendX, 35, 15, 15);
        ctx.fillStyle = window.matchMedia('(prefers-color-scheme: dark)').matches ? '#fff' : '#333';
        ctx.fillText('Netto', legendX + 20, 42);
    } catch (error) {
        console.error('Error drawing chart:', error);
        const canvas = document.getElementById('salaryChart');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#f00';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Errore nel disegno del grafico', canvas.width / 2, canvas.height / 2);
            }
        }
    }
}

function setupYearSelector() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) {
        console.error('yearSelect element not found');
        return;
    }
    
    // Clear existing options
    yearSelect.innerHTML = '';
    
    const currentYear = new Date().getFullYear();
    
    // Add years from 2020 to current year + 1
    for (let year = 2020; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) {
            option.selected = true;
        }
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
        
        // Get settings for this month/year
        const month = parseInt(document.getElementById('monthSelect').value);
        const year = parseInt(document.getElementById('yearSelect').value);
        const settingsResult = await API.getSettingsMensili(month, year);
        const settings = settingsResult.data || {};
        
        // Calculate salary
        const calcolo = await calculateSalary(data, settings);
        
        // Display summary
        displaySalarySummary(data, calcolo);
        
    } catch (error) {
        console.error('Error loading salary data:', error);
        summaryDiv.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei dati: ' + error.message + '</p>';
    }
}

// Calcola il netto secondo CCNL Metalmeccanici Industria
// IRPEF scaglioni 2024:
// - Fino a 15.000€: 23%
// - Da 15.001€ a 28.000€: 25%
// - Da 28.001€ a 50.000€: 35%
// - Oltre 50.000€: 43%
// INPS: 9.19% (dipendente)
// Addizionali regionali/comunali: ~1.5% (media)
function calculateNettoCCNL(lordoMensile) {
    // Calcolo INPS (9.19%)
    const inps = lordoMensile * 0.0919;
    
    // Imponibile IRPEF (dopo detrazione INPS)
    const imponibileIRPEF = lordoMensile - inps;
    const imponibileIRPEFAnnuo = imponibileIRPEF * 12;
    
    // Calcolo IRPEF progressivo per scaglioni
    let irpefAnnua = 0;
    let imponibileRimanente = imponibileIRPEFAnnuo;
    
    if (imponibileRimanente > 50000) {
        // Scaglione 4: oltre 50.000€ (43%)
        irpefAnnua += (imponibileRimanente - 50000) * 0.43;
        imponibileRimanente = 50000;
    }
    if (imponibileRimanente > 28000) {
        // Scaglione 3: da 28.001€ a 50.000€ (35%)
        irpefAnnua += (imponibileRimanente - 28000) * 0.35;
        imponibileRimanente = 28000;
    }
    if (imponibileRimanente > 15000) {
        // Scaglione 2: da 15.001€ a 28.000€ (25%)
        irpefAnnua += (imponibileRimanente - 15000) * 0.25;
        imponibileRimanente = 15000;
    }
    // Scaglione 1: fino a 15.000€ (23%)
    irpefAnnua += imponibileRimanente * 0.23;
    
    // IRPEF mensile
    const irpefMensile = irpefAnnua / 12;
    
    // Addizionali regionali e comunali (~1.5% media)
    const addizionali = imponibileIRPEF * 0.015;
    
    // Totale trattenute
    const trattenute = inps + irpefMensile + addizionali;
    
    // Netto
    const netto = lordoMensile - trattenute;
    
    return {
        netto: Math.max(0, netto),
        inps: inps,
        irpef: irpefMensile,
        addizionali: addizionali,
        trattenute: trattenute
    };
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
    
    // Get reports to count travel days accurately
    const month = parseInt(document.getElementById('monthSelect').value);
    const year = parseInt(document.getElementById('yearSelect').value);
    const reportsResult = await API.getReports({ month: month, year: year });
    const reports = reportsResult.data || [];
    
    // Get settings for this month/year (use settings from reports if available, otherwise current month settings)
    let effectiveSettings = settings;
    if (reports.length > 0 && reports[0].settingsSnapshot) {
        // Use settings from the first report (they represent the settings used when the report was saved)
        effectiveSettings = reports[0].settingsSnapshot;
    } else {
        // Get current settings for this month/year
        const settingsResult = await API.getSettingsMensili(month, year);
        effectiveSettings = settingsResult.data || settings;
    }
    
    // Use effective settings
    const pagaBase = parseFloat(effectiveSettings.pagaBase) || 2000;
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
    
    // Net calculation according to CCNL Metalmeccanici
    const nettoCalcolo = calculateNettoCCNL(lordo);
    
    return {
        pagaBase,
        valoreStraordinarie,
        valoreIndennitaRientro,
        valoreIndennitaPernottamento,
        valoreIndennitaEstero,
        lordo,
        netto: nettoCalcolo.netto,
        inps: nettoCalcolo.inps,
        irpef: nettoCalcolo.irpef,
        addizionali: nettoCalcolo.addizionali,
        trattenute: nettoCalcolo.trattenute,
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
            <span class="salary-label">INPS (9.19%)</span>
            <span class="salary-value">€ ${calcolo.inps.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">IRPEF</span>
            <span class="salary-value">€ ${calcolo.irpef.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Addizionali</span>
            <span class="salary-value">€ ${calcolo.addizionali.toFixed(2)}</span>
        </div>
        <div class="salary-row">
            <span class="salary-label">Totale trattenute</span>
            <span class="salary-value">€ ${calcolo.trattenute.toFixed(2)}</span>
        </div>
        <div class="salary-row salary-total">
            <span class="salary-label">Netto mensile</span>
            <span class="salary-value">€ ${calcolo.netto.toFixed(2)}</span>
        </div>
    `;
    
    summaryDiv.innerHTML = html;
}


