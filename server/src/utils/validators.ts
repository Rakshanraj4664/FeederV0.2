import { CONFIG } from '../config.js'

export function validateSpeedValue(value: unknown): number | null {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < CONFIG.REGISTERS.MODIFIER_MIN || num > CONFIG.REGISTERS.MODIFIER_MAX) {
    return null
  }
  return num
}

export function validateWidthGap(value: unknown): number | null {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (num < 800 || num > 2000) return null
  return Math.round(num)
}

export function validateWidthOffset(value: unknown): number | null {
  const num = Number(value)
  if (!Number.isFinite(num)) return null
  if (Math.abs(num) > 400) return null
  return Math.round(num)
}
