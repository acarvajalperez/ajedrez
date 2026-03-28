#include <iostream>
#include "httplib.h"
#include "json.hpp"
#include "engine/Game.h"
#include "engine/Search.h"

using json = nlohmann::json;

int main() {
    // Cargar Precomputaciones del Universo Cuántico (Look-up tables)
    init_leaper_attacks();
    init_zobrist();

    httplib::Server svr;
    Game game;

    // --- CORS Configurates ---
    svr.Options("/state", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });

    svr.Options("/move", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });
    
    svr.Options("/play", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });
    svr.Options("/reset", [](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
        res.status = 204;
    });

    // Endpoint to get game state
    svr.Get("/state", [&](const httplib::Request&, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        json j;
        j["fen"] = game.getFEN();
        
        json history = json::array();
        for (const auto& m : game.getHistory()) {
            json moveObj;
            moveObj["fromRow"] = m.fromRow;
            moveObj["fromCol"] = m.fromCol;
            moveObj["toRow"] = m.toRow;
            moveObj["toCol"] = m.toCol;
            history.push_back(moveObj);
        }
        j["history"] = history;
        
        res.set_content(j.dump(), "application/json");
    });

    // Endpoint to make a move
    svr.Post("/move", [&](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        try {
            auto j = json::parse(req.body);
            int fromRow = j["fromRow"];
            int fromCol = j["fromCol"];
            int toRow = j["toRow"];
            int toCol = j["toCol"];
            
            std::string promotion = "";
            if (j.contains("promotion")) {
                promotion = j["promotion"];
            }
            
            bool success = game.makeMove(fromRow, fromCol, toRow, toCol, promotion);
            
            json resp;
            resp["success"] = success;
            resp["fen"] = game.getFEN();
            res.set_content(resp.dump(), "application/json");
        } catch (const std::exception& e) {
            res.status = 400;
            res.set_content("Invalid JSON", "text/plain");
        }
    });
    
    // IA Endpoint (Cerebro Bitboard evaluador NegaMax)
    svr.Post("/play", [&game](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        
        int time_ms = 1500;
        int num_threads = 4;
        try {
            if (!req.body.empty()) {
                auto j = json::parse(req.body);
                if (j.contains("time")) time_ms = j["time"];
                if (j.contains("threads")) num_threads = j["threads"];
            }
        } catch(...) {} // Fallback seguro
        
        BitboardEngine engine;
        engine.parse_fen(game.getFEN());
        
        // Iterative Deepening Dinamico: Usamos los milisegundos inyectados por React
        int best_move = search_best_move(engine, time_ms, num_threads);
        
        json resp;
        if (best_move == 0) {
            resp["success"] = false; // Sin jugadas
        } else {
            int source = get_move_source(best_move);
            int target = get_move_target(best_move);
            int promoted = get_move_promoted(best_move);
            
            std::string promo = "";
            if (promoted == Q || promoted == q) promo = "q";
            else if (promoted == R || promoted == r) promo = "r";
            else if (promoted == B || promoted == b) promo = "b";
            else if (promoted == N || promoted == n) promo = "n";
            
            // Reinyectar el número 32-bits de vuelta al tablero antiguo para 
            // no romper ReactJS pero beneficiándonos del Bitboard para pensarlo:
            game.makeMove(source / 8, source % 8, target / 8, target % 8, promo);
            
            resp["success"] = true;
            resp["fen"] = game.getFEN();
        }
        res.set_content(resp.dump(), "application/json");
    });

    svr.Post("/reset", [&](const httplib::Request& req, httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        game.reset();
        json resp;
        resp["success"] = true;
        resp["fen"] = game.getFEN();
        res.set_content(resp.dump(), "application/json");
    });

    std::cout << "Starting server on http://localhost:8080" << std::endl;
    svr.listen("0.0.0.0", 8080);

    return 0;
}
