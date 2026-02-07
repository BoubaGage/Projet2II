#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <my_global.h>
#include <mysql.h>
#include "connexion.c"
#include "menu.c"
#include "inscription.c"
#include "../header/fonctions.h"


int main(int argc, char **argv)
{
	char pwd[20]="", email[25]="", nm[25]="", pnm[25]="", id_u[5]="";
	char titre[30]="", id_l[5]="", categorie[25]="", id_a[5]="";
	int choix=0, rec=0, rec1=0, aut=0;
	

	MYSQL mysql;
	mysql_init(&mysql);
	mysql_options(&mysql,MYSQL_READ_DEFAULT_GROUP,"option");

	MYSQL_RES *result = NULL;
    MYSQL_ROW row;
	
	unsigned int i = 0;
    unsigned int num_champs = 0;

	if(mysql_real_connect(&mysql,"localhost","root","premier12","biblio",0,NULL,0))
	{
		printf("\n**********************BiblioNum*********************** \n");
		
		while (aut != 1 && aut !=2 && aut != 3){
			printf("\n******************************************************\n");
			printf("\n 1- Admin\n 2- Lecteurs\n 3- Quitter\nEntrez votre choix : ");
			scanf("%d", &aut);
		}

		if (aut == 1){
			while (rec != 1 && rec != 99){

				while (choix != 1 && choix !=2 && choix != 3){
					printf("\n******************************************************\n");
					printf(" 1- Se connecter\n 2- Quitter\nEntrez votre choix : ");
					scanf("%d", &choix);
				}
				
				if (choix == 1){
					
					printf("\n*******************ADMINISTRATEUR*********************\n");
					//Connexion
					connexion(pwd, email);

					//Composition Requête
					char querys[200] = "SELECT id_ad, nm_ad, pnm_ad FROM administrateur WHERE email_ad=\"";		
					strcat(querys,email);
					strcat(querys,"\" AND pwd_ad=\"");
					strcat(querys,pwd);
					strcat(querys,"\"");
					
					//Execution Requête
					mysql_query(&mysql, querys);
					result = mysql_use_result(&mysql);
					if (row = mysql_fetch_row(result)){
						strcat(id_u, row[0]);
						strcat(nm, row[1]);
						strcat(pnm, row[2]);
						printf("\n*****************Bienvenue %s %s!***************\n",pnm,nm);
						rec = 1;
					}else{
						printf("\nErreur d'authentification.....!\n");
					}
					mysql_free_result(result);

				}else{
					rec=99;
				}
			}
		}else if (aut == 2){
			while (rec != 1 && rec != 99){

				while (choix != 1 && choix !=2 && choix != 3){
					printf("\n******************************************************\n");
					printf(" 1- Se connecter\n 2- S'inscrire\n 3- Quitter\nEntrez votre choix : ");
					scanf("%d", &choix);
				}
				
				if (choix == 1){
					
					printf("\n**********************UTILISATEUR***********************\n");
					//Connexion
					connexion(pwd, email);

					//Composition Requête
					char querys[200] = "SELECT id_u, nm_u, pnm_u FROM utilisateur WHERE email_u=\"";		
					strcat(querys,email);
					strcat(querys,"\" AND pwd_u=\"");
					strcat(querys,pwd);
					strcat(querys,"\"");
					
					//Execution Requête
					mysql_query(&mysql, querys);
					result = mysql_use_result(&mysql);
					if (row = mysql_fetch_row(result)){
						strcat(id_u, row[0]);
						strcat(nm, row[1]);
						strcat(pnm, row[2]);
						printf("\n*****************Bienvenue %s %s!***************\n",pnm,nm);
						rec = 1;
					}else{
						printf("\nErreur d'authentification.....!\n");
					}
					mysql_free_result(result);

				} else if (choix == 2){

					//inscription utilisateurs
					inscription(pwd, email, nm, pnm);
					
					//Composition Requête
					char querys[500];	
					sprintf(querys, "INSERT INTO utilisateur(nm_u, pnm_u, pwd_u, email_u) VALUES ('%s', '%s', '%s', '%s')", nm, pnm, pwd, email);
					//Execution Requête
					mysql_query(&mysql, querys);

					//Vérification de l'inscription
					printf("\n**********Inscription reussi ! Veuillez vous connecter!***********\n");
					
					choix=0;
				}
				else{
					rec=99;
				}
			}
		}
		
		choix=0;

		if (rec==1 && aut==1){ //administrateur connecté
			while( rec1 != 1 && rec1 != 99){

				while (choix != 1 && choix !=2 && choix != 3 && choix != 4 && choix != 5 && choix != 6 && choix != 7){
					printf("\n**********************Menu Admin***********************\n");
					printf(" 1- Voir les livres\n 2- Ajouter des livres\n 3- Nombre emprunts par emprunteur\n 4- Livre triés selon nombre d'emprunt\n 5- Les Livres empruntés (non disponibles)\n 6- Liste des abonnés\n 7- Quitter\nEntrez votre choix : ");
					scanf("%d", &choix);
				}

				if (choix == 1){ //********FONCTION VOIR LES LIVRES*********
					printf("\n**********************Les Livres***********************\n");
					//Composition Requête
					char querys[50];
					sprintf(querys,"SELECT id_li, titre_li, categorie FROM livre");
						
					//Execution Requête
					mysql_query(&mysql, querys);
					
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);
					choix=0;
				
				}else if (choix == 2){ //******* FONCTION ajout livre*********
					//ajout livre
					ajout(titre,categorie,id_a);
					
					//Composition Requête ajout
					char querys[500];	
					sprintf(querys, "INSERT INTO livre(titre_li, categorie, id_auth) VALUES ('%s', '%s', '%s')", titre, categorie, id_a);
					
					//Execution Requête
					mysql_query(&mysql, querys);

					//Vérification de l'ajout
					printf("\n***************Ajout reussi ! ***************\n");
					
					choix=0;
				}
				else if (choix == 3){ //******Nombre emprunts par emprunteur*********
					printf("\n**************Nombre d'emprunts par emprunteur******************\n");
					//Composition Requête
					char querys[200]="";
					strcat(querys, "SELECT utilisateur.id_u, utilisateur.nm_u, utilisateur.pnm_u, COUNT(emprunt.id_us) FROM utilisateur, emprunt WHERE emprunt.id_us = utilisateur.id_u GROUP BY utilisateur.id_u");
					mysql_query(&mysql, querys);
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);
					choix=0;
				}
				else if (choix == 4){ //*****Livre triés selon emprunt*********
					printf("\n**************Livres triés selon leurs nombre d'emprunt***************\n");
					//Composition Requête
					char querys[250]="";
					strcat(querys, "SELECT livre.id_li, livre.titre_li, livre.categorie, COUNT(emprunt.id_l) FROM livre, emprunt WHERE livre.id_li = emprunt.id_l GROUP BY livre.id_li ORDER BY COUNT(emprunt.id_l) DESC");
					mysql_query(&mysql, querys);
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);
					choix=0;
				}
				else if (choix == 5){
					printf("\n****************Les Livres empruntés (non disponibles)******************\n");
					//Composition Requête
					char querys[250];
					sprintf(querys,"SELECT livre.id_li, livre.titre_li, utilisateur.nm_u, utilisateur.pnm_u, emprunt.date_fin FROM livre, emprunt, utilisateur WHERE emprunt.date_fin >= NOW() AND livre.id_li = emprunt.id_l AND utilisateur.id_u = emprunt.id_us");	
					//Execution Requête
					mysql_query(&mysql, querys);
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);
					choix=0;
				}
				else if (choix == 6){ //****** Liste des emprunteur********
					//affiche les livres encore disponible
					printf("\n*******************Liste des abonnés********************\n");
					//Composition Requête
					char querys[100]="";
					sprintf(querys, "SELECT id_u, nm_u, pnm_u FROM utilisateur");
					
					//Execution Requête
					mysql_query(&mysql, querys);
					
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);


					choix=0;  
				}
				else{
					rec1=99;
				}
			}
			
		}else if (rec==1 && aut==2){ // utilisateur connecté
			while( rec1 != 1 && rec1 != 99){
				
				while (choix != 1 && choix !=2 && choix != 3){
					printf("\n**********************Menu Lecteur***********************\n");
					printf(" 1- Voir mes livres\n 2- Voir & Emprunter des livres\n 3- Quitter\nEntrez votre choix : ");
					scanf("%d", &choix);
				}
				
				//*********FONCTION AFFICHE LIVRE EMPRUNTE*********
				if (choix == 1){
					//affiche les emprunt encore valide
					printf("\n*******************Les Livres emprunte (en cours)********************\n");
					//Composition Requête
					char querys[500]="";
					strcat(querys,"SELECT livre.id_li, livre.titre_li, livre.categorie, emprunt.date_emp, emprunt.date_fin FROM livre,");
					strcat(querys," emprunt WHERE emprunt.id_us =\"");
					strcat(querys,id_u);
					strcat(querys,"\" AND emprunt.id_l = livre.id_li AND emprunt.date_fin > CURDATE()");
						
					//Execution Requête
					mysql_query(&mysql, querys);
					
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);

					//affiche les emprunt restitué
					printf("\n************************Les Livres restitues*************************\n");
					//Composition Requête
					char querys2[500]="";
					strcat(querys2,"SELECT livre.id_li, livre.titre_li, livre.categorie, emprunt.date_emp, emprunt.date_fin FROM livre,");
					strcat(querys2," emprunt WHERE emprunt.id_us =\"");
					strcat(querys2,id_u);
					strcat(querys2,"\" AND emprunt.id_l = livre.id_li AND emprunt.date_fin < CURDATE()");
						
					//Execution Requête
					mysql_query(&mysql, querys2);
					
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result);
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);

					choix=0;
				}
				else if (choix == 2){ //*********FONCTION VOIR LES LIVRES ET EMPRUNTER*****
					//livres dispo
					printf("\n*********************** Tous les Livres ************************\n");
					//Composition Requête
					char querys[50];
					sprintf(querys,"SELECT id_li, titre_li, categorie FROM livre");
						
					//Execution Requête
					mysql_query(&mysql, querys);
					
					result = mysql_use_result(&mysql);
					num_champs = mysql_num_fields(result);
					while ((row = mysql_fetch_row(result)))
					{
						unsigned long *lengths;
						lengths = mysql_fetch_lengths(result); 
						for(i = 0; i < num_champs; i++)
						{
							printf("[%.*s]", (int) lengths[i], row[i] ? row[i] : "NULL");
						}
						printf("\n");
					}
					mysql_free_result(result);

					//emprunter
					char choix1[5]="";
					printf("\nChoisissez      : ");
					scanf("%s", choix1);
					
					char querys2[500]="";
					sprintf(querys2, "SELECT id_l FROM emprunt WHERE id_l=\"%s\" AND date_fin > NOW()", choix1);
					mysql_query(&mysql, querys2);
					result = mysql_use_result(&mysql);
					if (!(row = mysql_fetch_row(result))){
						//Composition Requête ajout
						char querys1[500]="";	
						strcat(querys1, "INSERT INTO emprunt(id_l,date_emp, date_fin, id_us) VALUES ('");
						strcat(querys1, choix1);
						strcat(querys1,"', NOW(), NOW()+INTERVAL 28 DAY, '");
						strcat(querys1, id_u);
						strcat(querys1,"')");
						
						//Execution Requête
						mysql_query(&mysql, querys1);

						//Vérification de l'ajout
						printf("\n***************Emprunt reussi ! ***************\n");
					}else{
						printf("\n***************Le livre n'est pas disponible ! ***************\n");
					}
					mysql_free_result(result);
					choix=0;
				}
				else{
					rec1=99;
				}
			}
		}

		printf("\n***************Au revoir et a bientot !**************** \n");

		//Fermeture de MySQL
		mysql_close(&mysql);
	}
	else
	{
		printf("Une erreur s'est produite lors de la connexion à la BDD!\n");
	}

	return 0;
}