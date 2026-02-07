#(cc)=gcc $(cc)

main: main.c
	gcc -o test $(mysql_config --cflags) main.c $(mysql_config --libs)

connexion: connexion.c
	gcc -c connexion.c

inscription: inscription.c
	gcc -c inscription.c

all: connexion.c inscription.c menu.c
	gcc -c connexion.c inscription.c menu.c

clean:
	rm -f *.o