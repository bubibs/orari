const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud(); // Carica i valori attuali negli input della modale
});

// Configura i menu a tendina per Mese e Anno
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

// Funzione principale di ricerca
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
            alert("Nessun report trovato per questo periodo.");
        }
    } catch (e) {
        icon.className = "fas fa-exclamation-triangle status-error";
        alert("Errore nel recupero dati dal Cloud.");
    }
}

// Logica di calcolo: Elabora riga per riga i dati del Cloud
function processaDati(dati) {
    let stats = { 
        sede: 0, rientro: 0, pernott: 0, estero: 0, assenze: 0, 
        s25: 0, s50: 0,
        lordoMeseExtra: 0, indennitaTot: 0,
        pagaBaseRiferimento: 0,
        ultimaAliquota: 0
    };

    dati.forEach(r => {
        // Estrazione dati dalla riga (Colonne J, K, L, M, N, O, P, Q, R del foglio)
        const oreStr = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || r.tipo || "").toLowerCase().trim();
        const assenza = (r.assenza || "nessuna").toLowerCase().trim();
        
        // Tariffe congelate salvate nel report
        const t25 = parseFloat(r.t25) || 0;
        const t50 = parseFloat(r.t50) || 0;
        const iRie = parseFloat(r.ind_rie) || 0;
        const iPer = parseFloat(r.ind_per) || 0;
        const iEst = parseFloat(r.ind_est) || 0;
        
        stats.pagaBaseRiferimento = parseFloat(r.paga_base) || 0;
        stats.ultimaAliquota = parseFloat(r.tasse) || 0;

        // Gestione Data e Calendario
        const dataPezzi = r.data.split("-"); // Formato YYYY-MM-DD
        const d = new Date(dataPezzi[0], dataPezzi[1]-1, dataPezzi[2]);
        const giornoSettimana = d.getDay(); // 0=Dom, 6=Sab

        if (assenza !== "nessuna" && assenza !== "") {
            stats.assenze += 1;
        } else {
            let indGiorno = 0;

            // Riconoscimento Indennità tramite parole chiave
            if (tipo.includes("sede")) {
                stats.sede += 1;
            } else if (tipo.includes("rientro")) {
                stats.rientro += 1;
                indGiorno = iRie;
            } else if (tipo.includes("pernottamento")) {
                stats.pernott += 1;
                indGiorno = iPer;
            } else if (tipo.includes("estero")) {
                stats.estero += 1;
                indGiorno = iEst;
            }

            // Calcolo Straordinario basato sul giorno effettivo
            let soldiStrGiorno = 0;
            if (giornoSettimana === 0 || giornoSettimana === 6) {
                stats.s50 += oreStr;
                soldiStrGiorno = oreStr * t50;
            } else {
                stats.s25 += oreStr;
                soldiStrGiorno = oreStr * t25;
            }

            stats.indennitaTot += indGiorno;
            stats.lordoMeseExtra += (soldiStrGiorno + indGiorno);
        }
    });

    // Calcolo Finali
    const lordoTotale = stats.lordoMeseExtra + stats.pagaBaseRiferimento;
    const nettoStimato = lordoTotale * (1 - (stats.ultimaAliquota / 100));

    // Aggiornamento DOM
    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1);
    document.getElementById('val-50').innerText = stats.s50.toFixed(1);
    
    document.getElementById('val-indennita').innerText = `€ ${stats.indennitaTot.toFixed(2)}`;
    document.getElementById('valore-lordo').innerText = `€ ${lordoTotale.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${nettoStimato.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
}

// Carica le tariffe attuali per la modale impostazioni
async function caricaTariffeCloud() {
    const icon = document.getElementById('sync-icon');
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
    } catch(e) { console.error("Errore caricamento tariffe"); }
}

// Salva le nuove tariffe sul Cloud
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
    btn.innerText = "SALVATAGGIO...";

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Impostazioni salvate con successo!");
        toggleSettings();
    } catch (e) { alert("Errore durante il salvataggio."); }
    finally { 
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
    document.getElementById('val-indennita').innerText = "€ 0.00";
    document.getElementById('valore-lordo').innerText = "€ 0.00";
    document.getElementById('valore-netto').innerText = "€ 0.00";
}
