const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let dati = [];

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
    const isHidden = c.style.display === 'none';
    c.style.display = isHidden ? 'block' : 'none';
    el.classList.toggle('open', isHidden);
}

async function fetchData() {
    setSyncState('working', 'Sincronizzazione...');
    try {
        const r = await fetch(WEB_APP_URL);
        const res = await r.json();
        dati = res.data || [];
        
        // Suggerimento Luoghi
        const dl = document.getElementById('lista-luoghi');
        const luoghiUnici = [...new Set(dati.map(d => d.luogo).filter(l => l && l !== "TECNOSISTEM"))];
        dl.innerHTML = luoghiUnici.map(l => `<option value="${l}">`).join('');

        setSyncState('success', 'Sincronizzato');
    } catch(e) { 
        setSyncState('error', 'Errore Cloud'); 
    }
}

async function salva() {
    const btn = document.getElementById('btn-save'), txt = document.getElementById('btn-text'), spin = document.getElementById('btn-spinner');
    const tipo = document.getElementById('modalita').value || document.getElementById('assenza').value;
    
    if(!tipo) return alert("Scegli un'attività!");

    btn.disabled = true; txt.style.display = 'none'; spin.style.display = 'inline-block';
    setSyncState('working', 'Salvataggio...');

    const rec = {
        id: Date.now(),
        tipo,
        luogo: document.getElementById('luogo').value,
        data: document.getElementById('data').value,
        inizio: document.getElementById('ora-inizio').value,
        fine: document.getElementById('ora-fine').value,
        ore: document.getElementById('prev-tot').innerText
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(rec) });
        setSyncState('success', 'Salvato!');
        setTimeout(fetchData, 1000);
    } catch(e) { 
        setSyncState('error', 'Errore'); 
    } finally {
        btn.disabled = false; txt.style.display = 'inline-block'; spin.style.display = 'none';
    }
}

function setSyncState(s, t) {
    const i = document.getElementById('sync-indicator');
    i.className = `sync-${s}`;
    i.innerHTML = `<i class="fas ${s === 'working' ? 'fa-sync fa-spin' : 'fa-cloud'}"></i> ${t.toUpperCase()}`;
}

function logicModalita() {
    const v = document.getElementById('modalita').value;
    if(v === "In Sede") {
        document.getElementById('luogo').value = "TECNOSISTEM";
        document.getElementById('ora-inizio').value = "08:00"; 
        document.getElementById('ora-fine').value = "17:00";
        document.getElementById('pausa-mensa').checked = true;
    }
    aggiornaPreview();
}

function logicAssenza() {
    if(document.getElementById('assenza').value) document.getElementById('modalita').value = "";
    aggiornaPreview();
}

function aggiornaPreview() {
    const s = document.getElementById('ora-inizio').value, e = document.getElementById('ora-fine').value;
    if(!s || !e) return;
    const [h1, m1] = s.split(':').map(Number), [h2, m2] = e.split(':').map(Number);
    let ore = (h2 + m2/60) - (h1 + m1/60);
    if(document.getElementById('pausa-mensa').checked && ore > 1) ore -= 1;
    document.getElementById('prev-tot').innerText = Math.max(0, ore).toFixed(2);
    document.getElementById('prev-extra').innerText = Math.max(0, ore - 8).toFixed(2);
}
