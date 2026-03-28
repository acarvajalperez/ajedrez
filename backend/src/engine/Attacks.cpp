#include "Attacks.h"

// Variables estáticas universales
U64 pawn_attacks[2][64];
U64 knight_attacks[64];
U64 king_attacks[64];

// Máscaras atómicas absolutas ("Constantes del Universo")
// Previenen que desplazamientos hacia la izquierda o derecha "crucen de lado" (Overflow)
const U64 not_a_file  = 18374403900871474942ULL; // 0xFEFEFEFEFEFEFEFE
const U64 not_h_file  = 9187201950435737471ULL;  // 0x7F7F7F7F7F7F7F7F
const U64 not_ab_file = 18229723555195321596ULL; // 0xFCFCFCFCFCFCFCFC
const U64 not_gh_file = 4557430888798830399ULL;  // 0x3F3F3F3F3F3F3F3F

// Generación Atómica Individual

U64 mask_pawn_attacks(int side, int square) {
    U64 attacks = 0ULL;
    U64 bitboard = 0ULL;
    set_bit(bitboard, square);

    // White pawn
    if (!side) {
        if ((bitboard >> 7) & not_a_file) attacks |= (bitboard >> 7);
        if ((bitboard >> 9) & not_h_file) attacks |= (bitboard >> 9);
    } 
    // Black pawn
    else {
        if ((bitboard << 7) & not_h_file) attacks |= (bitboard << 7);
        if ((bitboard << 9) & not_a_file) attacks |= (bitboard << 9);
    }
    return attacks;
}

U64 mask_knight_attacks(int square) {
    U64 attacks = 0ULL;
    U64 bitboard = 0ULL;
    set_bit(bitboard, square);

    if ((bitboard >> 17) & not_h_file) attacks |= (bitboard >> 17);
    if ((bitboard >> 15) & not_a_file) attacks |= (bitboard >> 15);
    if ((bitboard >> 10) & not_gh_file) attacks |= (bitboard >> 10);
    if ((bitboard >> 6)  & not_ab_file) attacks |= (bitboard >> 6);

    if ((bitboard << 17) & not_a_file) attacks |= (bitboard << 17);
    if ((bitboard << 15) & not_h_file) attacks |= (bitboard << 15);
    if ((bitboard << 10) & not_ab_file) attacks |= (bitboard << 10);
    if ((bitboard << 6)  & not_gh_file) attacks |= (bitboard << 6);

    return attacks;
}

U64 mask_king_attacks(int square) {
    U64 attacks = 0ULL;
    U64 bitboard = 0ULL;
    set_bit(bitboard, square);

    if (bitboard >> 8) attacks |= (bitboard >> 8);
    if ((bitboard >> 9) & not_h_file) attacks |= (bitboard >> 9);
    if ((bitboard >> 7) & not_a_file) attacks |= (bitboard >> 7);
    if ((bitboard >> 1) & not_h_file) attacks |= (bitboard >> 1);

    if (bitboard << 8) attacks |= (bitboard << 8);
    if ((bitboard << 9) & not_a_file) attacks |= (bitboard << 9);
    if ((bitboard << 7) & not_h_file) attacks |= (bitboard << 7);
    if ((bitboard << 1) & not_a_file) attacks |= (bitboard << 1);

    return attacks;
}

// LLenar todos los chips con anticipación
void init_leaper_attacks() {
    for (int square = 0; square < 64; square++) {
        pawn_attacks[0][square] = mask_pawn_attacks(0, square);
        pawn_attacks[1][square] = mask_pawn_attacks(1, square);
        knight_attacks[square] = mask_knight_attacks(square);
        king_attacks[square] = mask_king_attacks(square);
    }
}

// Las piezas de deslizamiento "Sliders" colisionan. La máscara base detecta bloqueos dinámicamente

U64 get_bishop_attacks(int square, U64 block) {
    U64 attacks = 0ULL;
    int r, c;
    int tr = square / 8;
    int tc = square % 8;

    for (r = tr + 1, c = tc + 1; r <= 7 && c <= 7; r++, c++) {
        attacks |= (1ULL << (r * 8 + c));
        if ((1ULL << (r * 8 + c)) & block) break; // Detenido por estrella/colisión
    }
    for (r = tr - 1, c = tc + 1; r >= 0 && c <= 7; r--, c++) {
        attacks |= (1ULL << (r * 8 + c));
        if ((1ULL << (r * 8 + c)) & block) break;
    }
    for (r = tr + 1, c = tc - 1; r <= 7 && c >= 0; r++, c--) {
        attacks |= (1ULL << (r * 8 + c));
        if ((1ULL << (r * 8 + c)) & block) break;
    }
    for (r = tr - 1, c = tc - 1; r >= 0 && c >= 0; r--, c--) {
        attacks |= (1ULL << (r * 8 + c));
        if ((1ULL << (r * 8 + c)) & block) break;
    }
    return attacks;
}

U64 get_rook_attacks(int square, U64 block) {
    U64 attacks = 0ULL;
    int r, c;
    int tr = square / 8;
    int tc = square % 8;

    for (r = tr + 1; r <= 7; r++) {
        attacks |= (1ULL << (r * 8 + tc));
        if ((1ULL << (r * 8 + tc)) & block) break;
    }
    for (r = tr - 1; r >= 0; r--) {
        attacks |= (1ULL << (r * 8 + tc));
        if ((1ULL << (r * 8 + tc)) & block) break;
    }
    for (c = tc + 1; c <= 7; c++) {
        attacks |= (1ULL << (tr * 8 + c));
        if ((1ULL << (tr * 8 + c)) & block) break;
    }
    for (c = tc - 1; c >= 0; c--) {
        attacks |= (1ULL << (tr * 8 + c));
        if ((1ULL << (tr * 8 + c)) & block) break;
    }
    return attacks;
}

U64 get_queen_attacks(int square, U64 block) {
    return get_bishop_attacks(square, block) | get_rook_attacks(square, block);
}
