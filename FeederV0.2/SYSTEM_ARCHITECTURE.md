# System Architecture

## Physical Topology

```
  +------------------+         Ethernet (LAN)          +------------------+
  |                  |   =========================>    |                  |
  |  Operator Tablet |   HTTP (80) / WS (5000)         |  Raspberry Pi 4  |
  |  10" Touchscreen |   <=========================    |  192.168.1.50    |
  |  (DHCP Assigned) |                                  |                  |
  +------------------+                                  +--------+---------+
                                                                   |
                                                            Modbus TCP
                                                            Port 502  |
                                                                   |
                                                             +-------v--------+
                                                             |                |
                                                             |  Delta AS PLC  |
                                                             |  192.168.1.5   |
                                                             |  Modbus Server |
                                                             +----------------+
```

## Logical Component Diagram

```
  +------------------+     +------------------+     +------------------+
  |    Frontend      |     |     Backend      |     |       PLC        |
  |  (React + Vite)  |     |  (Express + ws)  |     |  (Modbus TCP)    |
  |                  |     |                  |     |                  |
  |  +-----------+   |     |  +-----------+   |     |  +-----------+   |
  |  | Machine   |   |     |  |  Routes   |   |     |  | D20002   |   |
  |  | Dashboard |   |     |  |           |   |     |  | D20008   |   |
  |  +-----------+   |     |  | /status   |<---------->| D20014   |   |
  |  |           |   |     |  | /machine  |   |  UDP  | D20020   |   |
  |  | Width     |   |     |  | /registers|   |  TCP  | D28022   |   |
  |  | Control   |   |     |  | /speed/mc |   |  502  | D28024   |   |
  |  +-----------+   |     |  | /width    |   |       | D28026   |   |
  |  |           |   |     |  | /emergency|   |       | D28028   |   |
  |  | Status    |   |     |  +-----------+   |       | D2000    |   |
  |  | Bar       |   |     |  |           |   |       | D2004    |   |
  |  +-----------+   |     |  | WebSocket |   |       | D32010   |   |
  |  |           |   |     |  | Server    |   |       +-----------+   |
  |  | E-Stop    |   |     |  | /ws       |   |                        |
  |  | Button    |   |     |  +-----------+   |                        |
  |  +-----------+   |     |                  |                        |
  |                  |     |  +-----------+   |                        |
  |  +-----------+   |     |  | Polling   |   |                        |
  |  | WebSocket |<---------->| Service   |   |                        |
  |  | Client    |   |  WS  |  100ms     |   |                        |
  |  +-----------+   |     |  +-----------+   |                        |
  |                  |     |                  |                        |
  |  +-----------+   |     |  +-----------+   |                        |
  |  | Zustand   |   |     |  | Modbus    |   |                        |
  |  | Store     |   |     |  | Service   |-->|                        |
  |  +-----------+   |     |  +-----------+   |                        |
  |                  |     |                  |                        |
  |  +-----------+   |     |  +-----------+   |                        |
  |  | API Client|<---------->| Device    |   |                        |
  |  | (Axios)   |   | REST | Verification|   |                        |
  |  +-----------+   |     |  +-----------+   |                        |
  +------------------+     +------------------+                        |
```

## Data Flow

### Polling Loop (100ms)

```
  Every 100ms:
  PollingService
       |
       v
  ModbusService.healthCheck() -----> PLC (Modbus TCP)
       |
       +-- success: broadcast { type: "status", payload: { plcOnline: true } }
       |
       v
  ModbusService.readMachineState()
       |
       +-- reads 10 registers sequentially:
       |     D20002, D20008, D20014, D20020   (MC1-MC4 modifiers)
       |     D28022, D28024, D28026, D28028   (Axis 1-4 speeds)
       |     D2000, D2004                      (Width expand/contract)
       |
       v
  Compare serialized state to lastState (dedup)
       |
       +-- changed: broadcast { type: "machineState", payload: {...} }
       +-- unchanged: skip
```

### REST API Flow

```
  Tablet Browser                          Express Server                     PLC
        |                                      |                           |
  POST /api/speed/mc1 { value: 500 }           |                           |
        |------------------------------------->|                           |
        |                                      | input validation          |
        |                                      |    |                      |
        |                                      | ModbusService.writeRegister(D20002, 500)
        |                                      |-------------------------->|
        |                                      |                           |
        |                                      |<--------------------------|
        |  { success: true, data: {            |                           |
        |    axis: "mc1", value: 500,          |                           |
        |    speed: 500*32010 = 1.6005e7       |                           |
        |  }}                                  |                           |
        |<-------------------------------------|                           |
```

### WebSocket Broadcast Flow

```
  PollingService                WebSocket Server                Tablet Browser
        |                              |                              |
  100ms tick                           |                              |
        |                              |                              |
  read PLC registers                   |                              |
        |                              |                              |
  JSON.stringify(msg)                  |                              |
        |                              |                              |
        |---- broadcast(data) -------->|                              |
        |                              |---- ws.send(data) ---------->|
        |                              |                              |
        |                              |---- ws.send(data) ---------->| (n clients)
        |                              |                              |
```

## Component Responsibilities

### Frontend
- **Machine Dashboard** — Displays MC1-MC4 modifier and speed values with real-time gauges
- **Width Control** — Slider/input for width gap (800-2000) and offset (-400 to 400)
- **Status Bar** — PLC online/offline, Pi status, WebSocket connection, latency
- **Emergency Stop** — Red button that sets all modifiers to 0
- **Zustand Store** — Central state, updated by WebSocket messages and REST responses

### Backend Services

| Service                    | Responsibility                                              |
|----------------------------|-------------------------------------------------------------|
| `ModbusService`            | Connect/disconnect to PLC, read/write holding registers     |
| `PollingService`           | 100ms health check + state poll, dedup, broadcast via WS    |
| `DeviceVerificationService`| Whitelist-based device authorization, 24h session tokens    |
| `LoggerService`            | Buffered JSON log writer to daily files + console output    |

### ModbusService
- Singleton managing a `modbus-serial` TCP client
- **Mock mode** auto-enabled on Windows or `NODE_ENV=development` (no real PLC needed)
- Reconnection: 10 attempts max, 3s interval between retries
- Exposes `readRegister(address)`, `writeRegister(address, value)`, `readMachineState()`, `emergencyStop()`

### PollingService
- Started by `index.ts` after PLC connection
- First calls `healthCheck()` — if PLC is offline, broadcasts `{ plcOnline: false }` and skips state read
- On success, reads full machine state and broadcasts only if changed (string comparison)

## Security

### Device Verification Abstraction Layer

```
  Tablet                Express Server               Whitelist File
    |                         |                           |
    |---- verify(deviceID) -->|                           |
    |                         |-- read whitelist.txt ---->|
    |                         |<-- check deviceID -------|
    |                         |                           |
    |<--- { token, expires }--|                           |
    |                         |                           |
    |---- API call(token) --->|                           |
    |                         |-- validateSession(token)  |
    |                         |-- grant/deny              |
```

- `whitelist.txt` contains approved MAC addresses or device IDs (one per line, `#` comments)
- `DeviceVerificationService.generateToken()` returns 32-byte crypto-random hex
- Sessions expire after 24 hours
- Endpoints return `403 Forbidden` for unverified devices

## Deployment

### PM2 Process Management

```
  +------------------+
  |   PM2 Daemon     |
  |                  |
  | feeder-frontend  |  npm run preview  (port 4173)
  | feeder-backend   |  npm run dev      (port 5000)  NODE_ENV=production
  +------------------+
```

- Auto-restart on crash (up to 10 restarts)
- Memory limit: 500MB backend restart threshold
- Log files: `logs/frontend-{error,out}.log`, `logs/backend-{error,out}.log`

### Nginx Reverse Proxy

```
  Port 80 (external)
       |
       v
  Nginx (Raspberry Pi)
       |
       +-- /   ---------> Frontend (127.0.0.1:4173)
       +-- /api/ -------> Backend  (127.0.0.1:5000)
       +-- /ws  --------> Backend  (127.0.0.1:5000)  [WebSocket upgrade]
```

### Docker (Alternative)

```
  docker-compose.yml
       |
       +-- feeder-backend  (port 5000, static IP 192.168.1.50)
       +-- feeder-frontend (port 80,  Nginx, static IP 192.168.1.51)
```

Both containers share the `feeder-net` bridge network on subnet `192.168.1.0/24`.
