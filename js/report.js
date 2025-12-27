const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let rubricaMemoria = [];

document.addEventListener('DOMContentLoaded', () => {
    const dataInput = document.getElementById('rep-data');
    if(dataInput) dataInput.valueAsDate = new Date();
    checkTipoLavoro();
    caricaRubricaPerSuggest();
});

function checkTipoLavoro() {
    const tipo = document.getElementById('rep-tipo').value;
    const inizio = document.getElementById('rep-inizio');
    const fine = document.getElementById('rep-fine');
    const mensa = document.getElementById('rep-mensa');
    const luogo = document.getElementById('rep-luogo');

    if (tipo === "In sede") {
        inizio.value = "08:00";
        fine.value = "17:00";
        mensa.checked = true;
        luogo.value = "Tecnosistem";
    }
    calcolaOre();
}

function calcolaOre() {
    const dataVal = document.getElementById('rep-data').value;
    const inizio = document.getElementById('rep-inizio').value;
    const fine = document.getElementById('rep-fine').value;
    const mensa = document.getElementById('rep-mensa').checked;
    const assenza = document.getElementById('rep-assenza').value;

    if (assenza !== "Nessuna") {
        document.getElementById('display-totali').innerText = "8.0";
        document.getElementById('display-straord').innerText = "0.0";
        return;
    }

    if (!inizio || !fine) return;

    const [hIni, mIni] = inizio.split(':').map(Number);
    const [hFin, mFin] = fine.split(':').map(Number);
    
    let minutiTotali = (hFin * 60 + mFin) - (hIni * 60 + mIni);
    if (mensa) minutiTotali -= 60;
    if (minutiTotali < 0) minutiTotali = 0;

    const oreTotali = minutiTotali / 60;
    let straordinari = 0;
    
    const dataObj = new Date(dataVal);
    const giorno = dataObj.getDay(); // 0 Dom, 6 Sab

    if (giorno === 0 || giorno === 6) {
        straordinari = oreTotali;
    } else {
        if (oreTotali > 8) straordinari = oreTotali - 8;
    }

    document.getElementById('display-totali').innerText = oreTotali.toFixed(1);
    document.getElementById('display-straord').innerText = straordinari.toFixed(1);
}

async function caricaRubricaPerSuggest() {
    updateCloudIcon('working');
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        rubricaMemoria = json.data || [];
        updateCloudIcon('success');
    } catch(e) { updateCloudIcon('error'); }
}

function suggestLuogo() {
    const val = document.getElementById('rep-luogo').value.toLowerCase();
    const box = document.getElementById('suggestions');
    if(val.length < 2) { box.style.display = 'none'; return; }
    const matches = rubricaMemoria.filter(c => c.nome.toLowerCase().includes(val));
    if(matches.length > 0) {
        box.innerHTML = matches.map(m => `<div class="suggest-item" onclick="setLuogo('${m.nome.replace(/'/g, "\\'")}','${m.citta||""}')"><b>${m.nome.toUpperCase()}</b></div>`).join('');
        box.style.display = 'block';
    } else { box.style.display = 'none'; }
}

function setLuogo(n, c) {
    document.getElementById('rep-luogo').value = n;
    document.getElementById('suggestions').style.display = 'none';
}

async function salvaReport() {
    const btn = document.getElementById('btn-save-rep');
    const payload = {
        azione: "salva_report",
        data: document.getElementById('rep-data').value,
        tipo: document.getElementById('rep-tipo').value,
        assenza: document.getElementById('rep-assenza').value,
        inizio: document.getElementById('rep-inizio').value,
        fine: document.getElementById('rep-fine').value,
        mensa: document.getElementById('rep-mensa').checked ? "SI" : "NO",
        luogo: document.getElementById('rep-luogo').value,
        note: document.getElementById('rep-note').value,
        ore_tot: document.getElementById('display-totali').innerText,
        ore_str: document.getElementById('display-straord').innerText
    };

    if(!payload.luogo) return alert("Inserisci il luogo!");
    updateCloudIcon('working');
    btn.disabled = true;

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        updateCloudIcon('success');
        setTimeout(() => window.location.href = 'index.html', 800);
    } catch (e) { updateCloudIcon('error'); btn.disabled = false; }
}

function updateCloudIcon(s) {
    const icon = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    if (!icon || !text) return;
    icon.className = 'fas fa-cloud';
    if (s === 'working') { icon.classList.add('sync-working', 'status-working'); text.innerText = "Invio..."; text.className = 'status-working'; }
    else if (s === 'success') { icon.classList.add('status-success'); text.innerText = "Sincronizzato"; text.className = 'status-success'; }
    else if (s === 'error') { icon.classList.add('status-error'); text.innerText = "Errore"; text.className = 'status-error'; }
}
