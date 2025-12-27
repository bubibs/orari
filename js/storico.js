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
            alert("Nessun report trovato per il mese selezionato.");
        }
    } catch (e) {
        icon.className = "fas fa-exclamation-triangle status-error";
        alert("Errore nel recupero dati.");
    }
}

function processaDati(dati) {
    let stats = { 
        sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, 
        s25: 0, s50: 0,
        gRientro: 0, gPernott: 0, gEstero: 0
    };

    dati.forEach(r => {
        const oreTot = parseFloat(r.oretot) || parseFloat(r.ore_tot) || 0;
        const oreStr = parseFloat(r.orestr) || parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo || r.tipo_lavoro || "").toLowerCase();
        const assenza = (r.assenza || "nessuna").toLowerCase();
        
        // Calcolo weekend per straordinari
        const dataPezzi = r.data.split("-");
        const d = new Date(dataPezzi[0], dataPezzi[1]-1, dataPezzi[2]);
        const giorno = d.getDay(); // 0=Dom, 6=Sab

        if (assenza !== "nessuna") {
            stats.assenze += 1;
        } else {
            if (tipo.includes("sede")) stats.sede += 1;
            else if (tipo.includes("rientro")) { stats.rientro += 1; stats.gRientro += 1; }
            else if (tipo.includes("pernottamento")) { stats.pernott += 1; stats.gPernott += 1; }
            else if (tipo.includes("estero")) { stats.estero += 1; stats.gEstero += 1; }

            if (giorno === 0 || giorno === 6) stats.s50 += oreStr;
            else stats.s25 += oreStr;
        }
    });

    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1);
    document.getElementById('val-50').innerText = stats.s50.toFixed(1);

    calcolaSoldi(stats);
}

function calcolaSoldi(stats) {
    const base = parseFloat(document.getElementById('base-mensile').value) || 0;
    const t25 = parseFloat(document.getElementById('tariffa-25').value) || 0;
    const t50 = parseFloat(document.getElementById('tariffa-50').value) || 0;
    const iRie = parseFloat(document.getElementById('ind-rientro').value) || 0;
    const iPer = parseFloat(document.getElementById('ind-pernott').value) || 0;
    const iEst = parseFloat(document.getElementById('ind-estero').value) || 0;
    const tasse = parseFloat(document.getElementById('aliquota-tasse').value) || 0;

    const indennitaTot = (stats.gRientro * iRie) + (stats.gPernott * iPer) + (stats.gEstero * iEst);
    const straordinariTot = (stats.s25 * t25) + (stats.s50 * t50);
    const lordo = base + indennitaTot + straordinariTot;
    const netto = lordo * (1 - (tasse / 100));

    document.getElementById('val-indennita').innerText = `€ ${indennitaTot.toFixed(2)}`;
    document.getElementById('valore-lordo').innerText = `€ ${lordo.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${netto.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
}

async function caricaTariffeCloud() {
    const icon = document.getElementById('sync-icon');
    icon.className = "fas fa-sync fa-spin status-working";
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
        icon.className = "fas fa-cloud status-success";
    } catch(e) { icon.className = "fas fa-exclamation-triangle status-error"; }
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
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Impostazioni salvate nel Cloud!");
        toggleSettings();
        caricaDatiStorico();
    } catch (e) { alert("Errore nel salvataggio."); }
    finally { btn.disabled = false; }
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function resetCampi() {
    ["ore-sede","ore-rientro","ore-pernott","ore-estero","ore-assenze","val-25","val-50"].forEach(id => {
        document.getElementById(id).innerText = "0";
    });
    document.getElementById('val-indennita').innerText = "€ 0.00";
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
}
