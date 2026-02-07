#pragma once 

#include "liste_dc.h"

#define TABLE_SIZE 200

typedef struct HashTable {
    ListeDC *table;
    int count;
} HashTable;

// --- PROTOTYPES DES FONCTIONS ---

unsigned int hash_func(const char *titre);
void hash_init(HashTable *hash_t);
void hash_insert(HashTable *hash_t, const Livre *livre);
ListeDC *hash_get_bucket(HashTable *hash_t, const char *titre);
void hash_free(HashTable *hash_t);
void hash_print(const HashTable *hash_t);
void hash_remove(HashTable *hash_t, const char *titre);
void hash_update(HashTable *hash_t, const char *titre, const Livre *new_info);
Livre *hash_search_value(HashTable *hash_t, const char *titre);