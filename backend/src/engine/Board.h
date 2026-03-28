#ifndef BOARD_H
#define BOARD_H

#include "Piece.h"
#include <vector>
#include <string>

class Board {
public:
    Piece grid[8][8];
    Color turnToMove;

    Board();
    void resetToInitialState();
    Piece getPiece(int row, int col) const;
    void setPiece(int row, int col, Piece p);
    void movePiece(const Move& m);
    std::string toFEN() const;

    bool castlingK = true;
    bool castlingQ = true;
    bool castlingk = true;
    bool castlingq = true;

    std::string enPassantTarget = "-";

private:
    bool isSquareAttacked(int row, int col, Color byColor) const;
};

#endif
