import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AppStatusPage } from '@/components/layout/app-status-page'
import { FullscreenPageSkeleton } from '@/components/layout/page-skeleton'
import { useAuth } from '@/features/auth/auth-provider'
import { useAppBootstrapState, useBusinessBootstrap } from '@/features/business/business-provider'
import { useAppTranslation } from '@/i18n/use-app-translation'

export function BusinessGuard() {
  const { loading, user } = useAuth()
  const location = useLocation()
  const { profileQuery } = useBusinessBootstrap()
  const bootstrap = useAppBootstrapState()
  const { t } = useAppTranslation('common')

  if (loading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (profileQuery.error) {
    return (
      <AppStatusPage
        code={t('common.system.error.code')}
        title={t('common.system.error.title')}
        description={t('common.system.error.description')}
        primaryAction={{ label: t('common.buttons.tryAgain'), onClick: () => window.location.reload() }}
      />
    )
  }

  if (!user) {
    return <Navigate to="/auth/login" replace state={{ redirectTo: location.pathname }} />
  }

  if (!bootstrap.profile) {
    return (
      <AppStatusPage
        code={t('common.system.error.code')}
        title={t('common.system.error.title')}
        description={t('common.errors.contextMissing')}
        primaryAction={{ label: t('common.buttons.tryAgain'), onClick: () => window.location.reload() }}
      />
    )
  }

  if (bootstrap.effectiveRole !== 'business' && bootstrap.effectiveRole !== 'admin') {
    return <Navigate to="/403" replace />
  }

  return <Outlet />
}

export function BusinessOnboardingGuard() {
  const { profileQuery, businessContextQuery } = useBusinessBootstrap()
  const bootstrap = useAppBootstrapState()
  const { t } = useAppTranslation('common')

  if (businessContextQuery.isLoading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (profileQuery.error || businessContextQuery.error) {
    return (
      <AppStatusPage
        code={t('common.system.error.code')}
        title={t('common.system.error.title')}
        description={t('common.system.error.description')}
        primaryAction={{ label: t('common.buttons.tryAgain'), onClick: () => window.location.reload() }}
      />
    )
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
  const { t } = useAppTranslation('common')

  if (businessContextQuery.isLoading || profileQuery.isLoading) {
    return <FullscreenPageSkeleton />
  }

  if (profileQuery.error || businessContextQuery.error) {
    return (
      <AppStatusPage
        code={t('common.system.error.code')}
        title={t('common.system.error.title')}
        description={t('common.system.error.description')}
        primaryAction={{ label: t('common.buttons.tryAgain'), onClick: () => window.location.reload() }}
      />
    )
  }

  if (bootstrap.canBypassBilling) {
    return <Outlet />
  }

  if (bootstrap.resolvedBusiness && bootstrap.resolvedBusiness.subscription_status !== 'active') {
    return <Navigate to="/settings/subscription" replace />
  }

  return <Outlet />
}
