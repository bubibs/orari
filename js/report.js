const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let rubricaMemoria = [];

document.addEventListener('DOMContentLoaded', () => {
    // Imposta data odierna
    const dataInput = document.getElementById('rep-data');
    if(dataInput) dataInput.valueAsDate = new Date();
    
    // Carica rubrica per suggerimenti
    caricaRubricaPerSuggest();
});

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

    const matches = rubricaMemoria.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(val)) || 
        (c.citta && c.citta.toLowerCase().includes(val))
    );

    if(matches.length > 0) {
        box.innerHTML = matches.map(m => `
            <div class="suggest-item" onclick="setLuogo('${m.nome.replace(/'/g, "\\'")}', '${m.citta ? m.citta.replace(/'/g, "\\'") : ""}')">
                <b>${m.nome.toUpperCase()}</b><br><small>${m.citta || ""}</small>
            </div>
        `).join('');
        box.style.display = 'block';
    } else { box.style.display = 'none'; }
}

function setLuogo(nome, citta) {
    document.getElementById('rep-luogo').value = citta ? `${nome} (${citta})` : nome;
    document.getElementById('suggestions').style.display = 'none';
}

async function salvaReport() {
    const btn = document.getElementById('btn-save-rep');
    const luogo = document.getElementById('rep-luogo').value;
    
    if(!luogo) return alert("Inserisci il luogo dell'intervento!");

    const payload = {
        azione: "salva_report",
        data: document.getElementById('rep-data').value,
        tipo: document.getElementById('rep-tipo').value,
        assenza: document.getElementById('rep-assenza').value,
        inizio: document.getElementById('rep-inizio').value,
        fine: document.getElementById('rep-fine').value,
        mensa: document.getElementById('rep-mensa').checked ? "SI" : "NO",
        luogo: luogo,
        note: document.getElementById('rep-note').value
    };

    updateCloudIcon('working');
    btn.disabled = true;
    btn.innerText = "INVIO IN CORSO...";

    try {
        // 1. Salvataggio Report
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });

        // 2. Controllo se il luogo è nuovo per salvarlo in rubrica
        const esiste = rubricaMemoria.some(c => luogo.toLowerCase().includes(c.nome.toLowerCase()));
        if(!esiste && luogo.length > 3) {
            const nuovoContatto = {
                azione: "salva_rubrica",
                nome: luogo,
                via: "-", citta: "-", ref: "Inserito da Report", tel: "-"
            };
            await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(nuovoContatto) });
        }

        updateCloudIcon('success');
        setTimeout(() => {
            alert("Report inviato con successo!");
            window.location.href = 'index.html';
        }, 500);
    } catch (e) {
        updateCloudIcon('error');
        btn.disabled = false;
        btn.innerText = "INVIA REPORT";
    }
}

function updateCloudIcon(s) {
    const icon = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    if (!icon || !text) return;

    icon.className = 'fas fa-cloud';
    text.className = '';

    if (s === 'working') {
        icon.classList.add('sync-working', 'status-working');
        text.classList.add('status-working');
        text.innerText = "Sincronizzazione...";
    } else if (s === 'success') {
        icon.classList.add('status-success');
        text.classList.add('status-success');
        text.innerText = "Sincronizzato";
        setTimeout(() => { 
            text.innerText = "Connesso"; 
            text.className = ''; 
            icon.className = 'fas fa-cloud';
        }, 3000);
    } else if (s === 'error') {
        icon.classList.add('status-error');
        text.classList.add('status-error');
        text.innerText = "Errore Sincro";
    }
}
