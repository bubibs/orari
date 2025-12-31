# TECNOSISTEM - WebApp Gestione Interventi

Webapp per la gestione degli interventi lavorativi, calcolo dello stipendio e rubrica contatti, ottimizzata per iPhone.

## 🚀 Caratteristiche

- **Homepage** con frase motivazionale giornaliera e navigazione
- **Inserimento Report** con calcolo automatico delle ore e straordinari
- **Calcolo Stipendio** mensile e annuale con dettagli
- **Rubrica Contatti** con integrazione Maps e chiamate
- **Storico Interventi** con modifica ed eliminazione
- **Sincronizzazione Cloud** tramite Google Apps Script
- **Design Responsive** ottimizzato per iPhone

## 📱 Utilizzo

### Installazione su iPhone

1. Apri Safari su iPhone
2. Vai all'URL della webapp (caricata su GitHub Pages)
3. Tocca il pulsante "Condividi" (box con freccia)
4. Seleziona "Aggiungi alla schermata Home"
5. L'app sarà disponibile come app nativa

### Funzionalità Principali

#### Homepage
- Visualizza stato sincronizzazione cloud
- Mostra frase motivazionale giornaliera
- Navigazione rapida alle sezioni

#### Inserimento Report
- Selezione data e tipo di lavoro
- Calcolo automatico ore totali e straordinarie
- Auto-compilazione per "in sede" (8:00-17:00 con pausa mensa)
- Salvataggio automatico contatti nuovi in rubrica

#### Stipendio
- Selezione mese e anno
- Calcolo automatico lordo e netto
- Dettaglio giorni lavorati, trasferte, assenze
- Impostazioni personalizzabili per paga e indennità

#### Rubrica
- Gestione contatti con azienda, indirizzo, referente, telefono
- Integrazione con Maps per navigazione
- Chiamata diretta dal numero
- Modifica ed eliminazione contatti

#### Storico Interventi
- Visualizzazione tutti i report ordinati per data
- Modifica report esistenti
- Eliminazione report

## 🔧 Configurazione

### Google Apps Script

L'app si connette a Google Apps Script tramite l'endpoint:
```
https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec
```

### Impostazioni Stipendio

Configurabili dalla pagina Impostazioni:
- Paga base mensile
- Paga oraria
- Indennità trasferta con rientro
- Indennità trasferta con pernottamento
- Indennità trasferta estero
- Aliquota tasse

## 💾 Archiviazione

L'app utilizza:
- **LocalStorage** come backup locale
- **Google Apps Script** per sincronizzazione cloud
- I dati vengono salvati sia localmente che sul cloud

## 📋 Struttura File

```
webapp/
├── index.html          # Homepage
├── report.html          # Inserimento report
├── stipendio.html       # Calcolo stipendio
├── impostazioni.html    # Impostazioni stipendio
├── rubrica.html         # Rubrica contatti
├── storico.html         # Storico interventi
├── styles.css           # Stili condivisi
├── api.js               # Funzioni API
├── home.js              # Logica homepage
├── report.js            # Logica report
├── stipendio.js         # Logica stipendio
├── impostazioni.js      # Logica impostazioni
├── rubrica.js           # Logica rubrica
└── storico.js           # Logica storico
```

## 🎨 Design

- Design moderno con gradienti
- Ottimizzato per touch su iPhone
- Animazioni fluide
- Notifiche di feedback
- Stato sincronizzazione visibile

## 📝 Note

- L'app funziona anche offline (salvataggio locale)
- I dati vengono sincronizzati quando possibile
- Le frasi motivazionali cambiano ogni giorno
- I calcoli delle ore sono automatici
- Le ore straordinarie includono sabato e domenica

## 🔄 Sincronizzazione

Lo stato di sincronizzazione viene mostrato in ogni pagina:
- ✅ Sincronizzato
- ⚠️ Non sincronizzato
- ❌ Errore connessione

I dati vengono sempre salvati localmente come backup, anche se la sincronizzazione cloud fallisce.



