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
        
        contactsList.innerHTML = contacts.map(contact => `
            <div class="contact-item">
                <div class="contact-name">${contact.azienda || 'Senza nome'}</div>
                <div class="contact-details">
                    ${contact.referente ? `<strong>Referente:</strong> ${contact.referente}<br>` : ''}
                    ${contact.indirizzo ? `<strong>Indirizzo:</strong> ${contact.indirizzo}<br>` : ''}
                    ${contact.telefono ? `<strong>Telefono:</strong> <a href="tel:${contact.telefono}">${contact.telefono}</a>` : ''}
                </div>
                <div class="contact-actions">
                    ${contact.telefono ? `<a href="tel:${contact.telefono}" class="btn btn-success btn-small">📞 Chiama</a>` : ''}
                    ${contact.indirizzo ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(contact.indirizzo)}" class="btn btn-primary btn-small" target="_blank">🗺️ Mappa</a>` : ''}
                    <button onclick="editContact('${contact.id}')" class="btn btn-secondary btn-small">✏️ Modifica</button>
                    <button onclick="deleteContact('${contact.id}')" class="btn btn-danger btn-small">🗑️ Elimina</button>
                </div>
            </div>
        `).join('');
        
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
            document.getElementById('indirizzo').value = contact.indirizzo || '';
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
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
    const contactData = {
        azienda: document.getElementById('azienda').value,
        indirizzo: document.getElementById('indirizzo').value,
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
        
        // Always save locally
        API.saveLocalContact(contactData);
        
        showNotification('Contatto salvato con successo!', 'success');
        
        // Reset form
        form.reset();
        editingContactId = null;
        saveButton.textContent = 'Salva Contatto';
        
        // Reload contacts
        await loadContacts();
        
    } catch (error) {
        // Save locally as fallback
        API.saveLocalContact(contactData);
        showNotification('Contatto salvato localmente', 'success');
        form.reset();
        editingContactId = null;
        saveButton.textContent = 'Salva Contatto';
        await loadContacts();
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
        await API.deleteContact(id);
        API.deleteLocalContact(id);
        showNotification('Contatto eliminato', 'success');
        await loadContacts();
    } catch (error) {
        API.deleteLocalContact(id);
        showNotification('Contatto eliminato localmente', 'success');
        await loadContacts();
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
        } else {
            statusIcon.textContent = '⚠️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
        }
    } catch (error) {
        statusIcon.textContent = '❌';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
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

