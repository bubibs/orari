const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let mioGrafico = null;

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud(); // Carica i valori attuali nella modale
});

// 1. Configurazione Menu Filtri
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

// 2. Funzione Cerca
async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    const icon = document.getElementById('sync-icon');
    
    icon.className = "fas fa-sync fa-spin status-working";
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        
        if (result.data && result.data.length > 0) {
            processaDati(result.data);
            icon.className = "fas fa-cloud status-success";
        } else {
            resetCampi();
            icon.className = "fas fa-cloud status-success";
            alert("Nessun report trovato per questo periodo.");
        }
    } catch (e) {
        icon.className = "fas fa-exclamation-triangle status-error";
        alert("Errore di connessione.");
    }
}

// 3. Elaborazione Dati e Calcoli
function processaDati(dati) {
    let stats = { 
        sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, 
        s25: 0, s50: 0, lordoExtra: 0, indennitaTot: 0,
        pagaBase: 0, aliquota: 0
    };

    dati.forEach(r => {
        const oreStr = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || r.tipo || "").toLowerCase().trim();
        const assenza = (r.assenza || "nessuna").toLowerCase().trim();
        
        // Tariffe congelate salvate nel report (Colonne L-R)
        const t25 = parseFloat(r.t25) || 0;
        const t50 = parseFloat(r.t50) || 0;
        const iRie = parseFloat(r.ind_rie) || 0;
        const iPer = parseFloat(r.ind_per) || 0;
        const iEst = parseFloat(r.ind_est) || 0;
        stats.pagaBase = parseFloat(r.paga_base) || 0;
        stats.aliquota = parseFloat(r.tasse) || 0;

        // Gestione Data per capire se è Weekend
        const d = new Date(r.data);
        const giorno = d.getDay(); 

        if (assenza !== "nessuna" && assenza !== "") {
            stats.assenze++;
        } else {
            let indGiorno = 0;
            if (tipo.includes("sede")) {
                stats.sede++;
            } else if (tipo.includes("rientro")) {
                stats.rientro++;
                indGiorno = iRie;
            } else if (tipo.includes("pernottamento")) {
                stats.pernott++;
                indGiorno = iPer;
            } else if (tipo.includes("estero")) {
                stats.estero++;
                indGiorno = iEst;
            }

            let soldiStrGiorno = 0;
            if (giorno === 0 || giorno === 6) { // Sabato o Domenica
                stats.s50 += oreStr;
                soldiStrGiorno = oreStr * t50;
            } else {
                stats.s25 += oreStr;
                soldiStrGiorno = oreStr * t25;
            }
            stats.indennitaTot += indGiorno;
            stats.lordoExtra += (soldiStrGiorno + indGiorno);
        }
    });

    // Aggiornamento Interfaccia
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

    disegnaGrafico(stats);
}

// 4. Gestione Grafico
function disegnaGrafico(stats) {
    const canvas = document.getElementById('lavoroChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    if (mioGrafico) mioGrafico.destroy();

    mioGrafico = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Sede', 'Rientro', 'Pernott.', 'Estero'],
            datasets: [{
                data: [stats.sede, stats.rientro, stats.pernott, stats.estero],
                backgroundColor: ['#007AFF', '#34C759', '#FF9500', '#AF52DE'],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 } },
                x: { grid: { display: false } }
            }
        }
    });
}

// 5. Impostazioni Cloud
async function caricaTariffeCloud() {
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            document.getElementById('base-mensile').value = json.data.base;
            document.getElementById('tariffa-25').value = json.data.t25;
            document.getElementById('tariffa-50').value = json.data.t50;
            document.getElementById('ind-rientro').value = json.data.ind_rientro;
            document.getElementById('ind-pernott').value = json.data.ind_pernott;
            document.getElementById('ind-estero').value = json.data.ind_estero;
            document.getElementById('aliquota-tasse').value = json.data.tasse;
        }
    } catch(e) { console.error("Errore tariffe cloud"); }
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

    btn.disabled = true;
    btn.innerText = "SALVATAGGIO...";

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Impostazioni salvate!");
        toggleSettings();
    } catch (e) { alert("Errore salvataggio"); }
    finally { 
        btn.disabled = false; 
        btn.innerText = "SALVA SUL CLOUD"; 
    }
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function resetCampi() {
    ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze"].forEach(id => {
        document.getElementById(id).innerText = "0";
    });
    document.getElementById('val-25').innerText = "0 h";
    document.getElementById('val-50').innerText = "0 h";
    document.getElementById('val-indennita').innerText = "€ 0.00";
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
    if (mioGrafico) mioGrafico.destroy();
}
