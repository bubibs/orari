const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec"; // Usa lo stesso del report

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeLocali();
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

async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    const icon = document.getElementById('sync-icon');
    
    icon.classList.add('fa-spin');
    
    try {
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const result = await response.json();
        processaDati(result.data);
    } catch (e) {
        alert("Errore nel recupero dati");
    } finally {
        icon.classList.remove('fa-spin');
    }
}

function processaDati(dati) {
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0 };

    dati.forEach(r => {
        const tipo = r.tipo;
        const oreTot = parseFloat(r.ore_tot) || 0;
        const oreStr = parseFloat(r.ore_str) || 0;
        const data = new Date(r.data);
        const giorno = data.getDay(); // 0 Dom, 6 Sab

        if(r.assenza !== "Nessuna") { stats.assenze += 8; }
        else {
            if(tipo === "In sede") stats.sede += oreTot;
            else if(tipo === "Trasferta Rientro") stats.rientro += oreTot;
            else if(tipo === "Trasferta Pernottamento") stats.pernott += oreTot;
            else if(tipo === "Trasferta Estero") stats.estero += oreTot;

            // Calcolo Straordinari differenziato
            if(giorno === 0 || giorno === 6) stats.s50 += oreStr;
            else stats.s25 += oreStr;
        }
    });

    // Aggiorna UI
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
    const base = parseFloat(document.getElementById('base-mensile').value);
    const t25 = parseFloat(document.getElementById('tariffa-25').value);
    const t50 = parseFloat(document.getElementById('tariffa-50').value);
    const tasse = parseFloat(document.getElementById('aliquota-tasse').value);

    const lordo = base + (s25 * t25) + (s50 * t50);
    const netto = lordo * (1 - (tasse / 100));

    document.getElementById('valore-lordo').innerText = `€ ${lordo.toFixed(2)}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toFixed(2)}`;
}

// GESTIONE TARIFFE (LocalStorage per non perderle ma non sovrascrivere il passato)
function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function salvaTariffe() {
    const t = {
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        tasse: document.getElementById('aliquota-tasse').value
    };
    localStorage.setItem('tecnosistem_tariffe', JSON.stringify(t));
    toggleSettings();
    alert("Tariffe salvate per i prossimi calcoli!");
}

function caricaTariffeLocali() {
    const t = JSON.parse(localStorage.getItem('tecnosistem_tariffe'));
    if(t) {
        document.getElementById('base-mensile').value = t.base;
        document.getElementById('tariffa-25').value = t.t25;
        document.getElementById('tariffa-50').value = t.t50;
        document.getElementById('aliquota-tasse').value = t.tasse;
    }
}
