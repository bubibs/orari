// js/config.js
const STORAGE_KEY = 'registro_lavoro_data';
const SETTINGS_KEY = 'registro_lavoro_settings';

// Valori di default se il LocalStorage è vuoto
const DEFAULT_SETTINGS = {
    baseLorda: 2300,
    tariffaOver25: 14.50,
    tariffaOver50: 18.00,
    diariaRientro: 15.00,
    diariaPernotto: 46.48,
    diariaEstero: 75.00,
    aliquotaFiscale: 23,
    cloudUrl: "" // Incolla qui il tuo URL di Google Apps Script
};

// Funzione per recuperare i settaggi salvati
function getSettings() {
    const saved = localStorage.getItem(SETTINGS_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
}