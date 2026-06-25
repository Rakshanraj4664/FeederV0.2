export const ROLLERS = [
  { id: 1, label: 'Roller - 1', registerModifier: 20002, registerSpeed: 28022 },
  { id: 2, label: 'Roller - 2', registerModifier: 20008, registerSpeed: 28024 },
  { id: 3, label: 'Roller - 3', registerModifier: 20014, registerSpeed: 28026 },
  { id: 4, label: 'Roller - 4', registerModifier: 20020, registerSpeed: 28028 },
] as const

export const SPEED_FORMULA = {
  BASE_FREQUENCY: 32010,
  MODIFIER_MIN: 0,
  MODIFIER_MAX: 9999,
  calculateSpeed(modifier: number): number {
    return modifier * this.BASE_FREQUENCY
  },
} as const

export const LABELS = {
  APP_TITLE: 'FEEDER',
  PLC_ONLINE: 'PLC ONLINE',
  PLC_OFFLINE: 'PLC OFFLINE',
  PI_ONLINE: 'Pi ONLINE',
  PI_OFFLINE: 'Pi OFFLINE',
  EMERGENCY_STOP: 'EMERGENCY STOP',
  CONNECTED: 'Connected',
  DISCONNECTED: 'Disconnected',
} as const
