const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    // Carica le tariffe dal cloud all'apertura
    caricaTariffeCloud();
});

function inizializzaFiltri() {
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    const ora = new Date();
    
    mesi.forEach((m, i) => {
        let opt = new Option(m, i + 1);
        if(i === ora.getMonth()) opt.selected = true;
        mSel.add(opt);
    });

    for(let a = ora.getFullYear(); a >= 2024; a--) {
        aSel.add(new Option(a, a));
    }
}

// FUNZIONE PER LEGGERE I REPORT
async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    const icon = document.getElementById('sync-icon');
    
    icon.classList.add('fa-spin', 'status-working');
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        processaDati(result.data);
        icon.classList.remove('fa-spin', 'status-working');
        icon.classList.add('status-success');
    } catch (e) {
        icon.classList.add('status-error');
        alert("Errore nel recupero dati");
    }
}

function processaDati(dati) {
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0 };

    dati.forEach(r => {
        const oreTot = parseFloat(r.ore_tot) || 0;
        const oreStr = parseFloat(r.ore_str) || 0;
        const data = new Date(r.data);
        const giorno = data.getDay(); // 0 Dom, 6 Sab

        if(r.assenza !== "Nessuna") { 
            stats.assenze += 8; 
        } else {
            if(r.tipo === "In sede") stats.sede += oreTot;
            else if(r.tipo === "Trasferta Rientro") stats.rientro += oreTot;
            else if(r.tipo === "Trasferta Pernottamento") stats.pernott += oreTot;
            else if(r.tipo === "Trasferta Estero") stats.estero += oreTot;

            if(giorno === 0 || giorno === 6) stats.s50 += oreStr;
            else stats.s25 += oreStr;
        }
    });

    document.getElementById('ore-sede').innerText = stats.sede.toFixed(1);
    document.getElementById('ore-rientro').innerText = stats.rientro.toFixed(1);
    document.getElementById('ore-pernott').innerText = stats.pernott.toFixed(1);
    document.getElementById('ore-estero').innerText = stats.estero.toFixed(1);
    document.getElementById('ore-assenze').innerText = stats.assenze.toFixed(1);
    document.getElementById('val-25').innerText = stats.s25.toFixed(1);
    document.getElementById('val-50').innerText = stats.s50.toFixed(1);

    calcolaSoldi(stats.s25, stats.s50);
}

function calcolaSoldi(s25, s50) {
    const base = parseFloat(document.getElementById('base-mensile').value) || 0;
    const t25 = parseFloat(document.getElementById('tariffa-25').value) || 0;
    const t50 = parseFloat(document.getElementById('tariffa-50').value) || 0;
    const tasse = parseFloat(document.getElementById('aliquota-tasse').value) || 0;

    const lordo = base + (s25 * t25) + (s50 * t50);
    const netto = lordo * (1 - (tasse / 100));

    document.getElementById('valore-lordo').innerText = `€ ${lordo.toFixed(2)}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toFixed(2)}`;
}

// --- GESTIONE IMPOSTAZIONI SUL CLOUD ---

async function caricaTariffeCloud() {
    const icon = document.getElementById('sync-icon');
    icon.classList.add('fa-spin');
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            document.getElementById('base-mensile').value = json.data.base;
            document.getElementById('tariffa-25').value = json.data.t25;
            document.getElementById('tariffa-50').value = json.data.t50;
            document.getElementById('aliquota-tasse').value = json.data.tasse;
        }
        icon.classList.remove('fa-spin');
        icon.classList.add('status-success');
    } catch(e) {
        icon.classList.add('status-error');
    }
}

async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    const icon = document.getElementById('sync-icon');
    
    const settings = {
        azione: "salva_impostazioni",
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        tasse: document.getElementById('aliquota-tasse').value
    };

    btn.disabled = true;
    btn.innerText = "SALVATAGGIO...";
    icon.classList.add('fa-spin', 'status-working');

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(settings)
        });
        
        icon.classList.remove('fa-spin');
        icon.classList.add('status-success');
        alert("Impostazioni salvate nel Cloud!");
        toggleSettings();
    } catch (e) {
        alert("Errore nel salvataggio");
        icon.classList.add('status-error');
    } finally {
        btn.disabled = false;
        btn.innerText = "SALVA SUL CLOUD";
    }
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}
