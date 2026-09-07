import { useState } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from '@/context/AuthContext'
import { ToastProvider } from '@/context/ToastContext'
import { DataProvider, useCarData } from '@/context/DataContext'
import { Sidebar } from '@/components/layout/Sidebar'
import { CockpitSidebar } from '@/components/cockpit/CockpitSidebar'
import { CockpitTopBar } from '@/components/cockpit/CockpitTopBar'
import { MobileNav } from '@/components/layout/MobileNav'
import { PullToRefresh } from '@/components/PullToRefresh'
import { VehiclePicker } from '@/pages/VehiclePicker'
import Login from '@/pages/Login'
import Overview from '@/pages/Overview'
import CockpitOverview from '@/pages/CockpitOverview'
import Timeline from '@/pages/Timeline'
import Maintenance from '@/pages/Maintenance'
import FuelCosts from '@/pages/FuelCosts'
import Statistics from '@/pages/Statistics'
import Modifications from '@/pages/Modifications'
import Trips from '@/pages/Trips'
import Documents from '@/pages/Documents'
import Gallery from '@/pages/Gallery'
import Settings from '@/pages/Settings'
import More from '@/pages/More'
import Share from '@/pages/Share'

function AppShell() {
  const { data, vehicles } = useCarData()
  const navigate = useNavigate()
  const [showPicker, setShowPicker] = useState(
    () =>
      data.settings.vehiclePickerOnLaunch &&
      vehicles.length > 1 &&
      sessionStorage.getItem('drivn.vehicleChosen') !== '1'
  )

  if (showPicker) {
    return <VehiclePicker onDone={() => setShowPicker(false)} />
  }

  const OverviewComponent = data.settings.uiTheme === 'cockpit' ? CockpitOverview : Overview
  const isCockpit = data.settings.uiTheme === 'cockpit'

  return (
    <div className="flex min-h-screen bg-base-950">
      {isCockpit ? <CockpitSidebar /> : <Sidebar />}
      <div className="flex-1 min-w-0 flex flex-col">
        {isCockpit && <CockpitTopBar />}
        <main className="flex-1 min-w-0 px-4 md:px-6 lg:px-8 pt-6 md:pt-8 pb-24 md:pb-10 max-w-[1440px] w-full">
          <PullToRefresh>
            <Routes>
              <Route path="/" element={<OverviewComponent />} />
              <Route path="/timeline" element={<Timeline />} />
              <Route path="/maintenance" element={<Maintenance />} />
              <Route path="/fuel" element={<FuelCosts />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/modifications" element={<Modifications />} />
              <Route path="/trips" element={<Trips />} />
              <Route path="/documents" element={<Documents />} />
              <Route path="/gallery" element={<Gallery />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/more" element={<More />} />
              <Route path="/vehicles" element={<VehiclePicker onDone={() => navigate('/')} />} />
              <Route path="/share" element={<Share />} />
            </Routes>
          </PullToRefresh>
        </main>
      </div>
      <MobileNav />
    </div>
  )
}

function Gate() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-950">
        <div className="w-4 h-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <DataProvider>
      <AppShell />
    </DataProvider>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Gate />
      </AuthProvider>
    </ToastProvider>
  )
}
