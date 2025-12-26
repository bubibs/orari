const WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwMjZY2BKMAxgcUITrf-BEyb3uXIjToQbTlgGRWjjxdJsse7-azQXzqLiD6IMJS7DKOqw/exec";
let datiLocali = [];
let editIndex = null;

document.addEventListener('DOMContentLoaded', () => {
    // Gestione Frase Motivazionale
    const frasi = ["Precisione nel lavoro!", "La qualità è la nostra firma.", "Intervento rapido, cliente felice."];
    const quoteEl = document.getElementById('quote');
    if (quoteEl) quoteEl.innerText = `"${frasi[Math.floor(Math.random() * frasi.length)]}"`;

    // Caricamento Rubrica se siamo nella pagina giusta
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
        console.error("Errore Cloud:", e);
    }
}

function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    if (!lista) return;

    if (data.length === 0) {
        lista.innerHTML = `<p style="text-align:center; padding:20px; color:var(--subtext)">Nessun contatto trovato.</p>`;
        return;
    }

    lista.innerHTML = data.map((c, i) => {
        const ind = `${c.via}, ${c.citta}`;
        const linkApple = `maps://?q=${encodeURIComponent(ind)}`;
        const linkGoogle = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ind)}`;

        return `
        <div class="card addr-card">
            <div class="addr-header">
                <span class="primary-text">${c.nome.toUpperCase()}</span>
                <div class="admin-btns">
                    <button onclick="caricaDatiPerModifica(${i}, '${c.nome}', '${c.via}', '${c.citta}', '${c.ref}', '${c.tel}')"><i class="fas fa-edit"></i></button>
                    <button onclick="eliminaContatto(${i})" style="color:var(--danger)"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user-circle"></i> ${c.ref || '-'}</div>
            <div class="info-row"><i class="fas fa-phone"></i> <a href="tel:${c.tel}">${c.tel || '-'}</a></div>
            <div class="addr-actions">
                <a href="${linkApple}" class="btn-nav apple-btn"><i class="fab fa-apple"></i> MAPPE APPLE</a>
                <a href="${linkGoogle}" target="_blank" class="btn-nav google-btn"><i class="fab fa-google"></i> GOOGLE MAPS</a>
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

    if (!payload.nome || !payload.via) return alert("Nome e Via sono obbligatori!");

    btn.disabled = true;
    btn.innerText = "SINCRO IN CORSO...";
    updateCloudIcon('working');

    try {
        await fetch(WEB_APP_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(payload) });
        window.location.reload();
    } catch (e) {
        updateCloudIcon('error');
        btn.disabled = false;
        btn.innerText = "ERRORE - RIPROVA";
    }
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
    if (!confirm("Vuoi eliminare definitivamente questo cliente?")) return;
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
