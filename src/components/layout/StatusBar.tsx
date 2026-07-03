import { useMachineStore } from '@/store/machineStore'
import { useAuthStore } from '@/store/authStore'
import { CircleCheck, CircleX, Activity, ShieldCheck, ShieldX, Loader2 } from 'lucide-react'

function Metric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px]">
      <span className="text-slate-400 font-medium">{label}:</span>
      <span className="font-mono font-bold text-slate-700">
        {value}{unit && <span className="text-slate-400 ml-0.5">{unit}</span>}
      </span>
    </div>
  )
}

export function StatusBar() {
  const { plcOnline, websocketConnected, latency, lastUpdate } = useMachineStore()
  const { deviceId, isTrusted, isVerifying, verifyDevice } = useAuthStore()

  const timeAgo = () => {
    const diff = Date.now() - new Date(lastUpdate).getTime()
    if (diff < 1000) return '<1s'
    return `${Math.round(diff / 1000)}s`
  }

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 md:px-6 py-3 glass-panel border-t-0">
      <div className="flex items-center gap-1.5">
        {plcOnline ? (
          <CircleCheck className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <CircleX className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className="text-[11px] font-semibold text-slate-600">PLC {plcOnline ? 'Connected' : 'Disconnected'}</span>
      </div>
      <div className="flex items-center gap-1.5">
        {websocketConnected ? (
          <Activity className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <CircleX className="w-3.5 h-3.5 text-red-500" />
        )}
        <span className="text-[11px] font-semibold text-slate-600">WS {websocketConnected ? 'Live' : 'Offline'}</span>
      </div>
      <Metric label="Latency" value={latency} unit="ms" />
      <Metric label="Updated" value={timeAgo()} />

      <div className="ml-auto flex items-center gap-2">
        {isTrusted ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Trusted</span>
          </div>
        ) : isVerifying ? (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200">
            <Loader2 className="w-3.5 h-3.5 text-slate-500 animate-spin" />
            <span className="text-[11px] font-semibold text-slate-500">Verifying...</span>
          </div>
        ) : (
          <button
            onClick={verifyDevice}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-all active:scale-95"
          >
            <ShieldX className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Check Device</span>
          </button>
        )}
        <span className="text-[10px] font-mono text-slate-500">{deviceId}</span>
      </div>
    </div>
  )
}
