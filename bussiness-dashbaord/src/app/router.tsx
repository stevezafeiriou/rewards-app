import { Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/app-shell'
import { RouteSkeleton } from '@/components/layout/page-skeleton'
import { ActiveSubscriptionGuard, BusinessGuard, BusinessOnboardingGuard } from '@/features/auth/guards'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { lazyRoute } from '@/lib/lazy'

const LandingPage = lazyRoute(() => import('@/features/auth/pages'), 'LandingPage')
const LoginPage = lazyRoute(() => import('@/features/auth/pages'), 'LoginPage')
const RegisterPage = lazyRoute(() => import('@/features/auth/pages'), 'RegisterPage')
const ForgotPasswordPage = lazyRoute(() => import('@/features/auth/pages'), 'ForgotPasswordPage')
const ResetPasswordPage = lazyRoute(() => import('@/features/auth/pages'), 'ResetPasswordPage')
const AuthCallbackPage = lazyRoute(() => import('@/features/auth/pages'), 'AuthCallbackPage')

const BusinessInfoStep = lazyRoute(() => import('@/features/onboarding/pages'), 'BusinessInfoStep')
const CategoryStep = lazyRoute(() => import('@/features/onboarding/pages'), 'CategoryStep')
const LocationStep = lazyRoute(() => import('@/features/onboarding/pages'), 'LocationStep')
const ContactStep = lazyRoute(() => import('@/features/onboarding/pages'), 'ContactStep')
const MediaStep = lazyRoute(() => import('@/features/onboarding/pages'), 'MediaStep')
const OperationsStep = lazyRoute(() => import('@/features/onboarding/pages'), 'OperationsStep')
const ReviewStep = lazyRoute(() => import('@/features/onboarding/pages'), 'ReviewStep')
const PaymentStep = lazyRoute(() => import('@/features/onboarding/pages'), 'PaymentStep')
const OnboardingCompletePage = lazyRoute(() => import('@/features/onboarding/pages'), 'OnboardingCompletePage')

const DashboardPage = lazyRoute(() => import('@/features/dashboard/pages'), 'DashboardPage')

const OffersListPage = lazyRoute(() => import('@/features/offers/pages'), 'OffersListPage')
const CreateOfferPage = lazyRoute(() => import('@/features/offers/pages'), 'CreateOfferPage')
const OfferDetailPage = lazyRoute(() => import('@/features/offers/pages'), 'OfferDetailPage')
const EditOfferPage = lazyRoute(() => import('@/features/offers/pages'), 'EditOfferPage')

const CustomersPage = lazyRoute(() => import('@/features/customers/pages'), 'CustomersPage')
const IdentifyCustomerPage = lazyRoute(() => import('@/features/customers/pages'), 'IdentifyCustomerPage')
const CustomerFoundPage = lazyRoute(() => import('@/features/customers/pages'), 'CustomerFoundPage')
const RecordTransactionPage = lazyRoute(() => import('@/features/customers/pages'), 'RecordTransactionPage')
const TransactionHistoryPage = lazyRoute(() => import('@/features/customers/pages'), 'TransactionHistoryPage')

const BusinessProfilePage = lazyRoute(() => import('@/features/profile/pages'), 'BusinessProfilePage')
const EditBusinessProfilePage = lazyRoute(() => import('@/features/profile/pages'), 'EditBusinessProfilePage')
const BusinessPreviewPage = lazyRoute(() => import('@/features/profile/pages'), 'BusinessPreviewPage')

const SettingsPage = lazyRoute(() => import('@/features/settings/pages'), 'SettingsPage')
const SubscriptionPage = lazyRoute(() => import('@/features/settings/pages'), 'SubscriptionPage')

const SupportPage = lazyRoute(() => import('@/features/support/pages'), 'SupportPage')
const NewTicketPage = lazyRoute(() => import('@/features/support/pages'), 'NewTicketPage')
const TicketDetailPage = lazyRoute(() => import('@/features/support/pages'), 'TicketDetailPage')

function NotFoundPage() {
  const { t } = useAppTranslation('common')

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="app-card max-w-lg p-10 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('common.notFound.code')}</p>
        <h1 className="mt-3 text-3xl font-extrabold text-foreground">{t('common.notFound.title')}</h1>
        <p className="mt-3 text-sm text-muted-foreground">{t('common.notFound.description')}</p>
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/auth/register" element={<RegisterPage />} />
          <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route element={<BusinessGuard />}>
            <Route path="/onboarding/business-info" element={<BusinessInfoStep />} />
            <Route path="/onboarding/category" element={<CategoryStep />} />
            <Route path="/onboarding/location" element={<LocationStep />} />
            <Route path="/onboarding/contact" element={<ContactStep />} />
            <Route path="/onboarding/media" element={<MediaStep />} />
            <Route path="/onboarding/operations" element={<OperationsStep />} />
            <Route path="/onboarding/review" element={<ReviewStep />} />
            <Route path="/onboarding/payment" element={<PaymentStep />} />
            <Route path="/onboarding/complete" element={<OnboardingCompletePage />} />

            <Route element={<AppShell />}>
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/settings/subscription" element={<SubscriptionPage />} />
              <Route path="/support" element={<SupportPage />} />
              <Route path="/support/new" element={<NewTicketPage />} />
              <Route path="/support/tickets/:ticketId" element={<TicketDetailPage />} />

              <Route element={<BusinessOnboardingGuard />}>
                <Route path="/profile/preview" element={<BusinessPreviewPage />} />
                <Route element={<ActiveSubscriptionGuard />}>
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/offers" element={<OffersListPage />} />
                  <Route path="/offers/create" element={<CreateOfferPage />} />
                  <Route path="/offers/:offerId" element={<OfferDetailPage />} />
                  <Route path="/offers/:offerId/edit" element={<EditOfferPage />} />
                  <Route path="/customers" element={<CustomersPage />} />
                  <Route path="/customers/identify" element={<IdentifyCustomerPage />} />
                  <Route path="/customers/identify/:publicId" element={<CustomerFoundPage />} />
                  <Route path="/customers/record-transaction" element={<RecordTransactionPage />} />
                  <Route path="/customers/history" element={<TransactionHistoryPage />} />
                  <Route path="/profile" element={<BusinessProfilePage />} />
                  <Route path="/profile/edit" element={<EditBusinessProfilePage />} />
                </Route>
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<NotFoundPage />} />
          <Route path="/onboarding" element={<Navigate to="/onboarding/business-info" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
