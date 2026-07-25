'use client';

import { useEffect, useState, useCallback } from 'react';

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  velocityX: number;
  velocityY: number;
  rotationSpeed: number;
  shape: 'square' | 'circle' | 'star' | 'triangle';
  opacity: number;
};

const COLORS = ['#6c5ce7', '#a29bfe', '#fd79a8', '#00cec9', '#55efc4', '#fdcb6e', '#ff6b6b', '#f39c12', '#00b894', '#e17055'];
const SHAPES: Particle['shape'][] = ['square', 'circle', 'star', 'triangle'];

export function useConfetti() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [celebrating, setCelebrating] = useState(false);

  const celebrate = useCallback((type: 'confetti' | 'firework' | 'rain' = 'confetti') => {
    setCelebrating(true);
    const newParticles: Particle[] = [];
    const count = type === 'firework' ? 60 : type === 'rain' ? 40 : 80;

    for (let i = 0; i < count; i++) {
      const particle: Particle = {
        id: Date.now() + i,
        x: type === 'firework' ? 50 + (Math.random() - 0.5) * 10 : Math.random() * 100,
        y: type === 'rain' ? -10 : type === 'firework' ? 50 : 0,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        size: 4 + Math.random() * 8,
        rotation: Math.random() * 360,
        velocityX: type === 'firework' ? (Math.random() - 0.5) * 8 : (Math.random() - 0.5) * 4,
        velocityY: type === 'firework' ? (Math.random() - 0.5) * 8 : type === 'rain' ? 2 + Math.random() * 3 : 2 + Math.random() * 5,
        rotationSpeed: (Math.random() - 0.5) * 15,
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        opacity: 1,
      };
      newParticles.push(particle);
    }
    setParticles(newParticles);
    setTimeout(() => { setParticles([]); setCelebrating(false); }, 3000);
  }, []);

  return { particles, celebrating, celebrate };
}

export function ConfettiCanvas({ particles }: { particles: Particle[] }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    if (particles.length === 0) return;
    const interval = setInterval(() => setFrame(f => f + 1), 33);
    return () => clearInterval(interval);
  }, [particles.length]);

  if (particles.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[100]" style={{ overflow: 'hidden' }}>
      {particles.map((p) => {
        const t = frame * 0.033;
        const x = p.x + p.velocityX * t * 15;
        const y = p.y + p.velocityY * t * 20;
        const rotation = p.rotation + p.rotationSpeed * frame;
        const opacity = Math.max(0, p.opacity - t * 0.3);
        const scale = Math.max(0.1, 1 - t * 0.15);

        if (opacity <= 0 || y > 110) return null;

        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              width: p.size * scale,
              height: p.size * scale,
              opacity,
              transform: `rotate(${rotation}deg)`,
              transition: 'none',
            }}
          >
            {p.shape === 'square' && (
              <div style={{ width: '100%', height: '100%', background: p.color, borderRadius: 2 }} />
            )}
            {p.shape === 'circle' && (
              <div style={{ width: '100%', height: '100%', background: p.color, borderRadius: '50%' }} />
            )}
            {p.shape === 'star' && (
              <svg viewBox="0 0 24 24" fill={p.color} style={{ width: '100%', height: '100%' }}>
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
            )}
            {p.shape === 'triangle' && (
              <svg viewBox="0 0 24 24" fill={p.color} style={{ width: '100%', height: '100%' }}>
                <path d="M12 2L2 22h20L12 2z" />
              </svg>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Fun message effects
export function MessageEffect({ type }: { type: 'wave' | 'bounce' | 'glow' | 'shake' }) {
  const styles: Record<string, string> = {
    wave: 'animate-wave',
    bounce: 'animate-bounce-msg',
    glow: 'animate-glow',
    shake: 'animate-shake',
  };
  return <span className={styles[type] || ''} />;
}
