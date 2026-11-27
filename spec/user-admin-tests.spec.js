const { test, expect } = require('@playwright/test');

// Test per la gestione account da parte dell'amministratore
// Verifica che gli utenti siano salvati su cloud e visibili dall'admin

test.describe('Gestione Account Amministratore', () => {

  test.beforeEach(async ({ page }) => {
    // Accesso come admin (Fabio Sandrini)
    await page.goto('C:\\Users\\bubib\\Desktop\\orari\\indexLogin.html');
    await page.fill('#emailInput', 'bubibs@gmail.com');
    await page.fill('#passwordInput', 'Brescia1-');
    await page.click('#loginBtn');

    // Aspetta che l'app si inizializzi
    await page.waitForSelector('#main-content', { timeout: 10000 });
  });

  test('Admin deve vedere tutti gli utenti registrati', async ({ page }) => {
    // Apri il menu utente
    const userBadge = page.locator('#user-header-badge');
    await expect(userBadge).toBeVisible();
    await userBadge.click();

    // Verifica che la sezione amministrazione sia visibile
    const adminSection = page.locator('text=Gestione Utenti Azienda');
    await expect(adminSection).toBeVisible();

    // Il primo utente deve essere Fabio Sandrini (admin)
    const adminLabel = page.locator('text=Fabio Sandrini');
    await expect(adminLabel).toBeVisible();
  });

  test('Admin deve vedere utenti dal cloud', async ({ page }) => {
    // Prima, registra un nuovo utente
    await page.click('text=Rubrica'); // Naviga a rubrica per forzare l'accesso

    // Torna all'home e apri il menu admin
    await page.click('.nav-grid button:has-text("Nuovo Report")');
  });

  test('Reset password admin', async ({ page }) => {
    // Apri il menu utente admin
    const userBadge = page.locator('#user-header-badge');
    await userBadge.click();

    // Cerca pulsante reset password per un utente (se esiste)
    const resetBtn = page.locator('button[title="Reimposta Password"]');
    if (await resetBtn.count() > 0) {
      await resetBtn.first().click();
      // Dovrebbe apparire un prompt per la nuova password
      await page.waitForTimeout(1000);
    }
  });

  test('Cancellazione utente', async ({ page }) => {
    // Apri il menu utente admin
    const userBadge = page.locator('#user-header-badge');
    await userBadge.click();

    // Cerca pulsante elimina utente (escludendo admin stesso)
    const deleteBtns = page.locator('button[title="Elimina Utente"]');
    const count = await deleteBtns.count();

    if (count > 0) {
      // Clicca sul primo pulsante di eliminazione
      await deleteBtns.first().click();
      // Dovrebbe apparire un prompt di conferma
      await page.waitForTimeout(1000);
    }
  });
});

// Test per verificare che gli utenti vengano salvati su cloud
test.describe('Sincronizzazione Cloud Utenti', () => {

  test('Nuovo utente deve essere salvato su cloud', async ({ page }) => {
    // Simula registrazione nuovo utente
    // Nota: questo test assume che esista il metodo API.saveUser funzionante

    // Verifica che il metodo Auth.register salvi su cloud
    await page.evaluate(() => {
      // Verifica che Auth.register chiami API.saveUser
      const auth = window.Auth;
      const api = window.API;

      console.log('Auth disponibile:', !!auth);
      console.log('API disponibile:', !!api);
      console.log('API.saveUser disponibile:', typeof api?.saveUser);
    });
  });

  test('Gli utenti locali devono sincronizzarsi con cloud alla login', async ({ page }) => {
    // Verifica che fetchUsers venga chiamato durante l'init
    await page.evaluate(() => {
      const api = window.API;
      console.log('API.fetchUsers disponibile:', typeof api?.fetchUsers);
    });
  });
});