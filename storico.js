// Storico page functionality
document.addEventListener('DOMContentLoaded', async () => {
    // Check cloud status
    await checkCloudStatus();
    
    // Load reports
    await loadReports();
    
    // Check sync every 30 seconds
    setInterval(checkCloudStatus, 30000);
});

async function loadReports() {
    const reportsList = document.getElementById('reportsList');
    
    try {
        const result = await API.getReports();
        const reports = result.data || [];
        
        if (reports.length === 0) {
            reportsList.innerHTML = '<p style="color: #666;">Nessun report salvato</p>';
            return;
        }
        
        // Sort by date (most recent first)
        reports.sort((a, b) => {
            const dateA = new Date(a.data || a.createdAt);
            const dateB = new Date(b.data || b.createdAt);
            return dateB - dateA;
        });
        
        reportsList.innerHTML = reports.map(report => {
            const date = new Date(report.data || report.createdAt);
            const formattedDate = date.toLocaleDateString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            
            const tipoLavoroLabels = {
                'in sede': 'In sede',
                'trasferta con rientro': 'Trasferta con rientro',
                'trasferta con pernottamento': 'Trasferta con pernottamento',
                'trasferta estero': 'Trasferta estero'
            };
            
            const assenzaLabels = {
                'ferie': 'Ferie',
                'malattia': 'Malattia',
                'permesso': 'Permesso'
            };
            
            return `
                <div class="list-item">
                    <div class="list-item-header">
                        <div class="list-item-title">${formattedDate}</div>
                        <div class="list-item-actions">
                            <button onclick="editReport('${report.id}')" class="btn-icon btn-edit" title="Modifica">✏️</button>
                            <button onclick="deleteReport('${report.id}')" class="btn-icon btn-delete" title="Elimina">🗑️</button>
                        </div>
                    </div>
                    <div class="list-item-details">
                        ${report.assenza ? 
                            `<strong>Assenza:</strong> ${assenzaLabels[report.assenza] || report.assenza}<br>` :
                            `<strong>Tipo lavoro:</strong> ${tipoLavoroLabels[report.tipoLavoro] || report.tipoLavoro}<br>
                             <strong>Orario:</strong> ${report.oraInizio || ''} - ${report.oraFine || ''}<br>
                             <strong>Ore totali:</strong> ${report.oreTotali || 0}h<br>
                             ${report.oreStraordinarie > 0 ? `<strong>Ore straordinarie:</strong> ${report.oreStraordinarie}h<br>` : ''}`
                        }
                        ${report.luogoIntervento ? `<strong>Luogo:</strong> ${report.luogoIntervento}<br>` : ''}
                        ${report.note ? `<strong>Note:</strong> ${report.note}` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        reportsList.innerHTML = '<p style="color: var(--error-color);">Errore nel caricamento dei report</p>';
    }
}

async function editReport(id) {
    window.location.href = `report.html?id=${id}`;
}

async function deleteReport(id) {
    if (!confirm('Sei sicuro di voler eliminare questo report?')) {
        return;
    }
    
    try {
        const result = await API.deleteReport(id);
        if (result.success) {
            showNotification('Report eliminato', 'success');
            await loadReports();
        } else {
            showNotification('Errore nell\'eliminazione: ' + (result.error || 'Errore sconosciuto'), 'error');
        }
    } catch (error) {
        console.error('Delete error:', error);
        showNotification('Errore nell\'eliminazione. Riprova.', 'error');
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
window.editReport = editReport;
window.deleteReport = deleteReport;

