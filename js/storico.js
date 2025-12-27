const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud();
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
            alert("Nessun dato trovato per questo mese.");
        }
    } catch (e) {
        icon.className = "fas fa-exclamation-triangle status-error";
        alert("Errore nel recupero dati dal Cloud.");
    }
}

function processaDati(dati) {
    let stats = { sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, s25: 0, s50: 0 };

    dati.forEach(r => {
        const oreTot = parseFloat(r.oretot) || parseFloat(r.ore_tot) || 0;
        const oreStr = parseFloat(r.orestr) || parseFloat(r.ore_str) || 0;
        const tipoLavoro = r.tipo || r.tipo_lavoro || "";
        const assenza = r.assenza || "nessuna";
        
        // Calcolo giorno della settimana per differenziare % straordinario
        // r.data arriva come YYYY-MM-DD
        const dataPezzi = r.data.split("-");
        const d = new Date(dataPezzi[0], dataPezzi[1]-1, dataPezzi[2]);
        const giorno = d.getDay(); // 0 è Domenica, 6 è Sabato

        if (assenza.toLowerCase() !== "nessuna") {
            stats.assenze += 8;
        } else {
            // Totale ore per categoria
            if (tipoLavoro.toLowerCase().includes("sede")) stats.sede += oreTot;
            else if (tipoLavoro.toLowerCase().includes("rientro")) stats.rientro += oreTot;
            else if (tipoLavoro.toLowerCase().includes("pernottamento")) stats.pernott += oreTot;
            else if (tipoLavoro.toLowerCase().includes("estero")) stats.estero += oreTot;

            // DIFFERENZIAZIONE STRAORDINARI
            if (giorno === 0 || giorno === 6) {
                stats.s50 += oreStr; // Sabato e Domenica
            } else {
                stats.s25 += oreStr; // Lun-Ven
            }
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
    const base = parseFloat(document.getElementById('base-mensile').value) || 0;
    const t25 = parseFloat(document.getElementById('tariffa-25').value) || 0;
    const t50 = parseFloat(document.getElementById('tariffa-50').value) || 0;
    const tassePerc = parseFloat(document.getElementById('aliquota-tasse').value) || 0;

    // CALCOLO LORDO: Base + (ore25 * tariffa25) + (ore50 * tariffa50)
    const lordo = base + (s25 * t25) + (s50 * t50);
    const netto = lordo * (1 - (tassePerc / 100));

    document.getElementById('valore-lordo').innerText = `€ ${lordo.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
}

// GESTIONE TARIFFE CLOUD
async function caricaTariffeCloud() {
    const icon = document.getElementById('sync-icon');
    icon.className = "fas fa-sync fa-spin status-working";
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.data) {
            document.getElementById('base-mensile').value = json.data.base;
            document.getElementById('tariffa-25').value = json.data.t25;
            document.getElementById('tariffa-50').value = json.data.t50;
            document.getElementById('aliquota-tasse').value = json.data.tasse;
        }
        icon.className = "fas fa-cloud status-success";
    } catch(e) {
        icon.className = "fas fa-exclamation-triangle status-error";
    }
}

async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    const settings = {
        azione: "salva_impostazioni",
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        tasse: document.getElementById('aliquota-tasse').value
    };

    btn.disabled = true;
    btn.innerText = "SALVATAGGIO...";

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Tariffe salvate correttamente sul Cloud!");
        toggleSettings();
        caricaDatiStorico(); // Ricalcola subito se ci sono dati visualizzati
    } catch (e) {
        alert("Errore durante il salvataggio.");
    } finally {
        btn.disabled = false;
        btn.innerText = "SALVA SUL CLOUD";
    }
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function resetCampi() {
    ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze","val-25","val-50"].forEach(id => {
        document.getElementById(id).innerText = "0";
    });
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
}
