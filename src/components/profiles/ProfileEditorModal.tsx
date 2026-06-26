import { useState } from 'react'
import { RollerCard } from '@/components/machine/RollerCard'
import { ConveyorCard } from '@/components/machine/ConveyorCard'

interface RollerData {
  modifier: number
  highModifier: number
}

interface ProfileEditorModalProps {
  profileName: string
  initialRollers: RollerData[]
  initialConveyor: number
  onConfirm: (rollers: RollerData[], conveyor: number) => void
  onClose: () => void
}

export function ProfileEditorModal({ profileName, initialRollers, initialConveyor, onConfirm, onClose }: ProfileEditorModalProps) {
  const [rollers, setRollers] = useState<RollerData[]>(initialRollers)
  const [conveyor, setConveyor] = useState(initialConveyor)

  const updateRoller = (index: number, modifier: number, highModifier: number) => {
    setRollers((prev) => {
      const next = [...prev]
      next[index] = { modifier, highModifier }
      return next
    })
  }

  const handleLowChange = (axis: number, speed: number) => {
    const idx = axis - 1
    updateRoller(idx, Math.min(50, Math.max(0, Math.round(speed))), rollers[idx].highModifier)
  }

  const handleHighChange = (axis: number, speed: number) => {
    const idx = axis - 1
    updateRoller(idx, rollers[idx].modifier, Math.min(50, Math.max(0, Math.round(speed))))
  }

  const handleConfirm = () => {
    onConfirm(rollers, conveyor)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-3xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-2">
          <h2 className="text-base font-bold text-slate-800">{profileName}</h2>
        </div>

        <div className="px-6">
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((axis) => {
              const idx = axis - 1
              return (
                <RollerCard
                  key={axis}
                  axis={axis}
                  label={`Roller ${axis}`}
                  lowRegister=""
                  highRegister=""
                  lowSetpoint={rollers[idx].modifier}
                  highSetpoint={rollers[idx].highModifier}
                  actualSpeed={0}
                  selected={false}
                  onSelect={() => {}}
                  onLowSpeedChange={handleLowChange}
                  onHighSpeedChange={handleHighChange}
                  editing
                />
              )
            })}
          </div>

          <div className="mt-4">
            <ConveyorCard
              value={conveyor}
              onValueChange={(v) => setConveyor(Math.min(9999, Math.max(0, Math.round(v))))}
              hideSet
            />
          </div>
        </div>

        <div className="sticky bottom-0 bg-white px-6 py-4 border-t border-slate-100 rounded-b-2xl flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-slate-200 text-slate-600 text-sm font-bold hover:bg-slate-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 rounded-xl bg-cyan-500 text-white text-sm font-bold hover:bg-cyan-400 transition-all"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}