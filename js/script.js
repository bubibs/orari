const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let datiLocali = [];
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    const frasi = ["Precisione nel lavoro!", "Qualità Tecnosistem.", "Servizio impeccabile."];
    const q = document.getElementById('quote');
    if (q) q.innerText = `"${frasi[Math.floor(Math.random() * frasi.length)]}"`;
    if (document.getElementById('lista-rubrica')) caricaRubrica();
});

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
        // LEGGE I DATI ANCHE SE LE COLONNE HANNO NOMI DIVERSI
        const n = c.nome || "-";
        const v = c.via || "";
        const ct = c.citta || "";
        const r = c.referente || c.ref || "-";
        const t = c.telefono || c.tel || "-";
        
        const ind = `${v}, ${ct}`;
        return `
        <div class="card addr-card">
            <div class="addr-header">
                <span class="primary-text">${n.toUpperCase()}</span>
                <div class="admin-btns">
                    <button onclick="caricaModifica(${i},'${n}','${v}','${ct}','${r}','${t}')"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminaContatto(${i})" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user"></i> <b>Ref:</b> ${r}</div>
            <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${t}">${t}</a></div>
            <div class="addr-actions">
                <a href="maps://?q=${encodeURIComponent(ind)}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> MAPPE</a>
                <a href="http://maps.google.com/?q=${encodeURIComponent(ind)}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE</a>
            </div>
        </div>`;
    }).reverse().join('');
}

function filtraRubrica() {
    const val = document.getElementById('search-input').value.toLowerCase();
    const filtrati = datiLocali.filter(c => (c.nome && c.nome.toLowerCase().includes(val)) || (c.citta && c.citta.toLowerCase().includes(val)));
    renderizzaRubrica(filtrati);
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
    if (!payload.nome) return alert("Inserisci almeno il nome!");
    b.disabled = true; b.innerText = "SALVATAGGIO...";
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        window.location.reload();
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
    window.scrollTo(0,0);
}

async function eliminaContatto(idx) {
    if (!confirm("Eliminare?")) return;
    updateCloudIcon('working');
    await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({azione:"elimina_rubrica", index:idx}) });
    window.location.reload();
}

function updateCloudIcon(s) {
    const el = document.getElementById('sync-indicator');
    if(el) el.className = `sync-${s}`;
}
