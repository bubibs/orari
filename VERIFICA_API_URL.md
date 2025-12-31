# VERIFICA URL API

## IMPORTANTE: Controlla l'URL dell'API

L'URL dell'API è configurato nel file `api.js` alla riga 2:

```javascript
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec';
```

## Come verificare se l'URL è corretto:

1. **Apri il file `api.js`**
2. **Controlla la riga 2** - l'URL deve essere quello del tuo Google Apps Script
3. **Se l'URL è diverso**, devi:
   - Andare su Google Apps Script
   - Cliccare su "Distribuisci" → "Gestisci distribuzioni"
   - Copiare l'URL della distribuzione
   - Incollarlo in `api.js` alla riga 2

## Test rapido dell'URL:

Apri la console del browser (F12) e incolla questo codice:

```javascript
fetch('https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec?action=ping')
  .then(r => r.json())
  .then(d => console.log('✅ URL funziona:', d))
  .catch(e => console.error('❌ URL non funziona:', e));
```

Se vedi `✅ URL funziona: {success: true, message: "Connected"}` allora l'URL è corretto.

Se vedi un errore, l'URL potrebbe essere sbagliato o il Google Apps Script non è pubblicato correttamente.



