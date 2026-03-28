import React, { useState, useRef } from 'react';

type Piece = { type: string; color: 'w' | 'b' } | null;

export type Theme = 'classic_dark' | 'wood' | 'ocean' | 'neon';

interface ChessboardProps {
  fen: string;
  onDrop: (from: string, to: string, promotion?: string) => void;
  lastMove?: { fromRow: number; fromCol: number; toRow: number; toCol: number, color?: string };
  showNotation?: boolean;
  flipBoard?: boolean;
  theme?: Theme;
}

const fenToGrid = (fen: string): Piece[][] => {
  const parts = fen.split(' ')[0];
  const rows = parts.split('/');
  const grid: Piece[][] = [];
  
  for (const row of rows) {
    const gridRow: Piece[] = [];
    for (const char of row) {
      if (!isNaN(parseInt(char))) {
        const emptyCount = parseInt(char);
        for (let i = 0; i < emptyCount; i++) gridRow.push(null);
      } else {
        const color = char === char.toUpperCase() ? 'w' : 'b';
        gridRow.push({ type: char.toLowerCase(), color });
      }
    }
    grid.push(gridRow);
  }
  return grid;
};

const PIECE_UNICODE: Record<string, string> = {
  'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
};

const getThemeColors = (theme: Theme) => {
  switch (theme) {
    case 'wood': return { light: '#f0d9b5', dark: '#b58863', coordL: '#b58863', coordD: '#f0d9b5', lastM: 'rgba(155, 199, 0, 0.41)' };
    case 'ocean': return { light: '#dee3e6', dark: '#8ca2ad', coordL: '#8ca2ad', coordD: '#dee3e6', lastM: 'rgba(32, 178, 170, 0.5)' };
    case 'neon': return { light: '#120b29', dark: '#3b0d59', coordL: '#e838ff', coordD: '#00f0ff', lastM: 'rgba(0, 240, 255, 0.4)' };
    case 'classic_dark':
    default: return { light: '#2a3b4c', dark: '#4a5b6c', coordL: '#4d5d6c', coordD: '#879bb3', lastM: 'rgba(128, 128, 128, 0.3)' };
  }
};

const getPieceStyle = (theme: Theme, color: 'w' | 'b') => {
  const isWhite = color === 'w';
  switch (theme) {
    case 'neon': return { fill: isWhite ? '#00f0ff' : '#e838ff', stroke: 'none', strokeWidth: '0' };
    case 'wood': return { fill: isWhite ? '#ffffff' : '#211a13', stroke: isWhite ? '#211a13' : 'none', strokeWidth: '1' };
    case 'ocean': return { fill: isWhite ? '#ffffff' : '#143652', stroke: isWhite ? '#143652' : 'none', strokeWidth: '1' };
    case 'classic_dark':
    default: return { fill: `url(#grad-${color})`, stroke: isWhite ? '#aaa' : '#000', strokeWidth: isWhite ? '1.5' : '2' };
  }
};

const isSquareAttacked = (grid: Piece[][], r: number, c: number, attackerColor: 'w' | 'b'): boolean => {
  const pawnDir = attackerColor === 'w' ? 1 : -1;
  if (r + pawnDir >= 0 && r + pawnDir < 8) {
    if (c - 1 >= 0 && grid[r + pawnDir][c - 1]?.type === 'p' && grid[r + pawnDir][c - 1]?.color === attackerColor) return true;
    if (c + 1 >= 0 && grid[r + pawnDir][c + 1]?.type === 'p' && grid[r + pawnDir][c + 1]?.color === attackerColor) return true;
  }
  
  const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
  for (const [dr, dc] of knightMoves) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && grid[nr][nc]?.type === 'n' && grid[nr][nc]?.color === attackerColor) return true;
  }
  
  const kingMoves = [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of kingMoves) {
    const nr = r + dr, nc = c + dc;
    if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8 && grid[nr][nc]?.type === 'k' && grid[nr][nc]?.color === attackerColor) return true;
  }
  
  const lines = [[-1,0],[1,0],[0,-1],[0,1]];
  for (const [dr, dc] of lines) {
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = grid[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'r' || p.type === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }
  
  const diags = [[-1,-1],[-1,1],[1,-1],[1,1]];
  for (const [dr, dc] of diags) {
    let nr = r + dr, nc = c + dc;
    while (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
      const p = grid[nr][nc];
      if (p) {
        if (p.color === attackerColor && (p.type === 'b' || p.type === 'q')) return true;
        break;
      }
      nr += dr; nc += dc;
    }
  }

  return false;
};

const getValidMoves = (grid: Piece[][], r: number, c: number, fen: string): {r: number, c: number}[] => {
  const piece = grid[r][c];
  if (!piece) return [];
  const moves: {r: number, c: number}[] = [];
  const enemy = piece.color === 'w' ? 'b' : 'w';
  
  const enPassant = fen.split(' ')[3];
  let epR = -1, epC = -1;
  if (enPassant && enPassant !== '-') {
    epC = enPassant.charCodeAt(0) - 'a'.charCodeAt(0);
    epR = 8 - parseInt(enPassant[1]);
  }
  
  const addIfValid = (nr: number, nc: number) => {
    if (nr < 0 || nr >= 8 || nc < 0 || nc >= 8) return false;
    const target = grid[nr][nc];
    if (target && target.color === piece.color) return false;
    moves.push({ r: nr, c: nc });
    return !target;
  };

  const slide = (dr: number, dc: number) => {
    let nr = r + dr, nc = c + dc;
    while (addIfValid(nr, nc)) {
      nr += dr; nc += dc;
    }
  };

  if (piece.type === 'p') {
    const dir = piece.color === 'w' ? -1 : 1;
    const startRow = piece.color === 'w' ? 6 : 1;
    if (r + dir >= 0 && r + dir < 8 && !grid[r + dir][c]) {
      moves.push({ r: r + dir, c });
      if (r === startRow && !grid[r + 2 * dir][c]) {
        moves.push({ r: r + 2 * dir, c });
      }
    }
    for (const dc of [-1, 1]) {
      const nr = r + dir, nc = c + dc;
      if (nr >= 0 && nr < 8 && nc >= 0 && nc < 8) {
        const target = grid[nr][nc];
        if (target && target.color !== piece.color) {
          moves.push({ r: nr, c: nc });
        } else if (nr === epR && nc === epC) {
          moves.push({ r: nr, c: nc });
        }
      }
    }
  } else if (piece.type === 'n') {
    const knightMoves = [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]];
    knightMoves.forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
  } else if (piece.type === 'b') {
    [[-1,-1],[-1,1],[1,-1],[1,1]].forEach(([dr, dc]) => slide(dr, dc));
  } else if (piece.type === 'r') {
    [[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => slide(dr, dc));
  } else if (piece.type === 'q') {
    [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => slide(dr, dc));
  } else if (piece.type === 'k') {
    [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]].forEach(([dr, dc]) => addIfValid(r + dr, c + dc));
    
    // Castling logic (uses FEN rights + attacked checks)
    const castlingRights = fen.split(' ')[2] || '-';
    
    if (!isSquareAttacked(grid, r, c, enemy)) { // not in check
      if (piece.color === 'w' && r === 7 && c === 4) {
        if (castlingRights.includes('K') && !grid[7][5] && !grid[7][6]) {
          if (!isSquareAttacked(grid, 7, 5, 'b') && !isSquareAttacked(grid, 7, 6, 'b')) {
            moves.push({ r: 7, c: 6 });
          }
        }
        if (castlingRights.includes('Q') && !grid[7][1] && !grid[7][2] && !grid[7][3]) {
          if (!isSquareAttacked(grid, 7, 2, 'b') && !isSquareAttacked(grid, 7, 3, 'b')) {
            moves.push({ r: 7, c: 2 });
          }
        }
      } else if (piece.color === 'b' && r === 0 && c === 4) {
        if (castlingRights.includes('k') && !grid[0][5] && !grid[0][6]) {
          if (!isSquareAttacked(grid, 0, 5, 'w') && !isSquareAttacked(grid, 0, 6, 'w')) {
            moves.push({ r: 0, c: 6 });
          }
        }
        if (castlingRights.includes('q') && !grid[0][1] && !grid[0][2] && !grid[0][3]) {
          if (!isSquareAttacked(grid, 0, 2, 'w') && !isSquareAttacked(grid, 0, 3, 'w')) {
            moves.push({ r: 0, c: 2 });
          }
        }
      }
    }
  }
  
  // Filter out any moves that leave our own king in check (absolute pins, answering check, etc.)
  const legalMoves = moves.filter(m => {
    // Clone the grid for simulation
    const simGrid = grid.map(row => [...row]);
    
    // Execute the pseudo-move
    simGrid[m.r][m.c] = simGrid[r][c];
    simGrid[r][c] = null;
    
    // Find our King's new or existing position
    let kingR = -1;
    let kingC = -1;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (simGrid[i][j]?.type === 'k' && simGrid[i][j]?.color === piece.color) {
          kingR = i;
          kingC = j;
          break;
        }
      }
      if (kingR !== -1) break;
    }
    
    // If king found, it cannot be attacked by the enemy
    if (kingR !== -1) {
      return !isSquareAttacked(simGrid, kingR, kingC, enemy);
    }
    return true; // Failsafe
  });
  
  return legalMoves;
};

export const evaluateGameStatus = (fen: string) => {
  const grid = fenToGrid(fen);
  const activeColor = fen.split(' ')[1] || 'w';
  const enemyColor = activeColor === 'w' ? 'b' : 'w';
  
  let kingR = -1, kingC = -1;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r][c]?.type === 'k' && grid[r][c]?.color === activeColor) {
        kingR = r; kingC = c; break;
      }
    }
    if (kingR !== -1) break;
  }
  
  const isCheck = kingR !== -1 && isSquareAttacked(grid, kingR, kingC, enemyColor);
  
  let hasValidMove = false;
  let allPieces: {type: string, color: string}[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      if (grid[r][c]) {
        allPieces.push(grid[r][c]!);
        if (!hasValidMove && grid[r][c]!.color === activeColor) {
          const moves = getValidMoves(grid, r, c, fen);
          if (moves.length > 0) {
            hasValidMove = true;
          }
        }
      }
    }
  }
  
  let isInsufficientMaterial = false;
  if (allPieces.length === 2) {
    isInsufficientMaterial = true;
  } else if (allPieces.length === 3) {
    const nonKings = allPieces.filter(p => p.type !== 'k');
    if (nonKings.length === 1 && (nonKings[0].type === 'n' || nonKings[0].type === 'b')) {
      isInsufficientMaterial = true;
    }
  }
  
  const isStalemate = !hasValidMove && !isCheck;
  const isDraw = isStalemate || isInsufficientMaterial;
  const drawReason = isInsufficientMaterial ? "Falta de material" : "Rey ahogado";
  
  return {
    isCheck,
    isCheckmate: !hasValidMove && isCheck,
    isDraw,
    drawReason,
    winner: (!hasValidMove && isCheck) ? enemyColor : undefined,
    kingInCheck: isCheck ? { r: kingR, c: kingC } : null
  };
};

export const Chessboard: React.FC<ChessboardProps> = ({ fen, onDrop, lastMove, showNotation = true, flipBoard = false, theme = 'classic_dark' }) => {
  const grid = fenToGrid(fen);
  const { kingInCheck } = evaluateGameStatus(fen);
  const size = 800;
  const squareSize = size / 8;
  const svgRef = useRef<SVGSVGElement>(null);
  
  const [activeDrag, setActiveDrag] = useState<{r: number, c: number, x: number, y: number} | null>(null);
  const [validMoves, setValidMoves] = useState<{r: number, c: number}[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{fromSquare: string, targetSquare: string} | null>(null);

  const colToFile = (c: number) => String.fromCharCode('a'.charCodeAt(0) + c);
  const rowToRank = (r: number) => (8 - r).toString();

  const handlePointerDown = (e: React.PointerEvent, r: number, c: number) => {
    const piece = grid[r][c];
    if (!piece) return;
    
    // Check if the game is already over!
    const { isCheckmate, isDraw } = evaluateGameStatus(fen);
    if (isCheckmate || isDraw) return;
    
    const currentTurn = fen.split(' ')[1] || 'w';
    if (piece.color !== currentTurn) return;
    
    (e.target as Element).setPointerCapture(e.pointerId);
    setActiveDrag({ r, c, x: 0, y: 0 });
    setValidMoves(getValidMoves(grid, r, c, fen));
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag) return;
    let scaleX = 1;
    let scaleY = 1;
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      scaleX = size / rect.width;
      scaleY = size / rect.height;
    }
    setActiveDrag(prev => prev ? { ...prev, x: prev.x + e.movementX * scaleX, y: prev.y + e.movementY * scaleY } : null);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeDrag) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    
    if (svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      const scaleX = size / rect.width;
      const scaleY = size / rect.height;
      const dropX = (e.clientX - rect.left) * scaleX;
      const dropY = (e.clientY - rect.top) * scaleY;
      
      const toColVis = Math.floor(dropX / squareSize);
      const toRowVis = Math.floor(dropY / squareSize);
      
      const toCol = flipBoard ? 7 - toColVis : toColVis;
      const toRow = flipBoard ? 7 - toRowVis : toRowVis;
      
      if (toCol >= 0 && toCol < 8 && toRow >= 0 && toRow < 8) {
        const isValid = validMoves.some(m => m.r === toRow && m.c === toCol);
        if (isValid) {
          const fromSquare = colToFile(activeDrag.c) + rowToRank(activeDrag.r);
          const targetSquare = colToFile(toCol) + rowToRank(toRow);
          
          const piece = grid[activeDrag.r][activeDrag.c];
          if (piece && piece.type === 'p' && (toRow === 0 || toRow === 7)) {
            setPendingPromotion({ fromSquare, targetSquare }); // Pause and show dialog
          } else {
            onDrop(fromSquare, targetSquare);
          }
        }
      }
    }
    setActiveDrag(null);
    setValidMoves([]);
  };

  return (
    <svg 
      ref={svgRef}
      width="100%" 
      height="100%" 
      viewBox={`0 0 ${size} ${size}`} 
      style={{ borderRadius: '4px', overflow: 'hidden', touchAction: 'none' }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      <defs>
        <filter id="piece-shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="8" stdDeviation="4" floodColor="#000000" floodOpacity="0.7"/>
          <feDropShadow dx="0" dy="2" stdDeviation="1" floodColor="#000000" floodOpacity="0.5"/>
        </filter>
        <linearGradient id="grad-w" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="40%" stopColor="#f8f9fa" />
          <stop offset="100%" stopColor="#d0d7de" />
        </linearGradient>
        <linearGradient id="grad-b" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#5c6370" />
          <stop offset="40%" stopColor="#24292e" />
          <stop offset="100%" stopColor="#0d1117" />
        </linearGradient>
        <radialGradient id="grad-check">
          <stop offset="0%" stopColor="rgba(255, 60, 60, 0.9)" />
          <stop offset="100%" stopColor="rgba(255, 0, 0, 0)" />
        </radialGradient>
      </defs>

      {grid.map((row, r) => 
        row.map((_, c) => {
          const visR = flipBoard ? 7 - r : r;
          const visC = flipBoard ? 7 - c : c;
          const isDark = (r + c) % 2 === 1;
          const x = visC * squareSize;
          const y = visR * squareSize;
          const isKingC = kingInCheck?.r === r && kingInCheck?.c === c;
          const themeColors = getThemeColors(theme || 'classic_dark');
          
          return (
            <g key={`bg-${r}-${c}`} transform={`translate(${x}, ${y})`}>
              {/* Highlight background rects */}
              <rect width={squareSize} height={squareSize} fill={isDark ? themeColors.dark : themeColors.light} />
              
              {/* Highlight Jugada Anterior (Color Separado por Bando) */}
              {lastMove && ((lastMove.fromRow === r && lastMove.fromCol === c) || (lastMove.toRow === r && lastMove.toCol === c)) && (
                <rect 
                  width={squareSize} 
                  height={squareSize} 
                  fill={lastMove.color === 'b' ? "rgba(255, 70, 70, 0.4)" : "rgba(255, 255, 0, 0.3)"} 
                  pointerEvents="none" 
                />
              )}
              
              {/* Highlight Rey en Jaque */}
              {isKingC && <circle cx={squareSize/2} cy={squareSize/2} r={squareSize/2} fill="url(#grad-check)" pointerEvents="none" />}

              {/* Coordenadas alfanuméricas de Fila (1-8) */}
              {showNotation && visC === 0 && (
                <text x={4} y={20} fontSize={18} fontWeight="bold" fill={isDark ? themeColors.coordD : themeColors.coordL} pointerEvents="none" style={{ userSelect: 'none' }}>
                  {8 - r}
                </text>
              )}
              {/* Coordenadas alfanuméricas de Columna (a-h) */}
              {showNotation && visR === 7 && (
                <text x={squareSize - 16} y={squareSize - 6} fontSize={18} fontWeight="bold" fill={isDark ? themeColors.coordD : themeColors.coordL} pointerEvents="none" style={{ userSelect: 'none' }}>
                  {String.fromCharCode(97 + c)}
                </text>
              )}
            </g>
          );
        })
      )}

      {/* Render valid move indicators */}
      {validMoves.map((m, i) => {
        const visR = flipBoard ? 7 - m.r : m.r;
        const visC = flipBoard ? 7 - m.c : m.c;
        const x = visC * squareSize + squareSize / 2;
        const y = visR * squareSize + squareSize / 2;
        const targetPiece = grid[m.r][m.c];
        
        return (
          targetPiece ? 
          <circle key={`valid-${i}`} cx={x} cy={y} r={squareSize / 2 - 8} fill="none" stroke="rgba(88, 166, 255, 0.6)" strokeWidth="6" filter="url(#piece-shadow)" /> :
          <circle key={`valid-${i}`} cx={x} cy={y} r={squareSize / 6} fill="rgba(88, 166, 255, 0.4)" filter="url(#piece-shadow)" />
        );
      })}

      {/* Render pieces after backgrounds to ensure dragged piece is on top */}
      {grid.map((row, r) => 
        row.map((piece, c) => {
          if (!piece) return null;
          const isDragging = activeDrag?.r === r && activeDrag?.c === c;
          
          const visR = flipBoard ? 7 - r : r;
          const visC = flipBoard ? 7 - c : c;
          
          let px = visC * squareSize + squareSize / 2;
          let py = visR * squareSize + squareSize / 2 + (squareSize * 0.85 * 0.33);
          
          if (isDragging) {
            px += activeDrag.x;
            py += activeDrag.y;
          }
          
          
          const pStyle = getPieceStyle(theme || 'classic_dark', piece.color);
          
          return (
            <g key={`piece-${r}-${c}`} style={{ pointerEvents: isDragging ? 'none' : 'auto' }}>
              <text
                x={px}
                y={py}
                fontSize={squareSize * 0.85}
                textAnchor="middle"
                fill={pStyle.fill}
                stroke={pStyle.stroke !== 'none' ? pStyle.stroke : undefined}
                strokeWidth={pStyle.stroke !== 'none' ? pStyle.strokeWidth : undefined}
                filter={isDragging ? "" : "url(#piece-shadow)"}
                style={{ 
                  cursor: isDragging ? 'grabbing' : 'grab', 
                  paintOrder: 'stroke',
                  userSelect: 'none',
                  transition: isDragging ? 'none' : 'all 0.1s ease',
                  transform: isDragging ? 'scale(1.1)' : 'scale(1)',
                  transformOrigin: `${px}px ${py}px`
                }}
                onPointerDown={(e) => handlePointerDown(e, r, c)}
              >
                {PIECE_UNICODE[piece.type]}
              </text>
            </g>
          );
        })
      )}

      {/* HTML Dialog Overlay for Pawn Promotion using foreignObject */}
      {pendingPromotion && (
        <foreignObject x="0" y="0" width="100%" height="100%">
          <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', 
            background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10
          }}>
            <div style={{
              background: '#161b22', padding: '2rem', borderRadius: '16px', border: '1px solid #30363d',
              boxShadow: '0 8px 32px rgba(0,0,0,0.8)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', minWidth: '300px'
            }}>
              <h3 style={{ margin: 0, color: '#fff', fontFamily: 'sans-serif' }}>Elige tu Promoción</h3>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                {['q', 'r', 'b', 'n'].map(p => (
                  <button 
                    key={p} 
                    onClick={() => {
                      onDrop(pendingPromotion.fromSquare, pendingPromotion.targetSquare, p);
                      setPendingPromotion(null);
                    }}
                    style={{
                      fontSize: '3.5rem', width: '80px', height: '80px',
                      background: 'linear-gradient(145deg, #2a3b4c, #1f2b38)', 
                      border: '1px solid #4a5b6c', cursor: 'pointer', borderRadius: '12px', 
                      display: 'flex', justifyContent: 'center', alignItems: 'center',
                      color: '#fff', transition: 'transform 0.2s ease, background 0.2s ease',
                      outline: 'none'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.1)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    {PIECE_UNICODE[p]}
                  </button>
                ))}
              </div>
              <button 
                onClick={() => setPendingPromotion(null)}
                style={{
                  marginTop: '0.5rem', background: 'transparent', color: '#f85149', 
                  border: '1px solid #f85149', padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', fontFamily: 'sans-serif'
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </foreignObject>
      )}
    </svg>
  );
};
