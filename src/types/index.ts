export interface Vehicle {
  id: string
  make: string
  model: string
  trim: string
  engine: string
  power: string
  transmission: string
  drive: string
  year: number
  fuelType: string
  owner: string
  purchaseDate: string
  deliveryDate?: string
  currentMileage: number
  startingMileage: number
  imageUrl: string
}

export type EventType =
  | 'purchase'
  | 'maintenance'
  | 'fuel'
  | 'modification'
  | 'trip'
  | 'document'
  | 'expense'
  | 'photo'

export interface TimelineEvent {
  id: string
  date: string
  type: EventType
  title: string
  description: string
  mileage?: number
  cost?: number
  imageUrl?: string
}

export interface FuelEntry {
  id: string
  date: string
  liters: number
  pricePerLiter: number
  totalCost: number
  mileage: number
  consumption?: number
  station?: string
  fullTank: boolean
}

export interface MaintenanceEntry {
  id: string
  date: string
  type: string
  mileage: number
  cost: number
  garage: string
  notes?: string
  nextIntervalKm?: number
  nextIntervalDate?: string
}

export type ModCategory =
  | 'Exterior'
  | 'Interior'
  | 'Wheels'
  | 'Performance'
  | 'Lighting'
  | 'Technology'

export interface Modification {
  id: string
  name: string
  category: ModCategory
  dateInstalled: string
  price: number
  brand: string
  notes?: string
  imageUrl: string
}

export interface Trip {
  id: string
  name: string
  start: string
  destination: string
  date: string
  distanceKm: number
  durationMinutes: number
  consumption: number
  fuelCost: number
  notes?: string
  route: { x: number; y: number }[]
}

export type DocCategory =
  | 'Insurance'
  | 'Registration'
  | 'Maintenance'
  | 'Invoice'
  | 'Manual'
  | 'Other'

export type DocStatus = 'valid' | 'expiring' | 'expired'

export interface DocumentItem {
  id: string
  name: string
  category: DocCategory
  date: string
  expirationDate?: string
  status: DocStatus
  fileData?: string
}

export interface Photo {
  id: string
  url: string
  date: string
  location: string
  description?: string
  fileData?: string
}

export interface Expense {
  id: string
  date: string
  category: string
  description: string
  cost: number
}

export interface MonthlyPoint {
  month: string
  value: number
  lastYear?: number
}

export interface AppSettings {
  darkMode: boolean
  accentColor: string
  maintenanceReminders: boolean
  insuranceReminders: boolean
  inspectionReminders: boolean
  avatarUrl?: string
  mobileNavItems?: string[]
  vehiclePickerOnLaunch: boolean
  fabStyle: 'sheet' | 'radial'
}

export interface CarData {
  vehicle: Vehicle
  timeline: TimelineEvent[]
  fuelEntries: FuelEntry[]
  maintenance: MaintenanceEntry[]
  modifications: Modification[]
  trips: Trip[]
  documents: DocumentItem[]
  photos: Photo[]
  expenses: Expense[]
  mileageByMonth: MonthlyPoint[]
  consumptionByMonth: MonthlyPoint[]
  settings: AppSettings
}
