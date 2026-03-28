import React, { useState, useRef, useEffect } from 'react';
import { PIECE_UNICODE, getThemeColors, getPieceStyle, fenToGrid } from './Chessboard';
import type { Theme, Piece } from './Chessboard';

export const gridToFen = (grid: (Piece | null)[][], turn: 'w'|'b' = 'w') => {
  let fen = '';
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let c = 0; c < 8; c++) {
      const p = grid[r][c];
      if (!p) {
        emptyCount++;
      } else {
        if (emptyCount > 0) { fen += emptyCount; emptyCount = 0; }
        const key = p.type;
        fen += p.color === 'w' ? key.toUpperCase() : key;
      }
    }
    if (emptyCount > 0) fen += emptyCount;
    if (r < 7) fen += '/';
  }
  fen += ` ${turn} - - 0 1`; 
  return fen;
};

interface BoardEditorProps {
  initialFen: string;
  theme?: Theme;
  onChange: (fen: string) => void;
}

export const BoardEditor: React.FC<BoardEditorProps> = ({ initialFen, theme = 'classic_dark', onChange }) => {
  const [grid, setGrid] = useState<(Piece | null)[][]>([]);
  const [turn] = useState<'w'|'b'>('w');
  const svgRef = useRef<SVGSVGElement>(null);

  // Active Drag
  const [activeDrag, setActiveDrag] = useState<{
    type: string; color: 'w'|'b';
    source: 'board'|'palette';
    r?: number; c?: number; // if source=board
    x: number; y: number; // pixel offsets from mouse
    px: number; py: number; // current pixel pos for rendering the dragged piece
  } | null>(null);

  useEffect(() => {
    try {
      setGrid(fenToGrid(initialFen || '8/8/8/8/8/8/8/8 w - - 0 1'));
    } catch {
      setGrid(fenToGrid('8/8/8/8/8/8/8/8 w - - 0 1'));
    }
  }, [initialFen]);

  const size = 800;
  const paletteH = 100;
  const squareSize = size / 8;
  const totalH = size + paletteH * 2;
  const themeColors = getThemeColors(theme);

  const getPointerCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const scaleX = size / rect.width;
    const scaleY = totalH / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDownBoard = (e: React.PointerEvent, r: number, c: number) => {
    const p = grid[r][c];
    if (!p) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    const coords = getPointerCoords(e);
    setActiveDrag({
      type: p.type, color: p.color, source: 'board', r, c,
      x: 0, y: 0, px: coords.x, py: coords.y
    });
  };

  const handlePointerDownPalette = (e: React.PointerEvent, type: string, color: 'w'|'b') => {
    (e.target as Element).setPointerCapture(e.pointerId);
    const coords = getPointerCoords(e);
    setActiveDrag({
      type, color, source: 'palette',
      x: 0, y: 0, px: coords.x, py: coords.y
    });
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeDrag) return;
    const coords = getPointerCoords(e);
    setActiveDrag(prev => prev ? { ...prev, px: coords.x, py: coords.y } : null);
  };

  const updateGrid = (newGrid: (Piece|null)[][]) => {
    setGrid(newGrid);
    onChange(gridToFen(newGrid, turn));
  };

  const clearBoard = () => {
    updateGrid(fenToGrid('8/8/8/8/8/8/8/8 w - - 0 1'));
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!activeDrag) return;
    (e.target as Element).releasePointerCapture(e.pointerId);
    
    // determine drop cell
    let toR = -1;
    let toC = -1;
    if (activeDrag.py >= paletteH && activeDrag.py < size + paletteH) {
      toR = Math.floor((activeDrag.py - paletteH) / squareSize);
      toC = Math.floor(activeDrag.px / squareSize);
    }
    
    const newGrid = [...grid.map(row => [...row])];
    
    // If dropping off board, or returning to palette, we delete/drop it
    if (toR === -1 || toC < 0 || toC >= 8) {
      if (activeDrag.source === 'board' && activeDrag.r !== undefined && activeDrag.c !== undefined) {
        newGrid[activeDrag.r][activeDrag.c] = null;
        updateGrid(newGrid);
      }
    } else {
      // Dropping into board
      if (activeDrag.source === 'board' && activeDrag.r !== undefined && activeDrag.c !== undefined) {
        newGrid[activeDrag.r][activeDrag.c] = null;
      }
      newGrid[toR][toC] = { type: activeDrag.type, color: activeDrag.color };
      updateGrid(newGrid);
    }
    
    setActiveDrag(null);
  };

  const renderPalette = (color: 'w'|'b', yOff: number) => {
    const pieces = ['k','q','r','b','n','p'];
    return (
      <g transform={`translate(0, ${yOff})`}>
        <rect width={size} height={paletteH} fill="#21262d" stroke="#30363d" strokeWidth="2" />
        {pieces.map((type, i) => {
          const px = 100 + i * 90;
          const py = 65;
          const pStyle = getPieceStyle(theme, color);
          return (
            <text
              key={type} x={px} y={py} fontSize={squareSize * 0.75} textAnchor="middle"
              fill={pStyle.fill} stroke={pStyle.stroke !== 'none' ? pStyle.stroke : undefined} strokeWidth={pStyle.strokeWidth}
              style={{ cursor: 'grab', userSelect: 'none', paintOrder: 'stroke' }}
              onPointerDown={(e) => handlePointerDownPalette(e, type, color)}
            >
              {PIECE_UNICODE[type]}
            </text>
          );
        })}
        {/* Trash */}
        <text
          x={size - 80} y={65} fontSize={50} fill="#f85149" cursor="pointer"
          onClick={clearBoard} style={{ userSelect: 'none' }}
        >🗑</text>
      </g>
    );
  };

  if(!grid.length) return null;

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto', touchAction: 'none' }}>
      <svg 
        ref={svgRef}
        viewBox={`0 0 ${size} ${totalH}`} 
        width="100%" 
        height="100%" 
        style={{ borderRadius: '8px' }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        <defs>
          <linearGradient id="grad-w" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#e0e0e0" />
          </linearGradient>
          <linearGradient id="grad-b" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#333333" />
            <stop offset="100%" stopColor="#111111" />
          </linearGradient>
          <filter id="piece-shadow">
            <feDropShadow dx="2" dy="4" stdDeviation="3" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* Top Palette: Black */}
        {renderPalette('b', 0)}

        {/* Board */}
        <g transform={`translate(0, ${paletteH})`}>
          {grid.map((row, r) => 
            row.map((_, c) => {
              const isDark = (r + c) % 2 === 1;
              return (
                <rect 
                  key={`${r}-${c}`}
                  x={c * squareSize}
                  y={r * squareSize}
                  width={squareSize}
                  height={squareSize}
                  fill={isDark ? themeColors.dark : themeColors.light}
                />
              );
            })
          )}

          {/* Board Pieces */}
          {grid.map((row, r) => 
            row.map((piece, c) => {
              if (!piece) return null;
              const isDragging = activeDrag?.source === 'board' && activeDrag.r === r && activeDrag.c === c;
              if (isDragging) return null; // render active piece later
              
              const x = c * squareSize + squareSize / 2;
              const y = r * squareSize + squareSize / 2 + (squareSize * 0.85 * 0.33);
              const pStyle = getPieceStyle(theme, piece.color);
              
              return (
                <text
                  key={`p-${r}-${c}`}
                  x={x} y={y} fontSize={squareSize * 0.85} textAnchor="middle"
                  fill={pStyle.fill} stroke={pStyle.stroke !== 'none' ? pStyle.stroke : undefined} strokeWidth={pStyle.strokeWidth}
                  filter="url(#piece-shadow)"
                  style={{ cursor: 'grab', userSelect: 'none', paintOrder: 'stroke' }}
                  onPointerDown={(e) => handlePointerDownBoard(e, r, c)}
                >
                  {PIECE_UNICODE[piece.type]}
                </text>
              );
            })
          )}
        </g>

        {/* Bottom Palette: White */}
        {renderPalette('w', size + paletteH)}

        {/* Active Dragged Piece */}
        {activeDrag && (
          <text
            x={activeDrag.px} y={activeDrag.py + (squareSize * 0.85 * 0.33)}
            fontSize={squareSize * 0.85} textAnchor="middle"
            fill={getPieceStyle(theme, activeDrag.color).fill}
            stroke={getPieceStyle(theme, activeDrag.color).stroke !== 'none' ? getPieceStyle(theme, activeDrag.color).stroke : undefined}
            strokeWidth={getPieceStyle(theme, activeDrag.color).strokeWidth}
            style={{ pointerEvents: 'none', userSelect: 'none', paintOrder: 'stroke', transformOrigin: `${activeDrag.px}px ${activeDrag.py}px`, transform: 'scale(1.2)' }}
          >
            {PIECE_UNICODE[activeDrag.type]}
          </text>
        )}
      </svg>
    </div>
  );
};
