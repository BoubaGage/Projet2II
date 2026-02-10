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
        
        const livres = await res.json();
        
        grid.innerHTML = "";
        
        if (!livres || livres.length === 0) {
            grid.innerHTML = `
                <div class="books-empty">
                    <p class="books-empty-text">Aucun ouvrage ne correspond à votre recherche.</p>
                    <button onclick="resetSearch()" class="books-empty-btn">
                        Réinitialiser les filtres
                    </button>
                </div>`;
            return;
        }

        // Toujours extraire les catégories pour être sûr d'avoir les nouvelles
        extraireCategories(livres);

        livres.forEach(livre => {
            const card = creerCarteLivre(livre);
            grid.appendChild(card);
        });

        if (categorie) {
            resultTitle.innerHTML = `Genre : <span class="result-accent">${categorie}</span>`;
        } else if (query) {
            resultTitle.innerHTML = `Résultats pour : <span class="result-accent">"${query}"</span>`;
        } else {
            resultTitle.innerText = "Toute la collection";
        }

    } catch (err) {
        grid.innerHTML = `<div class="books-empty">Erreur de liaison serveur</div>`;
        console.error("Fetch error:", err);
    }
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
    const lireHref = livre.fichier
        ? `lire.html?titre=${encodeURIComponent(livre.titre || '')}&fichier=${encodeURIComponent(livre.fichier)}`
        : 'admin.html';

    div.innerHTML = `
        <a class="book-cover-link" href="${lireHref}">
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
