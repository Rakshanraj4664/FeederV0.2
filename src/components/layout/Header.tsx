import { useMachineStore } from '@/store/machineStore'
import { LABELS } from '@/constants/machine'
import { setRollerSpeed, writeConveyorSpeed, emergencyStop as apiEmergencyStop } from '@/services/api'
import { Wifi, WifiOff, Cpu, MonitorOff, OctagonAlert, Play, Square, ShieldCheck } from 'lucide-react'

function StatusBadge({ online, labelOn, labelOff, IconOn, IconOff }: {
  online: boolean
  labelOn: string
  labelOff: string
  IconOn: typeof Wifi
  IconOff: typeof MonitorOff
}) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
      online
        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
        : 'bg-red-50 text-red-700 border border-red-200'
    }`}>
      {online ? <IconOn className="w-3.5 h-3.5" /> : <IconOff className="w-3.5 h-3.5" />}
      <span>{online ? labelOn : labelOff}</span>
    </div>
  )
}

export function Header() {
  const { plcOnline, piOnline, running, emergencyStop } = useMachineStore()

  const handleEmergency = async () => {
    const store = useMachineStore.getState()
    const snapshot = store.rollers.map(r => ({ modifier: r.modifier, highModifier: r.highModifier }))
    store.setSavedRollers(snapshot)
    store.setSavedConveyor(store.conveyorValue)

    try {
      await apiEmergencyStop()
    } catch {
      // backend write failed, still reset UI locally
    }
    store.setEmergencyStop(true)
    for (let i = 0; i < 4; i++) {
      store.setRollerModifier(i, 0)
    }
    store.setConveyorValue(0)
  }

  const handleRelease = async () => {
    const store = useMachineStore.getState()
    const saved = store.savedRollers
    if (!saved) return

    const savedConveyor = store.savedConveyor
    store.releaseEmergencyStop()

    try {
      for (let i = 0; i < 4; i++) {
        await setRollerSpeed(i + 1, saved[i].modifier, saved[i].highModifier)
      }
      await writeConveyorSpeed(savedConveyor)
    } catch {
      // PLC write failed, store already restored locally
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-panel">
      <div className="flex items-center justify-between px-4 md:px-6 h-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-industrial-800 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <h1 className="text-xl font-black tracking-[0.15em] text-industrial-800 uppercase">
            {LABELS.APP_TITLE}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge
            online={plcOnline}
            labelOn={LABELS.PLC_ONLINE}
            labelOff={LABELS.PLC_OFFLINE}
            IconOn={Wifi}
            IconOff={WifiOff}
          />
          <StatusBadge
            online={piOnline}
            labelOn={LABELS.PI_ONLINE}
            labelOff={LABELS.PI_OFFLINE}
            IconOn={Cpu}
            IconOff={MonitorOff}
          />
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${
            running
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-500 border border-slate-200'
          }`}>
            {running ? <Play className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
            <span>{running ? 'RUNNING' : 'STOPPED'}</span>
          </div>
          {emergencyStop ? (
            <button
              onClick={handleRelease}
              className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-emerald-600/25 transition-all active:scale-95 animate-pulse"
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="hidden sm:inline">RELEASE</span>
              <span className="sm:hidden">REL</span>
            </button>
          ) : (
            <button
              onClick={handleEmergency}
              className="ml-2 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-[11px] font-bold uppercase tracking-wider shadow-lg shadow-red-600/25 transition-all active:scale-95"
            >
              <OctagonAlert className="w-4 h-4" />
              <span className="hidden sm:inline">{LABELS.EMERGENCY_STOP}</span>
              <span className="sm:hidden">E-STOP</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
