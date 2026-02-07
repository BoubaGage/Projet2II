#include <stdio.h>
#include <stdlib.h>

void ajout(char titre[30], char categorie[25], char id_a[5]){
	printf("\n**********************Ajout Livre***********************\n");
	printf("Titre      : ");
	scanf("%s",titre);
	printf("categorie  : ");
	scanf("%s", categorie);
    printf("id auteur  : ");
	scanf("%s", id_a);
}