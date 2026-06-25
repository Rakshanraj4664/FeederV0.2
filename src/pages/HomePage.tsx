import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { StatusBar } from '@/components/layout/StatusBar'
import { RollerSpeedPanel } from '@/components/machine/RollerSpeedPanel'
import { WidthControlSection } from '@/components/width/WidthControlSection'
import { ToastContainer, toast } from '@/components/common/Toast'
import { writeSpeed } from '@/services/api'
import { wsService } from '@/services/websocket'
import { useMachineStore } from '@/store/machineStore'
import type { WebSocketMessage } from '@/types/api'
import { BackgroundEffect } from '@/components/common/BackgroundEffect'

export function HomePage() {
  const [showRollerSpeed, setShowRollerSpeed] = useState(false)
  const setPlcOnline = useMachineStore((s) => s.setPlcOnline)
  const setWebSocketConnected = useMachineStore((s) => s.setWebSocketConnected)
  const setLatency = useMachineStore((s) => s.setLatency)
  const setRunning = useMachineStore((s) => s.setRunning)
  const setRollerModifier = useMachineStore((s) => s.setRollerModifier)
  const setSelectedRoller = useMachineStore((s) => s.setSelectedRoller)
  const selectedRoller = useMachineStore((s) => s.selectedRoller)
  const rollers = useMachineStore((s) => s.rollers)

  useEffect(() => {
    wsService.connect()

    const unsubMsg = wsService.onMessage((msg: WebSocketMessage) => {
      setLatency(Date.now() - new Date(msg.timestamp).getTime())

      if (msg.type === 'machineState' && msg.payload) {
        const p = msg.payload as Record<string, unknown>
        if (typeof p.mc1 === 'number') setRollerModifier(0, p.mc1, p.mc1 * 32010)
        if (typeof p.mc2 === 'number') setRollerModifier(1, p.mc2, p.mc2 * 32010)
        if (typeof p.mc3 === 'number') setRollerModifier(2, p.mc3, p.mc3 * 32010)
        if (typeof p.mc4 === 'number') setRollerModifier(3, p.mc4, p.mc4 * 32010)
      }

      if (msg.type === 'status' && msg.payload) {
        const p = msg.payload as { plcOnline?: boolean; running?: boolean }
        if (typeof p.plcOnline === 'boolean') setPlcOnline(p.plcOnline)
        if (typeof p.running === 'boolean') setRunning(p.running)
      }
    })

    const unsubStat = wsService.onStatus((connected) => {
      setWebSocketConnected(connected)
      if (connected) {
        toast('success', 'WebSocket connected')
      } else {
        toast('error', 'WebSocket disconnected')
      }
    })

    return () => {
      unsubMsg()
      unsubStat()
      wsService.disconnect()
    }
  }, [])

  const speedData: Record<number, { speed: number }> = {
    1: { speed: Math.round(rollers[0].modifier / 99.99) },
    2: { speed: Math.round(rollers[1].modifier / 99.99) },
    3: { speed: Math.round(rollers[2].modifier / 99.99) },
    4: { speed: Math.round(rollers[3].modifier / 99.99) },
  }

  const handleSpeedChange = async (axis: number, speed: number) => {
    const modifier = Math.min(9999, Math.max(0, Math.round(speed * 99.99)))
    setRollerModifier(axis - 1, modifier, modifier * 32010)
    try {
      await writeSpeed(axis, modifier)
    } catch {
      toast('error', `Failed to write Roller ${axis} speed`)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 relative">
      <BackgroundEffect />
      <Header />

      <main className="pt-20 pb-4 px-4 md:px-6 max-w-5xl mx-auto">
        <WidthControlSection />

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setShowRollerSpeed((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200/80 text-slate-600 hover:text-slate-800 text-sm font-semibold transition-all"
          >
            <Settings className="w-4 h-4" />
            Roller Speed
            <span className="text-slate-400 text-xs">{showRollerSpeed ? '▾' : '▸'}</span>
          </button>
        </div>

        <AnimatePresence>
          {showRollerSpeed && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="mt-4"
            >
              <RollerSpeedPanel
                rollers={speedData}
                selectedRoller={selectedRoller + 1}
                onSelectRoller={(axis) => setSelectedRoller(axis - 1)}
                onSpeedChange={handleSpeedChange}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="sticky bottom-0">
        <StatusBar />
      </footer>

      <ToastContainer />
    </div>
  )
}
