const WEB_APP_URL = "IL_TUO_URL_DI_GOOGLE_SHEETS"; // <--- ASSICURATI CHE SIA CORRETTO
let dati = [];

document.addEventListener('DOMContentLoaded', () => {
    popolaOrari();
    const oggi = new Date();
    document.getElementById('data').value = oggi.toISOString().split('T')[0];
    document.getElementById('mese-calcolo').value = oggi.toISOString().slice(0, 7);
    fetchData(); // Scarica i dati all'avvio
});

// FUNZIONE PER SCARICARE I DATI E MOSTRARE LO STORICO
async function fetchData() {
    setSyncState('working', 'Sincronizzazione...');
    try {
        const r = await fetch(WEB_APP_URL);
        const res = await r.json();
        dati = res.data || [];
        
        // Carica suggerimenti per il campo "Luogo"
        aggiornaSuggerimentiLuoghi();
        
        // Mostra i dati nella tabella Storico
        renderTabella();
        
        setSyncState('success', 'Sincronizzato');
    } catch(e) { 
        setSyncState('error', 'Errore Cloud'); 
        console.error("Errore download dati:", e);
    }
}

// FUNZIONE CHE CREA LA TABELLA DELLO STORICO
function renderTabella() {
    const filtroMese = document.getElementById('mese-calcolo').value;
    const body = document.getElementById('registro-body');
    
    // Filtriamo i dati per il mese selezionato
    const datiFiltrati = dati.filter(d => d.data.startsWith(filtroMese));
    
    if (datiFiltrati.length === 0) {
        body.innerHTML = '<tr><td colspan="3" style="text-align:center; padding:20px; color:gray;">Nessun dato per questo mese</td></tr>';
        return;
    }

    body.innerHTML = datiFiltrati.map(d => {
        // Colore badge basato sul tipo lavoro
        let badgeClass = "bg-sede";
        if(d.tipo.includes("Trasferta")) badgeClass = "bg-trasf";
        if(d.tipo.includes("Estero")) badgeClass = "bg-estero";
        if(["Ferie","Malattia","Permesso"].includes(d.tipo)) badgeClass = "bg-assenza";

        // Formattazione data (da YYYY-MM-DD a DD/MM)
        const dataGiorno = d.data.split('-')[2] + "/" + d.data.split('-')[1];

        return `
            <tr>
                <td style="width:50px;"><b>${dataGiorno}</b></td>
                <td>
                    <span class="badge ${badgeClass}">${d.tipo.toUpperCase()}</span>
                    <div style="font-size:11px; color:var(--subtext); margin-top:2px;">${d.luogo || '-'}</div>
                </td>
                <td style="text-align:right; font-weight:700;">${parseFloat(d.ore).toFixed(2)}h</td>
            </tr>
        `;
    }).join('');
}

// FUNZIONE PER I SUGGERIMENTI LUOGO (Personalizzazione salvata)
function aggiornaSuggerimentiLuoghi() {
    const lista = document.getElementById('lista-luoghi');
    const luoghiUnici = [...new Set(dati.map(d => d.luogo).filter(l => l && l !== "TECNOSISTEM"))];
    lista.innerHTML = luoghiUnici.map(l => `<option value="${l}">`).join('');
}

// Stato dell'icona Cloud (Personalizzazione salvata)
function setSyncState(stato, testo) {
    const indicatore = document.getElementById('sync-indicator');
    if(!indicatore) return;
    indicatore.className = `sync-${stato}`;
    const icona = stato === 'working' ? 'fa-sync fa-spin' : 'fa-cloud';
    indicatore.innerHTML = `<i class="fas ${icona}"></i> ${testo.toUpperCase()}`;
}

// ... (tieni le altre funzioni popolaOrari, logicModalita, salva, ecc. che abbiamo scritto prima)
