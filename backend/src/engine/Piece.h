#ifndef PIECE_H
#define PIECE_H

enum class Color { White, Black };

enum class PieceType { Pawn, Knight, Bishop, Rook, Queen, King, None };

struct Piece {
    PieceType type = PieceType::None;
    Color color = Color::White;

    bool isEmpty() const { return type == PieceType::None; }
};

struct Move {
    int fromRow, fromCol;
    int toRow, toCol;
    PieceType promotion; // None if not promotion
    bool isCapture = false;
};

#endif
