.PHONY: all run clean

# Program
PROG_NAME = serveur_biblio
PROG_DIR  = backend
PROG      = $(PROG_DIR)/$(PROG_NAME)

# Compiler
CC     = gcc
CFLAGS = -Wall -Wextra -g -I. -Ibackend -Ibackend/structures

# Sources
SRCS = backend/server.c \
       backend/bibliotheque.c \
       backend/fichiers.c \
       backend/structures/hash_table.c \
       backend/structures/liste_dc.c \
       mongoose.c

# OS-specific settings
ifeq ($(OS),Windows_NT)
  EXE          = .exe
  PROG         := $(PROG)$(EXE)
  LIBS         = -lws2_32
  SHELL        := cmd.exe
  .SHELLFLAGS  := /C
  RUN_CMD      := .\backend\$(PROG_NAME)$(EXE)
  CLEAN_FILES  := $(subst /,\\,$(PROG)) *.o backend\*.o backend\structures\*.o
  RM           := del /f /q
else
  LIBS         =
  RUN_CMD      := ./$(PROG)
  CLEAN_FILES  := $(PROG) *.o backend/*.o backend/structures/*.o
  RM           := rm -f
endif

# Default target
all: $(PROG)

# Build
$(PROG): $(SRCS)
	$(CC) $(CFLAGS) $(SRCS) -o $(PROG) $(LIBS)

# Run
run: all
	$(RUN_CMD)

# Clean
clean:
	-$(RM) $(CLEAN_FILES)