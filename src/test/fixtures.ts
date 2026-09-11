import type {
  AppSettings,
  CarData,
  DocumentItem,
  FuelEntry,
  MaintenanceEntry,
  TimelineEvent,
  Vehicle,
} from '@/types'

/**
 * Test fixtures.
 *
 * Not named `*.test.ts`, so the runner doesn't treat it as a suite — it's only
 * imported by tests. Builders take the fields that matter and fill the rest with
 * plausible defaults, so each test states only what it's actually about.
 */

export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v-1',
    make: 'Ford',
    model: 'Puma',
    trim: 'Titanium',
    engine: '1.0i EcoBoost',
    power: '125 PK',
    transmission: 'A7',
    drive: 'FWD',
    year: 2026,
    fuelType: 'Petrol',
    owner: 'Nand',
    purchaseDate: '2026-02-28',
    currentMileage: 18452,
    startingMileage: 0,
    imageUrl: 'https://example.test/car.jpg',
    ...overrides,
  }
}

export function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
  return {
    darkMode: true,
    accentColor: '#5b6cff',
    maintenanceReminders: true,
    insuranceReminders: true,
    inspectionReminders: true,
    vehiclePickerOnLaunch: true,
    fabStyle: 'radial',
    uiTheme: 'classic',
    ...overrides,
  }
}

export function makeFuelEntry(
  overrides: Partial<FuelEntry> & { id: string; mileage: number },
): FuelEntry {
  return {
    date: '2026-06-01',
    liters: 40,
    pricePerLiter: 1.7,
    totalCost: 68,
    fullTank: true,
    ...overrides,
  }
}

export function makeMaintenanceEntry(
  overrides: Partial<MaintenanceEntry> & { id: string; mileage: number },
): MaintenanceEntry {
  return {
    date: '2026-06-01',
    type: 'Service',
    cost: 100,
    garage: 'Garage',
    ...overrides,
  }
}

export function makeDocument(
  overrides: Partial<DocumentItem> & { id: string; name: string },
): DocumentItem {
  return {
    category: 'Other',
    date: '2026-01-01',
    status: 'valid',
    ...overrides,
  }
}

export function makeTimelineEvent(
  overrides: Partial<TimelineEvent> & { id: string; date: string },
): TimelineEvent {
  return {
    type: 'maintenance',
    title: 'Event',
    description: 'Description',
    ...overrides,
  }
}

export function makeCarData(overrides: Partial<CarData> = {}): CarData {
  return {
    vehicle: overrides.vehicle ?? makeVehicle(),
    settings: overrides.settings ?? makeSettings(),
    timeline: overrides.timeline ?? [],
    fuelEntries: overrides.fuelEntries ?? [],
    maintenance: overrides.maintenance ?? [],
    modifications: overrides.modifications ?? [],
    trips: overrides.trips ?? [],
    documents: overrides.documents ?? [],
    photos: overrides.photos ?? [],
    expenses: overrides.expenses ?? [],
    mileageByMonth: overrides.mileageByMonth ?? [],
    consumptionByMonth: overrides.consumptionByMonth ?? [],
  }
}
