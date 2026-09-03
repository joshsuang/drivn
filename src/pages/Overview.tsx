import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Gauge,
  Fuel,
  Wallet,
  TrendingUp,
  Route as RouteIcon,
  CalendarDays,
  Wrench,
  ShieldCheck,
  FileCheck2,
  Landmark,
  ChevronRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from 'recharts'
import { useCarData } from '@/context/DataContext'
import { Header } from '@/components/layout/Header'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { ChartCard } from '@/components/ui/ChartCard'
import { Dropdown } from '@/components/ui/Dropdown'
import { TimelineItem } from '@/components/TimelineItem'
import { ModificationCard } from '@/components/ModificationCard'
import { RouteMap } from '@/components/RouteMap'
import { formatKm, formatCurrency, formatNumber, formatDuration, daysBetween } from '@/lib/format'

export default function Overview() {
  const { data } = useCarData()
  const { vehicle, mileageByMonth, consumptionByMonth, timeline, trips, modifications, maintenance, documents } = data
  const [mileageRange, setMileageRange] = useState('This year')
  const [fuelRange, setFuelRange] = useState('Last 6 months')

  const totalMileageThisYear = useMemo(
    () => mileageByMonth.reduce((sum, m) => sum + m.value, 0),
    [mileageByMonth]
  )

  const monthMileage = mileageByMonth[mileageByMonth.length - 1]?.value ?? 0

  const avgConsumption = useMemo(() => {
    const withData = consumptionByMonth.filter((c) => c.value > 0)
    if (!withData.length) return 0
    return withData.reduce((s, c) => s + c.value, 0) / withData.length
  }, [consumptionByMonth])

  const totalFuelCost = useMemo(
    () => data.fuelEntries.reduce((s, f) => s + f.totalCost, 0),
    [data.fuelEntries]
  )

  const costPerKm = totalMileageThisYear > 0 ? totalFuelCost / totalMileageThisYear : 0
  const daysOwned = daysBetween(vehicle.purchaseDate)
  const latestTrip = trips[0]
  const nextMaintenance = maintenance[0]
  const inspectionDoc = documents.find((d) => d.category === 'Maintenance' && d.expirationDate)

  return (
    <div className="fade-in">
      <Header title={`Welcome back, ${vehicle.owner} \uD83D\uDC4B`} subtitle="Here\u2019s your car overview" showWeather />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-4 mb-4">
        {/* Vehicle card */}
        <Card className="relative overflow-hidden">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-2xl font-bold text-gray-50 tracking-tight">
                {vehicle.make} {vehicle.model}
              </h2>
              <p className="text-sm text-gray-400 mt-1">{vehicle.engine}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {vehicle.trim} | {vehicle.year}
              </p>
            </div>
            <Link
              to="/settings"
              className="flex items-center gap-1 text-xs font-medium text-gray-300 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full px-3.5 py-1.5 transition-colors shrink-0"
            >
              View profile
              <ChevronRight size={13} />
            </Link>
          </div>

          <div className="relative -mx-2 -my-1 md:h-52 h-44">
            <img
              src={vehicle.imageUrl}
              alt={`${vehicle.make} ${vehicle.model}`}
              className="w-full h-full object-cover rounded-xl opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-base-850 via-transparent to-transparent rounded-xl" />
          </div>

          <div className="flex flex-wrap gap-2 mt-3">
            {[vehicle.power, vehicle.transmission, vehicle.drive, 'mHEV', vehicle.trim].map((tag, i) => (
              <span
                key={i}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border ${
                  i === 4
                    ? 'bg-accent/20 border-accent/30 text-accent-light'
                    : 'bg-white/5 border-white/10 text-gray-300'
                }`}
              >
                {tag}
              </span>
            ))}
          </div>
        </Card>

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            icon={Gauge}
            iconColor="text-warn"
            iconBg="bg-warn/10"
            label="Total mileage"
            value={formatKm(vehicle.currentMileage)}
            sublabel={`+${formatKm(monthMileage)} this month`}
            trend="up"
          />
          <StatCard
            icon={Fuel}
            label="Avg. consumption"
            value={`${formatNumber(avgConsumption, 1)} L/100km`}
            sublabel="Last 30 days"
          />
          <StatCard
            icon={Wallet}
            iconColor="text-bad"
            iconBg="bg-bad/10"
            label="Total fuel cost"
            value={formatCurrency(totalFuelCost)}
            sublabel="This year"
          />
          <StatCard
            icon={TrendingUp}
            iconColor="text-good"
            iconBg="bg-good/10"
            label="Cost per km"
            value={formatCurrency(costPerKm)}
            sublabel="This year"
          />
          <StatCard
            icon={RouteIcon}
            label="Trips"
            value={String(trips.length)}
            sublabel="All time"
          />
          <StatCard
            icon={CalendarDays}
            iconColor="text-purple"
            iconBg="bg-purple/10"
            label="Days owned"
            value={String(daysOwned)}
            sublabel={`Since ${new Date(vehicle.purchaseDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_360px] gap-4 mb-4">
        <ChartCard
          title="Mileage Overview"
          headerRight={<Dropdown options={['This year', 'Last year', 'All time']} value={mileageRange} onChange={setMileageRange} />}
          value={formatKm(totalMileageThisYear).replace(' km', '')}
          valueUnit="km"
          sublabel="Total this year"
          trend="\u2191 12% vs last year"
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mileageByMonth} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#15171d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v: number) => [formatKm(v), 'Mileage']}
                />
                <Line type="monotone" dataKey="value" stroke="#5b6cff" strokeWidth={2.5} dot={{ r: 3, fill: '#5b6cff' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Fuel Efficiency"
          headerRight={<Dropdown options={['Last 6 months', 'This year', 'All time']} value={fuelRange} onChange={setFuelRange} />}
          value={formatNumber(avgConsumption, 1)}
          valueUnit="L/100km"
          sublabel="Average"
          trend="\u2193 0.3 vs previous 6 months"
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={consumptionByMonth} margin={{ left: -20, right: 8 }}>
                <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#15171d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: '#9ca3af' }}
                  formatter={(v: number) => [`${formatNumber(v, 1)} L/100km`, 'Consumption']}
                />
                <Bar dataKey="value" fill="#5b6cff" radius={[6, 6, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-medium text-gray-300">Upcoming</h3>
          </div>
          <div className="flex flex-col gap-3.5">
            <UpcomingRow icon={Wrench} tone="warn" title="Maintenance" sub={nextMaintenance?.type ?? 'Oil change'} value={`in ${formatKm((nextMaintenance?.nextIntervalKm ?? 20790) - vehicle.currentMileage)}`} />
            <UpcomingRow icon={FileCheck2} tone="accent" title="Inspection" sub="Due date" value={inspectionDoc?.expirationDate ? new Date(inspectionDoc.expirationDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '12 Nov 2026'} />
            <UpcomingRow icon={ShieldCheck} tone="good" title="Insurance" sub="Renewal" value="28 Feb 2027" />
            <UpcomingRow icon={Landmark} tone="neutral" title="Road tax" sub="Next payment" value="01 Jan 2027" />
          </div>
          <Link
            to="/maintenance"
            className="block text-center text-xs font-medium text-accent-light hover:text-accent-light/80 mt-4 py-2 rounded-xl bg-white/[0.03] hover:bg-white/5 transition-colors"
          >
            View all
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr_360px] gap-4 mb-4">
        <div className="lg:col-span-2">
          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[13px] font-medium text-gray-300">Recent Timeline</h3>
              <Link to="/timeline" className="text-xs font-medium text-accent-light hover:text-accent-light/80">
                View full timeline
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              {timeline.slice(0, 4).map((event, i) => (
                <TimelineItem key={event.id} event={event} isLast={i === Math.min(3, timeline.length - 1)} />
              ))}
            </div>
          </Card>
        </div>

        {latestTrip && (
          <Card padded={false} className="overflow-hidden">
            <div className="p-5 pb-3">
              <h3 className="text-[13px] font-medium text-gray-300">Latest Trip</h3>
            </div>
            <RouteMap start={latestTrip.start} destination={latestTrip.destination} route={latestTrip.route} className="h-36 mx-5 w-[calc(100%-2.5rem)]" />
            <div className="p-5 pt-4">
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <MiniStat label="Distance" value={`${latestTrip.distanceKm} km`} />
                <MiniStat label="Duration" value={formatDuration(latestTrip.durationMinutes)} />
                <MiniStat label="Consumption" value={`${formatNumber(latestTrip.consumption, 1)}L`} />
                <MiniStat label="Fuel cost" value={formatCurrency(latestTrip.fuelCost)} />
              </div>
              <Link
                to="/trips"
                className="block text-center text-xs font-medium text-accent-light hover:text-accent-light/80 py-2 rounded-xl bg-white/[0.03] hover:bg-white/5 transition-colors"
              >
                View all trips
              </Link>
            </div>
          </Card>
        )}
      </div>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[13px] font-medium text-gray-300">Modifications</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
          {modifications.slice(0, 4).map((mod) => (
            <ModificationCard key={mod.id} mod={mod} />
          ))}
        </div>
        <Link to="/modifications" className="text-xs font-medium text-accent-light hover:text-accent-light/80">
          View all modifications
        </Link>
      </Card>
    </div>
  )
}

function UpcomingRow({
  icon: Icon,
  tone,
  title,
  sub,
  value,
}: {
  icon: typeof Wrench
  tone: 'warn' | 'accent' | 'good' | 'neutral'
  title: string
  sub: string
  value: string
}) {
  const tones = {
    warn: 'bg-warn/15 text-warn',
    accent: 'bg-accent/15 text-accent-light',
    good: 'bg-good/15 text-good',
    neutral: 'bg-white/10 text-gray-300',
  }
  return (
    <div className="flex items-center gap-3">
      <div className={`rounded-xl p-2 shrink-0 ${tones[tone]}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-100">{title}</p>
        <p className="text-xs text-gray-500">{sub}</p>
      </div>
      <span className="text-xs text-gray-400 shrink-0">{value}</span>
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-gray-100">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  )
}
