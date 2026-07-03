import { Router } from 'express'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { ApiResponse } from '../types/api.js'
import { broadcast } from '../services/wsBroadcast.js'

const router = Router()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const DATA_DIR = join(__dirname, '..', '..', 'data')
const PROFILES_FILE = join(DATA_DIR, 'profiles.json')

async function ensureDataDir(): Promise<void> {
  try {
    await access(DATA_DIR)
  } catch {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function readProfiles(): Promise<Record<string, unknown>[]> {
  await ensureDataDir()
  try {
    const content = await readFile(PROFILES_FILE, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

async function writeProfiles(profiles: Record<string, unknown>[]): Promise<void> {
  await ensureDataDir()
  await writeFile(PROFILES_FILE, JSON.stringify(profiles, null, 2), 'utf-8')
}

router.get('/', async (_req, res) => {
  try {
    const profiles = await readProfiles()
    const response: ApiResponse = {
      success: true,
      data: profiles,
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to read profiles',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

router.post('/', async (req, res) => {
  try {
    const profile = req.body
    if (!profile || !profile.id || !profile.name) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid profile: id and name are required',
        timestamp: new Date().toISOString(),
      }
      res.status(400).json(response)
      return
    }
    const profiles = await readProfiles()
    profiles.push(profile)
    await writeProfiles(profiles)
    broadcast(JSON.stringify({ type: 'profiles_changed', payload: {}, timestamp: new Date().toISOString() }))
    const response: ApiResponse = {
      success: true,
      data: profile,
      timestamp: new Date().toISOString(),
    }
    res.status(201).json(response)
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to create profile',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const updates = req.body
    const profiles = await readProfiles()
    const index = profiles.findIndex((p: Record<string, unknown>) => p.id === id)
    if (index === -1) {
      const response: ApiResponse = {
        success: false,
        error: 'Profile not found',
        timestamp: new Date().toISOString(),
      }
      res.status(404).json(response)
      return
    }
    profiles[index] = { ...profiles[index], ...updates }
    await writeProfiles(profiles)
    broadcast(JSON.stringify({ type: 'profiles_changed', payload: {}, timestamp: new Date().toISOString() }))
    const response: ApiResponse = {
      success: true,
      data: profiles[index],
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to update profile',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const profiles = await readProfiles()
    const index = profiles.findIndex((p: Record<string, unknown>) => p.id === id)
    if (index === -1) {
      const response: ApiResponse = {
        success: false,
        error: 'Profile not found',
        timestamp: new Date().toISOString(),
      }
      res.status(404).json(response)
      return
    }
    profiles.splice(index, 1)
    await writeProfiles(profiles)
    broadcast(JSON.stringify({ type: 'profiles_changed', payload: {}, timestamp: new Date().toISOString() }))
    const response: ApiResponse = {
      success: true,
      data: { id },
      timestamp: new Date().toISOString(),
    }
    res.json(response)
  } catch {
    const response: ApiResponse = {
      success: false,
      error: 'Failed to delete profile',
      timestamp: new Date().toISOString(),
    }
    res.status(500).json(response)
  }
})

export default router
