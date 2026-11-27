document.addEventListener('DOMContentLoaded', caricaRubrica);

async function caricaRubrica() {
    updateSyncStatus('working');
    const container = document.getElementById('lista-contatti');
    
    try {
        // Chiamata al tuo Google Apps Script (URL in config.js)
        const response = await fetch(`${WEB_APP_URL}?azione=leggi_rubrica`);
        const result = await response.json();

        if (result.success) {
            if (result.dati.length === 0) {
                container.innerHTML = '<p style="text-align:center; padding:20px;">Nessun contatto trovato.</p>';
            } else {
                container.innerHTML = result.dati.map(c => `
                    <div class="contatto-card">
                        <div class="main-row">
                            <div class="info">
                                <strong>${c.nome}</strong>
                                <span>${c.ruolo || 'Dipendente'}</span>
                            </div>
                            <a href="tel:${c.tel}" class="btn-call">
                                <i class="fas fa-phone"></i>
                            </a>
                        </div>
                        
                        <div class="details">
                            <p><i class="fas fa-map-marker-alt"></i> ${c.indirizzo || 'Nessun indirizzo'}</p>
                            <p><i class="fas fa-user-tie"></i> Rif: ${c.referente || 'Nessun referente'}</p>
                        </div>
                    </div>
                `).join('');
            }
            updateSyncStatus('success');
        } else {
            throw new Error("Errore nel caricamento");
        }
    } catch (error) {
        console.error("Errore:", error);
        updateSyncStatus('error');
        container.innerHTML = '<p style="text-align:center; color:red; padding:20px;">Errore di connessione al Cloud.</p>';
    }
}

// Funzione di ricerca istantanea (ottimizzata iPhone)
function filtraContatti() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const cards = document.querySelectorAll('.contatto-card');
    cards.forEach(card => {
        const testo = card.innerText.toLowerCase();
        card.style.display = testo.includes(query) ? 'flex' : 'none';
    });
}
