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
    let giornoSettimana;

    try {
        // Converte in stringa per l'analisi sicura
        let str = data instanceof Date ? data.toISOString() : String(data);
        let d;

        // Cerca formato Anno-Mese-Giorno (es. 2026-08-15)
        let matchIso = str.match(/(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        if (matchIso) {
            // Fissa l'orario alle 12:00 (Mezzogiorno) per evitare che il fuso orario sposti la data al giorno prima
            d = new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10), 12, 0, 0);
        } else {
            // Cerca formato Giorno-Mese-Anno (es. 15-08-2026)
            let matchIta = str.match(/(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
            if (matchIta) {
                d = new Date(parseInt(matchIta[3], 10), parseInt(matchIta[2], 10) - 1, parseInt(matchIta[1], 10), 12, 0, 0);
            } else {
                // Fallback di sicurezza
                d = !isNaN(data) ? new Date(Number(data)) : new Date(data);
            }
        }
        giornoSettimana = d.getDay();
    } catch (e) {
        giornoSettimana = new Date(data).getDay();
    }

    let str25 = 0;
    let str50 = 0;

    // 0 = Domenica, 6 = Sabato -> Entrambi al 50%
    if (giornoSettimana === 0 || giornoSettimana === 6) {
        str50 = ore;
    } else { // Lunedì - Venerdì -> Ore oltre le 8 vanno al 25%
        if (ore > 8) str25 = ore - 8;
    }
    
    return { str25, str50 };
}

function stimaNetto(lordo, aliquota) {
    const tasse = lordo * (aliquota / 100);
    return lordo - tasse;
}
