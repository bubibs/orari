function renderizzaRubrica(data) {
    const lista = document.getElementById('lista-rubrica');
    lista.innerHTML = data.map((c, i) => {
        const ind = `${c.via}, ${c.citta}`;
        const linkApple = `maps://?q=${encodeURIComponent(ind)}`;
        const linkGoogle = `http://googleusercontent.com/maps.google.com/3{encodeURIComponent(ind)}`;

        return `
        <div class="card addr-card">
            <div class="addr-header">
                <b>${c.nome.toUpperCase()}</b>
                <div class="admin-btns">
                    <button onclick="caricaDatiPerModifica(${i}, '${c.nome}', '${c.via}', '${c.citta}', '${c.ref}', '${c.tel}')">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button class="del" onclick="eliminaContatto(${i})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            
            <div class="info-row"><i class="fas fa-map-marker-alt"></i> ${ind}</div>
            <div class="info-row"><i class="fas fa-user-tie"></i> ${c.ref || 'Nessun referente'}</div>
            <div class="info-row"><i class="fas fa-phone-alt"></i> <a href="tel:${c.tel}">${c.tel || '-'}</a></div>

            <div class="addr-actions">
                <a href="${linkApple}" class="btn-nav apple-btn">
                    <i class="fab fa-apple"></i> APPLE MAPPE
                </a>
                <a href="${linkGoogle}" target="_blank" class="btn-nav google-btn">
                    <i class="fab fa-google"></i> GOOGLE MAPS
                </a>
            </div>
        </div>`;
    }).reverse().join('');
}
