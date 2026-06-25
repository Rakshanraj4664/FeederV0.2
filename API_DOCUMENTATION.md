# API Documentation

Base URL: `http://192.168.1.50:5000/api` (production) or `http://localhost:5000/api` (development, proxied through Vite).

All endpoints return JSON with the following envelope:

```typescript
interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  timestamp: string    // ISO 8601
}
```

---

## REST Endpoints

### GET /api/status

Returns system status, PLC connection state, and configuration.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "plcOnline": true,
    "piOnline": true,
    "uptime": 8472,
    "version": "1.0.0",
    "whitelistCount": 3,
    "activeSessions": 1,
    "config": {
      "plcIp": "192.168.1.5",
      "piIp": "192.168.1.50",
      "pollInterval": 100
    }
  },
  "timestamp": "2026-06-24T14:30:00.000Z"
}
```

| Field            | Type    | Description                       |
|------------------|---------|-----------------------------------|
| plcOnline        | boolean | PLC Modbus TCP connection status  |
| piOnline         | boolean | Raspberry Pi host status          |
| uptime           | number  | Server uptime in seconds          |
| version          | string  | Application version               |
| whitelistCount   | number  | Number of whitelisted devices     |
| activeSessions   | number  | Number of active device sessions  |
| config.plcIp     | string  | PLC IP address                    |
| config.piIp      | string  | Pi IP address                     |
| config.pollInterval | number | Polling interval in ms          |

---

### GET /api/machine

Reads full machine state from PLC (all registers in a single request).

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "rollers": {
      "mc1": 500,
      "mc2": 320,
      "mc3": 750,
      "mc4": 0
    },
    "speeds": {
      "axis1": 16005000,
      "axis2": 10243200,
      "axis3": 24007500,
      "axis4": 0
    },
    "widthGap": 1200,
    "widthOffset": 50
  },
  "timestamp": "2026-06-24T14:30:01.000Z"
}
```

| Field          | Type   | Description                          |
|----------------|--------|--------------------------------------|
| rollers.mc[1-4] | number | Modifier value (0–9999)             |
| speeds.axis[1-4] | number | Calculated drive frequency (Hz)     |
| widthGap       | number | Width expand gap (800–2000)          |
| widthOffset    | number | Width contract offset (0–400)        |

**Response `503 Service Unavailable`:**

```json
{
  "success": false,
  "error": "Failed to read machine state",
  "timestamp": "2026-06-24T14:30:01.000Z"
}
```

---

### GET /api/registers

Reads each individual register by address and returns a flat map.

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "registers": {
      "20002": 500,
      "20008": 320,
      "20014": 750,
      "20020": 0,
      "28022": 16005000,
      "28024": 10243200,
      "28026": 24007500,
      "28028": 0,
      "2000": 1200,
      "2004": 50
    }
  },
  "timestamp": "2026-06-24T14:30:02.000Z"
}
```

| Key    | Address | Description          |
|--------|---------|----------------------|
| 20002  | D20002  | MC1 Modifier         |
| 20008  | D20008  | MC2 Modifier         |
| 20014  | D20014  | MC3 Modifier         |
| 20020  | D20020  | MC4 Modifier         |
| 28022  | D28022  | Axis 1 Speed         |
| 28024  | D28024  | Axis 2 Speed         |
| 28026  | D28026  | Axis 3 Speed         |
| 28028  | D28028  | Axis 4 Speed         |
| 2000   | D2000   | Width Expand         |
| 2004   | D2004   | Width Contract       |

---

### POST /api/speed/mc1

Writes a modifier value to MC1. Replace `mc1` with `mc2`, `mc3`, or `mc4` for the other motors.

**Request Body:**

```json
{
  "value": 500
}
```

| Field | Type   | Required | Description           |
|-------|--------|----------|-----------------------|
| value | number | yes      | 0–9999 (integer)      |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "axis": "mc1",
    "value": 500,
    "speed": 16005000
  },
  "timestamp": "2026-06-24T14:30:03.000Z"
}
```

**Response `400 Bad Request`:**

```json
{
  "success": false,
  "error": "Invalid value. Must be 0-9999",
  "timestamp": "2026-06-24T14:30:03.000Z"
}
```

**Endpoint mapping:**

| Method | Path               | Register Written |
|--------|--------------------|------------------|
| POST   | /api/speed/mc1     | D20002           |
| POST   | /api/speed/mc2     | D20008           |
| POST   | /api/speed/mc3     | D20014           |
| POST   | /api/speed/mc4     | D20020           |

---

### POST /api/width

Writes width expand gap and contract offset to the PLC.

**Request Body:**

```json
{
  "gap": 1200,
  "offset": 50
}
```

| Field  | Type   | Required | Description                     |
|--------|--------|----------|---------------------------------|
| gap    | number | yes      | Width gap, 800–2000             |
| offset | number | no       | Contract offset, 0–400 (default 0) |

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "gap": 1200,
    "offset": 50
  },
  "timestamp": "2026-06-24T14:30:04.000Z"
}
```

---

### POST /api/machine/emergency

Triggers emergency stop — all four modifier registers (D20002–D20020) are set to 0 immediately.

**Request Body:** *None*

**Response `200 OK`:**

```json
{
  "success": true,
  "data": {
    "message": "Emergency stop — all modifiers set to 0"
  },
  "timestamp": "2026-06-24T14:30:05.000Z"
}
```

---

### GET /api/health

Lightweight health check (no PLC interaction).

**Response `200 OK`:**

```json
{
  "status": "ok",
  "uptime": 8472
}
```

---

## WebSocket API

### Connection

```
ws://192.168.1.50:5000/ws    (production)
ws://localhost:5000/ws         (development — proxied)
```

The server path is `/ws` (not the default `/`). All messages are JSON text frames.

### Message Types

#### `status`

Broadcast every 100ms by the polling service.

```json
{
  "type": "status",
  "payload": {
    "plcOnline": true
  },
  "timestamp": "2026-06-24T14:30:00.100Z"
}
```

#### `machineState`

Broadcast on state change (when any register value differs from the last poll).

```json
{
  "type": "machineState",
  "payload": {
    "mc1": 500,
    "mc2": 320,
    "mc3": 750,
    "mc4": 0,
    "speed1": 16005000,
    "speed2": 10243200,
    "speed3": 24007500,
    "speed4": 0,
    "widthGap": 1200,
    "widthOffset": 50
  },
  "timestamp": "2026-06-24T14:30:00.100Z"
}
```

| Field      | Type   | Description             |
|------------|--------|-------------------------|
| mc[1-4]    | number | Modifier values         |
| speed[1-4] | number | Axis drive frequencies  |
| widthGap   | number | Width expand gap        |
| widthOffset| number | Width contract offset   |

#### `registerUpdate`

Reserved for future direct register-change notifications.

```json
{
  "type": "registerUpdate",
  "payload": {
    "address": 20002,
    "value": 500
  },
  "timestamp": "2026-06-24T14:30:06.000Z"
}
```

#### `error`

Sent on polling failure or PLC communication errors.

```json
{
  "type": "error",
  "payload": {
    "message": "Failed to read machine state",
    "code": "PLC_READ_ERROR"
  },
  "timestamp": "2026-06-24T14:30:07.000Z"
}
```

### Initial Message

On WebSocket connection, the server sends an immediate `status` message:

```json
{
  "type": "status",
  "payload": { "plcOnline": true },
  "timestamp": "2026-06-24T14:30:00.000Z"
}
```

---

## Error Response Format

All errors follow the standard envelope with no `data` field:

```json
{
  "success": false,
  "error": "<human-readable error message>",
  "timestamp": "2026-06-24T14:30:00.000Z"
}
```

| HTTP Status | Meaning                  | Common Causes                          |
|-------------|--------------------------|----------------------------------------|
| 400         | Bad Request              | Invalid value range, missing field     |
| 500         | Internal Server Error    | Emergency stop write failure           |
| 503         | Service Unavailable      | PLC offline, read/write timeout        |
