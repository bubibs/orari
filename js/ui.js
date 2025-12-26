// js/ui.js

// 1. Notifiche a comparsa
function showNotification(message, type = 'success') {
    const note = document.getElementById('notification');
    note.textContent = message;
    note.style.display = 'block';
    note.style.backgroundColor = type === 'success' ? 'var(--notification-success)' : 'var(--notification-error)';
    
    setTimeout(() => { note.style.display = 'none'; }, 3000);
}

// 2. Disegna la tabella del registro
function renderTable(data) {
    const tbody = document.getElementById('table-body');
    tbody.innerHTML = '';

    data.forEach((entry, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${entry.data}</td>
            <td>${entry.inizio} - ${entry.fine}</td>
            <td>${entry.oreTotali}</td>
            <td>${(entry.str25 + entry.str50).toFixed(1)}</td>
            <td>${entry.tipo}</td>
            <td>${entry.luogo}</td>
            <td>
                <button onclick="deleteEntry(${index})" class="btn-delete"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 3. Aggiorna i box delle statistiche e il grafico
let myChart = null;
function updateStats(data) {
    const settings = getSettings();
    let lordoMese = 0;
    let oreStr = 0;

    data.forEach(e => {
        oreStr += (e.str25 + e.str50);
        // Calcolo semplificato lordo (Base + Straordinari + Diarie)
        lordoMese += (e.str25 * settings.tariffaOver25) + (e.str50 * settings.tariffaOver50);
        if(e.tipo === 'Trasferta Rientro') lordoMese += settings.diariaRientro;
    });

    const netto = stimaNetto(lordoMese + (settings.baseLorda / 20 * data.length), settings.aliquotaFiscale);

    document.getElementById('stat-lordo').textContent = `€ ${lordoMese.toFixed(2)}`;
    document.getElementById('stat-netto').textContent = `€ ${netto.toFixed(2)}`;
    document.getElementById('stat-str').textContent = `${oreStr.toFixed(1)} h`;

    renderChart(data);
}

function renderChart(data) {
    const ctx = document.getElementById('monthlyChart').getContext('2d');
    if (myChart) myChart.destroy();

    // Raggruppa ore per giorno per il grafico
    const labels = data.map(e => e.data).reverse();
    const values = data.map(e => e.oreTotali).reverse();

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ore Lavorate',
                data: values,
                borderColor: '#00a2e3',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(0, 162, 227, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// 4. Generazione PDF (usando jsPDF e autoTable)
function exportToPDF(data) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    doc.text("Registro Lavoro - Riepilogo Mensile", 14, 15);
    
    const tableData = data.map(e => [e.data, `${e.inizio}-${e.fine}`, e.oreTotali, e.tipo, e.luogo]);
    
    doc.autoTable({
        head: [['Data', 'Orario', 'Ore', 'Tipo', 'Luogo']],
        body: tableData,
        startY: 25
    });
    
    doc.save(`Registro_Lavoro_${new Date().toISOString().slice(0,7)}.pdf`);
}