const WEB_APP_URL = "INSERISCI_TUO_URL_QUI";
let dati = [];
let rubrica = JSON.parse(localStorage.getItem('rubrica')) || [];

document.addEventListener('DOMContentLoaded', () => {
    // Frase Motivazionale
    const frasi = ["Precisione nel lavoro, successo assicurato!", "Ogni chilometro è un passo verso l'obiettivo.", "La qualità è la nostra firma.", "Lavora con passione, registra con cura."];
    const quoteEl = document.getElementById('quote');
    if(quoteEl) quoteEl.innerText = frasi[Math.floor(Math.random() * frasi.length)];

    // Inizializzazione Report
    if(document.getElementById('ora-inizio')) {
        popolaOrari();
        document.getElementById('data').value = new Date().toISOString().split('T')[0];
        aggiornaListaLuoghi();
    }

    // Inizializzazione Rubrica
    if(document.getElementById('lista-rubrica')) renderingRubrica();
});

// FUNZIONI REPORT (Salvataggio, Preview, Logic)
function popolaOrari() {
    const s1 = document.getElementById('ora-inizio'), s2 = document.getElementById('ora-fine');
    for (let h = 0; h < 24; h++) {
        let hh = h.toString().padStart(2, '0');
        [s1, s2].forEach(s => { 
            s.add(new Option(`${hh}:00`, `${hh}:00`)); 
            s.add(new Option(`${hh}:30`, `${hh}:30`)); 
        });
    }
}

async function salva() {
    const btn = document.getElementById('btn-save');
    btn.disabled = true;
    document.getElementById('btn-spinner').style.display = 'inline-block';

    const rec = {
        data: document.getElementById('data').value,
        tipo: document.getElementById('modalita').value || document.getElementById('assenza').value,
        luogo: document.getElementById('luogo').value,
        ore: document.getElementById('prev-tot').innerText
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(rec) });
        alert("Report registrato correttamente!");
        window.location.href = "index.html";
    } catch(e) { alert("Errore di connessione"); btn.disabled = false; }
}

// FUNZIONI RUBRICA
function salvaIndirizzo() {
    const nome = document.getElementById('add-nome').value;
    const via = document.getElementById('add-via').value;
    if(!nome || !via) return alert("Inserisci tutti i dati");

    rubrica.push({ nome, via });
    localStorage.setItem('rubrica', JSON.stringify(rubrica));
    window.location.reload();
}

function renderingRubrica() {
    const cont = document.getElementById('lista-rubrica');
    cont.innerHTML = rubrica.map(item => `
        <div class="addr-card">
            <div class="addr-info"><b>${item.nome}</b><span>${item.via}</span></div>
            <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.via)}" target="_blank" class="btn-map">
                <i class="fas fa-directions"></i>
            </a>
        </div>
    `).join('');
}

function aggiornaListaLuoghi() {
    const dl = document.getElementById('lista-luoghi');
    dl.innerHTML = rubrica.map(i => `<option value="${i.nome}">`).join('');
}

// LOGICHE FORM (LogicModalita, logicAssenza, aggiornaPreview... uguali a prima)
