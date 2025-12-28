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
                    ${contact.telefono ? `<a href="tel:${contact.telefono}" class="btn btn-success btn-small">📞</a>` : ''}
                    ${indirizzoMaps ? `<a href="https://maps.apple.com/?q=${encodeURIComponent(indirizzoMaps)}" class="btn btn-primary btn-small" target="_blank">🗺️</a>` : ''}
                    <button onclick="editContact('${contact.id}')" class="btn btn-secondary btn-small">✏️</button>
                    <button onclick="deleteContact('${contact.id}')" class="btn btn-danger btn-small">🗑️</button>
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
    
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }
    
    saveButton.disabled = true;
    saveButton.classList.add('loading');
    saveButton.textContent = 'Salvataggio...';
    
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
        
        showNotification('Contatto salvato con successo!', 'success');
        
        // Reset form
        form.reset();
        editingContactId = null;
        saveButton.textContent = 'Salva Contatto';
        
        // Reload contacts
        await loadContacts();
        
    } catch (error) {
        showNotification('Errore nel salvataggio. Riprova.', 'error');
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
        showNotification('Contatto eliminato', 'success');
        await loadContacts();
    } catch (error) {
        showNotification('Errore nell\'eliminazione. Riprova.', 'error');
    }
}

async function checkCloudStatus() {
    const statusIcon = document.getElementById('statusIcon');
    const statusText = document.getElementById('statusText');
    
    try {
        const result = await API.checkSync();
        if (result.synced) {
            statusIcon.textContent = '☁️';
            statusIcon.classList.add('synced');
            statusText.textContent = 'Sincronizzato';
            statusIcon.style.filter = 'grayscale(0%) brightness(1.2) hue-rotate(120deg) saturate(2.5) contrast(1.2)';
        } else {
            statusIcon.textContent = '☁️';
            statusIcon.classList.remove('synced');
            statusText.textContent = 'Non sincronizzato';
            statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
        }
    } catch (error) {
        statusIcon.textContent = '☁️';
        statusIcon.classList.remove('synced');
        statusText.textContent = 'Errore connessione';
        statusIcon.style.filter = 'grayscale(100%) brightness(0.8)';
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

