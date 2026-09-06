import { useState } from 'react'
import { Download, RotateCcw, LogOut, KeyRound, Camera, Trash, Check } from 'lucide-react'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { GooeyToggle } from '@/components/ui/GooeyToggle'
import { FieldWrap, TextInput } from '@/components/ui/FormField'
import { useCarData } from '@/context/DataContext'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { moreNav, mobileTabs } from '@/lib/nav'

const navChoices = [...mobileTabs.filter((t) => t.path !== '/more'), ...moreNav]

const accentColors = ['#5b6cff', '#8b5cf6', '#34d399', '#f5a524', '#f5556c']

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function Settings() {
  const { data, updateVehicle, updateSettings, resetAll, resetEmpty } = useCarData()
  const { session, signOut, updatePassword } = useAuth()
  const { showToast } = useToast()
  const { vehicle, settings } = data
  const [confirmReset, setConfirmReset] = useState<'demo' | 'empty' | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const activeNavPaths = settings.mobileNavItems ?? ['/', '/timeline', '/trips']

  function toggleNavItem(path: string) {
    const current = settings.mobileNavItems ?? ['/', '/timeline', '/trips']
    if (current.includes(path)) {
      if (current.length <= 3) return
      updateSettings({ mobileNavItems: current.filter((p) => p !== path) })
    } else {
      if (current.length >= 3) return
      updateSettings({ mobileNavItems: [...current, path] })
    }
  }

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

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    updateSettings({ avatarUrl: dataUrl })
  }

  async function onPickCarPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const dataUrl = await readFileAsDataUrl(file)
    updateVehicle({ imageUrl: dataUrl })
  }

  async function onChangePassword() {
    if (newPassword.length < 6) {
      showToast('Password needs at least 6 characters', 'error')
      return
    }
    setPwSaving(true)
    const { error } = await updatePassword(newPassword)
    setPwSaving(false)
    if (error) showToast(error, 'error')
    else {
      showToast('Password updated')
      setNewPassword('')
    }
  }

  return (
    <div className="fade-in max-w-2xl">
      <Header title="Settings" subtitle="Customize your dashboard" />

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Profile</h3>
        <div className="flex items-center gap-4">
          <label className="relative w-16 h-16 rounded-full overflow-hidden bg-accent/20 flex items-center justify-center cursor-pointer shrink-0 group">
            {settings.avatarUrl ? (
              <img src={settings.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-lg font-semibold text-accent-light">{vehicle.owner.slice(0, 1)}</span>
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={16} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </label>
          <div className="flex-1">
            <FieldWrap label="Owner name">
              <TextInput value={vehicle.owner} onChange={(e) => updateVehicle({ owner: e.target.value })} />
            </FieldWrap>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Vehicle</h3>
        <label className="relative block w-full h-36 rounded-xl overflow-hidden bg-base-800 border border-white/10 cursor-pointer group mb-4">
          <img src={vehicle.imageUrl} alt={vehicle.model} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-2 transition-opacity">
            <Camera size={16} className="text-white" />
            <span className="text-xs text-white">Change photo</span>
          </div>
          <input type="file" accept="image/*" className="hidden" onChange={onPickCarPhoto} />
        </label>
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
          <FieldWrap label="Purchase date">
            <TextInput type="date" value={vehicle.purchaseDate} onChange={(e) => updateVehicle({ purchaseDate: e.target.value })} />
          </FieldWrap>
          <FieldWrap label="Delivery date" hint="Optional">
            <TextInput type="date" value={vehicle.deliveryDate ?? ''} onChange={(e) => updateVehicle({ deliveryDate: e.target.value || undefined })} />
          </FieldWrap>
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Startup</h3>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm text-gray-300 block">Ask which car on launch</span>
            <span className="text-xs text-gray-500">Only matters if you have more than one car.</span>
          </div>
          <GooeyToggle checked={settings.vehiclePickerOnLaunch} onChange={(v) => updateSettings({ vehiclePickerOnLaunch: v })} />
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Appearance</h3>
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-gray-300">Dark mode</span>
          <GooeyToggle checked={settings.darkMode} onChange={(v) => updateSettings({ darkMode: v })} />
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
        <h3 className="text-sm font-semibold text-gray-200 mb-1">Mobile navigation</h3>
        <p className="text-xs text-gray-500 mb-4">Pick up to 3 tabs for the bottom bar on your phone (“More” always stays as the 4th).</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {navChoices.map((item) => {
            const active = activeNavPaths.includes(item.path)
            return (
              <button
                key={item.path}
                onClick={() => toggleNavItem(item.path)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-xs font-medium transition-colors ${
                  active
                    ? 'bg-accent/15 border-accent/30 text-accent-light'
                    : 'bg-white/[0.02] border-white/8 text-gray-400 hover:text-gray-200'
                }`}
              >
                <item.icon size={14} />
                <span className="flex-1 text-left truncate">{item.label}</span>
                {active && <Check size={13} />}
              </button>
            )
          })}
        </div>
      </Card>

      <Card className="mb-4">
        <h3 className="text-sm font-semibold text-gray-200 mb-4">Account</h3>
        <p className="text-xs text-gray-500 mb-4">Signed in as {session?.user.email}. This account syncs your data across every device.</p>

        <FieldWrap label="New password" hint="At least 6 characters">
          <TextInput type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </FieldWrap>
        <div className="flex gap-2 mb-4">
          <Button variant="secondary" size="sm" onClick={onChangePassword} disabled={pwSaving || !newPassword}>
            <KeyRound size={13} /> {pwSaving ? 'Updating…' : 'Update password'}
          </Button>
        </div>

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

          {confirmReset === null && (
            <>
              <Button variant="danger" onClick={() => setConfirmReset('demo')}>
                <RotateCcw size={14} /> Reset to demo data
              </Button>
              <Button variant="danger" onClick={() => setConfirmReset('empty')}>
                <Trash size={14} /> Clear all data (empty)
              </Button>
            </>
          )}

          {confirmReset === 'demo' && (
            <div className="rounded-xl bg-bad/10 border border-bad/20 p-3.5">
              <p className="text-xs text-bad mb-3">This will erase all your changes and restore the demo data. This can't be undone.</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => { resetAll(); setConfirmReset(null) }}>
                  Confirm reset
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {confirmReset === 'empty' && (
            <div className="rounded-xl bg-bad/10 border border-bad/20 p-3.5">
              <p className="text-xs text-bad mb-3">This wipes every fuel entry, trip, mod, document and photo. Your vehicle profile stays. This can't be undone.</p>
              <div className="flex gap-2">
                <Button variant="danger" size="sm" onClick={() => { resetEmpty(); setConfirmReset(null) }}>
                  Confirm clear
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmReset(null)}>
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
      <GooeyToggle checked={checked} onChange={onChange} />
    </div>
  )
}
