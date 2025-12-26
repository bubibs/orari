// js/app.js - IL MOTORE DELLA WEBAPP

// Caricamento dati iniziale
let registerData = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

document.addEventListener('DOMContentLoaded', () => {
    // 1. Popola i menu a tendina degli orari (00:00 - 23:45)
    initTimeDropdowns();
    
    // 2. Imposta la data di oggi come default
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('data').value = today;

    // 3. Carica i dati e aggiorna l'interfaccia
    refreshUI();

    // 4. Inizializza tutti i listener per i click
    initEventListeners();
});

// --- GESTIONE DROPDOWN ORARI ---
function initTimeDropdowns() {
    const times = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 15) {
            times.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    const startOptions = document.getElementById('inizio-options');
    const endOptions = document.getElementById('fine-options');

    times.forEach(time => {
        // Opzioni per orario inizio
        const divStart = document.createElement('div');
        divStart.className = 'option';
        divStart.textContent = time;
        divStart.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('inizio-text').textContent = time;
            startOptions.classList.remove('show');
            updatePreview();
        };
        startOptions.appendChild(divStart);

        // Opzioni per orario fine
        const divEnd = document.createElement('div');
        divEnd.className = 'option';
        divEnd.textContent = time;
        divEnd.onclick = (e) => {
            e.stopPropagation();
            document.getElementById('fine-text').textContent = time;
            endOptions.classList.remove('show');
            updatePreview();
        };
        endOptions.appendChild(divEnd);
    });
}

// --- LOGICA EVENTI ---
function initEventListeners() {
    // Apertura/Chiusura Dropdown
    document.getElementById('dropdown-inizio').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('fine-options').classList.remove('show');
        document.getElementById('inizio-options').classList.toggle('show');
    };

    document.getElementById('dropdown-fine').onclick = (e) => {
        e.stopPropagation();
        document.getElementById('inizio-options').classList.remove('show');
        document.getElementById('fine-options').classList.toggle('show');
    };

    // Chiudi dropdown se clicchi fuori
    window.onclick = () => {
        document.querySelectorAll('.options-list').forEach(list => list.classList.remove('show'));
    };

    // Pulsante Salva
    document.getElementById('save-btn').onclick = () => {
        const dataVal = document.getElementById('data').value;
        if (!dataVal) {
            showNotification("Seleziona una data!", "error");
            return;
        }

        const entry = {
            data: dataVal,
            inizio: document.getElementById('inizio-text').textContent,
            fine: document.getElementById('fine-text').textContent,
            tipo: document.getElementById('tipo').value,
            // Aggiungi qui altri campi se necessari (note, luogo, ecc)
        };

        // Usa la logica dal file js/logic.js
        const ore = calcolaOre(entry.inizio, entry.fine, true); // Assumiamo pausa pranzo attiva
        const str = calcolaStraordinari(ore, entry.data);
        
        const finalEntry = { ...entry, oreTotali: ore, ...str };
        
        registerData.unshift(finalEntry);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registerData));
        
        showNotification("Attività salvata correttamente!");
        refreshUI();
    };

    // Pulsante Cloud (Sincronizzazione)
    const cloudBtn = document.getElementById('cloud-import-btn');
    if (cloudBtn) {
        cloudBtn.onclick = async () => {
            const settings = getSettings();
            if (!settings.cloudUrl) {
                showNotification("Configura l'URL Cloud nelle impostazioni!", "error");
                return;
            }
            // Qui andrebbe la logica fetchCloudData() che era nel tuo file
            showNotification("Sincronizzazione in corso...", "warning");
        };
    }
}

// --- AGGIORNAMENTO UI ---
function refreshUI() {
    // Usa le funzioni dal file js/ui.js
    if (typeof renderTable === 'function') renderTable(registerData);
    if (typeof updateStats === 'function') updateStats(registerData);
}

function updatePreview() {
    const inizio = document.getElementById('inizio-text').textContent;
    const fine = document.getElementById('fine-text').textContent;
    const ore = calcolaOre(inizio, fine, true);
    // Se hai un elemento preview lo aggiorna, altrimenti logga in console
    console.log(`Preview ore: ${ore}`);
}

// Funzione globale per eliminare (usata dai bottoni nella tabella)
window.deleteEntry = function(index) {
    if (confirm("Vuoi eliminare questa riga?")) {
        registerData.splice(index, 1);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(registerData));
        refreshUI();
    }
};
