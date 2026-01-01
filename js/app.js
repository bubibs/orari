import { Store } from './store.js';
import { API } from './api.js';

// --- View Components (Inline for simplicity in Vanilla) ---

const Views = {
    home: () => `
        <div class="fade-in">
            <div class="quote-widget">
                <p id="daily-quote" class="quote-text">Loading inspiration...</p>
                <div id="quote-author" class="quote-author"></div>
            </div>

            <div class="nav-grid">
                <button class="btn btn-nav" onclick="app.navigate('report')">
                    <i class="ph ph-note-pencil"></i>
                    <span>Nuovo Report</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('history')">
                    <i class="ph ph-clock-counter-clockwise"></i>
                    <span>Storico Interventi</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('salary')">
                    <i class="ph ph-money"></i>
                    <span>Stipendio</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('contacts')">
                    <i class="ph ph-address-book"></i>
                    <span>Rubrica</span>
                </button>
            </div>
        </div>
    `,

    report: () => `
        <div class="fade-in">
            <button class="btn btn-icon-only" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <h2 class="text-center text-gold mt-4 mb-4">Nuovo Report</h2>
            
            <form id="report-form" onsubmit="app.handleReportSubmit(event)">
                <div class="card">
                    <div class="form-group text-center">
                        <label>Data</label>
                        <input type="date" name="date" required id="field-date" class="input-centered">
                    </div>

                    <div class="form-group">
                        <label>Tipo di Lavoro</label>
                        <select name="type" id="field-type" onchange="app.handleTypeChange(this.value)" required>
                            <option value="" disabled selected>-- Seleziona Tipo --</option>
                            <option value="sede">In Sede</option>
                            <option value="trasferta_rientro">Trasferta con Rientro</option>
                            <option value="trasferta_notte">Trasferta con Pernottamento</option>
                            <option value="trasferta_estero">Trasferta Estero</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Assenza</label>
                        <select name="absence" id="field-absence">
                            <option value="">Nessuna</option>
                            <option value="ferie">Ferie</option>
                            <option value="malattia">Malattia</option>
                            <option value="permesso">Permesso</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Orari</label>
                        <div style="display: flex; gap: 10px;">
                            <input type="time" name="startTime" id="field-start" step="1800" required>
                            <input type="time" name="endTime" id="field-end" step="1800" required>
                        </div>
                    </div>

                    <div class="form-group checkbox-wrapper">
                        <input type="checkbox" name="lunchBreak" id="field-lunch">
                        <label for="field-lunch">Pausa Mensa (1h)</label>
                    </div>

                    <div class="form-group">
                        <label>Luogo Intervento</label>
                        <input type="text" name="location" id="field-location" list="contacts-list" placeholder="Cerca azienda..." autocomplete="off">
                        <datalist id="contacts-list"></datalist>
                    </div>

                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="notes" rows="3"></textarea>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Ore Totali:</span>
                        <span id="calc-total" class="text-gold">0h</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Straordinari:</span>
                        <span id="calc-overtime" class="text-gold">0h</span>
                    </div>
                </div>

                <button type="submit" class="btn btn-primary" id="save-btn">
                    <i class="ph ph-floppy-disk"></i> Salva Report
                </button>
            </form>
        </div>
    `,

    contacts: () => `
        <div class="fade-in">
            <button class="btn btn-icon-only" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <h2 class="text-center text-gold mt-4 mb-4">Rubrica</h2>

            <div class="card">
                <h3 style="margin-bottom:15px; font-size:1rem;">Nuovo Contatto</h3>
                <form onsubmit="app.handleContactSubmit(event)">
                    <div class="form-group">
                        <input type="text" name="company" placeholder="Azienda" required>
                    </div>
                    <div class="form-group">
                        <input type="text" name="address" placeholder="Indirizzo">
                    </div>
                    <div class="form-group">
                        <input type="text" name="person" placeholder="Referente">
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" placeholder="Telefono">
                    </div>
                    <button type="submit" class="btn btn-primary">Aggiungi</button>
                </form>
            </div>

            <div id="contacts-list-view">
                <!-- Rendered by JS -->
            </div>
        </div>
    `,

    history: () => `
        <div class="fade-in">
             <button class="btn btn-icon-only" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <h2 class="text-center text-gold mt-4 mb-4">Storico</h2>
            <div id="history-list">
                <!-- Rendered JS -->
            </div>
        </div>
    `,

    salary: () => `
        <div class="fade-in">
             <button class="btn btn-icon-only" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 class="text-gold mt-4 mb-4">Stipendio</h2>
                <button class="btn btn-icon-only" onclick="app.toggleSettings()">
                    <i class="ph ph-gear"></i>
                </button>
            </div>
            
            <div class="card">
                <input type="month" id="salary-month" style="margin-bottom:15px;" onchange="app.renderSalary(this.value)">
                
                <div id="salary-stats">
                    <p>Seleziona un mese per vedere le statistiche.</p>
                </div>
            </div>

            <!-- Settings Modal (Hidden by default) -->
            <div id="settings-modal" class="card hidden" style="position:absolute; top:80px; left:20px; right:20px; z-index:50;">
                 <h3>Impostazioni</h3>
                 <form onsubmit="app.saveSettings(event)" style="margin-top:15px;">
                    <div class="form-group"><label>Paga Base (€)</label><input type="number" name="baseSalary"></div>
                    <div class="form-group"><label>Paga Oraria (€)</label><input type="number" name="hourlyRate" step="0.5"></div>
                    <div class="form-group"><label>Trasferta Rientro (€)</label><input type="number" name="allowanceReturn"></div>
                    <div class="form-group"><label>Trasferta Notte (€)</label><input type="number" name="allowanceOvernight"></div>
                    <div class="form-group"><label>Trasferta Estero (€)</label><input type="number" name="allowanceForeign"></div>
                    <div class="form-group"><label>Aliquota Tasse (%)</label><input type="number" name="taxRate"></div>
                    <div style="display:flex; gap:10px;">
                        <button type="button" class="btn" onclick="app.toggleSettings()">Chiudi</button>
                        <button type="submit" class="btn btn-primary">Salva</button>
                    </div>
                 </form>
            </div>
        </div>
    `
};

// --- Main App Logic ---

class App {
    constructor() {
        this.root = document.getElementById('main-content');
        this.currentView = 'home';
        this.init();
    }

    init() {
        this.navigate('home');
        this.updateCloudStatus();

        // Listen to global back navigation if needed, but we use a simpler approach
    }

    navigate(viewName) {
        if (!Views[viewName]) return;
        this.currentView = viewName;
        this.root.innerHTML = Views[viewName]();

        // Post-render lifecycle
        if (viewName === 'home') this.loadQuote();
        if (viewName === 'report') this.initReportForm();
        if (viewName === 'contacts') this.renderContacts();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'salary') this.renderSalary(new Date().toISOString().slice(0, 7)); // Current YYYY-MM
    }

    // --- Components logic ---

    async loadQuote() {
        const el = document.getElementById('daily-quote');
        const authorEl = document.getElementById('quote-author');
        if (!el) return;

        try {
            // Static fallback phrases if API fails/unavailable or just use a simple list
            const quotes = [
                { text: "L'unico modo per fare un ottimo lavoro è amare quello che fai.", author: "Steve Jobs" },
                { text: "Il successo è la somma di piccoli sforzi, ripetuti giorno dopo giorno.", author: "Robert Collier" },
                { text: "Non aspettare. Il momento non sarà mai quello giusto.", author: "Napoleon Hill" }
            ];
            // Pick based on day of year to change daily
            const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
            const quote = quotes[dayOfYear % quotes.length];

            el.textContent = `"${quote.text}"`;
            authorEl.textContent = `- ${quote.author}`;
        } catch (e) {
            el.textContent = "Buon Lavoro!";
        }
    }

    updateCloudStatus() {
        const el = document.getElementById('cloud-status');
        // Simple mock check
        API.checkHealth().then(online => {
            el.className = `cloud-indicator ${online ? 'synced' : 'error'}`;
        });
    }

    showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === 'success' ? '#22c55e' : '#ef4444';
        toast.innerHTML = `<i class="ph ph-${type === 'success' ? 'check-circle' : 'warning-circle'}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- Report Page ---

    initReportForm() {
        // Pre-fill date
        document.getElementById('field-date').valueAsDate = new Date();

        // Load contacts for datalist
        const list = document.getElementById('contacts-list');
        Store.getContacts().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.company;
            list.appendChild(opt);
        });

        // Add calc listeners
        const inputs = ['field-start', 'field-end', 'field-lunch', 'field-type', 'field-date'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.calculateHours());
        });
    }

    handleTypeChange(type) {
        if (type === 'sede') {
            document.getElementById('field-start').value = '08:00';
            document.getElementById('field-end').value = '17:00';
            document.getElementById('field-lunch').checked = true;
            document.getElementById('field-location').value = 'Tecnosistem';
            this.calculateHours();
        }
    }

    calculateHours() {
        const start = document.getElementById('field-start').value;
        const end = document.getElementById('field-end').value;
        const lunch = document.getElementById('field-lunch').checked;

        if (!start || !end) return;

        const d1 = new Date(`2000-01-01T${start}`);
        const d2 = new Date(`2000-01-01T${end}`);

        // Handle night shift crossing midnight? For now assume same day or user enters correct logic
        let diffMs = d2 - d1;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

        let diffHrs = diffMs / (1000 * 60 * 60);
        if (lunch) diffHrs -= 1;

        if (diffHrs < 0) diffHrs = 0;

        // Overtime: > 8 hours OR weekend
        const dateVal = document.getElementById('field-date').value;
        const isWeekend = new Date(dateVal).getDay() % 6 === 0;

        let overtime = 0;
        if (isWeekend) {
            overtime = diffHrs;
        } else {
            overtime = Math.max(0, diffHrs - 8);
        }

        document.getElementById('calc-total').textContent = diffHrs.toFixed(1) + 'h';
        document.getElementById('calc-overtime').textContent = overtime.toFixed(1) + 'h';
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvataggio...';

        const fd = new FormData(e.target);
        const report = Object.fromEntries(fd.entries());
        report.lunchBreak = !!report.lunchBreak;

        // Add calculated data
        report.totalHours = document.getElementById('calc-total').textContent;
        report.overtime = document.getElementById('calc-overtime').textContent;
        report.timestamp = new Date().toISOString();

        // 1. Save Local
        Store.addReport(report);

        // 2. Try Cloud
        const result = await API.syncReport(report);

        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salva Report';

        if (result.success) {
            this.showToast('Report salvato e sincronizzato!');
        } else {
            console.error(result.error);
            this.showToast('Salvato Offline. Errore: ' + (result.error || 'Network'), 'warning');
        }

        // 3. Check Rubrica
        const existing = Store.getContacts().find(c => c.company === report.location);
        if (report.location && !existing && report.location !== 'Tecnosistem') {
            // Ask to add? Or just auto-add logic? For now simplified.
        }

        setTimeout(() => this.navigate('home'), 1500);
    }

    // --- Contacts Page ---

    renderContacts() {
        const container = document.getElementById('contacts-list-view');
        const contacts = Store.getContacts();

        if (contacts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun contatto salvato.</p>';
            return;
        }

        container.innerHTML = contacts.map(c => `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <strong>${c.company}</strong>
                    <div style="font-size:0.85rem; color:#aaa;">${c.address || ''}</div>
                    <div style="font-size:0.85rem; color:#aaa;">${c.person || ''}</div>
                </div>
                <div style="display:flex; gap:10px;">
                    <a href="https://maps.apple.com/?q=${encodeURIComponent(c.address)}" target="_blank" class="btn btn-icon-only btn-primary">
                        <i class="ph ph-map-pin"></i>
                    </a>
                    ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-icon-only btn-primary"><i class="ph ph-phone"></i></a>` : ''}
                    <button class="btn btn-icon-only" style="background:#ef4444;" onclick="app.deleteContact('${c.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `).join('');
    }

    handleContactSubmit(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        Store.addContact(Object.fromEntries(fd.entries()));
        this.showToast('Contatto aggiunto');
        this.renderContacts();
        e.target.reset();
    }

    deleteContact(id) {
        if (confirm('Eliminare contatto?')) {
            Store.deleteContact(id);
            this.renderContacts();
        }
    }

    // --- History Page ---

    renderHistory() {
        const container = document.getElementById('history-list');
        const reports = Store.getReports();

        if (reports.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun report presente.</p>';
            return;
        }

        container.innerHTML = reports.map(r => `
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <strong class="text-gold">${r.date}</strong>
                    <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${r.type}</span>
                </div>
                <div>${r.location}</div>
                <div style="font-size:0.9rem; color:#aaa; margin-top:5px;">
                    ${r.startTime} - ${r.endTime} (${r.totalHours}) | <span style="color:#ef4444;">${r.absence || ''}</span>
                </div>
                <div style="display:flex; justify-content:flex-end; margin-top:10px;">
                    <button class="btn btn-icon-only" onclick="app.deleteReport('${r.id}')" style="background:#ef4444; width:auto; padding:5px 10px; font-size:0.8rem;">
                        Elimina
                    </button>
                </div>
            </div>
        `).join('');
    }

    deleteReport(id) {
        if (confirm('Eliminare report?')) {
            Store.deleteReport(id);
            this.renderHistory();
        }
    }

    // --- Salary Page ---

    renderSalary(monthStr) { // YYYY-MM
        const container = document.getElementById('salary-stats');
        const settings = Store.getSettings();

        // Filter reports for month
        const reports = Store.getReports().filter(r => r.date.startsWith(monthStr));

        // Calculate
        let daysWorked = 0;
        let totalHours = 0;
        let overtimeNormal = 0; // simplistic, needs rigorous logic
        let overtimeWeekend = 0;
        let travelReturn = 0;
        let travelOvernight = 0;
        let travelForeign = 0;

        reports.forEach(r => {
            const hrs = parseFloat(r.totalHours) || 0;
            const ot = parseFloat(r.overtime) || 0;

            if (hrs > 0) daysWorked++;
            totalHours += hrs;

            if (r.type === 'trasferta_rientro') travelReturn++;
            if (r.type === 'trasferta_notte') travelOvernight++;
            if (r.type === 'trasferta_estero') travelForeign++;

            // Simplified OT logic
            overtimeNormal += ot;
        });

        // Money
        const base = settings.baseSalary;
        const bonusTravel = (travelReturn * settings.allowanceReturn) +
            (travelOvernight * settings.allowanceOvernight) +
            (travelForeign * settings.allowanceForeign);
        const otPay = overtimeNormal * (settings.hourlyRate * 1.25); // assuming 25% for all for now as user simplified request

        const gross = base + bonusTravel + otPay;
        const net = gross * (1 - (settings.taxRate / 100));

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <div class="card text-center" style="margin:0; padding:10px;">
                    <div style="font-size:0.9rem; color:#aaa;">Giorni Lavorati</div>
                    <div style="font-size:1.2rem; font-weight:bold;">${daysWorked}</div>
                </div>
                 <div class="card text-center" style="margin:0; padding:10px;">
                    <div style="font-size:0.9rem; color:#aaa;">Ore Totali</div>
                    <div style="font-size:1.2rem; font-weight:bold;">${totalHours.toFixed(1)}</div>
                </div>
            </div>

            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <span>Lordo Stimato</span>
                    <strong>€ ${gross.toFixed(2)}</strong>
                </div>
                <div style="display:flex; justify-content:space-between; border-top:1px solid rgba(255,255,255,0.1); padding-top:5px;">
                    <span>Netto Stimato</span>
                    <strong class="text-gold" style="font-size:1.2rem;">€ ${net.toFixed(2)}</strong>
                </div>
                <div style="font-size:0.8rem; color:#aaa; margin-top:10px; text-align:center;">
                    Base: ${base} + Trasferte: ${bonusTravel} + Str: ${otPay.toFixed(2)}
                </div>
            </div>
        `;

        // Pre-fill settings form
        const form = document.querySelector('#settings-modal form');
        if (form) {
            Object.keys(settings).forEach(k => {
                if (form.elements[k]) form.elements[k].value = settings[k];
            });
        }
    }

    toggleSettings() {
        const modal = document.getElementById('settings-modal');
        modal.classList.toggle('hidden');
    }

    saveSettings(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const settings = Object.fromEntries(fd.entries());

        // Convert strings to numbers
        Object.keys(settings).forEach(k => settings[k] = parseFloat(settings[k]));

        Store.saveSettings(settings);
        this.toggleSettings();
        this.renderSalary(document.getElementById('salary-month').value);
        this.showToast('Impostazioni salvate');
    }
}

// Initialize Global App
window.app = new App();
// Expose for debugging
window.Store = Store;
