import { Auth } from './auth.js';

export const API = {
    DEFAULT_ENDPOINT: 'https://script.google.com/macros/s/AKfycbyfxWOPZ0F8gZGloDB9fOxLog6bjrs-YOpeiTC3_qll/dev',

    // Se l'utente ha configurato un proprio URL Google Apps Script personale, usa quello.
    // Altrimenti usa l'endpoint cloud principale aziendale.
    get ENDPOINT() {
        const user = Auth.getCurrentUser();
        if (user && user.cloudUrl && user.cloudUrl.trim().startsWith('http')) {
            return user.cloudUrl.trim();
        }
        return this.DEFAULT_ENDPOINT;
    },

    async checkHealth() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=ping');
            return response.ok;
        } catch (e) {
            console.warn("Health check failed", e);
            return false;
        }
    },

    async _post(action, data) {
        try {
            const user = Auth.getCurrentUser();
            const payload = (typeof data === 'object' && data !== null) ? { ...data } : { value: data };
            
            // Inietta le informazioni dell'utente nel payload per il cloud
            if (user) {
                payload.userId = user.id;
                payload.userName = user.name;
                payload.userEmail = user.email;
                payload.isPrimary = !!user.isPrimary;
            }

            const response = await fetch(this.ENDPOINT + '?action=' + action, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (response.ok) return { success: true };
            return { success: false, error: 'Server ' + response.status };
        } catch (error) {
            console.error(action + ' failed:', error);
            return { success: false, error: String(error) };
        }
    },

    saveReport(report) { return this._post('saveReport', report); },
    deleteReport(id) { return this._post('deleteReport', { id }); },
    saveContact(contact) { return this._post('saveContact', contact); },
    deleteContact(id) { return this._post('deleteContact', { id }); },
    saveSettings(settings) { return this._post('saveSettings', settings); },

    // --- Gestione Utenti Cloud ---
    saveUser(user) { return this._post('saveUser', user); },
    deleteUser(id) { return this._post('deleteUser', { id }); },

    async fetchUsers() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=getData');
            const data = await response.json();
            return data.users || [];
        } catch (error) {
            console.error('Fetch users failed:', error);
            return [];
        }
    },

    async fetchCloudData() {
        try {
            const user = Auth.getCurrentUser();
            let url = this.ENDPOINT + '?action=getData';
            if (user) {
                url += `&userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email || '')}&isPrimary=${user.isPrimary ? '1' : '0'}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch failed:', error);
            return null;
        }
    }
};
