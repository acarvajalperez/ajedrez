#ifndef GAME_H
#define GAME_H

#include "Board.h"
#include <vector>

class Game {
    Board board;
    std::vector<Move> history;
public:
    Game();
    void reset();
    void setFEN(const std::string& fen);
    Board getBoard() const;
    bool makeMove(int fromRow, int fromCol, int toRow, int toCol, std::string promotion = "");
    std::string getFEN() const;
    std::vector<Move> getHistory() const;
};

#endif
