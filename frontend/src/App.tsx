import { useState, useEffect } from 'react'
import { Chessboard, evaluateGameStatus } from './Chessboard'
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
  const [boardTheme, setBoardTheme] = useState<'classic_dark' | 'wood' | 'ocean' | 'neon'>('classic_dark')
  const [clockMode, setClockMode] = useState<'digital' | 'analog'>('digital')
  
  // Relojes (10 minutos)
  const [timeWhite, setTimeWhite] = useState(600)
  const [timeBlack, setTimeBlack] = useState(600)
  const [gameStarted, setGameStarted] = useState(false)
  const [isGameOver, setIsGameOver] = useState(false)
  
  // Infiere IP Dinámica (permite conectar desde móvil y PC a la vez apuntando a la IP local correcta)
  const backendUrl = `http://${window.location.hostname}:8080`

  useEffect(() => {
    fetchState()
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

  const fetchState = async () => {
    try {
      const res = await fetch(`${backendUrl}/state`)
      if (res.ok) {
        const data = await res.json()
        setFen(data.fen)
        setHistory(data.history || [])
        updateStatus(data.fen)
      } else {
        setStatus('Error: No se pudo obtener el estado')
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
      setPlayerColor(color)
      setFlipBoard(color === 'b')
      const res = await fetch(`${backendUrl}/reset`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setFen(data.fen)
        setHistory([])
        updateStatus(data.fen)
        setTimeWhite(600)
        setTimeBlack(600)
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
          time: Math.floor(timeLimit * 1000),
          threads: threads
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setFen(data.fen);
          fetchState(); // <--- Cargar el Game History actualizado del Backend!!
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
        body: JSON.stringify({ fromRow, fromCol, toRow, toCol, promotion })
      })
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setFen(data.fen)
          fetchState() // to get updated history
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

  return (
    <div className="app-container">
      <header>
        <h1>Ajedrez Pro SVG (Sin Librerías)</h1>
        <p>Motor C++ de Alto Rendimiento | Frontend Táctil Integrado en TSX Puro</p>
      </header>

      <div className="game-layout">
        <div className="board-container">
          <Chessboard 
            fen={fen} 
            onDrop={onDrop} 
            showNotation={showNotation}
            flipBoard={flipBoard}
            theme={boardTheme}
            lastMove={history.length > 0 
              ? { ...history[history.length - 1], color: history.length % 2 === 0 ? 'b' : 'w' } 
              : undefined}
          />
        </div>

        <div className="side-panel">
          {/* Módulo de Tiempo (Relojes de Torneo Profesionales) */}
          <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', marginBottom: '1.5rem', width: '100%' }}>
            <div style={{ flex: 1 }}>
              <ChessClock 
                timeSeconds={timeBlack} 
                active={fen.split(' ')[1] === 'b'  && gameStarted && !isGameOver} 
                colorName="Negras" 
                mode={clockMode}
              />
            </div>
            <div style={{ flex: 1 }}>
              <ChessClock 
                timeSeconds={timeWhite} 
                active={fen.split(' ')[1] === 'w'  && gameStarted && !isGameOver} 
                colorName="Blancas" 
                mode={clockMode}
              />
            </div>
          </div>

          <div>
            <h2>Estado del Juego</h2>
            <div className="status-indicator">{status}</div>
          </div>

          <div style={{ marginTop: '1.5rem' }}>
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

          <div style={{ marginTop: '1.5rem' }}>
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

          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
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
                <option value="classic_dark">Midnight Hacker (Default)</option>
                <option value="wood">Torneo Clásico (Madera)</option>
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
                <option value="analog">Analógico (Esfera Ciega)</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
            <button 
              onClick={() => startNewGame('w')} 
              style={{ flex: 1, padding: '0.8rem', background: '#2ea043', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              disabled={aiThinking}
            >
              Jugar con Blancas
            </button>
            <button 
              onClick={() => startNewGame('b')} 
              style={{ flex: 1, padding: '0.8rem', background: '#444c56', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
              disabled={aiThinking}
            >
              Jugar con Negras
            </button>
          </div>

          <div>
            <h3>Historial de Movimientos</h3>
            <div className="history-container">
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

          <div className="btn-group">
            <button className="btn-primary" onClick={fetchState}>Refrescar SVG</button>
            <button className="btn-danger" onClick={() => startNewGame('w')}>Abortar Resignación</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
