// Test end-to-end in un browser reale con DUE dispositivi e il cloud simulato (esegue il vero apps_script_code.gs).
// Richiede Playwright (npm i -D playwright). Uso, dalla cartella del progetto: node tests/e2e-browser.js
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { createCloud } = require('./cloud-mock');
const assert = require('assert');

(async () => {
    const cloud = createCloud();
    const browser = await chromium.launch();
    const errors = []; let pass = 0, fail = 0;
    const t = async (n, f) => { try { await f(); pass++; console.log('  PASS  ' + n); } catch (e) { fail++; console.log('  FAIL  ' + n + '\n        -> ' + e.message.split('\n')[0]); } };

    async function device(name) {
        const ctx = await browser.newContext();                     // storage separato = dispositivo diverso
        const page = await ctx.newPage();
        page.on('pageerror', e => errors.push(name + ': ' + e.message)); page.on('dialog', d => d.dismiss());
        await page.route(/^https?:\/\//, route => {
            const u = new URL(route.request().url());
            if (!u.pathname.includes('/macros/s/')) return route.abort();
            const action = u.searchParams.get('action');
            const params = Object.fromEntries(u.searchParams.entries());
            const body = route.request().method() === 'POST' ? cloud.rawPost(action, JSON.parse(route.request().postData() || '{}')) : cloud.rawGet(params);
            route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body });
        });
        await page.goto('file://' + process.cwd() + '/index.html'); await page.waitForTimeout(800);
        return page;
    }
    const login = async (page, id, pw) => {
        await page.fill('#login-identifier', id); await page.fill('#login-password', pw);
        await page.click('form[onsubmit*="handleLoginSubmit"] button[type=submit]'); await page.waitForTimeout(900);
        return page.evaluate(() => !!Auth.getCurrentUser());
    };

    console.log('\n[Due dispositivi, stesso cloud]');
    const A = await device('A');
    // Dispositivo A: ha gia una password admin salvata in locale (come l'installazione di oggi)
    await A.evaluate(async () => { const us = Auth.getUsers(); us.find(u => u.isPrimary).passwordHash = await Auth.hashPassword('Admin#Segreta1'); Auth.saveUsers(us); });
    await t('A: accesso admin con username e password dalla schermata di login', async () => assert.ok(await login(A, 'bubibs', 'Admin#Segreta1')));
    await A.waitForTimeout(500);
    const B = await device('B');
    await t('B (dispositivo nuovo): password sbagliata rifiutata', async () => assert.ok(!(await login(B, 'bubibs', 'sbagliata123'))));
    await t('B (dispositivo nuovo): accesso con le STESSE credenziali dell\'admin', async () => { assert.ok(await login(B, 'bubibs', 'Admin#Segreta1')); });

    console.log('\n[Cambio password dal profilo]');
    await t('A: Profilo > Cambia password (password attuale errata viene rifiutata, poi cambio riuscito)', async () => {
        await A.evaluate(() => app.openChangePassword());
        await A.fill('#chg-current', 'sbagliata999'); await A.fill('#chg-new1', 'Nuova#Admin2026'); await A.fill('#chg-new2', 'Nuova#Admin2026');
        await A.click('#change-pwd-overlay button[type=submit]'); await A.waitForTimeout(500);
        assert.ok(await A.locator('#change-pwd-overlay').count() === 1, 'doveva restare aperta');
        await A.fill('#chg-current', 'Admin#Segreta1');
        await A.click('#change-pwd-overlay button[type=submit]'); await A.waitForTimeout(800);
        assert.ok(await A.locator('#change-pwd-overlay').count() === 0, 'doveva chiudersi');
    });
    await t('B: la vecchia password non vale piu, la nuova si (dopo logout)', async () => {
        await B.evaluate(() => { Auth.logout(); app.navigate('login'); }); await B.waitForTimeout(300);
        assert.ok(!(await login(B, 'bubibs', 'Admin#Segreta1')));
        assert.ok(await login(B, 'bubibs', 'Nuova#Admin2026'));
    });

    console.log('\n[Impostazioni dal mese in poi, salvate sul cloud, visibili sull\'altro dispositivo]');
    await t('A: imposto lordo 1500 e paga oraria 21 da 2026-11 (valori che prima venivano ignorati)', async () => {
        await A.evaluate(() => app.navigate('salary')); await A.waitForTimeout(300);
        await A.evaluate(() => app.renderSalary('2026-11')); await A.waitForTimeout(200);
        await A.evaluate(() => app.toggleSettings());
        await A.fill('input[name=baseSalary]', '1500'); await A.fill('input[name=hourlyRate]', '21');
        await A.click('#settings-modal button[type=submit]'); await A.waitForTimeout(800);
        const txt = await A.evaluate(() => document.getElementById('salary-stats').innerText.replace(/\s+/g, ' '));
        assert.ok(/Base Mensile € 1\.?500,00/.test(txt), txt.slice(0, 200));
    });
    await t('cloud: righe per 2026-11 e valori corretti, mese in formato testo', () => {
        const d = cloud.getData('fabio_sandrini', true).settings['2026-11'];
        assert.strictEqual(d.baseSalary, 1500); assert.strictEqual(d.hourlyRate, 21);
        assert.ok(cloud.sheets.Settings.rows.some(r => r[0] === '2026-11' && typeof r[0] === 'string'));
    });
    await t('A: i mesi successivi hanno 1500/21, i precedenti restano a 3480,76/17,23', async () => {
        const r = await A.evaluate(() => ['2026-10', '2026-11', '2027-01'].map(m => Store.getSettings(m)));
        assert.deepStrictEqual([r[0].baseSalary, r[0].hourlyRate], [3480.76, 17.23]);
        assert.deepStrictEqual([r[1].baseSalary, r[1].hourlyRate], [1500, 21]);
        assert.deepStrictEqual([r[2].baseSalary, r[2].hourlyRate], [1500, 21]);
    });
    await t('B: dopo la sincronizzazione vede le stesse impostazioni', async () => {
        await B.evaluate(async () => { await app.sync(); }); await B.waitForTimeout(500);
        const r = await B.evaluate(() => [Store.getSettings('2026-10'), Store.getSettings('2026-12')]);
        assert.deepStrictEqual([r[0].baseSalary, r[1].baseSalary, r[1].hourlyRate], [3480.76, 1500, 21]);
    });
    await t('B: cambio la base da 2027-03 -> A la riceve; i mesi prima di marzo non cambiano', async () => {
        await B.evaluate(() => { Store.applySettings('2027-03', { ...Store.getSettings('2027-03'), baseSalary: 1800 }); return Store.flushSettings(); });
        await A.evaluate(async () => { await app.sync(); }); await A.waitForTimeout(500);
        const r = await A.evaluate(() => ['2027-02', '2027-03', '2028-01'].map(m => Store.getSettings(m).baseSalary));
        assert.deepStrictEqual(r, [1500, 1800, 1800]);
    });
    await t('B: cambio la paga oraria di un mese passato (2026-11): propaga anche a 2027-03 gia salvato', async () => {
        await B.evaluate(() => { Store.applySettings('2026-11', { ...Store.getSettings('2026-11'), hourlyRate: 25 }); return Store.flushSettings(); });
        await A.evaluate(async () => { await app.sync(); }); await A.waitForTimeout(500);
        const r = await A.evaluate(() => ['2026-10', '2026-11', '2027-03', '2027-06'].map(m => Store.getSettings(m).hourlyRate));
        assert.deepStrictEqual(r, [17.23, 25, 25, 25]);
    });

    console.log('\n[Festivi nell\'app]');
    await t('report del 25/12/2026 (venerdi, 8:00-17:00 con pausa): straordinari 8h al 50%', async () => {
        await A.evaluate(() => app.navigate('report')); await A.waitForTimeout(300);
        await A.evaluate(() => { document.getElementById('field-date').value = '2026-12-25'; document.getElementById('field-start').value = '08:00'; document.getElementById('field-end').value = '17:00'; document.getElementById('field-lunch').checked = true; app.calculateHours(); });
        const v = await A.evaluate(() => [document.getElementById('field-ot25').value, document.getElementById('field-ot50').value]);
        assert.deepStrictEqual(v, ['0.00', '8.00']);
    });
    await t('lo stesso giorno non festivo (24/12, giovedi) non ha maggiorazione', async () => {
        await A.evaluate(() => { document.getElementById('field-date').value = '2026-12-24'; app.calculateHours(); });
        const v = await A.evaluate(() => [document.getElementById('field-ot25').value, document.getElementById('field-ot50').value]);
        assert.deepStrictEqual(v, ['0.00', '0.00']);
    });

    console.log('\n[Utente normale]');
    await t('utente nuovo: impostazioni salvate davvero (partono da 0, non dai valori dell\'admin)', async () => {
        const C = await device('C');
        await C.evaluate(async () => { await Auth.register({ name: 'Anna', username: 'anna', email: 'anna@x.it', phone: '', password: 'Segreta#1234' }); Store.init(); });
        const v0 = await C.evaluate(() => Store.getSettings('2026-11').baseSalary);
        await C.evaluate(async () => { Store.applySettings('2026-11', { ...Store.getSettings('2026-11'), baseSalary: 1700, hourlyRate: 11 }); await Store.flushSettings(); });
        const v1 = await C.evaluate(() => [Store.getSettings('2026-12').baseSalary, Store.getSettings('2026-10').baseSalary]);
        assert.strictEqual(v0, 0); assert.deepStrictEqual(v1, [1700, 0]);
        assert.strictEqual(cloud.getData('fabio_sandrini', true).settings['2026-11'].baseSalary, 1500);   // l'admin non e stato toccato
        assert.strictEqual(cloud.getData(await C.evaluate(() => Auth.getCurrentUser().id), false).settings['2026-11'].baseSalary, 1700);
    });

    console.log('\n' + (errors.length ? 'Errori JS: ' + JSON.stringify(errors) : 'Nessun errore JS nel browser'));
    console.log(`Risultato E2E: ${pass} passati, ${fail} falliti`);
    await browser.close();
    process.exit(fail || errors.length ? 1 : 0);
})();
