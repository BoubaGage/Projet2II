/**
 * app.js - Logique de la page catalogue.
 */

const BORROW_STORAGE_KEY = 'bibliogest.borrow.overrides.v1';
const SEARCH_DEBOUNCE_MS = 400;

let toutesLesCategories = new Set();
let categorieActuelle = '';
let searchDebounceTimer = null;
let localLivresController = null;
let latestLoadToken = 0;

let apiLivresCache = [];
let apiLivresLoaded = false;
let apiLivresLoadingPromise = null;

document.addEventListener('DOMContentLoaded', () => {
    chargerLivres();

    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => lancerRechercheDebounce());
    searchInput.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        if (searchDebounceTimer) {
            clearTimeout(searchDebounceTimer);
            searchDebounceTimer = null;
        }
        lancerRecherche();
    });
});

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeBorrowFlag(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
}

function makeBorrowKey(livre) {
    const source = livre && livre.source === 'api' ? 'api' : 'local';
    const id = livre && livre.id != null ? String(livre.id) : '';
    return `${source}:${id}`;
}

function readBorrowOverrides() {
    try {
        const raw = localStorage.getItem(BORROW_STORAGE_KEY);
        if (!raw) return {};

        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return {};

        return parsed;
    } catch (e) {
        return {};
    }
}

function resolveBorrowState(livre, overrides = null) {
    const safeOverrides = overrides || readBorrowOverrides();
    const key = makeBorrowKey(livre);

    if (Object.prototype.hasOwnProperty.call(safeOverrides, key)) {
        return !!safeOverrides[key];
    }

    return normalizeBorrowFlag(livre && livre.est_emprunte);
}

function normalizeText(value) {
    return String(value || '').toLowerCase();
}

function livreMatchQuery(livre, query) {
    const q = normalizeText(query).trim();
    if (!q) return true;

    return [
        livre.titre,
        livre.auteur,
        livre.categorie,
        livre.description
    ].some((field) => normalizeText(field).includes(q));
}

function livreMatchCategorie(livre, categorie) {
    const cat = normalizeText(categorie).trim();
    if (!cat) return true;
    return normalizeText(livre.categorie).includes(cat);
}

function filtrerLivres(livres, query, categorie) {
    return (Array.isArray(livres) ? livres : []).filter((livre) => {
        return livreMatchQuery(livre, query) && livreMatchCategorie(livre, categorie);
    });
}

async function ensureApiLivresLoaded() {
    if (apiLivresLoaded) return apiLivresCache;
    if (apiLivresLoadingPromise) return apiLivresLoadingPromise;

    apiLivresLoadingPromise = chargerLivresApi()
        .then((livresApi) => {
            apiLivresCache = Array.isArray(livresApi) ? livresApi : [];
            apiLivresLoaded = true;
            return apiLivresCache;
        })
        .catch(() => {
            // Evite de refaire une requete externe a chaque frappe en cas de panne reseau
            apiLivresCache = [];
            apiLivresLoaded = true;
            return apiLivresCache;
        })
        .finally(() => {
            apiLivresLoadingPromise = null;
        });

    return apiLivresLoadingPromise;
}

async function chargerLivres(query = '', categorie = '') {
    const grid = document.getElementById('livres-grid');
    const loadToken = ++latestLoadToken;

    if (localLivresController) localLivresController.abort();
    localLivresController = new AbortController();
    const localSignal = localLivresController.signal;

    try {
        const res = await fetch('/api/livres', { signal: localSignal });
        if (!res.ok) throw new Error('Erreur serveur');

        const livresLocauxRaw = await res.json();
        if (loadToken !== latestLoadToken || localSignal.aborted) return;

        const borrowOverrides = readBorrowOverrides();
        const livresLocaux = filtrerLivres(livresLocauxRaw, query, categorie).map((livre) => ({
            ...livre,
            est_emprunte: resolveBorrowState(livre, borrowOverrides)
        }));

        const apiPending = !apiLivresLoaded;
        renderCatalogue(livresLocaux, query, categorie, { grid, apiPending });

        const livresApiRaw = await ensureApiLivresLoaded();
        if (loadToken !== latestLoadToken || localSignal.aborted) return;

        const livresApi = filtrerLivres(livresApiRaw, query, categorie).map((livre) => ({
            ...livre,
            est_emprunte: resolveBorrowState(livre, borrowOverrides)
        }));

        renderCatalogue([...livresLocaux, ...livresApi], query, categorie, { grid, apiPending: false });
    } catch (err) {
        if (err.name === 'AbortError') return;
        if (grid) {
            grid.innerHTML = '<div class="books-empty">Erreur de liaison serveur</div>';
        }
        console.error('Fetch error:', err);
    }
}

function renderCatalogue(livres, query, categorie, options = {}) {
    const grid = options.grid || document.getElementById('livres-grid');
    const resultTitle = document.getElementById('result-title');
    const apiPending = !!options.apiPending;

    if (!grid) return;
    grid.innerHTML = '';

    if (!livres || livres.length === 0) {
        if (apiPending) {
            grid.innerHTML = `
                <div class="books-empty books-empty--loading">
                    <p class="books-empty-text">Chargement des livres externes...</p>
                </div>`;
        } else {
            grid.innerHTML = `
                <div class="books-empty">
                    <p class="books-empty-text">Aucun ouvrage ne correspond a votre recherche.</p>
                    <button onclick="resetSearch()" class="books-empty-btn">Reinitialiser les filtres</button>
                </div>`;
        }

        updateResultTitle(resultTitle, query, categorie);
        extraireCategories([]);
        return;
    }

    extraireCategories(livres);
    livres.forEach((livre) => {
        const card = creerCarteLivre(livre);
        grid.appendChild(card);
    });

    updateResultTitle(resultTitle, query, categorie);
}

function updateResultTitle(resultTitle, query, categorie) {
    if (!resultTitle) return;

    if (categorie) {
        resultTitle.innerHTML = `Genre : <span class="result-accent">${escapeHtml(categorie)}</span>`;
    } else if (query) {
        resultTitle.innerHTML = `Resultats pour : <span class="result-accent">&quot;${escapeHtml(query)}&quot;</span>`;
    } else {
        resultTitle.innerText = 'Toute la collection';
    }
}

async function chargerLivresApi() {
    const res = await fetch('https://gutendex.com/books/?mime_type=application/pdf');
    if (!res.ok) throw new Error('Erreur API Gutendex');

    const data = await res.json();
    return (data.results || []).slice(0, 10).map(normalizeGutendex);
}

function getCategorieDescriptionGutendex(book) {
    const shelves = Array.isArray(book.bookshelves) ? book.bookshelves : [];
    const subjects = Array.isArray(book.subjects) ? book.subjects : [];
    const summaries = Array.isArray(book.summaries) ? book.summaries : [];

    const categorie = shelves[0] || subjects[0] || 'Sans categorie';
    const description = summaries[0]
        || (subjects.length ? subjects.slice(0, 3).join(', ') : 'Description indisponible');

    return { categorie, description };
}

function pickFormat(formats, prefix) {
    if (!formats) return '';
    for (const key in formats) {
        if (key.startsWith(prefix)) return formats[key];
    }
    return '';
}

function normalizeGutendex(book) {
    const formats = book.formats || {};
    const cover = formats['image/jpeg'] || formats['image/png'] || '';
    const pdf = formats['application/pdf'] || pickFormat(formats, 'application/pdf');
    const html = pickFormat(formats, 'text/html');
    const epub = formats['application/epub+zip'] || '';
    const link = pdf || html || epub || '';
    const format = pdf ? 'pdf' : (html ? 'html' : (epub ? 'epub' : ''));
    const auteur = (book.authors && book.authors[0] && book.authors[0].name)
        ? book.authors[0].name
        : 'Auteur inconnu';
    const { categorie, description } = getCategorieDescriptionGutendex(book);

    return {
        id: book.id,
        titre: book.title || 'Sans titre',
        auteur,
        annee: '',
        categorie,
        description,
        couverture: cover,
        est_emprunte: false,
        lien: link,
        format,
        source: 'api'
    };
}

function creerCarteLivre(livre) {
    const div = document.createElement('div');

    const estEmprunte = normalizeBorrowFlag(livre.est_emprunte);
    div.className = `book-card${estEmprunte ? ' book-card--borrowed' : ''}`;

    let icon = 'BOOK';
    const cat = (livre.categorie || '').toLowerCase();
    if (cat.includes('hist')) icon = 'HIST';
    else if (cat.includes('sci') || cat.includes('tech')) icon = 'SCI';
    else if (cat.includes('roman') || cat.includes('litt')) icon = 'LIT';
    else if (cat.includes('art')) icon = 'ART';

    const affichageId = Math.abs(Number(livre.id || 0));
    const couverture = (livre.couverture || '').trim();
    const description = (livre.description || '').trim();
    const detailsText = description || 'Aucune description disponible.';
    const detailsClass = description ? '' : ' book-details--empty';

    const coverHtml = couverture
        ? `<img src="${escapeHtml(couverture)}" alt="Couverture de ${escapeHtml(livre.titre || '')}" class="book-cover-img">`
        : `<span class="book-icon">${escapeHtml(icon)}</span>`;

    const lienExterne = (livre.lien || '').trim();
    const formatExterne = (livre.format || '').trim();

    const lireHref = lienExterne
        ? `lire.html?titre=${encodeURIComponent(livre.titre || '')}&url=${encodeURIComponent(lienExterne)}&format=${encodeURIComponent(formatExterne)}`
        : (livre.fichier
            ? `lire.html?titre=${encodeURIComponent(livre.titre || '')}&fichier=${encodeURIComponent(livre.fichier)}`
            : 'admin.html');

    const blocageMessage = "Ce livre est deja emprunte. Merci de reessayer lorsqu'il sera disponible.";

    div.innerHTML = `
        <a class="book-cover-link${estEmprunte ? ' book-cover-link--disabled' : ''}" href="${estEmprunte ? '#' : escapeHtml(lireHref)}">
            <div class="book-cover${estEmprunte ? ' book-cover--unavailable' : ''}">
                ${coverHtml}
                <span class="book-id">ID: ${escapeHtml(affichageId)}</span>
                ${estEmprunte ? '<span class="book-status">Livre non disponible</span>' : ''}
                <div class="book-year">
                    <span class="book-year-text">${escapeHtml(livre.annee || 'Annee inconnue')}</span>
                </div>
            </div>
        </a>

        <h3 class="book-title" title="${escapeHtml(livre.titre || '')}">${escapeHtml(livre.titre || 'Sans titre')}</h3>
        <p class="book-author">${escapeHtml(livre.auteur || 'Auteur inconnu')}</p>

        <div class="book-meta">
            <span class="book-category">${escapeHtml(livre.categorie || 'General')}</span>
            <button type="button" class="book-link book-link--details">Details -&gt;</button>
        </div>
        <div class="book-details${detailsClass}">
            <p class="book-details-text">${escapeHtml(detailsText)}</p>
        </div>
    `;

    const detailsBtn = div.querySelector('.book-link--details');
    const detailsBox = div.querySelector('.book-details');
    if (detailsBtn && detailsBox) {
        detailsBtn.addEventListener('click', () => {
            detailsBox.classList.toggle('book-details--open');
        });
    }

    const coverLink = div.querySelector('.book-cover-link');
    if (coverLink && estEmprunte) {
        coverLink.addEventListener('click', (e) => {
            e.preventDefault();
            alert(blocageMessage);
        });
    }

    return div;
}

function extraireCategories(livres) {
    const filterContainer = document.getElementById('category-filters');
    if (!filterContainer) return;

    const categories = new Set();
    livres.forEach((livre) => {
        const value = (livre.categorie || '').trim();
        if (value) categories.add(value);
    });

    toutesLesCategories = categories;
    filterContainer.innerHTML = '';

    const allBtn = document.createElement('button');
    allBtn.className = `filter-btn${categorieActuelle === '' ? ' filter-btn--active' : ''}`;
    allBtn.textContent = 'Tous les genres';
    allBtn.addEventListener('click', () => filtrerParCategorie(''));
    filterContainer.appendChild(allBtn);

    Array.from(toutesLesCategories)
        .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
        .forEach((cat) => ajouterBoutonFiltre(cat, filterContainer));
}

function ajouterBoutonFiltre(cat, container) {
    const btn = document.createElement('button');
    btn.className = `filter-btn${categorieActuelle === cat ? ' filter-btn--active' : ''}`;
    btn.innerText = cat;
    btn.addEventListener('click', () => filtrerParCategorie(cat));
    container.appendChild(btn);
}

function lancerRecherche() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value : '';
    chargerLivres(query, categorieActuelle);
}

function lancerRechercheDebounce() {
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
        searchDebounceTimer = null;
        lancerRecherche();
    }, SEARCH_DEBOUNCE_MS);
}

function filtrerParCategorie(cat) {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }

    categorieActuelle = (categorieActuelle === cat) ? '' : cat;
    const searchInput = document.getElementById('searchInput');
    const query = searchInput ? searchInput.value : '';
    chargerLivres(query, categorieActuelle);
}

function resetSearch() {
    if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = null;
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    categorieActuelle = '';
    chargerLivres('', '');
}
