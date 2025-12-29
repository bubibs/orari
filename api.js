// Google Apps Script API
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycby9VRIwDrWdPNjqw6T6FJY0c-czNPVUuVh4cg9JSJAggrN_WNHGoTqr5cCLfnBX48ZivQ/exec';

const API = {
    // Check sync status
    async checkSync() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=ping`);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            return { synced: result.success === true };
        } catch (error) {
            console.error('Check sync error:', error);
            return { synced: false };
        }
    },

    // Reports
    async getReports(filters = {}) {
        try {
            let url = `${API_BASE_URL}?action=getReports`;
            if (filters.month) url += `&month=${filters.month}`;
            if (filters.year) url += `&year=${filters.year}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result || !result.success) {
                return { success: false, data: [], error: result?.error || 'Errore nel caricamento' };
            }
            return { success: true, data: result.data || [] };
        } catch (error) {
            console.error('Get reports error:', error);
            return { success: false, data: [], error: error.toString() };
        }
    },

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
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Save report error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async updateReport(id, reportData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateReport',
                    id: String(id),
                    data: reportData
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Update report error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async deleteReport(id) {
        try {
            if (!id) {
                return { success: false, error: 'ID mancante' };
            }
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteReport',
                    id: String(id)
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Delete report error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async getReportById(id) {
        try {
            const result = await this.getReports();
            if (!result.success) {
                return { success: false, error: result.error || 'Errore nel caricamento' };
            }
            const report = result.data.find(r => String(r.id) === String(id));
            return report ? { success: true, data: report } : { success: false, error: 'Report non trovato' };
        } catch (error) {
            console.error('Get report by ID error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Contacts
    async getContacts() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=getContacts`);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result || !result.success) {
                return { success: false, data: [], error: result?.error || 'Errore nel caricamento' };
            }
            return { success: true, data: result.data || [] };
        } catch (error) {
            console.error('Get contacts error:', error);
            return { success: false, data: [], error: error.toString() };
        }
    },

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
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Save contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async updateContact(id, contactData) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'updateContact',
                    id: String(id),
                    data: contactData
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Update contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async deleteContact(id) {
        try {
            if (!id) {
                return { success: false, error: 'ID mancante' };
            }
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'deleteContact',
                    id: String(id)
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Delete contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async getContactById(id) {
        try {
            const result = await this.getContacts();
            if (!result.success) {
                return { success: false, error: result.error || 'Errore nel caricamento' };
            }
            const contact = result.data.find(c => String(c.id) === String(id));
            return contact ? { success: true, data: contact } : { success: false, error: 'Contatto non trovato' };
        } catch (error) {
            console.error('Get contact by ID error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Settings
    async getSettings() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=getSettings`);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result || !result.success) {
                // Return default settings if not found
                return { 
                    success: true, 
                    data: {
                        pagaBase: 2000,
                        pagaOraria: 12.5,
                        indennitaRientro: 15,
                        indennitaPernottamento: 50,
                        indennitaEstero: 100,
                        aliquota: 25
                    }
                };
            }
            return { success: true, data: result.data || {} };
        } catch (error) {
            console.error('Get settings error:', error);
            // Return default settings on error
            return { 
                success: true, 
                data: {
                    pagaBase: 2000,
                    pagaOraria: 12.5,
                    indennitaRientro: 15,
                    indennitaPernottamento: 50,
                    indennitaEstero: 100,
                    aliquota: 25
                }
            };
        }
    },

    async saveSettings(settings) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'saveSettings',
                    data: settings
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Save settings error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Paga Base Mensile
    async getPagaBaseMensile(month, year) {
        try {
            const response = await fetch(`${API_BASE_URL}?action=getPagaBaseMensile&month=${month}&year=${year}`);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (result && result.success && result.data) {
                return parseFloat(result.data) || null;
            }
            // Fallback to default from settings
            const settings = await this.getSettings();
            return settings.data?.pagaBase || 2000;
        } catch (error) {
            console.error('Get paga base mensile error:', error);
            const settings = await this.getSettings();
            return settings.data?.pagaBase || 2000;
        }
    },

    async savePagaBaseMensile(month, year, pagaBase) {
        try {
            const response = await fetch(API_BASE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action: 'savePagaBaseMensile',
                    month: parseInt(month),
                    year: parseInt(year),
                    pagaBase: parseFloat(pagaBase)
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result) {
                throw new Error('Risposta vuota dal server');
            }
            return result;
        } catch (error) {
            console.error('Save paga base mensile error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Salary data (calculated from reports)
    async getSalaryData(month, year) {
        try {
            const response = await fetch(`${API_BASE_URL}?action=getSalaryData&month=${month}&year=${year}`);
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            if (!result || !result.success) {
                return { 
                    success: false, 
                    error: result?.error || 'Errore nel caricamento',
                    data: {
                        giorniLavorati: 0,
                        giorniTrasferta: 0,
                        giorniAssenza: 0,
                        oreSede: 0,
                        oreTrasfertaRientro: 0,
                        oreTrasfertaPernottamento: 0,
                        oreTrasfertaEstero: 0,
                        oreStraordinarie: 0
                    }
                };
            }
            return { success: true, data: result.data || {} };
        } catch (error) {
            console.error('Get salary data error:', error);
            return { 
                success: false, 
                error: error.toString(),
                data: {
                    giorniLavorati: 0,
                    giorniTrasferta: 0,
                    giorniAssenza: 0,
                    oreSede: 0,
                    oreTrasfertaRientro: 0,
                    oreTrasfertaPernottamento: 0,
                    oreTrasfertaEstero: 0,
                    oreStraordinarie: 0
                }
            };
        }
    }
};
