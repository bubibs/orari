const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaDati();
});

function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.style.transition = "all 0.3s";
    if (status === 'working') {
        icon.className = "fas fa-sync fa-spin";
        icon.style.color = "#f1c40f";
    } else if (status === 'success') {
        icon.className = "fas fa-cloud";
        icon.style.color = "#2ecc71";
    } else {
        icon.className = "fas fa-exclamation-triangle";
        icon.style.color = "#e74c3c";
    }
}

async function caricaDati() {
    updateSyncStatus('working');
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;

    try {
        // Carica prima le tariffe, poi i dati
        const resImpo = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const jsonImpo = await resImpo.json();
        
        const resDati = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const jsonDati = await resDati.json();

        if (jsonImpo.success && jsonDati.success) {
            popolaImpostazioni(jsonImpo.data);
            elaboraStorico(jsonDati.data, jsonImpo.data);
            updateSyncStatus('success');
        } else {
            throw new Error("Errore risposta server");
        }
    } catch (e) {
        console.error(e);
        updateSyncStatus('error');
    }
}

function popolaImpostazioni(d) {
    const mappatura = { 'base-mensile': d.base, 'tariffa-25': d.t25, 'tariffa-50': d.t50, 'ind-rientro': d.ind_rie, 'ind-pernott': d.ind_per, 'ind-estero': d.ind_est, 'aliquota-tasse': d.tasse };
    for (let id in mappatura) {
        const el = document.getElementById(id);
        if (el) el.value = mappatura[id];
    }
}

function elaboraStorico(righe, impo) {
    let s = { sede:0, rientro:0, pernot:0, estero:0, ass:0, h25:0, h50:0, extra:0, ind:0 };
    
    righe.forEach(r => {
        const tipo = (r.tipo || "").toLowerCase();
        const ass = (r.assenza || "").toLowerCase();
        const ore = parseFloat(r.ore_str) || 0;

        if (ass !== "" && ass !== "nessuna") {
            s.ass++;
        } else {
            let indV = 0;
            if (tipo.includes("sede")) s.sede++;
            else if (tipo.includes("rientro")) { s.rientro++; indV = impo.ind_rie; }
            else if (tipo.includes("pernottamento")) { s.pernot++; indV = impo.ind_per; }
            else if (tipo.includes("estero")) { s.estero++; indV = impo.ind_est; }
            
            s.ind += indV;
            if (r.giorno_sett >= 6) { // Sabato o Domenica
                s.h50 += ore;
                s.extra += (ore * impo.t50);
            } else {
                s.h25 += ore;
                s.extra += (ore * impo.t25);
            }
        }
    });

    // Aggiorna UI
    document.getElementById('ore-sede').innerText = s.sede;
    document.getElementById('ore-rientro').innerText = s.rientro;
    document.getElementById('ore-pernott').innerText = s.pernot;
    document.getElementById('ore-estero').innerText = s.estero;
    document.getElementById('ore-assenze').innerText = s.ass;
    document.getElementById('val-25').innerText = s.h25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = s.h50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = "€ " + s.ind.toFixed(2);

    const lordo = impo.base + s.extra + s.ind;
    const netto = lordo * (1 - (impo.tasse / 100));
    document.getElementById('valore-lordo').innerText = "€ " + lordo.toLocaleString('it-IT', {minimumFractionDigits:2});
    document.getElementById('valore-netto').innerText = "€ " + netto.toLocaleString('it-IT', {minimumFractionDigits:2});
}

function inizializzaFiltri() {
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel) return;
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    mSel.innerHTML = mesi.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
    mSel.value = new Date().getMonth() + 1;
    aSel.innerHTML = `<option value="2025">2025</option><option value="2024">2024</option>`;
}
