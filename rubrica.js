// Rubrica page functionality
let editingContactId = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Check if editing
    const urlParams = new URLSearchParams(window.location.search);
    editingContactId = urlParams.get('id');
    
    // Check cloud status
    await checkCloudStatus();
    
    // Load contacts
    await loadContacts();
    
    // Load contact if editing
    if (editingContactId) {
        await loadContact(editingContactId);
    }
    
    // Form submission
    document.getElementById('contactForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveContact();
    });
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

async function loadContacts() {
    const contactsList = document.getElementById('contactsList');
    
    try {
        const result = await API.getContacts();
        const contacts = result.data || [];
        
        if (contacts.length === 0) {
            contactsList.innerHTML = '<p style="color: #666;">Nessun contatto salvato</p>';
            return;
        }
        
        contactsList.innerHTML = contacts.map(contact => {
            const indirizzoCompleto = [contact.citta, contact.via].filter(Boolean).join(', ');
            const indirizzoMaps = [contact.citta, contact.via].filter(Boolean).join(' ');
            
            return `
            <div class="contact-item">
                <div class="contact-name">${contact.azienda || 'Senza nome'}</div>
                <div class="contact-details">
                    ${contact.referente ? `<strong>Ref.:</strong> ${contact.referente}<br>` : ''}
                    ${indirizzoCompleto ? `<strong>Indirizzo:</strong> ${indirizzoCompleto}<br>` : ''}
                    ${contact.telefono ? `<strong>Tel.:</strong> <a href="tel:${contact.telefono}">${contact.telefono}</a>` : ''}
                </div>
                <div class="contact-actions">
                    ${contact.telefono ? `<a href="tel:${contact.telefono}" class="btn-icon btn-call" title="Chiama">📞</a>` : ''}
                    ${indirizzoMaps ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(indirizzoMaps)}" class="btn-icon btn-map" title="Mappa" target="_blank">🗺️</a>` : ''}
                    <button onclick="editContact('${contact.id}')" class="btn-icon btn-edit" title="Modifica">✏️</button>
                    <button onclick="deleteContact('${contact.id}')" class="btn-icon btn-delete" title="Elimina">🗑️</button>
                </div>
            </div>
        `;
        }).join('');
        
    } catch (error) {
        contactsList.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei contatti</p>';
    }
}

async function loadContact(id) {
    try {
        const result = await API.getContacts();
        const contact = result.data.find(c => c.id === id);
        
        if (contact) {
            document.getElementById('azienda').value = contact.azienda || '';
            document.getElementById('citta').value = contact.citta || '';
            document.getElementById('via').value = contact.via || '';
            document.getElementById('referente').value = contact.referente || '';
            document.getElementById('telefono').value = contact.telefono || '';
            
            // Change button text
            document.getElementById('saveContactButton').textContent = 'Aggiorna Contatto';
        }
    } catch (error) {
        showNotification('Errore nel caricamento del contatto', 'error');
    }
}

async function saveContact() {
    const saveButton = document.getElementById('saveContactButton');
    const form = document.getElementById('contactForm');
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    // Prevent double click
    if (saveButton.disabled) {
        return;
    }
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    // Disable button and show loading state
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
    // Update cloud icon to show syncing
    if (statusIcon) {
        statusIcon.textContent = '☁️';
        statusIcon.style.filter = 'grayscale(0%) brightness(0.9)';
        statusIcon.style.animation = 'cloudPulse 1s ease-in-out infinite';
    }
    if (statusText) {
        statusText.textContent = 'Sincronizzazione...';
    }
    
    const contactData = {
        azienda: document.getElementById('azienda').value,
        citta: document.getElementById('citta').value,
        via: document.getElementById('via').value,
        referente: document.getElementById('referente').value,
        telefono: document.getElementById('telefono').value
    };
    
    if (editingContactId) {
        contactData.id = editingContactId;
    }
    
    try {
        let result;
        if (editingContactId) {
            result = await API.updateContact(editingContactId, contactData);
        } else {
            result = await API.saveContact(contactData);
        }
        
        if (!result || !result.success) {
            throw new Error(result?.error || 'Errore nel salvataggio');
        }
        
        // Success: Green checkmark
        if (statusIcon) {
            statusIcon.textContent = '✅';
            statusIcon.style.filter = 'none';
            statusIcon.style.animation = 'checkPulse 2s ease-in-out infinite';
        }
        if (statusText) {
            statusText.textContent = 'Sincronizzato';
        }
        
        showNotification('Contatto salvato con successo!', 'success');
        
        // Reset form
        form.reset();
        editingContactId = null;
        saveButton.textContent = 'Salva Contatto';
        
        // Reload contacts
        await loadContacts();
        
        // Reset icon after 3 seconds
        setTimeout(() => {
            checkCloudStatus();
        }, 3000);
        
    } catch (error) {
        console.error('Save error:', error);
        
        // Error: Red X
        if (statusIcon) {
            statusIcon.textContent = '❌';
            statusIcon.style.filter = 'none';
            statusIcon.style.animation = 'none';
        }
        if (statusText) {
            statusText.textContent = 'Errore sincronizzazione';
        }
        
        let errorMessage = 'Errore nel salvataggio';
        if (error.message) {
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                errorMessage = 'Errore di connessione. Verifica la tua connessione internet e che il server sia raggiungibile.';
            } else if (error.message.includes('CORS')) {
                errorMessage = 'Errore CORS. Verifica che il Google Apps Script sia pubblicato correttamente con accesso "Tutti".';
            } else {
                errorMessage = 'Errore: ' + error.message;
            }
        }
        
        showNotification(errorMessage, 'error');
        
        // Reset icon after 5 seconds
        setTimeout(() => {
            checkCloudStatus();
        }, 5000);
        
    } finally {
        saveButton.disabled = false;
        saveButton.classList.remove('loading');
    }
}

async function editContact(id) {
    editingContactId = id;
    await loadContact(id);
    document.getElementById('contactForm').scrollIntoView({ behavior: 'smooth' });
}

async function deleteContact(id) {
    if (!confirm('Sei sicuro di voler eliminare questo contatto?')) {
        return;
    }
    
    try {
        const result = await API.deleteContact(id);
        if (result.success) {
            showNotification('Contatto eliminato', 'success');
            await loadContacts();
        } else {
            showNotification('Errore nell\'eliminazione: ' + (result.error || 'Errore sconosciuto'), 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Errore nell\'eliminazione. Riprova.', 'error');
    }
}

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        const result = await API.checkSync();
        if (result.synced) {
            statusIcon.textContent = '✅';
            statusIcon.classList.add('synced');
            statusText.textContent = 'Sincronizzato';
            statusIcon.style.filter = 'none';
        } else {
            statusIcon.textContent = '☁️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
            statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
        }
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
        statusIcon.style.filter = 'none';
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Make functions global for onclick handlers
window.editContact = editContact;
window.deleteContact = deleteContact;

