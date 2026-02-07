#pragma once

#include <stddef.h>

typedef enum {
  FAUX = 0,
  VRAI = 1
} Bool;

typedef struct Livre {
  int id;
  char titre[128];
  char auteur[128];
  int annee;
  char categorie[64];
  char fichier[256];
  Bool est_emprunte;
} Livre;
