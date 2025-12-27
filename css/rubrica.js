:root {
    --primary: #007AFF;
    --bg: #F2F2F7;
    --card: #FFFFFF;
    --text: #1C1C1E;
    --subtext: #8E8E93;
    --border: #D1D1D6;
    --radius: 20px; /* Arrotondamento identico a Index */
}

@media (prefers-color-scheme: dark) {
    :root {
        --bg: #000000;
        --card: #1C1C1E;
        --text: #FFFFFF;
        --subtext: #AEAEB2;
        --border: #38383A;
    }
}

* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
body { 
    background-color: var(--bg); 
    color: var(--text); 
    font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    margin: 0; 
    padding: 15px; 
}

.container { max-width: 500px; margin: 0 auto; }

/* HEADER */
.header-back { 
    display: flex; 
    justify-content: space-between; 
    align-items: center; 
    margin-bottom: 25px; 
    padding: 10px 5px; 
}
.header-back a { 
    text-decoration: none; 
    color: var(--primary); 
    font-weight: 700; 
    font-size: 18px; 
}

/* CARDS (Identiche a Index) */
.card { 
    background: var(--card); 
    border-radius: var(--radius); 
    padding: 22px; 
    margin-bottom: 20px; 
    border: 1px solid var(--border);
    box-shadow: 0 4px 15px rgba(0,0,0,0.08); /* Ombra morbida */
}
.card-accent { border-top: 6px solid var(--primary); }

h2 { font-size: 22px; font-weight: 900; margin: 0 0 20px 0; letter-spacing: -0.5px; }

/* FORM */
.row-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
.form-group { margin-bottom: 18px; }
label { 
    display: block; 
    font-size: 11px; 
    font-weight: 800; 
    color: var(--subtext); 
    margin-bottom: 6px; 
    text-transform: uppercase; 
    letter-spacing: 0.5px;
}
input { 
    width: 100%; 
    padding: 14px; 
    border-radius: 14px; 
    border: 1px solid var(--border); 
    background: var(--bg); 
    color: var(--text); 
    font-size: 16px; 
    outline: none;
    transition: border-color 0.2s;
}
input:focus { border-color: var(--primary); }

.btn-main { 
    background: var(--primary); 
    color: white; 
    border: none; 
    border-radius: 18px; 
    padding: 18px; 
    font-weight: 800; 
    width: 100%; 
    font-size: 16px; 
    margin-top: 10px;
    box-shadow: 0 4px 10px rgba(0, 122, 255, 0.3);
}
.btn-main:active { transform: scale(0.97); }

/* RICERCA */
.search-box { 
    background: var(--card); 
    border-radius: 18px; 
    padding: 15px 20px; 
    display: flex; 
    align-items: center; 
    gap: 12px; 
    margin-bottom: 25px; 
    border: 1px solid var(--border);
    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}
.search-box input { border: none; background: transparent; flex: 1; padding: 0; font-weight: 500; }

/* LISTA CONTATTI */
.addr-card { border-left: 6px solid var(--primary); }
.primary-text { color: var(--primary); font-weight: 900; font-size: 19px; display: block; margin-bottom: 10px; }
.info-row { font-size: 15px; margin-bottom: 8px; color: var(--text); display: flex; align-items: center; gap: 10px; }
.info-row i { color: var(--subtext); font-size: 16px; width: 20px; text-align: center; }
.info-row b { color: var(--subtext); font-weight: 600; margin-right: 4px; }

/* NAVIGAZIONE */
.addr-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 20px; }
.btn-nav { 
    text-decoration: none; 
    padding: 14px; 
    border-radius: 14px; 
    text-align: center;
    font-weight: 800; 
    font-size: 12px; 
    display: flex; 
    align-items: center; 
    justify-content: center; 
    gap: 8px;
    text-transform: uppercase;
}
.apple-btn { background: #000000; color: #ffffff; }
.google-btn { background: #4285F4; color: #ffffff; }

@media (prefers-color-scheme: dark) {
    .apple-btn { background: #ffffff; color: #000000; }
}

/* SYNC ICON */
#sync-indicator { font-size: 20px; transition: 0.3s; }
.sync-working { color: #FF9500; animation: pulse 1s infinite; }
.sync-success { color: #34C759; }
.sync-error { color: #FF3B30; }
@keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
