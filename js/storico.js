const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let mioGrafico = null;
let graficoAnnuale = null;

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud();
    setTimeout(() => {
        caricaDatiStorico(); 
        caricaDatiAnnuali();  
    }, 500);
});

function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.className = "fas"; 
    switch(status) {
        case 'working': icon.classList.add('fa-sync', 'fa-spin-loading', 'status-working'); break;
        case 'success': icon.classList.add('fa-cloud', 'status-success'); break;
        case 'error': icon.classList.add('fa-exclamation-triangle', 'status-error'); break;
        default: icon.classList.add('fa-cloud');
    }
}

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

async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    updateSyncStatus('working');
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        if (result.data && result.data.length > 0) {
            processaDati(result.data);
            updateSyncStatus('success');
        } else {
            resetCampi();
            updateSyncStatus('success');
        }
    } catch (e) { updateSyncStatus('error'); }
}

function processaDati(dati) {
    let stats = { 
        sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, 
        s25: 0, s50: 0, lordoStraordinari: 0, indennitaTot: 0, 
        pagaBase: 0, aliquota: 0 
    };

    dati.forEach(r => {
        const oreStr = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase().trim();
        const assenza = (r.assenza || "").toLowerCase().trim();
        const gSett = r.giorno_sett; // Ricevuto da Server: 6=Sab, 7=Dom

        stats.pagaBase = r.paga_base;
        stats.aliquota = r.tasse;

        if (assenza !== "" && assenza !== "nessuna") {
            stats.assenze++;
        } else {
            let valInd = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; valInd = r.ind_rie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; valInd = r.ind_per; }
            else if (tipo.includes("estero")) { stats.estero++; valInd = r.ind_est; }
            
            stats.indennitaTot += valInd;

            // CALCOLO WEEKEND (Sabato o Domenica)
            if (gSett === 6 || gSett === 7) { 
                stats.s50 += oreStr; 
                stats.lordoStraordinari += (oreStr * r.t50); 
            } else { 
                stats.s25 += oreStr; 
                stats.lordoStraordinari += (oreStr * r.t25); 
            }
        }
    });

    // Aggiornamento UI
    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = stats.s50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = `€ ${stats.indennitaTot.toFixed(2)}`;

    const lordo = stats.pagaBase + stats.lordoStraordinari + stats.indennitaTot;
    const netto = lordo * (1 - (stats.aliquota / 100));

    document.getElementById('valore-lordo').innerText = `€ ${lordo.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;

    disegnaGraficoMensile(stats);
}

// ... restanti funzioni disegnaGraficoMensile, disegnaGraficoAnnuale, caricaTariffeCloud, salvaTariffeCloud, resetCampi uguali a prima ...
