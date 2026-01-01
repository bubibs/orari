
import { Store } from './store.js';
import { API } from './api.js';

// --- Helper: Generate Time Options ---
const generateTimeOptions = (selected = '') => {
    let options = '<option value="" disabled selected>--:--</option>'; // Default empty
    for (let h = 0; h < 24; h++) {
        for (let m of ['00', '30']) {
            const time = `${h.toString().padStart(2, '0')}:${m}`;
            const isSelected = time === selected ? 'selected' : '';
            options += `<option value="${time}" ${isSelected}>${time}</option>`;
        }
    }
    return options;
};

// --- View Components ---

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
            <h2 class="text-center text-gold mt-4 mb-4" id="report-title">Nuovo Report</h2>
            
            <form id="report-form" onsubmit="app.handleReportSubmit(event)">
                <input type="hidden" name="id" id="field-id"> <!-- Hidden ID for edits -->
                
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
                        <label>Orari (Step 30 min)</label>
                        <div style="display: flex; gap: 10px;">
                            <select name="startTime" id="field-start" required>${generateTimeOptions()}</select>
                            <select name="endTime" id="field-end" required>${generateTimeOptions()}</select>
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
                        <textarea name="notes" rows="3" id="field-notes"></textarea>
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

            <div class="card" id="contact-form-card">
                <h3 style="margin-bottom:15px; font-size:1rem;" id="contact-form-title">Nuovo Contatto</h3>
                <form onsubmit="app.handleContactSubmit(event)" id="contact-form">
                    <input type="hidden" name="id" id="contact-id">
                    <div class="form-group">
                        <input type="text" name="company" id="contact-company" placeholder="Azienda" required>
                    </div>
                    <!-- Split Address -->
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
                        <div class="form-group">
                            <input type="text" name="street" id="contact-street" placeholder="Via/Piazza">
                        </div>
                         <div class="form-group">
                            <input type="text" name="number" id="contact-number" placeholder="N°">
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="text" name="city" id="contact-city" placeholder="Città">
                    </div>
                    
                    <div class="form-group">
                        <input type="text" name="person" id="contact-person" placeholder="Referente">
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" id="contact-phone" placeholder="Telefono">
                    </div>
                    <div style="display:flex; gap:10px;">
                         <button type="submit" class="btn btn-primary" style="flex:1;">Salva</button>
                         <button type="button" class="btn hidden" id="contact-cancel-edit" onclick="app.cancelContactEdit()">Annulla</button>
                    </div>
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
        this.editReportId = null; // Track if we are editing
        this.init();
    }

    async init() {
        this.navigate('home');
        this.updateCloudStatus();

        // Auto-sync on start
        console.log("Auto-syncing data...");
        await this.sync();
    }

    navigate(viewName, params = null) {
        if (!Views[viewName]) return;
        this.currentView = viewName;
        this.root.innerHTML = Views[viewName]();

        // Post-render lifecycle
        if (viewName === 'home') this.loadQuote();
        if (viewName === 'report') this.initReportForm(params); // params might contain report to edit
        if (viewName === 'contacts') this.renderContacts();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'salary') this.renderSalary(new Date().toISOString().slice(0, 7));
    }

    // --- Sync Logic ---

    async sync() {
        const btn = document.getElementById('cloud-btn');
        if (btn) btn.classList.add('syncing');
        this.updateCloudStatus('syncing');

        // 1. Fetch Cloud Data & Merge
        const cloudData = await API.fetchCloudData();
        if (cloudData) {
            Store.mergeCloudData(cloudData);
            this.showToast('Dati Cloud scaricati');

            // Refresh views with new data
            if (this.currentView === 'contacts') this.renderContacts();
            if (this.currentView === 'history') this.renderHistory();
            if (this.currentView === 'salary') this.renderSalary(document.getElementById('salary-month')?.value);

        } else {
            console.warn("Sync returned null or failed");
        }

        if (btn) btn.classList.remove('syncing');
        this.updateCloudStatus();
    }

    updateCloudStatus(forceState) {
        const container = document.getElementById('cloud-status');
        const icon = document.getElementById('cloud-icon');

        if (forceState === 'syncing') {
            container.className = 'cloud-indicator syncing';
            icon.className = 'ph ph-arrows-clockwise ph-spin';
            return;
        }

        API.checkHealth().then(online => {
            container.className = `cloud-indicator ${online ? 'synced' : 'error'}`;
            icon.className = online ? 'ph ph-cloud-check' : 'ph ph-cloud-slash';
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

    // --- Components logic ---
    async loadQuote() {
        // ... existing quote logic
        const el = document.getElementById('daily-quote');
        const authorEl = document.getElementById('quote-author');
        if (!el) return;
        const quotes = [
            { text: "L'unico modo per fare un ottimo lavoro è amare quello che fai.", author: "Steve Jobs" },
            { text: "Il successo è la somma di piccoli sforzi, ripetuti giorno dopo giorno.", author: "Robert Collier" },
            { text: "Non aspettare. Il momento non sarà mai quello giusto.", author: "Napoleon Hill" }
        ];
        const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 1000 / 60 / 60 / 24);
        const quote = quotes[dayOfYear % quotes.length];
        el.textContent = `"${quote.text}"`;
        authorEl.textContent = `- ${quote.author}`;
    }

    // --- Report Page ---

    initReportForm(reportToEdit = null) {
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

        // If Editing?
        if (reportToEdit) {
            this.editReportId = reportToEdit.id;
            document.getElementById('report-title').innerText = "Modifica Report";
            document.getElementById('field-id').value = reportToEdit.id;
            document.getElementById('field-date').value = reportToEdit.date;
            document.getElementById('field-type').value = reportToEdit.type;
            document.getElementById('field-absence').value = reportToEdit.absence || '';
            document.getElementById('field-start').value = reportToEdit.startTime;
            document.getElementById('field-end').value = reportToEdit.endTime;
            document.getElementById('field-lunch').checked = reportToEdit.lunchBreak;
            document.getElementById('field-location').value = reportToEdit.location;
            document.getElementById('field-notes').value = reportToEdit.notes || '';
            this.calculateHours(); // Updates totals
        } else {
            this.editReportId = null;
            document.getElementById('field-date').valueAsDate = new Date();
            this.calculateHours();
        }
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

        let diffMs = d2 - d1;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

        let diffHrs = diffMs / (1000 * 60 * 60);
        if (lunch) diffHrs -= 1;
        if (diffHrs < 0) diffHrs = 0;

        const dateVal = document.getElementById('field-date').value;
        const isWeekend = new Date(dateVal).getDay() % 6 === 0;

        let overtime = 0;
        if (isWeekend) overtime = diffHrs;
        else overtime = Math.max(0, diffHrs - 8);

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
        report.totalHours = document.getElementById('calc-total').textContent;
        report.overtime = document.getElementById('calc-overtime').textContent;
        report.timestamp = new Date().toISOString();

        if (!report.id) report.id = Date.now().toString();

        // 1. Save Local (Update if exists)
        if (this.editReportId) {
            Store.updateReport(report);
        } else {
            Store.addReport(report);
        }

        // 2. Try Cloud
        const result = await API.saveReport(report);

        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salva Report';

        if (result.success) {
            this.showToast('Report salvato!');
        } else {
            this.showToast('Salvato Offline: ' + (result.error || 'Network'), 'warning');
        }

        // 3. Auto-save new Contact
        const locationName = report.location;
        if (locationName && locationName.toLowerCase() !== 'tecnosistem') {
            const exists = Store.getContacts().find(c => c.company.toLowerCase() === locationName.toLowerCase());
            if (!exists) {
                const newContact = {
                    id: Date.now().toString() + '_auto',
                    company: locationName,
                    city: '', street: '', number: '', person: '', phone: ''
                };
                Store.addContact(newContact);
                console.log('Auto-saved new contact:', locationName);
                API.saveContact(newContact); // Background sync
                this.showToast('Luogo aggiunto in Rubrica', 'success');
            }
        }

        setTimeout(() => this.navigate('home'), 1000); // Redirect to Home
    }

    // --- Contacts Page ---

    renderContacts() {
        const container = document.getElementById('contacts-list-view');
        const contacts = Store.getContacts();

        if (contacts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun contatto.</p>';
            return;
        }

        container.innerHTML = contacts.map(c => {
            const fullAddress = [c.street, c.number, c.city].filter(Boolean).join(', ');
            return `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <strong>${c.company}</strong>
                    <div style="font-size:0.85rem; color:#aaa;">${fullAddress || 'Nessun indirizzo'}</div>
                    <div style="font-size:0.85rem; color:#aaa;">${c.person || ''}</div>
                </div>
                <div style="display:flex; gap:8px;">
                     <button class="btn btn-icon-only text-white" style="background:#3b82f6;" onclick="app.editContact('${c.id}')">
                        <i class="ph ph-pencil-simple" style="color:white; font-weight:bold;"></i>
                    </button>
                    ${fullAddress ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}" target="_blank" class="btn btn-icon-only btn-primary"><i class="ph ph-map-pin"></i></a>` : ''}
                    ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-icon-only btn-primary"><i class="ph ph-phone"></i></a>` : ''}
                    <button class="btn btn-icon-only" style="background:#ef4444;" onclick="app.deleteContact('${c.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');
    }

    editContact(id) {
        const c = Store.getContacts().find(x => x.id === id);
        if (!c) return;

        document.getElementById('contact-form-title').innerText = "Modifica Contatto";
        document.getElementById('contact-id').value = c.id;
        document.getElementById('contact-company').value = c.company;
        document.getElementById('contact-city').value = c.city || '';
        document.getElementById('contact-street').value = c.street || '';
        document.getElementById('contact-number').value = c.number || '';
        document.getElementById('contact-person').value = c.person;
        document.getElementById('contact-phone').value = c.phone;

        document.getElementById('contact-cancel-edit').classList.remove('hidden');
        document.getElementById('contact-form-card').scrollIntoView({ behavior: 'smooth' });
    }

    cancelContactEdit() {
        document.getElementById('contact-form').reset();
        document.getElementById('contact-id').value = '';
        document.getElementById('contact-form-title').innerText = "Nuovo Contatto";
        document.getElementById('contact-cancel-edit').classList.add('hidden');
    }

    handleContactSubmit(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const contact = Object.fromEntries(fd.entries());

        if (contact.id) {
            Store.updateContact(contact);
            this.showToast('Contatto aggiornato');
        } else {
            Store.addContact(contact);
            this.showToast('Contatto aggiunto');
        }

        this.renderContacts();
        this.cancelContactEdit();

        API.saveContact(contact);
    }

    deleteContact(id) {
        if (confirm('Eliminare contatto?')) {
            Store.deleteContact(id);
            this.renderContacts();
            API.deleteContact(id);
        }
    }

    // --- History Page ---

    renderHistory() {
        const container = document.getElementById('history-list');
        const reports = Store.getReports();

        if (reports.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun report.</p>';
            return;
        }

        container.innerHTML = reports.map(r => {
            // Manual parse YYYY-MM-DD to dd/mm/yyyy to assume local date and avoid timezone shifts
            let dateDisplay = r.date;
            if (r.date && r.date.includes('-')) {
                const parts = r.date.split('-'); // [YYYY, MM, DD]
                if (parts.length === 3) {
                    dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            return `
            <div class="card">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong class="text-gold" style="font-size:1.1rem;">${dateDisplay}</strong>
                         ${r.synced ? '<i class="ph ph-check-circle" style="color:#22c55e; font-size:0.8rem"></i>' : '<i class="ph ph-circle" style="color:#aaa; font-size:0.8rem"></i>'}
                    </div>
                    <span style="font-size:0.8rem; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px;">${r.type}</span>
                </div>
                <div style="font-weight:600; margin-bottom:4px;">${r.location}</div>
                <div style="font-size:0.9rem; color:#aaa;">
                    ${r.startTime} - ${r.endTime} &nbsp;|&nbsp; Tot: <strong>${r.totalHours}</strong>
                    ${r.overtime !== '0.0h' ? `<span style="color:#fbbf24; margin-left:5px;">(Str: ${r.overtime})</span>` : ''}
                </div>
                ${r.notes ? `<div style="font-size:0.85rem; color:#888; margin-top:5px; font-style:italic;">"${r.notes}"</div>` : ''}
                
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:15px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
                    <button class="btn btn-icon-only text-white" style="background:#3b82f6; width:auto; padding:6px 12px; color:white !important;" onclick="app.editReport('${r.id}')">
                        <i class="ph ph-pencil-simple" style="color:white !important;"></i> Modifica
                    </button>
                    <button class="btn btn-icon-only text-white" style="background:#ef4444; width:auto; padding:6px 12px; color:white !important;" onclick="app.deleteReport('${r.id}')">
                        <i class="ph ph-trash" style="color:white !important;"></i> Elimina
                    </button>
                </div>
            </div>
        `}).join('');
    }

    editReport(id) {
        const r = Store.getReports().find(x => x.id === id);
        if (r) {
            this.navigate('report', r);
        }
    }

    deleteReport(id) {
        if (confirm('Eliminare report definitivamente?')) {
            Store.deleteReport(id);
            this.renderHistory();
            API._post('deleteReport', { id });
        }
    }

    // --- Salary Page ---

    renderSalary(monthStr) {
        if (!monthStr) return;
        const container = document.getElementById('salary-stats');
        const settings = Store.getSettings();
        const reports = Store.getReports().filter(r => r.date.startsWith(monthStr));

        let daysWorked = 0;
        let totalHours = 0;
        let overtimeNormal = 0;
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
            overtimeNormal += ot;
        });

        const base = settings.baseSalary;
        const bonusTravel = (travelReturn * settings.allowanceReturn) +
            (travelOvernight * settings.allowanceOvernight) +
            (travelForeign * settings.allowanceForeign);
        const otPay = overtimeNormal * (settings.hourlyRate * 1.25);
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
            </div>
         `;

        // Populate settings form
        const form = document.querySelector('#settings-modal form');
        if (form && settings) {
            Object.keys(settings).forEach(k => {
                if (form.elements[k]) form.elements[k].value = settings[k];
            });
        }
    }

    toggleSettings() {
        document.getElementById('settings-modal').classList.toggle('hidden');
    }

    saveSettings(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const settings = Object.fromEntries(fd.entries());
        Object.keys(settings).forEach(k => settings[k] = parseFloat(settings[k]));
        Store.saveSettings(settings);
        this.toggleSettings();
        this.renderSalary(document.getElementById('salary-month').value);
        this.showToast('Impostazioni salvate');
        API.saveSettings(settings);
    }
}

window.app = new App();
window.Store = Store;
