#include "Board.h"

Board::Board() {
    resetToInitialState();
}

void Board::resetToInitialState() {
    turnToMove = Color::White;
    castlingK = true;
    castlingQ = true;
    castlingk = true;
    castlingq = true;

    enPassantTarget = "-";

    // ... basic initialization ...
    for(int r=0; r<8; r++)
        for(int c=0; c<8; c++)
            grid[r][c] = {PieceType::None, Color::White};

    // Pawns
    for(int c=0; c<8; c++) {
        grid[1][c] = {PieceType::Pawn, Color::Black};
        grid[6][c] = {PieceType::Pawn, Color::White};
    }
    // Set pieces in standard order
    PieceType row[8] = {PieceType::Rook, PieceType::Knight, PieceType::Bishop, PieceType::Queen, 
                        PieceType::King, PieceType::Bishop, PieceType::Knight, PieceType::Rook};
    for(int c=0; c<8; c++) {
        grid[0][c] = {row[c], Color::Black};
        grid[7][c] = {row[c], Color::White};
    }
}

Piece Board::getPiece(int row, int col) const {
    if (row >= 0 && row < 8 && col >= 0 && col < 8) return grid[row][col];
    return {PieceType::None, Color::White};
}

void Board::setPiece(int row, int col, Piece p) {
    if (row >= 0 && row < 8 && col >= 0 && col < 8) grid[row][col] = p;
}

void Board::movePiece(const Move& m) {
    Piece p = grid[m.fromRow][m.fromCol];
    std::string newEnPassant = "-";
    
    if (m.promotion != PieceType::None) {
        p.type = m.promotion;
    }

    // En Passant capture execution
    if (p.type == PieceType::Pawn && m.fromCol != m.toCol && grid[m.toRow][m.toCol].type == PieceType::None) {
        // Diagonal pawn move to empty square MUST be en passant
        grid[m.fromRow][m.toCol] = {PieceType::None, Color::White};
    }

    // Track new en passant target for double pawn push
    if (p.type == PieceType::Pawn && std::abs(m.toRow - m.fromRow) == 2) {
        char file = 'a' + m.fromCol;
        char rank = '8' - (m.fromRow + m.toRow) / 2;
        newEnPassant = "";
        newEnPassant += file;
        newEnPassant += rank;
    }

    // Castling logic: Move the rook alongside the king
    if (p.type == PieceType::King && std::abs(m.toCol - m.fromCol) == 2) {
        bool kingside = m.toCol > m.fromCol;
        int rookFromCol = kingside ? 7 : 0;
        int rookToCol = kingside ? 5 : 3;
        
        Piece rook = grid[m.fromRow][rookFromCol];
        grid[m.fromRow][rookFromCol] = {PieceType::None, Color::White};
        grid[m.fromRow][rookToCol] = rook;
    }

    grid[m.fromRow][m.fromCol] = {PieceType::None, Color::White};
    grid[m.toRow][m.toCol] = p;
    turnToMove = (turnToMove == Color::White) ? Color::Black : Color::White;
    enPassantTarget = newEnPassant;
    
    // Invalidate castling rights
    if (p.type == PieceType::King) {
        if (p.color == Color::White) { castlingK = false; castlingQ = false; }
        else { castlingk = false; castlingq = false; }
    }
    if (p.type == PieceType::Rook) {
        if (p.color == Color::White) {
            if (m.fromRow == 7 && m.fromCol == 7) castlingK = false;
            if (m.fromRow == 7 && m.fromCol == 0) castlingQ = false;
        } else {
            if (m.fromRow == 0 && m.fromCol == 7) castlingk = false;
            if (m.fromRow == 0 && m.fromCol == 0) castlingq = false;
        }
    }
}

std::string Board::toFEN() const {
    // Basic FEN representation
    std::string fen = "";
    auto charForPiece = [](Piece p) {
        char c = ' ';
        switch(p.type) {
            case PieceType::Pawn: c = 'p'; break;
            case PieceType::Knight: c = 'n'; break;
            case PieceType::Bishop: c = 'b'; break;
            case PieceType::Rook: c = 'r'; break;
            case PieceType::Queen: c = 'q'; break;
            case PieceType::King: c = 'k'; break;
            default: return '1';
        }
        if (p.color == Color::White) c -= 32; // uppercase
        return c;
    };

    for(int r = 0; r < 8; r++) {
        int emptyCount = 0;
        for(int c = 0; c < 8; c++) {
            if (grid[r][c].type == PieceType::None) {
                emptyCount++;
            } else {
                if (emptyCount > 0) { fen += std::to_string(emptyCount); emptyCount = 0; }
                fen += charForPiece(grid[r][c]);
            }
        }
        if (emptyCount > 0) fen += std::to_string(emptyCount);
        if (r < 7) fen += '/';
    }
    fen += (turnToMove == Color::White) ? " w" : " b";
    
    std::string castling = "";
    if (castlingK) castling += "K";
    if (castlingQ) castling += "Q";
    if (castlingk) castling += "k";
    if (castlingq) castling += "q";
    if (castling.empty()) castling = "-";
    
    fen += " " + castling + " " + enPassantTarget + " 0 1";
    return fen;
}
