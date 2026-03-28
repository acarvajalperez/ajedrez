#ifndef SEARCH_H
#define SEARCH_H

#include "MoveGen.h"

// Las neuronas de la evaluación material. Cuánto vale cada cascarón de bits.
extern const int piece_values[12];

// Generador de llaves primarias cuánticas
void init_zobrist();

int evaluate(BitboardEngine& engine);
int minimax(BitboardEngine& engine, int depth, int alpha, int beta, int ply, bool allow_null);

// Expone el mejor movimiento a React basado en TIEMPO MÁXIMO en milisegundos y Cores
int search_best_move(BitboardEngine& engine, int time_limit_ms, int num_threads);

// Decodificador visual para humanos (Opcional, para debuggear A2A4)
void print_move(int move);

#endif // SEARCH_H
