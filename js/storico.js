document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaDatiSito();
});

function inizializzaFiltri() {
    const m = document.getElementById('filtro-mese');
    const a = document.getElementById('filtro-anno');
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    m.innerHTML = mesi.map((nome, i) => `<option value="${i+1}">${nome}</option>`).join('');
    m.value = new Date().getMonth() + 1;
    a.innerHTML = '<option value="2024">2024</option><option value="2025">2025</option>';
    a.value = "2025";
}

// CARICAMENTO (Impostazioni + Storico + Suggerimenti)
async function caricaDatiSito() {
    updateSyncStatus('working');
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;

    try {
        const resp = await fetch(`${WEB_APP_URL}?azione=carica_tutto&mese=${mese}&anno=${anno}`);
        const data = await resp.json();

        if (data.success) {
            // 1. Popola Tariffe
            document.getElementById('base-mensile').value = data.impo.base;
            document.getElementById('t-25').value = data.impo.t25;
            document.getElementById('t-50').value = data.impo.t50;
            document.getElementById('tasse').value = data.impo.tasse;
            document.getElementById('i-rie').value = data.impo.rie;
            document.getElementById('i-per').value = data.impo.per;
            document.getElementById('i-est').value = data.impo.est;

            // 2. Popola Suggerimenti Località
            const dl = document.getElementById('elenco-localita');
            dl.innerHTML = data.posizioni.map(p => `<option value="${p}">`).join('');

            // 3. Qui andrebbero i calcoli basati su data.storico...
            
            updateSyncStatus('success');
        } else { throw new Error(); }
    } catch (e) {
        updateSyncStatus('error');
    }
}

// SALVATAGGIO CON PROTEZIONE DOPPIO CLICK
async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-cloud');
    const originalText = btn.innerHTML;

    // Disabilita e avvia animazione
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SALVATAGGIO IN CORSO...';
    updateSyncStatus('working');

    const payload = {
        azione: 'salva_impostazioni',
        base: parseFloat(document.getElementById('base-mensile').value),
        t25: parseFloat(document.getElementById('t-25').value),
        t50: parseFloat(document.getElementById('t-50').value),
        tasse: parseFloat(document.getElementById('tasse').value),
        rie: parseFloat(document.getElementById('i-rie').value),
        per: parseFloat(document.getElementById('i-per').value),
        est: parseFloat(document.getElementById('i-est').value)
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(payload)
        });

        // Feedback successo
        setTimeout(() => {
            updateSyncStatus('success');
            btn.innerHTML = '✅ SALVATO!';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                toggleSettings();
            }, 1000);
        }, 1000);
    } catch (e) {
        updateSyncStatus('error');
        btn.disabled = false;
        btn.innerHTML = '❌ ERRORE';
    }
}

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    p.style.display = (p.style.display === 'none') ? 'block' : 'none';
}
