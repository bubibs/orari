// ASSICURATI CHE L'URL SIA ESATTAMENTE QUESTO
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

let mioGrafico = null;
let graficoAnnuale = null;

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    // Caricamento iniziale
    caricaTutto();
});

function caricaTutto() {
    updateSyncStatus('working'); // Diventa Giallo/Animato
    
    // Eseguiamo le chiamate in parallelo
    Promise.all([
        caricaTariffeCloud(),
        caricaDatiStorico(),
        caricaDatiAnnuali()
    ]).then(() => {
        // Se tutto va a buon fine l'ultimo stato sarà Success
    }).catch(err => {
        console.error("Errore caricamento:", err);
        updateSyncStatus('error');
    });
}

// GESTIONE COLORI ICONA CLOUD
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;

    // Reset classi
    icon.className = "fas"; 
    
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; // GIALLO: In corso
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; // VERDE: OK
    } else if (status === 'error') {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; // ROSSO: Errore
    }
}

function inizializzaFiltri() {
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel || !aSel) return;

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
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        if (result.success && result.data) {
            processaDati(result.data);
            updateSyncStatus('success');
        } else {
            resetCampi();
            updateSyncStatus('success');
        }
    } catch (e) {
        updateSyncStatus('error');
        throw e;
    }
}

function processaDati(dati) {
    let stats = { 
        sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, 
        s25: 0, s50: 0, lordoExtra: 0, indennita: 0, base: 0, tasse: 0 
    };

    dati.forEach(r => {
        const ore = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase();
        const ass = (r.assenza || "").toLowerCase();
        
        stats.base = r.paga_base; 
        stats.tasse = r.tasse;

        if (ass !== "" && ass !== "nessuna") {
            stats.assenze++;
        } else {
            let valInd = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; valInd = r.ind_rie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; valInd = r.ind_per; }
            else if (tipo.includes("estero")) { stats.estero++; valInd = r.ind_est; }
            
            stats.indennita += valInd;

            // Sabato (6) e Domenica (7) arrivano dal Server
            if (r.giorno_sett === 6 || r.giorno_sett === 7) { 
                stats.s50 += ore; 
                stats.lordoExtra += (ore * r.t50); 
            } else { 
                stats.s25 += ore; 
                stats.lordoExtra += (ore * r.t25); 
            }
        }
    });

    // Aggiornamento DOM
    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = stats.s50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = "€ " + stats.indennita.toFixed(2);

    const lordo = stats.base + stats.lordoExtra + stats.indennita;
    const netto = lordo * (1 - (stats.tasse / 100));

    document.getElementById('valore-lordo').innerText = "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits:2});
    document.getElementById('valore-netto').innerText = "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits:2});

    disegnaGraficoMensile(stats);
}

// ... (disegnaGraficoMensile e disegnaGraficoAnnuale rimangono uguali)

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
    } catch(e) { throw e; }
}

function resetCampi() {
    const ids = ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze"];
    ids.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = "0"; });
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
}
