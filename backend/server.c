// Simple HTTP server + API for library backend
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <ctype.h>

#include "mongoose.h"
#include "bibliotheque.h"
#include "fichiers.h"

// --- VARIABLES GLOBALES ---
static int s_signo = 0;
static int s_debug_level = MG_LL_INFO;
static const char *s_root_dir = "frontend";
static const char *s_listening_address = "http://0.0.0.0:8000";
static const char *s_data_file = "data/livres.dat";
static const char *s_books_dir = "data/livres";

static struct Bibliotheque ma_biblio;
// -------------------------

static int uri_eq(struct mg_http_message *hm, const char *s) {
  return mg_vcmp(&hm->uri, s) == 0;
}

static int str_eq_ci(const char *a, const char *b) {
  if (a == NULL || b == NULL) return 0;
  while (*a && *b) {
    if (tolower((unsigned char) *a) != tolower((unsigned char) *b)) return 0;
    a++;
    b++;
  }
  return *a == *b;
}

static const char *basename_of(const char *path) {
  if (path == NULL) return NULL;
  const char *slash = strrchr(path, '/');
  const char *bslash = strrchr(path, '\\');
  const char *base = path;
  if (slash && bslash) {
    base = (slash > bslash) ? slash + 1 : bslash + 1;
  } else if (slash) {
    base = slash + 1;
  } else if (bslash) {
    base = bslash + 1;
  }
  return base;
}

static int is_safe_filename(const char *s) {
  if (s == NULL || *s == '\0') return 0;
  if (strstr(s, "..") != NULL) return 0;
  for (const char *p = s; *p; p++) {
    if (*p == '/' || *p == '\\') return 0;
  }
  return 1;
}

static char *biblio_categorie_to_json(const Bibliotheque *bibli, const char *categorie) {
  if (bibli == NULL || categorie == NULL) return NULL;

  size_t taille_max = (bibli->nb_livres * 500) + 1024;
  char *json = malloc(taille_max);
  if (json == NULL) return NULL;

  strcpy(json, "[\n");
  Bool premier_livre = VRAI;

  for (int i = 0; i < TABLE_SIZE; i++) {
    NoeudLivre *actuel = bibli->table.table[i].head;
    while (actuel != NULL) {
      if (str_eq_ci(actuel->data.categorie, categorie)) {
        if (!premier_livre) strcat(json, ",\n");

        char livre_json[3000];
        snprintf(livre_json, sizeof(livre_json),
                 "  {\n"
                 "    \"id\": %d,\n"
                 "    \"titre\": \"%s\",\n"
                 "    \"auteur\": \"%s\",\n"
                 "    \"annee\": %d,\n"
                 "    \"categorie\": \"%s\",\n"
                 "    \"fichier\": \"%s\",\n"
                 "    \"est_emprunte\": %s\n"
                 "  }",
                 actuel->data.id,
                 actuel->data.titre,
                 actuel->data.auteur,
                 actuel->data.annee,
                 actuel->data.categorie,
                 actuel->data.fichier,
                 actuel->data.est_emprunte ? "true" : "false");
        strcat(json, livre_json);
        premier_livre = FAUX;
      }
      actuel = actuel->noeudnext;
    }
  }

  strcat(json, "\n]");
  return json;
}

static int ends_with_ci(const char *s, const char *suffix) {
  if (s == NULL || suffix == NULL) return 0;
  size_t len_s = strlen(s);
  size_t len_suf = strlen(suffix);
  if (len_s < len_suf) return 0;
  return str_eq_ci(s + (len_s - len_suf), suffix);
}

static int json_append(char **buf, size_t *cap, size_t *len, const char *s) {
  size_t add = strlen(s);
  if (*len + add + 1 > *cap) {
    size_t new_cap = (*cap) * 2;
    while (new_cap < *len + add + 1) new_cap *= 2;
    char *tmp = realloc(*buf, new_cap);
    if (tmp == NULL) return 0;
    *buf = tmp;
    *cap = new_cap;
  }
  memcpy(*buf + *len, s, add);
  *len += add;
  (*buf)[*len] = '\0';
  return 1;
}

static int json_append_escaped(char **buf, size_t *cap, size_t *len, const char *s) {
  if (s == NULL) return 1;
  for (const char *p = s; *p; p++) {
    if (*p == '\"' || *p == '\\') {
      if (!json_append(buf, cap, len, "\\")) return 0;
    }
    char tmp[2] = {*p, '\0'};
    if (!json_append(buf, cap, len, tmp)) return 0;
  }
  return 1;
}

static char *pdfs_to_json(const char *dir_path) {
  if (dir_path == NULL) return NULL;
  size_t cap = 1024;
  size_t len = 0;
  char *json = malloc(cap);
  if (json == NULL) return NULL;
  json[0] = '\0';
  if (!json_append(&json, &cap, &len, "[\n")) {
    free(json);
    return NULL;
  }

  Bool first = VRAI;
  char name[256] = "";
  while (mg_fs_ls(&mg_fs_posix, dir_path, name, sizeof(name))) {
    if (!ends_with_ci(name, ".pdf")) continue;
    if (!first) {
      if (!json_append(&json, &cap, &len, ",\n")) break;
    }
    if (!json_append(&json, &cap, &len, "  \"")) break;
    if (!json_append_escaped(&json, &cap, &len, name)) break;
    if (!json_append(&json, &cap, &len, "\"")) break;
    first = FAUX;
  }

  if (!json_append(&json, &cap, &len, "\n]")) {
    free(json);
    return NULL;
  }
  return json;
}

static void event_handler(struct mg_connection *c, int ev, void *ev_data) {
  if (ev == MG_EV_HTTP_MSG) {
    struct mg_http_message *hm = (struct mg_http_message *) ev_data;

    // --- ROUTE 1 : Liste de tous les livres (Catalogue) ---
if (uri_eq(hm, "/api/livres")) {
    char query[128], cat[128];
    int has_q = mg_http_get_var(&hm->query, "q", query, sizeof(query));
    int has_cat = mg_http_get_var(&hm->query, "categorie", cat, sizeof(cat));

    char *json = NULL;

    
    if (has_cat > 0) {
        json = biblio_categorie_to_json(&ma_biblio, cat);
    } 
    
    else if (has_q > 0) {
        json = biblio_to_json(&ma_biblio); 
    }
   
    else {
        json = biblio_to_json(&ma_biblio);
    }

    if (json != NULL) {
        mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s\n", json);
        free(json); 
    } else {
        mg_http_reply(c, 500, "", "{\"error\": \"Erreur binaire\"}\n");
    }
}

    // --- ROUTE 2 : Recherche par titre ---
    else if (uri_eq(hm, "/api/recherche")) {
      char titre[128];
      if (mg_http_get_var(&hm->query, "titre", titre, sizeof(titre)) > 0) {
        Livre *l = biblio_search(&ma_biblio, titre);
        if (l != NULL) {
          mg_http_reply(c, 200, "Content-Type: application/json\r\n", 
                        "{\"status\": \"trouve\", \"titre\": \"%s\", \"auteur\": \"%s\"}\n", 
                        l->titre, l->auteur);
        } else {
          mg_http_reply(c, 404, "", "{\"error\": \"Livre non trouve\"}\n");
        }
      } else {
        mg_http_reply(c, 400, "", "{\"error\": \"Parametre titre manquant\"}\n");
      }
    }

    // --- ROUTE 3 : Ajouter un livre (API) ---
    else if (uri_eq(hm, "/api/add")) {
        char id_s[10], annee_s[10], titre[128], auteur[128];
        char categorie[64], fichier[256], emprunte_s[16];
        
        // Extraction des données de l'URL
        int n1 = mg_http_get_var(&hm->query, "id", id_s, sizeof(id_s));
        int n2 = mg_http_get_var(&hm->query, "titre", titre, sizeof(titre));
        int n3 = mg_http_get_var(&hm->query, "auteur", auteur, sizeof(auteur));
        int n4 = mg_http_get_var(&hm->query, "annee", annee_s, sizeof(annee_s));
        int n5 = mg_http_get_var(&hm->query, "categorie", categorie, sizeof(categorie));
        int n6 = (n5 > 0) ? n5 : mg_http_get_var(&hm->query, "cat", categorie, sizeof(categorie));
        int n7 = mg_http_get_var(&hm->query, "fichier", fichier, sizeof(fichier));
        int n8 = mg_http_get_var(&hm->query, "emprunte", emprunte_s, sizeof(emprunte_s));
        int n9 = (n8 > 0) ? n8 : mg_http_get_var(&hm->query, "est_emprunte", emprunte_s, sizeof(emprunte_s));

        if (n1 > 0 && n2 > 0 && n3 > 0) {
            Livre n;
            memset(&n, 0, sizeof(Livre));
            n.id = atoi(id_s);
            strncpy(n.titre, titre, sizeof(n.titre) - 1);
            strncpy(n.auteur, auteur, sizeof(n.auteur) - 1);
            if (n4 > 0) n.annee = atoi(annee_s);
            if (n6 > 0) strncpy(n.categorie, categorie, sizeof(n.categorie) - 1);
            if (n7 > 0) strncpy(n.fichier, fichier, sizeof(n.fichier) - 1);
            n.est_emprunte = FAUX;
            if (n9 > 0) {
              if (strcmp(emprunte_s, "1") == 0 || str_eq_ci(emprunte_s, "true") ||
                  str_eq_ci(emprunte_s, "oui")) {
                n.est_emprunte = VRAI;
              }
            }

            biblio_add(&ma_biblio, &n);
            fichiers_sauvegarder(&ma_biblio, s_data_file); // Sauvegarde auto
            mg_http_reply(c, 200, "Content-Type: application/json\r\n", "{\"status\": \"success\"}\n");
        } else {
            mg_http_reply(c, 400, "", "{\"error\": \"Champs manquants\"}\n");
        }
    }

    // --- ROUTE 4 : Supprimer un livre (API) ---
    else if (uri_eq(hm, "/api/supprimer")) {
      char titre[128];
      if (mg_http_get_var(&hm->query, "titre", titre, sizeof(titre)) > 0) {
        Livre *l = biblio_search(&ma_biblio, titre);
        if (l == NULL) {
          mg_http_reply(c, 404, "", "{\"error\": \"Livre introuvable\"}\n");
        } else {
          biblio_remove(&ma_biblio, titre);
          fichiers_sauvegarder(&ma_biblio, s_data_file);
          mg_http_reply(c, 200, "Content-Type: application/json\r\n", "{\"status\": \"supprime\"}\n");
        }
      } else {
        mg_http_reply(c, 400, "", "{\"error\": \"Parametre titre manquant\"}\n");
      }
    }

    // --- ROUTE 5 : Liste des livres par categorie ---
    else if (uri_eq(hm, "/api/categorie")) {
      char categorie[128];
      int n1 = mg_http_get_var(&hm->query, "categorie", categorie, sizeof(categorie));
      int n2 = (n1 > 0) ? n1 : mg_http_get_var(&hm->query, "cat", categorie, sizeof(categorie));

      if (n2 > 0) {
        char *json = biblio_categorie_to_json(&ma_biblio, categorie);
        if (json != NULL) {
          mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s\n", json);
          free(json);
        } else {
          mg_http_reply(c, 500, "", "{\"error\": \"Erreur generation JSON\"}\n");
        }
      } else {
        mg_http_reply(c, 400, "", "{\"error\": \"Parametre categorie manquant\"}\n");
      }
    }

    // --- ROUTE 6 : Compter les livres ---
    else if (uri_eq(hm, "/api/compter")) {
      mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                    "{ \"count\": %zu }\n", biblio_count(&ma_biblio));
    }

    // --- ROUTE 7 : Afficher un livre PDF ---
    else if (uri_eq(hm, "/api/afficher")) {
      char titre[128], fichier[256];
      int has_titre = mg_http_get_var(&hm->query, "titre", titre, sizeof(titre));
      int has_fichier = mg_http_get_var(&hm->query, "fichier", fichier, sizeof(fichier));
      const char *filename = NULL;

      if (has_titre > 0) {
        Livre *l = biblio_search(&ma_biblio, titre);
        if (l == NULL) {
          mg_http_reply(c, 404, "", "{\"error\": \"Livre introuvable\"}\n");
          return;
        }
        filename = l->fichier;
      } else if (has_fichier > 0) {
        filename = fichier;
      } else {
        mg_http_reply(c, 400, "", "{\"error\": \"Parametre titre ou fichier manquant\"}\n");
        return;
      }

      const char *base = basename_of(filename);
      if (!is_safe_filename(base)) {
        mg_http_reply(c, 400, "", "{\"error\": \"Nom de fichier invalide\"}\n");
        return;
      }

      char path[512];
      snprintf(path, sizeof(path), "%s/%s", s_books_dir, base);
      struct mg_http_serve_opts opts = {
          .extra_headers = "Content-Type: application/pdf\r\n",
          .mime_types = "pdf=application/pdf"
      };
      mg_http_serve_file(c, hm, path, &opts);
    }

    // --- ROUTE 8 : Liste des PDFs ---
    else if (uri_eq(hm, "/api/pdfs")) {
      char *json = pdfs_to_json(s_books_dir);
      if (json != NULL) {
        mg_http_reply(c, 200, "Content-Type: application/json\r\n", "%s\n", json);
        free(json);
      } else {
        mg_http_reply(c, 500, "", "{\"error\": \"Erreur generation JSON\"}\n");
      }
    }

    // --- ROUTE 9 : Upload PDF ---
    else if (uri_eq(hm, "/api/upload")) {
      // Upload brut: /api/upload?file=nom.pdf&offset=0
      mg_http_upload(c, hm, &mg_fs_posix, s_books_dir, 50 * 1024 * 1024);
    }

    // --- ROUTE 9 : Sauvegarder ---
    else if (uri_eq(hm, "/api/sauvegarder")) {
      if (fichiers_sauvegarder(&ma_biblio, s_data_file)) {
        mg_http_reply(c, 200, "", "{\"status\": \"sauvegarde\"}\n");
      } else {
        mg_http_reply(c, 500, "", "{\"error\": \"Sauvegarde impossible\"}\n");
      }
    }

    // --- ROUTE 10 : Recharger ---
    else if (uri_eq(hm, "/api/recharger")) {
      biblio_free(&ma_biblio);
      biblio_init(&ma_biblio);
      if (fichiers_charger(&ma_biblio, s_data_file)) {
        mg_http_reply(c, 200, "Content-Type: application/json\r\n",
                      "{ \"status\": \"recharge\", \"count\": %zu }\n", biblio_count(&ma_biblio));
      } else {
        mg_http_reply(c, 404, "", "{\"error\": \"Fichier introuvable\"}\n");
      }
    }

    // --- ROUTE 11 : Emprunter ---
    else if (uri_eq(hm, "/api/emprunter")) {
      char titre[128];
      if (mg_http_get_var(&hm->query, "titre", titre, sizeof(titre)) > 0) {
        if (biblio_emprunter(&ma_biblio, titre)) {
          fichiers_sauvegarder(&ma_biblio, s_data_file);
          mg_http_reply(c, 200, "", "{\"status\": \"emprunte\"}\n");
        } else {
          mg_http_reply(c, 400, "", "{\"error\": \"Indisponible\"}\n");
        }
      }
    }

    // --- ROUTE 12 : Retourner ---
    else if (uri_eq(hm, "/api/retourner")) {
      char titre[128];
      if (mg_http_get_var(&hm->query, "titre", titre, sizeof(titre)) > 0) {
        biblio_retour(&ma_biblio, titre);
        fichiers_sauvegarder(&ma_biblio, s_data_file);
        mg_http_reply(c, 200, "", "{\"status\": \"retourne\"}\n");
      }
    }

    // --- ROUTE X : Page HTML pour lire un PDF ---
    else if (uri_eq(hm, "/lire")) {
      char titre[128], fichier[256], enc[512];
      const char *filename = NULL;

      if (mg_http_get_var(&hm->query, "titre", titre, sizeof(titre)) > 0) {
        Livre *l = biblio_search(&ma_biblio, titre);
        if (l == NULL) {
          mg_http_reply(c, 404, "", "{\"error\": \"Livre introuvable\"}\n");
          return;
        }
        filename = l->fichier;
      } else if (mg_http_get_var(&hm->query, "fichier", fichier, sizeof(fichier)) > 0) {
        filename = fichier;
      } else {
        mg_http_reply(c, 400, "", "{\"error\": \"Parametre titre ou fichier manquant\"}\n");
        return;
      }

      if (!is_safe_filename(filename)) {
        mg_http_reply(c, 400, "", "{\"error\": \"Nom de fichier invalide\"}\n");
        return;
      }

      mg_url_encode(filename, strlen(filename), enc, sizeof(enc));
      enc[sizeof(enc) - 1] = '\0';

    }

    // --- ROUTE PAR DÉFAUT : Serveur de fichiers (Frontend) ---
    else {
      struct mg_http_serve_opts opts = {.root_dir = s_root_dir};
      mg_http_serve_dir(c, hm, &opts);
    }
  }
}
static void signal_handler(int sig) {
  s_signo = sig;
}

int main(void) {
  struct mg_mgr mgr; 
  
  biblio_init(&ma_biblio);

  mg_log_set(s_debug_level);

 
  if (fichiers_charger(&ma_biblio, s_data_file)) {
    printf("Succès : %zu livres chargés depuis %s\n", biblio_count(&ma_biblio), s_data_file);
  } else {
    printf("Info : Aucun fichier trouvé, démarrage avec une bibliothèque vide.\n");
  }


  signal(SIGINT, signal_handler);
  signal(SIGTERM, signal_handler);

  mg_mgr_init(&mgr); 
  if (mg_http_listen(&mgr, s_listening_address, event_handler, NULL) == NULL) {
    printf("Erreur fatale : Impossible d'écouter sur %s\n", s_listening_address);
    return 1;
  }

  printf("Serveur en ligne sur %s\n", s_listening_address);
  printf("Appuyez sur Ctrl+C pour arrêter proprement.\n");

  
  while (s_signo == 0) {
    mg_mgr_poll(&mgr, 1000); 
  }

  
  printf("\nArrêt détecté. Sauvegarde des données...\n");
  

  if (fichiers_sauvegarder(&ma_biblio, s_data_file)) {
    printf("Données sauvegardées avec succès.\n");
  }


  mg_mgr_free(&mgr);
  biblio_free(&ma_biblio);

  printf("Fermeture propre. Au revoir !\n");
  return 0;
}
  

    
