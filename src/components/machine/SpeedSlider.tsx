import { useCallback } from 'react'

const MODIFIER_MIN = 0
const MODIFIER_MAX = 50

interface SpeedSliderProps {
  value: number
  onChange: (modifier: number) => void
  disabled?: boolean
}

export function SpeedSlider({ value, onChange, disabled }: SpeedSliderProps) {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const modifier = Number(e.target.value)
      onChange(modifier)
    },
    [onChange]
  )

  return (
    <div className="relative pt-6 pb-2">
      <input
        type="range"
        min={MODIFIER_MIN}
        max={MODIFIER_MAX}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        className="w-full"
      />
      <div className="flex justify-between mt-1.5 text-[10px] font-mono text-slate-400">
        <span>0</span>
        <span>{MODIFIER_MAX}</span>
      </div>
    </div>
  )
}
