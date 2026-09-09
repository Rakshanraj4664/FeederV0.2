import axios from 'axios'
import type { ApiResponse, MachineStateResponse, StatusResponse, RegisterListResponse, SpeedWriteRequest } from '@/types/api'
import type { Profile } from '@/types/machine'
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

export async function getStepperParams(): Promise<ApiResponse<{ speed1: number; distance1: number; speed2: number; distance2: number }>> {
  const { data } = await client.get(API_ENDPOINTS.STEPPER)
  return data
}

export async function writeStepperParams(params: {
  speed1: number; distance1: number; speed2: number; distance2: number
}): Promise<ApiResponse> {
  const { data } = await client.post(API_ENDPOINTS.STEPPER_PARAMS, params)
  return data
}

export async function triggerStepperCommand(params: {
  command: string; speed1: number; distance1: number; speed2: number; distance2: number
}): Promise<ApiResponse> {
  const { data } = await client.post(API_ENDPOINTS.STEPPER_COMMAND, params)
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

export default client
