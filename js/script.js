const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzu-vvnbWmcWiQkhkAueSJ_Y8mbgRszJ3NEjy7TOwMFp9yiVUgaw10gTEGrBJCcAe8q/exec";
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('lista-rubrica')) caricaRubrica();
});

function updateCloudIcon(status) {
    const el = document.getElementById('sync-indicator');
    if (!el) return;
    el.className = `sync-${status}`;
}

async function caricaRubrica() {
    updateCloudIcon('working');
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        renderizzaRubrica(json.data);
        updateCloudIcon('success');
    } catch (e) { updateCloudIcon('error'); }
}

function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    lista.innerHTML = data.map((c, i) => {
        const ind = `${c.via}, ${c.citta}`;
        const linkApple = `maps://?q=${encodeURIComponent(ind)}`;
        const linkGoogle = `https://maps.google.com/?q=${encodeURIComponent(ind)}`;

        return `
        <div class="card addr-card">
            <div class="addr-header">
                <b class="primary-text">${c.nome.toUpperCase()}</b>
                <div class="admin-btns">
                    <button onclick="caricaDatiPerModifica(${i}, '${c.nome}', '${c.via}', '${c.citta}', '${c.ref}', '${c.tel}')"><i class="fas fa-edit"></i></button>
                    <button class="del" onclick="eliminaContatto(${i})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="info-row"><i class="fas fa-map-pin"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user"></i> ${c.ref || '-'}</div>
            <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${c.tel}">${c.tel || '-'}</a></div>
            <div class="addr-actions">
                <a href="${linkApple}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> APPLE MAPPE</a>
                <a href="${linkGoogle}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE MAPS</a>
            </div>
        </div>`;
    }).reverse().join('');
}

async function azioneSalva() {
    const payload = {
        azione: editIndex !== null ? "modifica_rubrica" : "salva_rubrica",
        index: editIndex,
        nome: document.getElementById('add-nome').value,
        via: document.getElementById('add-via').value,
        citta: document.getElementById('add-citta').value,
        ref: document.getElementById('add-ref').value,
        tel: document.getElementById('add-tel').value
    };

    if (!payload.nome || !payload.via) return alert("Compila i campi obbligatori!");
    
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        alert("Operazione completata!");
        window.location.reload();
    } catch (e) { updateCloudIcon('error'); }
}

function caricaDatiPerModifica(index, nome, via, citta, ref, tel) {
    editIndex = index;
    document.getElementById('add-nome').value = nome;
    document.getElementById('add-via').value = via;
    document.getElementById('add-citta').value = citta;
    document.getElementById('add-ref').value = ref;
    document.getElementById('add-tel').value = tel;
    document.getElementById('form-title').innerText = "Modifica Contatto";
    document.getElementById('btn-save').innerText = "AGGIORNA NEL CLOUD";
    window.scrollTo({top: 0, behavior: 'smooth'});
}

async function eliminaContatto(index) {
    if (!confirm("Eliminare definitivamente dal Cloud?")) return;
    updateCloudIcon('working');
    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify({azione: "elimina_rubrica", index: index}) });
        window.location.reload();
    } catch (e) { updateCloudIcon('error'); }
}
