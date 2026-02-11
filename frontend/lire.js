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

    if (titleElement) titleElement.innerText = titre || baseName(fichier) || 'Lecture';
    if (titleElement && format && format !== 'pdf') {
        titleElement.innerText += ` (${format.toUpperCase()})`;
    }

    if (frame && url) {
        frame.src = url;
    } else if (frame && fichier) {
        // Load local PDF through the C server
        let finalPath = fichier.includes('livres/') ? fichier : `livres/${baseName(fichier)}`;
        frame.src = `/api/afficher?fichier=${encodeURIComponent(finalPath)}`;
    }
}

document.addEventListener('DOMContentLoaded', loadPdf);
document.getElementById('quit-reading').onclick = () => window.history.back();
