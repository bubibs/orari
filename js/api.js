export const API = {
    ENDPOINT: 'https://script.google.com/macros/s/AKfycbypX8DXc9dVSi9aZJ5ZIiNNLt2k4wJQJMyFep33USsCQixj0zFyfbzIOQNdnJIFoGbJGA/exec',

    async checkHealth() {
        try {
            // Simple ping to check connectivity
            const response = await fetch(this.ENDPOINT + '?action=ping');
            return true;
        } catch (e) {
            return false;
        }
    },

    async syncReport(report) {
        try {
            // We use the "beacon" approach or simple text/plain POST to avoid complex CORS preflight checks.
            // Google Apps Script handles raw POST data via e.postData.contents

            const response = await fetch(this.ENDPOINT + '?action=saveReport', {
                method: 'POST',
                body: JSON.stringify(report)
            });

            // If we get here and the response is ok/200, it worked.
            if (response.ok) {
                return { success: true };
            } else {
                return { success: false, error: 'Server returned ' + response.status };
            }
        } catch (error) {
            console.error('Sync failed:', error);
            // Don't swallow the error completely, let the caller know
            return { success: false, error: String(error) };
        }
    },

    async fetchCloudData() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=getData');
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch failed:', error);
            return null;
        }
    }
};
