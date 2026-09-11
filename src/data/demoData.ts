import type { CarData } from '@/types'

export const CAR_IMAGE =
  'https://images.unsplash.com/photo-1698258649681-5d5c0c1e7c1a?q=80&w=1600&auto=format&fit=crop'

export const demoData: CarData = {
  vehicle: {
    // Placeholder id — real rows get a uuid from the database.
    id: 'demo-vehicle',
    make: 'Ford',
    model: 'Puma',
    trim: 'Titanium',
    engine: '1.0i EcoBoost mHEV',
    power: '125 PK',
    transmission: 'A7',
    drive: 'FWD',
    year: 2026,
    fuelType: 'Petrol / Mild Hybrid',
    owner: 'Nand',
    purchaseDate: '2026-02-28',
    currentMileage: 18452,
    startingMileage: 0,
    imageUrl: CAR_IMAGE,
  },

  timeline: [
    {
      id: 'tl-1',
      date: '2026-02-28',
      type: 'purchase',
      title: 'Purchased',
      description: 'Ford Puma Titanium, delivered by Ford Herentals.',
      mileage: 0,
      cost: 28950,
    },
    {
      id: 'tl-2',
      date: '2026-03-15',
      type: 'maintenance',
      title: 'First service',
      description: 'Standard first inspection and fluid top-up.',
      mileage: 5120,
      cost: 245,
    },
    {
      id: 'tl-3',
      date: '2026-04-22',
      type: 'modification',
      title: 'Added mods',
      description: 'Installed Maxton front spoiler.',
      mileage: 7340,
      cost: 189,
    },
    {
      id: 'tl-4',
      date: '2026-05-10',
      type: 'document',
      title: 'Insurance renewed',
      description: 'Full omnium policy renewed with Baloise.',
      mileage: 8620,
    },
    {
      id: 'tl-5',
      date: '2026-06-02',
      type: 'fuel',
      title: 'Fill-up',
      description: 'Full tank at Q8 Herentals.',
      mileage: 10450,
      cost: 74.3,
    },
    {
      id: 'tl-6',
      date: '2026-07-10',
      type: 'trip',
      title: 'Road trip',
      description: 'Weekend trip to the Ardennes via Durbuy.',
      mileage: 13890,
      cost: 10.21,
    },
    {
      id: 'tl-7',
      date: '2026-08-12',
      type: 'expense',
      title: 'Car wash & detail',
      description: 'Full exterior detail and interior clean.',
      mileage: 17130,
      cost: 65,
    },
    {
      id: 'tl-8',
      date: '2026-08-30',
      type: 'maintenance',
      title: 'Oil change',
      description: 'Oil and filter change at Ford Herentals.',
      mileage: 18450,
      cost: 120,
    },
  ],

  fuelEntries: [
    { id: 'f-1', date: '2026-03-05', liters: 42.1, pricePerLiter: 1.74, totalCost: 73.25, mileage: 3120, fullTank: true, station: 'Q8 Herentals' },
    { id: 'f-2', date: '2026-04-02', liters: 40.6, pricePerLiter: 1.71, totalCost: 69.43, mileage: 6480, consumption: 5.9, fullTank: true, station: 'Total Herentals' },
    { id: 'f-3', date: '2026-05-01', liters: 39.8, pricePerLiter: 1.69, totalCost: 67.26, mileage: 9720, consumption: 5.7, fullTank: true, station: 'Q8 Antwerp' },
    { id: 'f-4', date: '2026-06-02', liters: 41.2, pricePerLiter: 1.72, totalCost: 70.86, mileage: 13010, consumption: 5.8, fullTank: true, station: 'Q8 Herentals' },
    { id: 'f-5', date: '2026-07-08', liters: 43.6, pricePerLiter: 1.69, totalCost: 73.68, mileage: 16480, consumption: 5.5, fullTank: true, station: 'Esso Leuven' },
    { id: 'f-6', date: '2026-08-12', liters: 45.2, pricePerLiter: 1.72, totalCost: 77.90, mileage: 18010, consumption: 5.4, fullTank: true, station: 'Q8 Herentals' },
    { id: 'f-7', date: '2026-08-30', liters: 44.3, pricePerLiter: 1.70, totalCost: 75.31, mileage: 18450, consumption: 5.6, fullTank: true, station: 'Total Herentals' },
  ],

  // Intervals are what the Reminders feature runs on, so the seed data exercises
  // all three states rather than sitting permanently quiet:
  //   m-4 has a distance interval still ahead but a time interval already passed
  //       (oil changes are typically "every 15,000 km or 12 months"), so it is
  //       overdue on the date alone — exactly what the old km-only view missed;
  //   m-5 is due soon on both counts.
  // m-1 carries no interval: a one-off first service would otherwise read as
  // permanently overdue once the odometer moved past its 15,000 km mark.
  maintenance: [
    { id: 'm-1', date: '2026-03-15', type: 'First service', mileage: 5120, cost: 245, garage: 'Ford Herentals' },
    { id: 'm-2', date: '2026-06-20', type: 'Air filter', mileage: 12345, cost: 45, garage: 'Ford Herentals', nextIntervalKm: 30000 },
    { id: 'm-3', date: '2026-07-05', type: 'Spark plugs', mileage: 12345, cost: 73.50, garage: 'Ford Herentals', nextIntervalKm: 40000 },
    { id: 'm-4', date: '2026-08-30', type: 'Oil change', mileage: 18450, cost: 120, garage: 'Ford Herentals', notes: 'Fully synthetic 5W-30', nextIntervalKm: 20790, nextIntervalDate: '2026-09-05' },
    { id: 'm-5', date: '2026-08-30', type: 'Tyre rotation', mileage: 18450, cost: 0, garage: 'Ford Herentals', nextIntervalKm: 19200, nextIntervalDate: '2026-10-01' },
  ],

  modifications: [
    {
      id: 'mod-1',
      name: 'Maxton Spoiler',
      category: 'Exterior',
      dateInstalled: '2026-04-22',
      price: 189,
      brand: 'Maxton Design',
      imageUrl:
        'https://images.unsplash.com/photo-1610647752706-3bb12232b3ee?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'mod-2',
      name: 'Front Lip',
      category: 'Exterior',
      dateInstalled: '2026-04-22',
      price: 145,
      brand: 'Maxton Design',
      imageUrl:
        'https://images.unsplash.com/photo-1617814076231-eec0ce6d0a5c?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'mod-3',
      name: 'Rear Diffuser',
      category: 'Exterior',
      dateInstalled: '2026-04-22',
      price: 165,
      brand: 'Maxton Design',
      imageUrl:
        'https://images.unsplash.com/photo-1600661653561-629509216228?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'mod-4',
      name: '18" Alloy Wheels',
      category: 'Wheels',
      dateInstalled: '2026-06-10',
      price: 890,
      brand: 'OZ Racing',
      imageUrl:
        'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'mod-5',
      name: 'Lowering Springs',
      category: 'Performance',
      dateInstalled: '2026-06-10',
      price: 320,
      brand: 'Eibach',
      imageUrl:
        'https://images.unsplash.com/photo-1580414057403-c5f451f30e1c?q=80&w=800&auto=format&fit=crop',
    },
    {
      id: 'mod-6',
      name: 'Performance Air Filter',
      category: 'Performance',
      dateInstalled: '2026-08-05',
      price: 79,
      brand: 'K&N',
      imageUrl:
        'https://images.unsplash.com/photo-1493238792000-8113da705763?q=80&w=800&auto=format&fit=crop',
    },
  ],

  trips: [
    {
      id: 'trip-1',
      name: 'Ardennes Road Trip',
      start: 'Herentals',
      destination: 'Durbuy',
      date: '2026-07-10',
      distanceKm: 142,
      durationMinutes: 108,
      consumption: 5.4,
      fuelCost: 10.21,
      notes: 'Scenic drive through the Ardennes hills.',
      route: [
        { x: 20, y: 20 }, { x: 35, y: 28 }, { x: 48, y: 24 }, { x: 60, y: 40 },
        { x: 68, y: 55 }, { x: 78, y: 60 }, { x: 90, y: 75 },
      ],
    },
    {
      id: 'trip-2',
      name: 'Coast Drive',
      start: 'Herentals',
      destination: 'Knokke',
      date: '2026-06-20',
      distanceKm: 104,
      durationMinutes: 80,
      consumption: 5.1,
      fuelCost: 7.30,
      route: [
        { x: 15, y: 30 }, { x: 30, y: 25 }, { x: 50, y: 30 }, { x: 70, y: 20 }, { x: 88, y: 22 },
      ],
    },
    {
      id: 'trip-3',
      name: 'Spa Day',
      start: 'Herentals',
      destination: 'Spa',
      date: '2026-06-15',
      distanceKm: 116,
      durationMinutes: 85,
      consumption: 5.6,
      fuelCost: 8.10,
      route: [
        { x: 18, y: 18 }, { x: 40, y: 35 }, { x: 55, y: 45 }, { x: 72, y: 62 }, { x: 85, y: 70 },
      ],
    },
  ],

  documents: [
    { id: 'doc-1', name: 'Insurance policy', category: 'Insurance', date: '2026-02-28', expirationDate: '2027-02-28', status: 'valid' },
    { id: 'doc-2', name: 'Registration certificate', category: 'Registration', date: '2026-02-28', status: 'valid' },
    { id: 'doc-3', name: 'Inspection report', category: 'Maintenance', date: '2026-05-12', expirationDate: '2026-11-12', status: 'expiring' },
    { id: 'doc-4', name: 'Purchase invoice', category: 'Invoice', date: '2026-02-28', status: 'valid' },
    { id: 'doc-5', name: 'Owner\u2019s manual', category: 'Manual', date: '2026-02-28', status: 'valid' },
    { id: 'doc-6', name: 'Warranty card', category: 'Other', date: '2026-02-28', expirationDate: '2029-02-28', status: 'valid' },
  ],

  photos: [
    { id: 'p-1', url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=900&auto=format&fit=crop', date: '2026-02-28', location: 'Herentals', description: 'Delivery day.' },
    { id: 'p-2', url: 'https://images.unsplash.com/photo-1494905998402-395d579af36f?q=80&w=900&auto=format&fit=crop', date: '2026-04-22', location: 'Home garage', description: 'Fresh mods installed.' },
    { id: 'p-3', url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?q=80&w=900&auto=format&fit=crop', date: '2026-07-10', location: 'Durbuy' },
    { id: 'p-4', url: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?q=80&w=900&auto=format&fit=crop', date: '2026-06-10', location: 'Herentals', description: 'New wheels.' },
    { id: 'p-5', url: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?q=80&w=900&auto=format&fit=crop', date: '2026-06-20', location: 'Knokke' },
    { id: 'p-6', url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?q=80&w=900&auto=format&fit=crop', date: '2026-08-12', location: 'Herentals', description: 'Interior detail.' },
    { id: 'p-7', url: 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?q=80&w=900&auto=format&fit=crop', date: '2026-06-15', location: 'Spa' },
    { id: 'p-8', url: 'https://images.unsplash.com/photo-1580414057403-c5f451f30e1c?q=80&w=900&auto=format&fit=crop', date: '2026-08-05', location: 'Home garage' },
    { id: 'p-9', url: 'https://images.unsplash.com/photo-1571127236794-81c0bbfe1ce3?q=80&w=900&auto=format&fit=crop', date: '2026-08-30', location: 'Ford Herentals', description: 'Service day.' },
  ],

  expenses: [
    { id: 'e-1', date: '2026-08-12', category: 'Cleaning', description: 'Car wash & detail', cost: 65 },
    { id: 'e-2', date: '2026-05-10', category: 'Insurance', description: 'Annual insurance premium', cost: 890 },
    { id: 'e-3', date: '2027-01-01', category: 'Tax', description: 'Road tax', cost: 210 },
  ],

  mileageByMonth: [
    { month: 'Jan', value: 0, lastYear: 0 },
    { month: 'Feb', value: 0, lastYear: 0 },
    { month: 'Mar', value: 3120, lastYear: 0 },
    { month: 'Apr', value: 4220, lastYear: 0 },
    { month: 'May', value: 3600, lastYear: 0 },
    { month: 'Jun', value: 3290, lastYear: 0 },
    { month: 'Jul', value: 3470, lastYear: 0 },
    { month: 'Aug', value: 1530, lastYear: 0 },
    { month: 'Sep', value: 0, lastYear: 0 },
    { month: 'Oct', value: 0, lastYear: 0 },
    { month: 'Nov', value: 0, lastYear: 0 },
    { month: 'Dec', value: 0, lastYear: 0 },
  ],

  consumptionByMonth: [
    { month: 'Apr', value: 5.9 },
    { month: 'May', value: 5.7 },
    { month: 'Jun', value: 5.8 },
    { month: 'Jul', value: 5.5 },
    { month: 'Aug', value: 5.4 },
    { month: 'Sep', value: 5.6 },
  ],

  settings: {
    darkMode: true,
    accentColor: '#5b6cff',
    maintenanceReminders: true,
    insuranceReminders: true,
    inspectionReminders: true,
    vehiclePickerOnLaunch: true,
    fabStyle: 'radial',
    uiTheme: 'classic',
  },
}
