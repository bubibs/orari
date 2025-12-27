// 1. URL CORRETTO (Verificato dal tuo messaggio precedente)
const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

// Variabili globali per i grafici
let mioGrafico = null;
let graficoAnnuale = null;

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM caricato, avvio procedure...");
    inizializzaFiltri();
    // Ritardo minimo per assicurarsi che tutto sia pronto
    setTimeout(caricaTutto, 500);
});

async function caricaTutto() {
    console.log("Inizio sincronizzazione cloud...");
    updateSyncStatus('working');
    
    try {
        // Proviamo prima a leggere le impostazioni
        await caricaTariffeCloud();
        // Poi carichiamo lo storico
        await caricaDatiStorico();
        
        // Se arriviamo qui, è andata bene
        updateSyncStatus('success');
    } catch (error) {
        console.error("Errore JS nel processo di caricamento:", error);
        updateSyncStatus('error');
    }
}

// GESTIONE ICONA CLOUD CON COLORI FORZATI
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;

    icon.className = "fas"; // Reset
    if (status === 'working') {
        icon.classList.add('fa-cloud', 'fa-spin');
        icon.style.color = "orange";
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759";
    } else if (status === 'error') {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30";
    }
}

async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    
    // FETCH CON PARAMETRI
    const urlCompleto = `${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`;
    const response = await fetch(urlCompleto);
    const result = await response.json();
    
    if (result.success && result.data) {
        processaDati(result.data);
        // Carichiamo l'annuale solo se lo storico è OK
        caricaDatiAnnuali();
    } else {
        console.warn("Nessun dato trovato per questo mese.");
        resetCampi();
    }
}

function processaDati(dati) {
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0, lordoExtra: 0, ind: 0, base: 0, tasse: 0 };

    dati.forEach(r => {
        const ore = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase();
        const ass = (r.assenza || "").toLowerCase();
        
        stats.base = r.paga_base || 0; 
        stats.tasse = r.tasse || 0;

        if (ass !== "" && ass !== "nessuna") {
            stats.assenze++;
        } else {
            let v = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; v = r.ind_rie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; v = r.ind_per; }
            else if (tipo.includes("estero")) { stats.estero++; v = r.ind_est; }
            
            stats.ind += (parseFloat(v) || 0);
            
            // Sabato/Domenica inviati dal server
            if (r.giorno_sett === 6 || r.giorno_sett === 7) { 
                stats.s50 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t50) || 0)); 
            } else { 
                stats.s25 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t25) || 0)); 
            }
        }
    });

    // SCRITTURA SICURA NEL DOM
    const scrivi = (id, val) => { if(document.getElementById(id)) document.getElementById(id).innerText = val; };
    
    scrivi('ore-sede', stats.sede);
    scrivi('ore-rientro', stats.rientro);
    scrivi('ore-pernott', stats.pernott);
    scrivi('ore-estero', stats.estero);
    scrivi('ore-assenze', stats.assenze);
    scrivi('val-25', stats.s25.toFixed(1) + " h");
    scrivi('val-50', stats.s50.toFixed(1) + " h");
    scrivi('val-indennita', "€ " + stats.ind.toFixed(2));

    const lordo = stats.base + stats.lordoExtra + stats.ind;
    const netto = lordo * (1 - (stats.tasse / 100));

    scrivi('valore-lordo', "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits: 2}));
    scrivi('valore-netto', "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits: 2}));

    // Disegna il grafico solo se la funzione esiste
    if (typeof disegnaGraficoMensile === "function") disegnaGraficoMensile(stats);
}

// Altre funzioni rimangono invariate ma avvolte in try/catch
async function caricaTariffeCloud() {
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            const d = json.data;
            const imp = { 'base-mensile': d.base, 'tariffa-25': d.t25, 'tariffa-50': d.t50, 'ind-rientro': d.ind_rientro, 'ind-pernott': d.ind_pernott, 'ind-estero': d.ind_estero, 'aliquota-tasse': d.tasse };
            for (let id in imp) { if(document.getElementById(id)) document.getElementById(id).value = imp[id]; }
        }
    } catch(e) { console.error("Errore tariffe:", e); }
}

function inizializzaFiltri() {
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel || !aSel) return;
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const ora = new Date();
    mSel.innerHTML = "";
    mesi.forEach((m, i) => { mSel.add(new Option(m, i + 1)); });
    mSel.value = ora.getMonth() + 1;
    aSel.innerHTML = "";
    for(let a = ora.getFullYear(); a >= 2024; a--) aSel.add(new Option(a, a));
}

function resetCampi() {
    const ids = ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze","valore-lordo","valore-netto"];
    ids.forEach(id => { if(document.getElementById(id)) document.getElementById(id).innerText = "0"; });
}
