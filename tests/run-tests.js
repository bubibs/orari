// Test automatici di Orari TS. Uso:  node tests/run-tests.js   (oppure: npm test)
// Carica il codice REALE da js/bundle.js (blocco @pure-start/@pure-end + oggetto Auth), nessuna dipendenza esterna.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'bundle.js'), 'utf8').replace(/\r\n/g, '\n');

// --- carica le funzioni pure ---
const pure = src.slice(src.indexOf('// @pure-start'), src.indexOf('// @pure-end'));
const PURE_NAMES = ['escapeHtml', 'jsAttr', 'oreDaOrario', 'straordinariGiorno', 'stimaNettoMensile', 'sha256Hex', 'pasqua', 'nomeFestivo', 'isFestivo', 'isGiornoAl50',
    'CAMPI_IMPOSTAZIONI', 'MESE_RE', 'numOrNull', 'impostazioniEffettive', 'applicaImpostazioni', 'calcolaStipendio'];
const P = new Function(pure + '\nreturn { ' + PURE_NAMES.join(', ') + ' };')();
const { createCloud } = require('./cloud-mock');

// --- carica Auth con localStorage/crypto simulati ---
function extractObject(name) {
    const lines = src.split('\n');
    const start = lines.findIndex(l => l.startsWith('const ' + name + ' = {'));
    const end = lines.findIndex((l, i) => i > start && l.startsWith('};'));
    return lines.slice(start, end + 1).join('\n');
}
function mkLocalStorage() {
    const store = {};
    return { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; }, _store: store };
}
function loadAuth(api) {
    const lines = src.split('\n');
    const start = lines.findIndex(l => l.startsWith('const Auth = {'));
    const end = lines.findIndex((l, i) => i > start && l.startsWith('};'));
    const body = lines.slice(start, end + 1).join('\n');
    const ls = mkLocalStorage();
    const win = { crypto: { subtle: crypto.webcrypto.subtle } };
    if (api) win.API = api;
    const fn = new Function('window', 'localStorage', 'crypto', 'TextEncoder', 'sha256Hex', body + '\nreturn Auth;');
    const A = fn(win, ls, crypto.webcrypto, TextEncoder, P.sha256Hex);
    A._ls = ls;
    return A;
}
function loadStore(userRef, api) {
    const ls = mkLocalStorage();
    const fn = new Function('Auth', 'API', 'localStorage', 'window', 'CustomEvent', ...PURE_NAMES, extractObject('Store') + '\nreturn Store;');
    const St = fn({ getCurrentUser: () => userRef.user }, api || { saveSettings: async () => ({ success: true }) }, ls, { dispatchEvent() {} }, class { constructor() {} }, ...PURE_NAMES.map(n => P[n]));
    St._ls = ls;
    return St;
}

let pass = 0, fail = 0;
async function t(name, f) {
    try { await f(); pass++; console.log('  PASS  ' + name); }
    catch (e) { fail++; console.log('  FAIL  ' + name + '\n        -> ' + e.message.split('\n')[0]); }
}
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

(async () => {
    console.log('\n[Ore e straordinari]');
    await t('8:00-17:00 con pausa = 8h, nessuno straordinario', () => {
        const h = P.oreDaOrario('08:00', '17:00', true); assert.ok(near(h, 8));
        assert.deepStrictEqual(P.straordinariGiorno(h, '2026-11-10', false), { ot25: 0, ot50: 0 });
    });
    await t('8:00-19:00 con pausa = 10h, 2h al 25%', () => {
        const h = P.oreDaOrario('08:00', '19:00', true);
        assert.deepStrictEqual(P.straordinariGiorno(h, '2026-11-10', false), { ot25: 2, ot50: 0 });
    });
    await t('sabato 8-12: 4h al 50%', () => {
        assert.deepStrictEqual(P.straordinariGiorno(P.oreDaOrario('08:00', '12:00', false), '2026-11-14', false), { ot25: 0, ot50: 4 });
    });
    await t('domenica: tutto al 50%', () => {
        assert.deepStrictEqual(P.straordinariGiorno(5, '2026-11-15', false), { ot25: 0, ot50: 5 });
    });
    await t('turno di notte 22:00-06:00 = 8h', () => assert.ok(near(P.oreDaOrario('22:00', '06:00', false), 8)));
    await t('inizio = fine -> 0h', () => assert.strictEqual(P.oreDaOrario('08:00', '08:00', false), 0));
    await t('pausa su turno breve non va sotto zero', () => assert.strictEqual(P.oreDaOrario('08:00', '08:30', true), 0));
    await t('assenza (ferie/malattia): nessuno straordinario nemmeno nel weekend', () => {
        assert.deepStrictEqual(P.straordinariGiorno(10, '2026-11-10', true), { ot25: 0, ot50: 0 });
        assert.deepStrictEqual(P.straordinariGiorno(10, '2026-11-14', true), { ot25: 0, ot50: 0 });
    });
    await t('data mancante o non valida non manda in errore', () => {
        assert.deepStrictEqual(P.straordinariGiorno(9, '', false), { ot25: 1, ot50: 0 });
        assert.deepStrictEqual(P.straordinariGiorno(9, 'boh', false), { ot25: 1, ot50: 0 });
    });
    await t('precisione: 8:00-17:25 con pausa = 8.4167h (minuti non persi)', () => assert.ok(near(P.oreDaOrario('08:00', '17:25', true), 8 + 25 / 60)));
    await t('cambio ora legale (25/10/2026 domenica) trattato come domenica', () => {
        assert.deepStrictEqual(P.straordinariGiorno(8, '2026-10-25', false), { ot25: 0, ot50: 8 });
    });

    console.log('\n[Stima netto]');
    await t('lordo 0 -> netto 0 (prima dava 250 €)', () => assert.strictEqual(P.stimaNettoMensile(0), 0));
    await t('lordo negativo/NaN -> 0', () => { assert.strictEqual(P.stimaNettoMensile(-50), 0); assert.strictEqual(P.stimaNettoMensile(NaN), 0); });
    await t('netto mai superiore al lordo (0-8000 €)', () => { for (let l = 0; l <= 8000; l += 25) assert.ok(P.stimaNettoMensile(l) <= l, 'lordo ' + l); });
    await t('netto non decresce al crescere del lordo', () => { let prev = -1; for (let l = 0; l <= 8000; l += 10) { const n = P.stimaNettoMensile(l); assert.ok(n >= prev - 1e-9, 'a lordo ' + l); prev = n; } });
    await t('lordo 2000: netto plausibile (1500-1800)', () => { const n = P.stimaNettoMensile(2000); assert.ok(n > 1500 && n < 1800, n.toFixed(2)); });

    console.log('\n[Sicurezza: escape HTML]');
    await t('escapeHtml neutralizza <script> e virgolette', () => {
        const out = P.escapeHtml('<img src=x onerror=alert(1)>"\'&');
        assert.ok(!out.includes('<') && !out.includes('>') && !out.includes('"') && !out.includes("'"), out);
    });
    await t('escapeHtml gestisce null/undefined/numeri', () => { assert.strictEqual(P.escapeHtml(null), ''); assert.strictEqual(P.escapeHtml(undefined), ''); assert.strictEqual(P.escapeHtml(12), '12'); });
    await t("jsAttr: un nome con apice e virgolette non esce dall'attributo onclick", () => {
        const evil = `x');alert(1);//"><b>`;
        const html = `<button onclick="app.f('${P.jsAttr(evil)}')">`;
        assert.ok(!/onclick="[^"]*"[^>]*[<]b/.test(html) && (html.match(/"/g) || []).length === 2, html);
        assert.ok(!html.includes("');alert(1)"), html);
    });
    await t('pulizia di tutti i punti che mostravano dati utente (company/notes/person)', () => {
        for (const bad of ['${c.company}</strong>', '${c.person || \'Nessun referente\'}', '"${r.notes}"</div>', '>${u.name}</div>'])
            assert.ok(!src.includes(bad), 'ancora non escapato: ' + bad);
    });

    console.log('\n[SHA-256]');
    await t('fallback puro = crypto di Node (vettori noti + unicode + messaggi lunghi)', () => {
        for (const m of ['', 'abc', 'Brescia', 'àèì €', 'x'.repeat(55), 'x'.repeat(56), 'x'.repeat(64), 'x'.repeat(1000)])
            assert.strictEqual(P.sha256Hex(m), crypto.createHash('sha256').update(m, 'utf8').digest('hex'), JSON.stringify(m.slice(0, 20)));
    });

    console.log('\n[Autenticazione]');
    await t('nel codice non c\'è piu la vecchia password admin', () => assert.ok(!src.includes('Brescia1-')));
    await t('"Accedi con Google" con la sola email non entra piu', async () => {
        const A = loadAuth(); await A.init();
        const r = await A.loginWithGoogle({ email: 'bubibs@gmail.com' });
        assert.strictEqual(r.success, false);
        assert.strictEqual(A.getCurrentUser(), null);
    });
    await t('admin senza password impostata non puo entrare', async () => {
        const A = loadAuth(); await A.init();
        const r = await A.login('bubibs', ''); assert.strictEqual(r.success, false);
        const r2 = await A.login('bubibs', 'qualsiasi'); assert.strictEqual(r2.success, false);
    });
    await t('utente senza hash non entra con password a caso', async () => {
        const A = loadAuth(); await A.init();
        const u = A.getUsers(); u.push({ id: 'u2', username: 'mario', email: 'm@x.it', name: 'Mario', isPrimary: false }); A.saveUsers(u);
        assert.strictEqual((await A.login('mario', 'qualsiasi')).success, false);
    });
    await t('registrazione + login corretto/errato', async () => {
        const A = loadAuth(); await A.init();
        const reg = await A.register({ name: 'Anna', username: 'anna', email: 'anna@x.it', phone: '', password: 'passwordSicura1' });
        assert.strictEqual(reg.success, true, reg.error);
        A.logout();
        assert.strictEqual((await A.login('anna', 'passwordSicura1')).success, true);
        assert.strictEqual((await A.login('anna', 'sbagliata123')).success, false);
    });
    await t('password troppo corta (<8) rifiutata', async () => {
        const A = loadAuth(); await A.init();
        const reg = await A.register({ name: 'B', username: 'bbb', email: 'b@x.it', phone: '', password: 'abc' });
        assert.strictEqual(reg.success, false);
    });
    await t('il riavvio dell\'app non sovrascrive piu la password dell\'admin', async () => {
        const A = loadAuth(); await A.init();
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('NuovaPassword!9'); A.saveUsers(us);
        await A.init();
        assert.strictEqual((await A.login('bubibs', 'NuovaPassword!9')).success, true);
    });


    console.log('\n[Festivi al 50%]');
    await t('Pasqua 2026 = 5 aprile, Pasquetta 6 aprile (anche 2025: 21/4, 2027: 29/3)', () => {
        assert.deepStrictEqual(P.pasqua(2026), { m: 4, d: 5 }); assert.deepStrictEqual(P.pasqua(2025), { m: 4, d: 20 }); assert.deepStrictEqual(P.pasqua(2027), { m: 3, d: 28 });
        assert.ok(P.isFestivo('2026-04-06')); assert.ok(P.isFestivo('2025-04-21')); assert.ok(P.isFestivo('2027-03-29'));
    });
    await t('tutti i festivi nazionali 2026 riconosciuti', () => {
        for (const d of ['2026-01-01', '2026-01-06', '2026-04-25', '2026-05-01', '2026-06-02', '2026-08-15', '2026-11-01', '2026-12-08', '2026-12-25', '2026-12-26'])
            assert.ok(P.isFestivo(d), d);
    });
    await t('giorni normali non sono festivi', () => { for (const d of ['2026-11-10', '2026-04-07', '2026-12-24', '2026-12-27', '', 'boh', null]) assert.ok(!P.isFestivo(d), String(d)); });
    await t('Natale 2026 (venerdi) lavorato 8h: tutto al 50%', () => {
        assert.deepStrictEqual(P.straordinariGiorno(8, '2026-12-25', false), { ot25: 0, ot50: 8 });
    });
    await t('1 maggio 2026 (venerdi) e Pasquetta (lunedi): 50%; giorno feriale vicino: normale', () => {
        assert.deepStrictEqual(P.straordinariGiorno(9, '2026-05-01', false), { ot25: 0, ot50: 9 });
        assert.deepStrictEqual(P.straordinariGiorno(9, '2026-04-06', false), { ot25: 0, ot50: 9 });
        assert.deepStrictEqual(P.straordinariGiorno(9, '2026-04-07', false), { ot25: 1, ot50: 0 });
    });
    await t('festivo con ferie/malattia: nessuna maggiorazione', () => assert.deepStrictEqual(P.straordinariGiorno(8, '2026-12-25', true), { ot25: 0, ot50: 0 }));

    console.log('\n[Impostazioni stipendio: riporto sui mesi successivi]');
    const adminRef = { user: { id: 'fabio_sandrini', isPrimary: true } };
    await t('base 1500 e 2000 NON vengono piu ignorate (prima tornavano a 3480,76)', () => {
        const S = loadStore(adminRef);
        for (const v of [1500, 2000]) { S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: v }); assert.strictEqual(S.getSettings('2026-11').baseSalary, v); }
    });
    await t('modifica da un mese: vale per i mesi successivi, NON per i precedenti', () => {
        const S = loadStore(adminRef);
        S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 2500, hourlyRate: 20 });
        for (const m of ['2026-11', '2026-12', '2027-03', '2030-01']) { const g = S.getSettings(m); assert.strictEqual(g.baseSalary, 2500, m); assert.strictEqual(g.hourlyRate, 20, m); }
        for (const m of ['2026-10', '2026-01', '2025-12']) { const g = S.getSettings(m); assert.strictEqual(g.baseSalary, 3480.76, m); assert.strictEqual(g.hourlyRate, 17.23, m); }
    });
    await t('seconda modifica a un mese successivo: mesi in mezzo invariati, mesi dopo aggiornati', () => {
        const S = loadStore(adminRef);
        S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 2500 });
        S.applySettings('2027-02', { ...S.getSettings('2027-02'), baseSalary: 2700 });
        assert.strictEqual(S.getSettings('2027-01').baseSalary, 2500);
        assert.strictEqual(S.getSettings('2027-02').baseSalary, 2700);
        assert.strictEqual(S.getSettings('2027-09').baseSalary, 2700);
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 2500);
    });
    await t('modifica fatta su un mese PASSATO propaga ai mesi successivi gia salvati, solo per i campi cambiati', () => {
        const S = loadStore(adminRef);
        S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 2500 });
        S.applySettings('2026-12', { ...S.getSettings('2026-12'), hourlyRate: 22 });
        S.applySettings('2026-09', { ...S.getSettings('2026-09'), baseSalary: 2400 });
        assert.strictEqual(S.getSettings('2026-08').baseSalary, 3480.76);   // prima: invariato
        assert.strictEqual(S.getSettings('2026-09').baseSalary, 2400);
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 2400);      // dopo: aggiornato
        assert.strictEqual(S.getSettings('2026-12').baseSalary, 2400);
        assert.strictEqual(S.getSettings('2026-12').hourlyRate, 22);        // campo non toccato: resta
        assert.strictEqual(S.getSettings('2026-10').hourlyRate, 17.23);
    });
    await t('i valori si leggono come numeri anche se arrivano come testo con la virgola', () => {
        const eff = P.impostazioniEffettive({ '2026-01': { baseSalary: '1.800', hourlyRate: '15,5', taxRate: '' } }, '2026-02', { baseSalary: 0, hourlyRate: 0, taxRate: 7 });
        assert.strictEqual(eff.hourlyRate, 15.5); assert.strictEqual(eff.taxRate, 7);
    });
    await t('NUOVO UTENTE: le impostazioni vengono davvero salvate (prima andavano perse) e partono da 0', () => {
        const ref = { user: { id: 'user_x', isPrimary: false } };
        const S = loadStore(ref);
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 0);
        S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 1800, hourlyRate: 12.5 });
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 1800);
        assert.strictEqual(S.getSettings('2026-12').hourlyRate, 12.5);
        assert.strictEqual(S.getSettings('2026-10').baseSalary, 0);
    });
    await t('utenti diversi non si vedono le impostazioni', () => {
        const ref = { user: { id: 'user_a', isPrimary: false } };
        const S = loadStore(ref); S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 1800 });
        ref.user = { id: 'user_b', isPrimary: false };
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 0);
    });
    await t('invio al cloud: righe complete per ogni mese toccato; se offline restano in coda e partono dopo', async () => {
        const sent = []; let online = false;
        const S = loadStore(adminRef, { saveSettings: async r => { if (!online) return { success: false }; sent.push(r); return { success: true }; } });
        S.applySettings('2026-11', { ...S.getSettings('2026-11'), baseSalary: 2500 });
        S.applySettings('2027-02', { ...S.getSettings('2027-02'), hourlyRate: 21 });
        S.applySettings('2026-09', { ...S.getSettings('2026-09'), baseSalary: 2400 });
        let r = await S.flushSettings(); assert.strictEqual(r.inAttesa, 3); assert.strictEqual(sent.length, 0);
        online = true; r = await S.flushSettings(); assert.strictEqual(r.inAttesa, 0);
        const byMonth = Object.fromEntries(sent.map(x => [x.month, x]));
        assert.deepStrictEqual(Object.keys(byMonth).sort(), ['2026-09', '2026-11', '2027-02']);
        assert.strictEqual(byMonth['2027-02'].baseSalary, 2400);   // riga completa con il riporto
        assert.strictEqual(byMonth['2027-02'].hourlyRate, 21);
        assert.ok(byMonth['2026-11'].updatedAt > 0);
        assert.strictEqual((await S.flushSettings()).inviati, 0);
    });
    await t('sincronizzazione: vince la voce piu recente; quella locale piu nuova resta e viene reinviata', async () => {
        const S = loadStore(adminRef);
        S.saveSettings({ baseSalary: 3000, hourlyRate: 18, allowanceReturn: 30, allowanceOvernight: 60, allowanceForeign: 105, taxRate: 27 }, '2026-11');
        const t0 = JSON.parse(S._ls.getItem('tecnosistem_settings'))['2026-11'].updatedAt;
        S.mergeCloudData({ apiVersion: 2, settings: { '2026-11': { baseSalary: 1, updatedAt: t0 - 1000 }, '2026-12': { baseSalary: 4000, hourlyRate: 19, updatedAt: t0 + 5 } } });
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 3000);     // locale piu recente
        assert.strictEqual(S.getSettings('2026-12').baseSalary, 4000);     // dal cloud
        assert.ok(S._pendingSettings().includes('2026-11'));
    });
    await t('sincronizzazione: un utente non primario ignora le impostazioni del cloud se lo script non e aggiornato', () => {
        const S = loadStore({ user: { id: 'user_a', isPrimary: false } });
        S.mergeCloudData({ settings: { '2026-11': { baseSalary: 3480.76, updatedAt: 0 } } });
        assert.strictEqual(S.getSettings('2026-11').baseSalary, 0);
    });
    await t('mese salvato come data dal foglio ("Thu Oct 01 2026...") viene normalizzato', () => {
        const S = loadStore(adminRef);
        S.mergeCloudData({ settings: { 'Thu Oct 01 2026 00:00:00 GMT+0200': { baseSalary: 2222, hourlyRate: 19, updatedAt: 0 } } });
        assert.strictEqual(S.getSettings('2026-10').baseSalary, 2222);
        assert.strictEqual(S.getSettings('2026-09').baseSalary, 3480.76);
    });
    await t('stipendio: lordo = base + straordinari + indennita con i valori del mese (e festivo al 50% con paga oraria 20)', () => {
        const st = P.calcolaStipendio([
            { type: 'sede', totalHours: '8.0h', overtime25: '1.00', overtime50: '0.00' },
            { type: 'trasferta_notte', totalHours: '8h', overtime25: '0', overtime50: '8.00' },
            { type: 'trasferta_estero', totalHours: '9h', overtime25: '1', overtime50: '0' }], { baseSalary: 2000, hourlyRate: 20, allowanceReturn: 30, allowanceOvernight: 60, allowanceForeign: 105, taxRate: 0 });
        assert.ok(near(st.extra25, 2 * 20 * 1.25, 1e-6)); assert.ok(near(st.extra50, 8 * 20 * 1.5, 1e-6));
        assert.ok(near(st.allowance, 165, 1e-6)); assert.ok(near(st.lordo, 2000 + 50 + 240 + 165, 1e-6));
        assert.ok(st.netto > 0 && st.netto < st.lordo);
    });

    console.log('\n[Cloud (script Google Apps Script reale, simulato)]');
    await t('il mese viene scritto come testo "2026-10" e non diventa una data', () => {
        const c = createCloud();
        c.post('saveSettings', { month: '2026-10', baseSalary: 2000, hourlyRate: 20, updatedAt: 5, isPrimary: true, userId: 'fabio_sandrini' });
        assert.strictEqual(typeof c.sheets.Settings.rows[1][0], 'string');
        assert.strictEqual(c.getData('fabio_sandrini', true).settings['2026-10'].baseSalary, 2000);
    });
    await t('righe vecchie con il mese gia trasformato in data vengono lette correttamente', () => {
        const c = createCloud();
        c.ss.insertSheet('Settings').appendRow(['month', 'baseSalary', 'hourlyRate', 'allowanceReturn', 'allowanceOvernight', 'allowanceForeign', 'taxRate']);
        c.sheets.Settings.rows.push([new Date(2026, 9, 1), 1999, 18, 30, 60, 105, 27]);
        const s = c.getData('fabio_sandrini', true).settings;
        assert.strictEqual(s['2026-10'].baseSalary, 1999);
        assert.ok(c.sheets.Settings.rows[0].includes('userId') && c.sheets.Settings.rows[0].includes('updatedAt'), 'colonne nuove aggiunte');
    });
    await t('ogni utente vede e modifica solo le proprie impostazioni (l\'admin non viene sovrascritto)', () => {
        const c = createCloud();
        c.post('saveSettings', { month: '2026-10', baseSalary: 3000, hourlyRate: 20, updatedAt: 10, isPrimary: true, userId: 'fabio_sandrini' });
        c.post('saveSettings', { month: '2026-10', baseSalary: 1000, hourlyRate: 9, updatedAt: 11, isPrimary: false, userId: 'user_x' });
        assert.strictEqual(c.getData('fabio_sandrini', true).settings['2026-10'].baseSalary, 3000);
        assert.strictEqual(c.getData('user_x', false).settings['2026-10'].baseSalary, 1000);
        assert.strictEqual(c.getData('user_y', false).settings['2026-10'], undefined);
        assert.strictEqual(c.getData('user_x', false).settings['default'], undefined);
    });
    await t('una scrittura piu vecchia non sovrascrive una piu recente', () => {
        const c = createCloud();
        c.post('saveSettings', { month: '2026-10', baseSalary: 3000, updatedAt: 100, isPrimary: true });
        const r = c.post('saveSettings', { month: '2026-10', baseSalary: 1, updatedAt: 50, isPrimary: true });
        assert.strictEqual(r.ignored, true);
        assert.strictEqual(c.getData('x', true).settings['2026-10'].baseSalary, 3000);
    });
    await t('getUsers leggero e apiVersion 2 presenti', () => {
        const c = createCloud();
        c.post('saveUser', { id: 'u1', name: 'A', username: 'a', email: 'a@x.it', passwordHash: 'h' });
        const u = c.getUsers(); assert.strictEqual(u.users.length, 1); assert.strictEqual(u.apiVersion, 2);
        assert.strictEqual(c.getData().apiVersion, 2);
    });

    console.log('\n[Login da qualsiasi dispositivo (stesse credenziali)]');
    const mkApi = (cloud, st) => ({
        async fetchUsers() { return st.offline ? null : cloud.getUsers().users; },
        async saveUser(u) { if (st.offline) return { success: false }; const { pwDirty, ...x } = u; cloud.post('saveUser', x); return { success: true }; },
        async saveSettings() { return { success: true }; }
    });
    const mkDevice = async (cloud, st) => { const A = loadAuth(mkApi(cloud, st)); await A.init(); return A; };
    await t('admin: il primo accesso da un dispositivo che ha gia la password la carica sul cloud; un secondo dispositivo entra con le stesse credenziali', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('PasswordAdmin#1'); A.saveUsers(us);
        assert.strictEqual((await A.login('bubibs', 'PasswordAdmin#1')).success, true);
        await new Promise(r => setTimeout(r, 20));
        const B = await mkDevice(cloud, st);                                     // dispositivo nuovo, senza nulla
        assert.strictEqual((await B.login('bubibs', 'PasswordAdmin#1')).success, true);
        assert.strictEqual((await B.login('bubibs@gmail.com', 'PasswordAdmin#1')).success, true);
        assert.strictEqual((await B.login('bubibs', 'sbagliata')).success, false);
    });
    await t('cambio password su un dispositivo: vale subito sugli altri, la vecchia non funziona piu', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('Vecchia#1234'); A.saveUsers(us);
        await A.login('bubibs', 'Vecchia#1234'); await new Promise(r => setTimeout(r, 20));
        const B = await mkDevice(cloud, st); await B.login('bubibs', 'Vecchia#1234');
        const ch = await B.changePassword('Vecchia#1234', 'Nuova#98765'); assert.strictEqual(ch.success, true, ch.error);
        await new Promise(r => setTimeout(r, 20));
        assert.strictEqual((await A.login('bubibs', 'Nuova#98765')).success, true);
        assert.strictEqual((await A.login('bubibs', 'Vecchia#1234')).success, false);
    });
    await t('senza rete si entra con le credenziali gia salvate sul dispositivo', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('Offline#1234'); A.saveUsers(us);
        await A.login('bubibs', 'Offline#1234'); A.logout();
        st.offline = true;
        assert.strictEqual((await A.login('bubibs', 'Offline#1234')).success, true);
        assert.strictEqual((await A.login('bubibs', 'x')).success, false);
    });
    await t('cambio password offline: non viene annullato dalla sincronizzazione e parte appena torna la rete', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('Prima#12345'); A.saveUsers(us);
        await A.login('bubibs', 'Prima#12345'); await new Promise(r => setTimeout(r, 20));
        st.offline = true; await A.changePassword('Prima#12345', 'Dopo#123456'); await new Promise(r => setTimeout(r, 20));
        st.offline = false;
        A.mergeCloudUsers(cloud.getUsers().users);                                // sync con il cloud ancora vecchio
        assert.strictEqual((await A.login('bubibs', 'Dopo#123456')).success, true);   // la nuova password regge e viene inviata
        await new Promise(r => setTimeout(r, 30));
        const B = await mkDevice(cloud, st);
        assert.strictEqual((await B.login('bubibs', 'Dopo#123456')).success, true);
    });
    await t('un utente normale marcato "primario" nel cloud non puo cambiare la password dell\'admin', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('Admin#123456'); A.saveUsers(us);
        await A.login('bubibs', 'Admin#123456'); await new Promise(r => setTimeout(r, 20));
        cloud.post('saveUser', { id: 'user_evil', name: 'E', username: 'evil', email: 'e@x.it', passwordHash: await A.hashPassword('Evil#123456'), isPrimary: true });
        const B = await mkDevice(cloud, st);
        assert.strictEqual((await B.login('bubibs', 'Evil#123456')).success, false);
        assert.strictEqual((await B.login('bubibs', 'Admin#123456')).success, true);
    });
    await t('utente normale: registrato su un dispositivo, entra da un altro; username gia usato altrove e rifiutato', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const reg = await A.register({ name: 'Anna', username: 'anna', email: 'anna@x.it', phone: '', password: 'Segreta#1234' }); assert.strictEqual(reg.success, true, reg.error);
        await new Promise(r => setTimeout(r, 20));
        const B = await mkDevice(cloud, st);
        assert.strictEqual((await B.login('anna', 'Segreta#1234')).success, true);
        assert.strictEqual((await B.register({ name: 'Altra', username: 'anna', email: 'altra@x.it', phone: '', password: 'Altra#123456' })).success, false);
    });
    await t('recupero password admin dal foglio Google: impostaPasswordAdmin() scrive l\'hash giusto e un dispositivo nuovo entra con la nuova password', async () => {
        const cloud = createCloud(), st = { offline: false };
        cloud.props.ADMIN_PASSWORD = 'Recupero#2026';
        cloud.ctx.impostaPasswordAdmin();
        assert.strictEqual(cloud.props.ADMIN_PASSWORD, undefined);             // la proprieta viene cancellata
        const B = await mkDevice(cloud, st);
        assert.strictEqual((await B.login('bubibs', 'Recupero#2026')).success, true);
        assert.strictEqual((await B.login('bubibs', 'Brescia1-')).success, false);
    });
    await t('admin: "Password dimenticata" con codice temporaneo NON e piu possibile (chiunque potrebbe cambiare la password su tutti i dispositivi)', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        const r = await A.requestPasswordReset('bubibs'); assert.strictEqual(r.success, false);
        const c = await A.completePasswordReset('bubibs', '123456', 'Hacker#12345'); assert.strictEqual(c.success, false);
    });
    await t('reimpostazione password altrui: solo da admin collegato, e mai sull\'account admin', async () => {
        const cloud = createCloud(), st = { offline: false };
        const A = await mkDevice(cloud, st);
        await A.register({ name: 'Anna', username: 'anna', email: 'anna@x.it', phone: '', password: 'Segreta#1234' });      // ora collegata come Anna
        assert.strictEqual((await A.resetPassword('anna', 'NuovaPwd#1234')).success, false);                              // non admin
        const us = A.getUsers(); us.find(u => u.isPrimary).passwordHash = await A.hashPassword('Admin#123456'); A.saveUsers(us);
        await A.login('bubibs', 'Admin#123456');
        assert.strictEqual((await A.resetPassword('anna', 'NuovaPwd#1234')).success, true);                               // admin
        assert.strictEqual((await A.resetPassword('bubibs', 'Hacker#12345')).success, false);                             // mai sull'admin
    });
    await t('l\'admin che reimposta la password di un utente non lo rende amministratore sul cloud', async () => {
        const calls = [];
        const apiSrc = extractObject('API');
        const fn = new Function('Auth', 'localStorage', 'fetch', 'AbortController', 'window', apiSrc + '\nreturn API;');
        const API = fn({ getCurrentUser: () => ({ id: 'fabio_sandrini', name: 'Fabio', email: 'bubibs@gmail.com', isPrimary: true }) }, mkLocalStorage(),
            async (url, o) => { calls.push(JSON.parse(o.body)); return { ok: true }; }, AbortController, {});
        await API.saveUser({ id: 'user_x', name: 'X', username: 'x', email: 'x@x.it', passwordHash: 'h', isPrimary: false, pwDirty: true });
        assert.strictEqual(calls[0].isPrimary, false); assert.strictEqual(calls[0].id, 'user_x'); assert.ok(!('pwDirty' in calls[0]));
    });

    console.log(`\nRisultato: ${pass} passati, ${fail} falliti`);
    process.exit(fail ? 1 : 0);
})();
