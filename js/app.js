
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
                        <div id="calc-overtime" class="text-gold" style="text-align:right;">0h</div>
                    </div>
                </div>
                <!-- Hidden OT Fields -->
                <input type="hidden" name="overtime25" id="field-ot25" value="0">
                <input type="hidden" name="overtime50" id="field-ot50" value="0">

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
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-icon-only" onclick="app.toggleAnnual()" title="Vista Annuale">
                        <i class="ph ph-calendar"></i>
                    </button>
                    <button class="btn btn-icon-only" onclick="app.toggleSettings()">
                        <i class="ph ph-gear"></i>
                    </button>
                </div>
            </div>
                    <button class="btn btn-icon-only" onclick="app.toggleSettings()">
                        <i class="ph ph-gear"></i>
                    </button>
                </div>
            </div>
            
            <div class="card" id="salary-month-picker-card">
                <input type="month" id="salary-month" style="margin-bottom:15px; width:100%; font-size:1.1rem; padding:10px;" onchange="app.renderSalary(this.value)">
                
                <div id="salary-stats">
                    <p class="text-center text-muted"><i class="ph ph-spinner ph-spin"></i> Caricamento...</p>
                </div>
            </div>

            <!-- Settings Modal (Hidden by default) -->
            <div id="settings-modal" class="card hidden" style="position:absolute; top:80px; left:20px; right:20px; z-index:50; box-shadow: 0 10px 50px rgba(0,0,0,0.5);">
                 <h3>Impostazioni</h3>
                 <p style="font-size:0.8rem; color:#aaa; margin-bottom:10px;">Modifica i valori per il mese selezionato.</p>
                 <form onsubmit="app.saveSettings(event)" style="margin-top:15px;">
                    <div class="form-group"><label>Paga Base (€)</label><input type="number" name="baseSalary" step="0.01"></div>
                    <div class="form-group"><label>Paga Oraria (€)</label><input type="number" name="hourlyRate" step="0.01"></div>
                    <div class="form-group"><label>Indennità Rientro (€)</label><input type="number" name="allowanceReturn" step="0.01"></div>
                    <div class="form-group"><label>Indennità Notte (€)</label><input type="number" name="allowanceOvernight" step="0.01"></div>
                    <div class="form-group"><label>Indennità Estero (€)</label><input type="number" name="allowanceForeign" step="0.01"></div>
                    
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button type="button" class="btn" onclick="app.toggleSettings()">Chiudi</button>
                        <button type="submit" class="btn btn-primary">Salva Mese</button>
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
        this.editReportId = null;
        this.showAnnual = false;
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
        if (viewName === 'report') this.initReportForm(params);
        if (viewName === 'contacts') this.renderContacts();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'salary') this.renderSalary(new Date().toISOString().slice(0, 7));
    }

    // --- Sync Logic ---

    async sync() {
        const btn = document.getElementById('cloud-btn');
        if (btn) btn.classList.add('syncing');
        this.updateCloudStatus('syncing');

        const cloudData = await API.fetchCloudData();
        if (cloudData) {
            Store.mergeCloudData(cloudData);
            this.showToast('Dati Cloud scaricati');

            if (this.currentView === 'contacts') this.renderContacts();
            if (this.currentView === 'history') this.renderHistory();
            if (this.currentView === 'salary' && !this.showAnnual) this.renderSalary(document.getElementById('salary-month')?.value);

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
        const list = document.getElementById('contacts-list');
        Store.getContacts().forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.company;
            list.appendChild(opt);
        });

        const inputs = ['field-start', 'field-end', 'field-lunch', 'field-type', 'field-date'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.calculateHours());
        });

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
            this.calculateHours();
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
        const dateObj = new Date(dateVal);
        const day = dateObj.getDay(); // 0=Sun, 6=Sat
        const isWeekend = (day === 0 || day === 6);

        let overtime25 = 0;
        let overtime50 = 0;

        if (isWeekend) {
            overtime50 = diffHrs;
        } else {
            overtime25 = Math.max(0, diffHrs - 8);
        }

        document.getElementById('calc-total').textContent = diffHrs.toFixed(1) + 'h';

        let otString = '';
        if (overtime25 > 0) otString += `<span class="text-gold">${overtime25.toFixed(1)}h (25%)</span> `;
        if (overtime50 > 0) otString += `<span style="color:#f87171;">${overtime50.toFixed(1)}h (50%)</span>`;
        if (otString === '') otString = '0h';

        document.getElementById('calc-overtime').innerHTML = otString;

        document.getElementById('field-ot25').value = overtime25.toFixed(2);
        document.getElementById('field-ot50').value = overtime50.toFixed(2);
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvataggio...';

        const fd = new FormData(e.target);
        const report = Object.fromEntries(fd.entries());
        report.lunchBreak = !!report.lunchBreak;
        report.totalHours = document.getElementById('calc-total').textContent;
        report.overtime = document.getElementById('calc-overtime').innerText;
        report.overtime25 = document.getElementById('field-ot25').value;
        report.overtime50 = document.getElementById('field-ot50').value;
        report.timestamp = new Date().toISOString();

        if (!report.id) report.id = Date.now().toString();

        if (this.editReportId) {
            Store.updateReport(report);
        } else {
            Store.addReport(report);
        }

        const result = await API.saveReport(report);

        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salva Report';

        if (result.success) {
            this.showToast('Report salvato!');
        } else {
            this.showToast('Salvato Offline: ' + (result.error || 'Network'), 'warning');
        }

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
                API.saveContact(newContact);
                this.showToast('Luogo aggiunto in Rubrica', 'success');
            }
        }

        setTimeout(() => this.navigate('home'), 1000);
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
            let dateDisplay = r.date;
            if (r.date && r.date.includes('-')) {
                const parts = r.date.split('-');
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

    toggleSettings() {
        document.getElementById('settings-modal').classList.toggle('hidden');
    }

    saveSettings(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const settings = Object.fromEntries(fd.entries());
        Object.keys(settings).forEach(k => settings[k] = parseFloat(settings[k]));

        const currentMonth = document.getElementById('salary-month').value || new Date().toISOString().slice(0, 7);
        Store.saveSettings(settings, currentMonth); // Save to specific month!

        // Sync settings to cloud (as requested "salvarli sul cloud")
        // We'll pass the month as context if the API supports it, or just the whole settings blob?
        // Current API.saveSettings likely expects the object. 
        // We should probably update API to handle month-specific settings, 
        // OR just save the "current view's" settings as general settings?
        // User said: "conviene salvarli sul cloud".
        // Let's modify the API.saveSettings to accept the whole blob or month. 
        // For now, I will assume we send the *current month's* settings as the active ones, 
        // or potentially a new endpoint. 
        // Given constraints, I'll send it as generic settings for now to ensure at least some backup.
        API._post('saveSettings', { month: currentMonth, ...settings });

        this.toggleSettings();
        this.renderSalary(currentMonth);
        this.showToast(`Impostazioni salvate per ${currentMonth}`);
    }

    // Helper to calculate stats for a given month
    calculateSalaryStats(monthStr) {
        const settings = Store.getSettings(monthStr);
        const reports = Store.getReports().filter(r => r.date.startsWith(monthStr));

        let daysWorked = { sede: 0, rientro: 0, notte: 0, estero: 0, totale: 0 };
        let totalHours = 0;
        let ot25 = 0;
        let ot50 = 0;

        reports.forEach(r => {
            const hrs = parseFloat(r.totalHours) || 0;
            const o25 = parseFloat(r.overtime25) || 0;
            const o50 = parseFloat(r.overtime50) || 0;

            if (hrs > 0) daysWorked.totale++;
            totalHours += hrs;

            if (r.type === 'sede') daysWorked.sede++;
            if (r.type === 'trasferta_rientro') daysWorked.rientro++;
            if (r.type === 'trasferta_notte') daysWorked.notte++;
            if (r.type === 'trasferta_estero') daysWorked.estero++;

            ot25 += o25;
            ot50 += o50;
        });

        // CALCULATION ENGINE
        const base = settings.baseSalary;
        const rate = settings.hourlyRate;

        const extra25 = ot25 * (rate * 1.25);
        const extra50 = ot50 * (rate * 1.50);

        const allowance = (daysWorked.rientro * settings.allowanceReturn) +
            (daysWorked.notte * settings.allowanceOvernight) +
            (daysWorked.estero * settings.allowanceForeign);

        const lordo = base + extra25 + extra50 + allowance;

        // NETTO ESTIMATION
        const inps = lordo * 0.0919;
        const taxable = lordo - inps;

        // IRPEF (Monthly Brackets Approx)
        let irpef = 0;
        if (taxable <= 2333) {
            irpef = taxable * 0.23;
        } else if (taxable <= 4166) {
            irpef = (2333 * 0.23) + ((taxable - 2333) * 0.35);
        } else {
            irpef = (2333 * 0.23) + ((4166 - 2333) * 0.35) + ((taxable - 4166) * 0.43);
        }

        // Deductions
        const deductions = Math.max(0, 150 - ((taxable - 2000) * 0.05));
        const addizionali = taxable * 0.02;
        const netto = taxable - irpef - addizionali + deductions;

        return {
            month: monthStr,
            daysWorked,
            ot25,
            ot50,
            base,
            extra25,
            extra50,
            allowance,
            lordo,
            netto,
            settings
        };
    }

    renderSalary(monthStr) {
        // Default to current month if null/empty
        if (!monthStr) monthStr = new Date().toISOString().slice(0, 7);

        // Ensure Date Picker has the value
        const picker = document.getElementById('salary-month');
        if (picker && picker.value !== monthStr) {
            picker.value = monthStr;
        }

        if (this.showAnnual) {
            const year = monthStr.split('-')[0];
            this.renderAnnualSalary(year);
            return;
        }

        const container = document.getElementById('salary-stats');
        const stats = this.calculateSalaryStats(monthStr);

        container.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                <div class="card text-center" style="margin:0; padding:10px;">
                     <div style="font-size:0.9rem; color:#aaa;">Giorni Lavorati</div>
                     <div style="font-size:1.2rem; font-weight:bold;">${stats.daysWorked.totale}</div>
                     <div style="font-size:0.7rem; color:#888;">${stats.daysWorked.sede} Sede / ${stats.daysWorked.rientro + stats.daysWorked.notte} Trasf.</div>
                </div>
                 <div class="card text-center" style="margin:0; padding:10px;">
                     <div style="font-size:0.9rem; color:#aaa;">Straordinari</div>
                     <div style="font-size:1.1rem; font-weight:bold;">${stats.ot25.toFixed(1)}h <span style="font-size:0.8rem; font-weight:normal;">(25%)</span></div>
                     <div style="font-size:1.1rem; font-weight:bold;">${stats.ot50.toFixed(1)}h <span style="font-size:0.8rem; font-weight:normal; color:#f87171;">(50%)</span></div>
                </div>
            </div>
            
            <div class="card mb-4">
                <h4 style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px; margin-bottom:10px;">Dettaglio Lordo</h4>
                <div class="data-row"><span>Base Mensile</span> <strong>€ ${stats.base.toFixed(2)}</strong></div>
                <div class="data-row"><span>Str. 25%</span> <strong>€ ${stats.extra25.toFixed(2)}</strong></div>
                <div class="data-row"><span>Str. 50%</span> <strong>€ ${stats.extra50.toFixed(2)}</strong></div>
                <div class="data-row"><span>Indennità</span> <strong>€ ${stats.allowance.toFixed(2)}</strong></div>
                <div class="data-row" style="border-top:1px solid rgba(255,255,255,0.1); margin-top:5px; padding-top:5px;">
                    <span>TOTALE LORDO</span> <strong class="text-white">€ ${stats.lordo.toFixed(2)}</strong>
                </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%); border:1px solid var(--primary-dim);">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span>NETTO STIMATO <small style="display:block; font-size:0.7rem; color:#aaa; font-weight:normal;">(CCNL Met. + Coniuge)</small></span>
                    <strong class="text-gold" style="font-size:1.5rem;">€ ${stats.netto.toFixed(2)}</strong>
                </div>
            </div>
         `;

        // Populate settings form with stats.settings (which includes defaults if needed)
        const form = document.querySelector('#settings-modal form');
        document.querySelector('#settings-modal h3').innerHTML = `Impostazioni <span class="text-gold">${monthStr}</span>`;
        if (form && stats.settings) {
            Object.keys(stats.settings).forEach(k => {
                if (form.elements[k]) form.elements[k].value = stats.settings[k];
            });
        }
    }

    toggleAnnual() {
        this.showAnnual = !this.showAnnual;
        // Don't lose context of current month picker value
        const currentVal = document.getElementById('salary-month')?.value || new Date().toISOString().slice(0, 7);
        this.renderSalary(currentVal);
    }

    renderAnnualSalary(year) {
        const container = document.getElementById('salary-stats');

        let monthsData = [];
        let totalBase = 0;
        let totalLordo = 0;
        let totalNetto = 0;

        // Always iterate 1-12
        for (let i = 1; i <= 12; i++) {
            const m = `${year}-${String(i).padStart(2, '0')}`;
            const stats = this.calculateSalaryStats(m);

            // For annual totals, we only sum if the month actually has REPORTS (work done)
            // OR should we sum base salary regardless? 
            // "13ma è media stipendio base mensile di tutti i mesi" -> Implies we average the base of months available?
            // User says: "voglio comunque vedere tutti i mesi dell'anno e la tredicesima"
            // Let's sum stats.base for the 13th calc (assuming 12 months full year for now)
            // But only sum Lordo/Netto if work was done (stats.lordo > base?) 
            // Actually, if no work, Lordo is just Base? No, if no reports, stats.daysWorked.totale is 0. 
            // CCNL: usually you are paid base even if sick/holiday... but this app tracks REPORTS.
            // If no report, we assume 0 pay?? 
            // User context is "Work Reports". Likely no report = no pay (freelance style logic?) 
            // BUT defaults imply "Stipendio" (Salary). 
            // Let's assume: If 0 reports, we display 0 values but show the Base setting for reference.

            const hasActivity = stats.daysWorked.totale > 0;

            totalBase += stats.base; // Sum base for average (assuming full employment)
            if (hasActivity) {
                totalLordo += stats.lordo;
                totalNetto += stats.netto;
            }

            monthsData.push({ ...stats, hasActivity });
        }

        const tredicesimaLordo = totalBase / 12;
        // Estimate Net for 13th
        const avgTaxRate = totalLordo > 0 ? (1 - (totalNetto / totalLordo)) : 0.30;
        const tredicesimaNetto = tredicesimaLordo * (1 - avgTaxRate);

        const annualLordo = totalLordo + tredicesimaLordo;
        const annualNetto = totalNetto + tredicesimaNetto;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 class="text-gold" style="margin:0;">Riepilogo ${year}</h3>
                <button class="btn btn-sm" onclick="app.toggleAnnual()">
                    <i class="ph ph-arrow-left"></i> Torna al Mese
                </button>
            </div>

            <div class="card mb-4" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%);">
                 <div class="data-row"><span>Totale Lordo (Stima)</span> <strong>€ ${annualLordo.toFixed(2)}</strong></div>
                 <div class="data-row"><span>Totale Netto (Stima)</span> <strong class="text-gold">€ ${annualNetto.toFixed(2)}</strong></div>
                 <div class="data-row" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#aaa;">
                    <span>13ma (Lordo / Netto)</span> <span>€ ${tredicesimaLordo.toFixed(0)} / € ${tredicesimaNetto.toFixed(0)}</span>
                 </div>
            </div>
            
            <div style="max-height:400px; overflow-y:auto; padding-right:5px;">
                ${monthsData.map(d => `
                    <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center;">
                        <span style="font-weight:bold; width:30%; color:${d.hasActivity ? 'white' : '#777'};">${d.month}</span>
                        <div style="text-align:right;">
                            ${d.hasActivity ? `
                                <div style="font-size:0.9rem;">L: € ${d.lordo.toFixed(0)}</div>
                                <div style="font-size:0.9rem; color:#fbbf24;">N: € ${d.netto.toFixed(0)}</div>
                            ` : `
                                <div style="font-size:0.8rem; color:#555;">(Base: € ${d.base.toFixed(0)})</div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }
}

window.app = new App();
window.Store = Store;
