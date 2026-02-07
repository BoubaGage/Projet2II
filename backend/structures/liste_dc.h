#pragma once 
#include <stddef.h>
#include "model.h"

typedef struct NoeudLivre{
    Livre data;

    struct NoeudLivre *noeudprev;
    struct NoeudLivre *noeudnext;


}NoeudLivre;

typedef struct ListeDC{
    NoeudLivre *head;
    NoeudLivre *tail;

    size_t count;

}ListeDC;

// --- PROTOTYPES DES FONCTIONS (Le Menu) ---

void liste_init(ListeDC *l);
NoeudLivre *liste_push_back(ListeDC *li, const Livre *livre);
NoeudLivre *liste_push_front(ListeDC *li, const Livre *livre);
Bool liste_is_empty(const ListeDC *li);
Bool liste_remove_node(ListeDC *li, NoeudLivre *node);
void liste_clear(ListeDC *li);
void liste_print(const ListeDC *li);