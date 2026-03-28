#include "Game.h"

Game::Game() {
    reset();
}

void Game::reset() {
    board.resetToInitialState();
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
    
    Move m = {fromRow, fromCol, toRow, toCol, promoType, false};
    board.movePiece(m);
    history.push_back(m);
    return true;
}

std::string Game::getFEN() const {
    return board.toFEN();
}

std::vector<Move> Game::getHistory() const {
    return history;
}
