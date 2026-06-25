import { RollerCard } from './RollerCard'

interface RollerSpeedPanelProps {
  rollers: Record<number, { speed: number }>
  selectedRoller: number
  onSelectRoller: (axis: number) => void
  onSpeedChange: (axis: number, speed: number) => void
}

const REGISTER_MAP: Record<number, string> = {
  1: 'D28022',
  2: 'D28024',
  3: 'D28026',
  4: 'D28028',
}

export function RollerSpeedPanel({ rollers, selectedRoller, onSelectRoller, onSpeedChange }: RollerSpeedPanelProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((axis) => (
          <RollerCard
            key={axis}
            axis={axis}
            label={`Roller ${axis}`}
            register={REGISTER_MAP[axis]}
            speed={rollers[axis]?.speed ?? 0}
            selected={selectedRoller === axis}
            onSelect={() => onSelectRoller(axis)}
            onSpeedChange={onSpeedChange}
          />
        ))}
      </div>
    </div>
  )
}
