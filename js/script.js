const WEB_APP_URL = "INSERISCI_URL_QUI";
let rubricaMemoria = [];

document.addEventListener('DOMContentLoaded', () => {
    // Data odierna automatica
    const dataInput = document.getElementById('rep-data');
    if(dataInput) dataInput.valueAsDate = new Date();

    // Carica rubrica per suggerimenti se siamo in report
    if(document.getElementById('rep-luogo')) caricaRubricaPerSuggest();
});

async function caricaRubricaPerSuggest() {
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        rubricaMemoria = json.data || [];
    } catch(e) { console.error("Errore caricamento rubrica", e); }
}

function suggestLuogo() {
    const val = document.getElementById('rep-luogo').value.toLowerCase();
    const box = document.getElementById('suggestions');
    if(val.length < 2) { box.style.display = 'none'; return; }

    const matches = rubricaMemoria.filter(c => c.nome.toLowerCase().includes(val));
    if(matches.length > 0) {
        box.innerHTML = matches.map(m => `
            <div class="suggest-item" onclick="setLuogo('${m.nome}')">
                <b>${m.nome.toUpperCase()}</b><br><small>${m.citta || ''}</small>
            </div>
        `).join('');
        box.style.display = 'block';
    } else { box.style.display = 'none'; }
}

function setLuogo(nome) {
    document.getElementById('rep-luogo').value = nome;
    document.getElementById('suggestions').style.display = 'none';
}

async function salvaReport() {
    const b = document.getElementById('btn-save-rep');
    const luogo = document.getElementById('rep-luogo').value;
    
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

    if(!payload.data || !payload.luogo) return alert("Data e Luogo obbligatori!");

    updateCloudIcon('working');
    b.disabled = true;

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });

        // Se il luogo è nuovo, lo aggiungiamo in Rubrica
        const esiste = rubricaMemoria.some(c => c.nome.toLowerCase() === luogo.toLowerCase());
        if(!esiste && luogo.length > 2) {
            await fetch(WEB_APP_URL, { 
                method: 'POST', 
                mode: 'no-cors', 
                body: JSON.stringify({
                    azione: "salva_rubrica", 
                    nome: luogo, via: "-", citta: "-", ref: "Inserito da Report", tel: "-"
                }) 
            });
        }

        updateCloudIcon('success');
        alert("Report Inviato!");
        window.location.href = "index.html";
    } catch(e) { updateCloudIcon('error'); b.disabled = false; }
}

function updateCloudIcon(s) {
    const el = document.getElementById('sync-indicator');
    if(el) el.className = `sync-${s}`;
}
