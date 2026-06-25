import { useState, useEffect } from 'react'
import { useSpring } from 'framer-motion'

export function AnimatedValue({
  value,
  decimals = 0,
  unit = '',
}: {
  value: number
  decimals?: number
  unit?: string
}) {
  const [display, setDisplay] = useState(value)
  const spring = useSpring(value, { stiffness: 120, damping: 20 })

  useEffect(() => {
    spring.set(value)
  }, [value, spring])

  useEffect(() => {
    const unsub = spring.on('change', (v) =>
      setDisplay(Number(v.toFixed(decimals)))
    )
    return unsub
  }, [spring, decimals])

  return (
    <span className="metric-display">
      {display}
      {unit && <span className="text-slate-400 ml-1">{unit}</span>}
    </span>
  )
}
