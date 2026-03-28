#include "MoveGen.h"

// Validación del rey "Jaqueador" - Cruce masivo en una matriz inversa (Rayos y Saltos)
bool is_square_attacked_bb(BitboardEngine& engine, int square, int side) {
    // Escaner a través de Peones Oponentes 
    // Magia Negra: "Atacar" con un peón ciego desde `square` devolverá si alguna matriz enemiga lo pisa
    if ((side == 0) && (pawn_attacks[1][square] & engine.piece_bitboards[0])) return true;
    if ((side == 1) && (pawn_attacks[0][square] & engine.piece_bitboards[6])) return true;
    
    // Escaner a través de Caballos Oponentes
    if (knight_attacks[square] & ((side == 0) ? engine.piece_bitboards[1] : engine.piece_bitboards[7])) return true;
    // Escaner a través del Rey
    if (king_attacks[square]   & ((side == 0) ? engine.piece_bitboards[5] : engine.piece_bitboards[11])) return true;
    
    // Escaner Deslizantes (Sliding Magic) contra TODO el universo y cruzado con "enemigos disparadores"
    if (get_bishop_attacks(square, engine.occupancies[2]) & ((side == 0) ? (engine.piece_bitboards[2] | engine.piece_bitboards[4]) : (engine.piece_bitboards[8] | engine.piece_bitboards[10]))) return true;
    if (get_rook_attacks(square, engine.occupancies[2]) & ((side == 0) ? (engine.piece_bitboards[3] | engine.piece_bitboards[4]) : (engine.piece_bitboards[9] | engine.piece_bitboards[10]))) return true;
    
    return false;
}

// Helper masivo para no repetir código:
void generate_piece_moves(BitboardEngine& engine, MoveList& move_list, int piece, U64 attacks, int source) {
    U64 enemy = engine.occupancies[engine.side_to_move ^ 1];
    U64 empty = ~engine.occupancies[2];
    
    // Bucle instantáneo sobre todas las posibles víctimas (AND)
    U64 caps = attacks & enemy;
    while(caps) {
        int target = get_ls1b_index(caps);
        pop_bit(caps, target);
        move_list.add_move(encode_move(source, target, piece, 0, 1, 0, 0, 0));
    }
    
    // Bucle instantáneo sobre casillas estelares pacíficas (AND vacío)
    U64 quiets = attacks & empty;
    while(quiets) {
        int target = get_ls1b_index(quiets);
        pop_bit(quiets, target);
        move_list.add_move(encode_move(source, target, piece, 0, 0, 0, 0, 0));
    }
}

void generate_all_moves(BitboardEngine& engine, MoveList& move_list) {
    int side = engine.side_to_move;
    U64 empty = ~engine.occupancies[2];

    if (side == 0) { // BLANCAS
        U64 pawns = engine.piece_bitboards[P];
        while (pawns) {
            int source = get_ls1b_index(pawns);
            pop_bit(pawns, source);

            int target = source - 8;
            if (target >= 0 && get_bit(empty, target)) {
                if (target < 8) move_list.add_move(encode_move(source, target, P, Q, 0, 0, 0, 0)); // Promoción simple a Reina (simplificado)
                else {
                    move_list.add_move(encode_move(source, target, P, 0, 0, 0, 0, 0));
                    int double_target = source - 16;
                    if (source >= 48 && source <= 55 && get_bit(empty, double_target)) {
                        move_list.add_move(encode_move(source, double_target, P, 0, 0, 1, 0, 0));
                    }
                }
            }
            
            U64 attacks = pawn_attacks[0][source] & engine.occupancies[1];
            while(attacks) {
                int targ = get_ls1b_index(attacks);
                pop_bit(attacks, targ);
                if (targ < 8) move_list.add_move(encode_move(source, targ, P, Q, 1, 0, 0, 0));
                else move_list.add_move(encode_move(source, targ, P, 0, 1, 0, 0, 0));
            }

            // Detección de Captura al Paso (Blancas)
            if (engine.enpassant_square != -1) {
                U64 ep_mask = (1ULL << engine.enpassant_square);
                if (pawn_attacks[0][source] & ep_mask) {
                    move_list.add_move(encode_move(source, engine.enpassant_square, P, 0, 1, 0, 1, 0));
                }
            }
        }
        
        // El resto de la Legión (Macro Dinámico)
        U64 knights = engine.piece_bitboards[N]; while(knights) { int sq = get_ls1b_index(knights); pop_bit(knights, sq); generate_piece_moves(engine, move_list, N, knight_attacks[sq], sq); }
        U64 bishops = engine.piece_bitboards[B]; while(bishops) { int sq = get_ls1b_index(bishops); pop_bit(bishops, sq); generate_piece_moves(engine, move_list, B, get_bishop_attacks(sq, engine.occupancies[2]), sq); }
        U64 rooks   = engine.piece_bitboards[R]; while(rooks)   { int sq = get_ls1b_index(rooks);   pop_bit(rooks, sq);   generate_piece_moves(engine, move_list, R, get_rook_attacks(sq, engine.occupancies[2]), sq); }
        U64 queens  = engine.piece_bitboards[Q]; while(queens)  { int sq = get_ls1b_index(queens);  pop_bit(queens, sq);  generate_piece_moves(engine, move_list, Q, get_queen_attacks(sq, engine.occupancies[2]), sq); }
        U64 kings   = engine.piece_bitboards[K]; while(kings)   { int sq = get_ls1b_index(kings);   pop_bit(kings, sq);   generate_piece_moves(engine, move_list, K, king_attacks[sq], sq); }
        
    } else { // NEGRAS
        U64 pawns = engine.piece_bitboards[p];
        while (pawns) {
            int source = get_ls1b_index(pawns);
            pop_bit(pawns, source);

            int target = source + 8;
            if (target < 64 && get_bit(empty, target)) {
                if (target >= 56) move_list.add_move(encode_move(source, target, p, q, 0, 0, 0, 0));
                else {
                    move_list.add_move(encode_move(source, target, p, 0, 0, 0, 0, 0));
                    int double_target = source + 16;
                    if (source >= 8 && source <= 15 && get_bit(empty, double_target)) {
                        move_list.add_move(encode_move(source, double_target, p, 0, 0, 1, 0, 0));
                    }
                }
            }
            
            U64 attacks = pawn_attacks[1][source] & engine.occupancies[0];
            while(attacks) {
                int targ = get_ls1b_index(attacks);
                pop_bit(attacks, targ);
                if (targ >= 56) move_list.add_move(encode_move(source, targ, p, q, 1, 0, 0, 0));
                else move_list.add_move(encode_move(source, targ, p, 0, 1, 0, 0, 0));
            }

            // Detección de Captura al Paso (Negras)
            if (engine.enpassant_square != -1) {
                U64 ep_mask = (1ULL << engine.enpassant_square);
                if (pawn_attacks[1][source] & ep_mask) {
                    move_list.add_move(encode_move(source, engine.enpassant_square, p, 0, 1, 0, 1, 0));
                }
            }
        }
        
        U64 knights = engine.piece_bitboards[n]; while(knights) { int sq = get_ls1b_index(knights); pop_bit(knights, sq); generate_piece_moves(engine, move_list, n, knight_attacks[sq], sq); }
        U64 bishops = engine.piece_bitboards[b]; while(bishops) { int sq = get_ls1b_index(bishops); pop_bit(bishops, sq); generate_piece_moves(engine, move_list, b, get_bishop_attacks(sq, engine.occupancies[2]), sq); }
        U64 rooks   = engine.piece_bitboards[r]; while(rooks)   { int sq = get_ls1b_index(rooks);   pop_bit(rooks, sq);   generate_piece_moves(engine, move_list, r, get_rook_attacks(sq, engine.occupancies[2]), sq); }
        U64 queens  = engine.piece_bitboards[q]; while(queens)  { int sq = get_ls1b_index(queens);  pop_bit(queens, sq);  generate_piece_moves(engine, move_list, q, get_queen_attacks(sq, engine.occupancies[2]), sq); }
        U64 kings   = engine.piece_bitboards[k]; while(kings)   { int sq = get_ls1b_index(kings);   pop_bit(kings, sq);   generate_piece_moves(engine, move_list, k, king_attacks[sq], sq); }
    }
}

// Simulador "Cuántico": Ejecuta y comprueba si un movimiento dejaría al rey en jaque
// Como en C++ clonar los U64 es inmediato, clonamos el objeto y atacamos el FEN para ver el resultado
bool make_move_and_check_legality(BitboardEngine& engine, int move) {
    BitboardEngine clone = engine;
    
    int source = get_move_source(move);
    int target = get_move_target(move);
    int piece = get_move_piece(move);
    
    // Mover pieza del bitboard original
    pop_bit(clone.piece_bitboards[piece], source);
    set_bit(clone.piece_bitboards[piece], target);
    
    // Capturas (Iterar y fulminar en el bitboard oponente o al paso)
    if (get_move_enpassant(move)) {
        int ep_target = (clone.side_to_move == 0) ? target + 8 : target - 8;
        pop_bit(clone.piece_bitboards[clone.side_to_move == 0 ? p : P], ep_target);
    } else if (get_move_capture(move)) {
        int start = clone.side_to_move == 0 ? 6 : 0;
        int end = clone.side_to_move == 0 ? 11 : 5;
        for (int p_idx = start; p_idx <= end; p_idx++) {
            if (get_bit(clone.piece_bitboards[p_idx], target)) {
                pop_bit(clone.piece_bitboards[p_idx], target);
                break;
            }
        }
    }
    
    // Configurar siguiente objetivo fantasma
    if (get_move_double(move)) {
        clone.enpassant_square = (clone.side_to_move == 0) ? target + 8 : target - 8;
    } else {
        clone.enpassant_square = -1;
    }
    
    // Reconstruir galaxias
    clone.occupancies[0] = clone.occupancies[1] = clone.occupancies[2] = 0ULL;
    for (int p=0; p<6; p++) clone.occupancies[0] |= clone.piece_bitboards[p];
    for (int p=6; p<12; p++) clone.occupancies[1] |= clone.piece_bitboards[p];
    clone.occupancies[2] = clone.occupancies[0] | clone.occupancies[1];
    
    // Legalidad: Chequear nuestro propio Rey (si saltó o estorba a alguien)
    int king_sq = get_ls1b_index(clone.piece_bitboards[clone.side_to_move == 0 ? K : k]);
    if (is_square_attacked_bb(clone, king_sq, clone.side_to_move ^ 1)) {
        return false; // Ilegal, no podemos enviarlo
    }
    
    // Si la función sobrevive, actualizamos el modelo original y devolvemos éxito
    engine = clone;
    engine.side_to_move ^= 1;
    return true; 
}
