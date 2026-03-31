import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { FullscreenPageSkeleton } from '@/components/layout/page-skeleton'
import { useAuth } from '@/features/auth/auth-provider'
import { useAppBootstrapState, useBusinessBootstrap } from '@/features/business/business-provider'

export function BusinessGuard() {
  const { loading, user } = useAuth()
  const location = useLocation()
  const { profileQuery } = useBusinessBootstrap()
  const bootstrap = useAppBootstrapState()

  if (loading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ redirectTo: location.pathname }} />
  }

  if (!bootstrap.profile) {
    return <FullscreenPageSkeleton />
  }

  if (bootstrap.effectiveRole !== 'business' && bootstrap.effectiveRole !== 'admin') {
    return <Navigate to="/auth/login" replace />
  }

  return <Outlet />
}

export function BusinessOnboardingGuard() {
  const { profileQuery, businessContextQuery } = useBusinessBootstrap()
  const bootstrap = useAppBootstrapState()

  if (businessContextQuery.isLoading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (bootstrap.canBypassBilling) {
    return <Outlet />
  }

  if (!bootstrap.resolvedBusiness || !bootstrap.resolvedBusiness.onboarding_completed) {
    return <Navigate to="/onboarding/business-info" replace />
  }

  return <Outlet />
}

export function ActiveSubscriptionGuard() {
  const { profileQuery, businessContextQuery } = useBusinessBootstrap()
  const bootstrap = useAppBootstrapState()

  if (businessContextQuery.isLoading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (bootstrap.canBypassBilling) {
    return <Outlet />
  }

  if (bootstrap.resolvedBusiness && bootstrap.resolvedBusiness.subscription_status !== 'active') {
    return <Navigate to="/settings/subscription" replace />
  }

  return <Outlet />
}
