import { QueryClientProvider } from '@tanstack/react-query'
import { ToastContainer } from 'react-toastify'
import { AppRouter } from '@/app/router'
import { AppErrorBoundary } from '@/components/layout/app-error-boundary'
import { AuthProvider } from '@/features/auth/auth-provider'
import { BusinessBootstrapProvider } from '@/features/business/business-provider'
import { ThemeProvider } from '@/features/theme/theme-provider'
import '@/i18n/config'
import { queryClient } from '@/lib/query-client'
import 'react-toastify/dist/ReactToastify.css'

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
        <ToastContainer
          position="top-right"
          autoClose={3200}
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnHover
          draggable
          theme="light"
        />
      </QueryClientProvider>
    </AppErrorBoundary>
  )
}

export default App
