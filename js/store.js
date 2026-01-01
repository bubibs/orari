export const Store = {
    // Keys
    KEYS: {
        SETTINGS: 'tecnosistem_settings',
        CONTACTS: 'tecnosistem_contacts',
        REPORTS: 'tecnosistem_reports',
        QUEUE: 'tecnosistem_sync_queue'
    },

    // Defaults
    DEFAULTS: {
        SETTINGS: {
            baseSalary: 1500,
            hourlyRate: 10,
            allowanceReturn: 20,
            allowanceOvernight: 50,
            allowanceForeign: 80,
            taxRate: 23
        },
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
                address: c.address,
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
