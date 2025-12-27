const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let mioGrafico = null;
let graficoAnnuale = null;

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud();
    setTimeout(() => {
        caricaDatiStorico(); // Carica il mese
        caricaDatiAnnuali();  // Carica l'anno
    }, 500);
});

function inizializzaFiltri() {
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    const ora = new Date();
    
    mSel.innerHTML = "";
    mesi.forEach((m, i) => {
        let opt = new Option(m, i + 1);
        if(i === ora.getMonth()) opt.selected = true;
        mSel.add(opt);
    });

    aSel.innerHTML = "";
    for(let a = ora.getFullYear(); a >= 2024; a--) {
        aSel.add(new Option(a, a));
    }
}

// CARICA DATI MESE SINGOLO
async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    const icon = document.getElementById('sync-icon');
    if(icon) icon.className = "fas fa-sync fa-spin status-working";
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        if (result.data && result.data.length > 0) {
            processaDati(result.data);
            if(icon) icon.className = "fas fa-cloud status-success";
        } else {
            resetCampi();
            if(icon) icon.className = "fas fa-cloud status-success";
        }
    } catch (e) {
        if(icon) icon.className = "fas fa-exclamation-triangle status-error";
    }
}

// NUOVA FUNZIONE: CARICA DATI DI TUTTO L'ANNO
async function caricaDatiAnnuali() {
    const anno = document.getElementById('filtro-anno').value;
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_annuale&anno=${anno}`);
        const result = await response.json();
        if (result.success) {
            disegnaGraficoAnnuale(result.data);
        }
    } catch (e) { console.error("Errore dati annuali", e); }
}

function processaDati(dati) {
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0, lordoExtra: 0, indennitaTot: 0, pagaBase: 0, aliquota: 0 };

    dati.forEach(r => {
        const oreStr = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase().trim();
        const assenza = (r.assenza || "nessuna").toLowerCase().trim();
        const t25 = parseFloat(r.t25) || 0;
        const t50 = parseFloat(r.t50) || 0;
        const iRie = parseFloat(r.ind_rie) || 0;
        const iPer = parseFloat(r.ind_per) || 0;
        const iEst = parseFloat(r.ind_est) || 0;
        stats.pagaBase = parseFloat(r.paga_base) || 0;
        stats.aliquota = parseFloat(r.tasse) || 0;

        const dataPezzi = r.data.split("-");
        const d = new Date(dataPezzi[0], dataPezzi[1]-1, dataPezzi[2]);
        const giorno = d.getDay(); 

        if (assenza !== "nessuna" && assenza !== "") {
            stats.assenze++;
        } else {
            let ind = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; ind = iRie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; ind = iPer; }
            else if (tipo.includes("estero")) { stats.estero++; ind = iEst; }

            if (giorno === 0 || giorno === 6) { 
                stats.s50 += oreStr; 
                stats.lordoExtra += (oreStr * t50); 
            } else { 
                stats.s25 += oreStr; 
                stats.lordoExtra += (oreStr * t25); 
            }
            stats.indennitaTot += ind;
            stats.lordoExtra += ind;
        }
    });

    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = stats.s50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = `€ ${stats.indennitaTot.toFixed(2)}`;

    const lordo = stats.lordoExtra + stats.pagaBase;
    const netto = lordo * (1 - (stats.aliquota / 100));
    document.getElementById('valore-lordo').innerText = `€ ${lordo.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;

    disegnaGraficoMensile(stats);
}

function disegnaGraficoMensile(stats) {
    const ctx = document.getElementById('lavoroChart').getContext('2d');
    if (mioGrafico) mioGrafico.destroy();
    mioGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sede', 'Rientro', 'Pernott.', 'Estero', 'Assenze'],
            datasets: [{
                data: [stats.sede, stats.rientro, stats.pernott, stats.estero, stats.assenze],
                backgroundColor: ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30'],
                borderRadius: 8
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
}

// DISEGNA IL NUOVO GRAFICO ANNUALE
function disegnaGraficoAnnuale(dataLorda) {
    const ctx = document.getElementById('annualeChart').getContext('2d');
    if (graficoAnnuale) graficoAnnuale.destroy();
    
    graficoAnnuale = new Chart(ctx, {
        type: 'line', // Linea è più chiara per l'andamento annuale
        data: {
            labels: ['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'],
            datasets: [{
                label: 'Lordo (€)',
                data: dataLorda,
                borderColor: '#007AFF',
                backgroundColor: 'rgba(0, 122, 255, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, ticks: { callback: value => '€' + value } }
            }
        }
    });
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

async function caricaTariffeCloud() {
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            document.getElementById('base-mensile').value = json.data.base || 0;
            document.getElementById('tariffa-25').value = json.data.t25 || 0;
            document.getElementById('tariffa-50').value = json.data.t50 || 0;
            document.getElementById('ind-rientro').value = json.data.ind_rientro || 0;
            document.getElementById('ind-pernott').value = json.data.ind_pernott || 0;
            document.getElementById('ind-estero').value = json.data.ind_estero || 0;
            document.getElementById('aliquota-tasse').value = json.data.tasse || 0;
        }
    } catch(e) {}
}

async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    const settings = {
        azione: "salva_impostazioni",
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        ind_rientro: document.getElementById('ind-rientro').value,
        ind_pernott: document.getElementById('ind-pernott').value,
        ind_estero: document.getElementById('ind-estero').value,
        tasse: document.getElementById('aliquota-tasse').value
    };
    btn.disabled = true; btn.innerText = "SALVATAGGIO...";
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Impostazioni salvate!");
        toggleSettings();
    } catch (e) { alert("Errore"); }
    finally { btn.disabled = false; btn.innerText = "SALVA SUL CLOUD"; }
}

function resetCampi() {
    ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze"].forEach(id => document.getElementById(id).innerText = "0");
    document.getElementById('val-indennita').innerText = "€ 0.00";
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
    if (mioGrafico) mioGrafico.destroy();
}
