const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec"; // <--- FONDAMENTALE
let datiLocali = [];
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    caricaRubrica();
});

async function caricaRubrica() {
    updateCloudIcon('working');
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        datiLocali = json.data || [];
        renderizzaRubrica(datiLocali);
        updateCloudIcon('success');
    } catch (e) {
        console.error(e);
        updateCloudIcon('error');
    }
}

function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    if (!lista) return;

    if (data.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding:20px; color:var(--subtext)">Nessun contatto in rubrica.</p>`;
        return;
    }

    lista.innerHTML = data.map((c, i) => {
        const nome = c.nome || "-";
        const via = c.via || "";
        const citta = c.citta || "";
        const ref = c.referente || c.ref || "-";
        const tel = c.telefono || c.tel || "-";
        const ind = `${via}, ${citta}`;

        return `
        <div class="card addr-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <span class="primary-text">${nome.toUpperCase()}</span>
                <div style="display:flex; gap:10px">
                    <i class="fas fa-edit" style="color:var(--subtext)" onclick="caricaDatiPerModifica(${i}, '${nome}', '${via}', '${citta}', '${ref}', '${tel}')"></i>
                    <i class="fas fa-trash" style="color:#FF3B30" onclick="eliminaContatto(${i})"></i>
                </div>
            </div>
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user"></i> <b>Ref:</b> ${ref}</div>
            <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${tel}" style="color:var(--primary); text-decoration:none">${tel}</a></div>
            <div class="addr-actions">
                <a href="maps://?q=${encodeURIComponent(ind)}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> MAPS</a>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ind)}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE</a>
            </div>
        </div>`;
    }).reverse().join('');
}

function filtraRubrica() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtrati = datiLocali.filter(c => 
        (c.nome && c.nome.toLowerCase().includes(q)) || 
        (c.citta && c.citta.toLowerCase().includes(q))
    );
    renderizzaRubrica(filtrati);
}

async function azioneSalva() {
    const btn = document.getElementById('btn-save');
    const payload = {
        azione: editIndex !== null ? "modifica_rubrica" : "salva_rubrica",
        index: editIndex,
        nome: document.getElementById('add-nome').value,
        via: document.getElementById('add-via').value,
        citta: document.getElementById('add-citta').value,
        ref: document.getElementById('add-ref').value,
        tel: document.getElementById('add-tel').value
    };

    if (!payload.nome) return alert("Il nome è obbligatorio!");

    btn.disabled = true;
    updateCloudIcon('working');

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        setTimeout(() => window.location.reload(), 500);
    } catch (e) {
        updateCloudIcon('error');
        btn.disabled = false;
    }
}

function caricaDatiPerModifica(idx, n, v, c, r, t) {
    editIndex = idx;
    document.getElementById('add-nome').value = n;
    document.getElementById('add-via').value = v;
    document.getElementById('add-citta').value = c;
    document.getElementById('add-ref').value = r;
    document.getElementById('add-tel').value = t;
    document.getElementById('form-title').innerText = "Modifica Contatto";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function eliminaContatto(idx) {
    if (!confirm("Eliminare il contatto?")) return;
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({azione:"elimina_rubrica", index:idx}) });
        setTimeout(() => window.location.reload(), 500);
    } catch(e) { updateCloudIcon('error'); }
}

function updateCloudIcon(s) {
    const el = document.getElementById('sync-indicator');
    if(el) el.className = `sync-${s} fas fa-cloud`;
}
