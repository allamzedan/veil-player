import { Component, type ErrorInfo, type ReactNode } from 'react'
import { clearDebugFlags } from '../lib/debugState'
import { t } from '../i18n'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidMount(): void {
    window.addEventListener('keydown', this.onKeyDown)
  }

  componentWillUnmount(): void {
    window.removeEventListener('keydown', this.onKeyDown)
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[VEIL] Uncaught render error:', error, info.componentStack)
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === 'd') {
      event.preventDefault()
      this.clearDebugAndReload()
    }
  }

  private reload = (): void => {
    window.location.reload()
  }

  private clearDebugAndReload = (): void => {
    clearDebugFlags()
    window.location.reload()
  }

  private openDevTools = (): void => {
    void window.veil?.openDevTools?.()
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="app-error-boundary" role="alert">
          <h1>{t('errorBoundary.title')}</h1>
          <p>{t('errorBoundary.body')}</p>
          <pre className="app-error-boundary__detail">
            {this.state.error.message}
            {this.state.error.stack ? `\n\n${this.state.error.stack}` : ''}
          </pre>
          <div className="app-error-boundary__actions">
            <button type="button" className="btn btn-secondary" onClick={this.clearDebugAndReload}>
              {t('errorBoundary.clearDebugFlags')}
            </button>
            {import.meta.env.DEV && window.veil?.openDevTools ? (
              <button type="button" className="btn btn-secondary" onClick={this.openDevTools}>
                {t('errorBoundary.openDevTools')}
              </button>
            ) : null}
            <button type="button" className="btn" onClick={this.reload}>
              {t('errorBoundary.reload')}
            </button>
          </div>
          <p className="app-error-boundary__hint">{t('errorBoundary.debugShortcutHint')}</p>
        </div>
      )
    }

    return this.props.children
  }
}
