export const Store = {
    // Keys
    KEYS: {
        SETTINGS: 'tecnosistem_settings',
        CONTACTS: 'tecnosistem_contacts',
        REPORTS: 'tecnosistem_reports',
        DAILY_QUOTE: 'tecnosistem_quote',
        QUEUE: 'tecnosistem_sync_queue'
    },

    // Helper to normalize month key to YYYY-MM (e.g. "Thu Oct 01 2026..." -> "2026-10")
    normalizeMonthKey(key, value) {
        if (!key || key === 'default') return 'default';

        // 1. Check if key is already YYYY-MM
        const mIso = String(key).match(/^(\d{4})-(\d{2})$/);
        if (mIso) return `${mIso[1]}-${mIso[2]}`;

        // 2. Check for Date string e.g. "Thu Oct 01 2026 00:00:00..."
        const months = {
            'jan': '01', 'gen': '01',
            'feb': '02',
            'mar': '03',
            'apr': '04',
            'may': '05', 'mag': '05',
            'jun': '06', 'giu': '06',
            'jul': '07', 'lug': '07',
            'aug': '08', 'ago': '08',
            'sep': '09', 'set': '09',
            'oct': '10', 'ott': '10',
            'nov': '11',
            'dec': '12', 'dic': '12'
        };
        const mDate = String(key).match(/([A-Za-z]{3})\s+\d{1,2}\s+(\d{4})/);
        if (mDate) {
            const mName = mDate[1].toLowerCase();
            const year = mDate[2];
            if (months[mName]) {
                return `${year}-${months[mName]}`;
            }
        }

        // 3. Fallback: check value.month if available
        if (value && value.month && value.month !== 'default') {
            const vIso = String(value.month).match(/^(\d{4})-(\d{2})/);
            if (vIso) return `${vIso[1]}-${vIso[2]}`;

            const d = new Date(value.month);
            if (!isNaN(d.getTime())) {
                const midday = new Date(d.getTime() + 12 * 3600 * 1000);
                const y = midday.getUTCFullYear();
                const m = String(midday.getUTCMonth() + 1).padStart(2, '0');
                return `${y}-${m}`;
            }
        }

        return key;
    },

    // --- Settings (Month-Specific) ---
    getSettings(monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};
        const normMonth = this.normalizeMonthKey(monthStr);

        // 1. Try specific month (normalized or raw)
        let settings = allSettings[normMonth] || allSettings[monthStr];

        // 2. Try 'default' if month not found
        if (!settings && allSettings['default']) {
            settings = allSettings['default'];
        }

        // 3. Fallback/Init Defaults
        const defaults = {
            baseSalary: 3480.76,
            hourlyRate: 17.23,
            allowanceReturn: 30.00,
            allowanceOvernight: 60.00,
            allowanceForeign: 105.00,
            taxRate: 27
        };

        // If settings found, merge with defaults to ensure all keys exist and are numeric
        if (settings) {
            // Aggressive legacy purge (baseSalary 2000 or 1500)
            if (settings.baseSalary === 2000 || settings.baseSalary === 1500) {
                return defaults;
            }

            const merged = { ...defaults, ...settings };
            // Ensure all values are numbers
            Object.keys(merged).forEach(k => {
                if (typeof merged[k] !== 'number' || isNaN(merged[k])) {
                    merged[k] = defaults[k] || 0;
                }
            });
            return merged;
        }

        // Save as default for future if completely empty
        if (Object.keys(allSettings).length === 0) {
            this.saveSettings(defaults, 'default');
        }

        return defaults;
    },

    saveSettings(settings, monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};
        const normMonth = this.normalizeMonthKey(monthStr);
        allSettings[normMonth] = settings;
        this.set(this.KEYS.SETTINGS, allSettings);
    },

    init() {
        if (!localStorage.getItem(this.KEYS.REPORTS)) this.set(this.KEYS.REPORTS, []);
        if (!localStorage.getItem(this.KEYS.CONTACTS)) this.set(this.KEYS.CONTACTS, []);

        // Settings Migration & Cleanup
        const settingsRaw = localStorage.getItem(this.KEYS.SETTINGS);
        if (settingsRaw) {
            try {
                let allSettings = JSON.parse(settingsRaw);

                // 1. Convert old flat format to new structure
                // Logic: if it has 'baseSalary' AND does not have 'default' or valid month keys, it's old.
                if (allSettings.baseSalary !== undefined && !allSettings['default']) {
                    console.log("Migrating settings to new format...");
                    allSettings = { 'default': allSettings };
                }

                // 2. Normalize and migrate any non YYYY-MM keys
                let updated = false;
                Object.keys(allSettings).forEach(k => {
                    if (k !== 'default' && !k.match(/^\d{4}-\d{2}$/)) {
                        const normKey = this.normalizeMonthKey(k, allSettings[k]);
                        if (normKey && normKey !== k) {
                            allSettings[normKey] = { ...(allSettings[normKey] || {}), ...allSettings[k] };
                            delete allSettings[k];
                            updated = true;
                        }
                    }
                });

                // 3. Aggressively purge "2000" defaults which the user hates
                if (allSettings['default']) {
                    const d = allSettings['default'];
                    // Fuzzy check for 2000 or 1500 (legacy values)
                    if (Math.abs(d.baseSalary - 2000) < 1 || Math.abs(d.baseSalary - 1500) < 1) {
                        console.log("Purging legacy 2000 default settings during init.");
                        delete allSettings['default'];
                        updated = true;
                    }
                }

                if (updated) {
                    this.set(this.KEYS.SETTINGS, allSettings);
                }
            } catch (e) {
                console.error("Settings migration error", e);
            }
        }
    },

    // Defaults
    DEFAULTS: {
        CONTACTS: [],
        REPORTS: [],
        DAILY_QUOTE: null
    },

    // Generic Get/Set
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : (this.DEFAULTS[key.split('_')[1]] || []);
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('store-update', { detail: { key, value } }));
    },

    mergeCloudData(cloudData) {
        if (!cloudData) return;

        // 0. Daily Quote (Cloud wins)
        if (cloudData.quote) {
            this.set(this.KEYS.DAILY_QUOTE, cloudData.quote);
        }

        // 1. Settings (Cloud wins but smartly with normalization)
        if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            const current = this.get(this.KEYS.SETTINGS) || {};
            const cleanSettings = { ...current };

            // CHECK IF CLOUD DATA IS FLAT (Legacy Script)
            if (cloudData.settings.baseSalary !== undefined && !cloudData.settings['default']) {
                console.warn("Received legacy FLAT settings from cloud. Updating 'default' only.");
                cleanSettings['default'] = { ...cleanSettings['default'], ...cloudData.settings };
            } else {
                // IT IS STRUCTURED: Normalize each month key to YYYY-MM
                Object.entries(cloudData.settings).forEach(([rawKey, val]) => {
                    const normKey = this.normalizeMonthKey(rawKey, val);
                    
                    // Parse numeric values
                    const parsedVal = {};
                    Object.keys(val).forEach(k => {
                        let num = parseFloat(val[k]);
                        parsedVal[k] = isNaN(num) ? val[k] : num;
                    });

                    cleanSettings[normKey] = {
                        ...(cleanSettings[normKey] || {}),
                        ...parsedVal
                    };
                });
            }

            // Remove legacy un-normalized keys (e.g. raw Date strings with GMT)
            Object.keys(cleanSettings).forEach(k => {
                if (k !== 'default' && !k.match(/^\d{4}-\d{2}$/)) {
                    delete cleanSettings[k];
                }
            });

            this.set(this.KEYS.SETTINGS, cleanSettings);
        }

        // 2. Contacts (Merge by ID)
        if (cloudData.contacts) {
            const local = this.getContacts();
            const cloud = cloudData.contacts.map(c => ({
                id: String(c.id),
                company: c.company,
                city: c.city || '',
                street: c.street || (c.address || ''),
                number: c.number || '',
                person: c.person,
                phone: c.phone
            }));

            const map = new Map();
            local.forEach(c => map.set(String(c.id), c));
            cloud.forEach(c => map.set(String(c.id), c));

            this.set(this.KEYS.CONTACTS, Array.from(map.values()));
        }

        // 3. Reports (Merge by ID)
        if (cloudData.reports) {
            const local = this.getReports();
            const cloud = cloudData.reports.map(r => {
                const parseNum = (v) => {
                    if (v === undefined || v === null || v === '') return 0;
                    let n = parseFloat(String(v).replace(',', '.'));
                    return isNaN(n) ? 0 : n;
                };

                // Helper to find value by normalized key OR common aliases
                const getVal = (aliases) => {
                    for (let a of aliases) {
                        const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (r[normA] !== undefined) return r[normA];
                    }
                    return undefined;
                };

                return {
                    id: String(r.id || getVal(['id'])),
                    date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
                    type: r.type || getVal(['tipo', 'lavoro']),
                    location: r.location || getVal(['luogo', 'azienda', 'cliente']),
                    startTime: r.starttime || getVal(['inizio', 'start', 'oraInizio']),
                    endTime: r.endtime || getVal(['fine', 'end', 'oraFine']),
                    totalHours: String(parseNum(r.totalhours || getVal(['ore', 'totale', 'hours', 'totalhours']))),
                    overtime: r.overtime || getVal(['straordinari', 'straord', 'ot', 'overtime']),
                    overtime25: String(parseNum(r.overtime25 || getVal(['overtime25', 'straord25', 'ot25', 'extra25', 'straordinari25', 'overtime25percent']))),
                    overtime50: String(parseNum(r.overtime50 || getVal(['overtime50', 'straord50', 'ot50', 'extra50', 'straordinari50', 'overtime50percent']))),
                    absence: r.absence || getVal(['assenza', 'ferie', 'malattia']),
                    lunchBreak: (r.lunchbreak !== undefined ? r.lunchbreak : getVal(['mensa', 'pausa', 'lunch'])) === true || r.lunchbreak === 'true',
                    notes: r.notes || getVal(['note', 'descr', 'descrizione']),
                    synced: true
                };
            });

            const map = new Map();
            local.forEach(r => map.set(String(r.id), r));
            cloud.forEach(r => map.set(String(r.id), r));

            const sorted = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
            this.set(this.KEYS.REPORTS, sorted);
        }

        return true;
    },

    // Contacts
    getContacts() {
        return this.get(this.KEYS.CONTACTS) || [];
    },

    addContact(contact) {
        const contacts = this.getContacts();
        contact.id = Date.now().toString();
        contacts.push(contact);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    updateContact(updatedContact) {
        const contacts = this.getContacts().map(c => c.id === updatedContact.id ? updatedContact : c);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    deleteContact(id) {
        const contacts = this.getContacts().filter(c => c.id !== id);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    // Reports
    getReports() {
        return this.get(this.KEYS.REPORTS) || [];
    },

    addReport(report) {
        const reports = this.getReports();
        report.id = report.id || Date.now().toString();
        report.synced = false;
        reports.unshift(report); // Newest first
        this.set(this.KEYS.REPORTS, reports);
    },

    updateReport(updatedReport) {
        const reports = this.getReports().map(r => r.id === updatedReport.id ? updatedReport : r);
        this.set(this.KEYS.REPORTS, reports);
    },

    deleteReport(id) {
        const reports = this.getReports().filter(r => r.id !== id);
        this.set(this.KEYS.REPORTS, reports);
    }
};
