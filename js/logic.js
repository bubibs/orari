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
    let d;
    
    // Riconosce automaticamente il formato della data (YYYY-MM-DD o DD-MM-YYYY o DD/MM/YYYY)
    if (typeof data === 'string') {
        let parti = data.includes('/') ? data.split('/') : data.split('-');
        
        if (parti.length === 3) {
            if (parti[0].length === 4) {
                // Formato internazionale: Anno-Mese-Giorno
                d = new Date(parti[0], parti[1] - 1, parti[2]);
            } else {
                // Formato italiano: Giorno-Mese-Anno
                // Gestisce anche l'anno a 2 cifre (es "26" diventa "2026")
                let anno = parti[2].length === 2 ? 2000 + parseInt(parti[2]) : parseInt(parti[2]);
                d = new Date(anno, parti[1] - 1, parseInt(parti[0]));
            }
        } else {
            d = new Date(data); // Fallback di sicurezza
        }
    } else {
        d = new Date(data);
    }

    const giornoSettimana = d.getDay(); // 0 = Domenica, 6 = Sabato
    let str25 = 0;
    let str50 = 0;

    // Sabato (6) e Domenica (0) vanno al 50%
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
