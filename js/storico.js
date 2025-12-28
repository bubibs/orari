async function salvaLavoro() {
    const btn = document.getElementById('btn-salva');
    const originalContent = btn.innerHTML;
    
    // Feedback immediato iPhone
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> INVIO...';
    updateSyncStatus('working');

    const dati = {
        azione: 'salva_lavoro',
        data: document.getElementById('input-data').value,
        tipo: document.getElementById('input-tipo').value,
        localita: document.getElementById('input-posizione').value,
        inizio: document.getElementById('input-inizio').value,
        fine: document.getElementById('input-fine').value,
        mensa: document.getElementById('input-mensa').value,
        note: document.getElementById('input-note').value,
        ore: document.getElementById('input-ore').value
    };

    try {
        await fetch(WEB_APP_URL, {
            method: 'POST',
            mode: 'no-cors',
            body: JSON.stringify(dati)
        });

        // Simuliamo attesa per feedback
        setTimeout(() => {
            updateSyncStatus('success');
            btn.innerHTML = '<i class="fas fa-check"></i> FATTO!';
            btn.style.background = "#34C759";
            
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalContent;
                btn.style.background = "";
                // Pulisce campi
                document.getElementById('input-posizione').value = "";
                document.getElementById('input-ore').value = "";
            }, 1500);
        }, 1000);
    } catch (e) {
        updateSyncStatus('error');
        btn.disabled = false;
        btn.innerHTML = 'ERRORE!';
    }
}
