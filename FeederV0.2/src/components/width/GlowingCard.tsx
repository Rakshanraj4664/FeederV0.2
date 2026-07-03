import type { ReactNode } from 'react'

interface GlowingCardProps {
  children: ReactNode
  className?: string
  active?: boolean
  pulse?: boolean
  glow?: 'cyan' | 'amber' | 'emerald'
  disabled?: boolean
}

export function GlowingCard({
  children,
  className = '',
  active,
  pulse,
  glow = 'cyan',
  disabled,
}: GlowingCardProps) {
  const glowClass = glow === 'amber' ? 'neon-glow-amber' : glow === 'emerald' ? 'neon-glow-emerald' : 'neon-glow-cyan'

  return (
    <div
      className={`glass-panel-strong rounded-2xl p-6 transition-all duration-300 ${
        active ? `ring-2 ring-cyan-400/40 ${glowClass}` : ''
      } ${pulse ? 'animate-pulse-shadow' : ''} ${
        disabled ? 'opacity-60' : ''
      } ${className}`}
    >
      {children}
    </div>
  )
}
