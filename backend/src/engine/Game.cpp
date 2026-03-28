#include "Game.h"

Game::Game() {
    reset();
}

void Game::reset() {
    board.resetToInitialState();
    initialFEN = board.toFEN();
    history.clear();
}

void Game::setFEN(const std::string& fen) {
    board.parseFEN(fen);
    initialFEN = fen;
    history.clear();
}

Board Game::getBoard() const {
    return board;
}

bool Game::makeMove(int fromRow, int fromCol, int toRow, int toCol, std::string promotion) {
    PieceType promoType = PieceType::None;
    if (promotion == "q") promoType = PieceType::Queen;
    else if (promotion == "r") promoType = PieceType::Rook;
    else if (promotion == "b") promoType = PieceType::Bishop;
    else if (promotion == "n") promoType = PieceType::Knight;
    
    Move m = {fromRow, fromCol, toRow, toCol, promoType, false, ""};
    board.movePiece(m);
    m.fen_after = board.toFEN();
    history.push_back(m);
    return true;
}

bool Game::undoMove() {
    if (history.empty()) return false;
    history.pop_back();
    board.parseFEN(initialFEN);
    std::vector<Move> temp_history = history;
    history.clear();
    for(size_t i = 0; i < temp_history.size(); i++) {
        board.movePiece(temp_history[i]);
        history.push_back(temp_history[i]);
    }
    return true;
}

std::string Game::getFEN() const {
    return board.toFEN();
}

std::vector<Move> Game::getHistory() const {
    return history;
}

void Game::setPlayerInfo(const std::string& name, const std::string& email) {
    playerName = name;
    playerEmail = email;
}

std::string Game::getPlayerName() const {
    return playerName;
}

std::string Game::getPlayerEmail() const {
    return playerEmail;
}
