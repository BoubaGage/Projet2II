#pragma once 

#include "hash_table.h"
#include "model.h"
#include <stddef.h>

typedef struct Bibliotheque {
    HashTable table;
    size_t nb_livres;
}Bibliotheque;

// --- FONCTIONS À IMPLÉMENTER ---

void biblio_init(Bibliotheque *bibli);
void biblio_free(Bibliotheque *bibli);

void biblio_add(Bibliotheque *bibli, const Livre *livre);
Livre *biblio_search(Bibliotheque *bibli, const char *titre);
Bool biblio_emprunter(Bibliotheque *bibli, const char *titre);
Bool biblio_retour(Bibliotheque *bibli, const char *titre);
size_t biblio_count(const Bibliotheque *bibli);
void biblio_display(const Bibliotheque *bibli);
void biblio_display_categorie(const Bibliotheque *bibli, const char *categ_search);
void biblio_remove(Bibliotheque *bibli, const char *titre);
void biblio_save(const Bibliotheque *bibli, const char *nom_fichier);
void biblio_load(Bibliotheque *bibli, const char *nom_fichier);
char *biblio_to_json(const Bibliotheque *bibli);


