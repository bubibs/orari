// --- Autenticazione e Gestione Utenti (Multi-Utente & Face ID) ---

export const Auth = {
    KEYS: {
        USERS: 'tecnosistem_users',
        CURRENT_USER: 'tecnosistem_current_user',
        FACEID_PREFIX: 'tecnosistem_faceid_'
    },

    // Helper per hashing password tramite Web Crypto API (SHA-256)
    async hashPassword(password) {
        if (!password) return '';
        const msgUint8 = new TextEncoder().encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
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

    // Login classico con Username/Email e Password
    async login(identifier, password) {
        const idClean = (identifier || '').trim().toLowerCase();
        if (!idClean) {
            return { success: false, error: 'Inserisci username o email.' };
        }
        if (!password) {
            return { success: false, error: 'Inserisci la password.' };
        }

        const users = this.getUsers();
        const user = users.find(u => 
            (u.username && u.username.toLowerCase() === idClean) ||
            (u.email && u.email.toLowerCase() === idClean)
        );

        if (!user) {
            return { success: false, error: 'Utente non trovato. Controlla i dati o registrati.' };
        }

        const inputHash = await this.hashPassword(password);
        if (user.passwordHash !== inputHash) {
            return { success: false, error: 'Password errata.' };
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
            // Su file:// o HTTP non sicuro
            return { 
                success: false, 
                error: 'Face ID richiede un ambiente sicuro (HTTPS o Localhost/PWA installata).' 
            };
        }

        try {
            // Crea challenge crittografico
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
                        authenticatorAttachment: 'platform', // Forza sensore biometrico locale (Face ID / Touch ID / Hello)
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

            // Salva credenziale Face ID associata all'utente
            localStorage.setItem(this.KEYS.FACEID_PREFIX + current.id, credIdBase64);
            localStorage.setItem(this.KEYS.FACEID_PREFIX + 'last_user', current.id);

            // Aggiorna stato utente
            const users = this.getUsers();
            const user = users.find(u => u.id === current.id);
            if (user) {
                user.hasFaceId = true;
                this.saveUsers(users);
                this.setCurrentUser(user);
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
        // Cerca l'ultimo utente che ha registrato Face ID su questo dispositivo
        const lastUserId = localStorage.getItem(this.KEYS.FACEID_PREFIX + 'last_user');
        const users = this.getUsers();
        
        // Se non troviamo l'ultimo, cerchiamo un utente con hasFaceId o l'utente primario
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

            // Face ID verificato con successo!
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
