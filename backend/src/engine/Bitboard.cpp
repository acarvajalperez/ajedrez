#include "Bitboard.h"
#include <iostream>

BitboardEngine::BitboardEngine() {
    reset_engine();
}

void BitboardEngine::reset_engine() {
    for (int piece = 0; piece < 12; piece++) {
        piece_bitboards[piece] = 0ULL;
    }
    occupancies[0] = 0ULL;
    occupancies[1] = 0ULL;
    occupancies[2] = 0ULL;
    
    side_to_move = 0; // 0 para Blanco, 1 para Negro
    enpassant_square = -1; // -1 significa no hay estado al paso activo
    castle_rights = 0;
}

int BitboardEngine::char_to_piece(char c) {
    switch (c) {
        case 'P': return 0; case 'N': return 1; case 'B': return 2; case 'R': return 3; case 'Q': return 4; case 'K': return 5;
        case 'p': return 6; case 'n': return 7; case 'b': return 8; case 'r': return 9; case 'q': return 10; case 'k': return 11;
        default: return -1;
    }
}

// Convertir el FEN Universal a un sistema atómico binario
void BitboardEngine::parse_fen(std::string fen) {
    reset_engine();
    
    int square = 0;
    int idx = 0;
    
    // Parseo Geométrico: Traduce filas humanas y columnas a índices del Bitboard 0 al 63
    while (idx < fen.size() && fen[idx] != ' ') {
        char c = fen[idx];
        if (c >= '1' && c <= '8') {
            int empty = c - '0';
            square += empty;
        } else if (c == '/') {
            // Sáltalo
        } else {
            int piece = char_to_piece(c);
            if (piece != -1) {
                // En un Bitboard estándar, la casilla a8 (Row 0, Col 0) es el bit 0. El h1 (Row 7 Col 7) es el 63
                set_bit(piece_bitboards[piece], square);
                square++;
            }
        }
        idx++;
    }
    
    // Construir la ocupación galáctica
    for (int p = 0; p < 6; p++) occupancies[0] |= piece_bitboards[p]; // Todas las Blancas
    for (int p = 6; p < 12; p++) occupancies[1] |= piece_bitboards[p]; // Todas las Negras
    occupancies[2] = occupancies[0] | occupancies[1]; // Toda la materia del tablero junta en 64 bits
    
    // Parseo de Estado (Turno, enroques, al paso) 
    idx++; // Espacio
    if (idx < fen.size()) {
        side_to_move = (fen[idx] == 'w') ? 0 : 1;
        idx += 2;
    }
    
    while (idx < fen.size() && fen[idx] != ' ') {
        char c = fen[idx];
        if (c == 'K') castle_rights |= 8;
        if (c == 'Q') castle_rights |= 4;
        if (c == 'k') castle_rights |= 2;
        if (c == 'q') castle_rights |= 1;
        idx++;
    }
    
    idx++; // Espacio
    if (idx < fen.size() && fen[idx] != '-') {
        int file = fen[idx] - 'a';
        int rank = 8 - (fen[idx + 1] - '0');
        enpassant_square = rank * 8 + file;
    }
}

// Interfaz humana de debugging: Pintar la matriz atómica generada en consola
void BitboardEngine::print_board() {
    std::cout << "\n\n   Arquitectura Bitboard Cargada (Impresión Humana)\n";
    for (int rank = 0; rank < 8; rank++) {
        std::cout << 8 - rank << "   ";
        for (int file = 0; file < 8; file++) {
            int square = rank * 8 + file;
            int current_piece = -1;
            
            for (int p = 0; p < 12; p++) {
                if (get_bit(piece_bitboards[p], square)) {
                    current_piece = p;
                    break;
                }
            }
            
            if (current_piece == -1) std::cout << ". ";
            else {
                char pieces[] = "PNBRQKpnbrqk";
                std::cout << pieces[current_piece] << " ";
            }
        }
        std::cout << "\n";
    }
    std::cout << "    a b c d e f g h\n";
    std::cout << "    Turno actual: " << (side_to_move == 0 ? "Blanco" : "Negro") << "\n";
}
