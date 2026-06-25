export const REGISTERS = {
  MODIFIER: {
    MC1: 20002,
    MC2: 20008,
    MC3: 20014,
    MC4: 20020,
  },
  AXIS_SPEED: {
    AXIS1: 28022,
    AXIS2: 28024,
    AXIS3: 28026,
    AXIS4: 28028,
  },
  WIDTH: {
    EXPAND: 2000,
    CONTRACT: 2004,
  },
  BASE_FREQUENCY: 32010,
} as const

export const REGISTER_ADDRESSES = [
  { address: 20002, name: 'MC1 Modifier', group: 'modifier' as const },
  { address: 20008, name: 'MC2 Modifier', group: 'modifier' as const },
  { address: 20014, name: 'MC3 Modifier', group: 'modifier' as const },
  { address: 20020, name: 'MC4 Modifier', group: 'modifier' as const },
  { address: 28022, name: 'Axis 1 Speed', group: 'speed' as const },
  { address: 28024, name: 'Axis 2 Speed', group: 'speed' as const },
  { address: 28026, name: 'Axis 3 Speed', group: 'speed' as const },
  { address: 28028, name: 'Axis 4 Speed', group: 'speed' as const },
  { address: 2000, name: 'Width Expand', group: 'width' as const },
  { address: 2004, name: 'Width Contract', group: 'width' as const },
] as const
