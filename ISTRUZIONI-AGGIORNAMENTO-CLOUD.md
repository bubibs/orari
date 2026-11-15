# Aggiornamento del cloud (Google Apps Script) — da fare una volta

Il file `apps_script_code.gs` è cambiato. Finché non lo aggiorni l'app funziona ancora, ma:
le impostazioni degli altri utenti continuano a sovrascrivere le tue nel foglio "Settings", e i mesi possono
essere trasformati in date da Google Fogli.

## Passi
1. Apri il foglio Google collegato all'app → **Estensioni → Apps Script**.
2. Cancella tutto il codice e incolla il contenuto di `apps_script_code.gs`. Salva.
3. **Distribuisci → Gestisci distribuzioni → (matita) → Versione: Nuova versione → Distribuisci.**
   L'URL resta lo stesso, non devi cambiare nulla nell'app.
4. Apri il foglio "Settings": compariranno le colonne `userId` e `updatedAt` (le righe esistenti restano tue).

## Password amministratore (account `bubibs` / `bubibs@gmail.com`)
- Le credenziali dell'amministratore sono **salvate nel cloud** (foglio "Users"): sono le stesse su ogni dispositivo.
- Nel codice non c'è nessuna password. Se non l'hai mai cambiata è ancora quella vecchia, pubblicata nel repository:
  entra e **cambiala subito da Profilo → Cambia password** (serve la password attuale).
- Se l'hai persa: Apps Script → ⚙ Impostazioni progetto → Proprietà script → aggiungi `ADMIN_PASSWORD` con la nuova password
  (min. 8 caratteri) → torna al codice, scegli la funzione `impostaPasswordAdmin` → Esegui. La proprietà viene cancellata da sola.

## Cosa NON è ancora protetto
Chi conosce l'URL dello script può ancora leggere e scrivere i dati (compresi gli hash delle password).
Per chiuderlo serve l'autenticazione lato server (token di sessione): è il passo successivo consigliato.
