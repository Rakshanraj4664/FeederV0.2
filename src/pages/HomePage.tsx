import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Settings } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { StatusBar } from '@/components/layout/StatusBar'
import { RollerSpeedPanel } from '@/components/machine/RollerSpeedPanel'
import { WidthControlSection } from '@/components/width/WidthControlSection'
import { ToastContainer, toast } from '@/components/common/Toast'
import { setRollerSpeed, writeConveyorSpeed } from '@/services/api'
import { wsService } from '@/services/websocket'
import { useMachineStore } from '@/store/machineStore'
import type { WebSocketMessage } from '@/types/api'
import { ProfileSection } from '@/components/profiles/ProfileSection'
import { BackgroundEffect } from '@/components/common/BackgroundEffect'

export function HomePage() {
  const [showRollerSpeed, setShowRollerSpeed] = useState(false)
  const [settingRoller, setSettingRoller] = useState<number | null>(null)
  const [conveyorSetting, setConveyorSetting] = useState(false)
  const initialLoadDone = useRef(false)
  const setPlcOnline = useMachineStore((s) => s.setPlcOnline)
  const setPiOnline = useMachineStore((s) => s.setPiOnline)
  const setWebSocketConnected = useMachineStore((s) => s.setWebSocketConnected)
  const setLatency = useMachineStore((s) => s.setLatency)
  const setRunning = useMachineStore((s) => s.setRunning)
  const setRollerModifier = useMachineStore((s) => s.setRollerModifier)
  const setRollerHighModifier = useMachineStore((s) => s.setRollerHighModifier)
  const setRollerActualSpeed = useMachineStore((s) => s.setRollerActualSpeed)
  const setConveyorValue = useMachineStore((s) => s.setConveyorValue)
  const setSelectedRoller = useMachineStore((s) => s.setSelectedRoller)
  const selectedRoller = useMachineStore((s) => s.selectedRoller)
  const rollers = useMachineStore((s) => s.rollers)
  const conveyorValue = useMachineStore((s) => s.conveyorValue)

  useEffect(() => {
    wsService.connect()

    const unsubMsg = wsService.onMessage((msg: WebSocketMessage) => {
      setLatency(Date.now() - new Date(msg.timestamp).getTime())

      if (msg.type === 'machineState' && msg.payload) {
        const p = msg.payload as Record<string, unknown>

        if (!initialLoadDone.current) {
          if (typeof p.mc1 === 'number') setRollerModifier(0, p.mc1)
          if (typeof p.mc2 === 'number') setRollerModifier(1, p.mc2)
          if (typeof p.mc3 === 'number') setRollerModifier(2, p.mc3)
          if (typeof p.mc4 === 'number') setRollerModifier(3, p.mc4)
          if (typeof p.mc1High === 'number') setRollerHighModifier(0, p.mc1High)
          if (typeof p.mc2High === 'number') setRollerHighModifier(1, p.mc2High)
          if (typeof p.mc3High === 'number') setRollerHighModifier(2, p.mc3High)
          if (typeof p.mc4High === 'number') setRollerHighModifier(3, p.mc4High)
          if (typeof p.conveyor === 'number') setConveyorValue(p.conveyor)
          initialLoadDone.current = true
        }

        if (typeof p.speed1 === 'number') setRollerActualSpeed(0, p.speed1)
        if (typeof p.speed2 === 'number') setRollerActualSpeed(1, p.speed2)
        if (typeof p.speed3 === 'number') setRollerActualSpeed(2, p.speed3)
        if (typeof p.speed4 === 'number') setRollerActualSpeed(3, p.speed4)
      }

      if (msg.type === 'status' && msg.payload) {
        const p = msg.payload as { plcOnline?: boolean; running?: boolean }
        if (typeof p.plcOnline === 'boolean') setPlcOnline(p.plcOnline)
        if (typeof p.running === 'boolean') setRunning(p.running)
      }
    })

    const unsubStat = wsService.onStatus((connected) => {
      setWebSocketConnected(connected)
      setPiOnline(connected)
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

  const speedData: Record<number, { lowSetpoint: number; highSetpoint: number }> = {
    1: { lowSetpoint: Math.round(rollers[0].modifier), highSetpoint: Math.round(rollers[0].highModifier) },
    2: { lowSetpoint: Math.round(rollers[1].modifier), highSetpoint: Math.round(rollers[1].highModifier) },
    3: { lowSetpoint: Math.round(rollers[2].modifier), highSetpoint: Math.round(rollers[2].highModifier) },
    4: { lowSetpoint: Math.round(rollers[3].modifier), highSetpoint: Math.round(rollers[3].highModifier) },
  }

  const handleLowSpeedChange = useCallback((axis: number, speed: number) => {
    const modifier = Math.min(50, Math.max(0, Math.round(speed)))
    setRollerModifier(axis - 1, modifier)
  }, [setRollerModifier])

  const handleHighSpeedChange = useCallback((axis: number, speed: number) => {
    const modifier = Math.min(50, Math.max(0, Math.round(speed)))
    setRollerHighModifier(axis - 1, modifier)
  }, [setRollerHighModifier])

  const handleConveyorChange = useCallback((value: number) => {
    setConveyorValue(Math.min(9999, Math.max(0, Math.round(value))))
  }, [setConveyorValue])

  const handleConveyorSet = useCallback(async () => {
    setConveyorSetting(true)
    try {
      await writeConveyorSpeed(conveyorValue)
      toast('success', `Conveyor set to ${conveyorValue}`)
    } catch {
      toast('error', 'Failed to set Conveyor speed')
    } finally {
      setConveyorSetting(false)
    }
  }, [conveyorValue])

  const handleSetSpeed = useCallback(async (axis: number) => {
    const idx = axis - 1
    const low = rollers[idx].modifier
    const high = rollers[idx].highModifier
    setSettingRoller(axis)
    try {
      await setRollerSpeed(axis, low, high)
      toast('success', `Roller ${axis} set (Low: ${low}, High: ${high})`)
    } catch {
      toast('error', `Failed to set Roller ${axis}`)
    } finally {
      setSettingRoller(null)
    }
  }, [rollers])

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
                onLowSpeedChange={handleLowSpeedChange}
                onHighSpeedChange={handleHighSpeedChange}
                onSetSpeed={handleSetSpeed}
                settingRoller={settingRoller}
                conveyorValue={conveyorValue}
                onConveyorChange={handleConveyorChange}
                onConveyorSet={handleConveyorSet}
                conveyorSetting={conveyorSetting}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <ProfileSection />
      </main>

      <footer className="sticky bottom-0">
        <StatusBar />
      </footer>

      <ToastContainer />
    </div>
  )
}