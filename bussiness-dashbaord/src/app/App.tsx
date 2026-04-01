import { QueryClientProvider } from '@tanstack/react-query'
import { AppRouter } from '@/app/router'
import { AppErrorBoundary } from '@/components/layout/app-error-boundary'
import { AuthProvider } from '@/features/auth/auth-provider'
import { BusinessBootstrapProvider } from '@/features/business/business-provider'
import { ThemeProvider } from '@/features/theme/theme-provider'
import '@/i18n/config'
import { queryClient } from '@/lib/query-client'

export function App() {
  return (
    <AppErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <BusinessBootstrapProvider>
              <AppRouter />
            </BusinessBootstrapProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}

export default App
