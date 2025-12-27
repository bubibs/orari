const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let rubricaMemoria = [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Data odierna
    const dataInput = document.getElementById('rep-data');
    if(dataInput) dataInput.valueAsDate = new Date();
    
    // 2. Vincolo mezz'ore sugli input
    const timeInputs = [document.getElementById('rep-inizio'), document.getElementById('rep-fine')];
    timeInputs.forEach(input => {
        input.addEventListener('blur', function() {
            if(this.value) {
                let [h, m] = this.value.split(':').map(Number);
                m = (m < 15) ? 0 : (m < 45 ? 30 : 0);
                if (m === 0 && Number(this.value.split(':')[1]) >= 45) h = (h + 1) % 24;
                this.value = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
                calcolaOre();
            }
        });
    });

    checkTipoLavoro();
    caricaRubricaPerSuggest();
});

function checkTipoLavoro() {
    const tipo = document.getElementById('rep-tipo').value;
    if (tipo === "In sede") {
        document.getElementById('rep-inizio').value = "08:00";
        document.getElementById('rep-fine').value = "17:00";
        document.getElementById('rep-mensa').checked = true;
        document.getElementById('rep-luogo').value = "Tecnosistem";
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
    
    // Sabato (6) o Domenica (0)
    if (dataObj.getDay() === 0 || dataObj.getDay() === 6) {
        straordinari = oreTotali;
    } else if (oreTotali > 8) {
        straordinari = oreTotali - 8;
    }

    document.getElementById('display-totali').innerText = oreTotali.toFixed(1);
    document.getElementById('display-straord').innerText = straordinari.toFixed(1);
}

// GESTIONE RUBRICA
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
        box.innerHTML = matches.map(m => `<div class="suggest-item" onclick="setLuogo('${m.nome.replace(/'/g, "\\'")}','')"><b>${m.nome.toUpperCase()}</b></div>`).join('');
        box.style.display = 'block';
    } else { box.style.display = 'none'; }
}

function setLuogo(n) {
    document.getElementById('rep-luogo').value = n;
    document.getElementById('suggestions').style.display = 'none';
    calcolaOre();
}

// INVIO REPORT
async function salvaReport() {
    const btn = document.getElementById('btn-save-rep');
    const btnIcon = document.getElementById('btn-icon');
    const btnText = document.getElementById('btn-text');
    const luogo = document.getElementById('rep-luogo').value;

    if(!luogo) return alert("Inserisci il luogo!");

    // UI Feedback: Animazione
    btn.disabled = true;
    btnText.innerText = "INVIO IN CORSO...";
    btnIcon.className = "fas fa-spinner fa-spin-custom";
    updateCloudIcon('working');

    const payload = {
        azione: "salva_report",
        data: document.getElementById('rep-data').value,
        tipo: document.getElementById('rep-tipo').value,
        assenza: document.getElementById('rep-assenza').value,
        inizio: document.getElementById('rep-inizio').value,
        fine: document.getElementById('rep-fine').value,
        mensa: document.getElementById('rep-mensa').checked ? "SI" : "NO",
        luogo: luogo,
        note: document.getElementById('rep-note').value,
        ore_tot: document.getElementById('display-totali').innerText,
        ore_str: document.getElementById('display-straord').innerText
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        // Feedback Successo
        updateCloudIcon('success');
        btnIcon.className = "fas fa-check";
        btnText.innerText = "REPORT INVIATO!";
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1200);

    } catch (e) {
        updateCloudIcon('error');
        btn.disabled = false;
        btnIcon.className = "fas fa-paper-plane";
        btnText.innerText = "INVIA REPORT";
        alert("Errore di connessione. Riprova.");
    }
}

function updateCloudIcon(s) {
    const icon = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    if (!icon || !text) return;
    icon.className = 'fas fa-cloud';
    if (s === 'working') { icon.classList.add('sync-working', 'status-working'); text.innerText = "In corso..."; text.className = 'status-working'; }
    else if (s === 'success') { icon.classList.add('status-success'); text.innerText = "Ok"; text.className = 'status-success'; }
    else if (s === 'error') { icon.classList.add('status-error'); text.innerText = "Errore"; text.className = 'status-error'; }
}
