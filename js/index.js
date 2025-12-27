document.addEventListener('DOMContentLoaded', () => {
    const frasi = [
        "Precisione nel lavoro, successo assicurato!",
        "La qualità è la nostra firma.",
        "Eccellenza tecnica Tecnosistem."
    ];
    const quoteEl = document.getElementById('quote');
    if (quoteEl) {
        quoteEl.innerText = `"${frasi[Math.floor(Math.random() * frasi.length)]}"`;
    }
});
