import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
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
import { supabase } from '@/lib/supabaseClient'
import { fetchCarData, seedIfEmpty, rowMappers, fetchVehicles, addVehicle as addVehicleRow, setActiveVehicle } from '@/lib/supabaseData'
import { useAuth } from './AuthContext'
import { useToast } from './ToastContext'

interface DataContextValue {
  data: CarData
  vehicles: Vehicle[]
  loading: boolean
  updateVehicle: (v: Partial<Vehicle>) => void
  addVehicle: (v: Omit<Vehicle, 'id'>) => Promise<void>
  switchVehicle: (id: string) => Promise<void>
  addFuelEntry: (entry: Omit<FuelEntry, 'id'>) => void
  addMaintenance: (entry: Omit<MaintenanceEntry, 'id'>) => void
  addModification: (mod: Omit<Modification, 'id'>) => void
  updateModification: (id: string, mod: Partial<Modification>) => void
  deleteModification: (id: string) => void
  addTrip: (trip: Omit<Trip, 'id'>) => void
  addDocument: (doc: Omit<DocumentItem, 'id'>) => void
  addPhoto: (photo: Omit<Photo, 'id'>) => void
  deletePhoto: (id: string) => void
  addTimelineEvent: (evt: Omit<TimelineEvent, 'id'>) => void
  addExpense: (expense: Omit<Expense, 'id'>) => void
  updateSettings: (s: Partial<AppSettings>) => void
  resetAll: () => void
  resetEmpty: () => void
  deleteTrip: (id: string) => void
  deleteDocument: (id: string) => void
  reload: () => void
}

const DataContext = createContext<DataContextValue | null>(null)

export function DataProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  const userId = session?.user.id
  const { showToast } = useToast()
  const [data, setData] = useState<CarData | null>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) return
    const [fresh, allVehicles] = await Promise.all([fetchCarData(userId), fetchVehicles(userId)])
    setData(fresh)
    setVehicles(allVehicles)
    setLoading(false)
  }, [userId])

  useEffect(() => {
    if (!userId) return
    setLoading(true)
    seedIfEmpty(userId).then(reload)
  }, [userId, reload])

  // Cross-device sync: any change from another session (e.g. the other device) triggers a reload.
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel(`drivn-sync-${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', filter: `user_id=eq.${userId}` }, () => {
        reload()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, reload])

  async function updateVehicle(v: Partial<Vehicle>) {
    if (!userId || !data) return
    const merged = { ...data.vehicle, ...v }
    setData((d) => (d ? { ...d, vehicle: merged } : d))
    await supabase.from('vehicle').update(rowMappers.vehicleToRow(userId, merged)).eq('id', data.vehicle.id)
  }

  async function addVehicle(v: Omit<Vehicle, 'id'>) {
    if (!userId) return
    await addVehicleRow(userId, v)
    showToast('Car added')
    await reload()
  }

  async function switchVehicle(id: string) {
    if (!userId) return
    await setActiveVehicle(userId, id)
    await reload()
  }

  async function addFuelEntry(entry: Omit<FuelEntry, 'id'>) {
    if (!userId) return
    const { data: row } = await supabase
      .from('fuel_entries')
      .insert({
        user_id: userId,
        date: entry.date,
        liters: entry.liters,
        price_per_liter: entry.pricePerLiter,
        total_cost: entry.totalCost,
        mileage: entry.mileage,
        consumption: entry.consumption ?? null,
        station: entry.station ?? null,
        full_tank: entry.fullTank,
      })
      .select()
      .single()
    if (!row) return
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: entry.date,
      type: 'fuel',
      title: 'Fill-up',
      description: entry.station ? `Refueled at ${entry.station}.` : 'Refueled.',
      mileage: entry.mileage,
      cost: entry.totalCost,
    })
    if (entry.mileage > (data?.vehicle.currentMileage ?? 0)) {
      await supabase.from('vehicle').update({ current_mileage: entry.mileage }).eq('id', data?.vehicle.id)
    }
    showToast('Fuel entry added')
    reload()
  }

  async function addMaintenance(entry: Omit<MaintenanceEntry, 'id'>) {
    if (!userId) return
    await supabase.from('maintenance_entries').insert({
      user_id: userId,
      date: entry.date,
      type: entry.type,
      mileage: entry.mileage,
      cost: entry.cost,
      garage: entry.garage,
      notes: entry.notes ?? null,
      next_interval_km: entry.nextIntervalKm ?? null,
      next_interval_date: entry.nextIntervalDate ?? null,
    })
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: entry.date,
      type: 'maintenance',
      title: entry.type,
      description: `Serviced at ${entry.garage}.`,
      mileage: entry.mileage,
      cost: entry.cost,
    })
    showToast('Maintenance entry added')
    reload()
  }

  async function addModification(mod: Omit<Modification, 'id'>) {
    if (!userId) return
    await supabase.from('modifications').insert({
      user_id: userId,
      name: mod.name,
      category: mod.category,
      date_installed: mod.dateInstalled,
      price: mod.price,
      brand: mod.brand,
      notes: mod.notes ?? null,
      image_url: mod.imageUrl,
    })
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: mod.dateInstalled,
      type: 'modification',
      title: mod.name,
      description: `Installed by ${mod.brand}.`,
      cost: mod.price,
      image_url: mod.imageUrl,
    })
    showToast('Modification added')
    reload()
  }

  async function updateModification(id: string, mod: Partial<Modification>) {
    const patch: Record<string, unknown> = {}
    if (mod.name !== undefined) patch.name = mod.name
    if (mod.category !== undefined) patch.category = mod.category
    if (mod.dateInstalled !== undefined) patch.date_installed = mod.dateInstalled
    if (mod.price !== undefined) patch.price = mod.price
    if (mod.brand !== undefined) patch.brand = mod.brand
    if (mod.notes !== undefined) patch.notes = mod.notes
    if (mod.imageUrl !== undefined) patch.image_url = mod.imageUrl
    await supabase.from('modifications').update(patch).eq('id', id)
    showToast('Modification updated')
    reload()
  }

  async function deleteModification(id: string) {
    await supabase.from('modifications').delete().eq('id', id)
    showToast('Modification deleted', 'info')
    reload()
  }

  async function addTrip(trip: Omit<Trip, 'id'>) {
    if (!userId) return
    await supabase.from('trips').insert({
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
    })
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: trip.date,
      type: 'trip',
      title: trip.name,
      description: `${trip.start} \u2192 ${trip.destination}`,
      cost: trip.fuelCost,
    })
    showToast('Trip added')
    reload()
  }

  async function addDocument(doc: Omit<DocumentItem, 'id'>) {
    if (!userId) return
    await supabase.from('documents').insert({
      user_id: userId,
      name: doc.name,
      category: doc.category,
      date: doc.date,
      expiration_date: doc.expirationDate ?? null,
      status: doc.status,
      file_data: doc.fileData ?? null,
    })
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: doc.date,
      type: 'document',
      title: doc.name,
      description: `${doc.category} document added.`,
    })
    showToast('Document added')
    reload()
  }

  async function addPhoto(photo: Omit<Photo, 'id'>) {
    if (!userId) return
    await supabase.from('photos').insert({
      user_id: userId,
      url: photo.url,
      date: photo.date,
      location: photo.location,
      description: photo.description ?? null,
      file_data: photo.fileData ?? null,
    })
    showToast('Photo added')
    reload()
  }

  async function deletePhoto(id: string) {
    await supabase.from('photos').delete().eq('id', id)
    showToast('Photo deleted', 'info')
    reload()
  }

  async function deleteTrip(id: string) {
    await supabase.from('trips').delete().eq('id', id)
    showToast('Trip deleted', 'info')
    reload()
  }

  async function deleteDocument(id: string) {
    await supabase.from('documents').delete().eq('id', id)
    showToast('Document deleted', 'info')
    reload()
  }

  async function addTimelineEvent(evt: Omit<TimelineEvent, 'id'>) {
    if (!userId) return
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: evt.date,
      type: evt.type,
      title: evt.title,
      description: evt.description,
      mileage: evt.mileage ?? null,
      cost: evt.cost ?? null,
      image_url: evt.imageUrl ?? null,
    })
    showToast('Event added')
    reload()
  }

  async function addExpense(expense: Omit<Expense, 'id'>) {
    if (!userId) return
    await supabase.from('expenses').insert({
      user_id: userId,
      date: expense.date,
      category: expense.category,
      description: expense.description,
      cost: expense.cost,
    })
    await supabase.from('timeline_events').insert({
      user_id: userId,
      date: expense.date,
      type: 'expense',
      title: expense.description,
      description: expense.category,
      cost: expense.cost,
    })
    showToast('Expense added')
    reload()
  }

  async function updateSettings(s: Partial<AppSettings>) {
    if (!userId || !data) return
    const merged = { ...data.settings, ...s }
    setData((d) => (d ? { ...d, settings: merged } : d))
    await supabase
      .from('app_settings')
      .update({
        dark_mode: merged.darkMode,
        accent_color: merged.accentColor,
        maintenance_reminders: merged.maintenanceReminders,
        insurance_reminders: merged.insuranceReminders,
        inspection_reminders: merged.inspectionReminders,
        avatar_url: merged.avatarUrl ?? null,
        mobile_nav_items: merged.mobileNavItems ? JSON.stringify(merged.mobileNavItems) : null,
        vehicle_picker_on_launch: merged.vehiclePickerOnLaunch,
      })
      .eq('user_id', userId)
  }

  async function resetEmpty() {
    if (!userId) return
    const tables = [
      'timeline_events',
      'fuel_entries',
      'maintenance_entries',
      'modifications',
      'trips',
      'documents',
      'photos',
      'expenses',
    ]
    for (const t of tables) {
      await supabase.from(t).delete().eq('user_id', userId)
    }
    showToast('All data cleared', 'info')
    reload()
  }

  async function resetAll() {
    if (!userId) return
    const tables = [
      'timeline_events',
      'fuel_entries',
      'maintenance_entries',
      'modifications',
      'trips',
      'documents',
      'photos',
      'expenses',
    ]
    for (const t of tables) {
      await supabase.from(t).delete().eq('user_id', userId)
    }
    await supabase.from('vehicle').delete().eq('user_id', userId)
    await supabase.from('app_settings').delete().eq('user_id', userId)
    await seedIfEmpty(userId)
    showToast('Data reset to demo state', 'info')
    reload()
  }

  if (loading || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <div className="flex items-center gap-2.5 text-gray-400 text-sm">
          <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          Loading your car…
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
        updateVehicle,
        addVehicle,
        switchVehicle,
        addFuelEntry,
        addMaintenance,
        addModification,
        updateModification,
        deleteModification,
        addTrip,
        addDocument,
        addPhoto,
        deletePhoto,
        addTimelineEvent,
        addExpense,
        updateSettings,
        resetAll,
        resetEmpty,
        deleteTrip,
        deleteDocument,
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
