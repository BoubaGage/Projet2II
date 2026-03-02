function baseName(path) {
    if (!path) return '';
    return path.split(/[\/]/).pop();
}

function loadPdf() {
    const params = new URLSearchParams(window.location.search);
    const titre = params.get('titre') || '';
    const fichier = params.get('fichier') || '';
    const url = params.get('url') || '';
    const format = params.get('format') || '';

    const titleElement = document.getElementById('pdf-title');
    const frame = document.getElementById('pdf-viewer');
    const main = document.querySelector('.reader-main');

    if (titleElement) titleElement.innerText = titre || baseName(fichier) || 'Lecture';
    if (titleElement && format && format !== 'pdf') {
        titleElement.innerText += ` (${format.toUpperCase()})`;
    }

    if (frame && url) {
        // Si le lien est un PDF direct, tenter l'affichage
        if (url.endsWith('.pdf')) {
            frame.src = url;
        } else {
            frame.style.display = 'none';
            if (main) {
                const btn = document.createElement('button');
                btn.textContent = 'Ouvrir le livre externe';
                btn.className = 'reader-external-btn';
                btn.onclick = () => window.open(url, '_blank');
                main.appendChild(btn);
                const msg = document.createElement('div');
                msg.className = 'reader-external-msg';
                msg.textContent = "Ce livre ne peut pas être affiché directement. Cliquez sur le bouton pour l'ouvrir dans un nouvel onglet.";
                main.appendChild(msg);
            }
        }
    } else if (frame && fichier && !url) {
        // Toujours préfixer par 'livres/' pour les fichiers locaux
        let finalPath = baseName(fichier);
        frame.src = `/api/afficher?fichier=${encodeURIComponent('livres/' + finalPath)}`;
    }
}

document.addEventListener('DOMContentLoaded', loadPdf);
document.getElementById('quit-reading').onclick = () => window.history.back();
