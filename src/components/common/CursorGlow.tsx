import { useEffect, useState } from 'react'

export function CursorGlow() {
  const [pos, setPos] = useState({ x: -999, y: -999 })

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      setPos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handle)
    return () => window.removeEventListener('mousemove', handle)
  }, [])

  return (
    <div
      className="fixed pointer-events-none z-1"
      style={{
        left: pos.x,
        top: pos.y,
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(6,182,212,0.04) 0%, transparent 70%)',
        transform: 'translate(-50%, -50%)',
      }}
    />
  )
}
