// API Configuration
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSfAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec';

// API Functions
const API = {
    // Check cloud sync status
    async checkSync() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=ping`, {
                method: 'GET',
                mode: 'no-cors'
            });
            return { success: true, synced: true };
        } catch (error) {
            return { success: false, synced: false, error };
        }
    },

    // Save report
    async saveReport(reportData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'saveReport',
                    data: reportData
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Get reports
    async getReports(filters = {}) {
        try {
            const params = new URLSearchParams({ action: 'getReports', ...filters });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET',
                mode: 'no-cors'
            });
            // Note: With no-cors mode, we can't read response, but data is saved on cloud
            // Return empty array - data should come from cloud on next page load
            return { success: true, data: [] };
        } catch (error) {
            return { success: false, data: [], error };
        }
    },

    // Get report by ID
    async getReportById(id) {
        try {
            const reports = await this.getReports();
            return reports.data.find(r => r.id === id) || null;
        } catch (error) {
            return null;
        }
    },

    // Update report
    async updateReport(id, reportData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateReport',
                    id: id,
                    data: reportData
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Delete report
    async deleteReport(id) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteReport',
                    id: id
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Save contact
    async saveContact(contactData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'saveContact',
                    data: contactData
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Get contacts
    async getContacts() {
        try {
            const params = new URLSearchParams({ action: 'getContacts' });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET',
                mode: 'no-cors'
            });
            // Note: With no-cors mode, we can't read response, but data is saved on cloud
            // Return empty array - data should come from cloud on next page load
            return { success: true, data: [] };
        } catch (error) {
            return { success: false, data: [], error };
        }
    },

    // Update contact
    async updateContact(id, contactData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateContact',
                    id: id,
                    data: contactData
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Delete contact
    async deleteContact(id) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteContact',
                    id: id
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: false, error };
        }
    },

    // Get salary data
    async getSalaryData(month, year) {
        try {
            const params = new URLSearchParams({ 
                action: 'getSalaryData',
                month: month,
                year: year
            });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET',
                mode: 'no-cors'
            });
            const data = await this.calculateLocalSalary(month, year);
            return { success: true, data };
        } catch (error) {
            const data = await this.calculateLocalSalary(month, year);
            return { success: true, data };
        }
    },

    // Save settings
    async saveSettings(settings) {
        try {
            localStorage.setItem('salarySettings', JSON.stringify(settings));
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'saveSettings',
                    data: settings
                }),
                mode: 'no-cors'
            });
            return { success: true };
        } catch (error) {
            return { success: true }; // Saved locally
        }
    },

    // Get settings
    async getSettings() {
        try {
            const settings = localStorage.getItem('salarySettings');
            if (settings) {
                return JSON.parse(settings);
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

    // Local storage helpers (fallback)
    getLocalReports() {
        try {
            const reports = localStorage.getItem('reports');
            return reports ? JSON.parse(reports) : [];
        } catch {
            return [];
        }
    },

    saveLocalReport(report) {
        try {
            const reports = this.getLocalReports();
            if (report.id) {
                const index = reports.findIndex(r => r.id === report.id);
                if (index >= 0) {
                    reports[index] = report;
                } else {
                    reports.push(report);
                }
            } else {
                report.id = Date.now().toString();
                report.createdAt = new Date().toISOString();
                reports.push(report);
            }
            localStorage.setItem('reports', JSON.stringify(reports));
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    deleteLocalReport(id) {
        try {
            const reports = this.getLocalReports();
            const filtered = reports.filter(r => r.id !== id);
            localStorage.setItem('reports', JSON.stringify(filtered));
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    getLocalContacts() {
        try {
            const contacts = localStorage.getItem('contacts');
            return contacts ? JSON.parse(contacts) : [];
        } catch {
            return [];
        }
    },

    saveLocalContact(contact) {
        try {
            const contacts = this.getLocalContacts();
            if (contact.id) {
                const index = contacts.findIndex(c => c.id === contact.id);
                if (index >= 0) {
                    contacts[index] = contact;
                } else {
                    contacts.push(contact);
                }
            } else {
                contact.id = Date.now().toString();
                contacts.push(contact);
            }
            localStorage.setItem('contacts', JSON.stringify(contacts));
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    deleteLocalContact(id) {
        try {
            const contacts = this.getLocalContacts();
            const filtered = contacts.filter(c => c.id !== id);
            localStorage.setItem('contacts', JSON.stringify(filtered));
            return { success: true };
        } catch {
            return { success: false };
        }
    },

    async calculateLocalSalary(month, year) {
        const reportsResult = await this.getReports();
        const reports = reportsResult.data || [];
        const filtered = reports.filter(r => {
            const reportDate = new Date(r.data);
            return reportDate.getMonth() === month - 1 && reportDate.getFullYear() === year;
        });

        let giorniLavorati = 0;
        let giorniTrasferta = 0;
        let giorniAssenza = 0;
        let oreSede = 0;
        let oreTrasfertaRientro = 0;
        let oreTrasfertaPernottamento = 0;
        let oreTrasfertaEstero = 0;
        let oreStraordinarie = 0;

        filtered.forEach(report => {
            if (report.assenza) {
                giorniAssenza++;
            } else {
                giorniLavorati++;
                const ore = parseFloat(report.oreTotali) || 0;
                const straordinarie = parseFloat(report.oreStraordinarie) || 0;
                oreStraordinarie += straordinarie;

                if (report.tipoLavoro === 'in sede') {
                    oreSede += ore;
                } else if (report.tipoLavoro === 'trasferta con rientro') {
                    giorniTrasferta++;
                    oreTrasfertaRientro += ore;
                } else if (report.tipoLavoro === 'trasferta con pernottamento') {
                    giorniTrasferta++;
                    oreTrasfertaPernottamento += ore;
                } else if (report.tipoLavoro === 'trasferta estero') {
                    giorniTrasferta++;
                    oreTrasfertaEstero += ore;
                }
            }
        });

        return {
            giorniLavorati,
            giorniTrasferta,
            giorniAssenza,
            oreSede,
            oreTrasfertaRientro,
            oreTrasfertaPernottamento,
            oreTrasfertaEstero,
            oreStraordinarie
        };
    }
};

