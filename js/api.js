export const API = {
    ENDPOINT: 'https://script.google.com/macros/s/AKfycbypX8DXc9dVSi9aZJ5ZIiNNLt2k4wJQJMyFep33USsCQixj0zFyfbzIOQNdnJIFoGbJGA/exec',

    async checkHealth() {
        try {
            // Google Scripts sometimes return 302 redirects which fetch follows. 
            // We just assume if we get ANY successful response (even plain text), we are safe.
            const response = await fetch(this.ENDPOINT + '?action=ping');
            // If the response is ok, we are likely connected. The JSON parsing is stricter.
            // Let's just return response.ok
            return response.ok;
        } catch (e) {
            console.warn("Health check failed", e);
            return false;
        }
    },

    async _post(action, data) {
        try {
            const response = await fetch(this.ENDPOINT + '?action=' + action, {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (response.ok) return { success: true };
            return { success: false, error: 'Server ' + response.status };
        } catch (error) {
            console.error(action + ' failed:', error);
            return { success: false, error: String(error) };
        }
    },

    saveReport(report) { return this._post('saveReport', report); },
    saveContact(contact) { return this._post('saveContact', contact); },
    deleteContact(id) { return this._post('deleteContact', { id }); },
    saveSettings(settings) { return this._post('saveSettings', settings); },

    async fetchCloudData() {
        try {
            // Requesting all data
            const response = await fetch(this.ENDPOINT + '?action=getData');
            const data = await response.json(); // Expected: { reports: [], contacts: [], settings: {} }
            return data;
        } catch (error) {
            console.error('Fetch failed:', error);
            return null;
        }
    }
};
