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
        
        if (res.settings) {
            document.getElementById('t-base').value = res.settings.base || 1800;
            document.getElementById('t-25').value = res.settings.s25 || 12;
            document.getElementById('t-50').value = res.settings.s50 || 15;
        }

        aggiornaSuggerimentiLuoghi();
        renderTabella();
        setSyncState('success', 'Sincronizzato');
    } catch(e) { 
        setSyncState('error', 'Errore Cloud'); 
    }
}

function aggiornaSuggerimentiLuoghi() {
    const lista = document.getElementById('lista-luoghi');
    const luoghi = [...new Set(dati.map(d => d.luogo).filter(l => l && l !== "TECNOSISTEM"))];
    lista.innerHTML = luoghi.map(l => `<option value="${l}">`).join('');
}

function renderTabella() {
    const filtro = document.getElementById('mese-calcolo').value;
    const filteredData = dati.filter(d => d.data.startsWith(filtro));
    
    const T_BASE = parseFloat(document.getElementById('t-base').value) || 0;
    const T_25 = parseFloat(document.getElementById('t-25').value) || 0;
    const T_50 = parseFloat(document.getElementById('t-50').value) || 0;

    let somme = { extra: 0, ind: 0 };

    document.getElementById('registro-body').innerHTML = filteredData.map(d => {
        const h = parseFloat(d.ore) || 0;
        const isWE = ([0, 6].includes(new Date(d.data).getDay()));
        let ex = isWE ? h : Math.max(0, h-8);
        
        somme.extra += isWE ? (ex * T_50) : (ex * T_25);
        // Calcolo indennità semplificato per l'esempio
        if(d.tipo.includes("Trasferta")) somme.ind += 15; 

        let bClass = d.tipo.includes("Trasferta") ? "bg-trasf" : "bg-sede";
        return `<tr>
            <td><b>${d.data.split('-')[2]}/${d.data.split('-')[1]}</b></td>
            <td><span class="badge ${bClass}">${d.tipo}</span><br><small>${d.luogo || '-'}</small></td>
            <td style="text-align:right;">${h.toFixed(2)}H</td>
        </tr>`;
    }).join('');

    const lordo = T_BASE + somme.extra + somme.ind;
    document.getElementById('val-lordo').innerText = `€ ${lordo.toFixed(2)}`;
    document.getElementById('val-netto').innerText = `€ ${(lordo * 0.76).toFixed(2)}`;
    document.getElementById('calc-base').innerText = `€ ${T_BASE.toFixed(2)}`;
    document.getElementById('calc-extra').innerText = `€ ${somme.extra.toFixed(2)}`;
    document.getElementById('calc-ind').innerText = `€ ${somme.ind.toFixed(2)}`;
}

async function salva() {
    const btn = document.getElementById('btn-save'), txt = document.getElementById('btn-text'), spin = document.getElementById('btn-spinner');
    const tipo = document.getElementById('modalita').value || document.getElementById('assenza').value;
    if(!tipo) return alert("Seleziona attività");

    btn.disabled = true; txt.style.display = 'none'; spin.style.display = 'inline-block';
    setSyncState('working', 'Salvataggio...');

    const rec = {
        id: Date.now(), tipo, luogo: document.getElementById('luogo').value,
        data: document.getElementById('data').value, inizio: document.getElementById('ora-inizio').value,
        fine: document.getElementById('ora-fine').value, ore: document.getElementById('prev-tot').innerText
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(rec) });
        setSyncState('success', 'Salvato!');
        await fetchData();
    } catch(e) { setSyncState('error', 'Errore'); }
    
    btn.disabled = false; txt.style.display = 'inline-block'; spin.style.display = 'none';
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
    let ore = (parseInt(e.split(':')[0]) + parseInt(e.split(':')[1])/60) - (parseInt(s.split(':')[0]) + parseInt(s.split(':')[1])/60);
    if(document.getElementById('pausa-mensa').checked && ore > 1) ore -= 1;
    document.getElementById('prev-tot').innerText = Math.max(0, ore).toFixed(2);
    document.getElementById('prev-extra').innerText = Math.max(0, ore - 8).toFixed(2);
}
