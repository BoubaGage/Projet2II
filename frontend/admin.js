/**
 * admin.js - Logique de la Console d'Administration
 */

let pdfSet = new Set();

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadLivres();

    // Mise à jour visuelle du nom de fichier lors de la sélection
    const fileInput = document.getElementById('form-fichier');
    const fileNameDisplay = document.getElementById('file-chosen-name');
    const fileIcon = document.getElementById('file-icon');

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            fileNameDisplay.textContent = e.target.files[0].name;
            fileNameDisplay.classList.add('file-name--active');
            fileIcon.textContent = "📄";
        }
    });
});

// --- CHARGEMENT DES DONNÉES ---
async function loadLivres() {
    const container = document.getElementById('livres-container');
    
    // On synchronise la liste des fichiers présents sur le serveur
    await syncFilesFromServer();

    try {
        const res = await fetch('/api/livres');
        const livres = await res.json();
        container.innerHTML = '';

        if (!livres || livres.length === 0) {
            container.innerHTML = '<p class="admin-empty">Base de données vide</p>';
            return;
        }

        livres.forEach(l => {
            const fileName = l.fichier ? l.fichier.split(/[\/]/).pop() : "";
            const exists = pdfSet.has(fileName);
            
            const card = document.createElement('div');
            card.className = `admin-card${exists ? '' : ' admin-card--missing'}`;
            
            card.innerHTML = `
                <div class="admin-card-header">
                    <span class="admin-card-ref">REF_${l.id}</span>
                    <button onclick="supprimerLivre('${l.titre.replace(/'/g, "\'")}')" 
                            class="admin-card-delete">
                        Supprimer
                    </button>
                </div>
                <h4 class="admin-card-title" title="${l.titre}">${l.titre}</h4>
                <p class="admin-card-meta">${l.auteur} ? ${l.annee || 'N/A'}</p>
                
                <div class="admin-card-footer">
                    <span class="admin-card-category">${l.categorie || 'Général'}</span>
                    <button onclick="chargerDansLecteur('${fileName}')" 
                            class="admin-card-link">
                        Inspecter →
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (e) { console.error("Erreur de chargement de l'index", e); }
}

/**
 * Récupère la liste des fichiers existants sur le serveur
 */
async function syncFilesFromServer() {
    try {
        const res = await fetch('/api/pdfs');
        const files = await res.json();
        pdfSet = new Set(files.map(f => f.split(/[\/]/).pop()));
    } catch (e) { pdfSet = new Set(); }
}

/**
 * Charge un fichier PDF dans l'iframe de prévisualisation
 */
function chargerDansLecteur(fileName) {
    if (!fileName) return;
    const viewer = document.getElementById('pdf-viewer');
    viewer.src = `/api/afficher?fichier=${encodeURIComponent(fileName)}`;
}

// --- ACTIONS DE GESTION ---

/**
 * Ajoute un livre : Upload binaire + Enregistrement des données
 */
async function ajouterLivreDemo() {
    const status = document.getElementById('pdf-status');
    const idInput = document.getElementById('form-id');
    const titreInput = document.getElementById('form-titre');
    const fileInput = document.getElementById('form-fichier');
    const file = fileInput.files[0];

    // --- VALIDATION ID POSITIF ---
    if (!idInput.value || parseInt(idInput.value) <= 0) {
        status.textContent = "ERREUR : L'ID DOIT ÊTRE UN NOMBRE POSITIF";
        status.style.color = "red";
        return;
    }

    if (!titreInput.value || !file) {
        status.textContent = "ERREUR : TITRE ET FICHIER OBLIGATOIRES";
        status.style.color = "red";
        return;
    }

    status.textContent = "TRANSFERT BINAIRE EN COURS...";
    status.style.color = "#4fc3b6";

    try {
        // 1. UPLOAD DU PDF (Binaire Pur)
        const uploadRes = await fetch(`/api/upload?file=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: await file.arrayBuffer()
        });

        if (!uploadRes.ok) throw new Error("Échec du transfert serveur");

        // 2. ENREGISTREMENT DANS LE FICHIER .DAT DU SERVEUR
        const params = new URLSearchParams({
            id: idInput.value,
            titre: titreInput.value,
            auteur: document.getElementById('form-auteur').value,
            annee: document.getElementById('form-annee').value,
            categorie: document.getElementById('form-categorie').value,
            fichier: file.name
        });

        const addRes = await fetch(`/api/add?${params.toString()}`);
        
        if (addRes.ok) {
            status.textContent = "ARCHIVAGE RÉUSSI !";
            status.style.color = "green";
            document.getElementById('add-form').reset();
            // Reset de l'affichage du fichier
            document.getElementById('file-chosen-name').textContent = "Choisir le document";
            document.getElementById('file-chosen-name').classList.remove('file-name--active');
            
            loadLivres(); // Rafraîchir la liste en bas
        }

    } catch (e) {
        status.textContent = "ERREUR : " + e.message;
        status.style.color = "red";
    }
}

/**
 * Supprime un livre de l'index binaire
 */
async function supprimerLivre(titre) {
    if (!confirm(`Voulez-vous supprimer définitivement "${titre}" de l'index ?`)) return;

    try {
        const res = await fetch(`/api/supprimer?titre=${encodeURIComponent(titre)}`);
        if (res.ok) {
            loadLivres();
        }
    } catch (e) {
        alert("Erreur lors de la suppression.");
    }
}
