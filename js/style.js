:root {
  --bg: #f1f5f9;
  --text: #0f172a;
  --card: #ffffff;
  --primary: #2563eb;
  --muted: #64748b;
  --success: #16a34a;
  --warning: #ca8a04;
  --error: #dc2626;
}

@media (prefers-color-scheme: dark) {
  :root {
    --bg: #020617;
    --text: #e5e7eb;
    --card: #0f172a;
    --primary: #3b82f6;
    --muted: #94a3b8;
  }
}

* {
  box-sizing: border-box;
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
}

html, body {
  height: 100%;
  margin: 0;
}

body {
  background: var(--bg);
  color: var(--text);
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.topbar {
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title h1 {
  margin: 0;
  font-size: 1.8rem;
}

.subtitle {
  font-size: 0.9rem;
  color: var(--muted);
}

.cloud {
  font-size: 0.9rem;
  padding: 6px 12px;
  border-radius: 20px;
}

.cloud.pending { background: #e5e7eb; color: #374151; }
.cloud.ok { background: #dcfce7; color: var(--success); }
.cloud.error { background: #fee2e2; color: var(--error); }

.content {
  flex: 1;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.quote-card {
  background: var(--card);
  padding: 25px;
  border-radius: 16px;
  font-style: italic;
  font-size: 1.1rem;
}

.dashboard {
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;
}

.dashboard button {
  padding: 18px;
  border-radius: 16px;
  border: none;
  background: var(--primary);
  color: white;
  font-size: 1rem;
  cursor: pointer;
}

.dashboard button:hover {
  opacity: 0.9;
}
