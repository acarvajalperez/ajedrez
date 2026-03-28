#include <iostream>
#include <unordered_map>
#include <mutex>
#include <random>
#include <memory>
#include "httplib.h"
#include "json.hpp"
#include "engine/Game.h"
#include "engine/Search.h"

using json = nlohmann::json;

// --- Gestor de Partidas Multi-Sesión ---
std::unordered_map<std::string, std::shared_ptr<Game>> active_games;
std::mutex games_mutex;

std::string generate_game_id() {
    static const char alphanum[] = "0123456789abcdefghijklmnopqrstuvwxyz";
    std::string id;
    std::random_device rd;
    std::mt19937 mt(rd());
    std::uniform_int_distribution<int> dist(0, 35);
    for (int i = 0; i < 12; ++i) {
        id += alphanum[dist(mt)];
    }
    return id;
}

std::shared_ptr<Game> get_game(const std::string& id) {
    std::lock_guard<std::mutex> lock(games_mutex);
    if (active_games.find(id) != active_games.end()) {
        return active_games[id];
    }
    return nullptr;
}

int main() {
    // Cargar Precomputaciones del Universo Cuántico (Look-up tables)
    init_leaper_attacks();
    init_zobrist();

    httplib::Server svr;

    // --- CORS Configurates ---
    auto set_cors = [](httplib::Response& res) {
        res.set_header("Access-Control-Allow-Origin", "*");
        res.set_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.set_header("Access-Control-Allow-Headers", "Content-Type");
    };

    svr.Options(R"(.*)", [&](const httplib::Request&, httplib::Response& res) {
        set_cors(res);
        res.status = 204;
    });

    // Endpoint: Obtener estado del juego
    svr.Get("/state", [&](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        std::string gameId = req.has_param("id") ? req.get_param_value("id") : "";
        auto game = get_game(gameId);
        
        if (!game) {
            res.status = 404;
            return;
        }

        json j;
        j["fen"] = game->getFEN();
        
        json history = json::array();
        for (const auto& m : game->getHistory()) {
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

    // Endpoint: Realizar Movimiento
    svr.Post("/move", [&](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        try {
            auto j = json::parse(req.body);
            std::string gameId = j.value("gameId", "");
            auto game = get_game(gameId);
            if (!game) { res.status = 404; return; }

            int fromRow = j["fromRow"];
            int fromCol = j["fromCol"];
            int toRow = j["toRow"];
            int toCol = j["toCol"];
            
            std::string promotion = j.value("promotion", "");
            
            bool success = game->makeMove(fromRow, fromCol, toRow, toCol, promotion);
            
            json resp;
            resp["success"] = success;
            resp["fen"] = game->getFEN();
            res.set_content(resp.dump(), "application/json");
        } catch (...) {
            res.status = 400;
        }
    });
    
    // Endpoint: Movimiento de la IA
    svr.Post("/play", [&](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        
        int time_ms = 1500;
        int num_threads = 4;
        std::string gameId = "";
        
        try {
            if (!req.body.empty()) {
                auto j = json::parse(req.body);
                gameId = j.value("gameId", "");
                if (j.contains("time")) time_ms = j["time"];
                if (j.contains("threads")) num_threads = j["threads"];
            }
        } catch(...) {}

        auto game = get_game(gameId);
        if (!game) { res.status = 404; return; }
        
        BitboardEngine engine;
        engine.parse_fen(game->getFEN());
        
        int best_move = search_best_move(engine, time_ms, num_threads);
        
        json resp;
        if (best_move == 0) {
            resp["success"] = false;
        } else {
            int source = get_move_source(best_move);
            int target = get_move_target(best_move);
            int promoted = get_move_promoted(best_move);
            
            std::string promo = "";
            if (promoted == Q || promoted == q) promo = "q";
            else if (promoted == R || promoted == r) promo = "r";
            else if (promoted == B || promoted == b) promo = "b";
            else if (promoted == N || promoted == n) promo = "n";
            
            game->makeMove(source / 8, source % 8, target / 8, target % 8, promo);
            
            resp["success"] = true;
            resp["fen"] = game->getFEN();
        }
        res.set_content(resp.dump(), "application/json");
    });

    // Endpoint: Nueva Partida
    svr.Post("/reset", [&](const httplib::Request& req, httplib::Response& res) {
        set_cors(res);
        std::string custom_fen = "";
        
        try {
            if (!req.body.empty()) {
                auto j = json::parse(req.body);
                custom_fen = j.value("fen", "");
            }
        } catch(...) {}
        
        std::string new_id = generate_game_id();
        auto new_game = std::make_shared<Game>();
        if (!custom_fen.empty()) {
            new_game->setFEN(custom_fen);
        }
        {
            std::lock_guard<std::mutex> lock(games_mutex);
            active_games[new_id] = new_game;
        }
        
        json resp;
        resp["success"] = true;
        resp["fen"] = new_game->getFEN();
        resp["gameId"] = new_id;
        res.set_content(resp.dump(), "application/json");
    });

    std::cout << "Starting Multi-Session Engine on http://localhost:8080" << std::endl;
    svr.listen("0.0.0.0", 8080);

    return 0;
}
