// --- Autenticazione e Gestione Utenti (Multi-Utente, Cloud Sync & Face ID) ---

export const Auth = {
    KEYS: {
        USERS: 'tecnosistem_users',
        CURRENT_USER: 'tecnosistem_current_user',
        FACEID_PREFIX: 'tecnosistem_faceid_'
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
        var compositeHash = hash.slice();
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

    // Inizializza archivio utenti e utente primario predefinito (Fabio Sandrini)
    async init() {
        let users = this.getUsers();
        if (users.length === 0) {
            // Configurazione dell'utente principale (Fabio Sandrini)
            // Password predefinita: '1234' (modificabile in qualsiasi momento)
            const defaultPasswordHash = await this.hashPassword('1234');
            const primaryUser = {
                id: 'fabio_sandrini',
                name: 'Fabio Sandrini',
                username: 'fabio',
                email: 'amministrazione@tecnosistem.com',
                passwordHash: defaultPasswordHash,
                isPrimary: true,
                cloudUrl: '',
                hasFaceId: false,
                createdAt: new Date().toISOString()
            };
            users = [primaryUser];
            localStorage.setItem(this.KEYS.USERS, JSON.stringify(users));
        }

        // Se nessun utente è attualmente loggato ma c'è già una sessione memorizzata valida
        const current = this.getCurrentUser();
        if (current) {
            // Aggiorna i dati con l'ultimo record salvato
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
            const uid = String(cu.id || ('user_' + uname));
            const existing = map.get(uid) || Array.from(map.values()).find(u => (u.username || '').toLowerCase() === uname);
            
            if (!existing) {
                map.set(uid, {
                    id: uid,
                    name: cu.name || uname || 'Utente',
                    username: uname,
                    email: cu.email || (uname ? `${uname}@tecnosistem.com` : ''),
                    passwordHash: cu.passwordhash || cu.passwordHash || '',
                    isPrimary: cu.isprimary === true || cu.isprimary === 'true' || cu.isPrimary === true,
                    cloudUrl: cu.cloudurl || cu.cloudUrl || '',
                    hasFaceId: cu.hasfaceid === true || cu.hasfaceid === 'true' || cu.hasFaceId === true,
                    createdAt: cu.createdat || cu.createdAt || new Date().toISOString()
                });
            } else {
                // Aggiorna se mancavano campi
                if (cu.passwordhash && !existing.passwordHash) existing.passwordHash = cu.passwordhash;
                if (cu.name && existing.name === existing.username) existing.name = cu.name;
                if (cu.cloudurl && !existing.cloudUrl) existing.cloudUrl = cu.cloudurl;
            }
        });

        this.saveUsers(Array.from(map.values()));
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
            // Non memorizzare l'hash della password nella sessione attiva
            const sessionUser = {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                isPrimary: !!user.isPrimary,
                cloudUrl: user.cloudUrl || '',
                hasFaceId: !!user.hasFaceId
            };
            localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(sessionUser));
        } else {
            localStorage.removeItem(this.KEYS.CURRENT_USER);
        }
        window.dispatchEvent(new CustomEvent('auth-state-changed', { detail: { user } }));
    },

    // Login classico con Username/Email e Password (con verifica locale e fallback Cloud)
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
            (u.email && u.email.toLowerCase() === idClean)
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

        // Se è l'utente primario (Fabio) e non era ancora registrato
        if (!user && (idClean === 'fabio' || idClean === 'amministrazione@tecnosistem.com')) {
            await this.init();
            users = this.getUsers();
            user = users.find(u => u.username === 'fabio' || u.id === 'fabio_sandrini');
        }

        if (!user) {
            return { success: false, error: 'Utente non trovato. Controlla i dati o registrati come nuovo utente.' };
        }

        const inputHash = await this.hashPassword(password);
        if (user.passwordHash && user.passwordHash !== inputHash) {
            return { success: false, error: 'Password errata. Riprova.' };
        }

        this.setCurrentUser(user);
        return { success: true, user };
    },

    // Registrazione nuovo utente (colleghi/altri utenti)
    async register({ name, username, email, password }) {
        const cleanName = (name || '').trim();
        const cleanUsername = (username || '').trim().toLowerCase().replace(/\s+/g, '');
        const cleanEmail = (email || '').trim().toLowerCase();

        if (!cleanName) return { success: false, error: 'Inserisci nome e cognome.' };
        if (!cleanUsername) return { success: false, error: 'Scegli uno username.' };
        if (!password || password.length < 3) return { success: false, error: 'La password deve avere almeno 3 caratteri.' };

        const users = this.getUsers();
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
            passwordHash: passwordHash,
            isPrimary: false,
            cloudUrl: '',
            hasFaceId: false,
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

        // Sincronizza password aggiornata sul cloud
        if (window.API && typeof window.API.saveUser === 'function') {
            try { window.API.saveUser(user); } catch (e) {}
        }

        return { success: true };
    },

    // Aggiorna impostazioni utente (es. Cloud URL personale)
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

        this.saveUsers(users);
        this.setCurrentUser(user);

        // Sincronizza profilo aggiornato sul cloud
        if (window.API && typeof window.API.saveUser === 'function') {
            try { window.API.saveUser(user); } catch (e) {}
        }

        return true;
    },

    // --- Face ID / Biometria (WebAuthn Platform Authenticator) ---

    // Verifica supporto Face ID / Touch ID / Windows Hello nel browser
    async isFaceIdAvailable() {
        try {
            if (!window.PublicKeyCredential) return false;
            if (typeof PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable !== 'function') return false;
            return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        } catch (e) {
            console.warn('Verifica Face ID non supportata:', e);
            return false;
        }
    },

    // Helpers per conversione buffer <-> Base64
    _bufferToBase64(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    _base64ToBuffer(base64) {
        const binary = window.atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // Registra / Abilita Face ID per l'utente attualmente loggato
    async registerFaceId() {
        const current = this.getCurrentUser();
        if (!current) {
            return { success: false, error: 'Accedi prima per abilitare Face ID.' };
        }

        // Verifica disponibilità WebAuthn
        const available = await this.isFaceIdAvailable();
        if (!available && !window.isSecureContext) {
            return { 
                success: false, 
                error: 'Face ID richiede un ambiente sicuro (HTTPS o Localhost/PWA installata).' 
            };
        }

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const userIdBytes = new TextEncoder().encode(current.id);

            const creationOptions = {
                publicKey: {
                    challenge: challenge,
                    rp: {
                        name: 'Tecnosistem Orari'
                    },
                    user: {
                        id: userIdBytes,
                        name: current.username || current.email,
                        displayName: current.name || 'Utente Tecnosistem'
                    },
                    pubKeyCredParams: [
                        { alg: -7, type: 'public-key' },  // ES256
                        { alg: -257, type: 'public-key' } // RS256
                    ],
                    authenticatorSelection: {
                        authenticatorAttachment: 'platform',
                        userVerification: 'required',
                        requireResidentKey: false
                    },
                    timeout: 60000,
                    attestation: 'none'
                }
            };

            const credential = await navigator.credentials.create(creationOptions);
            if (!credential) {
                return { success: false, error: 'Registrazione biometrica annullata.' };
            }

            const credIdBase64 = this._bufferToBase64(credential.rawId);

            localStorage.setItem(this.KEYS.FACEID_PREFIX + current.id, credIdBase64);
            localStorage.setItem(this.KEYS.FACEID_PREFIX + 'last_user', current.id);

            const users = this.getUsers();
            const user = users.find(u => u.id === current.id);
            if (user) {
                user.hasFaceId = true;
                this.saveUsers(users);
                this.setCurrentUser(user);
                if (window.API && typeof window.API.saveUser === 'function') {
                    try { window.API.saveUser(user); } catch (e) {}
                }
            }

            return { success: true };
        } catch (err) {
            console.error('Errore WebAuthn registerFaceId:', err);
            if (err.name === 'NotAllowedError') {
                return { success: false, error: 'Autorizzazione Face ID rifiutata o annullata.' };
            }
            return { success: false, error: 'Errore Face ID: ' + (err.message || err.name) };
        }
    },

    // Accedi tramite Face ID
    async loginWithFaceId() {
        const lastUserId = localStorage.getItem(this.KEYS.FACEID_PREFIX + 'last_user');
        const users = this.getUsers();
        
        let targetUser = null;
        if (lastUserId) {
            targetUser = users.find(u => u.id === lastUserId);
        }
        if (!targetUser) {
            targetUser = users.find(u => u.hasFaceId) || users.find(u => u.isPrimary);
        }

        if (!targetUser) {
            return { 
                success: false, 
                error: 'Nessun utente configurato con Face ID. Effettua prima l\'accesso con password e abilita Face ID.' 
            };
        }

        const credIdBase64 = localStorage.getItem(this.KEYS.FACEID_PREFIX + targetUser.id);
        if (!credIdBase64) {
            return { 
                success: false, 
                error: `Face ID non ancora registrato per ${targetUser.name}. Accedi con password e tocca "Abilita Face ID".` 
            };
        }

        try {
            const challenge = new Uint8Array(32);
            crypto.getRandomValues(challenge);

            const credBuffer = this._base64ToBuffer(credIdBase64);

            const requestOptions = {
                publicKey: {
                    challenge: challenge,
                    allowCredentials: [{
                        id: credBuffer,
                        type: 'public-key'
                    }],
                    userVerification: 'required',
                    timeout: 60000
                }
            };

            const assertion = await navigator.credentials.get(requestOptions);
            if (!assertion) {
                return { success: false, error: 'Verifica Face ID non completata.' };
            }

            this.setCurrentUser(targetUser);
            localStorage.setItem(this.KEYS.FACEID_PREFIX + 'last_user', targetUser.id);
            return { success: true, user: targetUser };
        } catch (err) {
            console.error('Errore WebAuthn loginWithFaceId:', err);
            if (err.name === 'NotAllowedError') {
                return { success: false, error: 'Face ID annullato o non riconosciuto.' };
            }
            return { success: false, error: 'Errore verifica Face ID: ' + (err.message || err.name) };
        }
    },

    // Rimuove Face ID per l'utente corrente
    disableFaceId() {
        const current = this.getCurrentUser();
        if (!current) return;

        localStorage.removeItem(this.KEYS.FACEID_PREFIX + current.id);
        const users = this.getUsers();
        const user = users.find(u => u.id === current.id);
        if (user) {
            user.hasFaceId = false;
            this.saveUsers(users);
            this.setCurrentUser(user);
        }
    }
};
