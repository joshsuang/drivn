import type { AppSettings, CarData, Vehicle } from '@/types'
import {
  describeDbError,
  DbError,
  isOffline,
  runStatements,
  type Collection,
  type MutationBatch,
  type OptimisticOp,
  type Row,
} from './db'
import { deriveMonthlySeries } from './analytics'

/**
 * Writes that couldn't reach the server yet.
 *
 * A car app gets used in parking garages and petrol stations, which is exactly
 * where the connection drops. Rather than losing the fill-up you just typed, the
 * batch is persisted here and replayed in order once the connection returns.
 * The optimistic description travels with it, so a queued edit is still visible
 * after a reload rather than vanishing until sync.
 */

const DB_NAME = 'drivn'
const STORE = 'outbox'
const DB_VERSION = 1

// ------------------------------------------------------------------ storage

let memoryFallback: MutationBatch[] | null = null

function openDatabase(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null)
  return new Promise((resolve) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    // Private-browsing modes can block IndexedDB entirely; fall back to memory
    // so the session still works, just without persistence across reloads.
    request.onerror = () => resolve(null)
    request.onblocked = () => resolve(null)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const db = await openDatabase()
  if (!db) return null
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, mode)
    const request = fn(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => resolve(null)
    tx.oncomplete = () => db.close()
  })
}

// ------------------------------------------------------------------ listeners

const listeners = new Set<(count: number) => void>()

export function onOutboxChange(listener: (count: number) => void): () => void {
  listeners.add(listener)
  pendingCount().then(listener)
  return () => listeners.delete(listener)
}

async function notify() {
  const count = await pendingCount()
  for (const listener of listeners) listener(count)
}

// ----------------------------------------------------------------------- API

export async function enqueue(batch: MutationBatch): Promise<void> {
  if (memoryFallback) {
    memoryFallback.push(batch)
  } else {
    const result = await withStore('readwrite', (store) => store.put(batch))
    if (result === null && !memoryFallback) {
      // IndexedDB refused the write — keep going in memory.
      memoryFallback = await peekAll()
      memoryFallback.push(batch)
    }
  }
  await notify()
}

export async function peekAll(): Promise<MutationBatch[]> {
  if (memoryFallback) return [...memoryFallback].sort(byAge)
  const rows = await withStore<MutationBatch[]>('readonly', (store) => store.getAll())
  return (rows ?? []).sort(byAge)
}

function byAge(a: MutationBatch, b: MutationBatch) {
  return a.createdAt - b.createdAt
}

export async function remove(id: string): Promise<void> {
  if (memoryFallback) {
    memoryFallback = memoryFallback.filter((b) => b.id !== id)
  } else {
    await withStore('readwrite', (store) => store.delete(id))
  }
  await notify()
}

export async function pendingCount(): Promise<number> {
  if (memoryFallback) return memoryFallback.length
  const rows = await withStore<MutationBatch[]>('readonly', (store) => store.getAll())
  return (rows ?? []).length
}

/**
 * Replay everything queued, oldest first. Stops at the first transient failure
 * so ordering is preserved; a permanently-rejected batch (a constraint or RLS
 * violation) is dropped and reported rather than blocking the queue forever.
 */
export async function flushOutbox(
  onDropped?: (batch: MutationBatch, message: string) => void,
): Promise<{ flushed: number; remaining: number }> {
  const batches = await peekAll()
  let flushed = 0

  for (const batch of batches) {
    if (isOffline()) break
    try {
      await runStatements(batch.statements)
      await remove(batch.id)
      flushed += 1
    } catch (error) {
      const message = describeDbError(error, 'Queued change failed')
      // A Postgres error code means the server rejected it on its merits, so
      // retrying can never succeed. A network failure carries no code.
      const permanent = error instanceof DbError && Boolean(error.code)
      if (permanent) {
        await remove(batch.id)
        onDropped?.(batch, message)
        continue
      }
      break
    }
  }

  return { flushed, remaining: await pendingCount() }
}

// ------------------------------------------------------- optimistic state

type ArrayCollection = Exclude<Collection, 'vehicle' | 'settings'>

function arraySlice(data: CarData, collection: ArrayCollection): Row[] {
  return data[collection] as unknown as Row[]
}

function applyOne(data: CarData, op: OptimisticOp): CarData {
  if (op.collection === 'vehicle') {
    if (op.kind !== 'update' || !op.patch) return data
    return { ...data, vehicle: { ...data.vehicle, ...(op.patch as Partial<Vehicle>) } }
  }
  if (op.collection === 'settings') {
    if (op.kind !== 'update' || !op.patch) return data
    return { ...data, settings: { ...data.settings, ...(op.patch as Partial<AppSettings>) } }
  }

  const collection = op.collection as ArrayCollection
  const items = arraySlice(data, collection)

  // Cascade ops target a generated event through the row it came from.
  const matches = (item: Row) =>
    op.sourceId ? item.sourceId === op.sourceId : item.id === op.id

  let next: Row[]
  if (op.kind === 'insert') {
    // Newest first, matching how the queries order every list.
    next = op.item ? [{ ...op.item, id: op.id }, ...items] : items
  } else if (op.kind === 'update') {
    next = items.map((item) => (matches(item) ? { ...item, ...(op.patch ?? {}) } : item))
  } else {
    next = items.filter((item) => !matches(item))
  }

  return { ...data, [collection]: next } as CarData
}

/** Re-derive the chart series after local fuel or mileage changes. */
export function withDerivedSeries(data: CarData): CarData {
  const { mileageByMonth, consumptionByMonth } = deriveMonthlySeries(
    data.fuelEntries,
    data.vehicle.startingMileage,
  )
  return { ...data, mileageByMonth, consumptionByMonth }
}

export function applyOptimisticOps(data: CarData, ops: OptimisticOp[] | undefined): CarData {
  if (!ops?.length) return data
  let next = data
  for (const op of ops) next = applyOne(next, op)
  return next
}

/**
 * Lay queued batches over server state, so unsynced work isn't wiped out by a
 * realtime refresh arriving from another device. Batches are applied oldest
 * first, matching the order they'll be replayed to the server.
 */
export function applyBatchOptimism(data: CarData, batches: MutationBatch[]): CarData {
  if (batches.length === 0) return data
  let next = data
  for (const batch of batches) {
    next = applyOptimisticOps(next, batch.optimistic)
    // A queued insert may also have bumped the odometer; ops carry app-shaped
    // (camelCase) patches because they are replayed onto app state.
    const bumped = batch.optimistic?.find(
      (op) => op.collection === 'vehicle' && op.kind === 'update' && op.patch?.currentMileage,
    )
    if (bumped?.patch?.currentMileage) {
      const mileage = Number(bumped.patch.currentMileage)
      next = {
        ...next,
        vehicle: { ...next.vehicle, currentMileage: Math.max(next.vehicle.currentMileage, mileage) },
      }
    }
  }
  return withDerivedSeries(next)
}

/** Read the queue and lay it over fetched state. */
export async function applyQueuedOptimism(data: CarData): Promise<CarData> {
  return applyBatchOptimism(data, await peekAll())
}
