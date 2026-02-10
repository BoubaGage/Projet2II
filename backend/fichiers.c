#include "fichiers.h"
#include "bibliotheque.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>


void nouvelle_ligne(char *s) {
    if (s == NULL) return;
    s[strcspn(s, "\r\n")] = '\0';
}

Bool fichiers_charger(Bibliotheque *bibli, const char *path) {
    if (bibli == NULL || path == NULL)
        return FAUX;

    FILE *fichier = fopen(path, "r");
    if (fichier == NULL)
        return FAUX; 
  
    char ligne[4096];
    while (fgets(ligne, sizeof(ligne), fichier)) {
        nouvelle_ligne(ligne);
        
        if (strlen(ligne) == 0)
            continue;

        Livre livre;
        memset(&livre, 0, sizeof(Livre)); 

        char desc[512] = "";
        char couv[256] = "";
        int emprunte = 0;
        int n = sscanf(ligne, "%d|%[^|]|%[^|]|%d|%[^|]|%[^|]|%d|%[^|]|%[^|]",
           &livre.id, livre.titre, livre.auteur,
           &livre.annee, livre.categorie, livre.fichier,
           &emprunte, desc, couv);

        if (n >= 7) {
            livre.est_emprunte = (emprunte == 1) ? VRAI : FAUX;
            if (n >= 8) {
                strncpy(livre.description, desc, sizeof(livre.description) - 1);
                livre.description[sizeof(livre.description) - 1] = '\0';
            }
            if (n >= 9) {
                strncpy(livre.couverture, couv, sizeof(livre.couverture) - 1);
                livre.couverture[sizeof(livre.couverture) - 1] = '\0';
            }
            biblio_add(bibli, &livre);
        }

    }

    fclose(fichier);
    return VRAI;
}

Bool fichiers_sauvegarder(const Bibliotheque *bibli, const char *path){
  if (bibli == NULL || path == NULL)
    return FAUX;
  FILE *fichier = fopen(path, "w");
  if (fichier == NULL) {
      printf("Erreur : Impossible de creer le fichier %s\n", path);
      return FAUX;
  }

 for (int i = 0; i < TABLE_SIZE; i++){ 
    NoeudLivre *actuel = bibli->table.table[i].head;

    while (actuel != NULL) { 
      Livre *livre = &actuel->data;

      fprintf(fichier, "%d|%s|%s|%d|%s|%s|%d|%s|%s\n", 
              livre->id, livre->titre, livre->auteur, 
              livre->annee, livre->categorie, livre->fichier,
              livre->est_emprunte, livre->description, livre->couverture);
      actuel = actuel->noeudnext;
    }
  }
  
  fclose(fichier);
  return VRAI;
}
