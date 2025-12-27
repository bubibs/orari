const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTariffeCloud(); // Carica le tariffe attuali negli input
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
            alert("Nessun report trovato per questo periodo.");
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
        lordoMese: 0, nettoMese: 0, indennitaTot: 0,
        // Usiamo la paga base dell'ultima riga del mese come riferimento per il calcolo
        pagaBaseRiferimento: 0 
    };

    dati.forEach(r => {
        const oreStr = parseFloat(r.ore_str) || 0;
        const tipo = (r.tipo_lavoro || "").toLowerCase();
        const assenza = (r.assenza || "nessuna").toLowerCase();
        
        // Recupero tariffe "congelate" dalla riga (se presenti, altrimenti 0)
        const t25 = parseFloat(r.t25) || 0;
        const t50 = parseFloat(r.t50) || 0;
        const iRie = parseFloat(r.ind_rie) || 0;
        const iPer = parseFloat(r.ind_per) || 0;
        const iEst = parseFloat(r.ind_est) || 0;
        const aliquota = parseFloat(r.tasse) || 0;
        stats.pagaBaseRiferimento = parseFloat(r.paga_base) || 0;

        const dataPezzi = r.data.split("-");
        const d = new Date(dataPezzi[0], dataPezzi[1]-1, dataPezzi[2]);
        const giorno = d.getDay(); 

        if (assenza !== "nessuna") {
            stats.assenze += 1;
        } else {
            let indennitaGiorno = 0;
            if (tipo.includes("sede")) stats.sede += 1;
            else if (tipo.includes("rientro")) { stats.rientro += 1; indennitaGiorno = iRie; }
            else if (tipo.includes("pernottamento")) { stats.pernott += 1; indennitaGiorno = iPer; }
            else if (tipo.includes("estero")) { stats.estero += 1; indennitaGiorno = iEst; }

            // Calcolo economico riga per riga
            let extraGiorno = 0;
            if (giorno === 0 || giorno === 6) {
                stats.s50 += oreStr;
                extraGiorno = oreStr * t50;
            } else {
                stats.s25 += oreStr;
                extraGiorno = oreStr * t25;
            }

            stats.indennitaTot += indennitaGiorno;
            stats.lordoMese += (extraGiorno + indennitaGiorno);
        }
    });

    // Aggiungiamo la paga base una sola volta al lordo totale del mese
    const lordoFinale = stats.lordoMese + stats.pagaBaseRiferimento;
    
    // Calcolo netto basato sull'ultima aliquota trovata
    const ultimaAliquota = parseFloat(dati[dati.length-1].tasse) || 0;
    const nettoFinale = lordoFinale * (1 - (ultimaAliquota / 100));

    // Aggiornamento UI
    document.getElementById('ore-sede').innerText = stats.sede;
    document.getElementById('ore-rientro').innerText = stats.rientro;
    document.getElementById('ore-pernott').innerText = stats.pernott;
    document.getElementById('ore-estero').innerText = stats.estero;
    document.getElementById('ore-assenze').innerText = stats.assenze;
    document.getElementById('val-25').innerText = stats.s25.toFixed(1);
    document.getElementById('val-50').innerText = stats.s50.toFixed(1);
    
    document.getElementById('val-indennita').innerText = `€ ${stats.indennitaTot.toFixed(2)}`;
    document.getElementById('valore-lordo').innerText = `€ ${lordoFinale.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
    document.getElementById('valore-netto').innerText = `€ ${nettoFinale.toLocaleString('it-IT', {minimumFractionDigits: 2})}`;
}

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
            document.getElementById('ind-rientro').value = json.data.ind_rientro;
            document.getElementById('ind-pernott').value = json.data.ind_pernott;
            document.getElementById('ind-estero').value = json.data.ind_estero;
            document.getElementById('aliquota-tasse').value = json.data.tasse;
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
    btn.innerText = "SALVATAGGIO...";

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(settings) });
        alert("Impostazioni salvate! Saranno applicate ai prossimi report.");
        toggleSettings();
    } catch (e) { alert("Errore salvataggio Cloud"); }
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
