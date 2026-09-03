import type { CarData } from '@/types'
import { demoData } from '@/data/demoData'

const STORAGE_KEY = 'drivn.carData.v1'

export function loadCarData(): CarData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return demoData
    const parsed = JSON.parse(raw) as CarData
    // Merge with demo data shape so newly added fields never crash on old saves.
    return { ...demoData, ...parsed }
  } catch {
    return demoData
  }
}

export function saveCarData(data: CarData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch {
    // Storage full or unavailable — fail silently, in-memory state still works.
  }
}

export function resetCarData(): CarData {
  localStorage.removeItem(STORAGE_KEY)
  return demoData
}

export function exportCarData(data: CarData): string {
  return JSON.stringify(data, null, 2)
}

export function importCarData(json: string): CarData {
  const parsed = JSON.parse(json) as CarData
  saveCarData(parsed)
  return parsed
}
