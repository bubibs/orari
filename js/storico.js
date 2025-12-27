const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

// Avvio
document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaTutto();
});

// Funzione per aprire/chiudere impostazioni (ora funzionerà!)
function toggleSettings() {
    const p = document.getElementById('settings-panel');
    if (p) {
        p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
    }
}

function inizializzaFiltri() {
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel || !aSel) return;

    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    const ora = new Date();
    
    mSel.innerHTML = mesi.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
    mSel.value = ora.getMonth() + 1;

    aSel.innerHTML = `<option value="2025">2025</option><option value="2024">2024</option>`;
    aSel.value = ora.getFullYear();
}

function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.className = "fas";
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "orange";
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#2ecc71";
    } else {
        icon.className = "fas fa-exclamation-triangle";
        icon.style.color = "#e74c3c";
    }
}

async function caricaTutto() {
    updateSyncStatus('working');
    try {
        await caricaTariffeCloud();
        await caricaDatiStorico();
        updateSyncStatus('success');
    } catch (e) {
        console.error(e);
        updateSyncStatus('error');
    }
}

async function caricaTariffeCloud() {
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const json = await res.json();
        if(json.success && json.data) {
            const d = json.data;
            if(document.getElementById('base-mensile')) document.getElementById('base-mensile').value = d.base || 0;
            if(document.getElementById('tariffa-25')) document.getElementById('tariffa-25').value = d.t25 || 0;
            if(document.getElementById('tariffa-50')) document.getElementById('tariffa-50').value = d.t50 || 0;
            if(document.getElementById('ind-rientro')) document.getElementById('ind-rientro').value = d.ind_rie || 0;
            if(document.getElementById('ind-pernott')) document.getElementById('ind-pernott').value = d.ind_per || 0;
            if(document.getElementById('ind-estero')) document.getElementById('ind-estero').value = d.ind_est || 0;
            if(document.getElementById('aliquota-tasse')) document.getElementById('aliquota-tasse').value = d.tasse || 0;
        }
    } catch(e) { console.error("Errore tariffe:", e); }
}

async function caricaDatiStorico() {
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;
    try {
        const res = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const json = await res.json();
        if (json.success && json.data) {
            // Qui andrebbe la funzione per i calcoli, ma intanto verifichiamo se carica
            console.log("Dati ricevuti:", json.data.length);
        }
    } catch (e) { console.error("Errore dati:", e); }
}
