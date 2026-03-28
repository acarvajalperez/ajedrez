#include "Search.h"
#include "Attacks.h"
#include <iostream>
#include <algorithm>
#include <chrono>
#include <thread>
#include <vector>
#include <atomic>
#include <mutex>

const int piece_values[12] = { 100, 300, 300, 500, 900, 10000, -100, -300, -300, -500, -900, -10000 };
const int pawn_pst[64] = { 0,0,0,0,0,0,0,0, 50,50,50,50,50,50,50,50, 10,10,20,30,30,20,10,10, 5,5,10,25,25,10,5,5, 0,0,0,20,20,0,0,0, 5,-5,-10,0,0,-10,-5,5, 5,10,10,-20,-20,10,10,5, 0,0,0,0,0,0,0,0 };
const int knight_pst[64] = { -50,-40,-30,-30,-30,-30,-40,-50, -40,-20,0,0,0,0,-20,-40, -30,0,10,15,15,10,0,-30, -30,5,15,20,20,15,5,-30, -30,0,15,20,20,15,0,-30, -30,5,10,15,15,10,5,-30, -40,-20,0,5,5,0,-20,-40, -50,-40,-30,-30,-30,-30,-40,-50 };

inline int mirror_score(int sq) { return sq ^ 56; }

// --- 1. ZOBRIST HASH & TRANSPOSITION TABLE ---
U64 piece_keys[12][64];
U64 enpassant_keys[64];
U64 castle_keys[16];
U64 side_key;

U64 get_random_U64() {
    static U64 state = 1804289383ULL;
    state ^= state >> 12;
    state ^= state << 25;
    state ^= state >> 27;
    return state * 2685821657736338717ULL;
}

void init_zobrist() {
    for (int p=0; p<12; p++) for(int i=0; i<64; i++) piece_keys[p][i] = get_random_U64();
    for (int i=0; i<64; i++) enpassant_keys[i] = get_random_U64();
    for (int i=0; i<16; i++) castle_keys[i] = get_random_U64();
    side_key = get_random_U64();
}

U64 generate_hash_key(BitboardEngine& engine) {
    U64 final_key = 0;
    for (int p=0; p<12; p++) {
        U64 bitboard = engine.piece_bitboards[p];
        while (bitboard) {
            int sq = get_ls1b_index(bitboard);
            pop_bit(bitboard, sq);
            final_key ^= piece_keys[p][sq];
        }
    }
    if (engine.enpassant_square != -1) final_key ^= enpassant_keys[engine.enpassant_square];
    final_key ^= castle_keys[engine.castle_rights];
    if (engine.side_to_move == 1) final_key ^= side_key;
    return final_key;
}

const int HASH_EXACT = 0;
const int HASH_ALPHA = 1;
const int HASH_BETA = 2;

struct TTEntry {
    uint64_t key;
    int depth;
    int value;
    int flag;
};

// 4 Millones de entradas de Memoria Caché para evitar re-evaluar futuros repetidos
const int TT_SIZE = 4000000;
TTEntry tt_table[TT_SIZE];
std::mutex tt_mutex[1024]; // Grid de Mutexes Stripeados para evitar colisiones 16-bits

// Telemetría Atómica Global
std::atomic<long long> global_nodes_searched(0);
std::atomic<bool> smp_time_out(false);

thread_local long long nodes_searched = 0;

void clear_tt() {
    for(int i=0; i<TT_SIZE; i++) {
        tt_table[i].key = 0; tt_table[i].depth = 0; tt_table[i].value = 0; tt_table[i].flag = 0;
    }
}

int read_tt(uint64_t key, int depth, int alpha, int beta) {
    int index = key % TT_SIZE;
    std::lock_guard<std::mutex> lock(tt_mutex[index % 1024]);
    if (tt_table[index].key == key && tt_table[index].depth >= depth) {
        if (tt_table[index].flag == HASH_EXACT) return tt_table[index].value;
        if (tt_table[index].flag == HASH_ALPHA && tt_table[index].value <= alpha) return alpha;
        if (tt_table[index].flag == HASH_BETA && tt_table[index].value >= beta) return beta;
    }
    return 100000;
}

void write_tt(uint64_t key, int depth, int value, int flag) {
    int index = key % TT_SIZE;
    std::lock_guard<std::mutex> lock(tt_mutex[index % 1024]);
    tt_table[index].key = key;
    tt_table[index].depth = depth;
    tt_table[index].value = value;
    tt_table[index].flag = flag;
}

// --- 2. MOTOR DE EVALUACIÓN ---
int evaluate(BitboardEngine& engine) {
    int score = 0;
    U64 p = engine.piece_bitboards[P]; while(p) { int sq = get_ls1b_index(p); pop_bit(p, sq); score += piece_values[P] + pawn_pst[sq]; }
    U64 n = engine.piece_bitboards[N]; while(n) { int sq = get_ls1b_index(n); pop_bit(n, sq); score += piece_values[N] + knight_pst[sq]; }
    U64 b = engine.piece_bitboards[B]; while(b) { int sq = get_ls1b_index(b); pop_bit(b, sq); score += piece_values[B] + 10; }
    U64 r = engine.piece_bitboards[R]; while(r) { int sq = get_ls1b_index(r); pop_bit(r, sq); score += piece_values[R]; }
    U64 q = engine.piece_bitboards[Q]; while(q) { int sq = get_ls1b_index(q); pop_bit(q, sq); score += piece_values[Q]; }
    U64 k = engine.piece_bitboards[K]; while(k) { int sq = get_ls1b_index(k); pop_bit(k, sq); score += piece_values[K]; }

    U64 p_b = engine.piece_bitboards[::p]; while(p_b) { int sq = get_ls1b_index(p_b); pop_bit(p_b, sq); score += piece_values[::p] - pawn_pst[mirror_score(sq)]; }
    U64 n_b = engine.piece_bitboards[::n]; while(n_b) { int sq = get_ls1b_index(n_b); pop_bit(n_b, sq); score += piece_values[::n] - knight_pst[mirror_score(sq)]; }
    U64 b_b = engine.piece_bitboards[::b]; while(b_b) { int sq = get_ls1b_index(b_b); pop_bit(b_b, sq); score += piece_values[::b] - 10; }
    U64 r_b = engine.piece_bitboards[::r]; while(r_b) { int sq = get_ls1b_index(r_b); pop_bit(r_b, sq); score += piece_values[::r]; }
    U64 q_b = engine.piece_bitboards[::q]; while(q_b) { int sq = get_ls1b_index(q_b); pop_bit(q_b, sq); score += piece_values[::q]; }
    U64 k_b = engine.piece_bitboards[::k]; while(k_b) { int sq = get_ls1b_index(k_b); pop_bit(k_b, sq); score += piece_values[::k]; }

    return engine.side_to_move == 0 ? score : -score;
}

// Lógica Killer Heuristic Global (Bases de Datos de Jugadas Asesinas aisladas por Core)
thread_local int killer_moves[64][2] = {{0}};

void sort_moves(MoveList& move_list, int ply) {
    int scores[256] = {0};
    for (int i = 0; i < move_list.count; i++) {
        int move = move_list.moves[i];
        if (get_move_capture(move)) scores[i] = 10000;
        else if (get_move_promoted(move)) scores[i] = 9000;
        else {
            // Si es un Asesino Silencioso de esta Muerte Alternativa, pruébalo antes
            if (ply < 64 && move == killer_moves[ply][0]) scores[i] = 8000;
            else if (ply < 64 && move == killer_moves[ply][1]) scores[i] = 7000;
            else scores[i] = 0;
        }
    }
    for (int i = 0; i < move_list.count - 1; i++) {
        for (int j = i + 1; j < move_list.count; j++) {
            if (scores[j] > scores[i]) {
                std::swap(scores[i], scores[j]);
                std::swap(move_list.moves[i], move_list.moves[j]);
            }
        }
    }
}

int quiescence(BitboardEngine& engine, int alpha, int beta, int ply) {
    int stand_pat = evaluate(engine);
    if (stand_pat >= beta) return beta;
    if (alpha < stand_pat) alpha = stand_pat;
    
    MoveList move_list;
    generate_all_moves(engine, move_list);
    sort_moves(move_list, ply);
    
    for (int i = 0; i < move_list.count; i++) {
        int move = move_list.moves[i];
        if (!get_move_capture(move) && !get_move_promoted(move)) continue;
        
        BitboardEngine clone = engine;
        if (!make_move_and_check_legality(clone, move)) continue;
        
        int score = -quiescence(clone, -beta, -alpha, ply + 1);
        if (score >= beta) return beta;
        if (score > alpha) alpha = score;
    }
    return alpha;
}

// Rama profunda Minimax Integrada (Alfa-Beta 2.0 + Killers + NMP + LMR)
int minimax(BitboardEngine& engine, int depth, int alpha, int beta, int ply, bool allow_null) {
    nodes_searched++; // Metrificador local del Thread
    if ((nodes_searched & 2047) == 0 && smp_time_out.load(std::memory_order_relaxed)) return alpha; // Válvula de Salida Global C++
    
    // Intercepción Transposicional: ¡Si este futuro ya se calculó en otra rama paralela, róbalo de la caché y sáltate calcular iteraciones enormes!
    U64 hash_key = generate_hash_key(engine);
    int tt_val = read_tt(hash_key, depth, alpha, beta);
    if (tt_val != 100000) return tt_val;

    if (depth <= 0) return quiescence(engine, alpha, beta, ply);
    
    int king_sq = get_ls1b_index(engine.piece_bitboards[engine.side_to_move == 0 ? K : k]);
    bool in_check = is_square_attacked_bb(engine, king_sq, engine.side_to_move ^ 1);

    // OPTIMIZACIÓN 1: Poda de Turno Nulo (NMP) 
    // Si no estamos en jaque, le regalamos 1 turno al rival pasándolo a él. Si aún así arrasamos... ¡Gg ez, cortamos la rama temporal!
    if (allow_null && depth >= 3 && !in_check && ply > 0) {
        BitboardEngine clone = engine;
        clone.side_to_move ^= 1; // Pasar Turno Forzoso
        clone.enpassant_square = -1;
        int score = -minimax(clone, depth - 1 - 2, -beta, -beta + 1, ply + 1, false);
        if (score >= beta) return beta;
    }
    
    MoveList move_list;
    generate_all_moves(engine, move_list);
    sort_moves(move_list, ply);
    
    int legal_moves = 0;
    int hash_flag = HASH_ALPHA;
    
    for (int i = 0; i < move_list.count; i++) {
        int move = move_list.moves[i];
        BitboardEngine clone = engine;
        
        if (!make_move_and_check_legality(clone, move)) continue;
        legal_moves++;
        
        int score = 0;
        
        // OPTIMIZACIÓN 2: Late Move Reductions (LMR)
        // Analizamos superficialmente los turnos menos probables de la parte abisal de la lista si son "tranquilos"
        if (depth >= 3 && legal_moves > 4 && !get_move_capture(move) && !get_move_promoted(move) && !in_check) {
            score = -minimax(clone, depth - 2, -alpha - 1, -alpha, ply + 1, true); // Search de Penalización
            if (score > alpha) {
                // Ups, resulta que la táctica oculta de la basura era buena. Toca recargar la nave pesada.
                score = -minimax(clone, depth - 1, -beta, -alpha, ply + 1, true); 
            }
        } else {
            // Camino convencional completo
            score = -minimax(clone, depth - 1, -beta, -alpha, ply + 1, true);
        }
        
        if (score >= beta) {
            // OPTIMIZACIÓN 3: Registrar Movimientos Asesinos ("Super-Ninjas") 
            // Si esta jugada "no capturable" causó un Corte Beta, recordémoslo universalmente a esta profundidad
            if (!get_move_capture(move) && ply < 64) {
                if (killer_moves[ply][0] != move) {
                    killer_moves[ply][1] = killer_moves[ply][0]; // Desplazar al Ninja B
                    killer_moves[ply][0] = move; // Registrar Nuevo Super Ninja A
                }
            }
            write_tt(hash_key, depth, beta, HASH_BETA); // Guardar fallo superior
            return beta;
        }
        if (score > alpha) {
            hash_flag = HASH_EXACT; // Mejoramos nuestra meta
            alpha = score;
        }
    }
    
    if (legal_moves == 0) {
        int king_sq = get_ls1b_index(engine.piece_bitboards[engine.side_to_move == 0 ? K : k]);
        if (is_square_attacked_bb(engine, king_sq, engine.side_to_move ^ 1)) {
            return -49000 + depth;
        }
        return 0;
    }
    
    // Guardar el Nodo Explorado en la Caché Ram (Recordado para el Futuro Diferido)
    write_tt(hash_key, depth, alpha, hash_flag);
    return alpha;
}

// Reloj C++ de Milisegundos
long long get_time_ms() {
    return std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::system_clock::now().time_since_epoch()).count();
}

// --- 3. BÚSQUEDA ITERATIVA POR TIEMPO (ITERATIVE DEEPENING) ---
// En lugar de exigir un 'Depth 4' a la fuerza, la IA pensará el máximo número de profundidades posibles hasta que suene la campana (eg: 2 segundos).
int search_best_move(BitboardEngine& engine, int time_limit_ms, int num_threads) {
    auto start_time = std::chrono::high_resolution_clock::now();
    smp_time_out.store(false, std::memory_order_relaxed);
    global_nodes_searched.store(0, std::memory_order_relaxed);
    nodes_searched = 0;
    
    clear_tt(); // Purgar la caché anterior
    
    // Fallback de seguridad
    if (num_threads <= 0) num_threads = 1;
    
    std::cout << "[Lazy SMP] Disparando red neuronal en enjambre con " << num_threads << " threads de CPU físicos...\n";
    
    std::vector<std::thread> workers;
    
    // Iniciar Esclavos Paralelos
    for (int t = 1; t < num_threads; t++) {
        workers.emplace_back([engine, time_limit_ms, t]() {
            nodes_searched = 0; // Local
            for(int k=0; k<64; k++) { killer_moves[k][0] = 0; killer_moves[k][1] = 0; }
            BitboardEngine local_engine = engine;
            
            for (int depth = 1 + (t % 2); depth <= 64; depth++) {
                if (smp_time_out.load(std::memory_order_relaxed)) break;
                
                int alpha = -100000;
                int beta = 100000;
                MoveList move_list;
                generate_all_moves(local_engine, move_list);
                sort_moves(move_list, 0);
                
                // Modificación estadística: Cada core altera levemente su primera jugada revisada para crear universos alternos asíncronos en el Hash
                if (move_list.count > 1) {
                    int swap_idx = (t * 7) % move_list.count;
                    std::swap(move_list.moves[0], move_list.moves[swap_idx]);
                }
                
                for (int i = 0; i < move_list.count; i++) {
                    if (smp_time_out.load(std::memory_order_relaxed)) break;
                    int move = move_list.moves[i];
                    BitboardEngine clone = local_engine;
                    if (!make_move_and_check_legality(clone, move)) continue;
                    
                    int score = -minimax(clone, depth - 1, -beta, -alpha, 1, true);
                    if (score > alpha) alpha = score;
                }
            }
            global_nodes_searched.fetch_add(nodes_searched, std::memory_order_relaxed);
        });
    }

    // Algoritmo Alpha Hilo Principal
    int best_move = 0;
    int max_depth_reached = 0;
    
    for (int depth = 1; depth <= 64; depth++) {
        int current_best_move = 0;
        int alpha = -100000;
        int beta = 100000;
        
        MoveList move_list;
        generate_all_moves(engine, move_list);
        sort_moves(move_list, 0); // El move ordering es clave aquí
        
        for (int i = 0; i < move_list.count; i++) {
            auto current_time = std::chrono::high_resolution_clock::now();
            int elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(current_time - start_time).count();
            
            if (elapsed > time_limit_ms) {
                smp_time_out.store(true, std::memory_order_relaxed); // Detener TODO el Enjambre Core
                break;
            }
            
            int move = move_list.moves[i];
            BitboardEngine clone = engine;
            if (!make_move_and_check_legality(clone, move)) continue;
            
            int score = -minimax(clone, depth - 1, -beta, -alpha, 1, true);
            
            if (score > alpha) {
                alpha = score;
                current_best_move = move;
            }
        }
        
        if (smp_time_out.load(std::memory_order_relaxed)) break;
        if (current_best_move != 0) {
            best_move = current_best_move;
            max_depth_reached = depth;
        }
    }
    
    // Parada forzosa y Sincronismo
    smp_time_out.store(true, std::memory_order_relaxed);
    for (auto& t : workers) {
        if (t.joinable()) t.join();
    }
    
    global_nodes_searched.fetch_add(nodes_searched, std::memory_order_relaxed);
    auto end_time = std::chrono::high_resolution_clock::now();
    int ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
    
    long long final_nodes = global_nodes_searched.load();
    
    // Cálculo Dinámico de Consumo de Bytes
    int tt_used = 0;
    for (int i = 0; i < TT_SIZE; i++) {
        if (tt_table[i].key != 0) tt_used++;
    }
    
    double ram_mb = (tt_used * sizeof(TTEntry)) / (1024.0 * 1024.0);
    double max_ram = (TT_SIZE * sizeof(TTEntry)) / (1024.0 * 1024.0);
    
    std::cout << "\n=============================================\n";
    std::cout << "👾 IA MULTI-CORE LAZY SMP TERMINADA\n";
    std::cout << "Núcleos Físicos Activos              : " << num_threads << " threads asíncronos\n";
    std::cout << "Profundidad Real Horizontal          : " << max_depth_reached << " niveles de futuro\n";
    std::cout << "Nodos Totales Explorados por RAM     : " << final_nodes << " tableros analizados\n";
    std::cout << "RAM Constreñida (Transposition TT)   : " << ram_mb << " MB (" << tt_used << " llaves únicas)\n";
    std::cout << "Velocidad Combinada de la CPU        : " << (ms > 0 ? (final_nodes / ms) * 1000 : 0) << " Nodos Per Second (NPS)\n";
    std::cout << "=============================================\n\n";
    
    return best_move;
}
