let datiLocali = []; // Per gestire la ricerca senza ricaricare dal cloud

async function caricaRubrica() {
    updateCloudIcon('working');
    try {
        const res = await fetch(`${WEB_APP_URL}?tipo=rubrica`);
        const json = await res.json();
        datiLocali = json.data; // Salviamo i dati per la ricerca
        renderizzaRubrica(datiLocali);
        updateCloudIcon('success');
    } catch (e) { 
        console.error(e);
        updateCloudIcon('error'); 
    }
}

function filtraRubrica() {
    const query = document.getElementById('search-input').value.toLowerCase();
    const filtrati = datiLocali.filter(c => 
        c.nome.toLowerCase().includes(query) || 
        c.citta.toLowerCase().includes(query)
    );
    renderizzaRubrica(filtrati);
}
