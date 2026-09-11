import { supabase } from './supabaseClient'
import { demoData } from '@/data/demoData'
import { deriveMonthlySeries } from './analytics'
import { isDataUrl, isStoragePath, resolveMedia, signedUrls } from './media'
import { deriveDocStatus } from './reminders'
import type { Collection } from './db'
import type {
  CarData,
  Vehicle,
  TimelineEvent,
  FuelEntry,
  MaintenanceEntry,
  Modification,
  Trip,
  DocumentItem,
  Photo,
  Expense,
  AppSettings,
} from '@/types'

// --- row <-> type mappers (DB is snake_case, app is camelCase) ---

export function vehicleFromRow(r: Row): Vehicle {
  return {
    id: r.id,
    make: r.make,
    model: r.model,
    trim: r.trim,
    engine: r.engine,
    power: r.power,
    transmission: r.transmission,
    drive: r.drive,
    year: r.year,
    fuelType: r.fuel_type,
    owner: r.owner,
    purchaseDate: r.purchase_date,
    deliveryDate: r.delivery_date ?? undefined,
    currentMileage: r.current_mileage,
    startingMileage: r.starting_mileage,
    imageUrl: r.image_url,
  }
}

export function vehicleToRow(userId: string, v: Vehicle) {
  return {
    user_id: userId,
    make: v.make,
    model: v.model,
    trim: v.trim,
    engine: v.engine,
    power: v.power,
    transmission: v.transmission,
    drive: v.drive,
    year: v.year,
    fuel_type: v.fuelType,
    owner: v.owner,
    purchase_date: v.purchaseDate,
    delivery_date: v.deliveryDate ?? null,
    current_mileage: v.currentMileage,
    starting_mileage: v.startingMileage,
    image_url: v.imageUrl,
  }
}

export type Row = Record<string, any>

function timelineFromRow(r: Row): TimelineEvent {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    title: r.title,
    description: r.description,
    mileage: r.mileage ?? undefined,
    cost: r.cost ?? undefined,
    imageUrl: r.image_url ?? undefined,
    sourceTable: r.source_table ?? undefined,
    sourceId: r.source_id ?? undefined,
  }
}

function fuelFromRow(r: Row): FuelEntry {
  return {
    id: r.id,
    date: r.date,
    liters: r.liters,
    pricePerLiter: r.price_per_liter,
    totalCost: r.total_cost,
    mileage: r.mileage,
    consumption: r.consumption ?? undefined,
    station: r.station ?? undefined,
    fullTank: r.full_tank,
  }
}

function maintenanceFromRow(r: Row): MaintenanceEntry {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    mileage: r.mileage,
    cost: r.cost,
    garage: r.garage,
    notes: r.notes ?? undefined,
    nextIntervalKm: r.next_interval_km ?? undefined,
    nextIntervalDate: r.next_interval_date ?? undefined,
  }
}

function modFromRow(r: Row): Modification {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    dateInstalled: r.date_installed,
    price: r.price,
    brand: r.brand,
    notes: r.notes ?? undefined,
    imageUrl: r.image_url,
  }
}

function tripFromRow(r: Row): Trip {
  return {
    id: r.id,
    name: r.name,
    start: r.start_location,
    destination: r.destination,
    date: r.date,
    distanceKm: r.distance_km,
    durationMinutes: r.duration_minutes,
    consumption: r.consumption,
    fuelCost: r.fuel_cost,
    notes: r.notes ?? undefined,
    route: r.route,
  }
}

function docFromRow(r: Row): DocumentItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    date: r.date,
    expirationDate: r.expiration_date ?? undefined,
    // Recomputed rather than read: the stored column is written once as 'valid'
    // and never revisited, so trusting it lets an expired policy look fine.
    status: deriveDocStatus(r.expiration_date ?? undefined),
    storagePath: r.storage_path ?? undefined,
    fileData: r.file_data ?? undefined,
    // Replaced with a signed URL when the row holds a storage path.
    fileUrl: r.file_url ?? undefined,
  }
}

function photoFromRow(r: Row): Photo {
  return {
    id: r.id,
    url: r.url ?? '',
    date: r.date,
    location: r.location,
    description: r.description ?? undefined,
    storagePath: r.storage_path ?? undefined,
    fileData: r.file_data ?? undefined,
  }
}

function expenseFromRow(r: Row): Expense {
  return { id: r.id, date: r.date, category: r.category, description: r.description, cost: r.cost }
}

export function settingsFromRow(r: Row | null): AppSettings {
  if (!r) return { ...demoData.settings }
  return {
    darkMode: r.dark_mode ?? true,
    accentColor: r.accent_color ?? '#5b6cff',
    maintenanceReminders: r.maintenance_reminders ?? true,
    insuranceReminders: r.insurance_reminders ?? true,
    inspectionReminders: r.inspection_reminders ?? true,
    avatarUrl: r.avatar_url ?? undefined,
    mobileNavItems: r.mobile_nav_items ? JSON.parse(r.mobile_nav_items) : undefined,
    vehiclePickerOnLaunch: r.vehicle_picker_on_launch ?? true,
    fabStyle: r.fab_style === 'sheet' ? 'sheet' : 'radial',
    uiTheme: r.ui_theme === 'cockpit' ? 'cockpit' : 'classic',
  }
}

export function settingsToRow(userId: string, s: AppSettings) {
  return {
    user_id: userId,
    dark_mode: s.darkMode,
    accent_color: s.accentColor,
    maintenance_reminders: s.maintenanceReminders,
    insurance_reminders: s.insuranceReminders,
    inspection_reminders: s.inspectionReminders,
    avatar_url: s.avatarUrl ?? null,
    mobile_nav_items: s.mobileNavItems ? JSON.stringify(s.mobileNavItems) : null,
    vehicle_picker_on_launch: s.vehiclePickerOnLaunch,
    fab_style: s.fabStyle,
    ui_theme: s.uiTheme,
  }
}

// --- seeding ---

export async function seedIfEmpty(userId: string) {
  const { data: existing, error } = await supabase
    .from('vehicle')
    .select('id')
    .eq('user_id', userId)
    .limit(1)
  if (error) throw error
  if (existing && existing.length > 0) return

  const { error: vehicleError } = await supabase
    .from('vehicle')
    .insert({ ...vehicleToRow(userId, demoData.vehicle as Vehicle), is_active: true })
  if (vehicleError) throw vehicleError

  const { error: settingsError } = await supabase
    .from('app_settings')
    .insert(settingsToRow(userId, demoData.settings))
  if (settingsError) throw settingsError

  const { error: fuelError } = await supabase.from('fuel_entries').insert(
    demoData.fuelEntries.map((f) => ({
      user_id: userId,
      date: f.date,
      liters: f.liters,
      price_per_liter: f.pricePerLiter,
      total_cost: f.totalCost,
      mileage: f.mileage,
      consumption: f.consumption ?? null,
      station: f.station ?? null,
      full_tank: f.fullTank,
    })),
  )
  if (fuelError) throw fuelError

  const { error: maintenanceError } = await supabase.from('maintenance_entries').insert(
    demoData.maintenance.map((m) => ({
      user_id: userId,
      date: m.date,
      type: m.type,
      mileage: m.mileage,
      cost: m.cost,
      garage: m.garage,
      notes: m.notes ?? null,
      next_interval_km: m.nextIntervalKm ?? null,
      next_interval_date: m.nextIntervalDate ?? null,
    })),
  )
  if (maintenanceError) throw maintenanceError

  const { error: modsError } = await supabase.from('modifications').insert(
    demoData.modifications.map((m) => ({
      user_id: userId,
      name: m.name,
      category: m.category,
      date_installed: m.dateInstalled,
      price: m.price,
      brand: m.brand,
      notes: m.notes ?? null,
      image_url: m.imageUrl,
    })),
  )
  if (modsError) throw modsError

  const { error: tripsError } = await supabase.from('trips').insert(
    demoData.trips.map((t) => ({
      user_id: userId,
      name: t.name,
      start_location: t.start,
      destination: t.destination,
      date: t.date,
      distance_km: t.distanceKm,
      duration_minutes: t.durationMinutes,
      consumption: t.consumption,
      fuel_cost: t.fuelCost,
      notes: t.notes ?? null,
      route: t.route,
    })),
  )
  if (tripsError) throw tripsError

  const { error: docsError } = await supabase.from('documents').insert(
    demoData.documents.map((d) => ({
      user_id: userId,
      name: d.name,
      category: d.category,
      date: d.date,
      expiration_date: d.expirationDate ?? null,
      status: d.status,
    })),
  )
  if (docsError) throw docsError

  const { error: photosError } = await supabase.from('photos').insert(
    demoData.photos.map((p) => ({
      user_id: userId,
      url: p.url,
      date: p.date,
      location: p.location,
      description: p.description ?? null,
    })),
  )
  if (photosError) throw photosError

  const { error: expensesError } = await supabase.from('expenses').insert(
    demoData.expenses.map((e) => ({
      user_id: userId,
      date: e.date,
      category: e.category,
      description: e.description,
      cost: e.cost,
    })),
  )
  if (expensesError) throw expensesError

  // Timeline events go in last so each can point at the row it came from.
  // Without the link, editing a seeded fill-up would leave its timeline entry
  // stranded — and demo data is exactly what a new account starts editing.
  await seedTimeline(userId)
}

const normalize = (value: unknown) => String(value ?? '').trim().toLowerCase()

async function seedTimeline(userId: string) {
  const [fuel, maintenance, mods, trips, docs, expenses] = await Promise.all([
    supabase.from('fuel_entries').select('id, date, total_cost').eq('user_id', userId),
    supabase.from('maintenance_entries').select('id, date, type').eq('user_id', userId),
    supabase.from('modifications').select('id, date_installed, name').eq('user_id', userId),
    supabase.from('trips').select('id, date, name').eq('user_id', userId),
    supabase.from('documents').select('id, date, name').eq('user_id', userId),
    supabase.from('expenses').select('id, date, description').eq('user_id', userId),
  ])

  const sources: Record<string, Row[]> = {
    fuel_entries: fuel.data ?? [],
    maintenance_entries: maintenance.data ?? [],
    modifications: mods.data ?? [],
    trips: trips.data ?? [],
    documents: docs.data ?? [],
    expenses: expenses.data ?? [],
  }

  /** Find the row a demo timeline entry describes, by its natural key. */
  function findSource(event: (typeof demoData.timeline)[number]): [string, string] | null {
    const sameDate = (row: Row) => row.date === event.date
    switch (event.type) {
      case 'fuel': {
        const row = sources.fuel_entries.find(
          (r) => sameDate(r) && Number(r.total_cost) === Number(event.cost),
        )
        return row ? ['fuel_entries', row.id] : null
      }
      case 'maintenance': {
        const row = sources.maintenance_entries.find(
          (r) => sameDate(r) && normalize(r.type) === normalize(event.title),
        )
        return row ? ['maintenance_entries', row.id] : null
      }
      case 'modification': {
        const row = sources.modifications.find(
          (r) => r.date_installed === event.date && normalize(r.name) === normalize(event.title),
        )
        return row ? ['modifications', row.id] : null
      }
      case 'trip': {
        const row = sources.trips.find((r) => sameDate(r) && normalize(r.name) === normalize(event.title))
        return row ? ['trips', row.id] : null
      }
      case 'document': {
        const row = sources.documents.find((r) => sameDate(r) && normalize(r.name) === normalize(event.title))
        return row ? ['documents', row.id] : null
      }
      case 'expense': {
        const row = sources.expenses.find(
          (r) => sameDate(r) && normalize(r.description) === normalize(event.title),
        )
        return row ? ['expenses', row.id] : null
      }
      default:
        return null
    }
  }

  const rows = demoData.timeline.map((event) => {
    const source = findSource(event)
    return {
      user_id: userId,
      date: event.date,
      type: event.type,
      title: event.title,
      description: event.description,
      mileage: event.mileage ?? null,
      cost: event.cost ?? null,
      image_url: event.imageUrl ?? null,
      source_table: source?.[0] ?? null,
      source_id: source?.[1] ?? null,
    }
  })

  const { error } = await supabase.from('timeline_events').insert(rows)
  if (error) throw error
}

// --- per-collection fetching ---
//
// Fetching used to mean ten `select *` queries on every write, every realtime
// event and every pull-to-refresh. Collections let a change refresh only the
// slice it touched, and the explicit column lists keep base64 media out of the
// common path.

export const ALL_COLLECTIONS: Collection[] = [
  'vehicle',
  'settings',
  'timeline',
  'fuelEntries',
  'maintenance',
  'modifications',
  'trips',
  'documents',
  'photos',
  'expenses',
]

/**
 * Resolve an image that may be stored as a bucket path. Falls back to the
 * original value if signing fails, so a broken link is better than a blank one.
 */
export async function resolveImage(value: string): Promise<string> {
  if (!isStoragePath(value)) return value
  return (await resolveMedia(value)) ?? value
}

function mediaPaths(values: (string | undefined)[]): string[] {
  return values.filter(isStoragePath)
}

async function resolveVehicleImages(vehicles: Vehicle[]): Promise<Vehicle[]> {
  const paths = mediaPaths(vehicles.map((v) => v.imageUrl))
  if (paths.length === 0) return vehicles
  const signed = await signedUrls(paths)
  for (const vehicle of vehicles) {
    if (isStoragePath(vehicle.imageUrl)) {
      vehicle.imageUrl = signed.get(vehicle.imageUrl) ?? vehicle.imageUrl
    }
  }
  return vehicles
}

/** Media rows are fetched without their payload; use fetchLegacyMedia for that. */
const PHOTO_COLUMNS = 'id, user_id, url, date, location, description, storage_path'
const DOCUMENT_COLUMNS =
  'id, user_id, name, category, date, expiration_date, status, storage_path'

export interface CollectionPayload extends Partial<CarData> {
  vehicles?: Vehicle[]
}

export async function fetchCollections(
  userId: string,
  collections: Collection[],
): Promise<CollectionPayload> {
  const wanted = new Set(collections)
  const payload: CollectionPayload = {}

  await Promise.all(
    ALL_COLLECTIONS.filter((c) => wanted.has(c)).map(async (collection) => {
      switch (collection) {
        case 'vehicle': {
          const { data, error } = await supabase
            .from('vehicle')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .limit(1)
          if (error) throw error

          let row: Row | null = data?.[0] ?? null
          if (!row) {
            // No active row (a race after switching, or none flagged yet) —
            // adopt any vehicle this user owns so future loads are consistent.
            const fallback = await supabase.from('vehicle').select('*').eq('user_id', userId).limit(1)
            if (fallback.error) throw fallback.error
            row = fallback.data?.[0] ?? null
            if (row) {
              await supabase.from('vehicle').update({ is_active: true }).eq('id', row.id)
            }
          }

          // demoData.vehicle is already app-shaped; passing it through
          // vehicleFromRow (which expects snake_case) yields undefined mileage.
          payload.vehicle = row ? vehicleFromRow(row) : { ...demoData.vehicle }
          payload.vehicles = await fetchVehicles(userId)
          // Vehicle photos become storage paths once uploaded; the picker shows
          // every car, so resolve the whole list, not just the active one.
          await resolveVehicleImages(payload.vehicles)
          if (payload.vehicle) payload.vehicle = { ...payload.vehicle, imageUrl: await resolveImage(payload.vehicle.imageUrl) }
          break
        }
        case 'settings': {
          const { data, error } = await supabase
            .from('app_settings')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
          if (error) throw error
          const settings = settingsFromRow(data)
          if (settings.avatarUrl) settings.avatarUrl = await resolveImage(settings.avatarUrl)
          payload.settings = settings
          break
        }
        case 'timeline': {
          const { data, error } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          payload.timeline = (data ?? []).map(timelineFromRow)
          break
        }
        case 'fuelEntries': {
          const { data, error } = await supabase
            .from('fuel_entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          payload.fuelEntries = (data ?? []).map(fuelFromRow)
          break
        }
        case 'maintenance': {
          const { data, error } = await supabase
            .from('maintenance_entries')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          payload.maintenance = (data ?? []).map(maintenanceFromRow)
          break
        }
        case 'modifications': {
          const { data, error } = await supabase
            .from('modifications')
            .select('*')
            .eq('user_id', userId)
            .order('date_installed', { ascending: false })
          if (error) throw error
          payload.modifications = (data ?? []).map(modFromRow)
          break
        }
        case 'trips': {
          const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          payload.trips = (data ?? []).map(tripFromRow)
          break
        }
        case 'documents': {
          const { data, error } = await supabase
            .from('documents')
            .select(DOCUMENT_COLUMNS)
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          const documents = (data ?? []).map(docFromRow)
          const signed = await signedUrls(documents.map((d) => d.storagePath).filter(Boolean) as string[])
          payload.documents = documents.map((d) => ({
            ...d,
            fileUrl: d.storagePath ? signed.get(d.storagePath) ?? d.fileData : d.fileData,
          }))
          break
        }
        case 'photos': {
          const { data, error } = await supabase
            .from('photos')
            .select(PHOTO_COLUMNS)
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          const photos = (data ?? []).map(photoFromRow)
          const signed = await signedUrls(photos.map((p) => p.storagePath).filter(Boolean) as string[])
          payload.photos = photos.map((p) => ({
            ...p,
            url: (p.storagePath && signed.get(p.storagePath)) || p.url,
          }))
          break
        }
        case 'expenses': {
          const { data, error } = await supabase
            .from('expenses')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
          if (error) throw error
          payload.expenses = (data ?? []).map(expenseFromRow)
          break
        }
      }
    }),
  )

  return payload
}

export async function fetchCarData(userId: string): Promise<CarData> {
  const payload = await fetchCollections(userId, ALL_COLLECTIONS)
  return assembleCarData(payload)
}

/** Fold a partial payload onto the app's full shape, deriving chart series. */
export function assembleCarData(payload: CollectionPayload, base?: CarData): CarData {
  const vehicle = payload.vehicle ?? base?.vehicle ?? { ...demoData.vehicle }
  const settings = payload.settings ?? base?.settings ?? { ...demoData.settings }
  const fuelEntries = payload.fuelEntries ?? base?.fuelEntries ?? []

  return {
    vehicle,
    settings,
    timeline: payload.timeline ?? base?.timeline ?? [],
    fuelEntries,
    maintenance: payload.maintenance ?? base?.maintenance ?? [],
    modifications: payload.modifications ?? base?.modifications ?? [],
    trips: payload.trips ?? base?.trips ?? [],
    documents: payload.documents ?? base?.documents ?? [],
    photos: payload.photos ?? base?.photos ?? [],
    expenses: payload.expenses ?? base?.expenses ?? [],
    ...deriveMonthlySeries(fuelEntries, vehicle.startingMileage),
  }
}

/** Merge a refetched slice into existing state, keeping everything else intact. */
export function mergeCollections(base: CarData, payload: CollectionPayload): CarData {
  return assembleCarData(payload, base)
}

// --- media payloads (only pulled in by the explicit backfill action) ---

/**
 * Rows still holding a base64 payload. Photos kept theirs in two places (`url`
 * was set to the data URL when the photo was added), so both are checked.
 */
export async function fetchLegacyMedia(
  userId: string,
  table: 'photos' | 'documents',
): Promise<{ id: string; dataUrl: string }[]> {
  const { data, error } = await supabase
    .from(table)
    .select(table === 'photos' ? 'id, url, file_data' : 'id, file_data')
    .eq('user_id', userId)
  if (error) throw error
  return (data ?? [])
    .map((r: Row) => {
      const dataUrl = isDataUrl(r.file_data)
        ? r.file_data
        : table === 'photos' && isDataUrl(r.url)
          ? r.url
          : null
      return dataUrl ? { id: r.id, dataUrl } : null
    })
    .filter((row): row is { id: string; dataUrl: string } => row !== null)
}

/** Data URLs still sitting in the vehicle photo or the profile avatar. */
export async function fetchLegacyImages(
  userId: string,
): Promise<{ kind: 'vehicle' | 'avatar'; id?: string; dataUrl: string }[]> {
  const [vehicle, settings] = await Promise.all([
    supabase.from('vehicle').select('id, image_url').eq('user_id', userId),
    supabase.from('app_settings').select('avatar_url').eq('user_id', userId).maybeSingle(),
  ])
  if (vehicle.error) throw vehicle.error
  if (settings.error) throw settings.error

  const found: { kind: 'vehicle' | 'avatar'; id?: string; dataUrl: string }[] = []
  for (const row of vehicle.data ?? []) {
    if (isDataUrl(row.image_url)) found.push({ kind: 'vehicle', id: row.id, dataUrl: row.image_url })
  }
  if (isDataUrl(settings.data?.avatar_url)) {
    found.push({ kind: 'avatar', dataUrl: settings.data!.avatar_url })
  }
  return found
}

// --- multi-vehicle helpers ---

export async function fetchVehicles(userId: string): Promise<Vehicle[]> {
  const { data, error } = await supabase
    .from('vehicle')
    .select('*')
    .eq('user_id', userId)
    .order('purchase_date', { ascending: false })
  if (error) throw error
  return (data ?? []).map(vehicleFromRow)
}

export async function addVehicle(userId: string, v: Omit<Vehicle, 'id'>) {
  await supabase.from('vehicle').update({ is_active: false }).eq('user_id', userId)
  const { data, error } = await supabase
    .from('vehicle')
    .insert({ ...vehicleToRow(userId, v as Vehicle), is_active: true })
    .select()
    .single()
  if (error) throw error
  return data ? vehicleFromRow(data) : null
}

export async function setActiveVehicle(userId: string, vehicleId: string) {
  await supabase.from('vehicle').update({ is_active: false }).eq('user_id', userId)
  const { error } = await supabase.from('vehicle').update({ is_active: true }).eq('id', vehicleId)
  if (error) throw error
}

export const rowMappers = {
  vehicleToRow,
  settingsToRow,
  timelineFromRow,
  fuelFromRow,
  maintenanceFromRow,
  modFromRow,
  tripFromRow,
  docFromRow,
  photoFromRow,
  expenseFromRow,
}
