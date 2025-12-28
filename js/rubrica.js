document.addEventListener('DOMContentLoaded', caricaRubrica);

async function caricaRubrica() {
    updateSyncStatus('working');
    try {
        const r = await fetch(`${WEB_APP_URL}?azione=leggi_rubrica`);
        const res = await r.json();
        
        if (res.success) {
            const container = document.getElementById('lista-contatti');
            if (res.dati.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding:20px;">Nessun contatto in rubrica.</p>';
            } else {
                container.innerHTML = res.dati.map(c => `
                    <div class="contatto-card">
                        <div class="contatto-info">
                            <strong>${c.nome}</strong>
                            <span>${c.ruolo || 'Dipendente'}</span>
                        </div>
                        <a href="tel:${c.tel}" class="btn-call">
                            <i class="fas fa-phone"></i>
                        </a>
                    </div>
                `).join('');
            }
            updateSyncStatus('success');
        } else { throw new Error(); }
    } catch (e) {
        updateSyncStatus('error');
        console.error("Errore rubrica:", e);
    }
}
