import { getMachineState, writeSpeed, writeWidth, emergencyStop } from './api'

export interface PlcWidthState {
  connected: boolean
  gap: number
  offset: number
}

export async function getPlcWidth(): Promise<PlcWidthState> {
  try {
    const res = await getMachineState()
    if (res.success && res.data) {
      return {
        connected: true,
        gap: res.data.widthGap,
        offset: res.data.widthOffset,
      }
    }
  } catch {
    // fall through
  }
  return { connected: false, gap: 800, offset: 0 }
}

export async function writePlcRegister(address: number, value: number): Promise<void> {
  if (address === 2000 || address === 2004) {
    await writeWidth(
      address === 2000 ? value : 0,
      address === 2004 ? value : 0
    )
    return
  }
  const mcMap: Record<number, number> = {
    20002: 1,
    20008: 2,
    20014: 3,
    20020: 4,
  }
  const mc = mcMap[address]
  if (mc) {
    await writeSpeed(mc, value)
  }
}

export async function triggerEmergencyStop(): Promise<void> {
  await emergencyStop()
}
