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
  
    char ligne[1024];
    while (fgets(ligne, sizeof(ligne), fichier)) {
        nouvelle_ligne(ligne);
        
        if (strlen(ligne) == 0)
            continue;

        Livre livre;
        memset(&livre, 0, sizeof(Livre)); 

       
        int emprunte = 0;
if (sscanf(ligne, "%d|%[^|]|%[^|]|%d|%[^|]|%[^|]|%d",
           &livre.id, livre.titre, livre.auteur,
           &livre.annee, livre.categorie, livre.fichier,
           &emprunte) == 7) {
    livre.est_emprunte = (emprunte == 1) ? VRAI : FAUX;
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

      fprintf(fichier, "%d|%s|%s|%d|%s|%s|%d\n", 
              livre->id, livre->titre, livre->auteur, 
              livre->annee, livre->categorie, livre->fichier,
              livre->est_emprunte);
      actuel = actuel->noeudnext;
    }
  }
  
  fclose(fichier);
  return VRAI;
}