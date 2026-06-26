import { RollerCard } from './RollerCard'
import { ConveyorCard } from './ConveyorCard'

interface RollerSpeedPanelProps {
  rollers: Record<number, { lowSetpoint: number; highSetpoint: number; actualSpeed: number }>
  selectedRoller: number
  onSelectRoller: (axis: number) => void
  onLowSpeedChange: (axis: number, speed: number) => void
  onHighSpeedChange: (axis: number, speed: number) => void
  onSetSpeed: (axis: number) => void
  settingRoller: number | null
  conveyorValue: number
  onConveyorChange: (value: number) => void
  onConveyorSet: () => void
  conveyorSetting: boolean
}

const LOW_REGISTER_MAP: Record<number, string> = {
  1: 'D20002',
  2: 'D20008',
  3: 'D20014',
  4: 'D20020',
}

const HIGH_REGISTER_MAP: Record<number, string> = {
  1: 'D20004',
  2: 'D20010',
  3: 'D20016',
  4: 'D20022',
}

export function RollerSpeedPanel({ rollers, selectedRoller, onSelectRoller, onLowSpeedChange, onHighSpeedChange, onSetSpeed, settingRoller, conveyorValue, onConveyorChange, onConveyorSet, conveyorSetting }: RollerSpeedPanelProps) {
  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map((axis) => (
          <RollerCard
            key={axis}
            axis={axis}
            label={`Roller ${axis}`}
            lowRegister={LOW_REGISTER_MAP[axis]}
            highRegister={HIGH_REGISTER_MAP[axis]}
            lowSetpoint={rollers[axis]?.lowSetpoint ?? 0}
            highSetpoint={rollers[axis]?.highSetpoint ?? 0}
            actualSpeed={rollers[axis]?.actualSpeed ?? 0}
            selected={selectedRoller === axis}
            onSelect={() => onSelectRoller(axis)}
            onLowSpeedChange={onLowSpeedChange}
            onHighSpeedChange={onHighSpeedChange}
            onSetSpeed={onSetSpeed}
            setting={settingRoller === axis}
          />
        ))}
      </div>
      <div className="mt-4">
        <ConveyorCard
          value={conveyorValue}
          onValueChange={onConveyorChange}
          onSet={onConveyorSet}
          setting={conveyorSetting}
        />
      </div>
    </div>
  )
}