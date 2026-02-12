#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "bibliotheque.h"

void biblio_init(Bibliotheque *bibli){
    if (bibli == NULL)
        return;
    hash_init(&bibli->table);
    bibli->nb_livres = 0;
}

void biblio_free(Bibliotheque *bibli){
    if (bibli == NULL)
    return;
    hash_free(&bibli->table);
    bibli->nb_livres = 0;
}

void biblio_add(Bibliotheque *bibli, const Livre *livre){
    if (bibli == NULL || livre == NULL) return;
    hash_insert(&bibli->table, livre);
    bibli->nb_livres++;
    printf("Le livre '%s' a ete ajoute a la bibliotheque.\n", livre->titre);
}

Livre *biblio_search(Bibliotheque *bibli, const char *titre){
    if (bibli == NULL || titre == NULL)
        return NULL;
    return hash_search_value(&bibli->table, titre);
}

Bool biblio_emprunter(Bibliotheque *bibli, const char *titre){
    
    Livre *emprunt = biblio_search(bibli, titre);
    if (emprunt == NULL){
        printf("Livre non trouver : %s\n", titre);
        return FAUX;
    }
    if (emprunt->est_emprunte == VRAI){
        printf("Livre deja emprunter : %s\n", titre);
        return FAUX;
    }
    emprunt->est_emprunte = VRAI;
    printf("Vous venez d'emprunter le livre : %s. Bonne lecture !!\n",titre);
    return VRAI;
}

Bool biblio_retour(Bibliotheque *bibli, const char *titre){
    Livre *retourne = biblio_search(bibli, titre);
    if (retourne == NULL){
        printf("Livre non trouver : %s\n", titre);
        return FAUX;
    }
    if (retourne->est_emprunte == FAUX){
        printf("Vous n'avez pas emprunter de livre : %s\n", titre);
        return FAUX;
    }
    retourne->est_emprunte = FAUX;
    printf("Merci d'avoir retourner le livre : %s!\n", titre);
    return VRAI;
}

size_t biblio_count(const Bibliotheque *bibli){
    if (bibli == NULL)
        return 0;
    
    return bibli->nb_livres;
}

void biblio_display(const Bibliotheque *bibli){
    if (bibli == NULL) {
        printf("Erreur : Bibliotheque inexistante.\n");
        return;
    }

    printf("\n========== ETAT DE LA BIBLIOTHEQUE ==========\n");
    printf("Nombre total de livres : %zu\n", biblio_count(bibli));
    printf("==============================================\n");

    hash_print(&bibli->table);
}

void biblio_display_categorie(const Bibliotheque *bibli, const char *categ_search){
    if (bibli == NULL || categ_search == NULL) return;

    printf("\n========== LIVRES DE LA CATEGORIE : %s ==========\n", categ_search);
    Bool found = FAUX;

    for (int i = 0; i < TABLE_SIZE; i++) {
        NoeudLivre *actuel = bibli->table.table[i].head;
        while (actuel != NULL) {
            if (_stricmp(actuel->data.categorie, categ_search) == 0) {
                printf("ID: %d | Titre: %s | Auteur: %s | Annee: %d | Emprunte: %s\n",
                    actuel->data.id,
                    actuel->data.titre,
                    actuel->data.auteur,
                    actuel->data.annee,
                    actuel->data.est_emprunte ? "Oui" : "Non");
                found = VRAI;
            }
            actuel = actuel->noeudnext;
        }
    }
    if (!found){
        printf("Aucun livre trouve dans la categorie : %s\n", categ_search);
    }
    printf("==============================================\n");
}


void biblio_remove(Bibliotheque *bibli, const char *titre){
    if (bibli == NULL || titre == NULL)
        return;
    Livre *livre = biblio_search(bibli, titre);
    if (livre == NULL){
        printf("Livre non trouver : %s\n",titre);
        return;
    }
    hash_remove(&bibli->table, titre);
    bibli->nb_livres--;

    printf("Le livre '%s' a ete supprime de la bibliotheque.\n", titre);
}
void biblio_save(const Bibliotheque *bibli, const char *nom_fichier){
    if (bibli == NULL || nom_fichier == NULL)
        return;
    FILE *fichier = fopen(nom_fichier,"w");
    if (fichier == NULL){
        printf("Erreur lors de la creation du fichier : %s\n", nom_fichier);
        return;
    }
    for (int i = 0; i < TABLE_SIZE; i++){
        NoeudLivre *actuel = bibli->table.table[i].head;
        while (actuel != NULL){
            fprintf(fichier, "%d;%s;%s;%d;%s;%s;%d;%s;%s\n",
                actuel->data.id,
                actuel->data.titre,
                actuel->data.auteur,
                actuel->data.annee,
                actuel->data.categorie,
                actuel->data.fichier,
                actuel->data.est_emprunte,
                actuel->data.description,
                actuel->data.couverture);
            actuel = actuel->noeudnext;
        }
    }
    fclose(fichier);
    printf("La bibliotheque a ete sauvegardee dans le fichier: %s\n", nom_fichier);
}

void biblio_load(Bibliotheque *bibli, const char *nom_fichier){
    if (bibli == NULL || nom_fichier == NULL)
        return;
    FILE *fichier = fopen(nom_fichier, "r");
    if (fichier == NULL){
        printf("Aucun fichier de sauvegarde trouve: %s\n", nom_fichier);
        return;
    }
    char ligne[4096];
    int livre_count = 0;
    while (fgets(ligne, sizeof(ligne),fichier)){
        ligne[strcspn(ligne, "\r\n")] = '\0';
        Livre nouv_livre;
        memset(&nouv_livre, 0, sizeof(Livre));

        char desc[512] = "";
        char couv[256] = "";
        int emprunte = 0;
        int n = sscanf(ligne, "%d;%[^;];%[^;];%d;%[^;];%[^;];%d;%[^;];%[^;]",
            &nouv_livre.id,
            nouv_livre.titre,
            nouv_livre.auteur,
            &nouv_livre.annee,
            nouv_livre.categorie,
            nouv_livre.fichier,
            &emprunte,
            desc,
            couv);

        if (n >= 7) {
            nouv_livre.est_emprunte = (emprunte == 1) ? VRAI : FAUX;
            if (n >= 8) {
                strncpy(nouv_livre.description, desc, sizeof(nouv_livre.description) - 1);
                nouv_livre.description[sizeof(nouv_livre.description) - 1] = '\0';
            }
            if (n >= 9) {
                strncpy(nouv_livre.couverture, couv, sizeof(nouv_livre.couverture) - 1);
                nouv_livre.couverture[sizeof(nouv_livre.couverture) - 1] = '\0';
            }
            biblio_add(bibli, &nouv_livre);
            livre_count++;
        }
    }
    fclose(fichier);
    printf("La bibliotheque a ete chargee a partir du fichier: %s\n", nom_fichier);
}
char *biblio_to_json(const Bibliotheque *bibli){
    if (bibli == NULL)
        return NULL;
    size_t taille_max = (bibli->nb_livres * 900) + 1024;
    char *json = malloc(taille_max);
    if (json == NULL)
        return NULL;
    
    strcpy(json,"[\n");
    Bool premier_livre = VRAI;

    for (int i = 0; i < TABLE_SIZE; i++){
        NoeudLivre *actuel = bibli->table.table[i].head;

        while(actuel != NULL){
            if (!premier_livre){
                strcat(json, ",\n");
            }
            char livre_json[4096];
           snprintf(livre_json, sizeof(livre_json),
  "  {\n"
  "    \"id\": %d,\n"
  "    \"titre\": \"%s\",\n"
  "    \"auteur\": \"%s\",\n"
  "    \"annee\": %d,\n"
  "    \"categorie\": \"%s\",\n"
  "    \"fichier\": \"%s\",\n"
  "    \"est_emprunte\": %s,\n"
  "    \"description\": \"%s\",\n"
  "    \"couverture\": \"%s\"\n"
  "  }",
  actuel->data.id,
  actuel->data.titre,
  actuel->data.auteur,
  actuel->data.annee,
  actuel->data.categorie,
  actuel->data.fichier,
  actuel->data.est_emprunte ? "true" : "false",
  actuel->data.description,
  actuel->data.couverture);

            strcat(json, livre_json);
            premier_livre = FAUX;
            actuel = actuel->noeudnext;
        }
    }

    strcat(json, "\n]");
    return json;
}
