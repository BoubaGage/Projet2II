/**
 * app.js - Logique de l'interface utilisateur (Accueil)
 * Gère l'affichage, la recherche et le filtrage des livres
 */
// accolade superflue supprimée
let toutesLesCategories = new Set();
let categorieActuelle = "";
let empruntsExternes = [];
let emailCourant = null;

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    emailCourant = (() => { try { return localStorage.getItem('email'); } catch(e){ return null; } })();
    fetch('/api/emprunts_all').then(res => res.ok ? res.json() : []).then(data => { empruntsExternes = data || []; });
    // Ne pas charger toute la bibliothèque sur la page des emprunts
    if (!document.body.classList.contains('emprunt-page')) {
        chargerLivres();
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // Correction : Lancer la recherche ? chaque lettre tapée pour plus de fluidité
        searchInput.addEventListener('input', () => lancerRecherche());
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') lancerRecherche();
        });
    }
});

// --- CHARGEMENT DES DONNÉES ---
async function chargerLivres(query = "", categorie = "") {
    const grid = document.getElementById('livres-grid');
    const resultTitle = document.getElementById('result-title');
    
    let url = `/api/livres`;
    const params = new URLSearchParams();
    
    if (query) params.append('q', query);
    if (categorie) params.append('categorie', categorie);
    
    if (params.toString()) url += `?${params.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error("Erreur serveur");

        const livresLocaux = await res.json();

        let livresApi = [];
        try {
            livresApi = await chargerLivresApi(query);
        } catch (apiErr) {
            livresApi = [];
        }

        if (categorie) {
            const catLower = categorie.toLowerCase();
            livresApi = livresApi.filter(l => (l.categorie || "").toLowerCase().includes(catLower));
        }

        const livres = [...livresLocaux, ...livresApi];

        grid.innerHTML = "";

        if (!livres || livres.length === 0) {
            grid.innerHTML = `
                <div class="books-empty">
                    <p class="books-empty-text">Aucun ouvrage ne correspond ? votre recherche.</p>
                    <button onclick="resetSearch()" class="books-empty-btn">
                        R?initialiser les filtres
                    </button>
                </div>`;
            return;
        }

       
        extraireCategories(livres);

        livres.forEach(livre => {
            const card = creerCarteLivre(livre);
            grid.appendChild(card);
        });

        if (categorie) {
            resultTitle.innerHTML = `Genre : <span class="result-accent">${categorie}</span>`;
        } else if (query) {
            resultTitle.innerHTML = `R?sultats pour : <span class="result-accent">"${query}"</span>`;
        } else {
            resultTitle.innerText = "Toute la collection";
        }

    } catch (err) {
        grid.innerHTML = `<div class="books-empty">Erreur de liaison serveur</div>`;
        console.error("Fetch error:", err);
    }
}

async function chargerLivresApi(query = "") {
    let apiUrl = "https://gutendex.com/books/?mime_type=application/pdf";
    if (query) {
        apiUrl += `&search=${encodeURIComponent(query)}`;
    }
    const res = await fetch(apiUrl);
    if (!res.ok) throw new Error("Erreur API Gutendex");
    const data = await res.json();
    return (data.results || []).slice(0, 10).map(normalizeGutendex);
}

function getCategorieDescriptionGutendex(b) {
    const shelves = Array.isArray(b.bookshelves) ? b.bookshelves : [];
    const subjects = Array.isArray(b.subjects) ? b.subjects : [];
    const summaries = Array.isArray(b.summaries) ? b.summaries : [];

    const categorie = shelves[0] || subjects[0] || "Sans categorie";
    const description = summaries[0] ||
        (subjects.length ? subjects.slice(0, 3).join(", ") : "Description indisponible");

    return { categorie, description };
}


function pickFormat(formats, prefix) {
    if (!formats) return "";
    for (const key in formats) {
        if (key.startsWith(prefix)) return formats[key];
    }
    return "";
}

function normalizeGutendex(b) {
    const formats = b.formats || {};
    const cover = formats["image/jpeg"] || formats["image/png"] || "";
    const pdf = formats["application/pdf"] || pickFormat(formats, "application/pdf");
    const html = pickFormat(formats, "text/html");
    const epub = formats["application/epub+zip"] || "";
    const link = pdf || html || epub || "";
    const format = pdf ? "pdf" : (html ? "html" : (epub ? "epub" : ""));
    const auteur = (b.authors && b.authors[0] && b.authors[0].name)
        ? b.authors[0].name
        : "Auteur inconnu";
    const { categorie, description } = getCategorieDescriptionGutendex(b);

    return {
        id: b.id,
        titre: b.title || "Sans titre",
        auteur,
        annee: "",
        categorie,
        description,
        couverture: cover,
        est_emprunte: false,
        lien: link,
        format,
        source: "api"
    };
}


// --- GÉNÉRATION DU DOM ---
function creerCarteLivre(livre) {
    const div = document.createElement('div');
    div.className = "book-card";
    let icon = "????";
    const cat = (livre.categorie || "").toLowerCase();
    if (cat.includes("hist")) icon = "????";
    else if (cat.includes("sci") || cat.includes("tech")) icon = "????";
    else if (cat.includes("roman") || cat.includes("litt")) icon = "???????";
    else if (cat.includes("art")) icon = "????";

    const affichageId = Math.abs(livre.id);
    let estEmprunte = livre.est_emprunte === true || livre.est_emprunte === 1 || livre.est_emprunte === "true";
    let dejaEmprunteParMoi = false;
    const lienExterne = (livre.lien || livre.link || "").trim();
    // Vérification pour les livres externes (API Gutendex)
    if (livre.source === 'api' && lienExterne) {
        const emprunts = empruntsExternes.filter(e => (e.link === lienExterne || e.lien === lienExterne));
        dejaEmprunteParMoi = emprunts.some(e => e.email === emailCourant);
        if (dejaEmprunteParMoi) {
            estEmprunte = true;
        }
    }
    const couverture = (livre.couverture || "").trim();
    const description = (livre.description || "").trim();
    const detailsText = description ? description : "Aucune description disponible.";
    const detailsClass = description ? "" : " book-details--empty";
    const coverHtml = couverture
        ? `<img src="${couverture}" alt="Couverture de ${livre.titre}" class="book-cover-img">`
        : `<span class="book-icon">${icon}</span>`;
    let lireHref = 'admin.html';
    if (lienExterne) {
        // Si le lien externe est un PDF, on l'utilise directement
        if (lienExterne.endsWith('.pdf')) {
            lireHref = `lire.html?titre=${encodeURIComponent(livre.titre || '')}&url=${encodeURIComponent(lienExterne)}&format=pdf`;
        } else {
            // Sinon, on tente d'utiliser le format PDF si disponible
            if (livre.formats && livre.formats['application/pdf']) {
                lireHref = `lire.html?titre=${encodeURIComponent(livre.titre || '')}&url=${encodeURIComponent(livre.formats['application/pdf'])}&format=pdf`;
            } else {
                lireHref = `lire.html?titre=${encodeURIComponent(livre.titre || '')}&url=${encodeURIComponent(lienExterne)}&format=${encodeURIComponent(livre.format || 'pdf')}`;
            }
        }
    } else if (livre.fichier) {
        lireHref = `lire.html?titre=${encodeURIComponent(livre.titre || '')}&fichier=${encodeURIComponent(livre.fichier)}`;
    }
    // Détecter si l'utilisateur est admin
    const isAdmin = (() => {
        try {
            const role = localStorage.getItem('role');
            return role === 'admin';
        } catch(e) { return false; }
    })();
    div.innerHTML = `
        <div class="book-cover-link">
            <div class="book-cover${estEmprunte ? ' book-cover--unavailable' : ''}">
                ${coverHtml}
                <span class="book-id">ID: ${affichageId}</span>
                ${dejaEmprunteParMoi ? '<span class="book-status">Emprunté</span>' : ''}
                <div class="book-year">
                     <span class="book-year-text">${livre.annee || 'Annee inconnue'}</span>
                </div>
            </div>
        </div>
        <h3 class="book-title" title="${livre.titre}">${livre.titre}</h3>
        <p class="book-author">${livre.auteur}</p>
        <div class="book-meta">
            <span class="book-category">
                ${livre.categorie || 'General'}
            </span>
            <div class="book-actions">
                ${!isAdmin ? `<button type="button" class="book-btn emprunter-btn" ${(dejaEmprunteParMoi ? 'disabled' : '')}>Emprunter</button>` : ''}
                <button type="button" class="book-btn lire-btn">Lire</button>
            </div>
        </div>
        <div class="book-details${detailsClass}">
            <p class="book-details-text">${detailsText}</p>
        </div>
    `;
    const detailsBox = div.querySelector('.book-details');
    const titleEl = div.querySelector('.book-title');
    const emprunterBtn = div.querySelector('.emprunter-btn');
    const lireBtn = div.querySelector('.lire-btn');
    if (titleEl && detailsBox) {
        titleEl.style.cursor = 'pointer';
        titleEl.addEventListener('click', () => {
            detailsBox.classList.toggle('book-details--open');
        });
    }
    if (emprunterBtn) {
        // Désactiver tous les boutons "Emprunter" sur la page emprunt.html
        if (document.body.classList.contains('emprunt-page')) {
            emprunterBtn.disabled = true;
        } else {
            // Autoriser l'emprunt local ou la réservation d'un livre externe
            const isApi = (livre.source && livre.source === 'api');
            const isLocal = ((!isApi && typeof livre.id !== 'undefined' && livre.id !== null && livre.id !== 0) || (livre.fichier && livre.fichier.trim() !== ''));
            const isExternal = !isLocal;
            if (estEmprunte || dejaEmprunteParMoi) emprunterBtn.disabled = true;
            emprunterBtn.addEventListener('click', async () => {
            const email = (() => { try { return localStorage.getItem('email'); } catch(e){ return null; } })();
            if (!email) { alert('Veuillez vous connecter pour emprunter'); return; }
            if (!confirm(`Confirmez-vous l'emprunt de "${livre.titre}" ?`)) return;
                try {
                // preferer envoyer l'id si disponible (plus robuste que le titre)
                const idParam = (isLocal && typeof livre.id !== 'undefined' && livre.id !== null) ? ('&id=' + encodeURIComponent(livre.id)) : '';
                let resUrl = '/api/emprunter?email=' + encodeURIComponent(email) + idParam + '&titre=' + encodeURIComponent(livre.titre);
                if (isExternal) {
                    // demander une réservation et envoyer le lien externe et la couverture si disponible
                    resUrl += '&reserve=1';
                    if (livre.lien) resUrl += '&link=' + encodeURIComponent(livre.lien);
                    if (livre.couverture) resUrl += '&couverture=' + encodeURIComponent(livre.couverture);
                }
                console.log('Emprunter URL:', resUrl);
                const res = await fetch(resUrl);
                if (res.ok) {
                    alert('Emprunt enregistré');
                    emprunterBtn.disabled = true;
                    const cover = div.querySelector('.book-cover');
                    if (cover) cover.classList.add('book-cover--unavailable');
                } else {
                    const text = await res.text().catch(() => '');
                    let errMsg = text;
                    try { const j = JSON.parse(text); errMsg = j.error || JSON.stringify(j); } catch(e) {}
                    alert('Erreur : ' + errMsg);
                    console.error('Emprunter failed', res.status, text);
                }
            } catch (err) { alert('Erreur réseau'); }
        });
    }
    if (lireBtn) {
        const targetHref = `${lireHref}`;
        lireBtn.addEventListener('click', () => {
            window.location.href = targetHref;
        });
    }
    return div;
}
}
// --- LOGIQUE DES FILTRES ---
function extraireCategories(livres) {
    const filterContainer = document.getElementById('category-filters');
    livres.forEach(l => {
        if (l.categorie && l.categorie.trim() !== "" && !toutesLesCategories.has(l.categorie.trim())) {
            toutesLesCategories.add(l.categorie.trim());
            // Ajouter le bouton immédiatement s'il n'existe pas
            ajouterBoutonFiltre(l.categorie.trim(), filterContainer);
        }
    });
}

function ajouterBoutonFiltre(cat, container) {
    if (!container) return;
    const btn = document.createElement('button');
    btn.className = "filter-btn";
    btn.innerText = cat;
    btn.onclick = () => filtrerParCategorie(cat, btn);
    container.appendChild(btn);
}

function lancerRecherche() {
    const query = document.getElementById('searchInput').value;
    chargerLivres(query, categorieActuelle);
}

function filtrerParCategorie(cat, btnElement = null) {
    categorieActuelle = (categorieActuelle === cat) ? "" : cat; // Toggle : recliquer désactive le filtre
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('filter-btn--active');
    });

    if (btnElement && categorieActuelle !== "") {
        btnElement.classList.add('filter-btn--active');
    }

    chargerLivres(document.getElementById('searchInput').value, categorieActuelle);
}

function resetSearch() {
    document.getElementById('searchInput').value = "";
    categorieActuelle = "";
    filtrerParCategorie('');
}
