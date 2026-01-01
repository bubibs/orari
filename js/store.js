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
