// API Configuration
const API_BASE_URL = 'https://script.google.com/macros/s/AKfycbyVkRST4INthgvTCzHbnOLuIXIdYaH2LWH1AhcMeu8DJVCoinoqji5EMyVhLnX612iZvw/exec';

// API Functions
const API = {
    // Check cloud sync status
    async checkSync() {
        try {
            const response = await fetch(`${API_BASE_URL}?action=ping`, {
                method: 'GET'
            });
            const data = await response.json();
            return { success: data.success, synced: data.success };
        } catch (error) {
            return { success: false, synced: false, error };
        }
    },

    // Save report
    async saveReport(reportData) {
        try {
            if (!reportData) {
                return { success: false, error: 'No data provided' };
            }
            
            if (!API_BASE_URL || API_BASE_URL.trim() === '') {
                throw new Error('API_BASE_URL non configurato. Verifica il file api.js');
            }
            
            console.log('Saving report:', reportData);
            console.log('API URL:', API_BASE_URL);
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
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
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                console.log('Response status:', response.status, response.statusText);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error response:', errorText);
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                console.log('Response text:', text.substring(0, 200));
                
                if (!text || text.trim() === '') {
                    throw new Error('Risposta vuota dal server');
                }
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Parse error:', parseError, 'Response:', text.substring(0, 200));
                    throw new Error('Risposta non valida dal server: ' + text.substring(0, 100));
                }
                
                console.log('Save result:', result);
                return result;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: La richiesta ha impiegato troppo tempo. Verifica la connessione.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Save report error:', error);
            let errorMessage = error.message || error.toString();
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica:\n1. La connessione internet\n2. Che l\'URL dell\'API sia corretto\n3. Che il Google Apps Script sia pubblicato';
            } else if (errorMessage.includes('CORS')) {
                errorMessage = 'Errore CORS. Verifica che il Google Apps Script sia pubblicato con accesso "Tutti"';
            }
            return { success: false, error: errorMessage };
        }
    },

    // Get reports
    async getReports(filters = {}) {
        try {
            const params = new URLSearchParams({ action: 'getReports' });
            if (filters.month) params.append('month', filters.month);
            if (filters.year) params.append('year', filters.year);
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET'
            });
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, data: [], error: error.toString() };
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
            if (!API_BASE_URL || API_BASE_URL.trim() === '') {
                throw new Error('API_BASE_URL non configurato. Verifica il file api.js');
            }
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
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
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                if (!text || text.trim() === '') {
                    throw new Error('Risposta vuota dal server');
                }
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Parse error:', parseError, 'Response:', text.substring(0, 200));
                    throw new Error('Risposta non valida dal server');
                }
                
                return result;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: La richiesta ha impiegato troppo tempo.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Update report error:', error);
            let errorMessage = error.message || error.toString();
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica la connessione internet.';
            }
            return { success: false, error: errorMessage };
        }
    },

    // Delete report
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
            const text = await response.text();
            if (!text) {
                throw new Error('Risposta vuota dal server');
            }
            let result;
            try {
                result = JSON.parse(text);
            } catch (e) {
                throw new Error('Risposta non valida: ' + text.substring(0, 100));
            }
            return result;
        } catch (error) {
            console.error('Delete report error:', error);
            return { success: false, error: error.toString() };
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
                })
            });
            if (!response.ok) {
                throw new Error('Network error: ' + response.status);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Save contact error:', error);
            return { success: false, error: error.toString() };
        }
    },

    // Get contacts
    async getContacts() {
        try {
            const params = new URLSearchParams({ action: 'getContacts' });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET'
            });
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, data: [], error: error.toString() };
        }
    },

    // Update contact
    async updateContact(id, contactData) {
        try {
            if (!API_BASE_URL || API_BASE_URL.trim() === '') {
                throw new Error('API_BASE_URL non configurato. Verifica il file api.js');
            }
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
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
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                if (!text || text.trim() === '') {
                    throw new Error('Risposta vuota dal server');
                }
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Parse error:', parseError, 'Response:', text.substring(0, 200));
                    throw new Error('Risposta non valida dal server');
                }
                
                return result;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: La richiesta ha impiegato troppo tempo.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Update contact error:', error);
            let errorMessage = error.message || error.toString();
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica la connessione internet.';
            }
            return { success: false, error: errorMessage };
        }
    },

    // Delete contact
    async deleteContact(id) {
        try {
            if (!id) {
                return { success: false, error: 'ID mancante' };
            }
            
            if (!API_BASE_URL || API_BASE_URL.trim() === '') {
                throw new Error('API_BASE_URL non configurato. Verifica il file api.js');
            }
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            try {
                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'deleteContact',
                        id: String(id)
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const text = await response.text();
                if (!text || text.trim() === '') {
                    throw new Error('Risposta vuota dal server');
                }
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    console.error('Parse error:', parseError, 'Response:', text.substring(0, 200));
                    throw new Error('Risposta non valida dal server');
                }
                
                return result;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: La richiesta ha impiegato troppo tempo.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Delete contact error:', error);
            let errorMessage = error.message || error.toString();
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica la connessione internet.';
            }
            return { success: false, error: errorMessage };
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
                method: 'GET'
            });
            const result = await response.json();
            return result;
        } catch (error) {
            return { success: false, error: error.toString() };
        }
    },

    // Save settings
    async saveSettings(settings) {
        try {
            if (!settings) {
                return { success: false, error: 'No settings provided' };
            }
            
            console.log('Saving settings:', settings);
            
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
            
            console.log('Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const text = await response.text();
            console.log('Response text:', text.substring(0, 200));
            
            if (!text || text.trim() === '') {
                throw new Error('Risposta vuota dal server');
            }
            
            let result;
            try {
                result = JSON.parse(text);
            } catch (parseError) {
                console.error('Parse error:', parseError, 'Response:', text.substring(0, 200));
                throw new Error('Risposta non valida dal server: ' + text.substring(0, 100));
            }
            
            if (result.success) {
                localStorage.setItem('salarySettings', JSON.stringify(settings));
            }
            
            console.log('Save result:', result);
            return result;
        } catch (error) {
            console.error('Save settings error:', error);
            return { success: false, error: error.message || error.toString() };
        }
    },

    // Get settings
    async getSettings() {
        try {
            // Try to get from cloud first
            const params = new URLSearchParams({ action: 'getSettings' });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET'
            });
            const result = await response.json();
            if (result.success && result.data) {
                // Save to localStorage as backup
                localStorage.setItem('salarySettings', JSON.stringify(result.data));
                return result.data;
            }
            throw new Error('No data from cloud');
        } catch (error) {
            // Fallback to localStorage
            try {
                const settings = localStorage.getItem('salarySettings');
                if (settings) {
                    return JSON.parse(settings);
                }
            } catch (e) {
                // Ignore
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
        }
    },

    // Get paga base mensile
    async getPagaBaseMensile(month, year) {
        try {
            const params = new URLSearchParams({ 
                action: 'getPagaBaseMensile',
                month: month,
                year: year
            });
            const response = await fetch(`${API_BASE_URL}?${params}`, {
                method: 'GET'
            });
            const result = await response.json();
            if (result.success && result.data) {
                return result.data;
            }
            return null;
        } catch (error) {
            return null;
        }
    },

    // Save paga base mensile
    async savePagaBaseMensile(month, year, pagaBase) {
        try {
            if (!API_BASE_URL || API_BASE_URL.trim() === '') {
                throw new Error('API_BASE_URL non configurato. Verifica il file api.js');
            }
            
            // Create AbortController for timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);
            
            try {
                const response = await fetch(API_BASE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        action: 'savePagaBaseMensile',
                        month: month,
                        year: year,
                        pagaBase: pagaBase
                    }),
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`HTTP ${response.status}: ${errorText}`);
                }
                
                const text = await response.text();
                if (!text || text.trim() === '') {
                    throw new Error('Risposta vuota dal server');
                }
                
                let result;
                try {
                    result = JSON.parse(text);
                } catch (parseError) {
                    throw new Error('Risposta non valida dal server');
                }
                
                return result;
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout: La richiesta ha impiegato troppo tempo.');
                }
                throw fetchError;
            }
        } catch (error) {
            console.error('Save paga base mensile error:', error);
            let errorMessage = error.message || error.toString();
            if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica la connessione internet.';
            }
            return { success: false, error: errorMessage };
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

