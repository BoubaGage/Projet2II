#include <stdio.h>
#include <stdlib.h>

void connexion(char pwd[10], char email[15]){
	printf("\n**********************Connexion***********************\n");
	printf("Utilisateur   : ");
	scanf("%s",email);
	printf("Mots de passe : ");
	scanf("%s", pwd);
}