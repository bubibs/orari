
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
            <!-- Dynamic Dashboard (Header, Stats, Alert, Quote) -->
            <div id="home-dashboard">
                <div class="text-center" style="padding: 20px 0;">
                    <i class="ph ph-spinner ph-spin text-gold" style="font-size:2rem;"></i>
                </div>
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
             <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px;">
                <button class="btn btn-icon-only" onclick="app.navigate('home')">
                    <i class="ph ph-arrow-left"></i>
                </button>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-icon-only" onclick="app.exportHistory('month')" title="Export Mese CSV">
                        <i class="ph ph-file-csv"></i> Mese
                    </button>
                    <button class="btn btn-icon-only" onclick="app.exportHistory('year')" title="Export Anno CSV">
                        <i class="ph ph-file-csv"></i> Anno
                    </button>
                </div>
            </div>
            <h2 class="text-center text-gold mt-2 mb-4">Storico</h2>
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

            
            <div class="card" id="salary-month-picker-card" style="display:flex; flex-direction:column; align-items:center;">
                <input type="month" id="salary-month" style="margin-bottom:15px; width:100%; max-width:250px; font-size:1.1rem; padding:10px;" onchange="app.renderSalary(this.value)">
                
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
        this.fetchWeather(); // Init Weather
        await this.sync();
    }

    navigate(viewName, params = null) {
        if (!Views[viewName]) return;
        this.currentView = viewName;
        this.root.innerHTML = Views[viewName]();

        // Post-render lifecycle
        if (viewName === 'home') this.renderHomeDashboard(); // CHANGED: Load full dashboard
        if (viewName === 'report') this.initReportForm(params);
        if (viewName === 'contacts') this.renderContacts();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'salary') this.renderSalary(new Date().toISOString().slice(0, 7));
    }

    // --- Weather Logic ---
    async fetchWeather() {
        const container = document.getElementById('weather-header');
        if (!container) return;

        if (!navigator.geolocation) {
            container.innerHTML = '<span style="font-size:0.8rem; opacity:0.7">No GPS</span>';
            return;
        }

        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();

                if (data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    const icon = this.getWeatherIcon(code);

                    container.innerHTML = `
                        <div class="fade-in" style="display:flex; align-items:center; gap:8px;">
                            <i class="${icon}" style="font-size:1.5rem; color:#facc15;"></i>
                            <span style="font-size:1.2rem; font-weight:600;">${temp}°</span>
                        </div>
                    `;
                }
            } catch (e) {
                console.error("Weather error", e);
                container.innerHTML = '<span style="font-size:0.8rem; opacity:0.7">N/A</span>';
            }
        }, err => {
            console.warn("GPS Denied", err);
            container.innerHTML = `<span style="font-size:0.8rem; opacity:0.7">GPS Off</span>`;
        });
    }

    getWeatherIcon(code) {
        // WMO Weather interpretation codes (WW)
        // 0: Clear sky
        // 1, 2, 3: Mainly clear, partly cloudy, and overcast
        // 45, 48: Fog
        // 51-55: Drizzle
        // 61-65: Rain
        // 71-77: Snow
        // 80-82: Rain showers
        // 95-99: Thunderstorm

        if (code === 0) return 'ph ph-sun';
        if (code >= 1 && code <= 3) return 'ph ph-cloud-sun';
        if (code >= 45 && code <= 48) return 'ph ph-cloud-fog';
        if (code >= 51 && code <= 67) return 'ph ph-cloud-rain';
        if (code >= 71 && code <= 77) return 'ph ph-snowflake';
        if (code >= 80 && code <= 82) return 'ph ph-cloud-rain';
        if (code >= 95 && code <= 99) return 'ph ph-cloud-lightning';
        return 'ph ph-sun'; // Default
    }

    // --- Home Dashboard Logic ---
    renderHomeDashboard() {
        const container = document.getElementById('home-dashboard');
        if (!container) return;

        // 1. Date & Greeting
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = now.toLocaleDateString('it-IT', options);
        const hour = now.getHours();
        let greeting = 'Buongiorno';
        if (hour >= 13) greeting = 'Buon Pomeriggio';
        if (hour >= 18) greeting = 'Buonasera';

        // 2. Stats (Current Month Hours)
        // Filter reports for current month YYYY-MM
        const currentMonthKey = now.toISOString().slice(0, 7); // "2025-01"
        const reports = Store.getReports();
        const monthReports = reports.filter(r => r.date.startsWith(currentMonthKey));

        let totalHours = 0;
        let daysWorked = 0;
        monthReports.forEach(r => {
            // Only count if not strict absence (or count as 0 hours if paid absence? Logic says hours played)
            // Typically "Total Hours" means worked hours.
            // If absence, totalHours is usually 0 unless "Permesso" etc.
            // We trust r.totalHours
            totalHours += parseFloat(r.totalHours) || 0;
            if (!r.absence && r.type !== 'Assenza') daysWorked++;
        });

        // 3. Alert Logic (Missing Report)
        // Check if report exists for TODAY "YYYY-MM-DD"
        // And if today is Mon-Fri (1-5)
        const todayStr = now.toISOString().slice(0, 10);
        const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat
        const hasReportToday = reports.some(r => r.date === todayStr);
        const isWorkDay = dayOfWeek >= 1 && dayOfWeek <= 5;

        // Build Alert HTML
        let alertHtml = '';
        if (isWorkDay && !hasReportToday) {
            alertHtml = `
            <div class="alert-box" onclick="app.navigate('report')">
                <div class="alert-content">
                    <i class="ph ph-warning-circle" style="font-size:1.5rem;"></i>
                    <span>Non hai ancora compilato il report di oggi.</span>
                </div>
                <button class="alert-action">Compila Ora</button>
            </div>`;
        } else if (hasReportToday) {
            // Optional: Show success? Or keep clean. User asked for "Missing report alert". 
            // Maybe a subtle "Done" indicator? Let's keep it clean as per "Dashboard".
            // We can show a small green check in the stats area?
        }

        // 4. Quote (Get existing logic)
        // We will fetch it and render it inside the dashboard grid
        const cloudQuote = Store.get(Store.KEYS.DAILY_QUOTE);
        const quoteText = (cloudQuote && cloudQuote.text) ? `"${cloudQuote.text}"` : '"Caricamento ispirazione..."';
        const quoteAuthor = (cloudQuote && cloudQuote.author) ? `- ${cloudQuote.author}` : '';

        // RENDER
        container.innerHTML = `
            <div class="dashboard-header fade-in">
                <div class="dashboard-greeting">${greeting}, Fabio</div>
                <div class="dashboard-date">${dateStr}</div>
            </div>

            ${alertHtml}

            <!-- Stats Row -->
            <div class="stat-card fade-in">
                <div class="stat-item">
                    <div class="stat-value">${totalHours}h</div>
                    <div class="stat-label">Ore Mese</div>
                </div>
                <div style="width:1px; height:40px; background:rgba(255,255,255,0.1);"></div>
                <div class="stat-item">
                    <div class="stat-value">${daysWorked}</div>
                    <div class="stat-label">Giorni Lav.</div>
                </div>
            </div>

            <!-- Quote Widget (Integrated) -->
            <div class="quote-widget fade-in" style="margin-top:10px; border:none; padding-top:0;">
                <p id="daily-quote" class="quote-text">${quoteText}</p>
                <div id="quote-author" class="quote-author">${quoteAuthor}</div>
            </div>
        `;

        // Trigger quote interaction if "Loading..."
        if (!cloudQuote) this.loadQuote();
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
            // REFRESH HOME TO SHOW NEW QUOTE IMMEDIATELY
            if (this.currentView === 'home') this.loadQuote();

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

        // Try getting from Cloud Sync first
        const cloudQuote = Store.get(Store.KEYS.DAILY_QUOTE);

        if (cloudQuote && cloudQuote.text) {
            el.textContent = `"${cloudQuote.text}"`;
            authorEl.textContent = cloudQuote.author ? `- ${cloudQuote.author}` : '';
            return;
        }

        // Fallback (Offline/First Load)
        el.textContent = "\"Caricamento ispirazione...\"";
        authorEl.textContent = "";
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
                    <!-- Highlighted Contact Person -->
                    <div class="contact-highlight">
                        <i class="ph ph-user"></i> ${c.person || 'Nessun referente'}
                    </div>
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
        // SORT REPORTS: Most recent first
        const reports = Store.getReports().sort((a, b) => new Date(b.date) - new Date(a.date));

        // Color/Badge Helper
        const getBadgeClass = (type, isAbsence) => {
            if (isAbsence || type === 'Assenza') return 'badge-assenza';
            if (type === 'Sede') return 'badge-sede';
            if (type === 'Trasferta') return 'badge-trasferta';
            if (type === 'Smart Working') return 'badge-smart';
            return 'badge'; // Default
        };

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

            // Determine Status/Badge (Case Insensitive & Smart Detection)
            const typeNorm = (r.type || '').trim().toUpperCase();
            const noteLower = (r.notes || '').toLowerCase();

            // Treat as Absence if: 
            // 1. Explicitly marked as absence
            // 2. Type is 'Assenza'
            // 3. Notes contain keywords like 'ferie', 'malattia', 'permesso', 'mutua'
            let isAbsence = r.absence === true || String(r.absence) === 'true' || typeNorm === 'ASSENZA';
            if (!isAbsence && (noteLower.includes('ferie') || noteLower.includes('malattia') || noteLower.includes('permesso') || noteLower.includes('mutua') || noteLower.includes('lutto') || noteLower.includes('infortunio'))) {
                isAbsence = true;
            }

            const getBadgeClass = (t, isAbs) => {
                if (isAbs) return 'badge-assenza';
                if (t === 'SEDE') return 'badge-sede';
                if (t.includes('TRASFERTA')) return 'badge-trasferta';
                if (t.includes('SMART')) return 'badge-smart';
                return 'badge';
            };

            const badgeClass = getBadgeClass(typeNorm, isAbsence);
            // If detected via notes, show "ASSENZA" (or specific type if we wanted, but uniform is safer)
            const badgeLabel = isAbsence ? 'ASSENZA' : r.type.toUpperCase();

            // Border Color Logic
            let borderColor = '#eab308'; // Default Yellow
            if (isAbsence) borderColor = '#ef4444'; // Red
            else if (typeNorm === 'SEDE') borderColor = '#3b82f6'; // Blue
            else if (typeNorm.includes('TRASFERTA')) borderColor = '#eab308'; // Yellow
            else if (typeNorm.includes('SMART')) borderColor = '#10b981'; // Green

            // Main Title Logic: If Absence, show the Note (Reason). If Work, show Location.
            const mainTitle = isAbsence ? (r.notes || 'Assenza Generica') : r.location;
            const mainTitleColor = isAbsence ? '#f87171' : 'inherit'; // Red title for absence

            return `
            <div class="card" style="border-left: 4px solid ${borderColor};">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong class="text-gold" style="font-size:1.1rem;">${dateDisplay}</strong>
                         ${r.synced ? '<i class="ph ph-check-circle" style="color:#22c55e; font-size:0.8rem"></i>' : '<i class="ph ph-circle" style="color:#aaa; font-size:0.8rem"></i>'}
                    </div>
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                </div>
                
                <!-- Main Title: Location OR Absence Reason -->
                <div style="font-weight:600; font-size:1rem; margin-bottom:4px; color:${mainTitleColor}; text-transform: capitalize;">
                    ${isAbsence ? '<i class="ph ph-warning-circle"></i> ' : ''}${mainTitle}
                </div>

                ${isAbsence ?
                    /* Absence Layout: Simplified (Title is enough usually, maybe show hours if > 0) */
                    (r.totalHours && r.totalHours !== '0' && r.totalHours !== '0.0' ? `<div style="font-size:0.9rem; color:#aaa;">Ore segnate: <strong>${r.totalHours}</strong></div>` : '')
                    :
                    /* Regular Work Layout: Hours + Notes if any */
                    `<div style="font-size:0.9rem; color:#aaa;">
                        ${r.startTime} - ${r.endTime} &nbsp;|&nbsp; Tot: <strong>${r.totalHours}</strong>
                        ${r.overtime && r.overtime !== '0.0h' ? `<span style="color:#fbbf24; margin-left:5px;">(Str: ${r.overtime})</span>` : ''}
                     </div>
                     ${r.notes ? `<div style="font-size:0.85rem; color:#888; margin-top:5px; font-style:italic;">"${r.notes}"</div>` : ''}`
                }
                
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
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

        const allowanceReturnTotal = daysWorked.rientro * settings.allowanceReturn;
        const allowanceOvernightTotal = daysWorked.notte * settings.allowanceOvernight;
        const allowanceForeignTotal = daysWorked.estero * settings.allowanceForeign;

        const allowance = allowanceReturnTotal + allowanceOvernightTotal + allowanceForeignTotal;

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
            allowanceReturnTotal,
            allowanceOvernightTotal,
            allowanceForeignTotal,
            lordo,
            netto,
            settings
        };
    }

    formatMoney(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '0,00';
        return amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderSalary(monthStr) {
        try {
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
                    <div class="data-row"><span>Base Mensile</span> <strong>€ ${this.formatMoney(stats.base)}</strong></div>
                    <div class="data-row"><span>Str. 25%</span> <strong>€ ${this.formatMoney(stats.extra25)}</strong></div>
                    <div class="data-row"><span>Str. 50%</span> <strong>€ ${this.formatMoney(stats.extra50)}</strong></div>
                    
                    ${stats.allowanceReturnTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Rientro</span> <span>€ ${this.formatMoney(stats.allowanceReturnTotal)}</span></div>` : ''}
                    ${stats.allowanceOvernightTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Pernott.</span> <span>€ ${this.formatMoney(stats.allowanceOvernightTotal)}</span></div>` : ''}
                    ${stats.allowanceForeignTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Estero</span> <span>€ ${this.formatMoney(stats.allowanceForeignTotal)}</span></div>` : ''}
                    ${stats.allowance === 0 ? `<div class="data-row"><span>Indennità</span> <strong>€ 0,00</strong></div>` : ''}

                    <div class="data-row" style="border-top:1px solid rgba(255,255,255,0.1); margin-top:5px; padding-top:5px;">
                        <span>TOTALE LORDO</span> <strong class="text-white">€ ${this.formatMoney(stats.lordo)}</strong>
                    </div>
                </div>

                <div class="card" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%); border:1px solid var(--primary-dim);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>NETTO STIMATO <small style="display:block; font-size:0.7rem; color:#aaa; font-weight:normal;">(CCNL Met. + Coniuge)</small></span>
                        <strong class="text-gold" style="font-size:1.5rem;">€ ${this.formatMoney(stats.netto)}</strong>
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
        } catch (e) {
            console.error("Render Salary Error:", e);
            document.getElementById('salary-stats').innerHTML = `<p class="text-center" style="color:#ef4444;">Errore caricamento dati: ${e.message}</p>`;
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
                 <div class="data-row"><span>Totale Annuo Lordo (+13ma)</span> <strong>€ ${this.formatMoney(annualLordo)}</strong></div>
                 <div class="data-row"><span>Totale Annuo Netto (+13ma)</span> <strong class="text-gold">€ ${this.formatMoney(annualNetto)}</strong></div>
                 <div class="data-row" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#aaa;">
                    <span>Di cui 13ma (Lordo / Netto)</span> <span>€ ${this.formatMoney(tredicesimaLordo)} / € ${this.formatMoney(tredicesimaNetto)}</span>
                 </div>
            </div>
            
            <div style="max-height:400px; overflow-y:auto; padding-right:5px;">
                ${monthsData.map(d => `
                    <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center;">
                        <span style="font-weight:bold; width:20%; color:${d.hasActivity ? 'white' : '#777'};">${d.month}</span>
                        <div style="text-align:right; width:80%;">
                            ${d.hasActivity ? `
                                <div style="font-size:0.9rem; display:flex; justify-content:space-between; margin-left:10%;">
                                    <span>Lord: € ${this.formatMoney(d.lordo)}</span>
                                    <span style="color:#fbbf24;">Net: € ${this.formatMoney(d.netto)}</span>
                                </div>
                            ` : `
                                <div style="font-size:0.8rem; color:#555; text-align:right;">(Base: € ${this.formatMoney(d.base)})</div>
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
