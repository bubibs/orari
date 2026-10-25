```javascript
export const API = {
    ENDPOINT: 'https://script.google.com/macros/s/AKfycbypX8DXc9dVSi9aZJ5ZIiNNLt2k4wJQJMyFep33USsCQixj0zFyfbzIOQNdnJIFoGbJGA/exec',

    async checkHealth() {
        try {
            // Simple ping to check connectivity
            const response = await fetch(this.ENDPOINT + '?action=ping', { method: 'GET', mode: 'no-cors' });
            return true; // If no network error, we assume online (opaque response with no-cors)
        } catch (e) {
            return false;
        }
    },

    async syncReport(report) {
        try {
            // Using no-cors because Google Apps Script mostly returns opaque responses unless configured with specific headers
            // However, "no-cors" means we can't read the response. 
            // If the script is set to return JSONP or JSON with CORS, we can change this.
            // For now, we assume a standard POST.

            const formData = new FormData();
            formData.append('action', 'saveReport');
            formData.append('data', JSON.stringify(report));

            const response = await fetch(this.ENDPOINT, {
                method: 'POST',
                body: formData
            });

            // If we get here, the network request 'succeeded' in reaching the server
            return { success: true };
        } catch (error) {
            console.error('Sync failed:', error);
            return { success: false, error };
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
