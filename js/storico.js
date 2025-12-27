const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

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
    if(status === 'working') icon.classList.add('fa-sync', 'fa-spin', 'status-working');
    else if(status === 'success') icon.classList.add('fa-cloud', 'status-success');
    else if(status === 'error') icon.classList.add('fa-exclamation-triangle', 'status-error');
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
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0, lordoExtra: 0, indennita: 0, base: 0, tasse: 0 };
    dati.forEach(r => {
        const ore = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase();
        const ass = (r.assenza || "").toLowerCase();
        stats.base = r.paga_base; stats.tasse = r.tasse;

        if (ass !== "" && ass !== "nessuna") { stats.assenze++; } 
        else {
            let ind = 0;
            if (tipo.includes("sede")) stats.sede++;
            else if (tipo.includes("rientro")) { stats.rientro++; ind = r.ind_rie; }
            else if (tipo.includes("pernottamento")) { stats.pernott++; ind = r.ind_per; }
            else if (tipo.includes("estero")) { stats.estero++; ind = r.ind_est; }
            
            stats.indennita += ind;
            if (r.giorno_sett === 6 || r.giorno_sett === 7) { 
                stats.s50 += ore; stats.lordoExtra += (ore * r.t50); 
            } else { 
                stats.s25 += ore; stats.lordoExtra += (ore * r.t25); 
            }
        }
    });

    document.getElementById('val-25').innerText = stats.s25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = stats.s50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = "€ " + stats.indennita.toFixed(2);
    const lordo = stats.base + stats.lordoExtra + stats.indennita;
    const netto = lordo * (1 - (stats.tasse / 100));
    document.getElementById('valore-lordo').innerText = "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits:2});
    document.getElementById('valore-netto').innerText = "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits:2});
}

// ... (altre funzioni di supporto come inizializzaFiltri e caricaTariffeCloud rimangono uguali)
