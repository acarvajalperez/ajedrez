#ifndef ATTACKS_H
#define ATTACKS_H

#include "Bitboard.h" // U64 and macros

// Base de Datos Táctica (Look-up Tables) Pre-Computados
extern U64 pawn_attacks[2][64]; // [color][casilla_origen]
extern U64 knight_attacks[64];  // 64 casillas del tablero
extern U64 king_attacks[64];    // 64 casillas del tablero

// Rayos de visión dinámica (Sliders: Rey, Alfil, Dama)
// Se detienen en caso de cruzarse con una colisión (block)
U64 get_bishop_attacks(int square, U64 block);
U64 get_rook_attacks(int square, U64 block);
U64 get_queen_attacks(int square, U64 block);

// Función masiva que se ejecutará solo 1 vez al iniciar el servidor
// Llena los arrays de arriba con las 64 máscaras atómicas 
void init_leaper_attacks();

#endif // ATTACKS_H
