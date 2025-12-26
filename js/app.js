// js/app.js

let registerData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Inizializza i menu a tendina
    initTimeDropdowns();
    
    // 2. Carica i dati esistenti e aggiorna la UI
    refreshUI();

    // 3. Collega tutti i pulsanti e gli eventi
    initEventListeners();
});

// Funzione per generare le opzioni 00:00 - 23:45
function initTimeDropdowns() {
    const options = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            options.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    const startList = document.getElementById('inizio-options');
    const endList = document.getElementById('fine-options');

    // Pulizia preventiva
    startList.innerHTML = '';
    endList.innerHTML = '';

    options.forEach(t => {
        // Crea opzione per Inizio
        const divStart = document.createElement('div');
        divStart.className = 'option';
        divStart.textContent = t;
        divStart.onclick = (e) => {
            e.stopPropagation(); // Evita la chiusura immediata
            selectTime(t, 'inizio-text');
        };
        startList.appendChild(divStart);

        // Crea opzione per Fine
        const divEnd = document.createElement('div');
        divEnd.className = 'option';
        divEnd.textContent = t;
        divEnd.onclick = (e) => {
            e.stopPropagation();
            selectTime(t, 'fine-text');
        };
        endList.appendChild(divEnd);
    });
}

// Dentro js/app.js, modifica la funzione selectTime così:
function selectTime(time, elementId) {
    const el = document.getElementById(elementId);
    el.textContent = time;
    el.style.color = "var(--accent-color)"; // Feedback visivo della selezione
    
    document.querySelectorAll('.options-list').forEach(l => l.classList.remove('show'));
    updatePreview();
    
    // Feedback tattile (vibrazione leggera se supportata)
    if (window.navigator.vibrate) window.navigator.vibrate(10);
}

function initEventListeners() {
    // Mostra/Nascondi dropdown Inizio
    document.getElementById('dropdown-inizio').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('fine-options').classList.remove('show');
        document.getElementById('inizio-options').classList.toggle('show');
    };

    // Mostra/Nascondi dropdown Fine
    document.getElementById('dropdown-fine').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('inizio-options').classList.remove('show');
        document.getElementById('fine-options').classList.toggle('show');
    };

    // Chiudi i menu se clicchi ovunque fuori
    window.onclick = () => {
        document.querySelectorAll('.options-list').forEach(l => l.classList.remove('show'));
    };

    // Pulsante Salva
    document.getElementById('save-btn').onclick = () => {
        const entry = {
            data: document.getElementById('data').value,
            inizio: document.getElementById('inizio-text').textContent,
            fine: document.getElementById('fine-text').textContent,
            pausa: document.getElementById('pausa').checked,
            tipo: document.getElementById('tipo').value,
            luogo: document.getElementById('luogo').value,
            note: document.getElementById('note').value
        };

        if(!entry.data) {
            showNotification("Per favore, seleziona una data!", "error");
            return;
        }

        const ore = calcolaOre(entry.inizio, entry.fine, entry.pausa);
        const str = calcolaStraordinari(ore, entry.data);
        
        const finalEntry = { ...entry, oreTotali: ore, ...str };
        registerData.unshift(finalEntry);
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registerData));
        showNotification("Attività salvata nel browser!");
        refreshUI();
    };

    // Altri listener (Pausa, Tipo lavoro) per aggiornare la preview in tempo reale
    document.getElementById('pausa').onchange = updatePreview;
    document.getElementById('tipo').onchange = updatePreview;
}

function refreshUI() {
    renderTable(registerData);
    updateStats(registerData);
    updatePreview();
}

function updatePreview() {
    const inizio = document.getElementById('inizio-text').textContent;
    const fine = document.getElementById('fine-text').textContent;
    const pausa = document.getElementById('pausa').checked;
    const ore = calcolaOre(inizio, fine, pausa);
    
    document.getElementById('preview-ore').innerHTML = `Ore calcolate: <span>${ore.toFixed(2)}</span>`;
}

// Funzione globale per cancellare (richiamata da ui.js)
window.deleteEntry = function(index) {
    if(confirm("Vuoi davvero eliminare questa attività?")) {
        registerData.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registerData));
        refreshUI();
    }
};

