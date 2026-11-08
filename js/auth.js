// --- Autenticazione e Gestione Utenti (Multi-Utente, Cloud Sync, Admin & OTP Reset) ---

export const Auth = {
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
