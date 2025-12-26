// js/ui.js - GESTIONE INTERFACCIA, GRAFICI E PDF

let myChart = null;

// 1. NOTIFICHE (Stile originale)
function showNotification(message, type = 'success') {
    const note = document.getElementById('notification');
    note.textContent = message;
    note.className = 'notification'; // reset classi
    
    if (type === 'success') note.style.backgroundColor = 'var(--notification-success)';
    else if (type === 'error') note.style.backgroundColor = 'var(--notification-error)';
    else note.style.backgroundColor = 'var(--notification-warning)';
    
    note.style.display = 'block';
    setTimeout(() => { note.style.display = 'none'; }, 3000);
}

// 2. RENDER TABELLA REGISTRO
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Nessun dato presente</td></tr>';
        return;
    }

    data.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formattaData(entry.data)}</td>
            <td>${entry.inizio} - ${entry.fine}</td>
            <td>${entry.oreTotali.toFixed(2)}</td>
            <td>${(entry.str25 + entry.str50).toFixed(2)}</td>
            <td><span class="badge">${entry.tipo}</span></td>
            <td>${entry.luogo || '-'}</td>
            <td>
                <button onclick="deleteEntry(${index})" class="btn-action delete" title="Elimina">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 3. STATISTICHE E GRAFICO (Chart.js)
function updateStats(data) {
    const settings = getSettings();
    let lordoMese = 0;
    let oreStr = 0;

    // Filtra solo i dati del mese corrente per le statistiche rapide
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const monthlyData = data.filter(e => {
        const d = new Date(e.data);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    monthlyData.forEach(e => {
        oreStr += (e.str25 + e.str50);
        // Calcolo semplificato lordo (adattalo alla tua logica specifica se necessario)
        lordoMese += (e.str25 * settings.tariffaOver25) + (e.str50 * (settings.tariffaOver25 * 1.5));
    });

    document.getElementById('stat-lordo').textContent = `€ ${lordoMese.toFixed(2)}`;
    document.getElementById('stat-str').textContent = `${oreStr.toFixed(1)} h`;
    
    // Calcolo Netto Stimato (Lordo - Aliquota impostata)
    const netto = lordoMese * (1 - settings.aliquotaFiscale / 100);
    document.getElementById('stat-netto').textContent = `€ ${netto.toFixed(2)}`;

    renderChart(monthlyData);
}

function renderChart(monthlyData) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (myChart) myChart.destroy();

    const labels = monthlyData.map(e => formattaData(e.data)).reverse();
    const ore = monthlyData.map(e => e.oreTotali).reverse();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ore Lavorate',
                data: ore,
                borderColor: '#00a2e3',
                backgroundColor: 'rgba(0, 162, 227, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });
}

// 4. ESPORTAZIONE PDF (jsPDF + AutoTable)
async function exportToPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Riepilogo Ore Lavoro", 14, 20);
    doc.setFontSize(10);
    doc.text(`Generato il: ${new Date().toLocaleString()}`, 14, 28);

    const tableRows = data.map(e => [
        formattaData(e.data),
        `${e.inizio}-${e.fine}`,
        e.oreTotali.toFixed(2),
        (e.str25 + e.str50).toFixed(2),
        e.tipo,
        e.luogo
    ]);

    doc.autoTable({
        head: [['Data', 'Orario', 'Ore', 'Str.', 'Tipo', 'Luogo']],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillStyle: [0, 162, 227] }
    });

    doc.save(`Registro_Lavoro_${new Date().getMonth() + 1}.pdf`);
}

// Utility: Formatta data da YYYY-MM-DD a DD/MM/YYYY
function formattaData(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// 5. GESTIONE ACCORDION (Apri/Chiudi sezioni)
document.querySelectorAll('.card-header-toggle').forEach(header => {
    header.addEventListener('click', () => {
        const content = header.nextElementSibling;
        const icon = header.querySelector('.fa-chevron-down');
        
        if (content.style.display === 'none' || content.style.display === '') {
            content.style.display = 'block';
            icon.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
    });
});
