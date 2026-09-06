import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Surface it in the console with a stack, so it's diagnosable from a phone too.
    console.error('Drivn crashed:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-base-950 px-6">
          <div className="max-w-md w-full card-surface rounded-2xl shadow-card p-6 text-center">
            <div className="rounded-2xl bg-bad/10 p-3 w-fit mx-auto mb-4">
              <AlertTriangle size={22} className="text-bad" />
            </div>
            <h1 className="text-sm font-semibold text-gray-100 mb-1">Something broke</h1>
            <p className="text-xs text-gray-500 mb-4 break-words">{this.state.error.message}</p>
            <button
              onClick={() => {
                sessionStorage.removeItem('drivn.vehicleChosen')
                window.location.href = '/'
              }}
              className="text-sm font-medium bg-accent hover:bg-accent-light text-white rounded-xl px-4 py-2.5 shadow-glow transition-colors"
            >
              Reload Drivn
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
