import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import type {
  CarData,
  FuelEntry,
  MaintenanceEntry,
  Modification,
  Trip,
  DocumentItem,
  Photo,
  TimelineEvent,
  AppSettings,
  Vehicle,
  Expense,
} from '@/types'
import { demoData } from '@/data/demoData'
import { uid } from '@/lib/format'
import { withRecomputedConsumption, deriveOdometer } from '@/lib/analytics'
import {
  COLLECTION_BY_TABLE,
  describeDbError,
  DbError,
  isOffline,
  runStatements,
  type Collection,
  type MutationBatch,
  type OptimisticOp,
  type Row,
  type Statement,
  type Table,
} from '@/lib/db'
import {
  applyBatchOptimism,
  applyOptimisticOps,
  applyQueuedOptimism,
  enqueue,
  flushOutbox,
  onOutboxChange,
  peekAll,
  withDerivedSeries,
} from '@/lib/outbox'
import {
  ALL_COLLECTIONS,
  addVehicle as addVehicleRow,
  assembleCarData,
  fetchCollections,
  mergeCollections,
  seedIfEmpty,
  setActiveVehicle,
  settingsToRow,
  vehicleToRow,
} from '@/lib/supabaseData'
import { supabase } from '@/lib/supabaseClient'
import { deleteMedia, isStoragePath, signedUrl } from '@/lib/media'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface DataContextValue {
  data: CarData
  vehicles: Vehicle[]
  loading: boolean
  /** False when the browser reports no connection. */
  online: boolean
  /** Writes waiting in the offline queue. */
  pendingCount: number
  flushPending: () => Promise<void>
  updateVehicle: (v: Partial<Vehicle>) => Promise<void>
  addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>
  switchVehicle: (id: string) => Promise<void>
  addFuelEntry: (entry: Omit<FuelEntry, 'id'>) => Promise<void>
  updateFuelEntry: (id: string, patch: Partial<FuelEntry>) => Promise<void>
  deleteFuelEntry: (id: string) => Promise<void>
  addMaintenance: (entry: Omit<MaintenanceEntry, 'id'>) => Promise<void>
  updateMaintenance: (id: string, patch: Partial<MaintenanceEntry>) => Promise<void>
  deleteMaintenance: (id: string) => Promise<void>
  addModification: (mod: Omit<Modification, 'id'>) => Promise<void>
  updateModification: (id: string, mod: Partial<Modification>) => Promise<void>
  deleteModification: (id: string) => Promise<void>
  addTrip: (trip: Omit<Trip, 'id'>) => Promise<void>
  updateTrip: (id: string, patch: Partial<Trip>) => Promise<void>
  deleteTrip: (id: string) => Promise<void>
  addDocument: (doc: Omit<DocumentItem, 'id'>) => Promise<void>
  updateDocument: (id: string, patch: Partial<DocumentItem>) => Promise<void>
  deleteDocument: (id: string) => Promise<void>
  addPhoto: (photo: Omit<Photo, 'id'>) => Promise<void>
  deletePhoto: (id: string) => Promise<void>
  addTimelineEvent: (evt: Omit<TimelineEvent, 'id'>) => Promise<void>
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>
  updateExpense: (id: string, patch: Partial<Expense>) => Promise<void>
  deleteExpense: (id: string) => Promise<void>
  updateSettings: (s: Partial<AppSettings>) => Promise<void>
  resetAll: () => Promise<void>
  resetEmpty: () => Promise<void>
  reload: () => Promise<void>
}

const DataContext = createContext<DataContextValue | null>(null)

const asRow = (item: unknown): Row => item as unknown as Row

/**
 * The database keeps storage paths, but `<img>` needs a signed URL. Resolve the
 * path for the optimistic state so a freshly uploaded photo renders right away
 * instead of briefly breaking while the refetch catches up.
 */
async function resolveForDisplay(value?: string): Promise<string | undefined> {
  if (!value || !isStoragePath(value)) return value
  return (await signedUrl(value)) ?? value
}

/** Every table that holds user content, cleared by the two reset actions. */
const CONTENT_TABLES: Table[] = [
  'timeline_events',
  'fuel_entries',
  'maintenance_entries',
  'modifications',
  'trips',
  'documents',
  'photos',
  'expenses',
]

/** Strips user_id so updates can't trip the RLS `with check` clause. */
function withoutUserId(row: Row): Row {
  const { user_id: _ignored, ...rest } = row
  return rest
}

interface MutateOptions {
  label: string
  statements: Statement[]
  optimistic?: OptimisticOp[]
  success?: string
  /** Collections to refetch after the write lands. */
  refresh?: Collection[]
  /** Bypass the offline queue — used by destructive reset flows. */
  immediate?: boolean
}

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const { showToast } = useToast()
  const [data, setData] = useState<CarData | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [online, setOnline] = useState(() => !isOffline())
  const [pendingCount, setPendingCount] = useState(0)

  // -------------------------------------------------------------- refreshing

  /** Refetch only the named slices and merge them over current state. */
  const refresh = useCallback(
    async (collections: Collection[]) => {
      if (!userId || collections.length === 0 || isOffline()) return
      try {
        const [payload, queued] = await Promise.all([
          fetchCollections(userId, collections),
          // A realtime event from the other device would otherwise replace state
          // and make unsynced edits disappear from view.
          peekAll(),
        ])
        setData((current) => {
          const merged = current ? mergeCollections(current, payload) : assembleCarData(payload)
          return queued.length ? applyBatchOptimism(merged, queued) : merged
        })
        if (payload.vehicles) setVehicles(payload.vehicles)
      } catch (error) {
        showToast(describeDbError(error, 'Could not refresh'), 'error')
      }
    },
    [userId, showToast],
  )

  const reload = useCallback(async () => {
    if (!userId) return
    try {
      const payload = await fetchCollections(userId, ALL_COLLECTIONS)
      setVehicles(payload.vehicles ?? [])
      // Queued offline writes haven't reached the server yet, so lay them back
      // over the fetched state or they'd appear to vanish.
      setData(await applyQueuedOptimism(assembleCarData(payload)))
    } catch (error) {
      showToast(describeDbError(error, 'Could not load your data'), 'error')
    }
  }, [userId, showToast])

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    setLoading(true)
    setLoadError(null)
    ;(async () => {
      try {
        await seedIfEmpty(userId)
        await reload()
      } catch (error) {
        if (!cancelled) setLoadError(describeDbError(error, 'Could not load your data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [userId, reload])

  // ------------------------------------------------- realtime (coalesced)
  //
  // Rather than refetching all ten tables on every change, coalesce events for
  // half a second and refresh only the collections that actually changed.
  useEffect(() => {
    if (!userId) return
    const pending = new Set<Collection>()
    let timer: ReturnType<typeof setTimeout> | null = null

    const channel = supabase
      .channel(`drivn-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', filter: `user_id=eq.${userId}` },
        (payload) => {
          const collection = COLLECTION_BY_TABLE[payload.table as Table]
          if (!collection) return
          pending.add(collection)
          if (timer) clearTimeout(timer)
          timer = setTimeout(() => {
            const batch = [...pending]
            pending.clear()
            timer = null
            refresh(batch)
          }, 500)
        },
      )
      .subscribe()

    return () => {
      if (timer) clearTimeout(timer)
      supabase.removeChannel(channel)
    }
  }, [userId, refresh])

  // ------------------------------------------------------- connection state

  useEffect(() => {
    const update = () => setOnline(!isOffline())
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  useEffect(() => onOutboxChange(setPendingCount), [])

  const flushPending = useCallback(async () => {
    if (isOffline()) return
    const { flushed, remaining } = await flushOutbox((batch, message) => {
      showToast(`${batch.label} couldn't sync — ${message}`, 'error')
    })
    setPendingCount(remaining)
    if (flushed > 0) {
      showToast(flushed === 1 ? 'Queued change synced' : `${flushed} queued changes synced`)
      await reload()
    }
  }, [reload, showToast])

  // Drain the queue as soon as the connection returns.
  useEffect(() => {
    if (online && pendingCount > 0) void flushPending()
  }, [online, pendingCount, flushPending])

  // ------------------------------------------------------------- the writer

  /**
   * The one path every change takes.
   *
   * 1. apply the change locally so the UI responds immediately;
   * 2. if offline, persist the batch and stop — it replays on reconnect;
   * 3. otherwise write to Supabase, and on failure either queue it (transient /
   *    network) or report it and restore server truth (rejected on its merits).
   */
  const mutate = useCallback(
    async (options: MutateOptions): Promise<boolean> => {
      if (!userId) return false

      if (options.optimistic?.length) {
        setData((current) =>
          current ? withDerivedSeries(applyOptimisticOps(current, options.optimistic)) : current,
        )
      }

      const batch: MutationBatch = {
        id: uid('batch'),
        createdAt: Date.now(),
        label: options.label,
        statements: options.statements,
        optimistic: options.optimistic,
      }

      if (!options.immediate && isOffline()) {
        await enqueue(batch)
        showToast(`${options.label} saved offline — syncs when you're back`, 'info')
        return true
      }

      try {
        await runStatements(options.statements)
        if (options.success) showToast(options.success)
        if (options.refresh?.length) await refresh(options.refresh)
        return true
      } catch (error) {
        const message = describeDbError(error, `${options.label} failed`)
        // A missing Postgres error code means the request never reached the
        // server (network drop, tab suspended) — safe to retry later. A coded
        // error was rejected on its merits, so retrying can't help.
        const transient = !(error instanceof DbError) || !error.code
        if (!options.immediate && transient) {
          await enqueue(batch)
          showToast(`${options.label} saved offline — syncs when you're back`, 'info')
          return true
        }
        showToast(message, 'error')
        // Restore server truth rather than leaving a change the user believes in.
        await reload()
        return false
      }
    },
    [userId, showToast, refresh, reload],
  )

  // ------------------------------------------------------------- fuel entry

  async function addFuelEntry(entry: Omit<FuelEntry, 'id'>) {
    if (!userId || !data) return
    const tempId = uid('fuel')
    const previous = data.fuelEntries[0]
    const consumption =
      entry.consumption ??
      (previous && entry.mileage > previous.mileage
        ? (entry.liters / (entry.mileage - previous.mileage)) * 100
        : undefined)
    const item: FuelEntry = { ...entry, consumption, id: tempId }
    const timelineId = uid('tle')
    const timelineItem: TimelineEvent = {
      id: timelineId,
      date: entry.date,
      type: 'fuel',
      title: 'Fill-up',
      description: entry.station ? `Refueled at ${entry.station}.` : 'Refueled.',
      mileage: entry.mileage,
      cost: entry.totalCost,
      sourceTable: 'fuel_entries',
      sourceId: tempId,
    }

    const statements: Statement[] = [
      {
        table: 'fuel_entries',
        op: 'insert',
        returning: true,
        payload: {
          user_id: userId,
          date: entry.date,
          liters: entry.liters,
          price_per_liter: entry.pricePerLiter,
          total_cost: entry.totalCost,
          mileage: entry.mileage,
          consumption: consumption ?? null,
          station: entry.station ?? null,
          full_tank: entry.fullTank,
        },
      },
      {
        table: 'timeline_events',
        op: 'insert',
        payload: {
          user_id: userId,
          date: entry.date,
          type: 'fuel',
          title: 'Fill-up',
          description: timelineItem.description,
          mileage: entry.mileage,
          cost: entry.totalCost,
          source_table: 'fuel_entries',
          source_id: { $ref: [0, 'id'] },
        },
      },
    ]
    const optimistic: OptimisticOp[] = [
      { collection: 'fuelEntries', kind: 'insert', id: tempId, item: asRow(item) },
      { collection: 'timeline', kind: 'insert', id: timelineId, item: asRow(timelineItem) },
    ]

    const nextMileage = deriveOdometer(
      [item, ...data.fuelEntries],
      data.maintenance,
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        // App state is camelCase — only the statement payload is snake_case.
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Fuel entry',
      statements,
      optimistic,
      success: 'Fuel entry added',
      refresh: ['fuelEntries', 'timeline', 'vehicle'],
    })
  }

  async function updateFuelEntry(id: string, patch: Partial<FuelEntry>) {
    if (!data) return
    const existing = data.fuelEntries.find((f) => f.id === id)
    if (!existing) return
    const merged: FuelEntry = { ...existing, ...patch }
    const nextEntries = withRecomputedConsumption(
      data.fuelEntries.map((f) => (f.id === id ? merged : f)),
    )

    // Write the *recomputed* figure, not the one the row already had.
    const edited = nextEntries.find((entry) => entry.id === id)
    const statements: Statement[] = [
      {
        table: 'fuel_entries',
        op: 'update',
        patch: {
          date: merged.date,
          liters: merged.liters,
          price_per_liter: merged.pricePerLiter,
          total_cost: merged.totalCost,
          mileage: merged.mileage,
          consumption: edited?.consumption ?? null,
          station: merged.station ?? null,
          full_tank: merged.fullTank,
        },
        match: { id },
      },
    ]

    // Editing one fill-up changes the gap to the *next* one, so its figure moves
    // too. The edited row is already handled above.
    for (const entry of nextEntries) {
      if (entry.id === id) continue
      const before = data.fuelEntries.find((f) => f.id === entry.id)
      if (before && before.consumption !== entry.consumption) {
        statements.push({
          table: 'fuel_entries',
          op: 'update',
          patch: { consumption: entry.consumption ?? null },
          match: { id: entry.id },
        })
      }
    }

    statements.push({
      table: 'timeline_events',
      op: 'update',
      patch: {
        date: merged.date,
        title: merged.station ? `Fill-up at ${merged.station}` : 'Fill-up',
        description: merged.station ? `Refueled at ${merged.station}.` : 'Refueled.',
        mileage: merged.mileage,
        cost: merged.totalCost,
      },
      match: { source_table: 'fuel_entries', source_id: id },
    })

    const optimistic: OptimisticOp[] = nextEntries
      .filter((entry) => entry.consumption !== data.fuelEntries.find((f) => f.id === entry.id)?.consumption)
      .map((entry) => ({
        collection: 'fuelEntries' as const,
        kind: 'update' as const,
        id: entry.id,
        patch: { consumption: entry.consumption },
      }))

    const nextMileage = deriveOdometer(
      nextEntries,
      data.maintenance,
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Fuel edit',
      statements,
      optimistic,
      success: 'Fuel entry updated',
      refresh: ['fuelEntries', 'timeline', 'vehicle'],
    })
  }

  async function deleteFuelEntry(id: string) {
    if (!data) return
    const remaining = data.fuelEntries.filter((f) => f.id !== id)
    const nextEntries = withRecomputedConsumption(remaining)

    const statements: Statement[] = [
      { table: 'fuel_entries', op: 'delete', match: { id } },
      {
        table: 'timeline_events',
        op: 'delete',
        match: { source_table: 'fuel_entries', source_id: id },
      },
    ]
    for (const entry of nextEntries) {
      const before = data.fuelEntries.find((f) => f.id === entry.id)
      if (before && before.consumption !== entry.consumption) {
        statements.push({
          table: 'fuel_entries',
          op: 'update',
          patch: { consumption: entry.consumption ?? null },
          match: { id: entry.id },
        })
      }
    }

    const optimistic: OptimisticOp[] = [
      { collection: 'fuelEntries', kind: 'delete', id },
      { collection: 'timeline', kind: 'delete', id, sourceId: id },
      ...nextEntries
        .filter((entry) => entry.consumption !== data.fuelEntries.find((f) => f.id === entry.id)?.consumption)
        .map((entry) => ({
          collection: 'fuelEntries' as const,
          kind: 'update' as const,
          id: entry.id,
          patch: { consumption: entry.consumption },
        })),
    ]

    const nextMileage = deriveOdometer(
      nextEntries,
      data.maintenance,
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Fuel entry removed',
      statements,
      optimistic,
      success: 'Fuel entry deleted',
      refresh: ['fuelEntries', 'timeline', 'vehicle'],
    })
  }

  // ------------------------------------------------------------- maintenance

  async function addMaintenance(entry: Omit<MaintenanceEntry, 'id'>) {
    if (!userId || !data) return
    const tempId = uid('mnt')
    const timelineId = uid('tle')
    const statements: Statement[] = [
      {
        table: 'maintenance_entries',
        op: 'insert',
        returning: true,
        payload: {
          user_id: userId,
          date: entry.date,
          type: entry.type,
          mileage: entry.mileage,
          cost: entry.cost,
          garage: entry.garage,
          notes: entry.notes ?? null,
          next_interval_km: entry.nextIntervalKm ?? null,
          next_interval_date: entry.nextIntervalDate ?? null,
        },
      },
      {
        table: 'timeline_events',
        op: 'insert',
        payload: {
          user_id: userId,
          date: entry.date,
          type: 'maintenance',
          title: entry.type,
          description: `Serviced at ${entry.garage}.`,
          mileage: entry.mileage,
          cost: entry.cost,
          source_table: 'maintenance_entries',
          source_id: { $ref: [0, 'id'] },
        },
      },
    ]
    const optimistic: OptimisticOp[] = [
      {
        collection: 'maintenance',
        kind: 'insert',
        id: tempId,
        item: asRow({ ...entry, id: tempId }),
      },
      {
        collection: 'timeline',
        kind: 'insert',
        id: timelineId,
        item: asRow({
          id: timelineId,
          date: entry.date,
          type: 'maintenance',
          title: entry.type,
          description: `Serviced at ${entry.garage}.`,
          mileage: entry.mileage,
          cost: entry.cost,
          sourceTable: 'maintenance_entries',
          sourceId: tempId,
        }),
      },
    ]
    const nextMileage = deriveOdometer(
      data.fuelEntries,
      [{ ...(entry as MaintenanceEntry), id: tempId }, ...data.maintenance],
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Maintenance entry',
      statements,
      optimistic,
      success: 'Maintenance entry added',
      refresh: ['maintenance', 'timeline', 'vehicle'],
    })
  }

  async function updateMaintenance(id: string, patch: Partial<MaintenanceEntry>) {
    if (!data) return
    const existing = data.maintenance.find((m) => m.id === id)
    if (!existing) return
    const merged = { ...existing, ...patch }

    const statements: Statement[] = [
      {
        table: 'maintenance_entries',
        op: 'update',
        patch: {
          date: merged.date,
          type: merged.type,
          mileage: merged.mileage,
          cost: merged.cost,
          garage: merged.garage,
          notes: merged.notes ?? null,
          next_interval_km: merged.nextIntervalKm ?? null,
          next_interval_date: merged.nextIntervalDate ?? null,
        },
        match: { id },
      },
      {
        table: 'timeline_events',
        op: 'update',
        patch: {
          date: merged.date,
          title: merged.type,
          description: `Serviced at ${merged.garage}.`,
          mileage: merged.mileage,
          cost: merged.cost,
        },
        match: { source_table: 'maintenance_entries', source_id: id },
      },
    ]

    const optimistic: OptimisticOp[] = [
      { collection: 'maintenance', kind: 'update', id, patch: asRow(patch) },
    ]
    const nextMileage = deriveOdometer(
      data.fuelEntries,
      data.maintenance.map((m) => (m.id === id ? merged : m)),
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Maintenance edit',
      statements,
      optimistic,
      success: 'Maintenance entry updated',
      refresh: ['maintenance', 'timeline', 'vehicle'],
    })
  }

  async function deleteMaintenance(id: string) {
    if (!data) return
    const statements: Statement[] = [
      { table: 'maintenance_entries', op: 'delete', match: { id } },
      {
        table: 'timeline_events',
        op: 'delete',
        match: { source_table: 'maintenance_entries', source_id: id },
      },
    ]
    const optimistic: OptimisticOp[] = [
      { collection: 'maintenance', kind: 'delete', id },
      { collection: 'timeline', kind: 'delete', id, sourceId: id },
    ]

    // Deleting a record can lower the odometer, e.g. when removing a typo.
    const nextMileage = deriveOdometer(
      data.fuelEntries,
      data.maintenance.filter((m) => m.id !== id),
      data.vehicle.startingMileage,
    )
    if (nextMileage !== data.vehicle.currentMileage) {
      statements.push({
        table: 'vehicle',
        op: 'update',
        patch: { current_mileage: nextMileage },
        match: { id: data.vehicle.id },
      })
      optimistic.push({
        collection: 'vehicle',
        kind: 'update',
        id: data.vehicle.id,
        patch: { currentMileage: nextMileage },
      })
    }

    await mutate({
      label: 'Maintenance entry removed',
      statements,
      optimistic,
      success: 'Maintenance entry deleted',
      refresh: ['maintenance', 'timeline', 'vehicle'],
    })
  }

  // ----------------------------------------------------------- modifications

  async function addModification(mod: Omit<Modification, 'id'>) {
    if (!userId) return
    const tempId = uid('mod')
    await mutate({
      label: 'Modification',
      statements: [
        {
          table: 'modifications',
          op: 'insert',
          returning: true,
          payload: {
            user_id: userId,
            name: mod.name,
            category: mod.category,
            date_installed: mod.dateInstalled,
            price: mod.price,
            brand: mod.brand,
            notes: mod.notes ?? null,
            image_url: mod.imageUrl,
          },
        },
        {
          table: 'timeline_events',
          op: 'insert',
          payload: {
            user_id: userId,
            date: mod.dateInstalled,
            type: 'modification',
            title: mod.name,
            description: `Installed by ${mod.brand}.`,
            cost: mod.price,
            image_url: mod.imageUrl,
            source_table: 'modifications',
            source_id: { $ref: [0, 'id'] },
          },
        },
      ],
      optimistic: [
        {
          collection: 'modifications',
          kind: 'insert',
          id: tempId,
          item: asRow({ ...mod, id: tempId }),
        },
      ],
      success: 'Modification added',
      refresh: ['modifications', 'timeline'],
    })
  }

  async function updateModification(id: string, mod: Partial<Modification>) {
    const statements: Statement[] = [
      {
        table: 'modifications',
        op: 'update',
        patch: withoutUserId({
          name: mod.name,
          category: mod.category,
          date_installed: mod.dateInstalled,
          price: mod.price,
          brand: mod.brand,
          notes: mod.notes,
          image_url: mod.imageUrl,
        }),
        match: { id },
      },
      {
        table: 'timeline_events',
        op: 'update',
        patch: withoutUserId({
          date: mod.dateInstalled,
          title: mod.name,
          description: mod.brand ? `Installed by ${mod.brand}.` : undefined,
          cost: mod.price,
        }),
        match: { source_table: 'modifications', source_id: id },
      },
    ]
    await mutate({
      label: 'Modification edit',
      statements,
      optimistic: [{ collection: 'modifications', kind: 'update', id, patch: asRow(mod) }],
      success: 'Modification updated',
      refresh: ['modifications', 'timeline'],
    })
  }

  async function deleteModification(id: string) {
    await mutate({
      label: 'Modification removed',
      statements: [
        { table: 'modifications', op: 'delete', match: { id } },
        {
          table: 'timeline_events',
          op: 'delete',
          match: { source_table: 'modifications', source_id: id },
        },
      ],
      optimistic: [
        { collection: 'modifications', kind: 'delete', id },
        { collection: 'timeline', kind: 'delete', id, sourceId: id },
      ],
      success: 'Modification deleted',
      refresh: ['modifications', 'timeline'],
    })
  }

  // -------------------------------------------------------------------- trips

  async function addTrip(trip: Omit<Trip, 'id'>) {
    if (!userId) return
    const tempId = uid('trip')
    await mutate({
      label: 'Trip',
      statements: [
        {
          table: 'trips',
          op: 'insert',
          returning: true,
          payload: {
            user_id: userId,
            name: trip.name,
            start_location: trip.start,
            destination: trip.destination,
            date: trip.date,
            distance_km: trip.distanceKm,
            duration_minutes: trip.durationMinutes,
            consumption: trip.consumption,
            fuel_cost: trip.fuelCost,
            notes: trip.notes ?? null,
            route: trip.route,
          },
        },
        {
          table: 'timeline_events',
          op: 'insert',
          payload: {
            user_id: userId,
            date: trip.date,
            type: 'trip',
            title: trip.name,
            description: `${trip.start} \u2192 ${trip.destination}`,
            cost: trip.fuelCost,
            source_table: 'trips',
            source_id: { $ref: [0, 'id'] },
          },
        },
      ],
      optimistic: [
        { collection: 'trips', kind: 'insert', id: tempId, item: asRow({ ...trip, id: tempId }) },
      ],
      success: 'Trip added',
      refresh: ['trips', 'timeline'],
    })
  }

  async function updateTrip(id: string, patch: Partial<Trip>) {
    const statements: Statement[] = [
      {
        table: 'trips',
        op: 'update',
        patch: withoutUserId({
          name: patch.name,
          start_location: patch.start,
          destination: patch.destination,
          date: patch.date,
          distance_km: patch.distanceKm,
          duration_minutes: patch.durationMinutes,
          consumption: patch.consumption,
          fuel_cost: patch.fuelCost,
          notes: patch.notes,
          route: patch.route,
        }),
        match: { id },
      },
      {
        table: 'timeline_events',
        op: 'update',
        patch: withoutUserId({
          date: patch.date,
          title: patch.name,
          description: patch.start && patch.destination ? `${patch.start} \u2192 ${patch.destination}` : undefined,
          cost: patch.fuelCost,
        }),
        match: { source_table: 'trips', source_id: id },
      },
    ]
    await mutate({
      label: 'Trip edit',
      statements,
      optimistic: [{ collection: 'trips', kind: 'update', id, patch: asRow(patch) }],
      success: 'Trip updated',
      refresh: ['trips', 'timeline'],
    })
  }

  async function deleteTrip(id: string) {
    await mutate({
      label: 'Trip removed',
      statements: [
        { table: 'trips', op: 'delete', match: { id } },
        { table: 'timeline_events', op: 'delete', match: { source_table: 'trips', source_id: id } },
      ],
      optimistic: [
        { collection: 'trips', kind: 'delete', id },
        { collection: 'timeline', kind: 'delete', id, sourceId: id },
      ],
      success: 'Trip deleted',
      refresh: ['trips', 'timeline'],
    })
  }

  // ---------------------------------------------------------------- documents

  async function addDocument(doc: Omit<DocumentItem, 'id'>) {
    if (!userId) return
    const tempId = uid('doc')
    await mutate({
      label: 'Document',
      statements: [
        {
          table: 'documents',
          op: 'insert',
          returning: true,
          payload: {
            user_id: userId,
            name: doc.name,
            category: doc.category,
            date: doc.date,
            expiration_date: doc.expirationDate ?? null,
            status: doc.status,
            storage_path: doc.storagePath ?? null,
          },
        },
        {
          table: 'timeline_events',
          op: 'insert',
          payload: {
            user_id: userId,
            date: doc.date,
            type: 'document',
            title: doc.name,
            description: `${doc.category} document added.`,
            source_table: 'documents',
            source_id: { $ref: [0, 'id'] },
          },
        },
      ],
      optimistic: [
        { collection: 'documents', kind: 'insert', id: tempId, item: asRow({ ...doc, id: tempId }) },
      ],
      success: 'Document added',
      refresh: ['documents', 'timeline'],
    })
  }

  async function updateDocument(id: string, patch: Partial<DocumentItem>) {
    const previousPath = data?.documents.find((d) => d.id === id)?.storagePath
    const statements: Statement[] = [
      {
        table: 'documents',
        op: 'update',
        patch: withoutUserId({
          name: patch.name,
          category: patch.category,
          date: patch.date,
          expiration_date: patch.expirationDate,
          status: patch.status,
          storage_path: patch.storagePath,
        }),
        match: { id },
      },
      {
        table: 'timeline_events',
        op: 'update',
        patch: withoutUserId({ date: patch.date, title: patch.name }),
        match: { source_table: 'documents', source_id: id },
      },
    ]
    await mutate({
      label: 'Document edit',
      statements,
      optimistic: [{ collection: 'documents', kind: 'update', id, patch: asRow(patch) }],
      success: 'Document updated',
      refresh: ['documents', 'timeline'],
    })
    // Sweep up the object that a replaced file left behind.
    if (patch.storagePath && previousPath && previousPath !== patch.storagePath) {
      void deleteMedia(previousPath)
    }
  }

  async function deleteDocument(id: string) {
    const storagePath = data?.documents.find((d) => d.id === id)?.storagePath
    const ok = await mutate({
      label: 'Document removed',
      statements: [
        { table: 'documents', op: 'delete', match: { id } },
        {
          table: 'timeline_events',
          op: 'delete',
          match: { source_table: 'documents', source_id: id },
        },
      ],
      optimistic: [
        { collection: 'documents', kind: 'delete', id },
        { collection: 'timeline', kind: 'delete', id, sourceId: id },
      ],
      success: 'Document deleted',
      refresh: ['documents', 'timeline'],
    })
    if (ok) void deleteMedia(storagePath)
  }

  // ------------------------------------------------------------------- photos

  async function addPhoto(photo: Omit<Photo, 'id'>) {
    if (!userId) return
    const tempId = uid('photo')
    await mutate({
      label: 'Photo',
      statements: [
        {
          table: 'photos',
          op: 'insert',
          payload: {
            user_id: userId,
            // A stored path replaces the URL column; the signed URL is rebuilt
            // on every fetch rather than persisted (it would expire).
            url: photo.storagePath ? '' : photo.url,
            date: photo.date,
            location: photo.location,
            description: photo.description ?? null,
            storage_path: photo.storagePath ?? null,
          },
        },
      ],
      optimistic: [
        { collection: 'photos', kind: 'insert', id: tempId, item: asRow({ ...photo, id: tempId }) },
      ],
      success: 'Photo added',
      refresh: ['photos'],
    })
  }

  async function deletePhoto(id: string) {
    const storagePath = data?.photos.find((p) => p.id === id)?.storagePath
    const ok = await mutate({
      label: 'Photo removed',
      statements: [{ table: 'photos', op: 'delete', match: { id } }],
      optimistic: [{ collection: 'photos', kind: 'delete', id }],
      success: 'Photo deleted',
      refresh: ['photos'],
    })
    if (ok) void deleteMedia(storagePath)
  }

  // -------------------------------------------------------- timeline & expenses

  async function addTimelineEvent(evt: Omit<TimelineEvent, 'id'>) {
    if (!userId) return
    const tempId = uid('tle')
    await mutate({
      label: 'Timeline event',
      statements: [
        {
          table: 'timeline_events',
          op: 'insert',
          payload: {
            user_id: userId,
            date: evt.date,
            type: evt.type,
            title: evt.title,
            description: evt.description,
            mileage: evt.mileage ?? null,
            cost: evt.cost ?? null,
            image_url: evt.imageUrl ?? null,
          },
        },
      ],
      optimistic: [
        { collection: 'timeline', kind: 'insert', id: tempId, item: asRow({ ...evt, id: tempId }) },
      ],
      success: 'Event added',
      refresh: ['timeline'],
    })
  }

  async function addExpense(expense: Omit<Expense, 'id'>) {
    if (!userId) return
    const tempId = uid('exp')
    await mutate({
      label: 'Expense',
      statements: [
        {
          table: 'expenses',
          op: 'insert',
          returning: true,
          payload: {
            user_id: userId,
            date: expense.date,
            category: expense.category,
            description: expense.description,
            cost: expense.cost,
          },
        },
        {
          table: 'timeline_events',
          op: 'insert',
          payload: {
            user_id: userId,
            date: expense.date,
            type: 'expense',
            title: expense.description,
            description: expense.category,
            cost: expense.cost,
            source_table: 'expenses',
            source_id: { $ref: [0, 'id'] },
          },
        },
      ],
      optimistic: [
        {
          collection: 'expenses',
          kind: 'insert',
          id: tempId,
          item: asRow({ ...expense, id: tempId }),
        },
      ],
      success: 'Expense added',
      refresh: ['expenses', 'timeline'],
    })
  }

  async function updateExpense(id: string, patch: Partial<Expense>) {
    const statements: Statement[] = [
      {
        table: 'expenses',
        op: 'update',
        patch: withoutUserId({
          date: patch.date,
          category: patch.category,
          description: patch.description,
          cost: patch.cost,
        }),
        match: { id },
      },
      {
        table: 'timeline_events',
        op: 'update',
        patch: withoutUserId({
          date: patch.date,
          title: patch.description,
          description: patch.category,
          cost: patch.cost,
        }),
        match: { source_table: 'expenses', source_id: id },
      },
    ]
    await mutate({
      label: 'Expense edit',
      statements,
      optimistic: [{ collection: 'expenses', kind: 'update', id, patch: asRow(patch) }],
      success: 'Expense updated',
      refresh: ['expenses', 'timeline'],
    })
  }

  async function deleteExpense(id: string) {
    await mutate({
      label: 'Expense removed',
      statements: [
        { table: 'expenses', op: 'delete', match: { id } },
        {
          table: 'timeline_events',
          op: 'delete',
          match: { source_table: 'expenses', source_id: id },
        },
      ],
      optimistic: [
        { collection: 'expenses', kind: 'delete', id },
        { collection: 'timeline', kind: 'delete', id, sourceId: id },
      ],
      success: 'Expense deleted',
      refresh: ['expenses', 'timeline'],
    })
  }

  // ------------------------------------------------------- vehicle & settings

  async function updateVehicle(v: Partial<Vehicle>) {
    if (!userId || !data) return
    const merged = { ...data.vehicle, ...v }
    const optimisticPatch = { ...v }
    if (v.imageUrl !== undefined) {
      optimisticPatch.imageUrl = await resolveForDisplay(v.imageUrl)
    }
    await mutate({
      label: 'Vehicle details',
      statements: [
        {
          table: 'vehicle',
          op: 'update',
          patch: withoutUserId(vehicleToRow(userId, merged)),
          match: { id: data.vehicle.id },
        },
      ],
      optimistic: [
        { collection: 'vehicle', kind: 'update', id: data.vehicle.id, patch: asRow(optimisticPatch) },
      ],
      refresh: ['vehicle'],
    })
  }

  async function updateSettings(s: Partial<AppSettings>) {
    if (!userId || !data) return
    const merged = { ...data.settings, ...s }
    const optimisticPatch = { ...s }
    if (s.avatarUrl !== undefined) {
      optimisticPatch.avatarUrl = await resolveForDisplay(s.avatarUrl)
    }
    await mutate({
      label: 'Settings',
      statements: [
        { table: 'app_settings', op: 'upsert', payload: settingsToRow(userId, merged) },
      ],
      optimistic: [{ collection: 'settings', kind: 'update', id: userId, patch: asRow(optimisticPatch) }],
      refresh: ['settings'],
    })
  }

  async function addVehicle(v: Omit<Vehicle, 'id'>) {
    if (!userId) return
    try {
      await addVehicleRow(userId, v)
      showToast('Car added')
      await reload()
    } catch (error) {
      showToast(describeDbError(error, 'Could not add car'), 'error')
    }
  }

  async function switchVehicle(id: string) {
    if (!userId) return
    try {
      await setActiveVehicle(userId, id)
      await reload()
    } catch (error) {
      showToast(describeDbError(error, 'Could not switch car'), 'error')
    }
  }

  // ------------------------------------------------------------------- resets

  async function resetEmpty() {
    if (!userId) return
    const affected: Collection[] = [
      'timeline',
      'fuelEntries',
      'maintenance',
      'modifications',
      'trips',
      'documents',
      'photos',
      'expenses',
      'settings',
    ]
    await mutate({
      label: 'Clear data',
      immediate: true,
      statements: [
        ...CONTENT_TABLES.map(
          (table): Statement => ({ table, op: 'delete', match: { user_id: userId } }),
        ),
        {
          table: 'app_settings',
          op: 'update',
          patch: withoutUserId(settingsToRow(userId, demoData.settings)),
          match: { user_id: userId },
        },
      ],
      success: 'Everything cleared — vehicle profile kept',
      refresh: affected,
    })
  }

  async function resetAll() {
    if (!userId) return
    const ok = await mutate({
      label: 'Reset data',
      immediate: true,
      statements: [
        ...CONTENT_TABLES.map(
          (table): Statement => ({ table, op: 'delete', match: { user_id: userId } }),
        ),
        { table: 'vehicle', op: 'delete', match: { user_id: userId } },
        { table: 'app_settings', op: 'delete', match: { user_id: userId } },
      ],
      success: 'Data reset to demo state',
    })
    if (!ok) return
    try {
      await seedIfEmpty(userId)
      await reload()
    } catch (error) {
      showToast(describeDbError(error, 'Could not restore demo data'), 'error')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <div className="flex items-center gap-2.5 text-gray-400 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading your car…
        </div>
      </div>
    )
  }

  // A failed first load used to hang on the spinner forever.
  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950 px-6">
        <div className="max-w-md w-full card-surface rounded-2xl shadow-card p-6 text-center">
          <h1 className="text-sm font-semibold text-gray-100 mb-1">Couldn't load your car</h1>
          <p className="text-xs text-gray-500 mb-4 break-words">
            {loadError ?? 'Something went wrong.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="text-sm font-medium bg-accent hover:bg-accent-light text-white rounded-xl px-4 py-2.5 shadow-glow transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <DataContext.Provider
      value={{
        data,
        vehicles,
        loading,
        online,
        pendingCount,
        flushPending,
        updateVehicle,
        addVehicle,
        switchVehicle,
        addFuelEntry,
        updateFuelEntry,
        deleteFuelEntry,
        addMaintenance,
        updateMaintenance,
        deleteMaintenance,
        addModification,
        updateModification,
        deleteModification,
        addTrip,
        updateTrip,
        deleteTrip,
        addDocument,
        updateDocument,
        deleteDocument,
        addPhoto,
        deletePhoto,
        addTimelineEvent,
        addExpense,
        updateExpense,
        deleteExpense,
        updateSettings,
        resetAll,
        resetEmpty,
        reload,
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useCarData() {
  const ctx = useContext(DataContext)
  if (!ctx) throw new Error('useCarData must be used within DataProvider')
  return ctx
}
