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
    const giornoSettimana = new Date(data).getDay(); // 0 = Domenica, 6 = Sabato
    let str25 = 0;
    let str50 = 0;

    if (giornoSettimana === 0) { // Domenica
        str50 = ore;
    } else if (giornoSettimana === 6) { // Sabato
        str25 = ore;
    } else { // Lun-Ven
        if (ore > 8) str25 = ore - 8;
    }
    
    return { str25, str50 };
}

function stimaNetto(lordo, aliquota) {
    const tasse = lordo * (aliquota / 100);
    return lordo - tasse;
}