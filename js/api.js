export const API = {
    ENDPOINT: 'https://script.google.com/macros/s/AKfycbypX8DXc9dVSi9aZJ5ZIiNNLt2k4wJQJMyFep33USsCQixj0zFyfbzIOQNdnJIFoGbJGA/exec',

    async checkHealth() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=ping');
            const json = await response.json();
            return json.status === 'online';
        } catch (e) {
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
