'use client'

import { Component, type ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6 text-center">
          <p className="text-red-400 text-sm font-mono mb-4">
            {this.state.error.message}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-violet-600 text-white px-6 py-3 rounded-xl text-sm font-semibold"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
