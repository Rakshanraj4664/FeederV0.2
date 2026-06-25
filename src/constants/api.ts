export const API_BASE_URL = '/api'

export const WS_URL = import.meta.env.PROD
  ? `ws://${window.location.hostname}/ws`
  : `ws://${window.location.hostname}:5000/ws`

export const API_ENDPOINTS = {
  STATUS: '/status',
  MACHINE: '/machine',
  REGISTERS: '/registers',
  SPEED_MC1: '/speed/mc1',
  SPEED_MC2: '/speed/mc2',
  SPEED_MC3: '/speed/mc3',
  SPEED_MC4: '/speed/mc4',
  WIDTH: '/width',
  EMERGENCY: '/machine/emergency',
} as const

export const POLL_INTERVAL = 2000
