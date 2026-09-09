import { motion } from 'framer-motion'

interface ConveyorCardProps {
  value: number
  onValueChange: (value: number) => void
  onSet?: () => void
  setting?: boolean
  hideSet?: boolean
}

const CONVEYOR_MAX = 50
const CIRCUMFERENCE = 251.2

export function ConveyorCard({ value, onValueChange, onSet, setting, hideSet }: ConveyorCardProps) {
  const dashOffset = (value / CONVEYOR_MAX) * CIRCUMFERENCE

  const sliderBg = (v: number) =>
    `linear-gradient(to right, #06b6d4 0%, #06b6d4 ${(v / CONVEYOR_MAX) * 100}%, #e2e8f0 ${(v / CONVEYOR_MAX) * 100}%, #e2e8f0 100%)`

  return (
    <motion.div
      whileTap={{ scale: 0.99 }}
      className="rounded-[1.75rem] border-2 border-slate-200/80 bg-white/80 hover:border-slate-300 shadow-sm hover:shadow-md p-4 transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-slate-700">Conveyor</h3>
        <span className="text-[10px] font-mono text-slate-400">D20026</span>
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
            {value}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3">
        <button
          onClick={() => onValueChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="w-9 h-9 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-lg font-bold shadow-sm"
        >
          −
        </button>
        <span className="text-sm font-bold font-mono text-slate-500 min-w-[7ch] text-center">
          {value}
        </span>
        <button
          onClick={() => onValueChange(Math.min(CONVEYOR_MAX, value + 1))}
          disabled={value >= CONVEYOR_MAX}
          className="w-9 h-9 rounded-xl bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-lg font-bold shadow-sm"
        >
          +
        </button>
      </div>

      <div className="mt-2">
        <div className="flex items-center justify-between text-xs font-semibold mb-0.5">
          <span className="text-slate-500">SPEED</span>
          <span className="font-mono text-slate-600">{value} / {CONVEYOR_MAX}</span>
        </div>
        <input
          type="range"
          min={0}
          max={CONVEYOR_MAX}
          step={1}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="w-full"
          style={{ background: sliderBg(value) }}
        />
      </div>

      {!hideSet && (
        <div className="mt-3 flex justify-center">
          <button
            onClick={onSet}
            disabled={setting}
            className="px-6 py-1.5 rounded-xl bg-cyan-500 text-white text-xs font-bold hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            {setting ? 'SETTING...' : 'SET'}
          </button>
        </div>
      )}
    </motion.div>
  )
}
