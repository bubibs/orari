// Setup file per Playwright test
// Configura l'ambiente di test

const { devices } = require('@playwright/test');

// Configurazione browser Firefox
const firefoxDesktop = devices['Desktop Firefox'];

module.exports = {
  firefoxDesktop,
  viewport: {
    width: 1280,
    height: 720
  }
};