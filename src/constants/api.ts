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
  SPEED_HIGH_MC1: '/speed/high/mc1',
  SPEED_HIGH_MC2: '/speed/high/mc2',
  SPEED_HIGH_MC3: '/speed/high/mc3',
  SPEED_HIGH_MC4: '/speed/high/mc4',
  SPEED_SET_MC1: '/speed/set/mc1',
  SPEED_SET_MC2: '/speed/set/mc2',
  SPEED_SET_MC3: '/speed/set/mc3',
  SPEED_SET_MC4: '/speed/set/mc4',
  CONVEYOR: '/speed/conveyor',
  STEPPER: '/stepper',
  STEPPER_PARAMS: '/stepper/params',
  STEPPER_COMMAND: '/stepper/command',
  EMERGENCY: '/machine/emergency',
  PROFILES: '/profiles',
} as const

export const POLL_INTERVAL = 2000
