import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

interface IndustrialButtonProps {
  children: ReactNode
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

const variantStyles: Record<string, string> = {
  primary: 'bg-industrial-800 text-white border-industrial-700 hover:bg-industrial-700 shadow-md',
  secondary: 'bg-slate-200 text-industrial-700 border-slate-300 hover:bg-slate-300 shadow-sm',
  accent: 'bg-cyan-500 text-white border-cyan-400 hover:bg-cyan-400 shadow-md shadow-cyan-500/20',
  outline: 'bg-transparent text-industrial-600 border-slate-300 hover:bg-slate-100 hover:border-slate-400',
  ghost: 'bg-transparent text-industrial-500 border-transparent hover:bg-slate-100 hover:text-industrial-700',
  danger: 'bg-rose-500 text-white border-rose-400 hover:bg-rose-400 shadow-md shadow-rose-500/20',
}

const sizeStyles: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-sm gap-2',
}

export function IndustrialButton({
  children,
  variant = 'outline',
  size = 'md',
  active,
  disabled,
  onClick,
  className = '',
  type = 'button',
}: IndustrialButtonProps) {
  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileTap={disabled ? {} : { scale: 0.97 }}
      className={`inline-flex items-center justify-center rounded-xl font-semibold border transition-all duration-150 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${
        active ? 'ring-2 ring-cyan-400/50 ring-offset-1 ring-offset-white' : ''
      } ${
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'
      } ${className}`}
    >
      {children}
    </motion.button>
  )
}
