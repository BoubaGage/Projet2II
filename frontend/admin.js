/**
 * admin.js - Logique de la Console d'Administration
 */

let pdfSet = new Set();
let editId = null;
let lastViewerUrl = "";
let lastViewerTitle = "";
const BORROW_STORAGE_KEY = "bibliogest.borrow.overrides.v1";
const ADMIN_REFRESH_DEBOUNCE_MS = 350;
let refreshDebounceTimer = null;
let adminPdfsController = null;
let adminLocalController = null;
let adminApiController = null;
let adminApiLivresCache = [];
let adminApiLivresLoaded = false;

function normalizeBorrowFlag(value) {
    return value === true || value === 1 || value === "1" || value === "true";
}

function makeBorrowKey(livre) {
    const source = livre && livre.source === "api" ? "api" : "local";
    const id = livre && livre.id != null ? String(livre.id) : "";
    return `${source}:${id}`;
}

function readBorrowOverrides() {
    try {
        const raw = localStorage.getItem(BORROW_STORAGE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== "object") return {};
        return parsed;
    } catch (e) {
        return {};
    }
}

function writeBorrowOverrides(overrides) {
    localStorage.setItem(BORROW_STORAGE_KEY, JSON.stringify(overrides));
}

function resolveBorrowState(livre, overrides = null) {
    const safeOverrides = overrides || readBorrowOverrides();
    const key = makeBorrowKey(livre);
    if (Object.prototype.hasOwnProperty.call(safeOverrides, key)) {
        return !!safeOverrides[key];
    }
    return normalizeBorrowFlag(livre && livre.est_emprunte);
}

function setBorrowOverride(livre, emprunte) {
    const overrides = readBorrowOverrides();
    overrides[makeBorrowKey(livre)] = !!emprunte;
    writeBorrowOverrides(overrides);
}

function clearBorrowOverride(livre) {
    const key = makeBorrowKey(livre);
    const overrides = readBorrowOverrides();
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
        delete overrides[key];
        writeBorrowOverrides(overrides);
    }
}

function rafraichirLivres(immediate = false) {
    if (immediate) {
        if (refreshDebounceTimer) {
            clearTimeout(refreshDebounceTimer);
            refreshDebounceTimer = null;
        }
        loadLivres();
        return;
    }

    if (refreshDebounceTimer) clearTimeout(refreshDebounceTimer);
    refreshDebounceTimer = setTimeout(() => {
        refreshDebounceTimer = null;
        loadLivres();
    }, ADMIN_REFRESH_DEBOUNCE_MS);
}

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
    if (!container) return;
    
    if (adminPdfsController) adminPdfsController.abort();
    if (adminLocalController) adminLocalController.abort();
    if (adminApiController) adminApiController.abort();
    adminPdfsController = new AbortController();
    adminLocalController = new AbortController();
    adminApiController = new AbortController();
    const pdfSignal = adminPdfsController.signal;
    const localSignal = adminLocalController.signal;
    const apiSignal = adminApiController.signal;

    try {
        // On synchronise la liste des fichiers pr?sents sur le serveur
        await syncFilesFromServer(pdfSignal);

        const res = await fetch('/api/livres', { signal: localSignal });
        if (!res.ok) throw new Error("Erreur serveur");
        const livresLocaux = await res.json();

        let livresApi = [];
        try {
            livresApi = await chargerLivresApiAdmin(apiSignal);
        } catch (apiErr) {
            if (apiErr.name === "AbortError") throw apiErr;
            livresApi = [];
        }

        const borrowOverrides = readBorrowOverrides();
        const livres = [...livresLocaux, ...livresApi].map((livre) => ({
            ...livre,
            est_emprunte: resolveBorrowState(livre, borrowOverrides)
        }));

        if (pdfSignal.aborted || localSignal.aborted || apiSignal.aborted) return;

        container.innerHTML = '';

        if (!livres || livres.length === 0) {
            container.innerHTML = '<p class="admin-empty">Base de donn?es vide</p>';
            return;
        }

        livres.forEach(l => {
            const estEmprunte = normalizeBorrowFlag(l.est_emprunte);
            const statusHtml = estEmprunte
                ? `<span class="admin-card-status admin-card-status--busy">Emprunté</span>`
                : `<span class="admin-card-status">Disponible</span>`;

            if (l.source === 'api') {
                const description = (l.description || "").trim();
                const descHtml = description
                    ? `<p class="admin-card-description">${description}</p>`
                    : `<p class="admin-card-description admin-card-description--empty">Aucune description</p>`;
                const coverHtml = l.couverture
                    ? `<img src="${l.couverture}" alt="Couverture" class="admin-card-cover">`
                    : '';

                const card = document.createElement('div');
                card.className = `admin-card${estEmprunte ? ' admin-card--borrowed' : ''}`;
                card.style.cursor = l.lien ? 'pointer' : 'default';
                card.innerHTML = `
                    <div class="admin-card-header">
                        <span class="admin-card-ref">API_${l.id}</span>
                    </div>
                    <h4 class="admin-card-title" title="${l.titre}">${l.titre}</h4>
                    <p class="admin-card-meta">${l.auteur}</p>
                    ${coverHtml}
                    ${descHtml}
                    <div class="admin-card-footer">
                        <span class="admin-card-category">${l.categorie || 'General'}</span>
                        ${statusHtml}
                        <label class="admin-card-toggle">
                            <input type="checkbox" class="admin-card-toggle-input" ${estEmprunte ? 'checked' : ''}>
                            <span class="admin-card-toggle-switch" aria-hidden="true"></span>
                            <span class="admin-card-toggle-text">Emprunté</span>
                        </label>
                        <button type="button" class="admin-card-link">Inspecter -></button>
                    </div>
                `;
                card.addEventListener('click', () => {
                    if (l.lien) chargerDansLecteurExterne(l.lien, l.titre);
                });
                const apiInspectBtn = card.querySelector('.admin-card-link');
                if (apiInspectBtn) {
                    apiInspectBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (l.lien) chargerDansLecteurExterne(l.lien, l.titre);
                    });
                }
                const apiBorrowToggle = card.querySelector('.admin-card-toggle-input');
                const apiBorrowToggleWrap = card.querySelector('.admin-card-toggle');
                if (apiBorrowToggleWrap) {
                    apiBorrowToggleWrap.addEventListener('click', (e) => e.stopPropagation());
                }
                if (apiBorrowToggle) {
                    apiBorrowToggle.addEventListener('click', (e) => e.stopPropagation());
                    apiBorrowToggle.addEventListener('change', (e) => {
                        setBorrowOverride(l, e.target.checked);
                        rafraichirLivres();
                    });
                }
                container.appendChild(card);
                return;
            }

            const fileName = l.fichier ? l.fichier.split(/[\/]/).pop() : "";
            const exists = pdfSet.has(fileName);
            const description = (l.description || "").trim();
            const descHtml = description
                ? `<p class="admin-card-description">${description}</p>`
                : `<p class="admin-card-description admin-card-description--empty">Aucune description</p>`;
            const couverture = (l.couverture || "").trim();
            const coverHtml = couverture
                ? `<img src="${couverture}" alt="Couverture" class="admin-card-cover">`
                : "";

            const card = document.createElement('div');
            card.className = `admin-card${exists ? '' : ' admin-card--missing'}${estEmprunte ? ' admin-card--borrowed' : ''}`;
            card.style.cursor = fileName ? 'pointer' : 'default';

            card.innerHTML = `
                <div class="admin-card-header">
                    <span class="admin-card-ref">REF_${l.id}</span>
                    <div class="admin-card-actions">
                        <button type="button" class="admin-card-edit">Modifier</button>
                        <button type="button" class="admin-card-delete">Supprimer</button>
                    </div>
                </div>
                <h4 class="admin-card-title" title="${l.titre}">${l.titre}</h4>
                <p class="admin-card-meta">${l.auteur} - ${l.annee || 'N/A'}</p>
                ${coverHtml}
                ${descHtml}

                <div class="admin-card-footer">
                    <span class="admin-card-category">${l.categorie || 'General'}</span>
                    ${statusHtml}
                    <label class="admin-card-toggle">
                        <input type="checkbox" class="admin-card-toggle-input" ${estEmprunte ? 'checked' : ''}>
                        <span class="admin-card-toggle-switch" aria-hidden="true"></span>
                        <span class="admin-card-toggle-text">Emprunté</span>
                    </label>
                    <button type="button" class="admin-card-link">Inspecter -></button>
                </div>
            `;
            const editBtn = card.querySelector('.admin-card-edit');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    chargerFormulaire(l);
                });
            }
            const deleteBtn = card.querySelector('.admin-card-delete');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    supprimerLivre(l);
                });
            }
            const borrowToggle = card.querySelector('.admin-card-toggle-input');
            const borrowToggleWrap = card.querySelector('.admin-card-toggle');
            if (borrowToggleWrap) {
                borrowToggleWrap.addEventListener('click', (e) => e.stopPropagation());
            }
            if (borrowToggle) {
                borrowToggle.addEventListener('click', (e) => e.stopPropagation());
                borrowToggle.addEventListener('change', (e) => {
                    setBorrowOverride(l, e.target.checked);
                    rafraichirLivres();
                });
            }
            const inspectBtn = card.querySelector('.admin-card-link');
            if (inspectBtn) {
                inspectBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (fileName) chargerDansLecteur(fileName, l.titre);
                });
            }
            card.addEventListener('click', () => {
                if (fileName) chargerDansLecteur(fileName, l.titre);
            });
            container.appendChild(card);
        });
    } catch (e) {
        if (e.name === "AbortError") return;
        console.error("Erreur de chargement de l'index", e);
    }
}

/**
 * Récupère la liste des fichiers existants sur le serveur
 */
async function syncFilesFromServer(signal = undefined) {
    try {
        const res = await fetch('/api/pdfs', { signal });
        if (!res.ok) throw new Error("Erreur /api/pdfs");
        const files = await res.json();
        if (signal && signal.aborted) return;
        pdfSet = new Set(files.map(f => f.split(/[\/]/).pop()));
    } catch (e) {
        if (e.name === "AbortError") throw e;
        pdfSet = new Set();
    }
}

async function chargerLivresApiAdmin(signal = undefined) {
    if (adminApiLivresLoaded) return adminApiLivresCache;

    const res = await fetch('https://gutendex.com/books/?mime_type=application/pdf', { signal });
    if (!res.ok) throw new Error('API indisponible');

    const data = await res.json();
    adminApiLivresCache = (data.results || []).slice(0, 10).map(normalizeGutendexAdmin);
    adminApiLivresLoaded = true;
    return adminApiLivresCache;
}

function pickFormat(formats, prefix) {
    if (!formats) return '';
    for (const key in formats) {
        if (key.startsWith(prefix)) return formats[key];
    }
    return '';
}

function getCategorieDescriptionGutendex(b) {
    const shelves = Array.isArray(b.bookshelves) ? b.bookshelves : [];
    const subjects = Array.isArray(b.subjects) ? b.subjects : [];
    const summaries = Array.isArray(b.summaries) ? b.summaries : [];

    const categorie = shelves[0] || subjects[0] || 'Sans categorie';
    const description = summaries[0] ||
        (subjects.length ? subjects.slice(0, 3).join(', ') : 'Description indisponible');

    return { categorie, description };
}

function normalizeGutendexAdmin(b) {
    const formats = b.formats || {};
    const cover = formats['image/jpeg'] || formats['image/png'] || '';
    const pdf = formats['application/pdf'] || pickFormat(formats, 'application/pdf');
    const html = pickFormat(formats, 'text/html');
    const epub = formats['application/epub+zip'] || '';
    const link = pdf || html || epub || '';
    const format = pdf ? 'pdf' : (html ? 'html' : (epub ? 'epub' : ''));
    const auteur = (b.authors && b.authors[0] && b.authors[0].name)
        ? b.authors[0].name
        : 'Auteur inconnu';
    const { categorie, description } = getCategorieDescriptionGutendex(b);

    return {
        id: b.id,
        titre: b.title || 'Sans titre',
        auteur,
        annee: '',
        categorie,
        description,
        couverture: cover,
        lien: link,
        format,
        source: 'api'
    };
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
function chargerDansLecteur(fileName, titre = "") {
    if (!fileName) return;
    const viewer = document.getElementById('pdf-viewer');
    viewer.src = `/api/afficher?fichier=${encodeURIComponent(fileName)}`;
    lastViewerUrl = viewer.src;
    lastViewerTitle = titre || fileName;
}

function chargerDansLecteurExterne(url, titre = "") {
    if (!url) return;
    const viewer = document.getElementById('pdf-viewer');
    if (viewer) {
        viewer.src = url;
        lastViewerUrl = url;
        lastViewerTitle = titre || "";
    }
}

function ouvrirPleinEcran() {
    const viewer = document.getElementById('pdf-viewer');
    const url = lastViewerUrl || (viewer ? viewer.src : '');
    if (!url) return;
    const titre = lastViewerTitle || '';
    const target = `lire.html?titre=${encodeURIComponent(titre)}&url=${encodeURIComponent(url)}`;
    window.open(target, '_blank');
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
            clearBorrowOverride({ id: idInput.value, source: "local" });
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
            
            rafraichirLivres(true); // Rafraîchir la liste en bas
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
            clearBorrowOverride({ id: editId, source: "local" });
            annulerEdition();
            const statusMsg = document.getElementById('pdf-status');
            if (statusMsg) {
                statusMsg.textContent = "MISE A JOUR REUSSIE !";
                statusMsg.style.color = "green";
            }
            rafraichirLivres(true);
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
async function supprimerLivre(livre) {
    const titre = (livre && livre.titre) ? livre.titre : "";
    if (!confirm(`Voulez-vous supprimer définitivement "${titre}" de l'index ?`)) return;

    try {
        const res = await fetch(`/api/supprimer?titre=${encodeURIComponent(titre)}`);
        if (res.ok) {
            clearBorrowOverride({ id: livre ? livre.id : "", source: "local" });
            rafraichirLivres(true);
        }
    } catch (e) {
        alert("Erreur lors de la suppression.");
    }
}
