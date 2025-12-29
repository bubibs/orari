// Local Storage Manager
const Storage = {
    // Keys
    KEYS: {
        REPORTS: 'tecnosistem_reports',
        CONTACTS: 'tecnosistem_contacts',
        SETTINGS: 'tecnosistem_settings',
        PAGA_BASE_MENSILE: 'tecnosistem_paga_base_mensile',
        LAST_BACKUP: 'tecnosistem_last_backup'
    },

    // Reports
    getReports() {
        try {
            const data = localStorage.getItem(this.KEYS.REPORTS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading reports:', error);
            return [];
        }
    },

    saveReport(report) {
        try {
            const reports = this.getReports();
            const existingIndex = reports.findIndex(r => r.id === report.id);
            
            if (existingIndex >= 0) {
                reports[existingIndex] = report;
            } else {
                if (!report.id) {
                    report.id = Date.now().toString();
                }
                if (!report.createdAt) {
                    report.createdAt = new Date().toISOString();
                }
                reports.push(report);
            }
            
            localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(reports));
            this.triggerBackup();
            return { success: true, id: report.id };
        } catch (error) {
            console.error('Error saving report:', error);
            return { success: false, error: error.toString() };
        }
    },

    deleteReport(id) {
        try {
            const reports = this.getReports();
            const filtered = reports.filter(r => r.id !== id);
            localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(filtered));
            this.triggerBackup();
            return { success: true };
        } catch (error) {
            console.error('Error deleting report:', error);
            return { success: false, error: error.toString() };
        }
    },

    getReportById(id) {
        const reports = this.getReports();
        return reports.find(r => r.id === id) || null;
    },

    // Contacts
    getContacts() {
        try {
            const data = localStorage.getItem(this.KEYS.CONTACTS);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Error loading contacts:', error);
            return [];
        }
    },

    saveContact(contact) {
        try {
            const contacts = this.getContacts();
            const existingIndex = contacts.findIndex(c => c.id === contact.id);
            
            if (existingIndex >= 0) {
                contacts[existingIndex] = contact;
            } else {
                if (!contact.id) {
                    contact.id = Date.now().toString();
                }
                contacts.push(contact);
            }
            
            localStorage.setItem(this.KEYS.CONTACTS, JSON.stringify(contacts));
            this.triggerBackup();
            return { success: true, id: contact.id };
        } catch (error) {
            console.error('Error saving contact:', error);
            return { success: false, error: error.toString() };
        }
    },

    deleteContact(id) {
        try {
            const contacts = this.getContacts();
            const filtered = contacts.filter(c => c.id !== id);
            localStorage.setItem(this.KEYS.CONTACTS, JSON.stringify(filtered));
            this.triggerBackup();
            return { success: true };
        } catch (error) {
            console.error('Error deleting contact:', error);
            return { success: false, error: error.toString() };
        }
    },

    getContactById(id) {
        const contacts = this.getContacts();
        return contacts.find(c => c.id === id) || null;
    },

    // Settings
    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            if (data) {
                return JSON.parse(data);
            }
            // Default settings
            return {
                pagaBase: 2000,
                pagaOraria: 12.5,
                indennitaRientro: 15,
                indennitaPernottamento: 50,
                indennitaEstero: 100,
                aliquota: 25
            };
        } catch (error) {
            console.error('Error loading settings:', error);
            return {
                pagaBase: 2000,
                pagaOraria: 12.5,
                indennitaRientro: 15,
                indennitaPernottamento: 50,
                indennitaEstero: 100,
                aliquota: 25
            };
        }
    },

    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            this.triggerBackup();
            return { success: true };
        } catch (error) {
            console.error('Error saving settings:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Paga Base Mensile
    getPagaBaseMensile(month, year) {
        try {
            const data = localStorage.getItem(this.KEYS.PAGA_BASE_MENSILE);
            if (!data) return null;
            
            const pagaBase = JSON.parse(data);
            const key = `${year}-${month}`;
            return pagaBase[key] || null;
        } catch (error) {
            console.error('Error loading paga base mensile:', error);
            return null;
        }
    },

    savePagaBaseMensile(month, year, pagaBase) {
        try {
            const data = localStorage.getItem(this.KEYS.PAGA_BASE_MENSILE);
            const pagaBaseData = data ? JSON.parse(data) : {};
            const key = `${year}-${month}`;
            pagaBaseData[key] = pagaBase;
            
            localStorage.setItem(this.KEYS.PAGA_BASE_MENSILE, JSON.stringify(pagaBaseData));
            this.triggerBackup();
            return { success: true };
        } catch (error) {
            console.error('Error saving paga base mensile:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Backup functions
    getAllData() {
        return {
            reports: this.getReports(),
            contacts: this.getContacts(),
            settings: this.getSettings(),
            pagaBaseMensile: JSON.parse(localStorage.getItem(this.KEYS.PAGA_BASE_MENSILE) || '{}'),
            version: '1.0',
            exportDate: new Date().toISOString()
        };
    },

    async exportBackup() {
        try {
            const data = this.getAllData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tecnosistem_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Save last backup date
            localStorage.setItem(this.KEYS.LAST_BACKUP, new Date().toISOString());
            
            return { success: true };
        } catch (error) {
            console.error('Error exporting backup:', error);
            return { success: false, error: error.toString() };
        }
    },

    async importBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    
                    // Validate data structure
                    if (!data.reports || !data.contacts || !data.settings) {
                        throw new Error('Formato backup non valido');
                    }
                    
                    // Import data
                    if (data.reports && Array.isArray(data.reports)) {
                        localStorage.setItem(this.KEYS.REPORTS, JSON.stringify(data.reports));
                    }
                    
                    if (data.contacts && Array.isArray(data.contacts)) {
                        localStorage.setItem(this.KEYS.CONTACTS, JSON.stringify(data.contacts));
                    }
                    
                    if (data.settings) {
                        localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(data.settings));
                    }
                    
                    if (data.pagaBaseMensile) {
                        localStorage.setItem(this.KEYS.PAGA_BASE_MENSILE, JSON.stringify(data.pagaBaseMensile));
                    }
                    
                    resolve({ success: true });
                } catch (error) {
                    console.error('Error importing backup:', error);
                    reject({ success: false, error: error.toString() });
                }
            };
            
            reader.onerror = () => {
                reject({ success: false, error: 'Errore nella lettura del file' });
            };
            
            reader.readAsText(file);
        });
    },

    getLastBackupDate() {
        const date = localStorage.getItem(this.KEYS.LAST_BACKUP);
        return date ? new Date(date) : null;
    },

    // Auto backup trigger (after save operations)
    triggerBackup() {
        // Auto backup ogni 5 salvataggi o ogni 24 ore
        const lastBackup = this.getLastBackupDate();
        const now = new Date();
        const hoursSinceBackup = lastBackup ? (now - lastBackup) / (1000 * 60 * 60) : 999;
        
        // Backup automatico se passate più di 24 ore
        if (hoursSinceBackup >= 24) {
            // Backup silenzioso in background
            setTimeout(() => {
                this.exportBackup().catch(err => {
                    console.log('Auto backup skipped:', err);
                });
            }, 2000);
        }
    },

    // Clear all data (for testing/reset)
    clearAll() {
        try {
            Object.values(this.KEYS).forEach(key => {
                localStorage.removeItem(key);
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.toString() };
        }
    }
};

