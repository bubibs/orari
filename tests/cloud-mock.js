// Simulatore minimale di Google Fogli + Apps Script: esegue il VERO codice di apps_script_code.gs.
// Riproduce anche il comportamento di Fogli che trasforma "2026-10" in una data se la cella non e' formattata come testo.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

class Sheet {
    constructor(name) { this.name = name; this.rows = []; this.fmt = {}; }
    _w(r, c, v) {
        while (this.rows.length < r) this.rows.push([]);
        const row = this.rows[r - 1]; while (row.length < c) row.push('');
        if (typeof v === 'string' && /^\d{4}-\d{2}$/.test(v) && this.fmt[r + ':' + c] !== '@') v = new Date(+v.slice(0, 4), +v.slice(5, 7) - 1, 1);
        row[c - 1] = v;
    }
    getLastRow() { return this.rows.length; }
    getLastColumn() { return this.rows.reduce((m, r) => Math.max(m, r.length), 0); }
    appendRow(vals) { const r = this.rows.length + 1; vals.forEach((v, i) => this._w(r, i + 1, v)); }
    deleteRow(i) { this.rows.splice(i - 1, 1); }
    _grid() { const w = this.getLastColumn(); return this.rows.map(r => { const x = r.slice(); while (x.length < w) x.push(''); return x; }); }
    getDataRange() { return this.getRange(1, 1, Math.max(1, this.rows.length), Math.max(1, this.getLastColumn())); }
    getRange(r, c, nr = 1, nc = 1) {
        const sh = this;
        return {
            getValues() { const g = sh._grid(); const out = []; for (let i = 0; i < nr; i++) { const row = []; for (let j = 0; j < nc; j++) row.push((g[r - 1 + i] || [])[c - 1 + j] ?? ''); out.push(row); } return out; },
            getDisplayValues() { return this.getValues().map(row => row.map(v => v instanceof Date ? v.toISOString().slice(0, 10) : String(v))); },
            setValues(vals) { vals.forEach((row, i) => row.forEach((v, j) => sh._w(r + i, c + j, v))); },
            setNumberFormat(f) { for (let i = 0; i < nr; i++) for (let j = 0; j < nc; j++) sh.fmt[(r + i) + ':' + (c + j)] = f; }
        };
    }
}

function createCloud() {
    const sheets = {};
    const props = {};
    const ss = {
        getSheetByName: n => sheets[n] || null,
        insertSheet: n => (sheets[n] = new Sheet(n)),
        getSpreadsheetTimeZone: () => 'Europe/Rome'
    };
    const out = t => ({ _t: t, setMimeType() { return this; }, getContent() { return this._t; } });
    const ctx = {
        console,
        SpreadsheetApp: { getActiveSpreadsheet: () => ss },
        ContentService: { createTextOutput: out, MimeType: { JSON: 'json', TEXT: 'text' } },
        PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] ?? null, deleteProperty: k => { delete props[k]; } }) },
        Utilities: { DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
            computeDigest: (alg, text) => Array.from(require('crypto').createHash('sha256').update(text, 'utf8').digest()).map(b => b > 127 ? b - 256 : b),
            formatDate: (d, tz, f) => f === 'yyyy-MM' ? d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') : d.toISOString().slice(0, 10) },
        LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
        Logger: { log() {} }
    };
    vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'apps_script_code.gs'), 'utf8'), ctx);
    const parse = o => JSON.parse(o.getContent());
    return {
        sheets, ss, props,
        get: (params) => parse(ctx.doGet({ parameter: params })),
        post: (action, body) => parse(ctx.doPost({ parameter: { action }, postData: { contents: JSON.stringify(body) } })),
        getData: (userId, isPrimary) => parse(ctx.doGet({ parameter: { action: 'getData', ...(userId ? { userId, isPrimary: isPrimary ? '1' : '0' } : {}) } })),
        rawGet: (params) => ctx.doGet({ parameter: params }).getContent(),
        rawPost: (action, body) => ctx.doPost({ parameter: { action }, postData: { contents: JSON.stringify(body) } }).getContent(),
        getUsers: () => parse(ctx.doGet({ parameter: { action: 'getUsers' } })),
        ctx
    };
}
module.exports = { createCloud, Sheet };
