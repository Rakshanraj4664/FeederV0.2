import { motion } from 'framer-motion'

interface RollerCardProps {
  axis: number
  label: string
  register: string
  speed: number
  selected: boolean
  onSelect: () => void
  onSpeedChange: (axis: number, speed: number) => void
}

const PRESETS = [10, 25, 50, 75, 100]
const CIRCUMFERENCE = 251.2

export function RollerCard({
  axis,
  label,
  register,
  speed,
  selected,
  onSelect,
  onSpeedChange,
}: RollerCardProps) {
  const dashOffset = (speed / 100) * CIRCUMFERENCE

  const handlePreset = (v: number) => (e: React.MouseEvent) => {
    e.stopPropagation()
    onSpeedChange(axis, v)
  }

  const handleDecrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSpeedChange(axis, Math.max(0, speed - 5))
  }

  const handleIncrement = (e: React.MouseEvent) => {
    e.stopPropagation()
    onSpeedChange(axis, Math.min(100, speed + 5))
  }

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation()
    onSpeedChange(axis, Number(e.target.value))
  }

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      onClick={onSelect}
      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-cyan-400 bg-white shadow-[0_0_20px_rgba(6,182,212,0.1)]'
          : 'border-slate-200/80 bg-white/80 hover:border-slate-300 shadow-sm hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className={`text-sm font-bold ${selected ? 'text-cyan-700' : 'text-slate-700'}`}>
          {label}
        </h3>
        <span className="text-[10px] font-mono text-slate-400">{register}</span>
      </div>

      <div className="relative w-20 h-20 flex-shrink-0 mx-auto">
        <svg viewBox="0 0 100 100" className="-rotate-90 w-full h-full">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="40"
            fill="none" stroke="#06b6d4" strokeWidth="6"
            strokeLinecap="round"
            className="transition-all duration-300"
            style={{
              strokeDasharray: `${dashOffset} ${CIRCUMFERENCE}`,
              filter: 'drop-shadow(0 0 6px rgba(6,182,212,0.4))',
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold font-mono tracking-tight text-slate-800">
            {speed} <span className="text-[8px] text-slate-400 font-semibold">Hz</span>
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={handleDecrement}
          disabled={speed <= 0}
          className="w-9 h-9 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-lg font-bold shadow-sm"
        >
          −
        </button>
        <span className="text-sm font-bold font-mono text-slate-500 min-w-[7ch] text-center">
          {speed} Hz
        </span>
        <button
          onClick={handleIncrement}
          disabled={speed >= 100}
          className="w-9 h-9 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-lg font-bold shadow-sm"
        >
          +
        </button>
      </div>

      <div className="mt-3">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={speed}
          onChange={handleSlider}
          className="w-full"
          style={{
            background: `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${speed}%, #e2e8f0 ${speed}%, #e2e8f0 100%)`,
          }}
        />
      </div>

      <div className="mt-2 flex gap-1 flex-wrap justify-center">
        {PRESETS.map((v) => (
          <button
            key={v}
            onClick={handlePreset(v)}
            className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-all ${
              speed === v
                ? 'bg-cyan-500 text-white'
                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
    </motion.div>
  )
}
