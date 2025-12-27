const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";

document.addEventListener('DOMContentLoaded', () => {
    inizializzaFiltri();
    caricaDatiSito();
});

function toggleSettings() {
    const p = document.getElementById('settings-panel');
    if (p) p.style.display = (p.style.display === 'flex') ? 'none' : 'flex';
}

function updateSyncStatus(status) {
    const icon = document.getElementById('sync-icon');
    if (!icon) return;
    icon.className = "fas";
    if (status === 'working') {
        icon.classList.add('fa-sync', 'fa-spin');
        icon.style.color = "#FFCC00"; 
    } else if (status === 'success') {
        icon.classList.add('fa-cloud');
        icon.style.color = "#34C759"; 
    } else {
        icon.classList.add('fa-exclamation-triangle');
        icon.style.color = "#FF3B30"; 
    }
}

async function salvaTariffeCloud() {
    const btn = document.getElementById('btn-salva-tariffe');
    if (!btn) return;
    
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SALVATAGGIO...';
    updateSyncStatus('working');

    const payload = {
        azione: 'salva_impostazioni',
        base: document.getElementById('base-mensile').value,
        t25: document.getElementById('tariffa-25').value,
        t50: document.getElementById('tariffa-50').value,
        tasse: document.getElementById('aliquota-tasse').value,
        ind_rie: document.getElementById('ind-rientro').value,
        ind_per: document.getElementById('ind-pernott').value,
        ind_est: document.getElementById('ind-estero').value
    };

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        setTimeout(() => {
            updateSyncStatus('success');
            btn.innerHTML = '<i class="fas fa-check"></i> OK!';
            setTimeout(() => {
                btn.disabled = false;
                btn.innerHTML = originalText;
                toggleSettings();
                caricaDatiSito();
            }, 1000);
        }, 800);
    } catch (e) {
        updateSyncStatus('error');
        btn.disabled = false;
        btn.innerHTML = 'ERRORE';
    }
}

async function caricaDatiSito() {
    updateSyncStatus('working');
    const mese = document.getElementById('filtro-mese').value;
    const anno = document.getElementById('filtro-anno').value;

    try {
        const r1 = await fetch(`${WEB_APP_URL}?azione=leggi_impostazioni`);
        const j1 = await r1.json();
        const r2 = await fetch(`${WEB_APP_URL}?azione=leggi_storico&mese=${mese}&anno=${anno}`);
        const j2 = await r2.json();

        if (j1.success && j2.success) {
            popolaUI(j1.data, j2.data);
            updateSyncStatus('success');
        } else {
            updateSyncStatus('error');
        }
    } catch (e) {
        console.error(e);
        updateSyncStatus('error');
    }
}

function popolaUI(impo, righe) {
    document.getElementById('base-mensile').value = impo.base;
    document.getElementById('tariffa-25').value = impo.t25;
    document.getElementById('tariffa-50').value = impo.t50;
    document.getElementById('ind-rientro').value = impo.ind_rie;
    document.getElementById('ind-pernott').value = impo.ind_per;
    document.getElementById('ind-estero').value = impo.ind_est;
    document.getElementById('aliquota-tasse').value = impo.tasse;

    let s = { sede:0, rie:0, per:0, est:0, ass:0, h25:0, h50:0, extra:0, ind:0 };
    righe.forEach(r => {
        const tipo = (r.tipo || "").toLowerCase();
        const ass = (r.assenza || "").toLowerCase();
        if (ass !== "" && ass !== "nessuna") { s.ass++; }
        else {
            let v = 0;
            if (tipo.includes("sede")) s.sede++;
            else if (tipo.includes("rientro")) { s.rie++; v = impo.ind_rie; }
            else if (tipo.includes("pernottamento")) { s.per++; v = impo.ind_per; }
            else if (tipo.includes("estero")) { s.est++; v = impo.ind_est; }
            s.ind += v;
            if (r.giorno_sett >= 6) { s.h50 += r.ore_str; s.extra += (r.ore_str * impo.t50); }
            else { s.h25 += r.ore_str; s.extra += (r.ore_str * impo.t25); }
        }
    });

    document.getElementById('ore-sede').innerText = s.sede;
    document.getElementById('ore-rientro').innerText = s.rie;
    document.getElementById('ore-pernott').innerText = s.per;
    document.getElementById('ore-estero').innerText = s.est;
    document.getElementById('ore-assenze').innerText = s.ass;
    document.getElementById('val-25').innerText = s.h25.toFixed(1) + " h";
    document.getElementById('val-50').innerText = s.h50.toFixed(1) + " h";
    document.getElementById('val-indennita').innerText = "€ " + s.ind.toFixed(2);

    const lordo = impo.base + s.extra + s.ind;
    const netto = lordo * (1 - (impo.tasse / 100));
    document.getElementById('valore-lordo').innerText = "€ " + lordo.toLocaleString('it-IT',{minimumFractionDigits:2});
    document.getElementById('valore-netto').innerText = "€ " + netto.toLocaleString('it-IT',{minimumFractionDigits:2});
}

function inizializzaFiltri() {
    const mSel = document.getElementById('filtro-mese');
    const aSel = document.getElementById('filtro-anno');
    if(!mSel) return;
    const mesi = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
    mSel.innerHTML = mesi.map((m, i) => `<option value="${i+1}">${m}</option>`).join('');
    mSel.value = new Date().getMonth() + 1;
    aSel.innerHTML = '<option value="2025">2025</option><option value="2024">2024</option>';
}
