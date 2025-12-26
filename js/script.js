const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let datiLocali = [];
let editIndex = null;

const frasiMotivazionali = [
    "Precisione nel lavoro, successo assicurato!",
    "La qualità è la nostra firma.",
    "Ogni intervento conta.",
    "Eccellenza tecnica, impegno costante."
];

document.addEventListener('DOMContentLoaded', () => {
    // Gestione Home
    const quoteEl = document.getElementById('quote');
    if (quoteEl) {
        quoteEl.innerText = `"${frasiMotivazionali[Math.floor(Math.random() * frasiMotivazionali.length)]}"`;
    }

    // Gestione Rubrica
    if (document.getElementById('lista-rubrica')) {
        caricaRubrica();
    }
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
        updateCloudIcon('error');
    }
}

function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    if (!lista) return;
    lista.innerHTML = data.map((c, i) => {
        const ind = `${c.via}, ${c.citta}`;
        const linkApple = `maps://?q=${encodeURIComponent(ind)}`;
        const linkGoogle = `http://googleusercontent.com/maps.google.com/4{encodeURIComponent(ind)}`;

        return `
        <div class="card addr-card">
            <div class="addr-header">
                <span class="primary-text">${c.nome.toUpperCase()}</span>
                <div class="admin-btns">
                    <button onclick="caricaDatiPerModifica(${i}, '${c.nome}', '${c.via}', '${c.citta}', '${c.ref}', '${c.tel}')"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminaContatto(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div style="font-size:14px; margin-bottom:5px;"><i class="fas fa-map-marker-alt" style="color:var(--subtext)"></i> ${ind}</div>
            <div style="font-size:14px;"><i class="fas fa-phone" style="color:var(--subtext)"></i> <a href="tel:${c.tel}" style="color:var(--primary); text-decoration:none; font-weight:bold;">${c.tel || '-'}</a></div>
            <div class="addr-actions">
                <a href="${linkApple}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> APPLE MAPS</a>
                <a href="${linkGoogle}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE</a>
            </div>
        </div>`;
    }).reverse().join('');
}

function filtraRubrica() {
    const q = document.getElementById('search-input').value.toLowerCase();
    const filtrati = datiLocali.filter(c => c.nome.toLowerCase().includes(q) || c.citta.toLowerCase().includes(q));
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

    if (!payload.nome || !payload.via) return alert("Manca Nome o Via!");

    btn.disabled = true;
    btn.innerText = "SINCRO...";
    updateCloudIcon('working');

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        window.location.reload();
    } catch (e) {
        updateCloudIcon('error');
        btn.disabled = false;
        btn.innerText = "SALVA NEL CLOUD";
    }
}

function caricaDatiPerModifica(index, nome, via, citta, ref, tel) {
    editIndex = index;
    document.getElementById('add-nome').value = nome;
    document.getElementById('add-via').value = via;
    document.getElementById('add-citta').value = citta;
    document.getElementById('add-ref').value = ref;
    document.getElementById('add-tel').value = tel;
    document.getElementById('form-title').innerText = "Modifica";
    document.getElementById('btn-save').innerText = "AGGIORNA";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function eliminaContatto(index) {
    if (!confirm("Eliminare dal Cloud?")) return;
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({azione:"elimina_rubrica", index:index}) });
        window.location.reload();
    } catch (e) { updateCloudIcon('error'); }
}

function updateCloudIcon(s) {
    const el = document.getElementById('sync-indicator');
    if(el) el.className = `sync-${s}`;
}
