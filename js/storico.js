const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaDatiSito();
});

// --- STATO SINCRONIZZAZIONE (COLORI) ---
function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.className = "fas";
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; // GIALLO
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; // VERDE
    } else {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; // ROSSO
    }
}

// --- CARICAMENTO INTEGRATO ---
async function caricaDatiSito() {
    updateSyncStatus('working');
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;

    try {
        const resp = await fetch(`${WEB_APP_URL}?azione=carica_tutto&mese=${mese}&anno=${anno}`);
        const res = await resp.json();

        if (res.success) {
            popolaImpostazioni(res.impo);
            aggiornaSuggerimentiLocalita(res.posizioni);
            calcolaEVisualizza(res.impo, res.storico);
            updateSyncStatus('success');
        } else { throw new Error(res.error); }
    } catch (e) {
        console.error(e);
        updateSyncStatus('error');
    }
}

// --- SALVATAGGIO CON ANIMAZIONE (DOPPIO CLICK PREVENT) ---
async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    const originalText = btn.innerHTML;
    
    btn.disabled = true; // Blocca doppio click
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SALVATAGGIO...';
    updateSyncStatus('working');

    const dati = {
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        tasse: document.getElementById('aliquota-tasse').value,
        rie: document.getElementById('ind-rientro').value,
        per: document.getElementById('ind-pernott').value,
        est: document.getElementById('ind-estero').value
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dati) });
        // Feedback visivo
        setTimeout(() => {
            updateSyncStatus('success');
            btn.innerHTML = '<i class="fas fa-check"></i> OK!';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                caricaDatiSito(); // Aggiorna i calcoli
            }, 1000);
        }, 800);
    } catch (e) {
        updateSyncStatus('error');
        btn.disabled = false;
        btn.innerHTML = 'ERRORE';
    }
}

// --- SUGGERIMENTI LOCALITÀ ---
function aggiornaSuggerimentiLocalita(lista) {
    let dl = document.getElementById('lista-posizioni');
    if (!dl) {
        dl = document.createElement('datalist');
        dl.id = 'lista-posizioni';
        document.body.appendChild(dl);
    }
    // Collega al campo input della posizione
    const inputPos = document.getElementById('input-posizione');
    if(inputPos) inputPos.setAttribute('list', 'lista-posizioni');
    
    dl.innerHTML = lista.map(p => `<option value="${p}">`).join('');
}

// ... (altre funzioni di calcolo) ...
