// TECNOSISTEM ORARI TS - STANDALONE BUNDLE (v2.5)
// Compatibile sia con protocollo http/https che con file:/// locale senza errori CORS

(function() {
    'use strict';

    // === MODULE: AUTH ===
// --- Autenticazione e Gestione Utenti (Multi-Utente, Cloud Sync, Admin & OTP Reset) ---
const Auth = {
    KEYS: {
        USERS: 'tecnosistem_users',
        CURRENT_USER: 'tecnosistem_current_user',
        RESET_REQUESTS: 'tecnosistem_reset_requests'
    },

    // Helper per hashing password tramite Web Crypto API con Fallback puro JS (100% offline e file:///)
    async hashPassword(password) {
        if (!password) return '';
        try {
            if (window.crypto && window.crypto.subtle) {
                const msgUint8 = new TextEncoder().encode(password);
                const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            }
        } catch (e) {
            console.warn('crypto.subtle non disponibile, uso fallback puro:', e);
        }
        return this._sha256Pure(password);
    },

    // Implementazione pura JS di SHA-256 (compatibile al 100% con protocollo file:///)
    _sha256Pure(ascii) {
        function rightRotate(value, amount) {
            return (value >>> amount) | (value << (32 - amount));
        }
        var mathPow = Math.pow;
        var maxWord = mathPow(2, 32);
        var lengthProperty = 'length';
        var i, j;
        var result = '';
        var words = [];
        var asciiBitLength = ascii[lengthProperty] * 8;
        var hash = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
        var k = [
            0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
            0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
            0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
            0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
            0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
            0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
            0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
            0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
        ];
        words[asciiBitLength >> 5] |= 0x80 << (24 - asciiBitLength % 32);
        words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;
        for (i = 0; i < words[lengthProperty]; i += 16) {
            var w = words.slice(i, i + 16);
            var oldHash = hash.slice();
            for (j = 0; j < 64; j++) {
                var w15 = w[j - 15], w2 = w[j - 2];
                var s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
                var s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
                w[j] = j < 16 ? w[j] : (w[j - 16] + s0 + w[j - 7] + s1) | 0;
                var ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
                var temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[j] + w[j]) | 0;
                var maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
                var temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
                hash = [(temp1 + temp2) | 0, hash[0], hash[1], hash[2], (hash[3] + temp1) | 0, hash[4], hash[5], hash[6]];
            }
            for (j = 0; j < 8; j++) {
                hash[j] = (hash[j] + oldHash[j]) | 0;
            }
        }
        for (i = 0; i < 8; i++) {
            for (j = 3; j >= 0; j--) {
                var b = (hash[i] >> (8 * j)) & 255;
                result += (b < 16 ? '0' : '') + b.toString(16);
            }
        }
        return result;
    },

    // Inizializza archivio utenti e utente primario predefinito (Fabio Sandrini: bubibs@gmail.com / Brescia1-)
    async init() {
        let users = this.getUsers();
        const primaryHash = await this.hashPassword('Brescia1-');

        let primaryUser = users.find(u => u.isPrimary || u.id === 'fabio_sandrini' || u.email === 'bubibs@gmail.com' || u.email === 'amministrazione@tecnosistem.com');

        if (!primaryUser) {
            primaryUser = {
                id: 'fabio_sandrini',
                name: 'Fabio Sandrini',
                username: 'bubibs',
                email: 'bubibs@gmail.com',
                phone: '3331234567',
                passwordHash: primaryHash,
                isPrimary: true,
                cloudUrl: '',
                createdAt: new Date().toISOString()
            };
            users.unshift(primaryUser);
        } else {
            // Aggiorna credenziali per l'utente principale
            primaryUser.id = 'fabio_sandrini';
            primaryUser.name = 'Fabio Sandrini';
            primaryUser.username = 'bubibs';
            primaryUser.email = 'bubibs@gmail.com';
            if (!primaryUser.phone) primaryUser.phone = '3331234567';
            primaryUser.passwordHash = primaryHash;
            primaryUser.isPrimary = true;
        }

        this.saveUsers(users);

        // Se c'è già una sessione memorizzata valida
        const current = this.getCurrentUser();
        if (current) {
            const fresh = users.find(u => u.id === current.id);
            if (fresh) {
                this.setCurrentUser(fresh);
            }
        }
    },

    getUsers() {
        try {
            const raw = localStorage.getItem(this.KEYS.USERS);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Errore lettura utenti:', e);
            return [];
        }
    },

    saveUsers(users) {
        localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
    },

    mergeCloudUsers(cloudUsers) {
        if (!Array.isArray(cloudUsers) || cloudUsers.length === 0) return;
        const localUsers = this.getUsers();
        const map = new Map();
        localUsers.forEach(u => map.set(String(u.id || u.username), u));

        cloudUsers.forEach(cu => {
            if (!cu) return;
            const uname = String(cu.username || '').trim().toLowerCase();
            const uemail = String(cu.email || '').trim().toLowerCase();
            const uid = String(cu.id || ('user_' + uname));
            
            // Non sovrascrivere l'utente primario
            if (uemail === 'bubibs@gmail.com' || uname === 'bubibs' || uname === 'bubib' || cu.isprimary === true || cu.isprimary === 'true') {
                return;
            }

            const existing = map.get(uid) || Array.from(map.values()).find(u => (u.username || '').toLowerCase() === uname || (u.email && u.email.toLowerCase() === uemail));
            
            if (!existing) {
                map.set(uid, {
                    id: uid,
                    name: cu.name || uname || 'Utente',
                    username: uname,
                    email: uemail || (uname ? `${uname}@tecnosistem.com` : ''),
                    phone: cu.phone || '',
                    passwordHash: cu.passwordhash || cu.passwordHash || '',
                    isPrimary: false,
                    cloudUrl: cu.cloudurl || cu.cloudUrl || '',
                    createdAt: cu.createdat || cu.createdAt || new Date().toISOString()
                });
            } else {
                // Aggiorna dati se non primario
                if (!existing.isPrimary) {
                    if (cu.name) existing.name = cu.name;
                    if (cu.phone) existing.phone = cu.phone;
                    if (cu.passwordhash || cu.passwordHash) existing.passwordHash = cu.passwordhash || cu.passwordHash;
                }
            }
        });

        const merged = Array.from(map.values());
        this.saveUsers(merged);
    },

    getCurrentUser() {
        try {
            const raw = localStorage.getItem(this.KEYS.CURRENT_USER);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },

    setCurrentUser(user) {
        if (user) {
            localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(user));
        } else {
            localStorage.removeItem(this.KEYS.CURRENT_USER);
        }
    },

    // Login classico con Username/Email e Password
    async login(identifier, password) {
        const idClean = (identifier || '').trim().toLowerCase();
        if (!idClean) {
            return { success: false, error: 'Inserisci username o email.' };
        }
        if (!password) {
            return { success: false, error: 'Inserisci la password.' };
        }

        let users = this.getUsers();
        let user = users.find(u => 
            (u.username && u.username.toLowerCase() === idClean) ||
            (u.email && u.email.toLowerCase() === idClean) ||
            (u.isPrimary && (idClean === 'bubibs' || idClean === 'bubib' || idClean === 'bubibs@gmail.com' || idClean === 'fabio'))
        );

        // Se non trovato in locale, prova a sincronizzare gli utenti dal Cloud
        if (!user && window.API && typeof window.API.fetchUsers === 'function') {
            try {
                const cloudUsers = await window.API.fetchUsers();
                if (cloudUsers && cloudUsers.length > 0) {
                    this.mergeCloudUsers(cloudUsers);
                    users = this.getUsers();
                    user = users.find(u => 
                        (u.username && u.username.toLowerCase() === idClean) ||
                        (u.email && u.email.toLowerCase() === idClean)
                    );
                }
            } catch (err) {
                console.warn('Verifica utenti cloud durante login:', err);
            }
        }

        // Se è l'utente primario (Fabio Sandrini / bubibs@gmail.com)
        if (!user && (idClean === 'bubibs@gmail.com' || idClean === 'bubibs' || idClean === 'bubib' || idClean === 'fabio')) {
            await this.init();
            users = this.getUsers();
            user = users.find(u => u.isPrimary);
        }

        if (!user) {
            return { success: false, error: 'Utente non trovato. Controlla i dati o registrati come nuovo utente.' };
        }

        const inputHash = await this.hashPassword(password);
        if (user.passwordHash && user.passwordHash !== inputHash) {
            return { success: false, error: 'Password errata. Riprova o usa "Password dimenticata".' };
        }

        this.setCurrentUser(user);
        return { success: true, user };
    },

    // Registrazione nuovo utente con Cellulare
    async register({ name, username, email, phone = '', password }) {
        const cleanName = (name || '').trim();
        const cleanUsername = (username || '').trim().toLowerCase().replace(/\s+/g, '');
        const cleanEmail = (email || '').trim().toLowerCase();
        const cleanPhone = (phone || '').trim().replace(/[^0-9+]/g, '');

        if (!cleanName) return { success: false, error: 'Inserisci nome e cognome.' };
        if (!cleanUsername || cleanUsername.length < 3) return { success: false, error: 'Lo username deve avere almeno 3 caratteri.' };
        if (!password || password.length < 3) return { success: false, error: 'La password deve avere almeno 3 caratteri.' };

        let users = this.getUsers();

        // Controllo duplicati
        const exists = users.some(u => 
            (u.username && u.username.toLowerCase() === cleanUsername) ||
            (cleanEmail && u.email && u.email.toLowerCase() === cleanEmail)
        );

        if (exists) {
            return { success: false, error: 'Username o email già in uso da un altro utente.' };
        }

        const passwordHash = await this.hashPassword(password);
        const newUser = {
            id: 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 5),
            name: cleanName,
            username: cleanUsername,
            email: cleanEmail || `${cleanUsername}@tecnosistem.com`,
            phone: cleanPhone,
            passwordHash: passwordHash,
            isPrimary: false,
            cloudUrl: '',
            createdAt: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        this.setCurrentUser(newUser);

        // Salva l'utente anche nel Cloud DB (Google Sheets)
        if (window.API && typeof window.API.saveUser === 'function') {
            try {
                window.API.saveUser(newUser);
            } catch (err) {
                console.warn('Salvataggio utente su cloud differito:', err);
            }
        }

        return { success: true, user: newUser };
    },

    // Autenticazione con Account Google
    async loginWithGoogle(googleData) {
        if (!googleData || !googleData.email) {
            return { success: false, error: 'Dati account Google mancanti o non validi.' };
        }

        const emailClean = googleData.email.trim().toLowerCase();
        let users = this.getUsers();

        // Se l'email corrisponde a bubibs@gmail.com, associa all'account Primario (Fabio Sandrini)
        if (emailClean === 'bubibs@gmail.com') {
            let primary = users.find(u => u.isPrimary || u.email === 'bubibs@gmail.com');
            if (primary) {
                primary.username = 'bubibs';
                primary.email = 'bubibs@gmail.com';
                primary.googleAuth = true;
                this.saveUsers(users);
                this.setCurrentUser(primary);
                return { success: true, user: primary, isNew: false };
            }
        }

        // Cerca se l'utente esiste già per email
        let user = users.find(u => u.email && u.email.toLowerCase() === emailClean);

        // Se non trovato in locale, cerca sul cloud
        if (!user && window.API && typeof window.API.fetchUsers === 'function') {
            try {
                const cloudUsers = await window.API.fetchUsers();
                if (cloudUsers && cloudUsers.length > 0) {
                    this.mergeCloudUsers(cloudUsers);
                    users = this.getUsers();
                    user = users.find(u => u.email && u.email.toLowerCase() === emailClean);
                }
            } catch (e) {}
        }

        let isNew = false;
        if (!user) {
            // Registrazione automatica nuovo utente Google
            const username = emailClean.split('@')[0].replace(/[^a-zA-Z0-9._-]/g, '') || ('user_' + Date.now());
            user = {
                id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
                name: googleData.name || emailClean.split('@')[0],
                username: username,
                email: emailClean,
                phone: googleData.phone || '',
                role: 'user',
                isPrimary: false,
                googleAuth: true,
                createdAt: new Date().toISOString()
            };
            users.push(user);
            this.saveUsers(users);
            isNew = true;

            // Sincronizza nuovo utente su Cloud Google Sheets
            if (window.API && typeof window.API.saveUser === 'function') {
                try {
                    window.API.saveUser(user);
                } catch (e) {}
            }
        }

        this.setCurrentUser(user);
        return { success: true, user, isNew };
    },

    // --- Gestione Codici di Sblocco Password Dinamici (OTP & WhatsApp/SMS) ---

    getPendingResetRequests() {
        try {
            const raw = localStorage.getItem(this.KEYS.RESET_REQUESTS);
            const list = raw ? JSON.parse(raw) : [];
            const now = Date.now();
            return list.filter(r => r.expiresAt > now);
        } catch (e) {
            return [];
        }
    },

    savePendingResetRequests(list) {
        localStorage.setItem(this.KEYS.RESET_REQUESTS, JSON.stringify(list));
    },

    // 1. Richiesta Codice di Sblocco Temporaneo (Genera OTP 6 cifre valido 15 min)
    async requestPasswordReset(identifier) {
        const idClean = (identifier || '').trim().toLowerCase();
        if (!idClean) return { success: false, error: 'Inserisci username o email.' };

        let users = this.getUsers();
        let user = users.find(u => 
            (u.username && u.username.toLowerCase() === idClean) ||
            (u.email && u.email.toLowerCase() === idClean) ||
            (u.isPrimary && (idClean === 'bubibs' || idClean === 'bubib' || idClean === 'bubibs@gmail.com' || idClean === 'fabio'))
        );

        if (!user && window.API && typeof window.API.fetchUsers === 'function') {
            try {
                const cloudUsers = await window.API.fetchUsers();
                if (cloudUsers && cloudUsers.length > 0) {
                    this.mergeCloudUsers(cloudUsers);
                    users = this.getUsers();
                    user = users.find(u => 
                        (u.username && u.username.toLowerCase() === idClean) ||
                        (u.email && u.email.toLowerCase() === idClean)
                    );
                }
            } catch (e) {}
        }

        if (!user) {
            return { success: false, error: 'Nessun account trovato associato a questa email o username.' };
        }

        // Genera codice numerico casuale a 6 cifre
        const code = String(Math.floor(100000 + Math.random() * 900000));
        const expiresAt = Date.now() + (15 * 60 * 1000); // 15 minuti di validità

        const reqList = this.getPendingResetRequests().filter(r => r.userId !== user.id);
        const newReq = {
            userId: user.id,
            userName: user.name || user.username,
            userEmail: user.email || '',
            userPhone: user.phone || '',
            code: code,
            expiresAt: expiresAt,
            createdAt: new Date().toISOString()
        };
        reqList.push(newReq);
        this.savePendingResetRequests(reqList);

        return {
            success: true,
            user,
            code,
            phone: user.phone || '',
            expiresInMinutes: 15
        };
    },

    // 2. Verifica Codice OTP e reimposta la password
    async completePasswordReset(identifier, otpCode, newPassword) {
        const idClean = (identifier || '').trim().toLowerCase();
        const codeClean = (otpCode || '').trim();

        if (!idClean) return { success: false, error: 'Inserisci email o username.' };
        if (!codeClean) return { success: false, error: 'Inserisci il codice temporaneo di sblocco.' };
        if (!newPassword || newPassword.length < 3) return { success: false, error: 'La nuova password deve contenere almeno 3 caratteri.' };

        const users = this.getUsers();
        const user = users.find(u => 
            (u.username && u.username.toLowerCase() === idClean) ||
            (u.email && u.email.toLowerCase() === idClean) ||
            (u.isPrimary && (idClean === 'bubibs' || idClean === 'bubib' || idClean === 'bubibs@gmail.com' || idClean === 'fabio'))
        );

        if (!user) {
            return { success: false, error: 'Account utente non trovato.' };
        }

        const reqList = this.getPendingResetRequests();
        const activeReq = reqList.find(r => r.userId === user.id);

        if (!activeReq) {
            return { 
                success: false, 
                error: 'Nessuna richiesta di sblocco attiva trovata o codice scaduto. Richiedi un nuovo codice.' 
            };
        }

        if (activeReq.code !== codeClean) {
            return { 
                success: false, 
                error: 'Codice di verifica non corretto. Inserisci il codice a 6 cifre esatto fornito o ricevuto su WhatsApp.' 
            };
        }

        // Codice valido: aggiorna password
        const newHash = await this.hashPassword(newPassword);
        user.passwordHash = newHash;
        this.saveUsers(users);

        // Cancella la richiesta usata
        this.savePendingResetRequests(reqList.filter(r => r.userId !== user.id));

        // Sincronizza su Cloud
        if (window.API && typeof window.API.saveUser === 'function') {
            try {
                window.API.saveUser(user);
            } catch (e) {
                console.warn('Errore sync password reset su cloud:', e);
            }
        }

        return { success: true, user };
    },

    // Reimpostazione password diretta da parte dell'Admin
    async resetPassword(identifier, newPassword) {
        const idClean = (identifier || '').trim().toLowerCase();
        if (!idClean) return { success: false, error: 'Inserisci username o email.' };
        if (!newPassword || newPassword.length < 3) return { success: false, error: 'La nuova password deve contenere almeno 3 caratteri.' };

        let users = this.getUsers();
        let user = users.find(u => 
            (u.username && u.username.toLowerCase() === idClean) ||
            (u.email && u.email.toLowerCase() === idClean) ||
            (u.isPrimary && (idClean === 'bubibs' || idClean === 'bubib' || idClean === 'bubibs@gmail.com' || idClean === 'fabio'))
        );

        if (!user) {
            return { success: false, error: 'Account non trovato.' };
        }

        const newHash = await this.hashPassword(newPassword);
        user.passwordHash = newHash;
        this.saveUsers(users);

        if (window.API && typeof window.API.saveUser === 'function') {
            try { window.API.saveUser(user); } catch (e) {}
        }

        return { success: true, user };
    },

    // Eliminazione utente (riservata all'utente primario / Admin)
    async deleteUser(userId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser || !currentUser.isPrimary) {
            return { success: false, error: 'Solo l\'utente principale può eliminare altri utenti.' };
        }

        let users = this.getUsers();
        const target = users.find(u => u.id === userId);
        if (!target) {
            return { success: false, error: 'Utente non trovato.' };
        }
        if (target.isPrimary) {
            return { success: false, error: 'Non è possibile eliminare l\'utente principale.' };
        }

        users = users.filter(u => u.id !== userId);
        this.saveUsers(users);

        // Elimina anche da Google Sheets sul Cloud
        if (window.API && typeof window.API.deleteUser === 'function') {
            try {
                await window.API.deleteUser(userId);
            } catch (err) {
                console.warn('Errore cancellazione utente su cloud:', err);
            }
        }

        return { success: true };
    },

    // Logout
    logout() {
        this.setCurrentUser(null);
    },

    // Modifica password utente corrente
    async changePassword(currentPassword, newPassword) {
        const current = this.getCurrentUser();
        if (!current) return { success: false, error: 'Nessun utente connesso.' };
        if (!newPassword || newPassword.length < 3) return { success: false, error: 'Nuova password troppo corta.' };

        const users = this.getUsers();
        const user = users.find(u => u.id === current.id);
        if (!user) return { success: false, error: 'Utente non trovato.' };

        const currHash = await this.hashPassword(currentPassword);
        if (user.passwordHash !== currHash) {
            return { success: false, error: 'Password attuale errata.' };
        }

        user.passwordHash = await this.hashPassword(newPassword);
        this.saveUsers(users);

        if (window.API && typeof window.API.saveUser === 'function') {
            try { window.API.saveUser(user); } catch (e) {}
        }

        return { success: true };
    },

    // Aggiorna impostazioni utente
    updateUserSettings(settings = {}) {
        const current = this.getCurrentUser();
        if (!current) return false;

        const users = this.getUsers();
        const user = users.find(u => u.id === current.id);
        if (!user) return false;

        if (settings.cloudUrl !== undefined) {
            user.cloudUrl = settings.cloudUrl.trim();
        }
        if (settings.name !== undefined && settings.name.trim()) {
            user.name = settings.name.trim();
        }
        if (settings.phone !== undefined) {
            user.phone = settings.phone.trim();
        }

        this.saveUsers(users);
        this.setCurrentUser(user);

        if (window.API && typeof window.API.saveUser === 'function') {
            try { window.API.saveUser(user); } catch (e) {}
        }

        return true;
    }
};

    // === MODULE: API ===
const API = {
    DEFAULT_ENDPOINT: 'https://script.google.com/macros/s/AKfycbypX8DXc9dVSi9aZJ5ZIiNNLt2k4wJQJMyFep33USsCQixj0zFyfbzIOQNdnJIFoGbJGA/exec',

    // Se l'utente ha configurato un proprio URL Google Apps Script personale, usa quello.
    // Altrimenti usa l'endpoint cloud principale aziendale.
    get ENDPOINT() {
        const user = Auth.getCurrentUser();
        if (user && user.cloudUrl && user.cloudUrl.trim().startsWith('http')) {
            return user.cloudUrl.trim();
        }
        return this.DEFAULT_ENDPOINT;
    },

    async checkHealth() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=ping');
            return response.ok;
        } catch (e) {
            console.warn("Health check failed", e);
            return false;
        }
    },

    async _post(action, data) {
        try {
            const user = Auth.getCurrentUser();
            const payload = (typeof data === 'object' && data !== null) ? { ...data } : { value: data };
            
            // Inietta le informazioni dell'utente nel payload per il cloud
            if (user) {
                payload.userId = user.id;
                payload.userName = user.name;
                payload.userEmail = user.email;
                payload.isPrimary = !!user.isPrimary;
            }

            const response = await fetch(this.ENDPOINT + '?action=' + action, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
            if (response.ok) return { success: true };
            return { success: false, error: 'Server ' + response.status };
        } catch (error) {
            console.error(action + ' failed:', error);
            return { success: false, error: String(error) };
        }
    },

    saveReport(report) { return this._post('saveReport', report); },
    deleteReport(id) { return this._post('deleteReport', { id }); },
    saveContact(contact) { return this._post('saveContact', contact); },
    deleteContact(id) { return this._post('deleteContact', { id }); },
    saveSettings(settings) { return this._post('saveSettings', settings); },

    // --- Gestione Utenti Cloud ---
    saveUser(user) { return this._post('saveUser', user); },
    deleteUser(id) { return this._post('deleteUser', { id }); },

    async fetchUsers() {
        try {
            const response = await fetch(this.ENDPOINT + '?action=getData');
            const data = await response.json();
            return data.users || [];
        } catch (error) {
            console.error('Fetch users failed:', error);
            return [];
        }
    },

    async fetchCloudData() {
        try {
            const user = Auth.getCurrentUser();
            let url = this.ENDPOINT + '?action=getData';
            if (user) {
                url += `&userId=${encodeURIComponent(user.id)}&userEmail=${encodeURIComponent(user.email || '')}&isPrimary=${user.isPrimary ? '1' : '0'}`;
            }

            const response = await fetch(url);
            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Fetch failed:', error);
            return null;
        }
    }
};

    // === MODULE: STORE ===
const Store = {
    // Base Keys
    KEYS: {
        SETTINGS: 'tecnosistem_settings',
        CONTACTS: 'tecnosistem_contacts',
        REPORTS: 'tecnosistem_reports',
        DAILY_QUOTE: 'tecnosistem_quote',
        QUEUE: 'tecnosistem_sync_queue'
    },

    // Calcola la chiave di storage specifica per l'utente loggato.
    // L'utente primario (Fabio Sandrini) mantiene le chiavi originali senza modifiche,
    // garantendo al 100% il recupero immediato di tutti i dati storici e cloud già memorizzati.
    // I nuovi utenti ricevono un namespace dedicato e isolato (es. tecnosistem_reports_user_abc).
    getUserKey(key) {
        if (key === this.KEYS.DAILY_QUOTE) return key;

        const user = Auth.getCurrentUser();
        if (!user || user.isPrimary) {
            return key; // Chiavi originali per Fabio Sandrini
        }
        return `${key}_${user.id}`;
    },

    // Helper to normalize month key to YYYY-MM (e.g. "Thu Oct 01 2026..." -> "2026-10")
    normalizeMonthKey(key, value) {
        if (!key || key === 'default') return 'default';

        // 1. Check if key is already YYYY-MM
        const mIso = String(key).match(/^(\d{4})-(\d{2})$/);
        if (mIso) return `${mIso[1]}-${mIso[2]}`;

        // 2. Check for Date string e.g. "Thu Oct 01 2026 00:00:00..."
        const months = {
            'jan': '01', 'gen': '01',
            'feb': '02',
            'mar': '03',
            'apr': '04',
            'may': '05', 'mag': '05',
            'jun': '06', 'giu': '06',
            'jul': '07', 'lug': '07',
            'aug': '08', 'ago': '08',
            'sep': '09', 'set': '09',
            'oct': '10', 'ott': '10',
            'nov': '11',
            'dec': '12', 'dic': '12'
        };
        const mDate = String(key).match(/([A-Za-z]{3})\s+\d{1,2}\s+(\d{4})/);
        if (mDate) {
            const mName = mDate[1].toLowerCase();
            const year = mDate[2];
            if (months[mName]) {
                return `${year}-${months[mName]}`;
            }
        }

        // 3. Fallback: check value.month if available
        if (value && value.month && value.month !== 'default') {
            const vIso = String(value.month).match(/^(\d{4})-(\d{2})/);
            if (vIso) return `${vIso[1]}-${vIso[2]}`;

            const d = new Date(value.month);
            if (!isNaN(d.getTime())) {
                const midday = new Date(d.getTime() + 12 * 3600 * 1000);
                const y = midday.getUTCFullYear();
                const m = String(midday.getUTCMonth() + 1).padStart(2, '0');
                return `${y}-${m}`;
            }
        }

        return key;
    },

    // --- Settings (Month-Specific) ---
    getSettings(monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};
        const normMonth = this.normalizeMonthKey(monthStr);

        // 1. Try specific month (normalized or raw)
        let settings = allSettings[normMonth] || allSettings[monthStr];

        // 2. Try 'default' if month not found
        if (!settings && allSettings['default']) {
            settings = allSettings['default'];
        }

        // 3. Fallback/Init Defaults
        const user = Auth.getCurrentUser();
        const isPrimary = !user || user.isPrimary;

        // Nuovi utenti partono rigorosamente con parametri a 0. L'utente principale mantiene i suoi parametri.
        const defaults = isPrimary ? {
            baseSalary: 3480.76,
            hourlyRate: 17.23,
            allowanceReturn: 30.00,
            allowanceOvernight: 60.00,
            allowanceForeign: 105.00,
            taxRate: 27
        } : {
            baseSalary: 0,
            hourlyRate: 0,
            allowanceReturn: 0,
            allowanceOvernight: 0,
            allowanceForeign: 0,
            taxRate: 0
        };

        // If settings found, merge with defaults to ensure all keys exist and are numeric
        if (settings) {
            // Aggressive legacy purge (baseSalary 2000 or 1500)
            if (settings.baseSalary === 2000 || settings.baseSalary === 1500) {
                return defaults;
            }

            const merged = { ...defaults, ...settings };
            // Ensure all values are numbers
            Object.keys(merged).forEach(k => {
                if (typeof merged[k] !== 'number' || isNaN(merged[k])) {
                    merged[k] = defaults[k] || 0;
                }
            });
            return merged;
        }

        // Save as default for future if completely empty
        if (Object.keys(allSettings).length === 0) {
            this.saveSettings(defaults, 'default');
        }

        return defaults;
    },

    saveSettings(settings, monthStr = 'default') {
        const allSettings = this.get(this.KEYS.SETTINGS) || {};
        const normMonth = this.normalizeMonthKey(monthStr);
        allSettings[normMonth] = settings;
        this.set(this.KEYS.SETTINGS, allSettings);
    },

    init() {
        const repKey = this.getUserKey(this.KEYS.REPORTS);
        const conKey = this.getUserKey(this.KEYS.CONTACTS);
        if (!localStorage.getItem(repKey)) localStorage.setItem(repKey, JSON.stringify([]));
        if (!localStorage.getItem(conKey)) localStorage.setItem(conKey, JSON.stringify([]));

        // Settings Migration & Cleanup
        const setKey = this.getUserKey(this.KEYS.SETTINGS);
        const settingsRaw = localStorage.getItem(setKey);
        if (settingsRaw) {
            try {
                let allSettings = JSON.parse(settingsRaw);

                // 1. Convert old flat format to new structure
                if (allSettings.baseSalary !== undefined && !allSettings['default']) {
                    console.log("Migrating settings to new format...");
                    allSettings = { 'default': allSettings };
                }

                // 2. Normalize and migrate any non YYYY-MM keys
                let updated = false;
                Object.keys(allSettings).forEach(k => {
                    if (k !== 'default' && !k.match(/^\d{4}-\d{2}$/)) {
                        const normKey = this.normalizeMonthKey(k, allSettings[k]);
                        if (normKey && normKey !== k) {
                            allSettings[normKey] = { ...(allSettings[normKey] || {}), ...allSettings[k] };
                            delete allSettings[k];
                            updated = true;
                        }
                    }
                });

                // 3. Aggressively purge "2000" defaults
                if (allSettings['default']) {
                    const d = allSettings['default'];
                    if (Math.abs(d.baseSalary - 2000) < 1 || Math.abs(d.baseSalary - 1500) < 1) {
                        console.log("Purging legacy 2000 default settings during init.");
                        delete allSettings['default'];
                        updated = true;
                    }
                }

                if (updated) {
                    this.set(this.KEYS.SETTINGS, allSettings);
                }
            } catch (e) {
                console.error("Settings migration error", e);
            }
        }
    },

    // Defaults
    DEFAULTS: {
        CONTACTS: [],
        REPORTS: [],
        DAILY_QUOTE: null
    },

    // Generic Get/Set (Multi-utente automatico)
    get(key) {
        const userKey = this.getUserKey(key);
        const data = localStorage.getItem(userKey);
        return data ? JSON.parse(data) : (this.DEFAULTS[key.split('_')[1]] || []);
    },

    set(key, value) {
        const userKey = this.getUserKey(key);
        localStorage.setItem(userKey, JSON.stringify(value));
        window.dispatchEvent(new CustomEvent('store-update', { detail: { key, userKey, value } }));
    },

    mergeCloudData(cloudData) {
        if (!cloudData) return;

        const user = Auth.getCurrentUser();
        const isPrimary = !user || user.isPrimary;

        // -1. Sincronizzazione Utenti Cloud
        if (cloudData.users && typeof Auth.mergeCloudUsers === 'function') {
            Auth.mergeCloudUsers(cloudData.users);
        }

        // 0. Daily Quote (Cloud wins)
        if (cloudData.quote) {
            this.set(this.KEYS.DAILY_QUOTE, cloudData.quote);
        }

        // 1. Settings (Cloud wins per utente primario, o personalizzati)
        if (cloudData.settings && Object.keys(cloudData.settings).length > 0) {
            if (isPrimary) {
                const current = this.get(this.KEYS.SETTINGS) || {};
                const cleanSettings = { ...current };

                if (cloudData.settings.baseSalary !== undefined && !cloudData.settings['default']) {
                    cleanSettings['default'] = { ...cleanSettings['default'], ...cloudData.settings };
                } else {
                    Object.entries(cloudData.settings).forEach(([rawKey, val]) => {
                        const normKey = this.normalizeMonthKey(rawKey, val);
                        const parsedVal = {};
                        Object.keys(val).forEach(k => {
                            let num = parseFloat(val[k]);
                            parsedVal[k] = isNaN(num) ? val[k] : num;
                        });
                        cleanSettings[normKey] = {
                            ...(cleanSettings[normKey] || {}),
                            ...parsedVal
                        };
                    });
                }

                Object.keys(cleanSettings).forEach(k => {
                    if (k !== 'default' && !k.match(/^\d{4}-\d{2}$/)) {
                        delete cleanSettings[k];
                    }
                });

                this.set(this.KEYS.SETTINGS, cleanSettings);
            }
        }

        // 2. Contacts (Merge by ID, filtrati per utente se non primario)
        if (cloudData.contacts) {
            let contactsList = cloudData.contacts;
            if (!isPrimary && user) {
                // Per gli altri utenti: prendi solo i contatti salvati con il loro userId
                contactsList = contactsList.filter(c => 
                    c.userid && String(c.userid) === String(user.id)
                );
            }

            const local = this.getContacts();
            const cloud = contactsList.map(c => ({
                id: String(c.id),
                company: c.company,
                city: c.city || '',
                street: c.street || (c.address || ''),
                number: c.number || '',
                person: c.person,
                phone: c.phone,
                userId: c.userid || c.userId || ''
            }));

            const map = new Map();
            local.forEach(c => map.set(String(c.id), c));
            cloud.forEach(c => map.set(String(c.id), c));

            this.set(this.KEYS.CONTACTS, Array.from(map.values()));
        }

        // 3. Reports (Merge by ID con partizionamento multi-tenant)
        if (cloudData.reports) {
            let reportsList = cloudData.reports;

            if (!isPrimary && user) {
                // Gli altri utenti vedono ESCLUSIVAMENTE i propri report
                reportsList = reportsList.filter(r => {
                    const rUserId = r.userid || r.user || r.userId;
                    const rEmail = r.useremail || r.userEmail;
                    return (rUserId && String(rUserId) === String(user.id)) ||
                           (rEmail && String(rEmail).toLowerCase() === String(user.email).toLowerCase());
                });
            }
            // Se isPrimary (Fabio Sandrini): recupera TUTTI i report esistenti e salvati!

            const local = this.getReports();
            const cloud = reportsList.map(r => {
                const parseNum = (v) => {
                    if (v === undefined || v === null || v === '') return 0;
                    let n = parseFloat(String(v).replace(',', '.'));
                    return isNaN(n) ? 0 : n;
                };

                const getVal = (aliases) => {
                    for (let a of aliases) {
                        const normA = a.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (r[normA] !== undefined) return r[normA];
                    }
                    return undefined;
                };

                return {
                    id: String(r.id || getVal(['id'])),
                    date: r.date ? new Date(r.date).toISOString().split('T')[0] : '',
                    type: r.type || getVal(['tipo', 'lavoro']),
                    location: r.location || getVal(['luogo', 'azienda', 'cliente']),
                    startTime: r.starttime || getVal(['inizio', 'start', 'oraInizio']),
                    endTime: r.endtime || getVal(['fine', 'end', 'oraFine']),
                    totalHours: String(parseNum(r.totalhours || getVal(['ore', 'totale', 'hours', 'totalhours']))),
                    overtime: r.overtime || getVal(['straordinari', 'straord', 'ot', 'overtime']),
                    overtime25: String(parseNum(r.overtime25 || getVal(['overtime25', 'straord25', 'ot25', 'extra25', 'straordinari25', 'overtime25percent']))),
                    overtime50: String(parseNum(r.overtime50 || getVal(['overtime50', 'straord50', 'ot50', 'extra50', 'straordinari50', 'overtime50percent']))),
                    absence: r.absence || getVal(['assenza', 'ferie', 'malattia']),
                    lunchBreak: (r.lunchbreak !== undefined ? r.lunchbreak : getVal(['mensa', 'pausa', 'lunch'])) === true || r.lunchbreak === 'true',
                    notes: r.notes || getVal(['note', 'descr', 'descrizione']),
                    userId: r.userid || r.user || r.userId || '',
                    userEmail: r.useremail || r.userEmail || '',
                    userName: r.username || r.userName || '',
                    synced: true
                };
            });

            const map = new Map();
            local.forEach(r => map.set(String(r.id), r));
            cloud.forEach(r => map.set(String(r.id), r));

            const sorted = Array.from(map.values()).sort((a, b) => new Date(b.date) - new Date(a.date));
            this.set(this.KEYS.REPORTS, sorted);
        }

        return true;
    },

    // Contacts
    getContacts() {
        return this.get(this.KEYS.CONTACTS) || [];
    },

    addContact(contact) {
        const user = Auth.getCurrentUser();
        if (user) {
            contact.userId = user.id;
        }
        const contacts = this.getContacts();
        contact.id = Date.now().toString();
        contacts.push(contact);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    updateContact(updatedContact) {
        const user = Auth.getCurrentUser();
        if (user && !updatedContact.userId) {
            updatedContact.userId = user.id;
        }
        const contacts = this.getContacts().map(c => c.id === updatedContact.id ? updatedContact : c);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    deleteContact(id) {
        const contacts = this.getContacts().filter(c => c.id !== id);
        this.set(this.KEYS.CONTACTS, contacts);
    },

    // Reports
    getReports() {
        return this.get(this.KEYS.REPORTS) || [];
    },

    addReport(report) {
        const user = Auth.getCurrentUser();
        if (user) {
            report.userId = user.id;
            report.userName = user.name;
            report.userEmail = user.email;
        }
        const reports = this.getReports();
        report.id = report.id || Date.now().toString();
        report.synced = false;
        reports.unshift(report); // Newest first
        this.set(this.KEYS.REPORTS, reports);
    },

    updateReport(updatedReport) {
        const user = Auth.getCurrentUser();
        if (user && !updatedReport.userId) {
            updatedReport.userId = user.id;
            updatedReport.userName = user.name;
            updatedReport.userEmail = user.email;
        }
        const reports = this.getReports().map(r => r.id === updatedReport.id ? updatedReport : r);
        this.set(this.KEYS.REPORTS, reports);
    },

    deleteReport(id) {
        const reports = this.getReports().filter(r => r.id !== id);
        this.set(this.KEYS.REPORTS, reports);
    }
};

    // === MODULE: AI ASSISTANT ===
// --- Assistente AI Intelligente per Orari TS ---
const AI = {
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

    // === MODULE: APP & UI ===
﻿




// --- Helper: Generate Time Options ---
const generateTimeOptions = (selected = '') => {
    let options = '<option value="" disabled selected>--:--</option>'; // Default empty
    for (let h = 0; h < 24; h++) {
        for (let m of ['00', '30']) {
            const time = `${h.toString().padStart(2, '0')}:${m}`;
            const isSelected = time === selected ? 'selected' : '';
            options += `<option value="${time}" ${isSelected}>${time}</option>`;
        }
    }
    return options;
};

// --- View Components ---

const Views = {
    home: () => `
        <div class="fade-in">
            <!-- Dynamic Dashboard (Header, Stats, Alert, Quote) -->
            <div id="home-dashboard">
                <div class="text-center" style="padding: 20px 0;">
                    <i class="ph ph-spinner ph-spin text-gold" style="font-size:2rem;"></i>
                </div>
            </div>

                        

            <div class="nav-grid">
                <button class="btn btn-nav" onclick="app.navigate('report')">
                    <i class="ph ph-note-pencil"></i>
                    <span>Nuovo Report</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('history')">
                    <i class="ph ph-clock-counter-clockwise"></i>
                    <span>Storico Interventi</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('salary')">
                    <i class="ph ph-money"></i>
                    <span>Stipendio</span>
                </button>
                <button class="btn btn-nav" onclick="app.navigate('contacts')">
                    <i class="ph ph-address-book"></i>
                    <span>Rubrica</span>
                </button>
            </div>
        </div>
    `,

    report: () => `
        <div class="fade-in">
            <button class="btn btn-icon-only" style="background-color: #3b82f6; color: white; padding: 8px 16px;" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <h2 class="text-center text-gold mt-4 mb-4" id="report-title">Nuovo Report</h2>
            
            <form id="report-form" onsubmit="app.handleReportSubmit(event)">
                <input type="hidden" name="id" id="field-id"> <!-- Hidden ID for edits -->
                
                <div class="card">
                    <div class="form-group text-center">
                        <label>Data</label>
                        <input type="date" name="date" required id="field-date" class="input-centered">
                    </div>

                    <div class="form-group">
                        <label>Tipo di Lavoro</label>
                        <select name="type" id="field-type" onchange="app.handleTypeChange(this.value)" required>
                            <option value="" disabled selected>-- Seleziona Tipo --</option>
                            <option value="sede">In Sede</option>
                            <option value="trasferta_rientro">Trasferta con Rientro</option>
                            <option value="trasferta_notte">Trasferta con Pernottamento</option>
                            <option value="trasferta_estero">Trasferta Estero</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Assenza</label>
                        <select name="absence" id="field-absence">
                            <option value="">Nessuna</option>
                            <option value="ferie">Ferie</option>
                            <option value="malattia">Malattia</option>
                            <option value="permesso">Permesso</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Orari (Step 30 min)</label>
                        <div style="display: flex; gap: 10px;">
                            <select name="startTime" id="field-start" required>${generateTimeOptions()}</select>
                            <select name="endTime" id="field-end" required>${generateTimeOptions()}</select>
                        </div>
                    </div>

                    <div class="form-group checkbox-wrapper">
                        <input type="checkbox" name="lunchBreak" id="field-lunch">
                        <label for="field-lunch">Pausa Mensa (1h)</label>
                    </div>

                    <div class="form-group">
                        <label>Luogo Intervento</label>
                        <input type="text" name="location" id="field-location" list="contacts-list" placeholder="Cerca azienda..." autocomplete="off">
                        <datalist id="contacts-list"></datalist>
                    </div>

                    <div class="form-group">
                        <label>Note</label>
                        <textarea name="notes" rows="3" id="field-notes"></textarea>
                    </div>
                </div>

                <div class="card">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                        <span>Ore Totali:</span>
                        <span id="calc-total" class="text-gold">0h</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span>Straordinari:</span>
                        <div id="calc-overtime" class="text-gold" style="text-align:right;">0h</div>
                    </div>
                </div>
                <!-- Hidden OT Fields -->
                <input type="hidden" name="overtime25" id="field-ot25" value="0">
                <input type="hidden" name="overtime50" id="field-ot50" value="0">

                <button type="submit" class="btn btn-primary" id="save-btn">
                    <i class="ph ph-floppy-disk"></i> Salva Report
                </button>
            </form>
        </div>
    `,

    contacts: () => `
        <div class="fade-in">
            <button class="btn btn-icon-only" style="background-color: #3b82f6; color: white; padding: 8px 16px;" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <h2 class="text-center text-gold mt-4 mb-4">Rubrica</h2>

            <div class="card" id="contact-form-card">
                <h3 style="margin-bottom:15px; font-size:1rem;" id="contact-form-title">Nuovo Contatto</h3>
                <form onsubmit="app.handleContactSubmit(event)" id="contact-form">
                    <input type="hidden" name="id" id="contact-id">
                    <div class="form-group">
                        <input type="text" name="company" id="contact-company" placeholder="Azienda" required>
                    </div>
                    <!-- Split Address -->
                    <div style="display:grid; grid-template-columns: 2fr 1fr; gap:10px;">
                        <div class="form-group">
                            <input type="text" name="street" id="contact-street" placeholder="Via/Piazza">
                        </div>
                         <div class="form-group">
                            <input type="text" name="number" id="contact-number" placeholder="N°">
                        </div>
                    </div>
                    <div class="form-group">
                        <input type="text" name="city" id="contact-city" placeholder="Città">
                    </div>
                    
                    <div class="form-group">
                        <input type="text" name="person" id="contact-person" placeholder="Referente">
                    </div>
                    <div class="form-group">
                        <input type="tel" name="phone" id="contact-phone" placeholder="Telefono">
                    </div>
                    <div style="display:flex; gap:10px;">
                         <button type="submit" class="btn btn-primary" style="flex:1;">Salva</button>
                         <button type="button" class="btn hidden" id="contact-cancel-edit" onclick="app.cancelContactEdit()">Annulla</button>
                    </div>
                </form>
            </div>

            <div id="contacts-list-view">
                <!-- Rendered by JS -->
            </div>
        </div>
    `,

    history: () => {
        const currentMonth = new Date().toISOString().slice(0, 7);
        return `
        <div class="fade-in">
             <div style="display:flex; flex-direction:column; gap:10px; margin-top:10px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <button class="btn btn-icon-only" style="background-color: #3b82f6; color: white; padding: 8px 16px;" onclick="app.navigate('home')">
                        <i class="ph ph-arrow-left"></i> Indietro
                    </button>
                    <!-- Export Controls -->
                    <div style="display:flex; align-items:center; gap:5px;">
                        <input type="month" id="export-month" value="${currentMonth}" style="padding:5px; border-radius:8px; border:1px solid #444; background:#222; color:white;">
                    </div>
                </div>
                
                <div style="display:flex; justify-content:flex-end; gap:6px; flex-wrap:wrap;">
                     <button class="btn btn-sm" onclick="app.exportPDF('month')" title="Scarica PDF Mese" style="font-size:0.8rem;">
                        <i class="ph ph-file-pdf"></i> Scarica PDF
                    </button>
                    <button class="btn btn-sm" style="background-color: #2563eb; color: white; font-size:0.8rem; font-weight:600;" onclick="app.sendPDFViaEmail('month')" title="Invia PDF ad Amministrazione">
                        <i class="ph ph-envelope-simple"></i> Invia ad Amministrazione
                    </button>
                    <button class="btn btn-sm" onclick="app.exportPDF('year')" title="PDF Anno Selezionato" style="font-size:0.8rem;">
                        <i class="ph ph-calendar"></i> PDF Anno
                    </button>
                </div>
            </div>
            <h2 class="text-center text-gold mt-2 mb-4">Storico</h2>
            <div id="history-list">
                <!-- Rendered JS -->
            </div>
        </div>
        `;
    },

    salary: () => `
        <div class="fade-in">
             <button class="btn btn-icon-only" style="background-color: #3b82f6; color: white; padding: 8px 16px;" onclick="app.navigate('home')">
                <i class="ph ph-arrow-left"></i> Indietro
            </button>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h2 class="text-gold mt-4 mb-4">Stipendio</h2>
                <div style="display:flex; gap:10px;">
                    <button class="btn btn-icon-only" onclick="app.toggleAnnual()" title="Vista Annuale">
                        <i class="ph ph-calendar"></i>
                    </button>
                    <button class="btn btn-icon-only" onclick="app.toggleSettings()">
                        <i class="ph ph-gear"></i>
                    </button>
                </div>
            </div>

            
            <div class="card" id="salary-month-picker-card" style="display:flex; flex-direction:column; align-items:center;">
                <input type="month" id="salary-month" style="margin-bottom:15px; width:100%; max-width:250px; font-size:1.1rem; padding:10px;" onchange="app.renderSalary(this.value)">
                
                <div id="salary-stats">
                    <p class="text-center text-muted"><i class="ph ph-spinner ph-spin"></i> Caricamento...</p>
                </div>
            </div>

            <!-- Settings Modal (Hidden by default) -->
            <div id="settings-modal" class="card hidden" style="position:absolute; top:80px; left:20px; right:20px; z-index:50; box-shadow: 0 10px 50px rgba(0,0,0,0.5);">
                 <h3>Impostazioni</h3>
                 <p style="font-size:0.8rem; color:#aaa; margin-bottom:10px;">Modifica i valori per il mese selezionato.</p>
                 <form onsubmit="app.saveSettings(event)" style="margin-top:15px;">
                    <div class="form-group"><label>Paga Base (€)</label><input type="number" name="baseSalary" step="0.01"></div>
                    <div class="form-group"><label>Paga Oraria (€)</label><input type="number" name="hourlyRate" step="0.01"></div>
                    <div class="form-group"><label>Indennità Rientro (€)</label><input type="number" name="allowanceReturn" step="0.01"></div>
                    <div class="form-group"><label>Indennità Notte (€)</label><input type="number" name="allowanceOvernight" step="0.01"></div>
                    <div class="form-group"><label>Indennità Estero (€)</label><input type="number" name="allowanceForeign" step="0.01"></div>
                    
                    <div style="display:flex; gap:10px; margin-top:20px;">
                        <button type="button" class="btn" onclick="app.toggleSettings()">Chiudi</button>
                        <button type="submit" class="btn btn-primary">Salva Mese</button>
                    </div>
                 </form>
            </div>
        </div>
    `,

    login: () => `
        <div class="fade-in auth-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <div style="font-size:2.4rem; color:var(--primary); margin-bottom:8px;">
                        <i class="ph ph-shield-check"></i>
                    </div>
                    <h2>Accedi ad Orari TS</h2>
                    <p>Inserisci le tue credenziali aziendali</p>
                </div>

                                <!-- Pulsante Accesso con Google -->
                <div style="margin-bottom:14px;">
                    <button type="button" class="btn btn-google" onclick="app.handleGoogleLogin()" id="btn-google-login">
                        <svg width="18" height="18" viewBox="0 0 24 24" style="flex-shrink:0;">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <span>Accedi con Google</span>
                    </button>
                </div>

                <div class="auth-divider">oppure con credenziali</div>

                <form onsubmit="app.handleLoginSubmit(event)">
                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Username o Email</label>
                        <input type="text" id="login-identifier" required placeholder="es. bubibs oppure email" autocomplete="username" style="font-size:1rem; padding:12px;">
                    </div>


                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Password</label>
                        <div class="input-password-wrapper">
                            <input type="password" id="login-password" required placeholder="Inserisci password" autocomplete="current-password" style="font-size:1rem; padding:12px;">
                            <button type="button" class="btn-toggle-pwd" onclick="app.togglePasswordVisibility('login-password', this)">
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>
                        <div style="display:flex; justify-content:flex-end; margin-top:6px;">
                            <button type="button" onclick="app.showForgotPasswordModal()" style="background:none; border:none; color:var(--primary); font-size:0.82rem; cursor:pointer; text-decoration:underline; padding:0;">Hai dimenticato la password?</button>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary" style="margin-top:16px; padding:14px; font-size:1rem;">
                        <i class="ph ph-sign-in"></i> Accedi
                    </button>
                </form>

                <!-- Accesso Rapido Fabio Sandrini -->
                <div class="fast-access-section">
                    <button type="button" class="fast-access-btn" onclick="app.handleFastLogin('bubibs@gmail.com', 'Brescia1-')">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-user-check" style="font-size:1.2rem;"></i>
                            <span>Accesso Rapido Fabio Sandrini</span>
                        </div>
                        <i class="ph ph-arrow-right"></i>
                    </button>
                    <div style="font-size:0.75rem; color:var(--text-muted); text-align:center;">
                        (Account: <strong>bubibs@gmail.com</strong>)
                    </div>
                </div>

                <div style="text-align:center; margin-top:22px; padding-top:16px; border-top:1px solid rgba(255,255,255,0.08);">
                    <span style="font-size:0.85rem; color:var(--text-muted);">Non hai ancora un account?</span><br>
                    <button type="button" class="btn btn-sm" style="background:none; border:none; color:var(--primary); font-size:0.9rem; font-weight:600; text-decoration:underline; cursor:pointer; padding:6px; margin-top:4px;" onclick="app.navigate('register')">
                        Crea un nuovo account utente
                    </button>
                </div>
            </div>
        </div>
    `,

    register: () => `
        <div class="fade-in auth-wrapper">
            <div class="auth-card">
                <div class="auth-header">
                    <div style="font-size:2.4rem; color:var(--primary); margin-bottom:8px;">
                        <i class="ph ph-user-plus"></i>
                    </div>
                    <h2>Nuovo Utente</h2>
                    <p>Registra un profilo personale su Orari TS</p>
                </div>

                <form onsubmit="app.handleRegisterSubmit(event)">
                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Nome e Cognome</label>
                        <input type="text" id="reg-name" required placeholder="es. Mario Rossi" autocomplete="name" style="font-size:1rem; padding:12px;">
                    </div>

                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Username</label>
                        <input type="text" id="reg-username" required placeholder="es. mario.rossi" autocomplete="username" style="font-size:1rem; padding:12px;">
                    </div>

                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Email (opzionale)</label>
                        <input type="email" id="reg-email" placeholder="mario@tecnosistem.com" autocomplete="email" style="font-size:1rem; padding:12px;">
                    </div>

                                        <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Numero di Cellulare (WhatsApp)</label>
                        <input type="tel" id="reg-phone" placeholder="es. 3331234567" autocomplete="tel" style="font-size:1rem; padding:12px;">
                        <small style="font-size:0.75rem; color:var(--text-muted); display:block; margin-top:3px;">
                            📱 Utilizzato per inviarti il codice temporaneo di sicurezza se dimentichi la password.
                        </small>
                    </div>

                    <div class="form-group">
                        <label style="font-size:0.85rem; color:var(--text-muted); display:block; margin-bottom:6px;">Password</label>
                        <div class="input-password-wrapper">
                            <input type="password" id="reg-password" required placeholder="Scegli una password" autocomplete="new-password" style="font-size:1rem; padding:12px;">
                            <button type="button" class="btn-toggle-pwd" onclick="app.togglePasswordVisibility('reg-password', this)">
                                <i class="ph ph-eye"></i>
                            </button>
                        </div>
                    </div>

                    <button type="submit" class="btn btn-primary" style="margin-top:16px; padding:14px; font-size:1rem;">
                        <i class="ph ph-check"></i> Registrati e Accedi
                    </button>
                </form>

                <div style="text-align:center; margin-top:20px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.08);">
                    <button type="button" class="btn btn-sm" style="background:none; border:none; color:var(--text-muted); font-size:0.88rem; cursor:pointer;" onclick="app.navigate('login')">
                        ← Hai già un account? Torna al Login
                    </button>
                </div>
            </div>
        </div>
    `
};

// --- Main App Logic ---

class App {
    constructor() {
        this.root = document.getElementById('main-content');
        this.currentView = 'home';
        this.editReportId = null;
        this.showAnnual = false;
        this.init();
    }

    async init() {
        await Auth.init();
        window.auth = Auth;

        const currentUser = Auth.getCurrentUser();
        this.updateAuthUI(currentUser);

        if (!currentUser) {
            this.navigate('login');
            return;
        }

        this.navigate('home');
        this.updateCloudStatus();

        // Auto-sync on start
        console.log("Auto-syncing data...");
        this.fetchWeather();
        await this.sync();
    }

    navigate(viewName, params = null) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser && viewName !== 'login' && viewName !== 'register') {
            this.navigate('login');
            return;
        }

        if (!Views[viewName]) return;
        this.currentView = viewName;
        this.root.innerHTML = Views[viewName]();

        // Aggiorna la barra di navigazione inferiore fissa
        this.updateBottomNav(viewName);

        // Post-render lifecycle
        if (viewName === 'home') this.renderHomeDashboard();
        if (viewName === 'report') this.initReportForm(params);
        if (viewName === 'contacts') this.renderContacts();
        if (viewName === 'history') this.renderHistory();
        if (viewName === 'salary') this.renderSalary(new Date().toISOString().slice(0, 7));
    }

    updateBottomNav(viewName) {
        const bottomNav = document.getElementById('bottom-nav');
        if (!bottomNav) return;

        const currentUser = Auth.getCurrentUser();
        if (!currentUser || viewName === 'login' || viewName === 'register') {
            bottomNav.style.display = 'none';
            return;
        }

        bottomNav.style.display = 'flex';

        const btnHome = document.getElementById('bottom-nav-home');
        const btnHistory = document.getElementById('bottom-nav-history');
        const btnSalary = document.getElementById('bottom-nav-salary');

        if (btnHome) btnHome.classList.toggle('active', viewName === 'home');
        if (btnHistory) btnHistory.classList.toggle('active', viewName === 'history');
        if (btnSalary) btnSalary.classList.toggle('active', viewName === 'salary');
    }

    updateAuthUI(user) {
        const userBadge = document.getElementById('user-header-badge');
        const userNameSpan = document.getElementById('user-header-name');
        const footer = document.getElementById('app-footer');

        if (user) {
            if (userBadge) {
                userBadge.style.display = 'flex';
                if (userNameSpan) userNameSpan.textContent = user.username || (user.name ? user.name.split(' ')[0] : 'bubibs');
                userBadge.title = `${user.name || user.username} (${user.email || user.username})`;
            }
            if (footer) {
                footer.textContent = user.isPrimary ? 'Fabio Sandrini' : (user.name || 'Tecnosistem');
            }
        } else {
            if (userBadge) userBadge.style.display = 'none';
            if (footer) footer.textContent = 'Tecnosistem';
        }
    }

    togglePasswordVisibility(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPwd = input.type === 'password';
        input.type = isPwd ? 'text' : 'password';
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = isPwd ? 'ph ph-eye-slash' : 'ph ph-eye';
        }
    }

    async handleLoginSubmit(event) {
        event.preventDefault();
        const identifier = document.getElementById('login-identifier')?.value;
        const password = document.getElementById('login-password')?.value;

        const res = await Auth.login(identifier, password);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        Store.init();
        this.updateAuthUI(res.user);
        this.navigate('home');
        this.showToast(`Bentornato, ${res.user.name}!`, 'success');
        this.sync();

        
    }

    async handleRegisterSubmit(event) {
        event.preventDefault();
        const name = document.getElementById('reg-name')?.value;
        const username = document.getElementById('reg-username')?.value;
        const email = document.getElementById('reg-email')?.value;
        const phone = document.getElementById('reg-phone')?.value;
        const password = document.getElementById('reg-password')?.value;

        const res = await Auth.register({ name, username, email, phone, password });
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        Store.init();
        this.updateAuthUI(res.user);
        this.navigate('home');
        this.showToast(`Benvenuto in Orari TS, ${res.user.name}!`, 'success');
        this.sync();

        // Per nuovi utenti, avvia la configurazione guidata parametri stipendio (default 0)
        this.showSalaryOnboardingModal(res.user);
    }

    async handleFastLogin(username, password) {
        const res = await Auth.login(username, password);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        Store.init();
        this.updateAuthUI(res.user);
        this.navigate('home');
        this.showToast(`Accesso rapido effettuato. Ciao ${res.user.name}!`, 'success');
        this.sync();

        
    }

    handleSaveCloudUrl() {
        const input = document.getElementById('user-cloud-url');
        const url = input ? input.value : '';
        Auth.updateUserSettings({ cloudUrl: url });
        this.showToast('Impostazione cloud salvata!', 'success');
        this.closeUserMenu();
        this.sync();
    }

    handleLogout() {
        this.closeUserMenu();
        Auth.logout();
        this.updateAuthUI(null);
        this.navigate('login');
        this.showToast('Disconnessione effettuata.', 'info');
    }

    toggleUserMenu() {
        const container = document.getElementById('user-modal-container');
        if (!container) return;

        if (document.getElementById('user-profile-modal-overlay')) {
            this.closeUserMenu();
            return;
        }

        const user = Auth.getCurrentUser();
        if (!user) return;

        const otherUsers = Auth.getUsers().filter(u => !u.isPrimary && u.id !== user.id);
        let userManagementHtml = '';
        if (user.isPrimary) {
            const userRows = otherUsers.length === 0
                ? '<p style="font-size:0.8rem; color:var(--text-muted); font-style:italic; padding:6px 0;">Nessun altro utente registrato al momento.</p>'
                : otherUsers.map(u => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.06);">
                        <div style="text-align:left; flex:1; min-width:0; margin-right:8px;">
                            <div style="font-weight:600; font-size:0.88rem; color:var(--text); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.name}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${u.email || u.username}</div>
                        </div>
                        <div style="display:flex; gap:6px; flex-shrink:0;">
                            <button type="button" class="btn btn-sm" style="padding:4px 8px; font-size:0.75rem; background:#3b82f6; color:white; width:auto;" onclick="app.adminResetUserPassword('${u.id}', '${(u.name || '').replace(/'/g, "\\'")}')" title="Reimposta Password">
                                <i class="ph ph-key"></i> Reset
                            </button>
                            <button type="button" class="btn btn-sm btn-danger" style="padding:4px 8px; font-size:0.75rem; background:#ef4444; color:white; width:auto;" onclick="app.confirmDeleteUser('${u.id}', '${(u.name || '').replace(/'/g, "\\'")}')" title="Elimina Utente">
                                <i class="ph ph-trash"></i> Elimina
                            </button>
                        </div>
                    </div>
                `).join('');

            userManagementHtml = `
                <!-- Sezione Amministrazione Utenti Aziendali (Solo Utente Principale) -->
                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,215,0,0.3); border-radius:12px; padding:14px; margin-bottom:16px; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-users-three text-gold" style="font-size:1.25rem;"></i>
                            <span style="font-weight:700; font-size:0.92rem; color:var(--primary);">Gestione Utenti Azienda</span>
                        </div>
                        <span style="font-size:0.75rem; background:rgba(255,215,0,0.2); color:var(--primary); padding:2px 6px; border-radius:4px; font-weight:700;">ADMIN</span>
                    </div>
                    <p style="font-size:0.76rem; color:var(--text-muted); margin-bottom:10px;">
                        Cancella colleghi non più presenti in azienda o reimposta la loro password.
                    </p>
                    <div style="max-height:160px; overflow-y:auto; padding-right:4px;">
                        ${userRows}
                    </div>
                </div>
            `;
        }

        const modalDiv = document.createElement('div');
        modalDiv.id = 'user-profile-modal-overlay';
        modalDiv.className = 'modal-overlay';
        modalDiv.onclick = () => this.closeUserMenu();

        modalDiv.innerHTML = `
            <div class="modal-card fade-in" onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="ph ph-user-circle text-gold" style="font-size:2rem;"></i>
                        <div style="text-align:left;">
                            <h3 style="margin:0; font-size:1.15rem; color:var(--text); font-weight:700;">${user.name}</h3>
                            <span style="font-size:0.8rem; color:var(--text-muted);">${user.email || user.username} ${user.isPrimary ? '★ (Principale)' : ''}</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-icon-only" style="padding:4px 8px; font-size:1.1rem; background:rgba(255,255,255,0.1);" onclick="app.closeUserMenu()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                ${userManagementHtml}
                <!-- Sezione Face ID -->
                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; margin-bottom:14px; text-align:left;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <i class="ph ph-scan-face text-gold" style="font-size:1.3rem;"></i>
                            <span style="font-weight:600; font-size:0.92rem;">Face ID / Biometria</span>
                        </div>
                        <span style="font-size:0.8rem; padding:2px 8px; border-radius:10px; background:${user.hasFaceId ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}; color:${user.hasFaceId ? '#22c55e' : '#ef4444'}; font-weight:600;">
                            ${user.hasFaceId ? 'Attivo' : 'Non attivo'}
                        </span>
                    </div>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px; line-height:1.4;">
                        ${user.hasFaceId 
                            ? 'Face ID è abilitato su questo dispositivo. Puoi accedere istantaneamente con il tuo volto.' 
                            : 'Abilita l\'accesso rapido con Face ID (o Touch ID/Windows Hello) sul tuo dispositivo.'}
                    </p>
                    <button type="button" class="btn btn-sm" style="background:#2563eb; color:white; font-size:0.85rem; width:100%; font-weight:600;" onclick="app.handleRegisterFaceId()">
                        <i class="ph ph-scan-face"></i> ${user.hasFaceId ? 'Riconfigura Face ID' : 'Abilita Face ID Ora'}
                    </button>
                </div>

                <!-- Sezione Cloud Database Personale -->
                <div style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); border-radius:12px; padding:14px; margin-bottom:16px; text-align:left;">
                    <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                        <i class="ph ph-cloud text-gold" style="font-size:1.2rem;"></i>
                        <span style="font-weight:600; font-size:0.92rem;">Database Cloud Personale</span>
                    </div>
                    <p style="font-size:0.78rem; color:var(--text-muted); margin-bottom:8px;">
                        URL Google Apps Script personale (lascia vuoto per usare il cloud aziendale condiviso).
                    </p>
                    <input type="text" id="user-cloud-url" value="${user.cloudUrl || ''}" placeholder="https://script.google.com/..." style="font-size:0.82rem; padding:8px 10px; width:100%; margin-bottom:8px;">
                    <button type="button" class="btn btn-sm" style="background:rgba(255,255,255,0.15); color:white; font-size:0.82rem; width:100%;" onclick="app.handleSaveCloudUrl()">
                        Salva URL Cloud
                    </button>
                </div>

                <!-- Pulsante Logout -->
                <button type="button" class="btn btn-danger" style="background:#ef4444; color:white; width:100%; font-size:0.95rem; font-weight:600; padding:12px;" onclick="app.handleLogout()">
                    <i class="ph ph-sign-out"></i> Disconnetti Account
                </button>
            </div>
        `;

        container.appendChild(modalDiv);
    }

    closeUserMenu() {
        const modal = document.getElementById('user-profile-modal-overlay');
        if (modal) modal.remove();
    }

    // --- Weather Logic ---
    async fetchWeather() {
        const container = document.getElementById('weather-header');
        if (!container) return;

        if (!navigator.geolocation) {
            // container.innerHTML = '<span style="font-size:0.8rem; opacity:0.7">No GPS</span>';
            return;
        }

        navigator.geolocation.getCurrentPosition(async position => {
            const lat = position.coords.latitude;
            const lon = position.coords.longitude;

            try {
                const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
                const data = await res.json();

                if (data.current_weather) {
                    const temp = Math.round(data.current_weather.temperature);
                    const code = data.current_weather.weathercode;
                    const icon = this.getWeatherIcon(code);

                    container.innerHTML = `
                        <div class="fade-in" style="display:flex; align-items:center; gap:8px;">
                            <i class="${icon}" style="font-size:1.5rem; color:#facc15;"></i>
                            <span style="font-size:1.2rem; font-weight:600;">${temp}°</span>
                        </div>
                    `;
                }
            } catch (e) {
                console.error("Weather error", e);
                container.innerHTML = '<span style="font-size:0.8rem; opacity:0.7">N/A</span>';
            }
        }, err => {
            console.warn("GPS Denied", err);
            container.innerHTML = `<span style="font-size:0.8rem; opacity:0.7">GPS Off</span>`;
        });
    }

    getWeatherIcon(code) {
        // WMO Weather interpretation codes (WW)
        // 0: Clear sky
        // 1, 2, 3: Mainly clear, partly cloudy, and overcast
        // 45, 48: Fog
        // 51-55: Drizzle
        // 61-65: Rain
        // 71-77: Snow
        // 80-82: Rain showers
        // 95-99: Thunderstorm

        if (code === 0) return 'ph ph-sun';
        if (code >= 1 && code <= 3) return 'ph ph-cloud-sun';
        if (code >= 45 && code <= 48) return 'ph ph-cloud-fog';
        if (code >= 51 && code <= 67) return 'ph ph-cloud-rain';
        if (code >= 71 && code <= 77) return 'ph ph-snowflake';
        if (code >= 80 && code <= 82) return 'ph ph-cloud-rain';
        if (code >= 95 && code <= 99) return 'ph ph-cloud-lightning';
        return 'ph ph-sun'; // Default
    }

    // --- Home Dashboard Logic ---
    renderHomeDashboard() {
        const container = document.getElementById('home-dashboard');
        if (!container) return;

        // 1. Date & Greeting
        const now = new Date();
        const options = { weekday: 'long', day: 'numeric', month: 'long' };
        const dateStr = now.toLocaleDateString('it-IT', options);
        const hour = now.getHours();
        let greeting = 'Buongiorno';
        if (hour >= 13) greeting = 'Buon Pomeriggio';
        if (hour >= 18) greeting = 'Buonasera';

        // 2. Local Dates & Reports
        const localYear = now.getFullYear();
        const localMonth = String(now.getMonth() + 1).padStart(2, '0');
        const localDay = String(now.getDate()).padStart(2, '0');
        const todayStr = `${localYear}-${localMonth}-${localDay}`;
        const currentMonthKey = `${localYear}-${localMonth}`;

        const reports = Store.getReports();
        const existingDates = new Set(reports.map(r => r.date).filter(Boolean));

        // Stats (Current Month Hours)
        const monthReports = reports.filter(r => r.date && r.date.startsWith(currentMonthKey));
        let totalHours = 0;
        let daysWorked = 0;
        monthReports.forEach(r => {
            totalHours += parseFloat(r.totalHours) || 0;
            if (!r.absence && r.type !== 'Assenza') daysWorked++;
        });

        // 3. Alert Logic (Missing Report for TODAY + PAST WORK DAYS)
        const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ..., 5=Fri, 6=Sat
        const isTodayWorkDay = (dayOfWeek >= 1 && dayOfWeek <= 5);
        const isTodayMissing = isTodayWorkDay && !existingDates.has(todayStr);

        // Find missing past workdays (Mon-Fri)
        // Check backwards from yesterday
        let earliestDateStr = null;
        if (reports.length > 0) {
            const sortedDates = reports.map(r => r.date).filter(Boolean).sort();
            if (sortedDates.length > 0) earliestDateStr = sortedDates[0];
        }

        const missingPastDays = [];
        const daysToCheck = (now.getDate() <= 7) ? 14 : Math.min(30, now.getDate());

        for (let i = 1; i <= daysToCheck; i++) {
            const checkD = new Date(localYear, now.getMonth(), now.getDate() - i);
            const cy = checkD.getFullYear();
            const cm = String(checkD.getMonth() + 1).padStart(2, '0');
            const cd = String(checkD.getDate()).padStart(2, '0');
            const dateStrCheck = `${cy}-${cm}-${cd}`;

            // Do not check older than earliest report if outside current month
            if (earliestDateStr && dateStrCheck < earliestDateStr && i > now.getDate()) {
                break;
            }

            const dow = checkD.getDay();
            // Monday to Friday only
            if (dow >= 1 && dow <= 5) {
                if (!existingDates.has(dateStrCheck)) {
                    const rawWd = checkD.toLocaleDateString('it-IT', { weekday: 'short' });
                    const wdCap = rawWd.charAt(0).toUpperCase() + rawWd.slice(1);
                    missingPastDays.push({
                        date: dateStrCheck,
                        label: `${wdCap} ${cd}/${cm}`,
                        fullLabel: checkD.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })
                    });
                }
            }
        }

        // Build Alert HTML
        let alertHtml = '';
        if (isTodayMissing || missingPastDays.length > 0) {
            let titleText = '';
            let mainActionBtn = '';

            if (isTodayMissing) {
                titleText = 'Non hai ancora compilato il report di oggi.';
                mainActionBtn = `<button type="button" class="alert-action" onclick="event.stopPropagation(); app.navigate('report', { date: '${todayStr}' })">Compila Oggi</button>`;
            } else {
                const count = missingPastDays.length;
                titleText = `Attenzione: manca il report di ${count} giorn${count === 1 ? 'o passato' : 'i passati'}.`;
                mainActionBtn = `<button type="button" class="alert-action" onclick="event.stopPropagation(); app.navigate('report', { date: '${missingPastDays[0].date}' })">Compila</button>`;
            }

            let pastDaysHtml = '';
            if (missingPastDays.length > 0) {
                const pillsHtml = missingPastDays.map(item => `
                    <button type="button" class="missing-day-pill" title="Compila report di ${item.fullLabel}" onclick="event.stopPropagation(); app.navigate('report', { date: '${item.date}' })">
                        <i class="ph ph-calendar-plus"></i>
                        <span>${item.label}</span>
                    </button>
                `).join('');

                pastDaysHtml = `
                <div class="missing-days-section">
                    <div class="missing-days-title">
                        <i class="ph ph-clock-counter-clockwise"></i>
                        <span>${isTodayMissing ? 'Mancano anche report nei giorni passati:' : 'Giorni passati da compilare:'}</span>
                    </div>
                    <div class="missing-days-pills">
                        ${pillsHtml}
                    </div>
                </div>`;
            }

            alertHtml = `
            <div class="alert-box" style="flex-direction: column; align-items: stretch; gap: 8px;">
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; width: 100%;">
                    <div class="alert-content">
                        <i class="ph ph-warning-circle" style="font-size:1.5rem; flex-shrink:0;"></i>
                        <span>${titleText}</span>
                    </div>
                    ${mainActionBtn}
                </div>
                ${pastDaysHtml}
            </div>`;
        }

        // 4. Quote (Get existing logic)
        // We will fetch it and render it inside the dashboard grid
        const cloudQuote = Store.get(Store.KEYS.DAILY_QUOTE);
        const quoteText = (cloudQuote && cloudQuote.text) ? `"${cloudQuote.text}"` : '"Caricamento ispirazione..."';
        const quoteAuthor = (cloudQuote && cloudQuote.author) ? `- ${cloudQuote.author}` : '';

        // RENDER
        container.innerHTML = `
            <div class="dashboard-header fade-in">
                <div class="dashboard-greeting">${greeting}, ${Auth.getCurrentUser() ? (Auth.getCurrentUser().name ? Auth.getCurrentUser().name.split(' ')[0] : Auth.getCurrentUser().username) : 'Fabio'}</div>
                <div class="dashboard-date">${dateStr}</div>
            </div>

            ${alertHtml}

            <!-- Stats Row -->
            <div class="stat-card fade-in">
                <div class="stat-item">
                    <div class="stat-value">${totalHours}h</div>
                    <div class="stat-label">Ore Mese</div>
                </div>
                <div style="width:1px; height:40px; background:rgba(255,255,255,0.1);"></div>
                <div class="stat-item">
                    <div class="stat-value">${daysWorked}</div>
                    <div class="stat-label">Giorni Lav.</div>
                </div>
            </div>

            <!-- Quote Widget (Integrated) -->
            <div class="quote-widget fade-in" style="margin-top:10px; border:none; padding-top:0;">
                <p id="daily-quote" class="quote-text">${quoteText}</p>
                <div id="quote-author" class="quote-author">${quoteAuthor}</div>
            </div>
        `;

        // Trigger quote interaction if "Loading..."
        if (!cloudQuote) this.loadQuote();
    }

    // --- Sync Logic ---

    async sync() {
        const btn = document.getElementById('cloud-btn');
        if (btn) btn.classList.add('syncing');
        this.updateCloudStatus('syncing');

        const cloudData = await API.fetchCloudData();
        if (cloudData) {
            Store.mergeCloudData(cloudData);
            this.showToast('Dati Cloud scaricati');

            if (this.currentView === 'contacts') this.renderContacts();
            if (this.currentView === 'history') this.renderHistory();
            if (this.currentView === 'salary' && !this.showAnnual) this.renderSalary(document.getElementById('salary-month')?.value);
            // REFRESH HOME TO SHOW NEW QUOTE IMMEDIATELY
            if (this.currentView === 'home') this.loadQuote();

        } else {
            console.warn("Sync returned null or failed");
        }

        if (btn) btn.classList.remove('syncing');
        this.updateCloudStatus();
    }

    updateCloudStatus(forceState) {
        const container = document.getElementById('cloud-status');
        const icon = document.getElementById('cloud-icon');

        if (forceState === 'syncing') {
            container.className = 'cloud-indicator syncing';
            icon.className = 'ph ph-arrows-clockwise ph-spin';
            return;
        }

        API.checkHealth().then(online => {
            container.className = `cloud-indicator ${online ? 'synced' : 'error'}`;
            icon.className = online ? 'ph ph-cloud-check' : 'ph ph-cloud-slash';
        });
    }

    showToast(msg, type = 'success') {
        const container = document.getElementById('toast-container') || document.body;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.style.borderLeftColor = type === 'success' ? '#22c55e' : '#ef4444';
        toast.innerHTML = `<i class="ph ph-${type === 'success' ? 'check-circle' : 'warning-circle'}"></i> <span>${msg}</span>`;
        container.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    }

    // --- Components logic ---
    async loadQuote() {
        const el = document.getElementById('daily-quote');
        const authorEl = document.getElementById('quote-author');
        if (!el) return;

        // Try getting from Cloud Sync first
        const cloudQuote = Store.get(Store.KEYS.DAILY_QUOTE);

        if (cloudQuote && cloudQuote.text) {
            el.textContent = `"${cloudQuote.text}"`;
            authorEl.textContent = cloudQuote.author ? `- ${cloudQuote.author}` : '';
            return;
        }

        // Fallback (Offline/First Load)
        el.textContent = "\"Caricamento ispirazione...\"";
        authorEl.textContent = "";
    }

    // --- Report Page ---

    initReportForm(reportToEdit = null) {
        const list = document.getElementById('contacts-list');
        if (list) {
            list.innerHTML = '';
            Store.getContacts().forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.company;
                list.appendChild(opt);
            });
        }

        const inputs = ['field-start', 'field-end', 'field-lunch', 'field-type', 'field-date', 'field-absence'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('change', () => this.calculateHours());
        });

        // Dedicated listener for absence selection (auto-presets 8h for ferie)
        const absenceSelect = document.getElementById('field-absence');
        if (absenceSelect) {
            absenceSelect.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val === 'ferie') {
                    const startEl = document.getElementById('field-start');
                    const endEl = document.getElementById('field-end');
                    const typeEl = document.getElementById('field-type');
                    const locEl = document.getElementById('field-location');
                    if (!startEl.value || !endEl.value) {
                        startEl.value = '08:00';
                        endEl.value = '16:00';
                        document.getElementById('field-lunch').checked = false;
                    }
                    if (!typeEl.value) typeEl.value = 'sede';
                    if (!locEl.value) locEl.value = 'Ferie';
                }
                this.calculateHours();
            });
        }

        if (reportToEdit && reportToEdit.id) {
            this.editReportId = reportToEdit.id;
            document.getElementById('report-title').innerText = "Modifica Report";
            document.getElementById('field-id').value = reportToEdit.id;
            document.getElementById('field-date').value = reportToEdit.date;
            document.getElementById('field-type').value = reportToEdit.type || '';
            document.getElementById('field-absence').value = reportToEdit.absence || '';
            document.getElementById('field-start').value = reportToEdit.startTime || '';
            document.getElementById('field-end').value = reportToEdit.endTime || '';
            document.getElementById('field-lunch').checked = !!reportToEdit.lunchBreak;
            document.getElementById('field-location').value = reportToEdit.location || '';
            document.getElementById('field-notes').value = reportToEdit.notes || '';
            this.calculateHours();
        } else {
            this.editReportId = null;
            document.getElementById('report-title').innerText = "Nuovo Report";
            document.getElementById('field-id').value = '';

            let targetDate = '';
            if (typeof reportToEdit === 'string') {
                targetDate = reportToEdit;
            } else if (reportToEdit && reportToEdit.date) {
                targetDate = reportToEdit.date;
            }

            if (targetDate) {
                document.getElementById('field-date').value = targetDate;
            } else {
                const now = new Date();
                const ly = now.getFullYear();
                const lm = String(now.getMonth() + 1).padStart(2, '0');
                const ld = String(now.getDate()).padStart(2, '0');
                document.getElementById('field-date').value = `${ly}-${lm}-${ld}`;
            }

            document.getElementById('field-type').value = '';
            document.getElementById('field-absence').value = '';
            document.getElementById('field-start').value = '';
            document.getElementById('field-end').value = '';
            document.getElementById('field-lunch').checked = false;
            document.getElementById('field-location').value = '';
            document.getElementById('field-notes').value = '';
            this.calculateHours();
        }
    }

    handleTypeChange(type) {
        if (type === 'sede') {
            document.getElementById('field-start').value = '08:00';
            document.getElementById('field-end').value = '17:00';
            document.getElementById('field-lunch').checked = true;
            document.getElementById('field-location').value = 'Tecnosistem';
            this.calculateHours();
        }
    }

    calculateHours() {
        const start = document.getElementById('field-start').value;
        const end = document.getElementById('field-end').value;
        const lunch = document.getElementById('field-lunch').checked;
        const absenceVal = document.getElementById('field-absence')?.value || '';

        if (!start || !end) return;

        const d1 = new Date(`2000-01-01T${start}`);
        const d2 = new Date(`2000-01-01T${end}`);

        let diffMs = d2 - d1;
        if (diffMs < 0) diffMs += 24 * 60 * 60 * 1000;

        let diffHrs = diffMs / (1000 * 60 * 60);
        if (lunch) diffHrs -= 1;
        if (diffHrs < 0) diffHrs = 0;

        const dateVal = document.getElementById('field-date').value;
        let day = 0;
        let isWeekend = false;
        if (dateVal) {
            const parts = dateVal.split('-').map(Number);
            if (parts.length === 3) {
                const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                day = dateObj.getDay(); // 0=Sun, 6=Sat
                isWeekend = (day === 0 || day === 6);
            }
        }

        let overtime25 = 0;
        let overtime50 = 0;

        // No overtime for absences (ferie, malattia, permesso)
        const isAbsence = (absenceVal !== '');

        if (!isAbsence) {
            if (isWeekend) {
                overtime50 = diffHrs;
            } else {
                overtime25 = Math.max(0, diffHrs - 8);
            }
        }

        document.getElementById('calc-total').textContent = diffHrs.toFixed(1) + 'h';

        let otString = '';
        if (overtime25 > 0) otString += `<span class="text-gold">${overtime25.toFixed(1)}h (25%)</span> `;
        if (overtime50 > 0) otString += `<span style="color:#f87171;">${overtime50.toFixed(1)}h (50%)</span>`;
        if (otString === '') otString = '0h';

        document.getElementById('calc-overtime').innerHTML = otString;

        document.getElementById('field-ot25').value = overtime25.toFixed(2);
        document.getElementById('field-ot50').value = overtime50.toFixed(2);
    }

    async handleReportSubmit(e) {
        e.preventDefault();
        const btn = document.getElementById('save-btn');
        btn.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Salvataggio...';

        const fd = new FormData(e.target);
        const report = Object.fromEntries(fd.entries());
        report.lunchBreak = !!report.lunchBreak;
        report.totalHours = document.getElementById('calc-total').textContent;
        report.overtime = document.getElementById('calc-overtime').innerText;
        report.overtime25 = document.getElementById('field-ot25').value;
        report.overtime50 = document.getElementById('field-ot50').value;
        report.timestamp = new Date().toISOString();

        if (!report.id) report.id = Date.now().toString();

        if (this.editReportId) {
            Store.updateReport(report);
        } else {
            Store.addReport(report);
        }

        const result = await API.saveReport(report);

        btn.innerHTML = '<i class="ph ph-floppy-disk"></i> Salva Report';

        if (result.success) {
            this.showToast('Report salvato!');
        } else {
            this.showToast('Salvato Offline: ' + (result.error || 'Network'), 'warning');
        }

        const locationName = report.location;
        if (locationName && locationName.toLowerCase() !== 'tecnosistem') {
            const exists = Store.getContacts().find(c => c.company.toLowerCase() === locationName.toLowerCase());
            if (!exists) {
                const newContact = {
                    id: Date.now().toString() + '_auto',
                    company: locationName,
                    city: '', street: '', number: '', person: '', phone: ''
                };
                Store.addContact(newContact);
                API.saveContact(newContact);
                this.showToast('Luogo aggiunto in Rubrica', 'success');
            }
        }

        setTimeout(() => this.navigate('home'), 1000);
    }

    // --- Contacts Page ---

    renderContacts() {
        const container = document.getElementById('contacts-list-view');
        const contacts = Store.getContacts();

        if (contacts.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun contatto.</p>';
            return;
        }

        container.innerHTML = contacts.map(c => {
            const fullAddress = [c.street, c.number, c.city].filter(Boolean).join(', ');
            return `
            <div class="card" style="display:flex; justify-content:space-between; align-items:center;">
                <div style="flex:1;">
                    <strong>${c.company}</strong>
                    <div style="font-size:0.85rem; color:#aaa;">${fullAddress || 'Nessun indirizzo'}</div>
                    <!-- Highlighted Contact Person -->
                    <div class="contact-highlight">
                        <i class="ph ph-user"></i> ${c.person || 'Nessun referente'}
                    </div>
                </div>
                <div style="display:flex; gap:8px;">
                     <button class="btn btn-icon-only text-white" style="background:#3b82f6;" onclick="app.editContact('${c.id}')">
                        <i class="ph ph-pencil-simple" style="color:white; font-weight:bold;"></i>
                    </button>
                    ${fullAddress ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(fullAddress)}" target="_blank" class="btn btn-icon-only btn-primary"><i class="ph ph-map-pin"></i></a>` : ''}
                    ${c.phone ? `<a href="tel:${c.phone}" class="btn btn-icon-only btn-primary"><i class="ph ph-phone"></i></a>` : ''}
                    <button class="btn btn-icon-only" style="background:#ef4444;" onclick="app.deleteContact('${c.id}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </div>
            </div>
        `}).join('');
    }

    editContact(id) {
        const c = Store.getContacts().find(x => x.id === id);
        if (!c) return;

        document.getElementById('contact-form-title').innerText = "Modifica Contatto";
        document.getElementById('contact-id').value = c.id;
        document.getElementById('contact-company').value = c.company;
        document.getElementById('contact-city').value = c.city || '';
        document.getElementById('contact-street').value = c.street || '';
        document.getElementById('contact-number').value = c.number || '';
        document.getElementById('contact-person').value = c.person;
        document.getElementById('contact-phone').value = c.phone;

        document.getElementById('contact-cancel-edit').classList.remove('hidden');
        document.getElementById('contact-form-card').scrollIntoView({ behavior: 'smooth' });
    }

    cancelContactEdit() {
        document.getElementById('contact-form').reset();
        document.getElementById('contact-id').value = '';
        document.getElementById('contact-form-title').innerText = "Nuovo Contatto";
        document.getElementById('contact-cancel-edit').classList.add('hidden');
    }

    handleContactSubmit(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const contact = Object.fromEntries(fd.entries());

        if (contact.id) {
            Store.updateContact(contact);
            this.showToast('Contatto aggiornato');
        } else {
            Store.addContact(contact);
            this.showToast('Contatto aggiunto');
        }

        this.renderContacts();
        this.cancelContactEdit();

        API.saveContact(contact);
    }

    deleteContact(id) {
        if (confirm('Eliminare contatto?')) {
            Store.deleteContact(id);
            this.renderContacts();
            API.deleteContact(id);
        }
    }

    // --- PDF Generation Helper ---
    generatePDFDoc(scope) {
        const reports = Store.getReports();
        if (reports.length === 0) {
            alert("Nessun dato da esportare.");
            return null;
        }

        const picker = document.getElementById('export-month') || document.getElementById('salary-month');
        const selectedValue = picker ? picker.value : new Date().toISOString().slice(0, 7);

        // Scope Logic
        let filtered = [];
        let title = '';
        let filename = '';
        let monthName = '';
        let year = '';

        const monthsIt = [
            'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
            'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
        ];

        if (scope === 'month') {
            const parts = selectedValue.split('-');
            year = parts[0];
            const monthIdx = parseInt(parts[1], 10) - 1;
            monthName = monthsIt[monthIdx] || parts[1];

            filtered = reports.filter(r => r.date && r.date.startsWith(selectedValue));
            title = `Report Mensile: ${monthName} ${year}`;
            filename = `Report ${monthName} ${year}.pdf`;
        } else {
            year = selectedValue.split('-')[0];
            monthName = '';
            filtered = reports.filter(r => r.date && r.date.startsWith(year));
            title = `Report Annuale: ${year}`;
            filename = `Report Anno ${year}.pdf`;
        }

        // Chronological order
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));

        if (filtered.length === 0) {
            alert(`Nessun report trovato per il periodo: ${title}`);
            return null;
        }

        // --- PDF Generation ---
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // Title
        doc.setFontSize(18);
        doc.setTextColor(40);
        doc.text("Resoconto Interventi - Tecnosistem", 14, 22);

        doc.setFontSize(11);
        doc.setTextColor(100);
        doc.text(title, 14, 30);
        doc.text(`Generato il: ${new Date().toLocaleDateString('it-IT')}`, 14, 36);

        // Prepare Table Data & Calculate Hours Breakdown
        const parseNum = (v) => {
            if (v === undefined || v === null || v === '') return 0;
            const n = parseFloat(String(v).replace(',', '.'));
            return isNaN(n) ? 0 : n;
        };

        let totaleOrdinarie = 0;
        let totaleFerie = 0;
        let totaleOt25 = 0;
        let totaleOt50 = 0;
        let totaleAltreAssenze = 0;

        const tableBody = filtered.map(r => {
            const dateStr = r.date ? r.date.split('-').reverse().join('/') : '';
            const type = r.type ? r.type.toUpperCase() : '';
            let displayType = type;
            let displayLoc = r.location || '';
            const noteLower = (r.notes || '').toLowerCase();
            const locLower = (r.location || '').toLowerCase();
            const typeLower = (r.type || '').toLowerCase();
            const absenceVal = r.absence ? String(r.absence).trim().toLowerCase() : '';

            // Detect Ferie vs Other Absences
            const isFerie = (absenceVal === 'ferie' || 
                             typeLower === 'ferie' || 
                             locLower === 'ferie' || 
                             (!absenceVal && noteLower.includes('ferie')));

            const isOtherAbsence = !isFerie && (
                absenceVal === 'malattia' || absenceVal === 'permesso' ||
                typeLower === 'assenza' || r.absence === true || String(r.absence) === 'true' ||
                noteLower.includes('malattia') || noteLower.includes('permesso') || noteLower.includes('mutua')
            );

            const isAbsence = isFerie || isOtherAbsence;

            if (isAbsence) {
                if (isFerie) {
                    displayType = 'FERIE';
                    displayLoc = r.notes || r.location || 'Ferie';
                } else if (absenceVal) {
                    displayType = absenceVal.toUpperCase();
                    displayLoc = r.notes || r.location || `(${absenceVal})`;
                } else {
                    displayType = 'ASSENZA';
                    displayLoc = r.notes || r.location || '(Assenza)';
                }
            }

            const rawHours = parseNum(r.totalHours);
            let rHours = 0;
            let rOt25 = 0;
            let rOt50 = 0;
            let rOrdinarie = 0;
            let strText = '';

            if (isFerie) {
                rHours = rawHours > 0 ? rawHours : 8.0;
                totaleFerie += rHours;
            } else if (isOtherAbsence) {
                rHours = rawHours > 0 ? rawHours : 8.0;
                totaleAltreAssenze += rHours;
            } else {
                rHours = rawHours;

                // Check Weekend
                let isWeekend = false;
                if (r.date) {
                    const parts = r.date.split('-').map(Number);
                    if (parts.length === 3) {
                        const d = new Date(parts[0], parts[1] - 1, parts[2]);
                        const dow = d.getDay();
                        isWeekend = (dow === 0 || dow === 6);
                    }
                }

                // Overtime calculation
                const savedOt25 = parseNum(r.overtime25);
                const savedOt50 = parseNum(r.overtime50);

                if (savedOt25 > 0 || savedOt50 > 0) {
                    rOt25 = savedOt25;
                    rOt50 = savedOt50;
                } else if (rHours > 0) {
                    if (isWeekend) {
                        rOt50 = rHours;
                    } else if (rHours > 8) {
                        rOt25 = rHours - 8;
                    }
                }

                rOrdinarie = Math.max(0, rHours - rOt25 - rOt50);

                totaleOrdinarie += rOrdinarie;
                totaleOt25 += rOt25;
                totaleOt50 += rOt50;

                const partsStr = [];
                if (rOt25 > 0) partsStr.push(`${rOt25.toFixed(1)}h (25%)`);
                if (rOt50 > 0) partsStr.push(`${rOt50.toFixed(1)}h (50%)`);
                strText = partsStr.join(' ') || (r.overtime && r.overtime !== '0h' ? r.overtime : '');
            }

            const hoursDisplay = rHours > 0 ? rHours.toFixed(1) : (r.totalHours || '');
            const timeDisplay = (r.startTime && r.endTime) ? `${r.startTime}-${r.endTime}` : (isAbsence ? 'Giornata' : '');

            return [
                dateStr,
                displayType,
                displayLoc,
                timeDisplay,
                hoursDisplay,
                strText,
                r.notes || ''
            ];
        });

        doc.autoTable({
            head: [['Data', 'Tipo', 'Luogo/Motivo', 'Orario', 'Ore', 'Str.', 'Note']],
            body: tableBody,
            startY: 44,
            theme: 'grid',
            styles: { fontSize: 8, cellPadding: 2 },
            headStyles: { fillColor: [22, 163, 74] }, // Greenish header
            alternateRowStyles: { fillColor: [240, 240, 240] }
        });

        // Totals Calculations
        const totaleComplessivo = totaleOrdinarie + totaleFerie + totaleOt25 + totaleOt50 + totaleAltreAssenze;

        let finalY = doc.lastAutoTable.finalY + 8;
        const pageHeight = doc.internal.pageSize.getHeight();
        const boxHeight = totaleAltreAssenze > 0 ? 44 : 38;
        const requiredSpace = boxHeight + 8;

        if (finalY + requiredSpace > pageHeight - 15) {
            doc.addPage();
            finalY = 20;
        }

        // Totals Box Layout
        const boxX = 14;
        const boxY = finalY;
        const boxWidth = 115;

        // Background Box
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.3);
        doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, 'FD');

        // Header inside Box
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(22, 163, 74);
        const periodTitle = scope === 'month' ? 'Riepilogo Ore Mese' : 'Riepilogo Ore Anno';
        doc.text(periodTitle, boxX + 4, boxY + 6);

        // Overall Total Hours
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9.5);
        doc.setTextColor(15, 23, 42);
        doc.text("Totale Ore:", boxX + 4, boxY + 12.5);
        doc.text(`${totaleComplessivo.toFixed(1)} h`, boxX + 110, boxY + 12.5, { align: 'right' });

        // Divider Line
        doc.setDrawColor(226, 232, 240);
        doc.line(boxX + 4, boxY + 15, boxX + 111, boxY + 15);

        // Breakdown items
        doc.setFontSize(8.5);

        // 1. Ore Ordinarie
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        doc.text("• Ore Ordinarie:", boxX + 6, boxY + 20);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totaleOrdinarie.toFixed(1)} h`, boxX + 110, boxY + 20, { align: 'right' });

        // 2. Ore di Ferie
        doc.setFont('helvetica', 'normal');
        doc.text("• Ore di Ferie:", boxX + 6, boxY + 25);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totaleFerie.toFixed(1)} h`, boxX + 110, boxY + 25, { align: 'right' });

        // 3. Straordinari al 25%
        doc.setFont('helvetica', 'normal');
        doc.text("• Ore Straordinarie al 25%:", boxX + 6, boxY + 30);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totaleOt25.toFixed(1)} h`, boxX + 110, boxY + 30, { align: 'right' });

        // 4. Straordinari al 50%
        doc.setFont('helvetica', 'normal');
        doc.text("• Ore Straordinarie al 50%:", boxX + 6, boxY + 35);
        doc.setFont('helvetica', 'bold');
        doc.text(`${totaleOt50.toFixed(1)} h`, boxX + 110, boxY + 35, { align: 'right' });

        if (totaleAltreAssenze > 0) {
            doc.setFont('helvetica', 'normal');
            doc.text("• Altre Assenze (Malattia/Permessi):", boxX + 6, boxY + 40);
            doc.setFont('helvetica', 'bold');
            doc.text(`${totaleAltreAssenze.toFixed(1)} h`, boxX + 110, boxY + 40, { align: 'right' });
        }

        // Signature Area (Right side)
        const signX = 145;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Firma dipendente:", signX, boxY + 8);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        const _signUser = Auth.getCurrentUser(); doc.text(_signUser ? _signUser.name : "Fabio Sandrini", signX, boxY + 20);

        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.4);
        doc.line(signX, boxY + 23, signX + 48, boxY + 23);

        return { doc, filename, title, monthName, year, selectedValue };
    }

    // --- Export Logic (PDF) ---
    exportPDF(scope) {
        const result = this.generatePDFDoc(scope);
        if (!result) return;
        result.doc.save(result.filename);
    }

    // --- Send PDF via Native Email / Mail App (Apertura Immediata Diretta) ---
    async sendPDFViaEmail(scope = 'month') {
        const result = this.generatePDFDoc(scope);
        if (!result) return;

        const { doc, filename, monthName, year } = result;

        const emailTo = 'amministrazione@tecnosistem.com';
        const emailSubject = scope === 'month'
            ? `Report ${monthName} ${year}`
            : `Report Anno ${year}`;
        
        const currentUser = Auth.getCurrentUser();
        const senderName = currentUser ? currentUser.name : 'Sandrini Fabio';
        const emailBody = `ciao Simona ti inoltro il Report del mese di ${monthName} ${year}, buona giornata.

${senderName}`;

        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

        // Copia destinatario negli appunti per comodità immediata
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(emailTo);
            }
        } catch (e) {
            console.warn("Clipboard access:", e);
        }

        // Su iPhone/iOS Safari e dispositivi che supportano la condivisione diretta di file:
        // Apre direttamente il pannello nativo con l'app Mail e il PDF già allegato!
        if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            try {
                this.showToast(`Apertura Mail... (Destinatario copiato: ${emailTo})`, 'success');
                await navigator.share({
                    files: [pdfFile],
                    title: emailSubject,
                    text: `A: ${emailTo}
Oggetto: ${emailSubject}

${emailBody}`
                });
                return;
            } catch (err) {
                if (err.name === 'AbortError') return;
                console.warn("Share fallback:", err);
            }
        }

        // Fallback immediato con mailto per PC Desktop / browser senza file sharing:
        // Scarica subito il PDF e apre immediatamente il client mail con destinatario e oggetto già compilati!
        doc.save(filename);
        const mailtoUrl = `mailto:${emailTo}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
        window.location.href = mailtoUrl;
        this.showToast('Mail aperta con destinatario e oggetto! Il PDF è nei file.', 'success');
    }

    // --- History Page ---
    renderHistory() {
        const container = document.getElementById('history-list');
        // SORT REPORTS: Most recent first
        const reports = Store.getReports().sort((a, b) => new Date(b.date) - new Date(a.date));

        // Color/Badge Helper
        const getBadgeClass = (type, isAbsence) => {
            if (isAbsence || type === 'Assenza') return 'badge-assenza';
            if (type === 'Sede') return 'badge-sede';
            if (type === 'Trasferta') return 'badge-trasferta';
            if (type === 'Smart Working') return 'badge-smart';
            return 'badge'; // Default
        };

        if (reports.length === 0) {
            container.innerHTML = '<p class="text-center text-muted">Nessun report.</p>';
            return;
        }

        container.innerHTML = reports.map(r => {
            let dateDisplay = r.date;
            if (r.date && r.date.includes('-')) {
                const parts = r.date.split('-');
                if (parts.length === 3) {
                    dateDisplay = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            // Determine Status/Badge (Case Insensitive & Smart Detection)
            const typeNorm = (r.type || '').trim().toUpperCase();
            const noteLower = (r.notes || '').toLowerCase();

            // Treat as Absence if: 
            // 1. Explicitly marked as absence (boolean)
            // 2. Absence field contains a string (e.g., 'ferie', 'malattia')
            // 3. Type is 'Assenza'
            // 4. Notes contain keywords like 'ferie', 'malattia', 'permesso', 'mutua'
            let isAbsence = r.absence === true || String(r.absence) === 'true' || (r.absence && r.absence !== '') || typeNorm === 'ASSENZA';
            if (!isAbsence && (noteLower.includes('ferie') || noteLower.includes('malattia') || noteLower.includes('permesso') || noteLower.includes('mutua') || noteLower.includes('lutto') || noteLower.includes('infortunio'))) {
                isAbsence = true;
            }

            const getBadgeClass = (t, isAbs) => {
                if (isAbs) return 'badge-assenza';
                if (t === 'SEDE') return 'badge-sede';
                if (t.includes('TRASFERTA')) return 'badge-trasferta';
                if (t.includes('SMART')) return 'badge-smart';
                return 'badge';
            };

            const badgeClass = getBadgeClass(typeNorm, isAbsence);
            // If detected via notes or absence field, show specific label if possible
            let badgeLabel = typeNorm;
            if (isAbsence) {
                // Use the concrete absence type if available, otherwise fallback to "ASSENZA"
                badgeLabel = (r.absence && typeof r.absence === 'string' && r.absence !== 'true') ? r.absence.toUpperCase() : 'ASSENZA';
            }

            // Border Color Logic
            let borderColor = '#eab308'; // Default Yellow
            if (isAbsence) borderColor = '#ef4444'; // Red
            else if (typeNorm === 'SEDE') borderColor = '#3b82f6'; // Blue
            else if (typeNorm.includes('TRASFERTA')) borderColor = '#eab308'; // Yellow
            else if (typeNorm.includes('SMART')) borderColor = '#10b981'; // Green

            // Main Title Logic: If Absence, show the Note (Reason). If Work, show Location.
            const mainTitle = isAbsence ? (r.notes || 'Assenza Generica') : r.location;
            const mainTitleColor = isAbsence ? '#f87171' : 'inherit'; // Red title for absence

            return `
            <div class="card" style="border-left: 4px solid ${borderColor};">
                <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <strong class="text-gold" style="font-size:1.1rem;">${dateDisplay}</strong>
                         ${r.synced ? '<i class="ph ph-check-circle" style="color:#22c55e; font-size:0.8rem"></i>' : '<i class="ph ph-circle" style="color:#aaa; font-size:0.8rem"></i>'}
                    </div>
                    <span class="badge ${badgeClass}">${badgeLabel}</span>
                </div>
                
                <!-- Main Title: Location OR Absence Reason -->
                <div style="font-weight:600; font-size:1rem; margin-bottom:4px; color:${mainTitleColor}; text-transform: capitalize;">
                    ${isAbsence ? '<i class="ph ph-warning-circle"></i> ' : ''}${mainTitle}
                </div>

                ${isAbsence ?
                    /* Absence Layout: Simplified (Title is enough usually, maybe show hours if > 0) */
                    (r.totalHours && r.totalHours !== '0' && r.totalHours !== '0.0' ? `<div style="font-size:0.9rem; color:#aaa;">Ore segnate: <strong>${r.totalHours}</strong></div>` : '')
                    :
                    /* Regular Work Layout: Hours + Notes if any */
                    `<div style="font-size:0.9rem; color:#aaa;">
                        ${r.startTime} - ${r.endTime} &nbsp;|&nbsp; Tot: <strong>${r.totalHours}</strong>
                        ${r.overtime && r.overtime !== '0.0h' ? `<span style="color:#fbbf24; margin-left:5px;">(Str: ${r.overtime})</span>` : ''}
                     </div>
                     ${r.notes ? `<div style="font-size:0.85rem; color:#888; margin-top:5px; font-style:italic;">"${r.notes}"</div>` : ''}`
                }
                
                <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.05);">
                    <button class="btn btn-icon-only text-white" style="background:#3b82f6; width:auto; padding:6px 12px; color:white !important;" onclick="app.editReport('${r.id}')">
                        <i class="ph ph-pencil-simple" style="color:white !important;"></i> Modifica
                    </button>
                    <button class="btn btn-icon-only text-white" style="background:#ef4444; width:auto; padding:6px 12px; color:white !important;" onclick="app.deleteReport('${r.id}')">
                        <i class="ph ph-trash" style="color:white !important;"></i> Elimina
                    </button>
                </div>
            </div>
        `}).join('');
    }

    editReport(id) {
        const r = Store.getReports().find(x => x.id === id);
        if (r) {
            this.navigate('report', r);
        }
    }

    deleteReport(id) {
        if (confirm('Eliminare report definitivamente?')) {
            Store.deleteReport(id);
            this.renderHistory();
            API._post('deleteReport', { id });
        }
    }

    // --- Salary Page ---

    toggleSettings() {
        document.getElementById('settings-modal').classList.toggle('hidden');
    }

    saveSettings(e) {
        e.preventDefault();
        const fd = new FormData(e.target);
        const settings = Object.fromEntries(fd.entries());
        Object.keys(settings).forEach(k => {
            let val = parseFloat(settings[k]);
            settings[k] = isNaN(val) ? 0 : val;
        });

        const currentMonth = document.getElementById('salary-month').value || new Date().toISOString().slice(0, 7);
        Store.saveSettings(settings, currentMonth); // Save to specific month!

        // Sync settings to cloud (as requested "salvarli sul cloud")
        // We'll pass the month as context if the API supports it, or just the whole settings blob?
        // Current API.saveSettings likely expects the object. 
        // We should probably update API to handle month-specific settings, 
        // OR just save the "current view's" settings as general settings?
        // User said: "conviene salvarli sul cloud".
        // Let's modify the API.saveSettings to accept the whole blob or month. 
        // For now, I will assume we send the *current month's* settings as the active ones, 
        // or potentially a new endpoint. 
        // Given constraints, I'll send it as generic settings for now to ensure at least some backup.
        API._post('saveSettings', { month: currentMonth, ...settings });

        this.toggleSettings();
        this.renderSalary(currentMonth);
        this.showToast(`Impostazioni salvate per ${currentMonth}`);
    }

    // Helper to calculate stats for a given month
    calculateSalaryStats(monthStr) {
        const settings = Store.getSettings(monthStr);
        const reports = Store.getReports().filter(r => r.date.startsWith(monthStr));

        let daysWorked = { sede: 0, rientro: 0, notte: 0, estero: 0, totale: 0 };
        let totalHours = 0;
        let ot25 = 0;
        let ot50 = 0;

        reports.forEach(r => {
            const parseNum = (v) => {
                const n = parseFloat(String(v).replace(',', '.'));
                return isNaN(n) ? 0 : n;
            };

            const hrs = parseNum(r.totalHours);
            const o25 = parseNum(r.overtime25);
            const o50 = parseNum(r.overtime50);

            if (hrs > 0) daysWorked.totale++;
            totalHours += hrs;

            const type = (r.type || '').toLowerCase();
            if (type === 'sede') daysWorked.sede++;
            if (type === 'trasferta_rientro') daysWorked.rientro++;
            if (type === 'trasferta_notte') daysWorked.notte++;
            if (type === 'trasferta_estero') daysWorked.estero++;

            ot25 += o25;
            ot50 += o50;
        });

        // CALCULATION ENGINE
        const base = settings.baseSalary;
        const rate = settings.hourlyRate;

        const extra25 = ot25 * (rate * 1.25);
        const extra50 = ot50 * (rate * 1.50);

        const allowanceReturnTotal = daysWorked.rientro * settings.allowanceReturn;
        const allowanceOvernightTotal = daysWorked.notte * settings.allowanceOvernight;
        const allowanceForeignTotal = daysWorked.estero * settings.allowanceForeign;

        const allowance = allowanceReturnTotal + allowanceOvernightTotal + allowanceForeignTotal;

        const lordo = base + extra25 + extra50 + allowance;

        // NETTO ESTIMATION
        const inps = lordo * 0.0919;
        const taxable = lordo - inps;

        // IRPEF (Monthly Brackets Approx)
        let irpef = 0;
        if (taxable <= 2333) {
            irpef = taxable * 0.23;
        } else if (taxable <= 4166) {
            irpef = (2333 * 0.23) + ((taxable - 2333) * 0.35);
        } else {
            irpef = (2333 * 0.23) + ((4166 - 2333) * 0.35) + ((taxable - 4166) * 0.43);
        }

        // Deductions
        const deductions = Math.max(0, 150 - ((taxable - 2000) * 0.05));
        const addizionali = taxable * 0.02;
        const netto = taxable - irpef - addizionali + deductions;

        return {
            month: monthStr,
            daysWorked,
            ot25,
            ot50,
            base,
            extra25,
            extra50,
            allowance,
            allowanceReturnTotal,
            allowanceOvernightTotal,
            allowanceForeignTotal,
            lordo,
            netto,
            settings
        };
    }

    formatMoney(amount) {
        if (amount === undefined || amount === null || isNaN(amount)) return '0,00';
        return amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderSalary(monthStr) {
        try {
            // Default to current month if null/empty
            if (!monthStr) monthStr = new Date().toISOString().slice(0, 7);

            // Ensure Date Picker has the value
            const picker = document.getElementById('salary-month');
            if (picker && picker.value !== monthStr) {
                picker.value = monthStr;
            }

            if (this.showAnnual) {
                const year = monthStr.split('-')[0];
                this.renderAnnualSalary(year);
                return;
            }

            const container = document.getElementById('salary-stats');
            const stats = this.calculateSalaryStats(monthStr);

            container.innerHTML = `
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:20px;">
                    <div class="card text-center" style="margin:0; padding:10px;">
                        <div style="font-size:0.9rem; color:#aaa;">Giorni Lavorati</div>
                        <div style="font-size:1.2rem; font-weight:bold;">${stats.daysWorked.totale}</div>
                        <div style="font-size:0.7rem; color:#888;">${stats.daysWorked.sede} Sede / ${stats.daysWorked.rientro + stats.daysWorked.notte} Trasf.</div>
                    </div>
                    <div class="card text-center" style="margin:0; padding:10px;">
                        <div style="font-size:0.9rem; color:#aaa;">Straordinari</div>
                        <div style="font-size:1.1rem; font-weight:bold;">${stats.ot25.toFixed(1)}h <span style="font-size:0.8rem; font-weight:normal;">(25%)</span></div>
                        <div style="font-size:1.1rem; font-weight:bold;">${stats.ot50.toFixed(1)}h <span style="font-size:0.8rem; font-weight:normal; color:#f87171;">(50%)</span></div>
                    </div>
                </div>
                
                <div class="card mb-4">
                    <h4 style="border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:5px; margin-bottom:10px;">Dettaglio Lordo</h4>
                    <div class="data-row"><span>Base Mensile</span> <strong>€ ${this.formatMoney(stats.base)}</strong></div>
                    <div class="data-row"><span>Str. 25%</span> <strong>€ ${this.formatMoney(stats.extra25)}</strong></div>
                    <div class="data-row"><span>Str. 50%</span> <strong>€ ${this.formatMoney(stats.extra50)}</strong></div>
                    
                    ${stats.allowanceReturnTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Rientro</span> <span>€ ${this.formatMoney(stats.allowanceReturnTotal)}</span></div>` : ''}
                    ${stats.allowanceOvernightTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Pernott.</span> <span>€ ${this.formatMoney(stats.allowanceOvernightTotal)}</span></div>` : ''}
                    ${stats.allowanceForeignTotal > 0 ? `<div class="data-row"><span style="color:#aaa; padding-left:10px;">- Ind. Estero</span> <span>€ ${this.formatMoney(stats.allowanceForeignTotal)}</span></div>` : ''}
                    ${stats.allowance === 0 ? `<div class="data-row"><span>Indennità</span> <strong>€ 0,00</strong></div>` : ''}

                    <div class="data-row" style="border-top:1px solid rgba(255,255,255,0.1); margin-top:5px; padding-top:5px;">
                        <span>TOTALE LORDO</span> <strong class="text-white">€ ${this.formatMoney(stats.lordo)}</strong>
                    </div>
                </div>

                <div class="card" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%); border:1px solid var(--primary-dim);">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span>NETTO STIMATO <small style="display:block; font-size:0.7rem; color:#aaa; font-weight:normal;">(CCNL Met. + Coniuge)</small></span>
                        <strong class="text-gold" style="font-size:1.5rem;">€ ${this.formatMoney(stats.netto)}</strong>
                    </div>
                </div>
            `;

            // Populate settings form with stats.settings (which includes defaults if needed)
            const form = document.querySelector('#settings-modal form');
            document.querySelector('#settings-modal h3').innerHTML = `Impostazioni <span class="text-gold">${monthStr}</span>`;
            if (form && stats.settings) {
                Object.keys(stats.settings).forEach(k => {
                    if (form.elements[k]) form.elements[k].value = stats.settings[k];
                });
            }
        } catch (e) {
            console.error("Render Salary Error:", e);
            document.getElementById('salary-stats').innerHTML = `<p class="text-center" style="color:#ef4444;">Errore caricamento dati: ${e.message}</p>`;
        }
    }

    toggleAnnual() {
        this.showAnnual = !this.showAnnual;
        // Don't lose context of current month picker value
        const currentVal = document.getElementById('salary-month')?.value || new Date().toISOString().slice(0, 7);
        this.renderSalary(currentVal);
    }

    renderAnnualSalary(year) {
        const container = document.getElementById('salary-stats');

        let monthsData = [];
        let totalBase = 0;
        let totalLordo = 0;
        let totalNetto = 0;

        // Always iterate 1-12
        for (let i = 1; i <= 12; i++) {
            const m = `${year}-${String(i).padStart(2, '0')}`;
            const stats = this.calculateSalaryStats(m);

            // For annual totals, we only sum if the month actually has REPORTS (work done)
            // OR should we sum base salary regardless? 
            // "13ma è media stipendio base mensile di tutti i mesi" -> Implies we average the base of months available?
            // User says: "voglio comunque vedere tutti i mesi dell'anno e la tredicesima"
            // Let's sum stats.base for the 13th calc (assuming 12 months full year for now)
            // But only sum Lordo/Netto if work was done (stats.lordo > base?) 
            // Actually, if no work, Lordo is just Base? No, if no reports, stats.daysWorked.totale is 0. 
            // CCNL: usually you are paid base even if sick/holiday... but this app tracks REPORTS.
            // If no report, we assume 0 pay?? 
            // User context is "Work Reports". Likely no report = no pay (freelance style logic?) 
            // BUT defaults imply "Stipendio" (Salary). 
            // Let's assume: If 0 reports, we display 0 values but show the Base setting for reference.

            const hasActivity = stats.daysWorked.totale > 0;

            totalBase += stats.base; // Sum base for average (assuming full employment)
            if (hasActivity) {
                totalLordo += stats.lordo;
                totalNetto += stats.netto;
            }

            monthsData.push({ ...stats, hasActivity });
        }

        const tredicesimaLordo = totalBase / 12;
        // Estimate Net for 13th
        const avgTaxRate = totalLordo > 0 ? (1 - (totalNetto / totalLordo)) : 0.30;
        const tredicesimaNetto = tredicesimaLordo * (1 - avgTaxRate);

        const annualLordo = totalLordo + tredicesimaLordo;
        const annualNetto = totalNetto + tredicesimaNetto;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 class="text-gold" style="margin:0;">Riepilogo ${year}</h3>
                <button class="btn btn-sm" onclick="app.toggleAnnual()">
                    <i class="ph ph-arrow-left"></i> Torna al Mese
                </button>
            </div>

            <div class="card mb-4" style="background: linear-gradient(135deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%);">
                 <div class="data-row"><span>Totale Annuo Lordo (+13ma)</span> <strong>€ ${this.formatMoney(annualLordo)}</strong></div>
                 <div class="data-row"><span>Totale Annuo Netto (+13ma)</span> <strong class="text-gold">€ ${this.formatMoney(annualNetto)}</strong></div>
                 <div class="data-row" style="margin-top:10px; padding-top:10px; border-top:1px solid rgba(255,255,255,0.1); font-size:0.85rem; color:#aaa;">
                    <span>Di cui 13ma (Lordo / Netto)</span> <span>€ ${this.formatMoney(tredicesimaLordo)} / € ${this.formatMoney(tredicesimaNetto)}</span>
                 </div>
            </div>
            
            <div style="max-height:400px; overflow-y:auto; padding-right:5px;">
                ${monthsData.map(d => `
                    <div style="display:flex; justify-content:space-between; padding:12px 0; border-bottom:1px solid rgba(255,255,255,0.05); align-items:center;">
                        <span style="font-weight:bold; width:20%; color:${d.hasActivity ? 'white' : '#777'};">${d.month}</span>
                        <div style="text-align:right; width:80%;">
                            ${d.hasActivity ? `
                                <div style="font-size:0.9rem; display:flex; justify-content:space-between; margin-left:10%;">
                                    <span>Lord: € ${this.formatMoney(d.lordo)}</span>
                                    <span style="color:#fbbf24;">Net: € ${this.formatMoney(d.netto)}</span>
                                </div>
                            ` : `
                                <div style="font-size:0.8rem; color:#555; text-align:right;">(Base: € ${this.formatMoney(d.base)})</div>
                            `}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }


    // --- Assistente AI Tecnosistem ---
    toggleAIAssistant() {
        const existing = document.getElementById('ai-modal-overlay');
        if (existing) {
            this.closeAIAssistant();
            return;
        }

        const user = Auth.getCurrentUser();
        const userName = user ? user.name.split(' ')[0] : 'Fabio';

        const modalDiv = document.createElement('div');
        modalDiv.id = 'ai-modal-overlay';
        modalDiv.className = 'modal-overlay';
        modalDiv.onclick = () => this.closeAIAssistant();

        modalDiv.innerHTML = `
            <div class="modal-card fade-in ai-modal-card" onclick="event.stopPropagation()">
                <!-- Header Chat AI -->
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid rgba(255,255,255,0.1); padding-bottom:14px; margin-bottom:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="ai-icon-pulse" style="width:36px; height:36px; font-size:1.2rem;">
                            <i class="ph ph-sparkle"></i>
                        </div>
                        <div style="text-align:left;">
                            <h3 style="margin:0; font-size:1.15rem; color:var(--text); font-weight:700;">Assistente AI</h3>
                            <span style="font-size:0.75rem; color:var(--primary);">Tecnosistem Intelligence</span>
                        </div>
                    </div>
                    <button type="button" class="btn btn-icon-only" style="padding:4px 8px; font-size:1.1rem; background:rgba(255,255,255,0.1);" onclick="app.closeAIAssistant()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <!-- Chips Domande Rapide -->
                <div class="ai-chips-scroll" style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:10px;">
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('Come recupero i miei dati dal database?')">☁️ Recupero dati Cloud</button>
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('Come funziona l''accesso per altri utenti?')">👥 Altri Utenti & Login</button>
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('Riepilogo ore questo mese')">📊 Riepilogo ore</button>
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('A quanto ammonta il mio stipendio netto?')">💰 Stima stipendio</button>
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('Ci sono giorni lavorativi mancanti?')">⚠️ Giorni mancanti</button>
                    <button type="button" class="ai-chip" onclick="app.sendAIMessage('Tariffe indennità trasferte')">🚗 Diarie e tariffe</button>
                </div>

                <!-- Chat Messages Container -->
                <div id="ai-chat-messages" class="ai-chat-body" style="max-height:360px; min-height:220px; overflow-y:auto; display:flex; flex-direction:column; gap:10px; padding:6px 2px; margin-bottom:12px;">
                    <div class="ai-bubble ai-bubble-bot">
                        Ciao <strong>${userName}</strong>! 👋 Sono il tuo assistente virtuale per Orari TS.<br><br>
                        Posso analizzare le tue ore lavorate, calcolare gli straordinari e lo stipendio, verificare se mancano giorni o compilare un report con testo libero!<br><br>
                        <em>Tocca uno dei suggerimenti in alto o scrivi una domanda qui sotto:</em>
                    </div>
                </div>

                <!-- Form Invio Domanda -->
                <form onsubmit="app.handleAISubmit(event)" style="display:flex; gap:8px;">
                    <input type="text" id="ai-user-input" placeholder="Chiedi all'AI (es. Quante ore ho fatto?)" autocomplete="off" style="flex:1; padding:10px 14px; font-size:0.92rem; border-radius:10px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:white;">
                    <button type="submit" class="btn btn-primary btn-icon-only" style="width:46px; height:44px; padding:0; border-radius:10px; flex-shrink:0;">
                        <i class="ph ph-paper-plane-right" style="font-size:1.2rem;"></i>
                    </button>
                </form>

                <!-- Footer Opzionale Chiave API -->
                <div style="margin-top:10px; text-align:center;">
                    <details style="font-size:0.75rem; color:var(--text-muted); cursor:pointer;">
                        <summary>⚙️ Configurazione Chiave API (Opzionale Gemini)</summary>
                        <div style="margin-top:8px; display:flex; gap:6px;">
                            <input type="password" id="ai-api-key-input" placeholder="Incolla chiave Google Gemini API" value="${AI.getApiKey()}" style="font-size:0.75rem; padding:6px; flex:1; border-radius:6px; border:1px solid #444; background:#222; color:white;">
                            <button type="button" class="btn btn-sm" style="font-size:0.75rem; padding:6px 10px; background:rgba(255,255,255,0.15);" onclick="app.saveAIApiKey()">Salva</button>
                        </div>
                    </details>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);
        const input = document.getElementById('ai-user-input');
        if (input) input.focus();
    }

    closeAIAssistant() {
        const modal = document.getElementById('ai-modal-overlay');
        if (modal) modal.remove();
    }

    saveAIApiKey() {
        const input = document.getElementById('ai-api-key-input');
        if (input) {
            AI.setApiKey(input.value);
            this.showToast('Chiave API salvata!', 'success');
        }
    }

    handleAISubmit(event) {
        event.preventDefault();
        const input = document.getElementById('ai-user-input');
        if (!input) return;
        const text = input.value.trim();
        if (!text) return;
        input.value = '';
        this.sendAIMessage(text);
    }

    async sendAIMessage(text) {
        const chat = document.getElementById('ai-chat-messages');
        if (!chat) return;

        // Bubble utente
        const userDiv = document.createElement('div');
        userDiv.className = 'ai-bubble ai-bubble-user';
        userDiv.textContent = text;
        chat.appendChild(userDiv);

        // Indicatore di digitazione / thinking
        const botDiv = document.createElement('div');
        botDiv.className = 'ai-bubble ai-bubble-bot';
        botDiv.innerHTML = '<i class="ph ph-spinner ph-spin text-gold"></i> Elaborazione in corso...';
        chat.appendChild(botDiv);
        chat.scrollTop = chat.scrollHeight;

        try {
            const res = await AI.ask(text, Store, Auth);
            
            // Format risposta con markdown pulito e sicuro
            let rawText = res.text || '';
            let formatted = rawText
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/gs, '<strong>$1</strong>')
                .replace(/\*([^\*\n]+?)\*/g, '<em>$1</em>')
                .replace(/\n/g, '<br>');

            botDiv.innerHTML = formatted;

            // Se l'AI propone un'azione rapida
            if (res.action) {
                const actionBtn = document.createElement('button');
                actionBtn.className = 'btn btn-primary btn-sm';
                actionBtn.style.marginTop = '10px';
                actionBtn.style.display = 'inline-flex';
                actionBtn.style.width = 'auto';
                actionBtn.style.padding = '8px 14px';
                actionBtn.style.fontSize = '0.85rem';
                actionBtn.innerHTML = res.action.label;
                actionBtn.onclick = () => this.handleAIAction(res.action);
                botDiv.appendChild(document.createElement('br'));
                botDiv.appendChild(actionBtn);
            }

        } catch (err) {
            botDiv.innerHTML = `<span style="color:#ef4444;">Si è verificato un errore nell'elaborazione. Riprova.</span>`;
        }

        chat.scrollTop = chat.scrollHeight;
    }

    async handleAIAction(action) {
        if (action.type === 'navigate') {
            this.closeAIAssistant();
            this.navigate(action.view);
        } else if (action.type === 'save_report') {
            const report = {
                ...action.payload,
                id: Date.now().toString(),
                synced: false
            };
            Store.addReport(report);
            this.showToast('Report inserito con successo!', 'success');
            this.closeAIAssistant();
            this.navigate('history');
            this.sync();
        }
    }

    // --- Metodi Gestione Password & Utenti ---
    // --- Metodi Gestione Password con Codice OTP Temporaneo & WhatsApp ---

    showForgotPasswordModal() {
        const container = document.getElementById('user-modal-container') || document.body;
        document.getElementById('forgot-password-modal-overlay')?.remove();

        const modalDiv = document.createElement('div');
        modalDiv.id = 'forgot-password-modal-overlay';
        modalDiv.className = 'modal-overlay';
        modalDiv.onclick = () => modalDiv.remove();

        modalDiv.innerHTML = `
            <div class="modal-card fade-in" id="forgot-modal-content" onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <i class="ph ph-shield-warning text-gold" style="font-size:1.6rem;"></i>
                        <h3 style="margin:0; font-size:1.15rem; color:var(--text); font-weight:700;">Recupero Password Sicuro</h3>
                    </div>
                    <button type="button" class="btn btn-icon-only" style="padding:4px 8px; font-size:1.1rem; background:rgba(255,255,255,0.1);" onclick="document.getElementById('forgot-password-modal-overlay').remove()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>
                <p style="font-size:0.84rem; color:var(--text-muted); margin-bottom:16px; text-align:left;">
                    Inserisci la tua email o username registrato. Verrà generato un <strong>codice di sblocco temporaneo univoco</strong> (OTP valido 15 minuti) da confermare prima di impostare la nuova password.
                </p>
                <form onsubmit="app.handleRequestResetOtp(event)">
                    <div class="form-group" style="text-align:left;">
                        <label style="font-size:0.85rem; color:var(--text-muted);">Email o Username</label>
                        <input type="text" id="reset-req-identifier" required placeholder="es. mario.rossi oppure email" style="font-size:0.95rem; padding:10px;">
                    </div>
                    <div style="display:flex; gap:10px; margin-top:18px;">
                        <button type="button" class="btn" style="flex:1; background:rgba(255,255,255,0.1);" onclick="document.getElementById('forgot-password-modal-overlay').remove()">Annulla</button>
                        <button type="submit" class="btn btn-primary" style="flex:1.4;">
                            <i class="ph ph-paper-plane-right"></i> Richiedi Codice OTP
                        </button>
                    </div>
                </form>
            </div>
        `;
        container.appendChild(modalDiv);
    }

    async handleRequestResetOtp(e) {
        e.preventDefault();
        const identifier = document.getElementById('reset-req-identifier')?.value;
        if (!identifier) return;

        const res = await Auth.requestPasswordReset(identifier);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        const modalContent = document.getElementById('forgot-modal-content');
        if (!modalContent) return;

        const adminPhone = '3331234567'; // Cellulare aziendale Fabio Sandrini
        const waText = encodeURIComponent(`Ciao Fabio, sono ${res.user.name || res.user.username} (${res.user.email || ''}). Ho richiesto il codice di sblocco temporaneo per Orari TS. Il mio codice di verifica OTP generato è: ${res.code}`);
        const waLink = `https://api.whatsapp.com/send?text=${waText}`;

        modalContent.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                <div style="display:flex; align-items:center; gap:8px;">
                    <i class="ph ph-lock-key-open text-gold" style="font-size:1.6rem;"></i>
                    <h3 style="margin:0; font-size:1.15rem; color:var(--text); font-weight:700;">Verifica Codice di Sblocco</h3>
                </div>
                <button type="button" class="btn btn-icon-only" style="padding:4px 8px; font-size:1.1rem; background:rgba(255,255,255,0.1);" onclick="document.getElementById('forgot-password-modal-overlay').remove()">
                    <i class="ph ph-x"></i>
                </button>
            </div>

            <div style="background:rgba(34,197,94,0.12); border:1px solid rgba(34,197,94,0.3); border-radius:10px; padding:10px 12px; margin-bottom:14px; text-align:left;">
                <div style="font-weight:700; font-size:0.86rem; color:#22c55e; margin-bottom:3px;">
                    ✅ Codice temporaneo generato per ${res.user.name || res.user.username}!
                </div>
                <div style="font-size:0.78rem; color:var(--text-muted); line-height:1.4;">
                    Il codice a 6 cifre scade tra <strong>15 minuti</strong> ed è stato notificato all'amministratore (Fabio Sandrini).
                </div>
            </div>

            <!-- Pulsante WhatsApp Diretto per inviare richiesta / codice a Fabio -->
            <a href="${waLink}" target="_blank" class="btn" style="background:#22c55e; color:white; font-size:0.88rem; padding:10px; display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:14px; text-decoration:none; font-weight:600; border-radius:10px; box-shadow:0 2px 8px rgba(34,197,94,0.3);">
                <i class="ph ph-whatsapp-logo" style="font-size:1.25rem;"></i>
                <span>Comunica / Ricevi Sblocco su WhatsApp</span>
            </a>

            <form onsubmit="app.handleCompleteResetOtp(event, '${encodeURIComponent(identifier)}')">
                <div class="form-group" style="text-align:left; margin-bottom:10px;">
                    <label style="font-size:0.82rem; color:var(--text-muted);">Codice Temporaneo Ricevuto (OTP a 6 Cifre)</label>
                    <input type="text" id="reset-otp-input" required placeholder="es. ${res.code}" style="font-size:1.1rem; padding:10px; font-weight:700; letter-spacing:2px; text-align:center;">
                </div>
                <div class="form-group" style="text-align:left; margin-bottom:10px;">
                    <label style="font-size:0.82rem; color:var(--text-muted);">Nuova Password</label>
                    <input type="password" id="reset-new-pwd-1" required placeholder="Inserisci nuova password" style="font-size:0.95rem; padding:10px;">
                </div>
                <div class="form-group" style="text-align:left; margin-bottom:14px;">
                    <label style="font-size:0.82rem; color:var(--text-muted);">Conferma Nuova Password</label>
                    <input type="password" id="reset-new-pwd-2" required placeholder="Ripeti nuova password" style="font-size:0.95rem; padding:10px;">
                </div>
                <div style="display:flex; gap:10px;">
                    <button type="button" class="btn" style="flex:1; background:rgba(255,255,255,0.1);" onclick="document.getElementById('forgot-password-modal-overlay').remove()">Annulla</button>
                    <button type="submit" class="btn btn-primary" style="flex:1.4;">
                        <i class="ph ph-check-circle"></i> Salva Password
                    </button>
                </div>
            </form>
        `;
    }

    async handleCompleteResetOtp(e, encId) {
        e.preventDefault();
        const identifier = decodeURIComponent(encId);
        const otpCode = document.getElementById('reset-otp-input')?.value;
        const p1 = document.getElementById('reset-new-pwd-1')?.value;
        const p2 = document.getElementById('reset-new-pwd-2')?.value;

        if (!otpCode || otpCode.trim().length !== 6) {
            this.showToast('Inserisci il codice temporaneo OTP a 6 cifre.', 'error');
            return;
        }

        if (!p1 || p1.length < 3) {
            this.showToast('La nuova password deve contenere almeno 3 caratteri.', 'error');
            return;
        }

        if (p1 !== p2) {
            this.showToast('Le due password non coincidono!', 'error');
            return;
        }

        const res = await Auth.completePasswordReset(identifier, otpCode, p1);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        document.getElementById('forgot-password-modal-overlay')?.remove();
        this.showToast('Password reimpostata con successo! Ora puoi accedere.', 'success');

        const loginInput = document.getElementById('login-identifier');
        const pwdInput = document.getElementById('login-password');
        if (loginInput) loginInput.value = res.user.email || res.user.username;
        if (pwdInput) {
            pwdInput.value = p1;
            pwdInput.focus();
        }
    }

    // --- Metodi Accesso Google & Onboarding Parametri Stipendio ---

    handleGoogleLogin() {
        document.getElementById('google-login-modal-overlay')?.remove();
        const container = document.getElementById('user-modal-container') || document.body;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'google-login-modal-overlay';
        modalDiv.className = 'modal-overlay';
        modalDiv.onclick = () => modalDiv.remove();

        modalDiv.innerHTML = `
            <div class="modal-card fade-in" style="max-width:400px; text-align:left;" onclick="event.stopPropagation()">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <svg width="22" height="22" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                        </svg>
                        <h3 style="margin:0; font-size:1.15rem; color:var(--text); font-weight:700;">Accedi con Google</h3>
                    </div>
                    <button type="button" class="btn btn-icon-only" style="padding:4px 8px; font-size:1.1rem; background:rgba(255,255,255,0.1);" onclick="document.getElementById('google-login-modal-overlay').remove()">
                        <i class="ph ph-x"></i>
                    </button>
                </div>

                <p style="font-size:0.82rem; color:var(--text-muted); margin-bottom:14px;">
                    Seleziona il tuo account Google per accedere istantaneamente ad <strong>Orari TS</strong>:
                </p>

                <!-- Scheda 1-Click Fabio Sandrini -->
                <button type="button" class="google-account-pill" onclick="app.submitGoogleLogin('bubibs@gmail.com', 'Fabio Sandrini')">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="google-avatar-circle">FS</div>
                        <div>
                            <div style="font-weight:700; font-size:0.9rem; color:var(--text);">Fabio Sandrini</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">bubibs@gmail.com (Amministratore)</div>
                        </div>
                    </div>
                    <i class="ph ph-caret-right text-gold"></i>
                </button>

                <div class="auth-divider" style="margin:14px 0 10px 0;">oppure inserisci account Google</div>

                <form onsubmit="app.handleCustomGoogleLogin(event)">
                    <div class="form-group" style="margin-bottom:12px;">
                        <label style="font-size:0.8rem; color:var(--text-muted);">Email Google (Gmail o Workspace)</label>
                        <input type="email" id="custom-google-email" required placeholder="mario.rossi@gmail.com" style="font-size:0.95rem; padding:10px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width:100%; padding:11px; font-size:0.92rem;">
                        <i class="ph ph-sign-in"></i> Accedi con questo Account
                    </button>
                </form>
            </div>
        `;
        container.appendChild(modalDiv);
    }

    async submitGoogleLogin(email, name = '') {
        document.getElementById('google-login-modal-overlay')?.remove();
        this.showToast('Accesso Google in corso...', 'info');

        const res = await Auth.loginWithGoogle({ email, name });
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        Store.init();
        this.updateAuthUI(res.user);
        this.navigate('home');
        this.showToast(`Accesso con Google completato! Ciao ${res.user.name || res.user.username}.`, 'success');
        this.sync();

        if (res.isNew) {
            this.showSalaryOnboardingModal(res.user);
        }
    }

    handleCustomGoogleLogin(e) {
        e.preventDefault();
        const email = document.getElementById('custom-google-email')?.value;
        if (!email) return;
        this.submitGoogleLogin(email);
    }

    // Configurazione guidata parametri stipendio per nuovi utenti (default 0)
    showSalaryOnboardingModal(user) {
        if (!user || user.isPrimary) return;

        document.getElementById('salary-onboarding-modal-overlay')?.remove();
        const container = document.getElementById('user-modal-container') || document.body;
        const modalDiv = document.createElement('div');
        modalDiv.id = 'salary-onboarding-modal-overlay';
        modalDiv.className = 'modal-overlay';

        modalDiv.innerHTML = `
            <div class="modal-card fade-in" style="max-width:440px;" onclick="event.stopPropagation()">
                <div style="text-align:center; margin-bottom:14px;">
                    <div style="font-size:2.2rem; color:var(--primary); margin-bottom:6px;">
                        <i class="ph ph-currency-eur"></i>
                    </div>
                    <h3 style="margin:0; font-size:1.2rem; color:var(--text); font-weight:700;">Configurazione Stipendio</h3>
                    <p style="font-size:0.82rem; color:var(--text-muted); margin-top:4px;">
                        Benvenuto <strong>${user.name || user.username}</strong>! I tuoi parametri di calcolo sono attualmente impostati a <strong>0.00 €</strong>. Puoi configurarli ora o modificarli in seguito dalla sezione Stipendio.
                    </p>
                </div>

                <form onsubmit="app.handleSaveOnboardingSalary(event)">
                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; text-align:left;">
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Paga Base Mensile (€)</label>
                            <input type="number" id="onb-base-salary" step="0.01" placeholder="0.00" value="0.00" style="font-size:0.9rem; padding:8px;">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Paga Oraria Base (€/h)</label>
                            <input type="number" id="onb-hourly-rate" step="0.01" placeholder="0.00" value="0.00" style="font-size:0.9rem; padding:8px;">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Diaria Rientro (€)</label>
                            <input type="number" id="onb-allowance-return" step="0.01" placeholder="0.00" value="0.00" style="font-size:0.9rem; padding:8px;">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Diaria Notte (€)</label>
                            <input type="number" id="onb-allowance-overnight" step="0.01" placeholder="0.00" value="0.00" style="font-size:0.9rem; padding:8px;">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Diaria Estero (€)</label>
                            <input type="number" id="onb-allowance-foreign" step="0.01" placeholder="0.00" value="0.00" style="font-size:0.9rem; padding:8px;">
                        </div>
                        <div class="form-group" style="margin-bottom:10px;">
                            <label style="font-size:0.78rem; color:var(--text-muted);">Aliquota Tasse (%)</label>
                            <input type="number" id="onb-tax-rate" step="0.1" placeholder="0" value="0" style="font-size:0.9rem; padding:8px;">
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:8px; margin-top:16px;">
                        <button type="submit" class="btn btn-primary" style="padding:11px; font-size:0.95rem;">
                            <i class="ph ph-check-circle"></i> Salva Parametri Personali
                        </button>
                        <button type="button" class="btn" style="background:rgba(255,255,255,0.08); font-size:0.85rem; padding:9px;" onclick="document.getElementById('salary-onboarding-modal-overlay').remove()">
                            Salta per ora (lascia a 0.00 €)
                        </button>
                    </div>
                </form>
            </div>
        `;
        container.appendChild(modalDiv);
    }

    handleSaveOnboardingSalary(e) {
        e.preventDefault();
        const baseSalary = parseFloat(document.getElementById('onb-base-salary')?.value) || 0;
        const hourlyRate = parseFloat(document.getElementById('onb-hourly-rate')?.value) || 0;
        const allowanceReturn = parseFloat(document.getElementById('onb-allowance-return')?.value) || 0;
        const allowanceOvernight = parseFloat(document.getElementById('onb-allowance-overnight')?.value) || 0;
        const allowanceForeign = parseFloat(document.getElementById('onb-allowance-foreign')?.value) || 0;
        const taxRate = parseFloat(document.getElementById('onb-tax-rate')?.value) || 0;

        const newSettings = {
            baseSalary,
            hourlyRate,
            allowanceReturn,
            allowanceOvernight,
            allowanceForeign,
            taxRate
        };

        Store.saveSettings(newSettings, 'default');
        const currentMonth = new Date().toISOString().slice(0, 7);
        Store.saveSettings(newSettings, currentMonth);

        document.getElementById('salary-onboarding-modal-overlay')?.remove();
        this.showToast('Parametri stipendio configurati con successo!', 'success');
        this.sync();
    }

    async confirmDeleteUser(userId, userName) {
        if (!confirm(`Sei sicuro di voler eliminare definitivamente l'utente "${userName}"?\n\nNon potrà più accedere con questo account.`)) {
            return;
        }

        const res = await Auth.deleteUser(userId);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        this.showToast(`Utente "${userName}" eliminato con successo.`, 'success');
        this.closeUserMenu();
        this.toggleUserMenu();
    }

    async adminResetUserPassword(userId, userName) {
        const newPwd = prompt(`Inserisci la nuova password per "${userName}":`, "Brescia1-");
        if (!newPwd) return;

        const users = Auth.getUsers();
        const target = users.find(u => u.id === userId);
        if (!target) return;

        const res = await Auth.resetPassword(target.email || target.username, newPwd);
        if (!res.success) {
            this.showToast(res.error, 'error');
            return;
        }

        this.showToast(`Password di "${userName}" aggiornata con successo!`, 'success');
    }

}



    // Esportazioni globali per console e interazioni
    window.Auth = Auth;
    window.API = API;
    window.Store = Store;
    window.AI = AI;
    window.app = new App();

})();
