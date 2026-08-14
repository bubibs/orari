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

    if (data instanceof Date) {
        // Se è già un oggetto Date, usiamo i suoi valori locali estraendo anno/mese/giorno
        d = new Date(data.getFullYear(), data.getMonth(), data.getDate(), 12, 0, 0);
    } else if (typeof data === 'string') {
        const str = data.trim();
        let matchIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
        
        if (matchIso) {
            // Formato YYYY-MM-DD (es. 2026-08-15)
            d = new Date(parseInt(matchIso[1], 10), parseInt(matchIso[2], 10) - 1, parseInt(matchIso[3], 10), 12, 0, 0);
        } else {
            let matchIta = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})/);
            if (matchIta) {
                // Formato DD-MM-YYYY (es. 15-08-2026)
                let anno = parseInt(matchIta[3], 10);
                if (anno < 100) anno += 2000;
                d = new Date(anno, parseInt(matchIta[2], 10) - 1, parseInt(matchIta[1], 10), 12, 0, 0);
            } else {
                // FallbackGenerico
                const temp = new Date(data);
                d = new Date(temp.getFullYear(), temp.getMonth(), temp.getDate(), 12, 0, 0);
            }
        }
    } else {
        d = new Date(data);
    }

    // 0 = Domenica, 6 = Sabato
    const giornoSettimana = d.getDay(); 
    let str25 = 0;
    let str50 = 0;

    // Sabato e Domenica vanno al 50%
    if (giornoSettimana === 0 || giornoSettimana === 6) {
        str50 = ore;
    } else { 
        // Da Lunedì a Venerdì: solo le ore oltre le 8 vanno al 25%
        if (ore > 8) str25 = ore - 8;
    }
    
    return { str25, str50 };
}

function stimaNetto(lordo, aliquota) {
    const tasse = lordo * (aliquota / 100);
    return lordo - tasse;
}
