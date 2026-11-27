const fs = require('fs');
const path = require('path');

const jsDir = path.join(__dirname, 'js');

// Leggi i file nell'ordine corretto
const files = [
    'auth.js',
    'api.js',
    'store.js',
    'ai.js',
    'app.js'
];

const bundlePath = path.join(jsDir, 'bundle.js');
const backupPath = path.join(__dirname, '.backups', 'bundle.js.prev');

// Backup del bundle corrente prima di sovrascriverlo
if (fs.existsSync(bundlePath)) {
    fs.mkdirSync(path.join(__dirname, '.backups'), { recursive: true });
    fs.copyFileSync(bundlePath, backupPath);
}

// Costruisci il nuovo bundle
let bundleContent = `// TECNOSISTEM ORARI TS - STANDALONE BUNDLE (v2.7)
// Compatibile sia con protocollo http/https che con file:/// locale senza errori CORS
// Generato da build-bundle.js - non modificare manualmente

(function() {
    'use strict';
`;

// Aggiungi ogni modulo
let fileContent = '';
files.forEach(file => {
    try {
        const content = fs.readFileSync(path.join(jsDir, file), 'utf8');
        bundleContent += `\n    // === MODULE: ${file.toUpperCase().replace('.JS', '')} ===\n`;

        // Rimuovi export/import (nel bundle le dipendenze sono già in ambito)
        let cleaned = content
            .replace(/^export\s+default\s+/gm, '')
            .replace(/^export\s+/gm, '')
            .replace(/^\s*import\s[^;]*;?\s*$/gm, '');

        bundleContent += cleaned + '\n';
    } catch (e) {
        console.error(`Errore leggendo ${file}:`, e.message);
    }
});

// Chiudi l'IIFE (app.js espone gia' window.app / window.Auth / window.API / window.Store)
bundleContent += `
    if (!window.AI && typeof AI !== 'undefined') window.AI = AI;
})();
`;

fs.writeFileSync(bundlePath, bundleContent);
console.log('Bundle aggiornato con successo!');
console.log('File inclusi:', files.join(', '));