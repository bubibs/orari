const quotes = [
  "Il successo arriva quando la preparazione incontra l'opportunità.",
  "Il lavoro ben fatto oggi è la base del successo di domani.",
  "La costanza batte il talento quando il talento non è costante.",
  "Ogni giorno è una nuova occasione per migliorare.",
  "Chi smette di migliorarsi smette di essere bravo."
];

const today = new Date().toDateString();
const index = today.length % quotes.length;

document.getElementById("daily-quote").innerText = quotes[index];
