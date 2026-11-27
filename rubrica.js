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
        if (!result || !result.success || !result.data) {
            showNotification('Errore nel caricamento dei contatti', 'error');
            return;
        }
        
        const contact = result.data.find(c => String(c.id) === String(id));
        
        if (contact) {
            document.getElementById('azienda').value = contact.azienda || '';
            document.getElementById('citta').value = contact.citta || '';
            document.getElementById('via').value = contact.via || '';
            document.getElementById('referente').value = contact.referente || '';
            document.getElementById('telefono').value = contact.telefono || '';
            
            // Change button text
            document.getElementById('saveContactButton').textContent = 'Aggiorna Contatto';
        } else {
            showNotification('Contatto non trovato', 'error');
        }
    } catch (error) {
        console.error('Error loading contact:', error);
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
    
    // Update status icon
    if (statusIcon) {
        statusIcon.textContent = '💾';
        statusIcon.style.animation = 'cloudPulse 1s ease-in-out infinite';
    }
    if (statusText) {
        statusText.textContent = 'Salvataggio...';
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
        
        // Success
        if (statusIcon) {
            statusIcon.textContent = '💾';
            statusIcon.style.animation = 'none';
        }
        if (statusText) {
            statusText.textContent = 'Salvato';
        }
        
        showNotification('Contatto salvato con successo!', 'success');
        
        // Reset form
        form.reset();
        editingContactId = null;
        saveButton.textContent = 'Salva Contatto';
        
        // Reload contacts
        await loadContacts();
        
        // Reset icon after 2 seconds
        setTimeout(() => {
            if (statusIcon) {
                statusIcon.textContent = '💾';
            }
            if (statusText) {
                statusText.textContent = 'Locale';
            }
        }, 2000);
        
    } catch (error) {
        console.error('Save error:', error);
        
        // Error
        if (statusIcon) {
            statusIcon.textContent = '💾';
            statusIcon.style.animation = 'none';
        }
        if (statusText) {
            statusText.textContent = 'Locale';
        }
        
        showNotification('Errore nel salvataggio: ' + (error.message || 'Errore sconosciuto'), 'error');
        
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
    
    // Always synced for local storage
    statusIcon.textContent = '💾';
    statusIcon.classList.add('synced');
    statusText.textContent = 'Salvataggio Locale';
    statusIcon.style.filter = 'none';
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

