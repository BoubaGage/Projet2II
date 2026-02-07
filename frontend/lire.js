function baseName(path) {
    if (!path) return '';
    return path.split(/[\\/]/).pop();
}

function loadPdf() {
    const params = new URLSearchParams(window.location.search);
    const titre = params.get('titre') || '';
    const fichier = params.get('fichier') || '';

    const titleElement = document.getElementById('pdf-title');
    const frame = document.getElementById('pdf-viewer');

    if (titleElement) titleElement.innerText = titre || baseName(fichier) || 'Lecture';

    if (frame && fichier) {
        // IMPORTANT : On passe le nom du fichier à l'API du serveur C
        // Si le fichier est déjà passé avec 'livres/', on le laisse, sinon on l'ajoute.
        let finalPath = fichier.includes('livres/') ? fichier : `livres/${baseName(fichier)}`;
        frame.src = `/api/afficher?fichier=${encodeURIComponent(finalPath)}`;
    }
}

document.addEventListener('DOMContentLoaded', loadPdf);
document.getElementById('quit-reading').onclick = () => window.history.back();
