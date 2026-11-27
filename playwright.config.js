module.exports = {
  testDir: './spec',
  timeout: 60000,
  expect: {
    timeout: 10000
  },
  fullyParallel: false,
  reporter: 'html',
  retries: 0,
  use: {
    baseURL: 'file:///C:/Users/bubib/Desktop/orari/indexLogin.html',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    browserName: 'chromium',
    headless: true
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        // Usa Chrome se installato, altrimenti Playwright Chromium
        channel: 'chrome'
      }
    }
  ],
  webServer: null
};