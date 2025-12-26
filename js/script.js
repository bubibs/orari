const WEB_APP_URL = "INSERISCI_QUI_IL_TUO_URL_APPS_SCRIPT";
let dati = [];
let luoghiSuggeriti = new Set();

document.addEventListener('DOMContentLoaded', () => {
    popolaOrari();
    const oggi = new Date();
    document.getElementById('data').value = oggi.toISOString().split('T')[0];
    document.getElementById('mese-calcolo').value = oggi.toISOString().slice(0, 7);
    fetchData();
});

function popolaOrari() {
    const selects = [document.getElementById('ora-inizio'), document.getElementById('ora-fine')];
    selects.forEach(s => {
        s.add(new Option("--:--", ""));
        for (let h = 0; h < 24; h++) {
            let hh = h.toString().padStart(2, '0');
            s.add(new Option(`${hh}:00`, `${hh}:00`)); 
            s.add(new Option(`${hh}:30`, `${hh}:30`));
        }
    });
}

function toggleSection(id, el) {
    const c = document.getElementById(id);
    const isOpen = c.style.display === 'block';
    c.style.display = isOpen ? 'none' : 'block';
    el.classList.toggle('open', !isOpen);
}

async function fetchData() {
    setSyncState('working', 'Sincronizzazione...');
    try {
        const r = await fetch(WEB_APP_URL);
        const res = await r.json();
        dati = res.data || [];
        
        // Carica Tariffe
        if (res.settings) {
            document.getElementById('t-base').value = res.settings.base;
            document.getElementById('t-25').value = res.settings.s25;
            document.getElementById('t-50').value = res.settings.s50;
        }

        // Estrai luoghi per suggerimenti
        luoghiSuggeriti.clear();
        dati.forEach(d => { if(d.luogo) luoghiSuggeriti.add(d.luogo) });
        aggiornaDatalist();

        renderTabella();
        setSyncState('success', 'Sincronizzato');
    } catch(e) { 
        setSyncState('error', 'Errore Cloud'); 
    }
}

function aggiornaDatalist() {
    const dl = document.getElementById('suggerimenti-luoghi');
    dl.innerHTML = Array.from(luoghiSuggeriti).map(l => `<option value="${l}">`).join('');
}

function renderTabella() {
    const filtro = document.getElementById('mese-calcolo').value;
    const filteredData = dati.filter(d => d.data.startsWith(filtro));
    
    let somme = { extra: 0, ind: 0 };
    const T_BASE = parseFloat(document.getElementById('t-base').value) || 0;

    document.getElementById('registro-body').innerHTML = filteredData.map(d => {
        const h = parseFloat(d.ore) || 0;
        const dObj = new Date(d.data);
        const isWE = (dObj.getDay()===0 || dObj.getDay()===6);
        let ex = isWE ? h : Math.max(0, h-8);
        
        let bClass = d.tipo.includes("Trasferta") ? "bg-trasf" : "bg-sede";
        if(d.tipo.includes("Estero")) bClass = "bg-estero";
        if(["Ferie","Malattia","Permesso"].includes(d.tipo)) bClass = "bg-assenza";

        return `<tr>
            <td><b>${d.data.split('-')[2]}/${d.data.split('-')[1]}</b></td>
            <td><span class="badge ${bClass}">${d.tipo}</span><br><small>${d.luogo || '-'}</small></td>
            <td style="text-align:right;">${h.toFixed(2)}H</td>
        </tr>`;
    }).join('');

    // Esegui calcoli lordo/netto... (omesso qui per brevità, stessa logica del file unico)
}

async function salva() {
    const btn = document.getElementById('btn-save');
    const tipo = document.getElementById('modalita').value || document.getElementById('assenza').value;
    if(!tipo) return alert("Seleziona un'attività");

    // Animazione e feedback
    btn.disabled = true;
    btn.querySelector('.btn-text').style.display = 'none';
    btn.querySelector('.btn-loader').style.display = 'inline-block';
    setSyncState('working', 'Invio Report...');

    const rec = {
        id: Date.now().toString(), 
        tipo,
        luogo: document.getElementById('luogo').value,
        data: document.getElementById('data').value,
        inizio: document.getElementById('ora-inizio').value,
        fine: document.getElementById('ora-fine').value,
        ore: document.getElementById('prev-tot').textContent,
        note: document.getElementById('note').value
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(rec) });
        
        // Aggiungi luogo ai suggerimenti se nuovo
        if(rec.luogo) luoghiSuggeriti.add(rec.luogo);
        aggiornaDatalist();

        setSyncState('success', 'Report Salvato');
        fetchData();
        document.getElementById('note').value = "";
    } catch(e) { 
        setSyncState('error', 'Errore Invio'); 
    } finally {
        btn.disabled = false;
        btn.querySelector('.btn-text').style.display = 'inline-block';
        btn.querySelector('.btn-loader').style.display = 'none';
    }
}

function setSyncState(s, t) {
    const i = document.getElementById('sync-indicator');
    i.className = `sync-${s}`;
    const icon = s === 'working' ? 'fa-sync fa-spin' : 'fa-cloud';
    i.innerHTML = `<i class="fas ${icon}"></i> ${t.toUpperCase()}`;
}

// Logic Modalita e Logic Assenza rimangono invariate...
