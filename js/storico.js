const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

let mioGrafico = null;
let graficoAnnuale = null;

// Avvio al caricamento della pagina
document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTutto();
});

// Funzione principale che coordina i caricamenti
async function caricaTutto() {
    updateSyncStatus('working');
    try {
        await caricaTariffeCloud();
        await caricaDatiStorico();
        await caricaDatiAnnuali();
        // Se arriviamo qui senza errori
    } catch (e) {
        console.error("Errore nel caricamento iniziale:", e);
        updateSyncStatus('error');
    }
}

// GESTIONE ICONA CLOUD (Colori e Feedback)
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

// LOGICA CALCOLO E PROCESSO DATI
async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        
        if (result.success && result.data && result.data.length > 0) {
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

            // Weekend calcolato dal server (6=Sab, 7=Dom)
            if (r.giorno_sett === 6 || r.giorno_sett === 7) { 
                stats.s50 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t50) || 0)); 
            } else { 
                stats.s25 += ore; 
                stats.lordoExtra += (ore * (parseFloat(r.t25) || 0)); 
            }
        }
    });

    // Aggiornamento Box UI
    aggiornaElemento('ore-sede', stats.sede);
    aggiornaElemento('ore-rientro', stats.rientro);
    aggiornaElemento('ore-pernott', stats.pernott);
    aggiornaElemento('ore-estero', stats.estero);
    aggiornaElemento('ore-assenze', stats.assenze);
    aggiornaElemento('val-25', stats.s25.toFixed(1) + " h");
    aggiornaElemento('val-50', stats.s50.toFixed(1) + " h");
    aggiornaElemento('val-indennita', "€ " + stats.indennita.toFixed(2));

    const lordo = stats.base + stats.lordoExtra + stats.indennita;
    const netto = lordo * (1 - (stats.tasse / 100));

    aggiornaElemento('valore-lordo', "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits: 2}));
    aggiornaElemento('valore-netto', "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits: 2}));

    disegnaGraficoMensile(stats);
}

// FUNZIONI GRAFICI
function disegnaGraficoMensile(stats) {
    const ctx = document.getElementById('lavoroChart');
    if (!ctx) return;
    if (mioGrafico) mioGrafico.destroy();
    mioGrafico = new Chart(ctx.getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: ['Sede', 'Rientro', 'Pernott.', 'Estero', 'Assenze'],
            datasets: [{
                data: [stats.sede, stats.rientro, stats.pernott, stats.estero, stats.assenze],
                backgroundColor: ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF3B30']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

async function caricaDatiAnnuali() {
    const anno = document.getElementById('filtro-anno').value;
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_annuale&anno=${anno}`);
        const result = await response.json();
        if (result.success) disegnaGraficoAnnuale(result.data);
    } catch (e) { console.error("Errore annuale:", e); }
}

function disegnaGraficoAnnuale(dati) {
    const ctx = document.getElementById('annualeChart');
    if (!ctx) return;
    if (graficoAnnuale) graficoAnnuale.destroy();
    graficoAnnuale = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: ['G','F','M','A','M','G','L','A','S','O','N','D'],
            datasets: [{
                label: 'Lordo €',
                data: dati,
                borderColor: '#007AFF',
                tension: 0.3,
                fill: true,
                backgroundColor: 'rgba(0, 122, 255, 0.1)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// UTILITY E IMPOSTAZIONI
async function caricaTariffeCloud() {
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            const d = json.data;
            document.getElementById('base-mensile').value = d.base;
            document.getElementById('tariffa-25').value = d.t25;
            document.getElementById('tariffa-50').value = d.t50;
            document.getElementById('ind-rientro').value = d.ind_rientro;
            document.getElementById('ind-pernott').value = d.ind_pernott;
            document.getElementById('ind-estero').value = d.ind_estero;
            document.getElementById('aliquota-tasse').value = d.tasse;
        }
    } catch (e) { throw e; }
}

async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    const data = {
        azione: 'salva_impostazioni',
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        ind_rientro: document.getElementById('ind-rientro').value,
        ind_pernott: document.getElementById('ind-pernott').value,
        ind_estero: document.getElementById('ind-estero').value,
        tasse: document.getElementById('aliquota-tasse').value
    };

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INVIO...';
    updateSyncStatus('working');

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(data) });
        setTimeout(() => {
            updateSyncStatus('success');
            btn.innerHTML = 'SALVATO!';
            setTimeout(() => { 
                btn.disabled = false; 
                btn.innerText = 'SALVA SUL CLOUD'; 
                toggleSettings();
            }, 1500);
        }, 1000);
    } catch (e) {
        updateSyncStatus('error');
        btn.disabled = false;
        btn.innerText = 'ERRORE';
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
    for(let a = ora.getFullYear(); a >= 2024; a--) aSel.add(new Option(a, a));
}

function aggiornaElemento(id, valore) {
    const el = document.getElementById(id);
    if (el) el.innerText = valore;
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function resetCampi() {
    const ids = ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze","valore-lordo","valore-netto"];
    ids.forEach(id => aggiornaElemento(id, "0"));
}
