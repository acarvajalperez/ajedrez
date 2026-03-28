#ifndef GAME_H
#define GAME_H

#include "Board.h"
#include <vector>

class Game {
    Board board;
    std::vector<Move> history;
    std::string initialFEN;
    std::string playerName;
    std::string playerEmail;
public:
    Game();
    void reset();
    void setFEN(const std::string& fen);
    Board getBoard() const;
    bool makeMove(int fromRow, int fromCol, int toRow, int toCol, std::string promotion = "");
    bool undoMove();
    std::string getFEN() const;
    std::vector<Move> getHistory() const;
    
    void setPlayerInfo(const std::string& name, const std::string& email);
    std::string getPlayerName() const;
    std::string getPlayerEmail() const;
};

#endif
