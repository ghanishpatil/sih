import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 bg-[rgb(var(--page-bg))] px-6 text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500" aria-hidden />
          <h1 className="font-display text-xl font-semibold text-ink-900">Something went wrong</h1>
          <p className="max-w-md text-sm text-ink-600">
            Please refresh the page. If this keeps happening, contact support with the time you saw this message.
          </p>
          <button
            type="button"
            className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-500"
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
