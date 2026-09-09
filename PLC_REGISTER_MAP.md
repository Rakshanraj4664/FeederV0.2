# PLC Register Map — Delta AS Series

## Modbus Holding Register Addresses

All registers are **Modbus Holding Registers** (function codes 0x03 read, 0x06 write) on the **Delta AS Series PLC** at `192.168.1.6:502`. Each register is 16-bit unsigned.

Delta AS series addressing: `D` registers map directly to Modbus holding register addresses (e.g. D20002 → address 20002). `X` inputs map to Modbus discrete inputs starting at address 0 (X0.0 → address 0).

### MC Modifier Registers (D20000 Range)

| Address | Name          | Type    | Description                  | Range      | R/W |
|---------|---------------|---------|------------------------------|------------|-----|
| 20002   | MC1 Modifier  | uint16  | Speed modifier for Motor MC1 | 0 – 9999   | R/W |
| 20008   | MC2 Modifier  | uint16  | Speed modifier for Motor MC2 | 0 – 9999   | R/W |
| 20014   | MC3 Modifier  | uint16  | Speed modifier for Motor MC3 | 0 – 9999   | R/W |
| 20020   | MC4 Modifier  | uint16  | Speed modifier for Motor MC4 | 0 – 9999   | R/W |

### Axis Speed Registers (D28000 Range)

| Address | Name          | Type    | Description                            | Range                  | R/W |
|---------|---------------|---------|----------------------------------------|------------------------|-----|
| 28022   | Axis 1 Speed  | uint16  | Calculated drive frequency for Axis 1  | 0 – 320,100,000 (SC)  | R   |
| 28024   | Axis 2 Speed  | uint16  | Calculated drive frequency for Axis 2  | 0 – 320,100,000 (SC)  | R   |
| 28026   | Axis 3 Speed  | uint16  | Calculated drive frequency for Axis 3  | 0 – 320,100,000 (SC)  | R   |
| 28028   | Axis 4 Speed  | uint16  | Calculated drive frequency for Axis 4  | 0 – 320,100,000 (SC)  | R   |

> **Note:** Speed registers are **read-only** from the HMI. The PLC drive calculates these from the modifier × base frequency. The actual physical range may exceed 65535 if scaled by the drive.

### Width Registers (D2000 Range)

| Address | Name            | Type    | Description                              | Range    | R/W |
|---------|-----------------|---------|------------------------------------------|----------|-----|
| 2000    | Width Expand    | uint16  | Target width gap for expansion (mm ×10)  | 800–2000 | R/W |
| 2004    | Width Contract  | uint16  | Width offset adjustment (mm ×10)         | 0–400    | R/W |

### Frequency Register

| Address | Name           | Type    | Description                             | Range    | R/W |
|---------|----------------|---------|-----------------------------------------|----------|-----|
| 32010   | Base Frequency | uint16  | Base drive frequency multiplier (Hz ×10) | 0–65535  | R/W |

## Complete Register Summary

```
  Address   |  Name               |  Group       |  R/W
  ----------+---------------------+--------------+-------
  2000      |  Width Expand       |  width       |  R/W
  2004      |  Width Contract     |  width       |  R/W
  20002     |  MC1 Modifier       |  modifier    |  R/W
  20008     |  MC2 Modifier       |  modifier    |  R/W
  20014     |  MC3 Modifier       |  modifier    |  R/W
  20020     |  MC4 Modifier       |  modifier    |  R/W
  28022     |  Axis 1 Speed       |  speed       |  R
  28024     |  Axis 2 Speed       |  speed       |  R
  28026     |  Axis 3 Speed       |  speed       |  R
  28028     |  Axis 4 Speed       |  speed       |  R
  32010     |  Base Frequency     |  frequency   |  R/W
```

### Register Address Mapping (Source Code Constant)

```typescript
// server/src/config.ts
REGISTERS: {
  MODIFIER:  { MC1: 20002, MC2: 20008, MC3: 20014, MC4: 20020 },
  AXIS_SPEED: { AXIS1: 28022, AXIS2: 28024, AXIS3: 28026, AXIS4: 28028 },
  WIDTH:     { EXPAND: 2000, CONTRACT: 2004 },
  BASE_FREQUENCY: 32010,
  MODIFIER_MIN: 0,
  MODIFIER_MAX: 9999,
}
```

## Speed Calculation Formula

```
  Axis Speed = Modifier × Base Frequency

  Example:
    Modifier = 500
    Base Frequency = 32010
    Axis Speed = 500 × 32010 = 16,005,000 Hz (16.005 MHz)

  Where:
    Modifier       = value written to D20002..D20020 (0 – 9999)
    Base Frequency = value read from D32010 (typically 32010 = 3201.0 Hz ×10)
    Axis Speed     = value read from D28022..D28028 (displayed as Hz)
```

The base frequency register (32010) provides a scaling factor. The PLC drive multiplies the operator-entered modifier by this base value to produce the final drive frequency. The HMI reads back the computed speed from the axis speed registers for display.

## MC-to-Axis Mapping

```
  MC1 (D20002)  --->  Axis 1 (D28022)
  MC2 (D20008)  --->  Axis 2 (D28024)
  MC3 (D20014)  --->  Axis 3 (D28026)
  MC4 (D20020)  --->  Axis 4 (D28028)
```

Each Modifier register is paired with a Speed register. Writing to MC1 automatically updates Axis 1 speed on the PLC side.

## I/O Mapping — Delta AS Series Discrete I/O

Digital inputs (`X`) are read via Modbus function code 02 (Read Discrete Inputs). Address mapping: `X0.0` → Modbus discrete input address `0`, `X0.1` → address `1`, etc.

### Digital Inputs

| Address | Name         | Description                              |
|---------|--------------|------------------------------------------|
| X0.0    | RUN          | Machine running signal (main input)      |
| X0.10   | ESTOP_IN     | Emergency stop push button (NC)          |
| X0.11   | MC1_RUNNING  | MC1 motor running feedback               |
| X0.12   | MC2_RUNNING  | MC2 motor running feedback               |
| X0.13   | MC3_RUNNING  | MC3 motor running feedback               |
| X0.14   | MC4_RUNNING  | MC4 motor running feedback               |
| X0.15   | WIDTH_SENSOR | Width measurement sensor input           |
| X0.16   | SAFETY_GUARD | Safety guard door closed (NC)            |
| X0.17   | SYSTEM_READY | System ready/power good signal           |

### Digital Outputs

| Address | Name         | Description                         |
|---------|--------------|-------------------------------------|
| Y0.2    | MC1_ENABLE   | Enable MC1 motor drive              |
| Y0.3    | MC2_ENABLE   | Enable MC2 motor drive              |
| Y0.4    | MC3_ENABLE   | Enable MC3 motor drive              |
| Y0.5    | MC4_ENABLE   | Enable MC4 motor drive              |

### I/O Interaction with HMI

- **Running status**: The backend reads `X0.0` (Modbus discrete input 0) every 100ms via `readDiscreteInputs(0, 1)`. The frontend displays RUNNING/STOPPED in the header badge.
- **Emergency stop** (`POST /api/machine/emergency`): Sets all modifier registers (D20002–D20020) to 0. The PLC reads X0.10 directly for hardware E-Stop, which overrides all HMI commands at the drive level.
- **Motor enable**: The HMI does not directly write to Y outputs. The PLC logic enables Y0.2–Y0.5 based on conditions: no E-Stop (X0.10), safety guard closed (X0.16), system ready (X0.17), and modifier > 0.
