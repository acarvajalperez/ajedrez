#ifndef MOVEGEN_H
#define MOVEGEN_H

#include "Bitboard.h"
#include "Attacks.h"

// Usaremos un único entero de 32 bits (int) para almacenar ABSOLUTAMENTE toda la información de un movimiento.
// En vez de tener "estructuras" enormes de objetos que ahogan la RAM en millones de iteraciones de la IA, 
// compactamos cada bit individual:
// Bits 0-5   (6 bits): Casilla Origen (0-63)
// Bits 6-11  (6 bits): Casilla Destino (0-63)
// Bits 12-15 (4 bits): Pieza real que se está moviendo (0-11)
// Bits 16-19 (4 bits): Pieza a la que promociona, si la hubiera
// Bit 20     (1 bit) : ¿Fue una captura?
// Bit 21     (1 bit) : ¿Doble salto de Peón?
// Bit 22     (1 bit) : ¿Captura Al Paso mágica?
// Bit 23     (1 bit) : ¿Fue un enroque?

#define encode_move(source, target, piece, promoted, capture, double_push, enpassant, castling) \
    ((source) | ((target) << 6) | ((piece) << 12) | ((promoted) << 16) | ((capture) << 20) | ((double_push) << 21) | ((enpassant) << 22) | ((castling) << 23))

#define get_move_source(move)     ((move) & 0x3f)
#define get_move_target(move)     (((move) >> 6) & 0x3f)
#define get_move_piece(move)      (((move) >> 12) & 0xf)
#define get_move_promoted(move)   (((move) >> 16) & 0xf)
#define get_move_capture(move)    (((move) >> 20) & 1)
#define get_move_double(move)     (((move) >> 21) & 1)
#define get_move_enpassant(move)  (((move) >> 22) & 1)
#define get_move_castling(move)   (((move) >> 23) & 1)

// Funciones ensamblador intrínsecas (Atómicas del procesador)
// Esto cuenta cuántos bits hay a la derecha del bit de encendido usando "Count Trailing Zeros" (CTZ)
// Es la forma en la que convertimos una placa plana U64 a la coordenada "A4" sin cruzar la matriz ni usar un bucle `for`
static inline int get_ls1b_index(U64 bitboard) {
    if (bitboard) return __builtin_ctzll(bitboard);
    return -1;
}

// Cuenta cuántos 1s tiene un bloque cuántico (Ej. cuántos Peones hay vivos) en 1 ciclo
static inline int count_bits(U64 bitboard) {
    return __builtin_popcountll(bitboard);
}

// Una lista de movimientos ligera como una pluma para pasarla a MiniMax Arrays
class MoveList {
public:
    int moves[256]; // Ajedrez nunca supera las 256 jugadas posibles teóricas
    int count;
    MoveList() : count(0) {}
    inline void add_move(int move) {
        moves[count++] = move;
    }
};

// El inyector balístico: Lee tus posiciones y expulsa miles de posibilidades legales codificadas
void generate_all_moves(BitboardEngine& engine, MoveList& move_list);
bool is_square_attacked_bb(BitboardEngine& engine, int square, int side);
bool make_move_and_check_legality(BitboardEngine& engine, int move);

#endif // MOVEGEN_H
