// Local Storage API (no cloud)
// All data is stored locally using the Storage module

const API = {
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
            return { success: false, data: [], error: error.toString() };
        }
    },

    async saveReport(reportData) {
        return Storage.saveReport(reportData);
    },

    async updateReport(id, reportData) {
        reportData.id = id;
        return Storage.saveReport(reportData);
    },

    async deleteReport(id) {
        return Storage.deleteReport(id);
    },

    async getReportById(id) {
        const report = Storage.getReportById(id);
        return report ? { success: true, data: report } : { success: false, error: 'Report non trovato' };
    },

    // Contacts
    async getContacts() {
        try {
            const contacts = Storage.getContacts();
            return { success: true, data: contacts };
        } catch (error) {
            return { success: false, data: [], error: error.toString() };
        }
    },

    async saveContact(contactData) {
        return Storage.saveContact(contactData);
    },

    async updateContact(id, contactData) {
        contactData.id = id;
        return Storage.saveContact(contactData);
    },

    async deleteContact(id) {
        return Storage.deleteContact(id);
    },

    async getContactById(id) {
        const contact = Storage.getContactById(id);
        return contact ? { success: true, data: contact } : { success: false, error: 'Contatto non trovato' };
    },

    // Settings
    async getSettings() {
        try {
            const settings = Storage.getSettings();
            return { success: true, data: settings };
        } catch (error) {
            return { success: false, data: {}, error: error.toString() };
        }
    },

    async saveSettings(settings) {
        return Storage.saveSettings(settings);
    },

    // Paga Base Mensile
    async getPagaBaseMensile(month, year) {
        try {
            const pagaBase = Storage.getPagaBaseMensile(month, year);
            const settings = Storage.getSettings();
            return pagaBase || settings.pagaBase || 2000;
        } catch (error) {
            const settings = Storage.getSettings();
            return settings.pagaBase || 2000;
        }
    },

    async savePagaBaseMensile(month, year, pagaBase) {
        return Storage.savePagaBaseMensile(month, year, pagaBase);
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
            return { success: false, error: error.toString() };
        }
    }
};
