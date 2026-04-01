import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AppStatusPage } from '@/components/layout/app-status-page'
import i18n from '@/i18n/config'

type Props = {
  children: ReactNode
}

type State = {
  hasError: boolean
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught an error', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <AppStatusPage
          code={i18n.t('common.system.error.code')}
          title={i18n.t('common.system.error.title')}
          description={i18n.t('common.system.error.description')}
          primaryAction={{
            label: i18n.t('common.buttons.tryAgain'),
            onClick: () => window.location.reload(),
          }}
        />
      )
    }

    return this.props.children
  }
}
