import { useEffect, useState } from 'react';

export function CursorGlow() {
  const [position, setPosition] = useState({ x: -100, y: -100 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      className="fixed pointer-events-none z-50 rounded-full mix-blend-screen"
      style={{
        left: position.x,
        top: position.y,
        width: '80px',
        height: '80px',
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(80,160,255,0.18) 0%, transparent 70%)',
        transition: 'all 0.1s ease-out'
      }}
    />
  );
}
