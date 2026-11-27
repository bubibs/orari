const { test, expect } = require('@playwright/test');
const path = require('path');

const INDEX = 'index.html';
const ADMIN_EMAIL = 'bubibs@gmail.com';

// Login admin tramite il form dell'app (index.html, bundle.js)
async function loginAsAdmin(page) {
  await page.goto(INDEX, { waitUntil: 'domcontentloaded' });

  // App riconcilia le credenziali e prepara l'ambiente
  await page.waitForSelector('#login-identifier', { timeout: 20000 });
  await page.waitForTimeout(800); // leavespace al fallback SHA-256 locale

  await page.fill('#login-identifier', ADMIN_EMAIL);
  await page.fill('#login-password', 'Brescia1-');

  // Evita chiavi di rete ostili su file://
  await page.evaluate(() => {
    try {
      const style = document.createElement('style');
      style.id = 'block-external';
      document.head.appendChild(style);
    } catch (e) {}
  });

  await page.click('button[type=submit]');

  await page.waitForSelector('#user-header-badge', { state: 'visible', timeout: 20000 });
}

test.describe('Amministratore - Gestione Utenti (index.html, bundle v2.7)', () => {
  test.use({ baseURL: `file://${path.join(process.cwd(), INDEX)}` });

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(page);
  });

  test('Login admin: utente primario settato', async ({ page }) => {
    const user = await page.evaluate(() => window.Auth?.getCurrentUser());

    console.log('Utente corrente:', user);

    expect(user).toBeTruthy();
    expect(user.isPrimary).toBe(true);
    expect(user.email?.toLowerCase()).toBe(ADMIN_EMAIL);
  });

  test('Header badge mostra username admin', async ({ page }) => {
    const nameSpanText = await page.$eval('#user-header-name', el => el.textContent);
    expect(nameSpanText.toLowerCase()).toContain('bubibs');

    const titleAttr = await page.$eval('#user-header-badge', el => el.title);
    expect(titleAttr).toContain(ADMIN_EMAIL);
  });

  test('Menu utente: sezione Gestione Utenti Azienda (ADMIN)', async ({ page }) => {
    await page.click('#user-header-badge');

    const overlay = page.locator('#user-profile-modal-overlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('h3')).toContainText('Fabio Sandrini');
    await expect(overlay).toContainText(ADMIN_EMAIL);

    // Solo l'amministratore vede questa sezione
    await expect(overlay.locator('text=Gestione Utenti Azienda')).toBeVisible();
    await expect(overlay.locator('text=ADMIN')).toBeVisible();

    // Chiudi il menu premendo il pulsante X
    await page.locator('#user-profile-modal-overlay button[title="x"], #user-profile-modal-overlay .ph-x').click();
  });

  test('Menu utente: lista utenti sincronizzata dal cloud', async ({ page }) => {
    await page.click('#user-header-badge');

    const overlay = page.locator('#user-profile-modal-overlay');
    await expect(overlay).toBeVisible();

    // Aspetta il popolamento della lista (o il testo "Nessun altro utente")
    await page.waitForTimeout(800);
    const section = overlay.locator('#admin-users-list');
    await expect(section).toBeVisible();

    // Chiudi il menu premendo X
    await page.locator('#user-profile-modal-overlay button .ph-x').click();
  });

  test('Auth.getAllUsers() restituisce l\'admin in lista', async ({ page }) => {
    const users = await page.evaluate(() => window.Auth?.getUsers() || []);

    console.log('Utenti in Auth:', users.length);
    users.forEach((u, i) => console.log(`  [${i}] ${u.name} (${u.email}) primary=${u.isPrimary}`));

    const primary = users.find(u => u.isPrimary);
    expect(primary, 'Nessun utente primario in Auth.getUsers()').toBeTruthy();
    expect(primary.email).toBe(ADMIN_EMAIL);
  });

  test('localStorage содержит ключи Auth dopo login', async ({ page }) => {
    const keys = await page.evaluate(() => Object.keys(localStorage));
    console.log('localStorage keys:', keys);
    expect(keys).toContain('tecnosistem_current_user');
  });
});

// -------------------------
// Test di collegamento (rete) – scarichi la vera API, non rompe il flusso
// -------------------------

test.describe('API cloud connectivity', () => {
  test.skip('Endpoint ping risponde', async ({ page }) => {
    await page.goto('about:blank');

    const ping = await page.evaluate(async () => {
      try {
        const url = window.API?.ENDPOINT || window.API?.DEFAULT_ENDPOINT;
        const r = await fetch(url + '?action=ping', { method: 'GET' });
        const text = await r.text();
        return { ok: r.ok, status: r.status, text };
      } catch (e) {
        return { ok: false, error: e.message };
      }
    });

    console.log('Ping result:', JSON.stringify(ping));
    expect(ping.ok).toBe(true, `Ping failed: ${ping.text || ping.error}`);
  });

  test('Auth.resetPassword() per un utente esistente', async ({ page }) => {
    await page.goto(INDEX, { waitUntil: 'domcontentloaded' });

    // Primo crea un user fittizio in Auth per il test
    const newUser = {
      id: '_pw_reset_test',
      name: 'PwTest',
      username: 'pwtest',
      email: `pwtest_${Date.now()}@example.com`,
      passwordHash: '000000000000',
      isPrimary: false
    };

    await page.evaluate((nu) => {
      let users = [];
      try { users = JSON.parse(localStorage.getItem('tecnosistem_users') || '[]'); } catch {}
      users.push(nu);
      localStorage.setItem('tecnosistem_users', JSON.stringify(users));
    }, newUser);

    const result = await page.evaluate((email) => {
      return window.Auth.resetPassword(email, 'NewPassword123!').then(r => ({ success: r.success, error: r.error || null }));
    }, newUser.email);

    console.log('resetPassword result:', result);
    expect(result.success).toBe(true);
  });
});

// -------------------------
// Profuma: gestione utente elimabile via API da browser
// -------------------------

test.describe('Cloud user deletion flow', () => {
  test.skip('Deleting a test user works end-to-end (richiede backend aggiornato)', async ({ page }) => {
    await page.goto(INDEX, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const testUserId = `del_test_${Date.now()}`;

    // 1. Save new user
    const saveResult = await page.evaluate((id) => {
      return window.API.saveUser({
        id: id,
        name: 'Temp User',
        username: 'tempuser',
        email: `${id}@example.com`,
        passwordHash: 'abcdef123456',
        isPrimary: false,
        cloudUrl: '',
        hasFaceId: false,
        createdAt: new Date().toISOString()
      }).then(r => ({ success: r.success === true, error: r.error || null }));
    }, testUserId);

    console.log('saveUser:', saveResult);
    expect(saveResult.success).toBe(true, `saveUser failed: ${saveResult.error}`);

    // 2. Delete it
    const delResult = await page.evaluate((id) => {
      return window.API.deleteUser(id).then(r => ({ success: r.success === true, error: r.error || null }));
    }, testUserId);

    console.log('deleteUser:', delResult);
    expect(delResult.success).toBe(true, `deleteUser failed: ${delResult.error}`);
  });
});