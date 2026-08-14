// js/logic.js

function calcolaOre(inizio, fine, pausa) {
    const [hIn, mIn] = inizio.split(':').map(Number);
    const [hFi, mFi] = fine.split(':').map(Number);
    
    let minutiTotali = (hFi * 60 + mFi) - (hIn * 60 + mIn);
    if (minutiTotali < 0) minutiTotali += 1440; // Gestione mezzanotte
    
    if (pausa && minutiTotali >= 60) minutiTotali -= 60;
    
    const oreDecimali = minutiTotali / 60;
    return parseFloat(oreDecimali.toFixed(2));
}

function calcolaStraordinari(ore, data) {
    // Gestione sicura della data per evitare problemi di fuso orario (UTC vs Locale)
    let d;
    if (typeof data === 'string' && data.includes('-')) {
        const [anno, mese, giorno] = data.split('-').map(Number);
        d = new Date(anno, mese - 1, giorno); // Crea la data nell'ora locale
    } else {
        d = new Date(data);
    }

    const giornoSettimana = d.getDay(); // 0 = Domenica, 6 = Sabato
    let str25 = 0;
    let str50 = 0;

    // Sabato (6) e Domenica (0) vanno entrambi al 50%
    if (giornoSettimana === 0 || giornoSettimana === 6) {
        str50 = ore;
    } else { // Lunedì - Venerdì
        if (ore > 8) str25 = ore - 8;
    }
    
    return { str25, str50 };
}

function stimaNetto(lordo, aliquota) {
    const tasse = lordo * (aliquota / 100);
    return lordo - tasse;
}
