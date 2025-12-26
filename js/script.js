const WEB_APP_URL = "INSERISCI_URL_QUI";

// Configurazione Frasi
const frasi = [
    "Precisione nel lavoro, successo assicurato!",
    "La qualità è fare le cose bene quando nessuno guarda.",
    "Ogni report corretto è un passo verso il weekend.",
    "Lavora sodo in silenzio, il successo sarà il tuo rumore."
];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Frase motivazionale in Home
    const quoteEl = document.getElementById('quote');
    if (quoteEl) quoteEl.innerText = `"${frasi[Math.floor(Math.random() * frasi.length)]}"`;

    // 2. Setup Report
    if (document.getElementById('ora-inizio')) {
        popolaOrari();
        document.getElementById('data').value = new Date().toISOString().split('T')[0];
        aggiornaListaLuoghi();
        aggiornaPreview();
    }

    // 3. Setup Rubrica
    if (document.getElementById('lista-rubrica')) renderingRubrica();
});

// POPOLA SELECT ORARI
function popolaOrari() {
    const s1 = document.getElementById('ora-inizio'), s2 = document.getElementById('ora-fine');
    for (let h = 7; h < 22; h++) {
        let hh = h.toString().padStart(2, '0');
        [hh + ":00", hh + ":30"].forEach(t => {
            s1.add(new Option(t, t)); s2.add(new Option(t, t));
        });
    }
    s1.value = "08:00"; s2.value = "17:00";
}

// CALCOLO ORE E PREVIEW
function aggiornaPreview() {
    if (!document.getElementById('ora-inizio')) return;
    const inizio = document.getElementById('ora-inizio').value;
    const fine = document.getElementById('ora-fine').value;
    const pausa = document.getElementById('pausa-mensa').checked ? 1 : 0;
    
    let [h1, m1] = inizio.split(':').map(Number);
    let [h2, m2] = fine.split(':').map(Number);
    let totali = (h2 + m2/60) - (h1 + m1/60) - pausa;
    
    if (totali < 0) totali = 0;
    document.getElementById('prev-tot').innerText = totali.toFixed(2);
    document.getElementById('prev-extra').innerText = (totali > 8 ? totali - 8 : 0).toFixed(2);
}

// SALVATAGGIO REPORT CON ANIMAZIONE
async function salvaReport() {
    const btn = document.getElementById('btn-save');
    const spinner = document.getElementById('btn-spinner');
    const text = document.getElementById('btn-text');

    btn.disabled = true;
    spinner.style.display = 'inline-block';
    text.innerText = "SALVATAGGIO...";

    const payload = {
        data: document.getElementById('data').value,
        luogo: document.getElementById('luogo').value,
        ore: document.getElementById('prev-tot').innerText,
        tipo: document.getElementById('modalita').value
    };

    try {
        // Simulazione o invio reale
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Report Salvato!");
        window.location.href = "index.html";
    } catch (e) {
        alert("Errore invio!");
        btn.disabled = false;
        spinner.style.display = 'none';
        text.innerText = "SALVA REPORT";
    }
}

// RUBRICA E SUGGERIMENTI
function salvaIndirizzo() {
    const n = document.getElementById('add-nome').value;
    const v = document.getElementById('add-via').value;
    if (!n || !v) return;

    let r = JSON.parse(localStorage.getItem('rubrica')) || [];
    r.push({ nome: n, via: v });
    localStorage.setItem('rubrica', JSON.stringify(r));
    window.location.reload();
}

function renderingRubrica() {
    let r = JSON.parse(localStorage.getItem('rubrica')) || [];
    document.getElementById('lista-rubrica').innerHTML = r.map((item, index) => `
        <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
            <div><b>${item.nome}</b><br><small>${item.via}</small></div>
            <a href="https://www.google.com/maps/search/${encodeURIComponent(item.via)}" target="_blank" style="color:var(--primary); font-size:20px;"><i class="fas fa-directions"></i></a>
        </div>
    `).join('');
}

function aggiornaListaLuoghi() {
    let r = JSON.parse(localStorage.getItem('rubrica')) || [];
    const dl = document.getElementById('lista-luoghi');
    dl.innerHTML = r.map(i => `<option value="${i.nome} - ${i.via}">`).join('');
}
