import { useState, useEffect } from 'react'
import { Chessboard, evaluateGameStatus } from './Chessboard'
import { BoardEditor } from './BoardEditor'
import { ChessClock } from './ChessClock'
import './index.css'

function App() {
  const [playerColor, setPlayerColor] = useState<'w' | 'b'>('w')
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
  const [history, setHistory] = useState<any[]>([])
  const [status, setStatus] = useState('Conectando al motor...')
  const [aiThinking, setAiThinking] = useState(false)
  const [timeLimit, setTimeLimit] = useState(1.5)
  const [threads, setThreads] = useState(4)
  const [showNotation, setShowNotation] = useState(true)
  const [flipBoard, setFlipBoard] = useState(false)
  const [boardTheme, setBoardTheme] = useState<'classic_dark' | 'wood' | 'ocean' | 'neon'>('wood')
  const [clockMode, setClockMode] = useState<'digital' | 'analog'>('analog')
  
  // Relojes (10 minutos)
  const [timeWhite, setTimeWhite] = useState(600)
  const [timeBlack, setTimeBlack] = useState(600)
  const [gameStarted, setGameStarted] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  const [gameId, setGameId] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'estado' | 'configuracion' | 'editor'>('estado')
  const [timeControl, setTimeControl] = useState('10+0')
  const [customMins, setCustomMins] = useState(15)
  const [customInc, setCustomInc] = useState(10)
  const [customFen, setCustomFen] = useState('')

  const timeOptions = [
    { label: '1+0', type: 'Bullet' }, { label: '2+1', type: 'Bullet' }, { label: '3+0', type: 'Blitz' },
    { label: '3+2', type: 'Blitz' }, { label: '5+0', type: 'Blitz' }, { label: '5+3', type: 'Blitz' },
    { label: '10+0', type: 'Rapid' }, { label: '10+5', type: 'Rapid' }, { label: '15+10', type: 'Rapid' },
    { label: '30+0', type: 'Classical' }, { label: '30+20', type: 'Classical' }, { label: 'Custom', type: '' }
  ];
  
  // Infiere IP Dinámica (permite conectar desde móvil y PC a la vez apuntando a la IP local correcta)
  const host = window.location.hostname === '0.0.0.0' ? '127.0.0.1' : window.location.hostname;
  const backendUrl = `http://${host}:8080`

  useEffect(() => {
    startNewGame('w')
  }, [])

  useEffect(() => {
    // Autómata Dinámico: Si juega el ordenador y la red no está ocupada, atacar.
    const turnColor = fen.split(' ')[1];
    const aiColor = playerColor === 'w' ? 'b' : 'w';
    if (turnColor === aiColor && !aiThinking && !isGameOver && gameStarted) {
      const { isCheckmate, isDraw } = evaluateGameStatus(fen);
      if (!isCheckmate && !isDraw) {
        setTimeout(() => { playAI(); }, 50); // Mínimo retardo para permitir que React dibuje el SVG previo
      }
    }
  }, [fen, aiThinking, playerColor, isGameOver, gameStarted])
  
  useEffect(() => {
    let timer: any;
    const turnColor = fen.split(' ')[1];
    if (gameStarted && !isGameOver) {
      timer = setInterval(() => {
        if (turnColor === 'w') {
          setTimeWhite(t => {
            if (t <= 1) { setIsGameOver(true); setStatus('Se acabó el tiempo. Pierden las Blancas 🚩'); return 0; }
            return t - 1;
          });
        } else {
          setTimeBlack(t => {
            if (t <= 1) { setIsGameOver(true); setStatus('Se acabó el tiempo. Pierden las Negras 🚩'); return 0; }
            return t - 1;
          });
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [fen, gameStarted, isGameOver]);

  const fetchState = async (currentId?: string) => {
    const idToUse = currentId || gameId;
    if (!idToUse) return;
    try {
      const res = await fetch(`${backendUrl}/state?id=${idToUse}`)
      if (res.ok) {
        const data = await res.json()
        setFen(data.fen)
        setHistory(data.history || [])
        updateStatus(data.fen)
      } else {
        setStatus('Error: No se pudo obtener el estado (404)')
      }
    } catch (e) {
      console.error(e)
      setStatus('Error: Motor desconectado')
    }
  }

  const updateStatus = (currentFen: string) => {
    if (currentFen && currentFen !== 'start') {
      const turnColor = currentFen.split(' ')[1]
      const turnStr = turnColor === 'w' ? 'Blancas' : 'Negras'
      
      const { isCheckmate, isDraw, drawReason, isCheck, winner } = evaluateGameStatus(currentFen);
      
      if (isCheckmate) {
        setStatus(`¡JAQUE MATE! Ganan las ${winner === 'w' ? 'Blancas' : 'Negras'} 🏆`);
        setIsGameOver(true);
      } else if (isDraw) {
        setStatus(`TABLAS: ¡${drawReason}! 🤝`);
        setIsGameOver(true);
      } else if (isCheck) {
        setStatus(`Turno de ${turnStr} (¡JAQUE al Rey!) ⚠️`);
      } else {
        setStatus(`Turno de ${turnStr}`);
      }
    } else {
      setStatus('Turno de Blancas')
    }
  }

  const startNewGame = async (color: 'w' | 'b') => {
    try {
      let mins = 10;
      let inc = 0; // Se usará en un futuro si añadimos incremento al backend
      if (timeControl === 'Custom') {
        mins = customMins;
        inc = customInc;
      } else {
        const match = timeControl.match(/^(\d+)\+(\d+)/);
        if (match) {
          mins = parseInt(match[1]);
          inc = parseInt(match[2]);
        } else {
          const mMatch = timeControl.match(/^(\d+)/);
          mins = mMatch ? parseInt(mMatch[1]) : 10;
        }
      }

      setPlayerColor(color)
      setFlipBoard(color === 'b')
      const res = await fetch(`${backendUrl}/reset`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fen: customFen.trim() })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.gameId) {
            setGameId(data.gameId)
        }
        setFen(data.fen)
        setHistory([])
        updateStatus(data.fen)
        setTimeWhite(mins * 60)
        setTimeBlack(mins * 60)
        setGameStarted(true)
        setIsGameOver(false)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const playAI = async () => {
    if (aiThinking) return;
    setAiThinking(true);
    setStatus(`IA (Bitboard) pensando a millones de nodos (${timeLimit}s)...`);
    try {
      const res = await fetch(`${backendUrl}/play`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gameId: gameId,
          time: Math.floor(timeLimit * 1000),
          threads: threads
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFen(data.fen);
          fetchState(gameId); // <--- Cargar el Game History actualizado del Backend!!
          updateStatus(data.fen);
        } else {
          setStatus("La IA se rindió (Falta de Jugabilidad)");
        }
      }
    } catch (e) {
      console.error(e);
      setStatus("C++ IA error de red");
    }
    setAiThinking(false);
  }

  const onDrop = async (sourceSquare: string, targetSquare: string, promotion?: string) => {
    const fileToCol = (f: string) => f.charCodeAt(0) - 'a'.charCodeAt(0)
    const rankToRow = (r: string) => 8 - parseInt(r)

    const fromCol = fileToCol(sourceSquare[0])
    const fromRow = rankToRow(sourceSquare[1])
    const toCol = fileToCol(targetSquare[0])
    const toRow = rankToRow(targetSquare[1])

    try {
      const res = await fetch(`${backendUrl}/move`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId, fromRow, fromCol, toRow, toCol, promotion })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setFen(data.fen)
          fetchState(gameId) // to get updated history
          updateStatus(data.fen)
        }
      }
    } catch (e) {
      console.error(e)
    }
  }

  const formatSquare = (r: number, c: number) => {
    return String.fromCharCode('a'.charCodeAt(0) + c) + (8 - r)
  }

  const getCapturedPieces = (currentFen: string) => {
    const board = currentFen.split(' ')[0];
    const initialCounts: Record<string, number> = { p: 8, n: 2, b: 2, r: 2, q: 1, P: 8, N: 2, B: 2, R: 2, Q: 1 };
    const currentCounts: Record<string, number> = {};
    for (let i = 0; i < board.length; i++) {
        const char = board[i];
        if (initialCounts[char] !== undefined) {
            currentCounts[char] = (currentCounts[char] || 0) + 1;
        }
    }

    const blackLost = [
      ...Array(Math.max(0, initialCounts.q - (currentCounts.q || 0))).fill('q'),
      ...Array(Math.max(0, initialCounts.r - (currentCounts.r || 0))).fill('r'),
      ...Array(Math.max(0, initialCounts.b - (currentCounts.b || 0))).fill('b'),
      ...Array(Math.max(0, initialCounts.n - (currentCounts.n || 0))).fill('n'),
      ...Array(Math.max(0, initialCounts.p - (currentCounts.p || 0))).fill('p')
    ];

    const whiteLost = [
      ...Array(Math.max(0, initialCounts.Q - (currentCounts.Q || 0))).fill('Q'),
      ...Array(Math.max(0, initialCounts.R - (currentCounts.R || 0))).fill('R'),
      ...Array(Math.max(0, initialCounts.B - (currentCounts.B || 0))).fill('B'),
      ...Array(Math.max(0, initialCounts.N - (currentCounts.N || 0))).fill('N'),
      ...Array(Math.max(0, initialCounts.P - (currentCounts.P || 0))).fill('P')
    ];

    return { whiteLost, blackLost };
  };

  const { whiteLost, blackLost } = getCapturedPieces(fen);

  const renderCapturedPieces = (lostPieces: string[], color: 'w' | 'b') => {
    const map: Record<string, string> = { 'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛' };
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px', minHeight: '1.5rem', marginTop: '0.8rem', justifyContent: 'center', fontSize: '1.2rem', color: color === 'w' ? '#fff' : '#111', textShadow: color === 'b' ? '0 0 4px #aaa' : 'none', lineHeight: 1 }}>
        {lostPieces.map((c, i) => <span key={i}>{map[c.toLowerCase()]}</span>)}
      </div>
    );
  };

  return (
    <div className="app-container">


      <div className="game-layout">
        <div className="board-container" style={{ position: 'relative' }}>
          {activeTab === 'editor' ? (
            <BoardEditor 
              initialFen={customFen}
              theme={boardTheme}
              onChange={(fen) => setCustomFen(fen)}
            />
          ) : (
            <Chessboard 
              fen={fen} 
              onDrop={onDrop} 
              showNotation={showNotation}
              flipBoard={flipBoard}
              theme={boardTheme}
              playerColor={playerColor}
              lastMove={history.length > 0 
                ? { ...history[history.length - 1], color: history.length % 2 === 0 ? 'b' : 'w' } 
                : undefined}
            />
          )}
          {gameStarted && isGameOver && (
            <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 20 }}>
              <div style={{ background: '#161b22', border: '1px solid #30363d', padding: '3rem 4rem', borderRadius: '16px', boxShadow: '0 10px 40px rgba(0,0,0,0.8)', textAlign: 'center', animation: 'fadeIn 0.3s ease-out' }}>
                <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '3rem', color: status.includes('TABLAS') ? '#58a6ff' : '#f85149', textShadow: status.includes('TABLAS') ? '0 0 15px rgba(88,166,255,0.4)' : '0 0 15px rgba(248,81,73,0.4)', fontFamily: 'sans-serif' }}>
                  {status.includes('JAQUE MATE') ? '¡JAQUE MATE!' : 
                   status.includes('TABLAS') ? '¡TABLAS!' : 
                   status.includes('TIEMPO') ? '¡TIEMPO AGOTADO!' : 'FIN DE PARTIDA'}
                </h1>
                <p style={{ margin: 0, fontSize: '1.5rem', color: '#c9d1d9', fontWeight: '600' }}>
                  {status.replace(/¡JAQUE MATE! |TABLAS: |¡TIEMPO AGOTADO! /g, '')}
                </p>
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '30vw', flex: '0 0 30vw' }}>
          
          {/* Tarjeta 1: Relojes */}
          <div className="side-panel" style={{ width: '100%', flex: 'none', marginBottom: 0, padding: '1.5rem' }}>
            <div style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              gap: '1.5rem',
              width: '100%',
              justifyContent: 'center',
              alignItems: 'center',
              boxSizing: 'border-box'
            }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <ChessClock 
                    timeSeconds={timeBlack} 
                    active={fen.split(' ')[1] === 'b'  && gameStarted && !isGameOver} 
                    colorName="Negras" 
                    mode={clockMode}
                  />
                  {renderCapturedPieces(blackLost, 'b')}
                </div>
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start' }}>
                <div style={{ width: '100%', maxWidth: '200px' }}>
                  <ChessClock 
                    timeSeconds={timeWhite} 
                    active={fen.split(' ')[1] === 'w'  && gameStarted && !isGameOver} 
                    colorName="Blancas" 
                    mode={clockMode}
                  />
                  {renderCapturedPieces(whiteLost, 'w')}
                </div>
              </div>
            </div>
          </div>

          {/* Tarjeta 2: Estado y Controles */}
          <div className="side-panel" style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>

            <div style={{ display: 'flex', borderBottom: '1px solid #30363d', marginBottom: '1rem' }}>
              <button 
                onClick={() => setActiveTab('estado')}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: activeTab === 'estado' ? '#58a6ff' : '#8b949e', border: 'none', borderBottom: activeTab === 'estado' ? '2px solid #58a6ff' : '2px solid transparent', borderRadius: 0, fontWeight: 'bold' }}>
                ESTADO
              </button>
              <button 
                onClick={() => setActiveTab('configuracion')}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: activeTab === 'configuracion' ? '#58a6ff' : '#8b949e', border: 'none', borderBottom: activeTab === 'configuracion' ? '2px solid #58a6ff' : '2px solid transparent', borderRadius: 0, fontWeight: 'bold' }}>
                CONF.
              </button>
              <button 
                onClick={() => setActiveTab('editor')}
                style={{ flex: 1, padding: '0.8rem', background: 'transparent', color: activeTab === 'editor' ? '#58a6ff' : '#8b949e', border: 'none', borderBottom: activeTab === 'editor' ? '2px solid #58a6ff' : '2px solid transparent', borderRadius: 0, fontWeight: 'bold' }}>
                EDITOR
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {activeTab === 'estado' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', height: '100%' }}>
                  {(!gameStarted || isGameOver) ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
                      <h3 style={{ margin: 0, textAlign: 'center', color: '#c9d1d9' }}>Crear nueva partida</h3>
                      
                      <div style={{ 
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' 
                      }}>
                        {timeOptions.map(opt => (
                          <button
                            key={opt.label}
                            onClick={() => setTimeControl(opt.label)}
                            style={{
                              padding: '1rem 0.5rem',
                              background: timeControl === opt.label ? '#30363d' : '#21262d',
                              border: timeControl === opt.label ? '2px solid #58a6ff' : '2px solid transparent',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.1s',
                              color: '#c9d1d9',
                              boxSizing: 'border-box'
                            }}
                          >
                            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', marginBottom: '0.2rem' }}>{opt.label}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>{opt.type}</div>
                          </button>
                        ))}
                      </div>

                      {timeControl === 'Custom' && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', background: 'var(--color-neutral-muted, rgba(110,118,129,0.1))', padding: '1rem', borderRadius: '8px', marginTop: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span>Minutos por lado</span>
                              <span style={{ fontWeight: 'bold', background: '#30363d', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{customMins}</span>
                            </div>
                            <input 
                              type="range" min="1" max="180" step="1" 
                              value={customMins} onChange={(e) => setCustomMins(parseInt(e.target.value))}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                              <span>Incremento en segundos</span>
                              <span style={{ fontWeight: 'bold', background: '#30363d', padding: '0.1rem 0.5rem', borderRadius: '4px' }}>{customInc}</span>
                            </div>
                            <input 
                              type="range" min="0" max="180" step="1" 
                              value={customInc} onChange={(e) => setCustomInc(parseInt(e.target.value))}
                              style={{ width: '100%', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button 
                          onClick={() => startNewGame('w')} 
                          style={{ flex: 1, padding: '1rem', background: '#e0e0e0', color: '#111', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(255,255,255,0.1)' }}
                        >
                          ♔ Jugar Blancas
                        </button>
                        <button 
                          onClick={() => startNewGame('b')} 
                          style={{ flex: 1, padding: '1rem', background: '#1c2128', color: '#fff', border: '1px solid #444', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.1rem', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' }}
                        >
                          ♚ Jugar Negras
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <h2 style={{ marginTop: 0 }}>Estado del Juego</h2>
                        <div className="status-indicator">{status}</div>
                      </div>

                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <h3 style={{ marginTop: 0 }}>Historial de Movimientos</h3>
                        <div className="history-container" style={{ flex: 1 }}>
                          {history.length === 0 ? (
                            <div style={{color: '#8b949e', fontStyle: 'italic', textAlign: 'center'}}>No hay movimientos</div>
                          ) : (
                            history.map((m, i) => (
                              <div key={i} className="history-item">
                                <span>Jugada {i + 1}</span>
                                <span>{formatSquare(m.fromRow, m.fromCol)} → {formatSquare(m.toRow, m.toCol)}</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      <div className="btn-group" style={{ marginTop: 'auto', paddingTop: '1rem' }}>
                        <button className="btn-primary" onClick={() => fetchState(gameId)}>Refrescar SVG</button>
                        <button className="btn-danger" onClick={() => { setIsGameOver(true); setStatus('¡RESIGNACIÓN! Partida Abortada'); }}>Abortar Resignación</button>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  {/* FEN Custom Inicial (Fase 1) */}
                  <div style={{ background: 'var(--color-neutral-muted, rgba(110,118,129,0.1))', padding: '1rem', borderRadius: '8px' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>Jugar FEN Personalizado (Vacío = Clásico):</label>
                    <input 
                      type="text" 
                      value={customFen} 
                      onChange={(e) => { setCustomFen(e.target.value); if(activeTab === 'configuracion') setActiveTab('editor'); }}
                      placeholder="Ej: 8/8/8/8/8/q1q5/qKq5/8 w - - 0 1"
                      style={{ 
                        width: '100%', padding: '0.8rem', borderRadius: '4px', background: '#0d1117', 
                        color: '#c9d1d9', border: '1px solid #30363d', boxSizing: 'border-box', fontFamily: 'monospace'
                      }}
                    />
                    <div style={{ marginTop: '0.5rem', fontSize: '0.85rem', color: '#8b949e' }}>
                      Pista: Modifica el FEN gráficamente desde la pestaña <b>Editor</b>.
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Tiempo Máximo Jugada IA: <span style={{color: '#58a6ff'}}>{timeLimit}s</span>
                    </label>
                    <input 
                      type="range" 
                      min="0.5" 
                      max="5.0" 
                      step="0.5" 
                      value={timeLimit} 
                      onChange={(e) => setTimeLimit(parseFloat(e.target.value))}
                      disabled={aiThinking}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Núcleos CPU Dedicados (SMP): <span style={{color: '#d2a8ff'}}>{threads} Hilos</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="32" 
                      step="1" 
                      value={threads} 
                      onChange={(e) => setThreads(parseInt(e.target.value))}
                      disabled={aiThinking}
                      style={{ width: '100%', cursor: 'pointer' }}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        id="btnNotation" 
                        checked={showNotation} 
                        onChange={(e) => setShowNotation(e.target.checked)} 
                        style={{ cursor: 'pointer' }} 
                      />
                      <label htmlFor="btnNotation" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: '500' }}>
                        Mostrar coordenadas alfanuméricas
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        id="btnFlip" 
                        checked={flipBoard} 
                        onChange={(e) => setFlipBoard(e.target.checked)} 
                        style={{ cursor: 'pointer' }} 
                      />
                      <label htmlFor="btnFlip" style={{ cursor: 'pointer', userSelect: 'none', fontWeight: '500' }}>
                        Girar el tablero 180º (Perspectiva Negras)
                      </label>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <label style={{ fontWeight: 'bold' }}>Tema del Tablero</label>
                      <select 
                        value={boardTheme} 
                        onChange={e => setBoardTheme(e.target.value as any)}
                        style={{ padding: '0.5rem', background: '#1c2128', border: '1px solid #444c56', color: 'white', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="classic_dark">Midnight Hacker</option>
                        <option value="wood">Torneo Clásico (Madera) (Default)</option>
                        <option value="ocean">Azul Oceánico</option>
                        <option value="neon">Cyberpunk 2077 (Neón)</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <label style={{ fontWeight: 'bold' }}>Tipo de Reloj</label>
                      <select 
                        value={clockMode} 
                        onChange={e => setClockMode(e.target.value as any)}
                        style={{ padding: '0.5rem', background: '#1c2128', border: '1px solid #444c56', color: 'white', borderRadius: '4px', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="digital">Digital (MM:SS)</option>
                        <option value="analog">Analógico (Esfera Ciega) (Default)</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
      </div>
    </div>
  </div>
  )
}

export default App
