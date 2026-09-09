import { useState, useCallback, useRef } from 'react'
import { motion, useSpring, animate, AnimatePresence } from 'framer-motion'
import {
  ArrowLeftToLine,
  ArrowRightToLine,
  ChevronsLeftRight,
  ChevronsRightLeft,
  Settings,
  ChevronDown,
} from 'lucide-react'
import { GlowingCard } from './GlowingCard'
import { IndustrialButton } from './IndustrialButton'
import { AnimatedValue } from './AnimatedValue'
import { triggerStepperCommand, writeStepperParams } from '@/services/api'

const RAIL_LENGTH_MM = 890
const PLATE_WIDTH_MM = 160
const CENTER_MM = RAIL_LENGTH_MM / 2
const MIN_GAP_MM = 142
const LEFT_MIN = 45
const LEFT_MAX = CENTER_MM
const RIGHT_MIN = CENTER_MM
const RIGHT_MAX = 845
const DEFAULT_LEFT = 214
const DEFAULT_RIGHT = 676
const PULSES_PER_MM = 1000

const mmToPct = (mm: number) => (mm / RAIL_LENGTH_MM) * 100

interface ParamInputProps {
  label: string
  register: string
  value: number
  onChange: (v: number) => void
}

function ParamInput({ label, register, value, onChange }: ParamInputProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const display = editing ? draft : String(value)

  const commit = (raw: string) => {
    setEditing(false)
    if (raw === '') {
      onChange(0)
      return
    }
    const parsed = parseInt(raw, 10)
    if (!isNaN(parsed)) {
      onChange(Math.min(65535, Math.max(0, parsed)))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{label}</p>
        <span className="text-[9px] font-mono text-slate-400">{register}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="w-8 h-8 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm flex-shrink-0"
        >
          −
        </button>
        <input
          ref={inputRef}
          type="number"
          min={0}
          max={65535}
          value={display}
          onFocus={() => {
            setEditing(true)
            setDraft(String(value))
          }}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => commit(draft)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              inputRef.current?.blur()
            }
          }}
          className="w-full text-center text-sm font-bold font-mono text-slate-800 bg-slate-50 border border-slate-200 rounded-lg py-1.5 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500"
        />
        <button
          onClick={() => onChange(Math.min(65535, value + 1))}
          disabled={value >= 65535}
          className="w-8 h-8 rounded-lg bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all text-base font-bold shadow-sm flex-shrink-0"
        >
          +
        </button>
      </div>
    </div>
  )
}

export function WidthControlSection() {
  const [leftPlateOuter, setLeftPlateOuter] = useState(DEFAULT_LEFT)
  const [rightPlateOuter, setRightPlateOuter] = useState(DEFAULT_RIGHT)
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const [activeCommand, setActiveCommand] = useState<string | null>(null)
  const [showAdjustments, setShowAdjustments] = useState(false)

  const [stepper1Speed, setStepper1Speed] = useState(5000)
  const [stepper1Dist, setStepper1Dist] = useState(3000)
  const [stepper2Speed, setStepper2Speed] = useState(5000)
  const [stepper2Dist, setStepper2Dist] = useState(3000)
  const [sendingParams, setSendingParams] = useState(false)

  const leftPlateInnerMM = leftPlateOuter + PLATE_WIDTH_MM
  const rightPlateInnerMM = rightPlateOuter - PLATE_WIDTH_MM
  const innerGap = rightPlateInnerMM - leftPlateInnerMM

  const leftSpring = useSpring(leftPlateOuter, { stiffness: 80, damping: 18 })
  const rightSpring = useSpring(rightPlateOuter, { stiffness: 80, damping: 18 })

  const trigger = useCallback((action: string, dur = 300) => {
    setActiveAction(action)
    setTimeout(() => setActiveAction(null), dur)
  }, [])

  const executeCommand = useCallback(async (
    command: 'expand' | 'contract' | 'left' | 'right',
    signLeft: number,
    signRight: number,
  ) => {
    setActiveCommand(command)
    trigger(command)
    const stepLeft = (stepper1Dist / PULSES_PER_MM) * signLeft
    const stepRight = (stepper2Dist / PULSES_PER_MM) * signRight
    const newLeft = Math.max(LEFT_MIN, Math.min(LEFT_MAX, leftPlateOuter + stepLeft))
    const newRight = Math.max(RIGHT_MIN, Math.min(RIGHT_MAX, rightPlateOuter + stepRight))

    try {
      await triggerStepperCommand({
        command,
        speed1: stepper1Speed,
        distance1: stepper1Dist,
        speed2: stepper2Speed,
        distance2: stepper2Dist,
      })
    } catch {
      // command failed — visual still updates for demo
    }

    setLeftPlateOuter(newLeft)
    setRightPlateOuter(newRight)
    setActiveCommand(null)
  }, [leftPlateOuter, rightPlateOuter, stepper1Speed, stepper1Dist, stepper2Speed, stepper2Dist, trigger])

  const handleSetParams = useCallback(async () => {
    setSendingParams(true)
    try {
      await writeStepperParams({
        speed1: stepper1Speed, distance1: stepper1Dist,
        speed2: stepper2Speed, distance2: stepper2Dist,
      })
    } catch { /* ignore */ }
    setSendingParams(false)
  }, [stepper1Speed, stepper1Dist, stepper2Speed, stepper2Dist])

  const isAtLeftRail = leftPlateOuter <= LEFT_MIN + 0.5
  const isAtRightRail = rightPlateOuter >= RIGHT_MAX - 0.5
  const isAtMinGap = innerGap <= MIN_GAP_MM

  const leftPlateOuterPct = mmToPct(leftPlateOuter)
  const leftPlateInnerPct = mmToPct(leftPlateInnerMM)
  const rightPlateInnerPct = mmToPct(rightPlateInnerMM)
  const innerGapPct = mmToPct(innerGap)
  const plateWidthPct = mmToPct(PLATE_WIDTH_MM)

  return (
    <section className="w-full">
      <div>
        <GlowingCard className="p-6" active={activeAction !== null} pulse={activeAction !== null}>
          <div className="flex flex-col gap-6">
            <h2 className="text-2xl font-black text-slate-800">Width Control</h2>

            <div className="grid gap-3 grid-cols-3">
              {[
                { label: 'Inner Gap', value: innerGap, unit: 'mm' },
                { label: 'Left Outer', value: leftPlateOuter, unit: 'mm' },
                { label: 'Right Outer', value: rightPlateOuter, unit: 'mm' },
              ].map((m, i) => (
                <motion.div key={i}
                  className="rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur-sm px-4 py-3 shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
                  animate={{ scale: activeAction ? [1, 1.02, 1] : 1 }} transition={{ duration: 0.2 }}>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{m.label}</p>
                  <p className="mt-1.5 text-xl font-bold text-slate-800">
                    <AnimatedValue value={m.value} decimals={0} unit={m.unit} />
                  </p>
                </motion.div>
              ))}
            </div>

            <div className="rounded-[2rem] border border-slate-200/80 bg-slate-100/50 p-4 md:p-6 shadow-[inset_0_1px_2px_rgba(0,0,0,0.04)]">
              <div className="relative h-[280px] overflow-hidden rounded-[1.5rem] border border-slate-300/60 bg-white shadow-[0_4px_16px_rgba(0,0,0,0.04)]">
                <div className="absolute inset-x-4 top-2 flex justify-between text-[10px] font-mono font-bold text-slate-400">
                  <span>0 mm</span>
                  <span className="text-cyan-600">{CENTER_MM} mm (CENTER)</span>
                  <span>{RAIL_LENGTH_MM} mm</span>
                </div>
                <div className="absolute inset-x-10 top-10 h-4 rounded-full bg-slate-300/50 shadow-inner" />
                <div className="absolute inset-x-10 bottom-10 h-4 rounded-full bg-slate-300/50 shadow-inner" />
                <div className="absolute top-8 bottom-8 w-px bg-cyan-500/20" style={{ left: `${mmToPct(CENTER_MM)}%` }}>
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-[9px] font-mono font-bold text-cyan-500/60 bg-white/80 px-1 rounded">CENTER</div>
                </div>

                <div className="absolute inset-y-16 inset-x-10">
                  <motion.div className="absolute top-1/2 h-24 -translate-y-1/2 rounded-full bg-cyan-500/20 border-2 border-cyan-500/30 shadow-[0_0_40px_rgba(6,182,212,0.15)] overflow-hidden"
                    animate={{ left: `${leftPlateInnerPct}%`, width: `${innerGapPct}%` }}
                    transition={{ type: 'spring', stiffness: 70, damping: 16, mass: 0.9 }}>
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent,transparent_6px,rgba(6,182,212,0.06)_6px,rgba(6,182,212,0.06)_8px)]" />
                    <div className="absolute inset-0 flex items-center justify-center px-2">
                      <motion.span className="text-sm font-black text-cyan-700/70 font-mono bg-white/90 px-3 py-1 rounded-full backdrop-blur-sm border border-cyan-200/50 shadow-sm flex-shrink-0">
                        <AnimatedValue value={Math.round(innerGap)} unit="mm" />
                      </motion.span>
                    </div>
                  </motion.div>

                  <motion.div
                    className={`absolute top-1/2 h-24 -translate-y-1/2 rounded-r-xl border-2 flex items-center justify-center z-10 ${isAtLeftRail ? 'bg-red-500/30 border-red-600 shadow-[0_0_24px_rgba(239,68,68,0.3)]' : 'bg-slate-800 border-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.15)]'}`}
                    style={{ width: `${plateWidthPct}%` }} animate={{ left: `${leftPlateOuterPct}%` }}
                    transition={{ type: 'spring', stiffness: 70, damping: 16, mass: 0.9 }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base font-black uppercase tracking-[0.25em] text-white">LEFT</span>
                      <span className="text-[10px] font-mono text-white/60">{Math.round(leftPlateOuter)}mm</span>
                    </div>
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.6)] z-20" />
                  </motion.div>

                  <motion.div
                    className={`absolute top-1/2 h-24 -translate-y-1/2 rounded-l-xl border-2 flex items-center justify-center z-10 ${isAtRightRail ? 'bg-red-500/30 border-red-600 shadow-[0_0_24px_rgba(239,68,68,0.3)]' : 'bg-slate-800 border-slate-700 shadow-[0_8px_24px_rgba(0,0,0,0.15)]'}`}
                    style={{ width: `${plateWidthPct}%` }} animate={{ left: `${rightPlateInnerPct}%` }}
                    transition={{ type: 'spring', stiffness: 70, damping: 16, mass: 0.9 }}>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-base font-black uppercase tracking-[0.25em] text-white">RIGHT</span>
                      <span className="text-[10px] font-mono text-white/60">{Math.round(rightPlateOuter)}mm</span>
                    </div>
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-cyan-400 border-2 border-white shadow-[0_0_12px_rgba(6,182,212,0.6)] z-20" />
                  </motion.div>
                </div>

                <div className="absolute inset-x-10 bottom-3 flex justify-between items-end">
                  {Array.from({ length: 13 }, (_, i) => {
                    const mm = Math.round((i / 12) * RAIL_LENGTH_MM)
                    const isMajor = i % 3 === 0
                    return (
                      <div key={i} className="flex flex-col items-center">
                        <div className={`w-px bg-slate-400/50 ${isMajor ? 'h-3' : 'h-1.5'}`} />
                        {isMajor && <span className="text-[8px] font-mono text-slate-400 mt-0.5">{mm}</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <IndustrialButton
                size="lg" variant="outline"
                onClick={() => executeCommand('left', -1, -1)}
                active={activeAction === 'left'}
                disabled={isAtLeftRail || activeCommand !== null}
              >
                <ArrowLeftToLine className="w-5 h-5" />
                <span>Move Left</span>
              </IndustrialButton>
              <IndustrialButton
                size="lg" variant="secondary"
                onClick={() => executeCommand('contract', 1, -1)}
                active={activeAction === 'contract'}
                disabled={isAtMinGap || activeCommand !== null}
              >
                <ChevronsRightLeft className="w-5 h-5" />
                <span>Contract</span>
              </IndustrialButton>
              <IndustrialButton
                size="lg" variant="accent"
                onClick={() => executeCommand('expand', -1, 1)}
                active={activeAction === 'expand'}
                disabled={isAtLeftRail || isAtRightRail || activeCommand !== null}
              >
                <span>Expand</span>
                <ChevronsLeftRight className="w-5 h-5" />
              </IndustrialButton>
              <IndustrialButton
                size="lg" variant="outline"
                onClick={() => executeCommand('right', 1, 1)}
                active={activeAction === 'right'}
                disabled={isAtRightRail || activeCommand !== null}
              >
                <span>Move Right</span>
                <ArrowRightToLine className="w-5 h-5" />
              </IndustrialButton>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${isAtLeftRail || isAtRightRail || isAtMinGap ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
                <span className="text-slate-600 font-medium">
                  {isAtLeftRail || isAtRightRail || isAtMinGap ? 'AT LIMIT' : 'Within limits'}
                </span>
              </div>
              <div className="h-3 w-px bg-slate-300 hidden sm:block" />
              <span className="text-slate-500 font-mono">Rail: {RAIL_LENGTH_MM}mm</span>
              <span className="text-slate-500 font-mono">Plate: {PLATE_WIDTH_MM}mm</span>
              <span className="text-slate-500 font-mono">Gap: {MIN_GAP_MM}–{RIGHT_MAX - PLATE_WIDTH_MM - (LEFT_MIN + PLATE_WIDTH_MM)}mm</span>
              <span className="text-slate-500 font-mono">1k pulses = 1mm</span>
            </div>

            <button
              onClick={() => setShowAdjustments((v) => !v)}
              className="flex items-center justify-between w-full px-5 py-3 rounded-xl bg-slate-50 border border-slate-200/80 hover:border-slate-300 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-all"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span>Adjustments</span>
              </div>
              <motion.div animate={{ rotate: showAdjustments ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown className="w-4 h-4" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showAdjustments && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="grid grid-cols-2 gap-3">
                    <ParamInput label="Stepper 1 Speed" register="D2000" value={stepper1Speed} onChange={setStepper1Speed} />
                    <ParamInput label="Stepper 2 Speed" register="D2004" value={stepper2Speed} onChange={setStepper2Speed} />
                    <ParamInput label="Stepper 1 Distance" register="D2002" value={stepper1Dist} onChange={setStepper1Dist} />
                    <ParamInput label="Stepper 2 Distance" register="D2006" value={stepper2Dist} onChange={setStepper2Dist} />
                  <button
                    onClick={handleSetParams}
                    disabled={sendingParams}
                    className="col-span-2 mt-2 py-2.5 rounded-xl font-bold text-sm bg-cyan-500 text-white hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    {sendingParams ? 'Sending...' : 'Set All'}
                  </button>
                </div>
              </motion.div>
            )}
            </AnimatePresence>
          </div>
        </GlowingCard>
      </div>
    </section>
  )
}
