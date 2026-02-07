#include "liste_dc.h"
#include <stdlib.h>
#include <stdio.h>

void liste_init(ListeDC *li) {
li->head= NULL;
li->tail = NULL;
li->count = 0;
}

Bool liste_is_empty(const ListeDC *li) {
    return (li == NULL || li->count == 0) ? VRAI : FAUX;
}

NoeudLivre *liste_push_back(ListeDC *li, const Livre *livre) {
    if(li == NULL || livre  == NULL)
        return NULL ;

    NoeudLivre *new_node = malloc (sizeof (NoeudLivre));
    if (new_node == NULL)
        return NULL;

    new_node->data = *livre;
    new_node -> noeudprev = li->tail;
    new_node -> noeudnext = NULL; 

    if(liste_is_empty(li)){
     li->head = new_node;
     li->tail = new_node;   
    }
    else {
        li->tail->noeudnext = new_node;
        li->tail = new_node;
    }
    li->count++;
    return new_node;
}

NoeudLivre *liste_push_front(ListeDC *li, const Livre *livre) {
    if(li == NULL || livre  == NULL)
         return NULL ;

    NoeudLivre *new_node = malloc(sizeof(NoeudLivre));
    if (new_node == NULL)
        return NULL;
    new_node->data = *livre;
    new_node->noeudnext = li->head;
    new_node->noeudprev = NULL;


    if (liste_is_empty(li)){
        li->head = new_node;
        li->tail = new_node;
    }

    else {
        li->head->noeudprev = new_node;
        li->head = new_node;
    }
    li->count++;
    return new_node;
}

Bool liste_remove_node(ListeDC *li, NoeudLivre *node){
    if (li == NULL || node == NULL || liste_is_empty(li))
        return FAUX;
    
    if (node->noeudprev!=NULL){
        node->noeudprev->noeudnext = node->noeudnext;
    }
    else{
        li->head = node->noeudnext;
    }

    if (node->noeudnext!=NULL) {
        node->noeudnext->noeudprev = node->noeudprev;
    }
    else {
        li->tail = node->noeudprev;
    }

    li->count--;
    free(node);

    return VRAI;
}

void liste_clear(ListeDC *li){
   if (li == NULL)
        return;
    while (!liste_is_empty(li)){
        liste_remove_node(li, li->head);
    }
}

void liste_print(const ListeDC *li){
    if (li == NULL || liste_is_empty(li)){
        printf("La liste est vide.\n");
        return;
    }
    NoeudLivre *actuel = li->head;
    printf("=== CONTENU DE LA BIBLIOTHEQUE (%zu livres) ===\n", li->count);

    while (actuel != NULL){
printf("Id: %d |- %s (Auteur: %s) annee: %d | Categorie: %s\n", actuel->data.id, actuel->data.titre, actuel->data.auteur, actuel->data.annee, actuel->data.categorie);
        actuel = actuel->noeudnext;
    }
    printf("==============================================\n");
}


