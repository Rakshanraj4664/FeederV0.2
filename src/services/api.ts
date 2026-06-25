import axios from 'axios'
import type { ApiResponse, MachineStateResponse, StatusResponse, RegisterListResponse, SpeedWriteRequest } from '@/types/api'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.response.use(
  (res) => res,
  (error) => {
    const message = error.response?.data?.error || error.message || 'Network error'
    return Promise.reject(new Error(message))
  }
)

export async function getStatus(): Promise<ApiResponse<StatusResponse>> {
  const { data } = await client.get(API_ENDPOINTS.STATUS)
  return data
}

export async function getMachineState(): Promise<ApiResponse<MachineStateResponse>> {
  const { data } = await client.get(API_ENDPOINTS.MACHINE)
  return data
}

export async function getRegisters(): Promise<ApiResponse<RegisterListResponse>> {
  const { data } = await client.get(API_ENDPOINTS.REGISTERS)
  return data
}

export async function writeSpeed(mc: number, value: number): Promise<ApiResponse> {
  const endpoint = API_ENDPOINTS[`SPEED_MC${mc}` as keyof typeof API_ENDPOINTS]
  const { data } = await client.post(endpoint, { value } satisfies SpeedWriteRequest)
  return data
}

export async function emergencyStop(): Promise<ApiResponse> {
  const { data } = await client.post(API_ENDPOINTS.EMERGENCY)
  return data
}

export async function writeWidth(gap: number, offset: number): Promise<ApiResponse> {
  const { data } = await client.post(API_ENDPOINTS.WIDTH, { gap, offset })
  return data
}

export default client
