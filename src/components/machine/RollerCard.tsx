import { useState } from 'react'
import { motion } from 'framer-motion'

interface RollerCardProps {
  axis: number
  label: string
  lowRegister: string
  highRegister: string
  lowSetpoint: number
  highSetpoint: number
  actualSpeed: number
  selected: boolean
  onSelect: () => void
  onLowSpeedChange: (axis: number, speed: number) => void
  onHighSpeedChange: (axis: number, speed: number) => void
  onSetSpeed?: (axis: number) => void
  setting?: boolean
  editing?: boolean
}

const MAX_SPEED = 50
const BASE_FREQ = 32010
const MAX_ACTUAL = MAX_SPEED * BASE_FREQ
const CIRCUMFERENCE = 251.2

type GaugeMode = 'low' | 'high'

export function RollerCard({
  axis,
  label,
  lowRegister,
  highRegister,
  lowSetpoint,
  highSetpoint,
  actualSpeed,
  selected,
  onSelect,
  onLowSpeedChange,
  onHighSpeedChange,
  onSetSpeed,
  setting,
  editing,
}: RollerCardProps) {
  const [gaugeMode, setGaugeMode] = useState<GaugeMode>('low')
  const displayValue = gaugeMode === 'low' ? lowSetpoint : highSetpoint
  const dashOffset = editing
    ? (displayValue / MAX_SPEED) * CIRCUMFERENCE
    : Math.min(actualSpeed / MAX_ACTUAL, 1) * CIRCUMFERENCE
  const gaugeColor = gaugeMode === 'low' ? '#06b6d4' : '#f97316'
  const valueColor = gaugeMode === 'low' ? 'text-cyan-700' : 'text-orange-500'

  const handleDecrement = (fn: (a: number, v: number) => void, v: number, mode: GaugeMode) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setGaugeMode(mode)
    fn(axis, Math.max(0, v - 1))
  }

  const handleIncrement = (fn: (a: number, v: number) => void, v: number, mode: GaugeMode) => (e: React.MouseEvent) => {
    e.stopPropagation()
    setGaugeMode(mode)
    fn(axis, Math.min(MAX_SPEED, v + 1))
  }

  const handleSlider = (fn: (a: number, v: number) => void, mode: GaugeMode) => (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    setGaugeMode(mode)
    fn(axis, Number(e.target.value))
  }

  const handleSet = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSetSpeed?.(axis)
  }

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`rounded-[1.75rem] border-2 p-4 transition-all duration-200 ${
        editing
          ? 'border-slate-200/80 bg-white/80 shadow-sm'
          : `cursor-pointer ${selected ? 'border-cyan-400 bg-white shadow-[0_0_20px_rgba(6,182,212,0.1)]' : 'border-slate-200/80 bg-white/80 hover:border-slate-300 shadow-sm hover:shadow-md'}`
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-bold ${selected ? 'text-cyan-700' : 'text-slate-700'}`}>
          {label}
        </h3>
        <div className="flex gap-2">
          <span className="text-[10px] font-mono text-slate-400">{lowRegister}</span>
          <span className="text-[10px] font-mono text-slate-400">{highRegister}</span>
        </div>
      </div>

      <div className="relative w-20 h-20 flex-shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke={gaugeColor} strokeWidth="6"
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              strokeDasharray: `${dashOffset} ${CIRCUMFERENCE}`,
              filter: `drop-shadow(0 0 6px ${gaugeColor}66)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-lg font-bold font-mono tracking-tight ${valueColor}`}>
            {displayValue}
          </span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-slate-500">Low Speed</span>
          <span className="text-[11px] font-mono text-slate-400">{lowSetpoint}</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleDecrement(onLowSpeedChange, lowSetpoint, 'low')}
            disabled={lowSetpoint <= 0}
            className="w-7 h-7 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm"
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={MAX_SPEED}
            step={1}
            value={lowSetpoint}
            onChange={handleSlider(onLowSpeedChange, 'low')}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(lowSetpoint / MAX_SPEED) * 100}%, #e2e8f0 ${(lowSetpoint / MAX_SPEED) * 100}%, #e2e8f0 100%)`,
            }}
          />
          <button
            onClick={handleIncrement(onLowSpeedChange, lowSetpoint, 'low')}
            disabled={lowSetpoint >= MAX_SPEED}
            className="w-7 h-7 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm"
          >
            +
          </button>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-orange-500">High Speed</span>
          <span className="text-[11px] font-mono text-slate-400">{highSetpoint}</span>
        </div>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={handleDecrement(onHighSpeedChange, highSetpoint, 'high')}
            disabled={highSetpoint <= 0}
            className="w-7 h-7 rounded-lg bg-orange-400 text-white hover:bg-orange-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm"
          >
            −
          </button>
          <input
            type="range"
            min={0}
            max={MAX_SPEED}
            step={1}
            value={highSetpoint}
            onChange={handleSlider(onHighSpeedChange, 'high')}
            className="w-full"
            style={{
              background: `linear-gradient(to right, #f97316 0%, #f97316 ${(highSetpoint / MAX_SPEED) * 100}%, #e2e8f0 ${(highSetpoint / MAX_SPEED) * 100}%, #e2e8f0 100%)`,
            }}
          />
          <button
            onClick={handleIncrement(onHighSpeedChange, highSetpoint, 'high')}
            disabled={highSetpoint >= MAX_SPEED}
            className="w-7 h-7 rounded-lg bg-orange-400 text-white hover:bg-orange-300 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm"
          >
            +
          </button>
        </div>
      </div>

      {!editing && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={handleSet}
            disabled={setting}
            className="px-6 py-1.5 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold transition-all shadow-sm"
          >
            {setting ? 'Setting...' : 'Set'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
