import { supabase } from './supabaseClient'
import { demoData } from '@/data/demoData'
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

function vehicleFromRow(r: any): Vehicle {
  return {
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
function vehicleToRow(userId: string, v: Vehicle) {
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

function timelineFromRow(r: any): TimelineEvent {
  return {
    id: r.id,
    date: r.date,
    type: r.type,
    title: r.title,
    description: r.description,
    mileage: r.mileage ?? undefined,
    cost: r.cost ?? undefined,
    imageUrl: r.image_url ?? undefined,
  }
}

function fuelFromRow(r: any): FuelEntry {
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

function maintenanceFromRow(r: any): MaintenanceEntry {
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

function modFromRow(r: any): Modification {
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

function tripFromRow(r: any): Trip {
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

function docFromRow(r: any): DocumentItem {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    date: r.date,
    expirationDate: r.expiration_date ?? undefined,
    status: r.status,
    fileData: r.file_data ?? undefined,
  }
}

function photoFromRow(r: any): Photo {
  return { id: r.id, url: r.url, date: r.date, location: r.location, description: r.description ?? undefined, fileData: r.file_data ?? undefined }
}

function expenseFromRow(r: any): Expense {
  return { id: r.id, date: r.date, category: r.category, description: r.description, cost: r.cost }
}

function settingsFromRow(r: any): AppSettings {
  return {
    darkMode: r.dark_mode,
    accentColor: r.accent_color,
    maintenanceReminders: r.maintenance_reminders,
    insuranceReminders: r.insurance_reminders,
    inspectionReminders: r.inspection_reminders,
    avatarUrl: r.avatar_url ?? undefined,
  }
}

// --- seeding ---

export async function seedIfEmpty(userId: string) {
  const { data: existing } = await supabase.from('vehicle').select('user_id').eq('user_id', userId).maybeSingle()
  if (existing) return

  await supabase.from('vehicle').insert(vehicleToRow(userId, demoData.vehicle))
  await supabase.from('app_settings').insert({
    user_id: userId,
    dark_mode: demoData.settings.darkMode,
    accent_color: demoData.settings.accentColor,
    maintenance_reminders: demoData.settings.maintenanceReminders,
    insurance_reminders: demoData.settings.insuranceReminders,
    inspection_reminders: demoData.settings.inspectionReminders,
  })
  await supabase.from('timeline_events').insert(
    demoData.timeline.map((e) => ({
      user_id: userId,
      date: e.date,
      type: e.type,
      title: e.title,
      description: e.description,
      mileage: e.mileage ?? null,
      cost: e.cost ?? null,
      image_url: e.imageUrl ?? null,
    }))
  )
  await supabase.from('fuel_entries').insert(
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
    }))
  )
  await supabase.from('maintenance_entries').insert(
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
    }))
  )
  await supabase.from('modifications').insert(
    demoData.modifications.map((m) => ({
      user_id: userId,
      name: m.name,
      category: m.category,
      date_installed: m.dateInstalled,
      price: m.price,
      brand: m.brand,
      notes: m.notes ?? null,
      image_url: m.imageUrl,
    }))
  )
  await supabase.from('trips').insert(
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
    }))
  )
  await supabase.from('documents').insert(
    demoData.documents.map((d) => ({
      user_id: userId,
      name: d.name,
      category: d.category,
      date: d.date,
      expiration_date: d.expirationDate ?? null,
      status: d.status,
    }))
  )
  await supabase.from('photos').insert(
    demoData.photos.map((p) => ({
      user_id: userId,
      url: p.url,
      date: p.date,
      location: p.location,
      description: p.description ?? null,
    }))
  )
  await supabase.from('expenses').insert(
    demoData.expenses.map((e) => ({
      user_id: userId,
      date: e.date,
      category: e.category,
      description: e.description,
      cost: e.cost,
    }))
  )
}

// --- full fetch ---

export async function fetchCarData(userId: string): Promise<CarData> {
  const [vehicle, settings, timeline, fuel, maintenance, mods, trips, docs, photos, expenses] = await Promise.all([
    supabase.from('vehicle').select('*').eq('user_id', userId).single(),
    supabase.from('app_settings').select('*').eq('user_id', userId).single(),
    supabase.from('timeline_events').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('fuel_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('maintenance_entries').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('modifications').select('*').eq('user_id', userId).order('date_installed', { ascending: false }),
    supabase.from('trips').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('documents').select('*').eq('user_id', userId),
    supabase.from('photos').select('*').eq('user_id', userId).order('date', { ascending: false }),
    supabase.from('expenses').select('*').eq('user_id', userId).order('date', { ascending: false }),
  ])

  return {
    vehicle: vehicleFromRow(vehicle.data),
    settings: settingsFromRow(settings.data),
    timeline: (timeline.data ?? []).map(timelineFromRow),
    fuelEntries: (fuel.data ?? []).map(fuelFromRow),
    maintenance: (maintenance.data ?? []).map(maintenanceFromRow),
    modifications: (mods.data ?? []).map(modFromRow),
    trips: (trips.data ?? []).map(tripFromRow),
    documents: (docs.data ?? []).map(docFromRow),
    photos: (photos.data ?? []).map(photoFromRow),
    expenses: (expenses.data ?? []).map(expenseFromRow),
    // Charts stay derived client-side from demo shape for now — see mileageByMonth/consumptionByMonth below.
    mileageByMonth: demoData.mileageByMonth,
    consumptionByMonth: demoData.consumptionByMonth,
  }
}

export const rowMappers = {
  vehicleToRow,
  timelineFromRow,
  fuelFromRow,
  maintenanceFromRow,
  modFromRow,
  tripFromRow,
  docFromRow,
  photoFromRow,
  expenseFromRow,
}
