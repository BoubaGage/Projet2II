#include <stdio.h>
#include <stdlib.h>

void inscription(char pwd[10], char email[15], char nm[15], char pnm[15]){
	printf("\n**********************Insciption*********************\n");
	printf("Nom : 				 ");
	scanf("%s", nm);
	printf("Prenom : 			 ");
	scanf("%s", pnm);
	printf("E-mail : 			 ");
	scanf("%s", email);
	printf("Mots de passe : 		 ");
	scanf("%s", pwd);
}