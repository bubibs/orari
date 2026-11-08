// --- Assistente AI Intelligente per Orari TS ---

export const AI = {
    // Cronologia conversazione (ultimi 10 messaggi)
    conversationHistory: [],

    addToHistory(role, text) {
        this.conversationHistory.push({ role, text });
        if (this.conversationHistory.length > 10) {
            this.conversationHistory = this.conversationHistory.slice(-10);
        }
    },

    clearHistory() {
        this.conversationHistory = [];
    },

    // Chiave API opzionale per modelli LLM (es. Google Gemini)
    getApiKey() {
        return localStorage.getItem('tecnosistem_ai_key') || '';
    },

    setApiKey(key) {
        if (key) {
            localStorage.setItem('tecnosistem_ai_key', key.trim());
        } else {
            localStorage.removeItem('tecnosistem_ai_key');
        }
    },

    // Motore Principale di Elaborazione Richieste
    async ask(query, store, auth) {
        const q = (query || '').trim().toLowerCase();
        if (!q) {
            return {
                text: "Ciao! Sono il tuo assistente AI Tecnosistem. Chiedimi un riepilogo delle tue ore, come recuperare i dati sul cloud, la stima dello stipendio o di compilare un report!"
            };
        }

        const apiKey = this.getApiKey();
        const currentUser = auth ? auth.getCurrentUser() : null;
        const reports = store ? store.getReports() : [];
        const currentMonth = new Date().toISOString().slice(0, 7);
        const settings = store ? store.getSettings(currentMonth) : {};

        // Se l'utente ha inserito una chiave Gemini API, prova la chiamata Generativa con contesto
        if (apiKey && apiKey.startsWith('AIza')) {
            try {
                this.addToHistory('user', query);
                const result = await this.callGemini(query, apiKey, { reports, settings, currentUser, currentMonth });
                if (result && result.text) {
                    this.addToHistory('model', result.text);
                }
                return result;
            } catch (err) {
                console.warn("Fallback su motore AI locale:", err);
                if (this.conversationHistory.length > 0 && this.conversationHistory[this.conversationHistory.length - 1].role === 'user') {
                    this.conversationHistory.pop();
                }
            }
        }

        // --- MOTORE AI LOCALE CONTESTUALE (Funziona ovunque, 100% gratuito e offline) ---
        const localResult = this.processLocalIntent(q, reports, settings, currentMonth, currentUser);
        this.addToHistory('user', query);
        if (localResult && localResult.text) {
            this.addToHistory('model', localResult.text);
        }
        return localResult;
    },

    // Estrazione del mese target dalla richiesta in linguaggio naturale (es. "ore lavorate ad ottobre")
    extractMonthFromQuery(q, fallbackMonth) {
        if (!q) return fallbackMonth || new Date().toISOString().slice(0, 7);
        const lower = q.toLowerCase();

        // Dizionario mesi italiani
        const monthsMap = {
            'gennaio': '01', 'gen': '01',
            'febbraio': '02', 'feb': '02',
            'marzo': '03', 'mar': '03',
            'aprile': '04', 'apr': '04',
            'maggio': '05', 'mag': '05',
            'giugno': '06', 'giu': '06',
            'luglio': '07', 'lug': '07',
            'agosto': '08', 'ago': '08',
            'settembre': '09', 'set': '09',
            'ottobre': '10', 'ott': '10',
            'novembre': '11', 'nov': '11',
            'dicembre': '12', 'dic': '12'
        };

        const now = new Date();
        const currentYear = fallbackMonth ? fallbackMonth.split('-')[0] : String(now.getFullYear());
        const currentMonthNum = fallbackMonth ? parseInt(fallbackMonth.split('-')[1], 10) : (now.getMonth() + 1);

        // Controllo anno esplicito a 4 cifre nel testo (es. 2024, 2025, 2026, 2027)
        const yearMatch = lower.match(/\b(202\d)\b/);
        const targetYear = yearMatch ? yearMatch[1] : currentYear;

        // Gestione "mese scorso" / "scorso mese" / "mese passato"
        if (lower.includes('mese scorso') || lower.includes('scorso mese') || lower.includes('mese passato')) {
            let y = parseInt(targetYear, 10);
            let m = currentMonthNum - 1;
            if (m < 1) {
                m = 12;
                y--;
            }
            return `${y}-${String(m).padStart(2, '0')}`;
        }

        // Gestione "questo mese" / "mese corrente"
        if (lower.includes('questo mese') || lower.includes('mese corrente') || lower.includes('in corso')) {
            return fallbackMonth;
        }

        // Cerca il nome del mese nel testo
        for (const [name, num] of Object.entries(monthsMap)) {
            const regex = new RegExp(`\\b${name}\\b`, 'i');
            if (regex.test(lower)) {
                return `${targetYear}-${num}`;
            }
        }

        // Controllo formati YYYY-MM o MM/YYYY numerici
        const isoMatch = lower.match(/\b(202\d)[-/](0[1-9]|1[0-2])\b/);
        if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}`;

        const revMatch = lower.match(/\b(0[1-9]|1[0-2])[-/](202\d)\b/);
        if (revMatch) return `${revMatch[2]}-${revMatch[1]}`;

        return fallbackMonth;
    },

    // Formatta "YYYY-MM" in etichetta leggibile italiana (es. "Ottobre 2026")
    getMonthLabel(monthStr) {
        if (!monthStr || !monthStr.includes('-')) return monthStr || 'Mese Corrente';
        const [y, m] = monthStr.split('-');
        const names = {
            '01': 'Gennaio', '02': 'Febbraio', '03': 'Marzo', '04': 'Aprile',
            '05': 'Maggio', '06': 'Giugno', '07': 'Luglio', '08': 'Agosto',
            '09': 'Settembre', '10': 'Ottobre', '11': 'Novembre', '12': 'Dicembre'
        };
        return `${names[m] || m} ${y}`;
    },

    // Riconoscimento Intent ed elaborazione dati locali
    processLocalIntent(q, reports, settings, currentMonth, user) {
        const targetMonth = this.extractMonthFromQuery(q, currentMonth);
        const userName = user ? (user.username || (user.name ? user.name.split(' ')[0] : 'bubibs')) : 'bubibs';

        // 1. INTENT: Recupero Dati e Sincronizzazione Cloud
        if (q.includes('recuper') || q.includes('cloud') || q.includes('database') || q.includes('sincronizz') || q.includes('salvati') || q.includes('persi')) {
            const count = reports.length;
            const isPrimary = !user || user.isPrimary;
            return {
                text: `☁️ **Gestione e Recupero Dati Cloud:**\n\n` +
                      `• **Il tuo account:** ${user ? user.name : 'Utente'} (${isPrimary ? 'Amministratore / Principale' : 'Utente Standard'})\n` +
                      `• **Dati in locale:** ${count} report memorizzati su questo dispositivo\n` +
                      `• **Come funziona:**\n` +
                      `  1. Tutti i tuoi report vengono salvati sul database Google Sheets in Cloud.\n` +
                      `  2. ${isPrimary ? 'Come utente principale, puoi recuperare l\'intero archivio storico aziendale.' : 'Come utente registrato, i tuoi dati vengono salvati e isolati con il tuo ID sul cloud.'}\n` +
                      `  3. Se accedi da un altro computer o telefono, basta fare il login con le tue credenziali e premere **Sincronizza** per scaricare subito tutti i tuoi dati!\n\n` +
                      `Vuoi forzare una sincronizzazione con il database cloud adesso?`,
                action: {
                    label: '🔄 Sincronizza Dati dal Cloud Ora',
                    type: 'sync',
                    view: 'home'
                }
            };
        }

        // 2. INTENT: Login, Multi-Utente e Colleghi
        if (q.includes('login') || q.includes('altr') || q.includes('collegh') || q.includes('registra') || q.includes('account') || q.includes('profilo') || q.includes('chi sono')) {
            return {
                text: `👥 **Accesso e Gestione Utenti Multi-Dispositivo:**\n\n` +
                      `• **Utente Attuale:** ${user ? user.name : 'Non autenticato'} (${user ? (user.email || user.username) : ''})\n` +
                      `` +
                      `**Come funziona per te e i colleghi:**\n` +
                      `• **Utente Principale (Fabio Sandrini):** Recupera tutti i dati storici dal cloud con login rapido (account: bubibs / bubibs@gmail.com).\n` +
                      `• **Altri Utenti:** Possono cliccare su *"Crea un nuovo account utente"* nella schermata di login. L'account viene salvato sia in locale che sul database Cloud di Tecnosistem, così possono salvare lì i propri orari e ritrovarli su qualsiasi dispositivo!\n` +
                      `• **Face ID:** Puoi abilitare Face ID dal menu profilo per accedere in un secondo senza digitare la password.`,
                action: {
                    label: '👤 Apri Menu Profilo',
                    type: 'user_menu'
                }
            };
        }

        // 3. INTENT: Ultimi report / Lavori recenti
        if (q.includes('ultim') || q.includes('recent') || q.includes('ieri') && !q.includes('dalle')) {
            if (reports.length === 0) {
                return {
                    text: `Non risultano ancora report registrati per il tuo utente. Prova a premere l'icona del cloud per sincronizzare o compila un nuovo report!`
                };
            }
            const latest = reports.slice(0, 3);
            const listStr = latest.map(r => {
                const d = r.date ? r.date.split('-').reverse().join('/') : 'Data N/D';
                const typeStr = (r.type || 'Lavoro').toUpperCase();
                return `• **${d}** - ${typeStr} presso *${r.location || 'Sede'}*: **${r.totalHours || '0'}h** (dalle ${r.startTime || '--'} alle ${r.endTime || '--'})`;
            }).join('\n');

            return {
                text: `📋 **I tuoi ultimi interventi registrati:**\n\n${listStr}\n\nPuoi visualizzare l'elenco completo nello Storico o esportare il PDF mensile.`,
                action: {
                    label: '📜 Vai allo Storico',
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        // 4. INTENT: Giorni mancanti / Controllo anomalie
        if (q.includes('mancant') || q.includes('buchi') || q.includes('vuot') || q.includes('dimenticat') || q.includes('anomali')) {
            return this.checkMissingDays(reports, targetMonth);
        }

        // INTENT SPECIFICO: Ferie e Vacanze (prioritario rispetto a "ore")
        if (q.includes('ferie') || q.includes('vacanz')) {
            return this.calculateFerieSummary(reports, targetMonth);
        }

        // INTENT SPECIFICO: Malattia e Infortunio
        if (q.includes('malattia') || q.includes('infortun')) {
            return this.calculateMalattiaSummary(reports, targetMonth);
        }

        // INTENT SPECIFICO: Permessi e ROL
        if (q.includes('permess') || q.includes('rol')) {
            return this.calculatePermessiSummary(reports, targetMonth);
        }

        // INTENT SPECIFICO: Assenze generiche
        if (q.includes('assenz') && !q.includes('senza')) {
            return this.calculateFerieSummary(reports, targetMonth);
        }

        // INTENT SPECIFICO: Straordinari
        if (q.includes('straordinar') || q.includes('ore extra') || q.includes('maggiorat')) {
            return this.calculateStraordinariSummary(reports, settings, targetMonth);
        }

        // INTENT SPECIFICO: Trasferte e Diarie
        if (q.includes('trasfert') || q.includes('diaria') || q.includes('pernott') || q.includes('estero')) {
            return this.calculateTrasferteSummary(reports, settings, targetMonth);
        }

        // 5. INTENT: Calcolo / Stima Stipendio
        if (q.includes('stipendio') || q.includes('paga') || q.includes('netto') || q.includes('lordo') || q.includes('quanto prendo') || q.includes('guadagn')) {
            return this.calculateSalarySummary(reports, settings, targetMonth);
        }

        // 6. INTENT: Riepilogo Ore e Straordinari
        if (q.includes('ore') || q.includes('straordinar') || q.includes('riepilogo') || q.includes('totale') || q.includes('lavorat')) {
            return this.calculateHoursSummary(reports, targetMonth);
        }

        // 7. INTENT: Compilazione Rapida Report con testo naturale
        if (q.includes('compila') || q.includes('inserisci') || q.includes('trasferta') || q.includes('sede') || q.includes('dalle') || q.includes('ferie') || q.includes('malattia')) {
            const parsed = this.parseReportFromText(q);
            if (parsed) {
                return {
                    text: `Ho compreso i dettagli del tuo report:\n\n` +
                          `📅 **Data:** ${parsed.date}\n` +
                          `🏢 **Tipo:** ${parsed.typeLabel}\n` +
                          `📍 **Luogo:** ${parsed.location || 'In sede'}\n` +
                          `⏱️ **Orario:** ${parsed.startTime} - ${parsed.endTime} (${parsed.totalHours} ore)\n` +
                          (parsed.lunchBreak ? `🍽️ **Pausa Mensa:** Sì (1h)\n` : '') +
                          (parsed.absence ? `🏖️ **Assenza:** ${parsed.absence}\n` : '') +
                          `\nVuoi che lo registri subito nel tuo archivio e lo sincronizzi sul cloud?`,
                    action: {
                        label: '💾 Salva Report Ora',
                        type: 'save_report',
                        payload: parsed
                    }
                };
            }
        }

        // 8. INTENT: Regolamento e Indennità Trasferte (CCNL / Tecnosistem)
        if (q.includes('indennit') || q.includes('diaria') || q.includes('notte') || q.includes('rientro') || q.includes('estero') || q.includes('regol') || q.includes('tariffe')) {
            return {
                text: `Ecco le tariffe e indennità attualmente impostate:\n\n` +
                      `🚗 **Trasferta con Rientro:** € ${settings.allowanceReturn?.toFixed(2) || '30.00'} al giorno\n` +
                      `🏨 **Trasferta con Pernottamento:** € ${settings.allowanceOvernight?.toFixed(2) || '60.00'} al giorno\n` +
                      `✈️ **Trasferta Estero:** € ${settings.allowanceForeign?.toFixed(2) || '105.00'} al giorno\n` +
                      `⏱️ **Paga Oraria Base:** € ${settings.hourlyRate?.toFixed(2) || '17.23'}/h\n` +
                      `📈 **Maggiorazione Straordinari:** +25% feriali (prime 2h), +50% oltre o festivi.`
            };
        }

        // Default: Guida completa e suggerimenti
        return {
            text: `Ciao **${userName}**! Sono il tuo assistente AI per **Orari TS**.\n\n` +
                  `Ecco alcune cose pratiche che posso fare per te in qualsiasi momento:\n\n` +
                  `• ☁️ **"Come recupero i miei dati?"** - Verifica connessione e recupero dal database cloud\n` +
                  `• 👥 **"Come funziona l'accesso per altri utenti?"** - Spiegazione registrazione e salvataggio cloud\n` +
                  `• 📊 **"Riepilogo ore questo mese"** - Calcolo ore totali e straordinari (25% / 50%)\n` +
                  `• 💰 **"Stima stipendio"** - Calcolo lordo e netto stimato secondo CCNL\n` +
                  `• ⚠️ **"Controlla giorni mancanti"** - Trova giornate feriali senza report da compilare\n` +
                  `• 📝 **"Oggi trasferta a Verona dalle 8 alle 18"** - Compilazione rapida automatica\n` +
                  `• 📋 **"I miei ultimi interventi"** - Storico rapido dei lavori recenti\n\n` +
                  `*Tocca uno dei pulsanti in alto o scrivi la tua richiesta in italiano!*`
        };
    },

    // 1. Calcolo specifico Ore di Ferie
    calculateFerieSummary(reports, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));
        
        const ferieReports = monthReports.filter(r => 
            (r.absence && r.absence.toLowerCase() === 'ferie') ||
            (r.notes && r.notes.toLowerCase().includes('ferie')) ||
            (r.type && r.type.toLowerCase().includes('ferie'))
        );

        let totalHours = 0;
        const details = [];

        ferieReports.forEach(r => {
            const h = parseFloat(r.totalHours) || 8;
            totalHours += h;
            const d = r.date.split('-').reverse().join('/');
            details.push(`• 📅 **${d}**: ${h} ore di ferie${r.notes ? ` (*${r.notes}*)` : ''}`);
        });

        if (ferieReports.length === 0) {
            return {
                text: `🏖️ **Ore di Ferie per ${monthLabel}:**\n\n` +
                      `Nel mese di **${monthLabel}** non risultano registrate ore o giornate di ferie.\n\n` +
                      `Tutte le attività registrate per questo mese sono di lavoro effettivo o trasferte.`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        return {
            text: `🏖️ **Riepilogo Ore di Ferie per ${monthLabel}:**\n\n` +
                  `Nel mese di **${monthLabel}** hai usufruito di **${totalHours} ore di ferie** (${ferieReports.length} giornat${ferieReports.length === 1 ? 'a' : 'e'}):\n\n` +
                  details.join('\n') + `\n\n` +
                  `Totale ferie godute: **${totalHours} ore** (**${ferieReports.length} giorni**).`,
            action: {
                label: '⏱️ Apri Storico ' + monthLabel,
                type: 'navigate',
                view: 'history'
            }
        };
    },

    // 2. Calcolo specifico Ore di Malattia / Infortunio
    calculateMalattiaSummary(reports, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));
        
        const malattiaReports = monthReports.filter(r => 
            (r.absence && (r.absence.toLowerCase() === 'malattia' || r.absence.toLowerCase() === 'infortunio')) ||
            (r.notes && (r.notes.toLowerCase().includes('malattia') || r.notes.toLowerCase().includes('infortunio')))
        );

        let totalHours = 0;
        const details = [];

        malattiaReports.forEach(r => {
            const h = parseFloat(r.totalHours) || 8;
            totalHours += h;
            const d = r.date.split('-').reverse().join('/');
            details.push(`• 🩺 **${d}**: ${h} ore (Malattia/Infortunio)${r.notes ? ` (*${r.notes}*)` : ''}`);
        });

        if (malattiaReports.length === 0) {
            return {
                text: `🩺 **Ore di Malattia per ${monthLabel}:**\n\n` +
                      `Nel mese di **${monthLabel}** non risultano registrati giorni di assenza per malattia.`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        return {
            text: `🩺 **Riepilogo Malattia per ${monthLabel}:**\n\n` +
                  `Nel mese di **${monthLabel}** hai registrato **${totalHours} ore di malattia** (${malattiaReports.length} giornat${malattiaReports.length === 1 ? 'a' : 'e'}):\n\n` +
                  details.join('\n'),
            action: {
                label: '⏱️ Apri Storico ' + monthLabel,
                type: 'navigate',
                view: 'history'
            }
        };
    },

    // 3. Calcolo specifico Permessi / ROL
    calculatePermessiSummary(reports, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));
        
        const permessiReports = monthReports.filter(r => 
            (r.absence && (r.absence.toLowerCase() === 'permesso' || r.absence.toLowerCase() === 'rol')) ||
            (r.notes && (r.notes.toLowerCase().includes('permesso') || r.notes.toLowerCase().includes('rol')))
        );

        let totalHours = 0;
        const details = [];

        permessiReports.forEach(r => {
            const h = parseFloat(r.totalHours) || 0;
            totalHours += h;
            const d = r.date.split('-').reverse().join('/');
            details.push(`• ⏱️ **${d}**: ${h} ore (Permesso/ROL)${r.notes ? ` (*${r.notes}*)` : ''}`);
        });

        if (permessiReports.length === 0) {
            return {
                text: `⏱️ **Permessi e ROL per ${monthLabel}:**\n\n` +
                      `Nel mese di **${monthLabel}** non risultano permessi registrati.`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        return {
            text: `⏱️ **Riepilogo Permessi per ${monthLabel}:**\n\n` +
                  `Nel mese di **${monthLabel}** hai registrato **${totalHours} ore di permesso/ROL**:\n\n` +
                  details.join('\n'),
            action: {
                label: '⏱️ Apri Storico ' + monthLabel,
                type: 'navigate',
                view: 'history'
            }
        };
    },

    // 4. Calcolo specifico Straordinari
    calculateStraordinariSummary(reports, settings, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));

        let ot25Total = 0;
        let ot50Total = 0;
        let otTotal = 0;
        const details = [];

        monthReports.forEach(r => {
            const ot25 = parseFloat(r.overtime25) || 0;
            const ot50 = parseFloat(r.overtime50) || 0;
            const otLeg = parseFloat(r.overtime) || 0;
            const tot = (ot25 + ot50) > 0 ? (ot25 + ot50) : otLeg;

            if (tot > 0) {
                ot25Total += ot25;
                ot50Total += ot50;
                otTotal += tot;
                const d = r.date.split('-').reverse().join('/');
                const sub = [];
                if (ot25 > 0) sub.push(`${ot25}h al 25%`);
                if (ot50 > 0) sub.push(`${ot50}h al 50%`);
                details.push(`• 📈 **${d}**: ${tot}h straordinario (${sub.length > 0 ? sub.join(', ') : 'ordinario'}) presso *${r.location || 'Sede'}*`);
            }
        });

        const hourly = parseFloat(settings.hourlyRate) || 17.23;
        const estimatedComp = (ot25Total * (hourly * 1.25)) + (ot50Total * (hourly * 1.50));

        if (otTotal === 0) {
            return {
                text: `📈 **Straordinari per ${monthLabel}:**\n\n` +
                      `Nel mese di **${monthLabel}** non risultano ore di straordinario registrate.\n` +
                      `Tutte le attività risultano svolte nell'orario ordinario.`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        return {
            text: `📈 **Dettaglio Straordinari per ${monthLabel}:**\n\n` +
                  `• **Totale Straordinari:** **${otTotal.toFixed(1)} ore**\n` +
                  (ot25Total > 0 ? `  - Straordinario 25%: ${ot25Total.toFixed(1)} ore\n` : '') +
                  (ot50Total > 0 ? `  - Straordinario 50% / Festivo: ${ot50Total.toFixed(1)} ore\n` : '') +
                  (estimatedComp > 0 ? `• **Compenso Lordo Stimato:** € ${estimatedComp.toFixed(2)}\n` : '') +
                  `\n**Giornate con Straordinario:**\n` +
                  details.join('\n'),
            action: {
                label: '💶 Controlla nello Stipendio',
                type: 'navigate',
                view: 'salary'
            }
        };
    },

    // 5. Calcolo specifico Trasferte
    calculateTrasferteSummary(reports, settings, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));

        const trasferte = monthReports.filter(r => r.type && r.type !== 'sede');
        let rientro = 0;
        let notte = 0;
        let estero = 0;
        const details = [];

        trasferte.forEach(r => {
            const d = r.date.split('-').reverse().join('/');
            let label = 'Trasferta con Rientro';
            if (r.type === 'trasferta_rientro') { rientro++; label = '🚗 Rientro in giornata'; }
            else if (r.type === 'trasferta_notte') { notte++; label = '🏨 Con Pernottamento'; }
            else if (r.type === 'trasferta_estero') { estero++; label = '✈️ Estero'; }
            details.push(`• **${d}**: ${label} presso *${r.location || 'Cliente'}* (${r.totalHours || 0}h)`);
        });

        const rRate = settings.allowanceReturn !== undefined ? settings.allowanceReturn : 30;
        const nRate = settings.allowanceOvernight !== undefined ? settings.allowanceOvernight : 60;
        const eRate = settings.allowanceForeign !== undefined ? settings.allowanceForeign : 105;
        const totDiaria = (rientro * rRate) + (notte * nRate) + (estero * eRate);

        if (trasferte.length === 0) {
            return {
                text: `🚗 **Trasferte per ${monthLabel}:**\n\n` +
                      `Nel mese di **${monthLabel}** non risultano giornate di trasferta registrate.\n` +
                      `Tutte le attività risultano svolte in sede.`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        return {
            text: `🚗 **Riepilogo Trasferte per ${monthLabel}:**\n\n` +
                  `• **Giorni Totali in Trasferta:** **${trasferte.length} giornate**\n` +
                  (rientro > 0 ? `  - Con Rientro in giornata (€ ${rRate}/giorno): ${rientro} giorni\n` : '') +
                  (notte > 0 ? `  - Con Pernottamento (€ ${nRate}/giorno): ${notte} giorni\n` : '') +
                  (estero > 0 ? `  - Estero (€ ${eRate}/giorno): ${estero} giorni\n` : '') +
                  (totDiaria > 0 ? `• **Totale Indennità Trasferta:** € ${totDiaria.toFixed(2)}\n` : '') +
                  `\n**Elenco Interventi Fuori Sede:**\n` +
                  details.join('\n'),
            action: {
                label: '⏱️ Apri Storico ' + monthLabel,
                type: 'navigate',
                view: 'history'
            }
        };
    },

    // Calcolo riepilogo ore per il mese specificato
    calculateHoursSummary(reports, monthStr) {
        const monthLabel = this.getMonthLabel(monthStr);
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));
        let totalHours = 0;
        let totalOt = 0;
        let totalOt25 = 0;
        let totalOt50 = 0;
        let daysWorked = 0;
        let absences = 0;
        let returnTransfers = 0;
        let overnightTransfers = 0;
        let foreignTransfers = 0;

        monthReports.forEach(r => {
            const h = parseFloat(r.totalHours) || 0;
            const ot25 = parseFloat(r.overtime25) || 0;
            const ot50 = parseFloat(r.overtime50) || 0;
            const otLegacy = parseFloat(r.overtime) || 0;
            const ot = (ot25 + ot50) > 0 ? (ot25 + ot50) : otLegacy;
            totalHours += h;
            totalOt += ot;
            totalOt25 += ot25;
            totalOt50 += ot50;

            if (r.absence) {
                absences++;
            } else if (h > 0) {
                daysWorked++;
            }

            if (r.type === 'trasferta_rientro') returnTransfers++;
            if (r.type === 'trasferta_notte') overnightTransfers++;
            if (r.type === 'trasferta_estero') foreignTransfers++;
        });

        if (monthReports.length === 0) {
            return {
                text: `📊 **Riepilogo Orari per ${monthLabel}:**

` +
                      `Non risultano report o ore registrate per **${monthLabel}** nell'archivio locale.

` +
                      `💡 *Suggerimento:* Se hai già inserito i dati per questo mese da un altro dispositivo, premi l'icona della nuvoletta ☁️ in alto a destra per sincronizzare subito dal Cloud!`,
                action: {
                    label: '⏱️ Apri Storico ' + monthLabel,
                    type: 'navigate',
                    view: 'history'
                }
            };
        }

        const transfersCount = returnTransfers + overnightTransfers + foreignTransfers;

        return {
            text: `📊 **Riepilogo Ore per ${monthLabel}:**

` +
                  `• **Giorni Lavorati:** ${daysWorked} giorni
` +
                  `• **Ore Totali Registrate:** ${totalHours.toFixed(1)} ore
` +
                  `• **Straordinari Totali:** ${totalOt.toFixed(1)} ore` + (totalOt > 0 ? ` (${totalOt25.toFixed(1)}h al 25%, ${totalOt50.toFixed(1)}h al 50%)` : '') + `
` +
                  (transfersCount > 0 ? `• **Trasferte Effettuate:** ${transfersCount} (Rientro: ${returnTransfers}, Notte: ${overnightTransfers}, Estero: ${foreignTransfers})
` : '') +
                  `• **Giorni Assenza / Ferie:** ${absences} giorni

` +
                  (totalOt > 0 
                    ? `Hai registrato **${totalOt.toFixed(1)} ore** di straordinario per il mese di **${monthLabel}**.` 
                    : `Tutte le ore registrate per **${monthLabel}** sono ordinarie.`),
            action: {
                label: '⏱️ Apri Storico ' + monthLabel,
                type: 'navigate',
                view: 'history'
            }
        };
    },

    // Calcolo stima stipendio
    calculateSalarySummary(reports, settings, monthStr) {
        const monthReports = reports.filter(r => r.date && r.date.startsWith(monthStr));
        const baseSalary = parseFloat(settings.baseSalary) || 3480.76;
        const hourlyRate = parseFloat(settings.hourlyRate) || 17.23;
        const taxRate = parseFloat(settings.taxRate) || 27;

        let otHours = 0;
        let returnAllowances = 0;
        let overnightAllowances = 0;
        let foreignAllowances = 0;

        monthReports.forEach(r => {
            const ot = parseFloat(r.overtime25 || 0) + parseFloat(r.overtime50 || 0) || parseFloat(r.overtime || 0);
            otHours += ot;
            if (r.type === 'trasferta_rientro') returnAllowances++;
            if (r.type === 'trasferta_notte') overnightAllowances++;
            if (r.type === 'trasferta_estero') foreignAllowances++;
        });

        const otPay = otHours * (hourlyRate * 1.25);
        const allowancesTotal = (returnAllowances * (settings.allowanceReturn || 30)) +
                                (overnightAllowances * (settings.allowanceOvernight || 60)) +
                                (foreignAllowances * (settings.allowanceForeign || 105));

        const lordo = baseSalary + otPay + allowancesTotal;
        const netto = lordo * (1 - (taxRate / 100));

        return {
            text: `💰 **Stima Calcolo Stipendio (${monthStr}):**\n\n` +
                  `• **Paga Base Mensile:** € ${baseSalary.toFixed(2)}\n` +
                  `• **Straordinari (${otHours.toFixed(1)}h):** € ${otPay.toFixed(2)}\n` +
                  `• **Indennità Trasferte (${returnAllowances + overnightAllowances + foreignAllowances} gg):** € ${allowancesTotal.toFixed(2)}\n` +
                  `------------------------------------\n` +
                  `• **Totale Lordo Stimato:** € ${lordo.toFixed(2)}\n` +
                  `• **Totale Netto Stimato (-${taxRate}%):** **€ ${netto.toFixed(2)}**\n\n` +
                  `*Nota: Il calcolo è basato sulle aliquote configurate per il mese selezionato.*`,
            action: {
                label: '💶 Apri Dettaglio Stipendio',
                type: 'navigate',
                view: 'salary'
            }
        };
    },

    // Controllo giorni feriali mancanti
    checkMissingDays(reports, monthStr) {
        const today = new Date();
        const year = parseInt(monthStr.split('-')[0], 10);
        const month = parseInt(monthStr.split('-')[1], 10) - 1;
        
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const maxDay = (today.getFullYear() === year && today.getMonth() === month) ? today.getDate() : daysInMonth;

        const reportedDays = new Set(
            reports
                .filter(r => r.date && r.date.startsWith(monthStr))
                .map(r => parseInt(r.date.split('-')[2], 10))
        );

        const missing = [];
        for (let d = 1; d <= maxDay; d++) {
            const dateObj = new Date(year, month, d);
            const dayOfWeek = dateObj.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                if (!reportedDays.has(d)) {
                    const dStr = String(d).padStart(2, '0');
                    missing.push(`${year}-${String(month + 1).padStart(2, '0')}-${dStr}`);
                }
            }
        }

        if (missing.length === 0) {
            return {
                text: `✅ **Tutto in regola!**\nNon risulta alcun giorno lavorativo feriale mancante per il mese di ${monthStr}. Ottima tenuta dei report!`
            };
        }

        const missingList = missing.slice(0, 7).map(d => `• ${d}`).join('\n');
        return {
            text: `⚠️ **Attenzione, trovati ${missing.length} giorni lavorativi senza report:**\n\n` +
                  `${missingList}` + (missing.length > 7 ? `\n...e altri ${missing.length - 7} giorni.` : '') +
                  `\n\nTi consiglio di registrare i report mancanti per avere il calcolo stipendio preciso.`,
            action: {
                label: '➕ Compila Nuovo Report',
                type: 'navigate',
                view: 'report'
            }
        };
    },

    // Parser NLP per estrarre data, orari e tipo dal linguaggio naturale
    parseReportFromText(text) {
        const now = new Date();
        let targetDate = new Date();

        if (text.includes('ieri')) {
            targetDate.setDate(now.getDate() - 1);
        } else if (text.includes('lunedì')) {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            targetDate.setDate(diff);
        }

        const date = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;

        let type = 'sede';
        let typeLabel = 'In Sede';
        if (text.includes('notte') || text.includes('pernottamento')) {
            type = 'trasferta_notte';
            typeLabel = 'Trasferta con Pernottamento';
        } else if (text.includes('estero')) {
            type = 'trasferta_estero';
            typeLabel = 'Trasferta Estero';
        } else if (text.includes('trasferta') || text.includes('rientro')) {
            type = 'trasferta_rientro';
            typeLabel = 'Trasferta con Rientro';
        }

        let absence = '';
        if (text.includes('ferie')) absence = 'ferie';
        if (text.includes('malattia')) absence = 'malattia';
        if (text.includes('permesso')) absence = 'permesso';

        let startTime = '08:00';
        let endTime = '17:00';

        const timeMatches = text.match(/\b(\d{1,2})[:.]?(\d{2})?\b/g);
        if (timeMatches && timeMatches.length >= 2) {
            const formatTime = (t) => {
                let clean = t.replace('.', ':');
                if (!clean.includes(':')) clean += ':00';
                const parts = clean.split(':');
                return parts[0].padStart(2, '0') + ':' + parts[1];
            };
            startTime = formatTime(timeMatches[0]);
            endTime = formatTime(timeMatches[1]);
        }

        let location = '';
        const locMatch = text.match(/(?:a|presso|da|in)\s+([A-Za-z0-9\s]+?)(?:\s+dalle|\s+dalle:|\s+ore|\s+con|\s*$)/i);
        if (locMatch && locMatch[1]) {
            location = locMatch[1].trim();
        }

        const lunchBreak = text.includes('mensa') || text.includes('pausa') || (!text.includes('senza mensa') && type === 'sede');

        const startParts = startTime.split(':').map(Number);
        const endParts = endTime.split(':').map(Number);
        let hours = (endParts[0] + endParts[1] / 60) - (startParts[0] + startParts[1] / 60);
        if (lunchBreak && hours > 5) hours -= 1;
        hours = Math.max(0, hours);

        return {
            date,
            type,
            typeLabel,
            location: location || (type === 'sede' ? 'Tecnosistem' : 'Cliente'),
            startTime,
            endTime,
            lunchBreak,
            absence,
            totalHours: hours.toFixed(1),
            overtime: Math.max(0, hours - 8).toFixed(1),
            notes: 'Registrato con Assistente AI'
        };
    },

    // Integrazione Google Gemini API con memoria conversazionale
    async callGemini(query, apiKey, context) {
        const modelName = 'gemini-2.0-flash';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
        
        const systemPrompt = `Sei l'assistente virtuale ufficiale della web app Orari TS per l'azienda Tecnosistem (impianti e automazione).
L'utente connesso è: ${context.currentUser ? context.currentUser.name : 'Fabio Sandrini'} (${context.currentUser && context.currentUser.isPrimary ? 'Amministratore' : 'Utente Standard'}).
Contesto attuale:
- Totale report registrati: ${context.reports.length}
- Mese corrente: ${context.currentMonth}
- Paga base mensile: € ${context.settings.baseSalary || 3480.76}
- Paga oraria: € ${context.settings.hourlyRate || 17.23}
- Diaria trasferta rientro: € 30, notte: € 60, estero: € 105.
Rispondi sempre in italiano, in modo cordiale, chiaro e professionale. Se l'utente chiede come recuperare i dati o salvare, ricordagli che i dati sono sincronizzati sul cloud Google Sheets aziendale e possono essere sincronizzati con un tocco.`;

        // Costruisci contenuti con cronologia
        const contents = [];
        
        // Messaggio di sistema / primo contesto
        contents.push({
            role: "user",
            parts: [{ text: systemPrompt }]
        });
        contents.push({
            role: "model",
            parts: [{ text: "Ricevuto! Sono l'assistente virtuale di Orari TS. Come posso aiutarti oggi?" }]
        });

        // Cronologia recente
        if (this.conversationHistory && this.conversationHistory.length > 0) {
            this.conversationHistory.slice(-6).forEach(h => {
                contents.push({
                    role: h.role === 'model' ? 'model' : 'user',
                    parts: [{ text: h.text }]
                });
            });
        }

        // Domanda corrente
        contents.push({
            role: "user",
            parts: [{ text: query }]
        });

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents })
        });

        if (!res.ok) {
            // Fallback al modello 1.5-flash se 2.0 non disponibile con quella chiave
            const fallbackUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
            const fbRes = await fetch(fallbackUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: systemPrompt + "\n\n" + query }] }] })
            });
            const fbData = await fbRes.json();
            if (fbData.candidates && fbData.candidates[0]?.content?.parts[0]?.text) {
                return { text: fbData.candidates[0].content.parts[0].text };
            }
            throw new Error("Errore API Gemini");
        }

        const data = await res.json();
        if (data.candidates && data.candidates[0]?.content?.parts[0]?.text) {
            return { text: data.candidates[0].content.parts[0].text };
        }
        throw new Error("Risposta Gemini vuota");
    }
};
