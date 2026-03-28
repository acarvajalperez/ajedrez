#ifndef BITBOARD_H
#define BITBOARD_H

#include <cstdint>
#include <string>
#include <vector>
#include <iostream>

// El núcleo mágico: U64 representa las 64 casillas del ajedrez
typedef uint64_t U64;

// Macros intrínsecas para manipular la placa base de bits a velocidades subatómicas
#define set_bit(bitboard, square) ((bitboard) |= (1ULL << (square)))
#define get_bit(bitboard, square) ((bitboard) & (1ULL << (square)))
#define pop_bit(bitboard, square) ((bitboard) &= ~(1ULL << (square)))

enum {
    P, N, B, R, Q, K, p, n, b, r, q, k
};

class BitboardEngine {
public:
    BitboardEngine();
    
    // Las 12 capas de memoria fotónica del universo del Ajedrez
    // Índices FEN: P, N, B, R, Q, K (0-5 Blancas) | p, n, b, r, q, k (6-11 Negras)
    U64 piece_bitboards[12];
    
    // Capas de ocupación binaria masiva (Blancas, Negras, Toda la Materia)
    U64 occupancies[3];
    
    // Variables de Estado Compactas
    int side_to_move; 
    int enpassant_square; // 0 a 63, o "vacífico" si no hay flag.
    int castle_rights;    // 4 Bits: KQkq
    
    // Motor Cuántico
    void parse_fen(std::string fen);
    void print_board();
    
private:
    // Helpers internos C++
    void reset_engine();
    int char_to_piece(char c);
};

#endif // BITBOARD_H
