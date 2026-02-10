#include "hash_table.h"
#include <stdlib.h>
#include <string.h>
#include <stdio.h>
void hash_init(HashTable *hash_t){
    if (hash_t == NULL)
        return;
    hash_t->table = malloc(sizeof(ListeDC)*TABLE_SIZE);
    hash_t->count = 0;
    for (int i = 0; i < TABLE_SIZE; i++) {
        liste_init(&hash_t->table[i]);
    }
}

// DJB2 hash function
unsigned int hash_func(const char *titre){
    unsigned long hash = 5381;
    int c;
    while ((c = *titre++)){
        hash = ((hash << 5) + hash) + c;
    }
        return  hash % TABLE_SIZE;
}

void hash_insert(HashTable *hash_t, const Livre *livre){
    if (hash_t == NULL || livre == NULL)
        return;
    unsigned int index = hash_func(livre->titre);
    
    liste_push_back (&hash_t->table[index],livre);

hash_t->count++;
}
ListeDC *hash_get_bucket(HashTable *hash_t, const char *titre){
    if (hash_t == NULL || titre == NULL)
        return NULL;
    unsigned int index = hash_func(titre);
    return &hash_t->table[index];
}
void hash_free(HashTable *hash_t){
    if (hash_t == NULL)
        return;
    for (int i = 0; i < TABLE_SIZE;i++){
        liste_clear(&hash_t->table[i]);
    }
    free(hash_t->table);
    hash_t->count = 0;
}

void hash_print(const HashTable *hash_t) {
    if (hash_t == NULL) return;

    for (int i = 0; i < TABLE_SIZE; i++) { 
        if (hash_t->table[i].head != NULL) { 
            printf("Index %d:\n", i);
            liste_print(&hash_t->table[i]);
            printf("----------------\n");
        }
    }
}

void hash_remove(HashTable *hash_t, const char *titre){
    if (hash_t == NULL || titre == NULL)
    return;
    unsigned int index = hash_func(titre);
    NoeudLivre *actuel = hash_t->table[index].head;
    while (actuel != NULL){
        if (strcmp (actuel->data.titre, titre) == 0){
            liste_remove_node(&hash_t->table [index],actuel);
            hash_t->count--;
            return;
        }
        actuel = actuel->noeudnext;
    }
}

void hash_update(HashTable *hash_t, const char *titre, const Livre *new_info) {
    if (hash_t == NULL || titre == NULL || new_info == NULL) {
        return;
    }

Livre *existant = hash_search_value(hash_t, titre);

if (existant != NULL) {
    existant->id = new_info->id;
    strncpy(existant->titre, new_info->titre, sizeof(existant->titre) - 1);
    existant->titre[sizeof(existant->titre) - 1] = '\0';
    strncpy(existant->auteur, new_info->auteur, sizeof(existant->auteur) - 1);
    existant->auteur[sizeof(existant->auteur) - 1] = '\0';
    existant->annee = new_info->annee;
    strncpy(existant->categorie, new_info->categorie, sizeof(existant->categorie) - 1);
    existant->categorie[sizeof(existant->categorie) - 1] = '\0';
    strncpy(existant->fichier, new_info->fichier, sizeof(existant->fichier) - 1);
    existant->fichier[sizeof(existant->fichier) - 1] = '\0';
    existant->est_emprunte = new_info->est_emprunte;
    strncpy(existant->description, new_info->description, sizeof(existant->description) - 1);
    existant->description[sizeof(existant->description) - 1] = '\0';
    strncpy(existant->couverture, new_info->couverture, sizeof(existant->couverture) - 1);
    existant->couverture[sizeof(existant->couverture) - 1] = '\0';
}

}

Livre *hash_search_value(HashTable *hash_t, const char *titre){
    if (hash_t == NULL || titre == NULL)
        return NULL;
    unsigned int index = hash_func(titre);
    NoeudLivre *actuel = hash_t->table[index].head;
    while (actuel != NULL){
        if (strcmp(actuel->data.titre, titre)==0){
            return &(actuel->data);
        }
        actuel = actuel ->noeudnext;
    }
    return NULL;
}
