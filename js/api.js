export const API = {
    DEFAULT_ENDPOINT: 'https://script.google.com/macros/s/AKfycbwSkwdVdHZl8Xlbs_pgmPTTOZ2DUHC1x5XNPXk0ceCZIHQ1vBM-Fj8IXJHIggpHWLUang/exec',

    // Se l'utente ha configurato un proprio URL Google Apps Script personale, usa quello.
    // Altrimenti usa l'endpoint cloud principale aziendale.
    get ENDPOINT() {
        const user = window.Auth ? window.Auth.getCurrentUser() : null;
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
            const user = window.Auth ? window.Auth.getCurrentUser() : null;
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
            if (!response.ok) return { success: false, error: 'Server ' + response.status };

            // Apps Script risponde 200 anche in caso di errore: il vero esito e' nel body JSON
            let result = null;
            try {
                result = await response.json();
            } catch (e) {
                return { success: true };
            }
            if (result && result.success === false) {
                return { success: false, error: result.error || 'Errore cloud' };
            }
            return { success: true, ...(result || {}) };
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

    // --- Gestione Richieste Reset Password Cloud ---
    saveResetRequest(req) { return this._post('saveResetRequest', req); },
    getResetRequests(status) {
        const url = this.ENDPOINT + '?action=getResetRequests' + (status ? '&status=' + status : '');
        return fetch(url).then(r => r.json()).then(d => d.requests || []).catch(e => { console.error('getResetRequests failed:', e); return []; });
    },
    updateResetRequest(req) { return this._post('updateResetRequest', req); },

    // Recupera tutti gli utenti dal cloud (usato da admin)
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
            const user = window.Auth ? window.Auth.getCurrentUser() : null;
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
