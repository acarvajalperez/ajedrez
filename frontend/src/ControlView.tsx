import React, { useState, useEffect } from 'react';
import { Chessboard, evaluateGameStatus } from './Chessboard';
import './index.css';

export const ControlView: React.FC = () => {
  const [activeGames, setActiveGames] = useState<{ id: string; fen: string; playerName?: string; playerEmail?: string }[]>([]);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);
  const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [history, setHistory] = useState<any[]>([]);
  const [status, setStatus] = useState('Selecciona una partida');
  const [previewFen, setPreviewFen] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  const host = window.location.hostname === '0.0.0.0' ? '127.0.0.1' : window.location.hostname;
  const backendUrl = `http://${host}:8080`;

  // Fetch list of active games periodically
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch(`${backendUrl}/active-games`);
        if (res.ok) {
          const data = await res.json();
          setActiveGames(data);
        }
      } catch (e) {
        console.error("Error fetching active games", e);
      }
    };
    fetchGames();
    const interval = setInterval(fetchGames, 5000);
    return () => clearInterval(interval);
  }, [backendUrl]);

  // Fetch state of the selected game periodically
  useEffect(() => {
    if (!selectedGameId) return;
    
    const fetchState = async () => {
      try {
        const res = await fetch(`${backendUrl}/state?id=${selectedGameId}`);
        if (res.ok) {
          const data = await res.json();
          setFen(data.fen);
          setHistory(data.history || []);
          
          const { isCheckmate, isDraw, drawReason, isCheck, winner } = evaluateGameStatus(data.fen);
          const turnColor = data.fen.split(' ')[1];
          const turnStr = turnColor === 'w' ? 'Blancas' : 'Negras';
          
          if (isCheckmate) {
            setStatus(`¡JAQUE MATE! Ganan las ${winner === 'w' ? 'Blancas' : 'Negras'} 🏆`);
          } else if (isDraw) {
            setStatus(`TABLAS: ¡${drawReason}! 🤝`);
          } else if (isCheck) {
            setStatus(`Turno de ${turnStr} (¡JAQUE al Rey!) ⚠️`);
          } else {
            setStatus(`Turno de ${turnStr}`);
          }
        }
      } catch (e) {
        console.error("Error fetching state", e);
      }
    };
    
    fetchState();
    const interval = setInterval(fetchState, 1500);
    return () => clearInterval(interval);
  }, [selectedGameId, backendUrl]);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1117', color: '#c9d1d9', fontFamily: 'sans-serif' }}>
      {/* Selector sidebar */}
      <div style={{ width: '300px', background: '#161b22', borderRight: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #30363d', textAlign: 'center' }}>Partidas Activas</h2>
        <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {activeGames.length === 0 ? (
            <div style={{ color: '#8b949e', textAlign: 'center', fontStyle: 'italic', marginTop: '2rem' }}>No hay partidas activas</div>
          ) : (
            activeGames.map(game => (
              <button
                key={game.id}
                onClick={() => {
                  setSelectedGameId(game.id);
                  setPreviewFen(null);
                  setPreviewIndex(null);
                }}
                style={{
                  padding: '1rem',
                  background: selectedGameId === game.id ? '#30363d' : '#21262d',
                  border: selectedGameId === game.id ? '2px solid #58a6ff' : '2px solid transparent',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  color: '#c9d1d9',
                  textAlign: 'left',
                  transition: 'all 0.1s'
                }}
              >
                <div style={{ fontWeight: 'bold' }}>Partida: {game.id}</div>
                {game.playerName && (
                  <div style={{ fontSize: '0.85rem', color: '#58a6ff', marginTop: '0.4rem' }}>
                    {game.playerName} <br/> <span style={{fontSize:'0.75rem', color:'#8b949e'}}>{game.playerEmail}</span>
                  </div>
                )}
                <div style={{ fontSize: '0.8rem', color: '#8b949e', marginTop: '0.4rem' }}>Movimientos: {game.fen.split(' ')[5]}</div>
              </button>
            ))
          )}
        </div>
        <div style={{ padding: '1rem', borderTop: '1px solid #30363d' }}>
          <button 
            onClick={() => window.location.href = '/'}
            style={{ width: '100%', padding: '0.8rem', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            ← Volver a Jugar
          </button>
        </div>
      </div>

      {/* Main content: Board View */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        {!selectedGameId ? (
          <div style={{ fontSize: '1.5rem', color: '#8b949e' }}>Selecciona una partida a la izquierda para visualizarla.</div>
        ) : (
          <div style={{ display: 'flex', gap: '2rem', maxWidth: '1200px', width: '100%' }}>
            {/* Visualizer Board */}
            <div style={{ flex: 1, maxWidth: '800px' }}>
              <div style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 'bold', background: '#161b22', padding: '1rem', borderRadius: '8px', border: '1px solid #30363d', textAlign: 'center' }}>
                Vista Modo Espectador - ID: {selectedGameId}
                {activeGames.find(g => g.id === selectedGameId)?.playerName && (
                  <div style={{ fontSize: '0.9rem', color: '#c9d1d9', marginTop: '0.4rem' }}>
                    👤 {activeGames.find(g => g.id === selectedGameId)?.playerName} ({activeGames.find(g => g.id === selectedGameId)?.playerEmail})
                  </div>
                )}
                <div style={{ color: '#58a6ff', fontSize: '1rem', marginTop: '0.5rem' }}>
                  {previewFen ? <span style={{ color: '#f85149' }}>⚠️ Viendo un estado pasado (Jugada {previewIndex! + 1})</span> : status}
                </div>
              </div>
              <div style={{ width: '100%', aspectRatio: '1/1' }}>
                <Chessboard 
                  fen={previewFen || fen} 
                  onDrop={() => {}} // Read-only
                  showNotation={true}
                  theme="classic_dark"
                  lastMove={history.length > 0 ? { ...history[history.length - 1], color: history.length % 2 === 0 ? 'b' : 'w' } : undefined}
                />
              </div>
              {previewFen && (
                <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                   <button 
                     onClick={() => { setPreviewFen(null); setPreviewIndex(null); }}
                     style={{ padding: '0.8rem 2rem', background: '#238636', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                   >
                     Volver al directo
                   </button>
                </div>
              )}
            </div>

            {/* View History */}
            <div style={{ width: '300px', background: '#161b22', borderRadius: '8px', border: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
              <h3 style={{ padding: '1rem', margin: 0, borderBottom: '1px solid #30363d', textAlign: 'center' }}>Historial</h3>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1rem' }}>
                {history.length === 0 ? (
                  <div style={{ color: '#8b949e', fontStyle: 'italic', textAlign: 'center' }}>No hay movimientos</div>
                ) : (
                  history.map((m, i) => {
                    const formatSquare = (r: number, c: number) => String.fromCharCode('a'.charCodeAt(0) + c) + (8 - r);
                    return (
                      <div 
                        key={i} 
                        style={{ 
                          display: 'flex', justifyContent: 'space-between', padding: '0.5rem', 
                          background: previewIndex === i ? 'rgba(88,166,255,0.2)' : (i % 2 === 0 ? 'rgba(255,255,255,0.05)' : 'transparent'), 
                          borderRadius: '4px', marginBottom: '0.2rem', cursor: 'pointer' 
                        }}
                        onClick={() => {
                          setPreviewFen(m.fen);
                          setPreviewIndex(i);
                        }}
                      >
                        <span style={{ color: '#8b949e' }}>{i + 1}.</span>
                        <span>{formatSquare(m.fromRow, m.fromCol)} → {formatSquare(m.toRow, m.toCol)}</span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
