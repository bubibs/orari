const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

let mioGrafico = null;
let graficoAnnuale = null;

// Eseguiamo tutto al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    avviaCaricamento();
});

// Funzione principale di avvio
async function avviaCaricamento() {
    updateSyncStatus('working'); // Giallo
    try {
        // Carichiamo le tariffe e i dati dello storico
        await caricaTariffeCloud();
        await caricaDatiStorico();
        
        // Se hai la funzione per il grafico annuale, caricalo qui
        if (typeof caricaDatiAnnuali === "function") {
            await caricaDatiAnnuali();
        }
        
        // Se siamo arrivati qui senza errori, è un successo
        updateSyncStatus('success'); // Verde
    } catch (e) {
        console.error("Errore critico:", e);
        updateSyncStatus('error'); // Rosso
    }
}

// GESTIONE ICONA CLOUD (Colori e Animazioni)
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;

    icon.className = "fas"; // Reset
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; // Giallo
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; // Verde
    } else if (status === 'error') {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; // Rosso
    }
}

async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    
    const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
    const result = await response.json();
    
    if (result.success && result.data && result.data.length > 0) {
        processaDati(result.data);
    } else {
        resetCampi();
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
        
        stats.base = r.paga_base || 0; 
        stats.tasse = r.tasse || 0;

        if (ass !== "" && ass !== "nessuna") {
            stats.assenze++;
        } else {
            let valInd = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; valInd = r.ind_rie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; valInd = r.ind_per; }
            else if (tipo.includes("estero")) { stats.estero++; valInd = r.ind_est; }
            
            stats.indennita += (parseFloat(valInd) || 0);

            // Controllo Sabato/Domenica inviato dal server
            if (r.giorno_sett === 6 || r.giorno_sett === 7) { 
                stats.s50 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t50) || 0)); 
            } else { 
                stats.s25 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t25) || 0)); 
            }
        }
    });

    // Scrittura dati nei box (assicurati che gli ID esistano nel tuo HTML)
    aggiornaTesto('ore-sede', stats.sede);
    aggiornaTesto('ore-rientro', stats.rientro);
    aggiornaTesto('ore-pernott', stats.pernott);
    aggiornaTesto('ore-estero', stats.estero);
    aggiornaTesto('ore-assenze', stats.assenze);
    aggiornaTesto('val-25', stats.s25.toFixed(1) + " h");
    aggiornaTesto('val-50', stats.s50.toFixed(1) + " h");
    aggiornaTesto('val-indennita', "€ " + stats.indennita.toFixed(2));

    const lordo = stats.base + stats.lordoExtra + stats.indennita;
    const netto = lordo * (1 - (stats.tasse / 100));

    aggiornaTesto('valore-lordo', "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
    aggiornaTesto('valore-netto', "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits: 2, maximumFractionDigits: 2}));
}

// Funzione salva-vita per evitare errori se un ID non esiste
function aggiornaTesto(id, testo) {
    const el = document.getElementById(id);
    if (el) el.innerText = testo;
}

function inizializzaFiltri() {
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel || !aSel) return;

    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
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

async function caricaTariffeCloud() {
    const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
    const json = await res.json();
    if(json.data) {
        const d = json.data;
        if(document.getElementById('base-mensile')) document.getElementById('base-mensile').value = d.base;
        if(document.getElementById('tariffa-25')) document.getElementById('tariffa-25').value = d.t25;
        if(document.getElementById('tariffa-50')) document.getElementById('tariffa-50').value = d.t50;
        if(document.getElementById('ind-rientro')) document.getElementById('ind-rientro').value = d.ind_rientro;
        if(document.getElementById('ind-pernott')) document.getElementById('ind-pernott').value = d.ind_pernott;
        if(document.getElementById('ind-estero')) document.getElementById('ind-estero').value = d.ind_estero;
        if(document.getElementById('aliquota-tasse')) document.getElementById('aliquota-tasse').value = d.tasse;
    }
}

function resetCampi() {
    const ids = ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze","val-25","val-50","val-indennita","valore-lordo","valore-netto"];
    ids.forEach(id => aggiornaTesto(id, "0"));
}
