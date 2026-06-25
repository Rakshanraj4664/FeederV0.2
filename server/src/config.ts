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
    RUNNING_INPUT: 0,
    BASE_FREQUENCY: 32010,
    MODIFIER_MIN: 0,
    MODIFIER_MAX: 9999,
  },

  WHITELIST_PATH: './whitelist.txt',
  LOG_DIR: './logs',

  isDevelopment: process.env.NODE_ENV !== 'production',
} as const
