import { useState } from 'react'
import { Gauge, Mail } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { sendMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    setError(null)
    const { error } = await sendMagicLink(email)
    setLoading(false)
    if (error) setError(error)
    else setSent(true)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 px-4">
      <div className="w-full max-w-sm card-surface rounded-2xl shadow-card p-7">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="rounded-xl bg-accent/15 p-2">
            <Gauge size={20} className="text-accent-light" />
          </div>
          <div>
            <p className="text-[13px] font-bold tracking-tight text-gray-50 leading-none">DRIVN</p>
            <p className="text-[10px] text-gray-500 tracking-wide leading-none mt-1">MY CAR DASHBOARD</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <Mail size={28} className="text-accent-light mx-auto mb-3" />
            <p className="text-sm text-gray-200 font-medium mb-1">Check your email</p>
            <p className="text-xs text-gray-500">
              Tap the link we sent to <span className="text-gray-300">{email}</span> to sign in. Same link works on Mac and iPhone.
            </p>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-sm text-gray-400 mb-4">
              Sign in with your email to sync your car data across every device.
            </p>
            <input
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-base-800 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-gray-100 placeholder:text-gray-600 focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/40 mb-3"
            />
            {error && <p className="text-xs text-bad mb-3">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-xl px-4 py-2.5 shadow-glow transition-colors disabled:opacity-50"
            >
              {loading ? 'Sending link…' : 'Send magic link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
