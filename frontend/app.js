/**
 * app.js - Logique de l'interface utilisateur (Accueil)
 * Gère l'affichage, la recherche et le filtrage des livres
 */

let toutesLesCategories = new Set();
let categorieActuelle = "";

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    chargerLivres();

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
    const estEmprunte = livre.est_emprunte === true || livre.est_emprunte === 1 || livre.est_emprunte === "true";
    const couverture = (livre.couverture || "").trim();
    const description = (livre.description || "").trim();
    const detailsText = description ? description : "Aucune description disponible.";
    const detailsClass = description ? "" : " book-details--empty";
    const coverHtml = couverture
        ? `<img src="${couverture}" alt="Couverture de ${livre.titre}" class="book-cover-img">`
        : `<span class="book-icon">${icon}</span>`;
    const lienExterne = (livre.lien || "").trim();
    const formatExterne = (livre.format || "").trim();
    const lireHref = lienExterne
        ? `lire.html?titre=${encodeURIComponent(livre.titre || '')}&url=${encodeURIComponent(lienExterne)}&format=${encodeURIComponent(formatExterne)}`
        : (livre.fichier
            ? `lire.html?titre=${encodeURIComponent(livre.titre || '')}&fichier=${encodeURIComponent(livre.fichier)}`
            : 'admin.html');
    const externalAttrs = lienExterne ? '' : '';

    div.innerHTML = `
        <a class="book-cover-link" href="${lireHref}"${externalAttrs}>
            <div class="book-cover${estEmprunte ? ' book-cover--unavailable' : ''}">
                ${coverHtml}
                <span class="book-id">ID: ${affichageId}</span>
                ${estEmprunte ? '<span class="book-status">Livre non disponible</span>' : ''}
                <div class="book-year">
                     <span class="book-year-text">${livre.annee || 'Annee inconnue'}</span>
                </div>
            </div>
        </a>
        
        <h3 class="book-title" title="${livre.titre}">${livre.titre}</h3>
        <p class="book-author">${livre.auteur}</p>
        
        <div class="book-meta">
            <span class="book-category">
                ${livre.categorie || 'General'}
            </span>
            <button type="button" class="book-link book-link--details">
               Details ->
            </button>
        </div>
        <div class="book-details${detailsClass}">
            <p class="book-details-text">${detailsText}</p>
        </div>
    `;
    const detailsBtn = div.querySelector('.book-link--details');
    const detailsBox = div.querySelector('.book-details');
    if (detailsBtn && detailsBox) {
        detailsBtn.addEventListener('click', () => {
            detailsBox.classList.toggle('book-details--open');
        });
    }
    return div;
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
