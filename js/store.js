export const Store = {
    // Keys
    KEYS: {
        SETTINGS: 'tecnosistem_settings',
        CONTACTS: 'tecnosistem_contacts',
        REPORTS: 'tecnosistem_reports',
        QUEUE: 'tecnosistem_sync_queue'
    },

    // --- Settings (Month-Specific) ---
    getSettings(monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};

        // 1. Try specific month
        if (allSettings[monthStr]) return allSettings[monthStr];

        // 3. Fallback/Init Defaults (if nothing exists)
        // correct default values provided by user
        const defaults = {
            baseSalary: 3480.76,
            hourlyRate: 17.23,
            allowanceReturn: 30.00,
            allowanceOvernight: 60.00,
            allowanceForeign: 105.00,
            taxRate: 27
        };

        // If we found 'default' settings in storage but they look like the old one (e.g. base 1500 or 2000),
        // we might want to override them OR just trust the user.
        // User complained about "2000".
        // Let's force return these defaults if the retrieved 'default' set has baseSalary == 2000 or 1500
        // (legacy values I might have used).
        if (allSettings['default']) {
            const d = allSettings['default'];
            if (d.baseSalary === 2000 || d.baseSalary === 1500) {
                return defaults; // Override legacy garbage
            }
            return d;
        }

        // Save as default for future
        if (Object.keys(allSettings).length === 0) {
            this.saveSettings(defaults, 'default');
            return defaults;
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

        // Settings Migration: Old format was a direct object. New format is { "default": {...}, "2025-01": {...} }
        const settings = localStorage.getItem(this.KEYS.SETTINGS);
        if (settings) {
            try {
                const parsed = JSON.parse(settings);
                // Check if it's the old flat format (has 'baseSalary' directly)
                if (parsed.baseSalary !== undefined) {
                    console.log("Migrating settings to new format...");
                    const newFormat = { 'default': parsed };
                    this.set(this.KEYS.SETTINGS, newFormat);
                }
            } catch (e) { }
        }
    },

    // Cloud merge update for Settings
    // Cloud Settings likely come as a flat Key-Value pair from simple sheet. 
    // We might need to rethink cloud sync for complex settings. 
    // For now, let's assume Cloud only syncs 'default' settings or we skip advanced sync for now 
    // to avoid breaking the simple Key-Value structure until script is updated.
    // We'll keep local priority for complex salary data.,

    // Defaults
    DEFAULTS: {
        // SETTINGS is now handled by getSettings/saveSettings with internal defaults
        CONTACTS: [],
        REPORTS: []
    },

    // Generic Get/Set
    get(key) {
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : (this.DEFAULTS[key.split('_')[1]] || []); // Fallback to default if match, else empty array
    },

    set(key, value) {
        localStorage.setItem(key, JSON.stringify(value));

        // Dispatch event for reactivity
        window.dispatchEvent(new CustomEvent('store-update', { detail: { key, value } }));
    },

    // Settings
    getSettings() {
        const stored = localStorage.getItem(this.KEYS.SETTINGS);
        return stored ? { ...this.DEFAULTS.SETTINGS, ...JSON.parse(stored) } : this.DEFAULTS.SETTINGS;
    },

    saveSettings(settings) {
        this.set(this.KEYS.SETTINGS, settings);
    },

    // Sync Logic
    mergeCloudData(cloudData) {
        if (!cloudData) return;

        // 1. Settings (Cloud wins)
        if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            const current = this.getSettings();
            // Merge defaults + cloud
            const merged = { ...this.DEFAULTS.SETTINGS, ...cloudData.settings };
            // Convert to numbers since JSON might return strings
            Object.keys(merged).forEach(k => merged[k] = Number(merged[k]) || merged[k]);
            this.set(this.KEYS.SETTINGS, merged);
        }

        // 2. Contacts (Merge by ID)
        if (cloudData.contacts) {
            const local = this.getContacts();
            const cloud = cloudData.contacts.map(c => ({
                id: String(c.id),
                company: c.company,
                // Handle deprecated 'address' field if present or new fields
                city: c.city || '',
                street: c.street || (c.address || ''), // Fallback if data is old
                number: c.number || '',
                person: c.person,
                phone: c.phone
            }));

            // Simple strategy: Cloud > Local for conflict, but keep locals not in cloud?
            // User requested "cloud sync", usually implying cloud is truth.
            // Let's union them by ID, preferring cloud versions.
            const map = new Map();
            local.forEach(c => map.set(String(c.id), c));
            cloud.forEach(c => map.set(String(c.id), c)); // Overwrites local if ID matches

            this.set(this.KEYS.CONTACTS, Array.from(map.values()));
        }

        // 3. Reports (Merge by ID)
        if (cloudData.reports) {
            const local = this.getReports();
            const cloud = cloudData.reports.map(r => ({
                id: String(r.id),
                date: r.date ? new Date(r.date).toISOString().split('T')[0] : '', // Fix Date format
                type: r.type,
                location: r.location,
                startTime: r.starttime ? r.starttime.substring(0, 5) : '', // HH:MM
                endTime: r.endtime ? r.endtime.substring(0, 5) : '',
                totalHours: r.totalhours,
                overtime: r.overtime,
                absence: r.absence,
                lunchBreak: r.lunchbreak === true || r.lunchbreak === 'true',
                notes: r.notes,
                synced: true // Mark as synced
            }));

            const map = new Map();
            local.forEach(r => map.set(String(r.id), r));
            cloud.forEach(r => map.set(String(r.id), r));

            // Sort by date desc
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
