import { useState } from 'react'
import { Download, RotateCcw, LogOut } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'

const accentColors = ['#5b6cff', '#8b5cf6', '#34d399', '#f5a524', '#f5556c']

export default function Settings() {
  const { data, updateVehicle, updateSettings, resetAll } = useCarData()
  const { session, signOut } = useAuth()
  const { vehicle, settings } = data
  const [confirmReset, setConfirmReset] = useState(false)

  function handleExport() {
    const json = JSON.stringify(data, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'drivn-data.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-in max-w-2xl">
      <Header title="Settings" subtitle="Customize your dashboard" />

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Vehicle</h3>
        <div className="grid grid-cols-2 gap-3">
          <FieldWrap label="Make">
            <TextInput value={vehicle.make} onChange={(e) => updateVehicle({ make: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Model">
            <TextInput value={vehicle.model} onChange={(e) => updateVehicle({ model: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Year">
            <TextInput type="number" value={vehicle.year} onChange={(e) => updateVehicle({ year: Number(e.target.value) })} />
          </FieldWrap>
          <FieldWrap label="Engine">
            <TextInput value={vehicle.engine} onChange={(e) => updateVehicle({ engine: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Power">
            <TextInput value={vehicle.power} onChange={(e) => updateVehicle({ power: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Transmission">
            <TextInput value={vehicle.transmission} onChange={(e) => updateVehicle({ transmission: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Drive">
            <TextInput value={vehicle.drive} onChange={(e) => updateVehicle({ drive: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Trim">
            <TextInput value={vehicle.trim} onChange={(e) => updateVehicle({ trim: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Fuel type">
            <TextInput value={vehicle.fuelType} onChange={(e) => updateVehicle({ fuelType: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Current mileage">
            <TextInput type="number" value={vehicle.currentMileage} onChange={(e) => updateVehicle({ currentMileage: Number(e.target.value) })} />
          </FieldWrap>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Appearance</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-300">Dark mode</span>
          <Toggle checked={settings.darkMode} onChange={(v) => updateSettings({ darkMode: v })} />
        </div>
        <div>
          <span className="text-sm text-gray-300 block mb-2.5">Accent color</span>
          <div className="flex gap-2.5">
            {accentColors.map((c) => (
              <button
                key={c}
                onClick={() => updateSettings({ accentColor: c })}
                className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
                style={{
                  backgroundColor: c,
                  borderColor: settings.accentColor === c ? '#fff' : 'transparent',
                }}
              />
            ))}
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Notifications</h3>
        <ToggleRow label="Maintenance reminders" checked={settings.maintenanceReminders} onChange={(v) => updateSettings({ maintenanceReminders: v })} />
        <ToggleRow label="Insurance reminders" checked={settings.insuranceReminders} onChange={(v) => updateSettings({ insuranceReminders: v })} />
        <ToggleRow label="Inspection reminders" checked={settings.inspectionReminders} onChange={(v) => updateSettings({ inspectionReminders: v })} last />
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Account</h3>
        <p className="text-xs text-gray-500 mb-3">Signed in as {session?.user.email}. This account syncs your data across every device.</p>
        <Button variant="secondary" onClick={signOut}>
          <LogOut size={14} /> Sign out
        </Button>
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Data</h3>
        <div className="flex flex-col gap-2.5">
          <Button variant="secondary" onClick={handleExport}>
            <Download size={14} /> Export data
          </Button>
          {!confirmReset ? (
            <Button variant="danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={14} /> Reset data
            </Button>
          ) : (
            <div className="rounded-xl bg-bad/10 border border-bad/20 p-3.5">
              <p className="text-xs text-bad mb-3">This will erase all your changes and restore the demo data. This can't be undone.</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => { resetAll(); setConfirmReset(false) }}>
                  Confirm reset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}

function ToggleRow({ label, checked, onChange, last }: { label: string; checked: boolean; onChange: (v: boolean) => void; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between ${last ? '' : 'mb-4'}`}>
      <span className="text-sm text-gray-300">{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  )
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-accent' : 'bg-base-600'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-[22px]' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}
