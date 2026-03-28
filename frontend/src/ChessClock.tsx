import React from 'react';

interface ClockProps {
  timeSeconds: number;
  active: boolean;
  colorName: string;
  mode: 'analog' | 'digital';
}

export const ChessClock: React.FC<ClockProps> = ({ timeSeconds, active, colorName, mode }) => {
  const m = Math.floor(timeSeconds / 60);
  const s = timeSeconds % 60;
  
  const formatted = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  
  // Minute hand: 360 degrees per 60 minutes (3600 seconds)
  const minDeg = (timeSeconds / 3600) * 360;
  // Second hand: 360 degrees per 60 seconds
  const secDeg = (timeSeconds / 60) * 360;

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '0.8rem 1.2rem', 
      background: active ? (colorName === 'Blancas' ? '#f0f0f0' : '#333b45') : '#161b22',
      color: active ? (colorName === 'Blancas' ? '#111' : '#fff') : '#8b949e',
      borderRadius: '8px',
      border: active ? '2px solid #58a6ff' : '2px solid #30363d',
      transition: 'all 0.3s ease',
      boxShadow: active ? '0 0 15px rgba(88,166,255,0.4)' : 'none',
      opacity: timeSeconds === 0 ? 0.5 : 1
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
        <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 'bold', marginBottom: '0.5rem' }}>{colorName}</span>
        
        {mode === 'analog' ? (
          /* Analog Clock Face */
          <div style={{ 
            position: 'relative', 
            width: '100%',
            aspectRatio: '1 / 1', 
            borderRadius: '50%', 
            background: '#fff', 
            border: '6px solid #111',
            boxShadow: 'inset 0 0 10px rgba(0,0,0,0.3)',
            boxSizing: 'border-box'
          }}>
            {/* Tic marks (12, 3, 6, 9) */}
            <div style={{ position: 'absolute', top: '4%', left: '50%', width: '3%', height: '8%', background: '#333', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', bottom: '4%', left: '50%', width: '3%', height: '8%', background: '#333', transform: 'translateX(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', left: '4%', width: '8%', height: '3%', background: '#333', transform: 'translateY(-50%)' }} />
            <div style={{ position: 'absolute', top: '50%', right: '4%', width: '8%', height: '3%', background: '#333', transform: 'translateY(-50%)' }} />

            {/* Minute Hand */}
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', width: '6%', height: '35%', 
              background: '#222', borderRadius: '4px',
              transformOrigin: 'bottom center', transform: `translate(-50%, -100%) rotate(${minDeg}deg)`,
              transition: 'transform 1s linear'
            }} />
            {/* Second Hand */}
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', width: '3%', height: '45%', 
              background: '#d73a49', 
              transformOrigin: 'bottom center', transform: `translate(-50%, -100%) rotate(${secDeg}deg)`,
              transition: 'transform 1s linear'
            }} />
            {/* Center Pin */}
            <div style={{ 
              position: 'absolute', top: '50%', left: '50%', width: '12%', height: '12%', 
              background: '#111', borderRadius: '50%', transform: 'translate(-50%, -50%)'
            }} />
          </div>
        ) : (
          /* Digital representation */
          <span style={{ fontSize: '3rem', fontFamily: 'monospace', fontWeight: 'bold', lineHeight: '1' }}>
            {formatted}
          </span>
        )}
      </div>
      
      {/* Cae la bandera! (Flag falls on 0) */}
      {timeSeconds === 0 && <span style={{ color: 'red', fontWeight: 'bold', fontSize: '1.2rem' }}>🚩</span>}
    </div>
  );
};
