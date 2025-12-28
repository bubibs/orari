const fallbackQuotes = [
  { text: "Il successo è la somma di piccoli sforzi ripetuti ogni giorno.", author: "Robert Collier" },
  { text: "La qualità non è mai un caso.", author: "Aristotele" },
  { text: "Scegli un lavoro che ami e non lavorerai un solo giorno.", author: "Confucio" },
  { text: "Il modo migliore per prevedere il futuro è crearlo.", author: "Peter Drucker" },
  { text: "Il lavoro duro batte il talento quando il talento non lavora duro.", author: "Anonimo" }
];

async function loadQuote() {
  try {
    const res = await fetch("https://api.quotable.io/random");
    const data = await res.json();

    document.getElementById("daily-quote").innerText = `"${data.content}"`;
    document.getElementById("quote-author").innerText = `— ${data.author}`;
  } catch (err) {
    const q = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
    document.getElementById("daily-quote").innerText = `"${q.text}"`;
    document.getElementById("quote-author").innerText = `— ${q.author}`;
  }
}

loadQuote();
