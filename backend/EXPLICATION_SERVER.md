# Explication de `server.c`

Ce document explique les fonctions principales du backend HTTP (Mongoose) et les fonctions C utilitaires utilisees dans le fichier `backend/server.c`.

## 1) Idee generale du fichier

`server.c` fait 3 choses:

1. Demarrer un serveur HTTP (`main` + Mongoose manager).
2. Router les requetes API dans `event_handler`.
3. Appeler la logique metier (`bibliotheque.c`) + lecture/ecriture fichiers (`fichiers.c`).

## 2) URI vs URL

- `URL`: adresse complete. Exemple: `http://localhost:8000/api/livres`
- `URI`: identifiant de ressource (souvent juste le chemin dans ton code). Exemple: `/api/livres`

Dans `hm->uri`, tu travailles surtout avec le chemin.

## 3) Types Mongoose importants

- `struct mg_connection *c`: la connexion client courante (sert a repondre).
- `struct mg_http_message *hm`: requete HTTP parsee (method, uri, query, body, headers).

## 4) Fonctions Mongoose que tu utilises

- `mg_http_reply(...)`: envoie une reponse HTTP (code + headers + body).
- `mg_http_get_var(...)`: lit un parametre de query string.
- `mg_http_serve_file(...)`: sert un fichier (pdf/image).
- `mg_http_serve_dir(...)`: sert les fichiers statiques frontend.
- `mg_http_upload(...)`: gere l'upload de fichiers.
- `mg_http_listen(...)`: ouvre l'ecoute HTTP.
- `mg_mgr_init/poll/free(...)`: cycle de vie du serveur.
- `mg_fs_ls(...)`: parcourt le contenu d'un dossier.
- `mg_fs_posix`: implementation filesystem utilisee par Mongoose.
- `mg_vcmp(...)`: compare un `mg_str` Mongoose avec une chaine C.
- `mg_url_encode(...)`: encode une chaine pour URL.

## 5) Helpers locaux de `server.c`

### `uri_eq(hm, "/api/...")`
Teste si la route demandee est exactement celle attendue.

### `str_eq_ci(a, b)`
Compare deux chaines sans tenir compte de la casse (`A` == `a`).

### `basename_of(path)`
Retourne seulement le nom de fichier depuis un chemin.
Exemple: `data/livres/doc.pdf` -> `doc.pdf`

### `is_safe_filename(s)`
Valide un nom de fichier "plat":

- refuse `NULL` ou vide
- refuse `..`
- refuse `/` et `\\`

But: limiter les chemins dangereux.

### `ends_with_ci(s, suffix)`
Teste si `s` se termine par `suffix` sans casse.
Exemple: `Doc.PDF` finit bien par `.pdf`.

### `json_append(&buf, &cap, &len, texte)`
Ajoute du texte a la fin d'un buffer JSON dynamique.
Si besoin, agrandit le buffer avec `realloc`.

Pourquoi `char **buf` ?

- `realloc` peut changer l'adresse memoire
- il faut mettre a jour le pointeur de l'appelant

### `json_append_escaped(...)`
Ajoute du texte dans JSON en echappant les caracteres speciaux:

- `"` devient `\"`
- `\\` devient `\\\\`

But: garder un JSON valide meme avec des donnees utilisateur.

### `pdfs_to_json(dir_path)`
Liste les fichiers `.pdf` d'un dossier et retourne un JSON texte:

```json
[
  "doc1.pdf",
  "doc2.pdf"
]
```

## 6) Fonction centrale: `event_handler(...)`

`event_handler` est appelee par Mongoose a chaque evenement.

Ici, on traite surtout:

- `ev == MG_EV_HTTP_MSG` (requete HTTP recue)

Ensuite:

1. Parse la requete: `hm = (struct mg_http_message *) ev_data`
2. Log la requete
3. Route vers la bonne API avec `if / else if` sur `uri_eq(...)`
4. Repond avec `mg_http_reply(...)` ou sert des fichiers
5. Si aucune API ne correspond, sert le frontend statique (`mg_http_serve_dir`)

## 7) Fonctions C que tu as demandees

### `strncpy(dest, src, n)`
Copie au plus `n` caracteres.
Attention: parfois il faut forcer `dest[n-1] = '\0'`.

### `memset(ptr, val, size)`
Remplit une zone memoire avec une valeur.
Exemple frequent: `memset(&obj, 0, sizeof(obj));`

### `atoi(str)`
Convertit une chaine en entier.
Exemple: `"2025"` -> `2025`.
Limite: peu robuste en cas d'erreur.

### `strstr(texte, motif)`
Cherche une sous-chaine.
Retourne `NULL` si non trouve.

### `memcpy(dest, src, n)`
Copie `n` octets de `src` vers `dest`.

### `size_t`
Type non signe pour tailles/longueurs (`sizeof`, `strlen`, `memcpy`, etc.).

## 8) Convention de retour (important)

Dans tes helpers `server.c`, plusieurs fonctions retournent `int` comme un bool:

- `1` = succes / vrai
- `0` = echec / faux

Exemple:

```c
if (!json_append(...)) return 0;
```

Equivalent a:

```c
if (json_append(...) == 0) return 0;
```

## 9) Lecture rapide de la logique API

- `/api/livres`: catalogue JSON
- `/api/add`: ajout livre
- `/api/modifier`: modification livre
- `/api/supprimer`: suppression livre
- `/api/afficher`: sert un PDF
- `/api/couverture`: sert une image
- `/api/pdfs`: liste des PDFs du dossier
- `/api/upload`: upload PDF
- `/api/upload_couverture`: upload image

## 10) Conseils de nommage (optionnel)

Si tu veux des noms plus explicites:

- `basename_of` -> `filename_from_path`
- `is_safe_filename` -> `is_valid_filename`
- `ends_with_ci` -> `has_extension_ci`
- `json_append` -> `json_append_text`
- `json_append_escaped` -> `json_append_escaped_text`

