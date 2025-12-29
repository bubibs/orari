// Local Storage API
// All data is stored locally using the Storage module

const API = {
    // Check sync status (always synced for local storage)
    async checkSync() {
        return { synced: true };
    },

    // Reports
    async getReports(filters = {}) {
        try {
            let reports = Storage.getReports();
            
            // Apply filters
            if (filters.month && filters.year) {
                reports = reports.filter(r => {
                    if (!r.data) return false;
                    const reportDate = new Date(r.data);
                    return reportDate.getMonth() + 1 === parseInt(filters.month) &&
                           reportDate.getFullYear() === parseInt(filters.year);
                });
            }
            
            return { success: true, data: reports };
        } catch (error) {
            console.error('Get reports error:', error);
            return { success: false, data: [], error: error.toString() };
        }
    },

    async saveReport(reportData) {
        try {
            // Ensure reportData has all required fields
            if (!reportData.data) {
                return { success: false, error: 'Data mancante' };
            }
            
            // Add updatedAt timestamp
            reportData.updatedAt = new Date().toISOString();
            
            const result = Storage.saveReport(reportData);
            return result;
        } catch (error) {
            console.error('Save report error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async updateReport(id, reportData) {
        try {
            if (!id) {
                return { success: false, error: 'ID mancante' };
            }
            
            reportData.id = id;
            reportData.updatedAt = new Date().toISOString();
            
            const result = Storage.saveReport(reportData);
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
            
            const result = Storage.deleteReport(id);
            return result;
        } catch (error) {
            console.error('Delete report error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async getReportById(id) {
        try {
            const report = Storage.getReportById(id);
            return report ? { success: true, data: report } : { success: false, error: 'Report non trovato' };
        } catch (error) {
            console.error('Get report by ID error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Contacts
    async getContacts() {
        try {
            const contacts = Storage.getContacts();
            return { success: true, data: contacts };
        } catch (error) {
            console.error('Get contacts error:', error);
            return { success: false, data: [], error: error.toString() };
        }
    },

    async saveContact(contactData) {
        try {
            if (!contactData.azienda) {
                return { success: false, error: 'Azienda mancante' };
            }
            
            const result = Storage.saveContact(contactData);
            return result;
        } catch (error) {
            console.error('Save contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async updateContact(id, contactData) {
        try {
            if (!id) {
                return { success: false, error: 'ID mancante' };
            }
            
            contactData.id = id;
            const result = Storage.saveContact(contactData);
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
            
            const result = Storage.deleteContact(id);
            return result;
        } catch (error) {
            console.error('Delete contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    async getContactById(id) {
        try {
            const contact = Storage.getContactById(id);
            return contact ? { success: true, data: contact } : { success: false, error: 'Contatto non trovato' };
        } catch (error) {
            console.error('Get contact by ID error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Settings
    async getSettings() {
        try {
            const settings = Storage.getSettings();
            return { success: true, data: settings };
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
            const result = Storage.saveSettings(settings);
            return result;
        } catch (error) {
            console.error('Save settings error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Paga Base Mensile
    async getPagaBaseMensile(month, year) {
        try {
            const pagaBase = Storage.getPagaBaseMensile(month, year);
            if (pagaBase !== null) {
                return pagaBase;
            }
            // Fallback to default from settings
            const settings = Storage.getSettings();
            return settings.pagaBase || 2000;
        } catch (error) {
            console.error('Get paga base mensile error:', error);
            const settings = Storage.getSettings();
            return settings.pagaBase || 2000;
        }
    },

    async savePagaBaseMensile(month, year, pagaBase) {
        try {
            const result = Storage.savePagaBaseMensile(month, year, pagaBase);
            return result;
        } catch (error) {
            console.error('Save paga base mensile error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Salary data (calculated from reports)
    async getSalaryData(month, year) {
        try {
            const reportsResult = await this.getReports({ month, year });
            const reports = reportsResult.data || [];
            
            let giorniLavorati = 0;
            let giorniTrasferta = 0;
            let giorniAssenza = 0;
            let oreSede = 0;
            let oreTrasfertaRientro = 0;
            let oreTrasfertaPernottamento = 0;
            let oreTrasfertaEstero = 0;
            let oreStraordinarie = 0;
            
            reports.forEach(report => {
                if (report.assenza) {
                    giorniAssenza++;
                } else if (report.tipoLavoro === 'in sede') {
                    giorniLavorati++;
                    oreSede += parseFloat(report.oreTotali) || 0;
                } else if (report.tipoLavoro === 'trasferta con rientro') {
                    giorniLavorati++;
                    giorniTrasferta++;
                    oreTrasfertaRientro += parseFloat(report.oreTotali) || 0;
                } else if (report.tipoLavoro === 'trasferta con pernottamento') {
                    giorniLavorati++;
                    giorniTrasferta++;
                    oreTrasfertaPernottamento += parseFloat(report.oreTotali) || 0;
                } else if (report.tipoLavoro === 'trasferta estero') {
                    giorniLavorati++;
                    giorniTrasferta++;
                    oreTrasfertaEstero += parseFloat(report.oreTotali) || 0;
                }
                
                oreStraordinarie += parseFloat(report.oreStraordinarie) || 0;
            });
            
            return {
                success: true,
                data: {
                    giorniLavorati,
                    giorniTrasferta,
                    giorniAssenza,
                    oreSede,
                    oreTrasfertaRientro,
                    oreTrasfertaPernottamento,
                    oreTrasfertaEstero,
                    oreStraordinarie
                }
            };
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
