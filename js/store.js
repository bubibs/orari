export const Store = {
    // Keys
    KEYS: {
        SETTINGS: 'tecnosistem_settings',
        CONTACTS: 'tecnosistem_contacts',
        REPORTS: 'tecnosistem_reports',
        DAILY_QUOTE: 'tecnosistem_quote',
        QUEUE: 'tecnosistem_sync_queue'
    },

    // --- Settings (Month-Specific) ---
    getSettings(monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};

        // 1. Try specific month
        let settings = allSettings[monthStr];

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
        allSettings[monthStr] = settings;
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
                    this.set(this.KEYS.SETTINGS, allSettings);
                }

                // 2. Aggressively purge "2000" defaults which the user hates
                if (allSettings['default']) {
                    const d = allSettings['default'];
                    // Fuzzy check for 2000 or 1500 (legacy values)
                    if (Math.abs(d.baseSalary - 2000) < 1 || Math.abs(d.baseSalary - 1500) < 1) {
                        console.log("Purging legacy 2000 default settings during init.");
                        delete allSettings['default'];
                        this.set(this.KEYS.SETTINGS, allSettings);
                    }
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

        // 1. Settings (Cloud wins but smartly)
        if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            const current = this.get(this.KEYS.SETTINGS) || {};

            // CHECK IF CLOUD DATA IS FLAT (Legacy Script)
            if (cloudData.settings.baseSalary !== undefined && !cloudData.settings['default']) {
                console.warn("Received legacy FLAT settings from cloud. Updating 'default' only.");
                // It's flat. Do NOT merge to root using `...current` or we corrupt structure.
                // Just map it to 'default' key if local default is missing or we want to overwrite it.
                // Or better, ignore it if we have better local data?
                // User said "conviene salvarli sul cloud", so cloud logic implies truth.
                // We'll update only the 'default' key.
                const merged = { ...current };
                merged['default'] = { ...merged['default'], ...cloudData.settings };
                this.set(this.KEYS.SETTINGS, merged);

            } else {
                // IT IS STRUCTURED (New Script)
                // Proceed with deep merge
                const merged = { ...current, ...cloudData.settings };
                this.set(this.KEYS.SETTINGS, merged);
            }
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

                return {
                    id: String(r.id),
                    date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
                    type: r.type,
                    location: r.location,
                    startTime: r.starttime ? r.starttime.substring(0, 5) : '',
                    endTime: r.endtime ? r.endtime.substring(0, 5) : '',
                    totalHours: String(parseNum(r.totalhours)),
                    overtime: r.overtime || '',
                    overtime25: String(parseNum(r.overtime25)), // Sync NEW fields as strings for consistency
                    overtime50: String(parseNum(r.overtime50)),
                    absence: r.absence,
                    lunchBreak: r.lunchbreak === true || r.lunchbreak === 'true',
                    notes: r.notes,
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
