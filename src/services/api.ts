import axios from 'axios'
import type { ApiResponse, MachineStateResponse, StatusResponse, RegisterListResponse, SpeedWriteRequest, VerifyResponse, AuthCheckResponse } from '@/types/api'
import type { Profile } from '@/types/machine'
import { API_BASE_URL, API_ENDPOINTS } from '@/constants/api'

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use(
  (config) => {
    try {
      const raw = localStorage.getItem('feeder-auth')
      if (raw) {
        const state = JSON.parse(raw)
        if (state.state?.token) {
          config.headers.Authorization = `Bearer ${state.state.token}`
        }
      }
    } catch {
    }
    return config
  },
  (error) => Promise.reject(error)
)

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

export async function writeHighSpeed(mc: number, value: number): Promise<ApiResponse> {
  const endpoint = API_ENDPOINTS[`SPEED_HIGH_MC${mc}` as keyof typeof API_ENDPOINTS]
  const { data } = await client.post(endpoint, { value } satisfies SpeedWriteRequest)
  return data
}

export async function setRollerSpeed(mc: number, low: number, high: number): Promise<ApiResponse> {
  const endpoint = API_ENDPOINTS[`SPEED_SET_MC${mc}` as keyof typeof API_ENDPOINTS]
  const { data } = await client.post(endpoint, { low, high })
  return data
}

export async function writeConveyorSpeed(value: number): Promise<ApiResponse> {
  const { data } = await client.post(API_ENDPOINTS.CONVEYOR, { value } satisfies SpeedWriteRequest)
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

export async function fetchProfiles(): Promise<Profile[]> {
  const { data } = await client.get(API_ENDPOINTS.PROFILES)
  return (data as ApiResponse<Profile[]>).data ?? []
}

export async function createProfileOnServer(profile: Profile): Promise<void> {
  await client.post(API_ENDPOINTS.PROFILES, profile)
}

export async function updateProfileOnServer(id: string, updates: Partial<Profile>): Promise<void> {
  await client.put(`${API_ENDPOINTS.PROFILES}/${id}`, updates)
}

export async function deleteProfileFromServer(id: string): Promise<void> {
  await client.delete(`${API_ENDPOINTS.PROFILES}/${id}`)
}

export async function verifyDevice(deviceId: string): Promise<ApiResponse<VerifyResponse>> {
  const { data } = await client.post(API_ENDPOINTS.AUTH_VERIFY, { deviceId })
  return data
}

export async function checkAuth(): Promise<ApiResponse<AuthCheckResponse>> {
  const { data } = await client.get(API_ENDPOINTS.AUTH_CHECK)
  return data
}

export default client
