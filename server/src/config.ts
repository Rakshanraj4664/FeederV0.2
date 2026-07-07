export const CONFIG = {
  PORT: 5000,
  PLC_IP: '192.168.1.5',
  PLC_PORT: 502,
  PI_IP: '192.168.1.50',
  POLL_INTERVAL_MS: 100,
  RECONNECT_INTERVAL_MS: 3000,
  MAX_RECONNECT_ATTEMPTS: 10,

  REGISTERS: {
    MODIFIER: {
      MC1: 20002,
      MC2: 20008,
      MC3: 20014,
      MC4: 20020,
    },
    HIGH_MODIFIER: {
      MC1: 20004,
      MC2: 20010,
      MC3: 20016,
      MC4: 20022,
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
    CONVEYOR: 20026,
    CONVEYOR_MIN: 0,
    CONVEYOR_MAX: 9999,
    BASE_FREQUENCY: 32010,
    MODIFIER_MIN: 0,
    MODIFIER_MAX: 50,
  },

  LOG_DIR: './logs',
  PROFILES_DATA_PATH: './data/profiles.json',

  isDevelopment: process.env.NODE_ENV !== 'production',
} as const
