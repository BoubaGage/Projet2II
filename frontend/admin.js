/**
 * admin.js - Logique de la Console d'Administration
 */

let pdfSet = new Set();
let editId = null;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    loadLivres();

    // Mise ? jour visuelle du nom de fichier lors de la s?lection
    const fileInput = document.getElementById('form-fichier');
    const fileNameDisplay = document.getElementById('file-chosen-name');
    const fileIcon = document.getElementById('file-icon');
    const coverFileInput = document.getElementById('form-couverture-file');
    const coverNameDisplay = document.getElementById('cover-chosen-name');
    const coverIcon = document.getElementById('cover-icon');

    if (fileInput && fileNameDisplay && fileIcon) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
                fileNameDisplay.classList.add('file-name--active');
                fileIcon.textContent = "??";
            }
        });
    }

    const coverInput = document.getElementById('form-couverture-file');

    if (coverInput && coverNameDisplay && coverIcon) {
        coverInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                coverNameDisplay.textContent = e.target.files[0].name;
                coverNameDisplay.classList.add('file-name--active');
                coverIcon.textContent = "???";
            }
        });
    }
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
            const description = (l.description || "").trim();
            const descHtml = description
                ? `<p class="admin-card-description">${description}</p>`
                : `<p class="admin-card-description admin-card-description--empty">Aucune description</p>`;
            const statusHtml = l.est_emprunte
                ? `<span class="admin-card-status admin-card-status--busy">Emprunte</span>`
                : `<span class="admin-card-status">Disponible</span>`;
            
            const card = document.createElement('div');
            card.className = `admin-card${exists ? '' : ' admin-card--missing'}`;
            
            card.innerHTML = `
                <div class="admin-card-header">
                    <span class="admin-card-ref">REF_${l.id}</span>
                    <div class="admin-card-actions">
                        <button class="admin-card-edit">Modifier</button>
                        <button onclick="supprimerLivre('${l.titre.replace(/'/g, "\'")}')" 
                                class="admin-card-delete">
                            Supprimer
                        </button>
                    </div>
                </div>
                <h4 class="admin-card-title" title="${l.titre}">${l.titre}</h4>
                <p class="admin-card-meta">${l.auteur} - ${l.annee || 'N/A'}</p>
                ${descHtml}
                
                <div class="admin-card-footer">
                    <span class="admin-card-category">${l.categorie || 'General'}</span>
                    ${statusHtml}
                    <button onclick="chargerDansLecteur('${fileName}')" 
                            class="admin-card-link">
                        Inspecter ->
                    </button>
                </div>
            `;
            const editBtn = card.querySelector('.admin-card-edit');
            if (editBtn) {
                editBtn.addEventListener('click', () => chargerFormulaire(l));
            }
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

function setEditMode(active) {
    const submitBtn = document.querySelector('.admin-submit');
    const cancelBtn = document.getElementById('cancel-edit');
    const idInput = document.getElementById('form-id');
    const titreInput = document.getElementById('form-titre');

    if (active) {
        if (submitBtn) submitBtn.textContent = "Mettre a jour";
        if (cancelBtn) cancelBtn.classList.add('admin-cancel--visible');
        if (idInput) idInput.setAttribute('disabled', 'disabled');
        if (titreInput) titreInput.setAttribute('disabled', 'disabled');
    } else {
        if (submitBtn) submitBtn.textContent = "Valider l'entree";
        if (cancelBtn) cancelBtn.classList.remove('admin-cancel--visible');
        if (idInput) idInput.removeAttribute('disabled');
        if (titreInput) titreInput.removeAttribute('disabled');
    }
}

function chargerFormulaire(livre) {
    if (!livre) return;
    editId = livre.id;
    const idInput = document.getElementById('form-id');
    const titreInput = document.getElementById('form-titre');
    const auteurInput = document.getElementById('form-auteur');
    const anneeInput = document.getElementById('form-annee');
    const catInput = document.getElementById('form-categorie');
    const descInput = document.getElementById('form-description');
    const coverFileInput = document.getElementById('form-couverture-file');
    const coverNameDisplay = document.getElementById('cover-chosen-name');
    const coverIcon = document.getElementById('cover-icon');
    const emprunteInput = document.getElementById('form-emprunte');
    const fileInput = document.getElementById('form-fichier');
    const fileNameDisplay = document.getElementById('file-chosen-name');
    const fileIcon = document.getElementById('file-icon');
    const status = document.getElementById('pdf-status');

    if (idInput) idInput.value = livre.id || "";
    if (titreInput) titreInput.value = livre.titre || "";
    if (auteurInput) auteurInput.value = livre.auteur || "";
    if (anneeInput) anneeInput.value = livre.annee || "";
    if (catInput) catInput.value = livre.categorie || "";
    if (descInput) descInput.value = livre.description || "";
    if (emprunteInput) emprunteInput.checked = !!livre.est_emprunte;
    if (fileInput) fileInput.value = "";
    if (fileNameDisplay) {
        fileNameDisplay.textContent = "Choisir le document";
        fileNameDisplay.classList.remove('file-name--active');
    }
    if (fileIcon) fileIcon.textContent = "PDF";
    if (coverFileInput) coverFileInput.value = "";
    if (coverNameDisplay) {
        coverNameDisplay.textContent = "Choisir une image";
        coverNameDisplay.classList.remove('file-name--active');
    }
    if (coverIcon) coverIcon.textContent = "???";
    if (status) {
        status.textContent = "MODE EDITION ACTIVE";
        status.style.color = "#111827";
    }

    setEditMode(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function annulerEdition() {
    editId = null;
    const form = document.getElementById('add-form');
    const fileNameDisplay = document.getElementById('file-chosen-name');
    const fileIcon = document.getElementById('file-icon');
    const coverFileInput = document.getElementById('form-couverture-file');
    const coverNameDisplay = document.getElementById('cover-chosen-name');
    const coverIcon = document.getElementById('cover-icon');
    const status = document.getElementById('pdf-status');
    if (form) form.reset();
    if (fileNameDisplay) {
        fileNameDisplay.textContent = "Choisir le document";
        fileNameDisplay.classList.remove('file-name--active');
    }
    if (fileIcon) fileIcon.textContent = "PDF";
    if (coverFileInput) coverFileInput.value = "";
    if (coverNameDisplay) {
        coverNameDisplay.textContent = "Choisir une image";
        coverNameDisplay.classList.remove('file-name--active');
    }
    if (coverIcon) coverIcon.textContent = "???";
    if (status) {
        status.textContent = "";
        status.style.color = "#9ca3af";
    }
    setEditMode(false);
}


/**
 * Charge un fichier PDF dans l'iframe de prévisualisation
 */
function chargerDansLecteur(fileName) {
    if (!fileName) return;
    const viewer = document.getElementById('pdf-viewer');
    viewer.src = `/api/afficher?fichier=${encodeURIComponent(fileName)}`;
}

async function uploadCouvertureSiBesoin() {
    const coverFileInput = document.getElementById('form-couverture-file');

    if (coverFileInput && coverFileInput.files && coverFileInput.files.length > 0) {
        const file = coverFileInput.files[0];
        const uploadRes = await fetch(`/api/upload_couverture?file=${encodeURIComponent(file.name)}`, {
            method: 'POST',
            body: await file.arrayBuffer()
        });
        if (!uploadRes.ok) throw new Error("Echec du transfert couverture");

        return `/api/couverture?fichier=${encodeURIComponent(file.name)}`;
    }

    return "";
}

// --- ACTIONS DE GESTION ---

/**
 * Ajoute un livre : Upload binaire + Enregistrement des données
 */
async function ajouterLivreDemo() {
    if (editId !== null) {
        await modifierLivre();
        return;
    }
    const status = document.getElementById('pdf-status');
    const idInput = document.getElementById('form-id');
    const titreInput = document.getElementById('form-titre');
    const descriptionInput = document.getElementById('form-description');
    const emprunteInput = document.getElementById('form-emprunte');
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

        const coverUrl = await uploadCouvertureSiBesoin();

        // 2. ENREGISTREMENT DANS LE FICHIER .DAT DU SERVEUR
        const params = new URLSearchParams({
            id: idInput.value,
            titre: titreInput.value,
            auteur: document.getElementById('form-auteur').value,
            annee: document.getElementById('form-annee').value,
            categorie: document.getElementById('form-categorie').value,
            fichier: file.name,
            description: descriptionInput ? descriptionInput.value : ""
        });
        if (coverUrl) params.append('couverture', coverUrl);
        if (emprunteInput && emprunteInput.checked) {
            params.append('emprunte', '1');
        }

        const addRes = await fetch(`/api/add?${params.toString()}`);
        
        if (addRes.ok) {
            status.textContent = "ARCHIVAGE RÉUSSI !";
            status.style.color = "green";
            document.getElementById('add-form').reset();
            // Reset de l'affichage du fichier
            document.getElementById('file-chosen-name').textContent = "Choisir le document";
            document.getElementById('file-chosen-name').classList.remove('file-name--active');
            const coverNameDisplay = document.getElementById('cover-chosen-name');
            if (coverNameDisplay) {
                coverNameDisplay.textContent = "Choisir une image";
                coverNameDisplay.classList.remove('file-name--active');
            }
            
            loadLivres(); // Rafraîchir la liste en bas
        }

    } catch (e) {
        status.textContent = "ERREUR : " + e.message;
        status.style.color = "red";
    }
}

/**
 * Modifie un livre existant (sans recrÃ©er)
 */
async function modifierLivre() {
    const status = document.getElementById('pdf-status');
    const titreInput = document.getElementById('form-titre');
    const descriptionInput = document.getElementById('form-description');
    const emprunteInput = document.getElementById('form-emprunte');
    const fileInput = document.getElementById('form-fichier');

    if (editId === null) return;
    if (!titreInput.value) {
        status.textContent = "ERREUR : TITRE OBLIGATOIRE";
        status.style.color = "red";
        return;
    }

    status.textContent = "MISE A JOUR EN COURS...";
    status.style.color = "#4fc3b6";

    try {
        let fichier = "";
        if (fileInput && fileInput.files && fileInput.files.length > 0) {
            const file = fileInput.files[0];
            const uploadRes = await fetch(`/api/upload?file=${encodeURIComponent(file.name)}`, {
                method: 'POST',
                body: await file.arrayBuffer()
            });
            if (!uploadRes.ok) throw new Error("Echec du transfert serveur");
            fichier = file.name;
        }

        const coverUrl = await uploadCouvertureSiBesoin();

        const params = new URLSearchParams({
            id: editId,
            titre: titreInput.value,
            auteur: document.getElementById('form-auteur').value,
            annee: document.getElementById('form-annee').value,
            categorie: document.getElementById('form-categorie').value,
            description: descriptionInput ? descriptionInput.value : ""
        });
        params.append('emprunte', emprunteInput && emprunteInput.checked ? '1' : '0');
        if (fichier) params.append('fichier', fichier);
        if (coverUrl) params.append('couverture', coverUrl);

        const res = await fetch(`/api/modifier?${params.toString()}`);
        let payload = null;
        try {
            payload = await res.json();
        } catch (e) {
            payload = null;
        }

        if (res.ok) {
            annulerEdition();
            const statusMsg = document.getElementById('pdf-status');
            if (statusMsg) {
                statusMsg.textContent = "MISE A JOUR REUSSIE !";
                statusMsg.style.color = "green";
            }
            loadLivres();
        } else {
            const msg = payload && payload.error ? payload.error : "MISE A JOUR IMPOSSIBLE";
            status.textContent = "ERREUR : " + msg;
            status.style.color = "red";
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
