const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    // Gestione Frase Home
    const quoteEl = document.getElementById('quote');
    if (quoteEl) {
        const frasi = ["Precisione nel lavoro, successo assicurato!", "La qualità è la nostra firma.", "Sincronizzazione Cloud attiva."];
        quoteEl.innerText = `"${frasi[Math.floor(Math.random() * frasi.length)]}"`;
    }

    // Se siamo in rubrica, scarica i contatti dal Cloud
    if (document.getElementById('lista-rubrica')) {
        caricaRubricaCloud();
    }
});

// --- SALVATAGGIO CLOUD ---
async function salvaIndirizzoCloud() {
    const btn = document.getElementById('btn-save-rubrica');
    const nome = document.getElementById('add-nome').value;
    const via = document.getElementById('add-via').value;
    const citta = document.getElementById('add-citta').value;
    const ref = document.getElementById('add-ref').value;
    const tel = document.getElementById('add-tel').value;

    if (!nome || !via) return alert("Nome e Via obbligatori!");

    btn.disabled = true;
    setSyncState('working', 'Salvataggio...');

    const payload = {
        azione: "salva_rubrica", // Identificatore per Google Sheets
        nome, via, citta, ref, tel
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        setSyncState('success', 'Sincronizzato');
        alert("Salvato nel Cloud!");
        window.location.reload();
    } catch (e) {
        setSyncState('error', 'Errore Cloud');
        btn.disabled = false;
    }
}

// --- CARICAMENTO CLOUD ---
async function caricaRubricaCloud() {
    setSyncState('working', 'Caricamento...');
    try {
        const response = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const result = await response.json();
        renderizzaRubrica(result.data);
        setSyncState('success', 'Cloud Attivo');
    } catch (e) {
        setSyncState('error', 'Errore');
    }
}

// --- RENDERING E APPLE MAPS ---
function renderizzaRubrica(contatti) {
    const lista = document.getElementById('lista-rubrica');
    if (!contatti || contatti.length === 0) {
        lista.innerHTML = "<p style='text-align:center; padding:20px; color:gray;'>Nessun contatto nel cloud.</p>";
        return;
    }

    lista.innerHTML = contatti.map(c => {
        const indirizzoFull = `${c.via}, ${c.citta}`;
        // Protocollo specifico per iPhone (Apple Maps)
        const linkApple = `maps://?q=${encodeURIComponent(indirizzoFull)}`;
        const linkGoogle = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(indirizzoFull)}`;

        return `
        <div class="card addr-card">
            <div class="addr-details">
                <b class="primary-text">${c.nome.toUpperCase()}</b>
                <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${indirizzoFull}</div>
                <div class="info-row"><i class="fas fa-user"></i> ${c.ref || '-'}</div>
                <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${c.tel}">${c.tel || '-'}</a></div>
            </div>
            <div class="addr-actions">
                <a href="${linkApple}" class="btn-nav a-maps"><i class="fab fa-apple"></i> MAPPE APPLE</a>
                <a href="${linkGoogle}" target="_blank" class="btn-nav g-maps"><i class="fab fa-google"></i> GOOGLE</a>
            </div>
        </div>
        `;
    }).join('');
}

function setSyncState(stato, testo) {
    const ind = document.getElementById('sync-indicator');
    if (!ind) return;
    ind.className = `sync-${stato}`;
    ind.innerHTML = `<i class="fas ${stato === 'working' ? 'fa-sync fa-spin' : 'fa-cloud'}"></i> ${testo ? testo.toUpperCase() : ''}`;
}
