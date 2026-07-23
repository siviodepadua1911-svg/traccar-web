import { useRef, useState } from 'react';
import { Typography } from '@mui/material';

const THUMB_SIZE = 48;
const CONFIRM_RATIO = 0.8;

// Botao "deslize para confirmar" - evita disparo acidental de comandos de
// bloqueio/desbloqueio do veiculo. So chama onConfirm quando o usuario arrasta o
// "thumb" quase ate o fim da trilha.
const LsSlideToConfirm = ({ label, color, icon, onConfirm, disabled }) => {
  const trackRef = useRef(null);
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState(false);
  const startXRef = useRef(0);
  const maxRef = useRef(0);

  const reset = () => {
    setDragging(false);
    setDragX(0);
  };

  const handlePointerDown = (event) => {
    if (disabled || done || !trackRef.current) {
      return;
    }
    maxRef.current = trackRef.current.offsetWidth - THUMB_SIZE;
    startXRef.current = event.clientX;
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event) => {
    if (!dragging) {
      return;
    }
    const delta = Math.max(0, Math.min(event.clientX - startXRef.current, maxRef.current));
    setDragX(delta);
  };

  const handlePointerUp = () => {
    if (!dragging) {
      return;
    }
    if (maxRef.current > 0 && dragX / maxRef.current >= CONFIRM_RATIO) {
      setDragging(false);
      setDone(true);
      onConfirm();
      setTimeout(() => {
        setDone(false);
        setDragX(0);
      }, 1200);
    } else {
      reset();
    }
  };

  const progress = maxRef.current > 0 ? dragX / maxRef.current : 0;

  return (
    <div
      ref={trackRef}
      style={{
        position: 'relative',
        width: '100%',
        height: THUMB_SIZE + 8,
        borderRadius: (THUMB_SIZE + 8) / 2,
        background: color,
        opacity: disabled ? 0.5 : 1,
        touchAction: 'none',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      <Typography
        variant="body2"
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontWeight: 700,
          letterSpacing: 0.5,
          opacity: Math.max(0, 1 - progress * 1.6),
          pointerEvents: 'none',
        }}
      >
        {done ? 'Comando enviado' : label}
      </Typography>
      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={reset}
        style={{
          position: 'absolute',
          top: 4,
          left: 4,
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          background: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: disabled ? 'default' : 'grab',
          transform: `translateX(${dragX}px)`,
          transition: dragging ? 'none' : 'transform 0.2s ease',
          boxShadow: '0 2px 6px rgba(0,0,0,0.35)',
        }}
      >
        {icon}
      </div>
    </div>
  );
};

export default LsSlideToConfirm;
