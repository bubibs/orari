const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let datiLocali = [];
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => caricaRubrica());

async function caricaRubrica() {
    updateCloudIcon('working');
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        datiLocali = json.data || [];
        renderizzaRubrica(datiLocali);
        updateCloudIcon('success');
    } catch (e) { updateCloudIcon('error'); }
}

function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    if (!lista) return;
    lista.innerHTML = data.map((c, i) => {
        const n = c.nome || "-";
        const v = c.via || "";
        const ct = c.citta || "";
        const r = c.referente || c.ref || "-";
        const t = c.telefono || c.tel || "-";
        const ind = `${v}, ${ct}`;

        return `
        <div class="card addr-card">
            <div style="display:flex; justify-content:space-between; align-items:flex-start">
                <span class="primary-text">${n.toUpperCase()}</span>
                <div style="display:flex; gap:12px">
                    <i class="fas fa-edit" style="color:var(--subtext)" onclick="caricaModifica(${i},'${n}','${v}','${ct}','${r}','${t}')"></i>
                    <i class="fas fa-trash" style="color:#FF3B30" onclick="eliminaContatto(${i})"></i>
                </div>
            </div>
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user"></i> <b>Ref:</b> ${r}</div>
            <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${t}" style="color:var(--primary); text-decoration:none; font-weight:700">${t}</a></div>
            <div class="addr-actions">
                <a href="maps://?q=${encodeURIComponent(ind)}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> MAPPE</a>
                <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ind)}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE</a>
            </div>
        </div>`;
    }).reverse().join('');
}

function filtraRubrica() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const f = datiLocali.filter(c => (c.nome && c.nome.toLowerCase().includes(q)) || (c.citta && c.citta.toLowerCase().includes(q)));
    renderizzaRubrica(f);
}

async function azioneSalva() {
    const b = document.getElementById('btn-save');
    const payload = {
        azione: editIndex !== null ? "modifica_rubrica" : "salva_rubrica",
        index: editIndex,
        nome: document.getElementById('add-nome').value,
        via: document.getElementById('add-via').value,
        citta: document.getElementById('add-citta').value,
        ref: document.getElementById('add-ref').value,
        tel: document.getElementById('add-tel').value
    };
    if (!payload.nome) return alert("Nome obbligatorio");
    b.disabled = true; b.innerText = "SALVATAGGIO...";
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        setTimeout(() => window.location.reload(), 500);
    } catch (e) { updateCloudIcon('error'); b.disabled = false; }
}

function caricaModifica(idx, n, v, ct, r, t) {
    editIndex = idx;
    document.getElementById('add-nome').value = n;
    document.getElementById('add-via').value = v;
    document.getElementById('add-citta').value = ct;
    document.getElementById('add-ref').value = r;
    document.getElementById('add-tel').value = t;
    document.getElementById('form-title').innerText = "Modifica Contatto";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function eliminaContatto(idx) {
    if (!confirm("Eliminare?")) return;
    updateCloudIcon('working');
    await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({azione:"elimina_rubrica", index:idx}) });
    window.location.reload();
}

function updateCloudIcon(s) {
    const icon = document.getElementById('sync-indicator');
    const text = document.getElementById('sync-text');
    if (!icon || !text) return;
    icon.className = 'fas fa-cloud';
    text.className = '';

    if (s === 'working') {
        icon.classList.add('sync-working', 'status-working');
        text.classList.add('status-working');
        text.innerText = "Sincronizzazione...";
    } else if (s === 'success') {
        icon.classList.add('status-success');
        text.classList.add('status-success');
        text.innerText = "Sincronizzato";
        setTimeout(() => { text.innerText = "Connesso"; text.className = ''; icon.className = 'fas fa-cloud'; }, 3000);
    } else if (s === 'error') {
        icon.classList.add('status-error');
        text.classList.add('status-error');
        text.innerText = "Errore Cloud";
    }
}
