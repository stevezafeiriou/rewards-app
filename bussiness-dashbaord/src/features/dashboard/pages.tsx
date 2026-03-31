import { Link, useNavigate } from 'react-router-dom'
import { HiOutlineArrowTrendingUp, HiOutlineBanknotes, HiOutlineGiftTop, HiOutlineTag, HiOutlineUsers, HiOutlineChevronRight } from 'react-icons/hi2'
import charsImage from '@/assets/chars.jpg'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { LazyImage } from '@/components/ui/lazy-image'
import { useBusiness, useBusinessDashboardStats, useOffers, useTransactions } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { formatCurrency, formatDate } from '@/lib/utils'
import { RevealOnView } from '@/components/ui/motion'

function SectionError({ message }: { message: string }) {
  return <p className="text-sm font-medium text-danger-text">{message}</p>
}

function StatCard({
  title,
  value,
  description,
  icon,
}: {
  title: string
  value: string
  description: string
  icon: React.ReactNode
}) {
  return (
    <Card className="h-full overflow-hidden">
      <CardContent className="flex h-full items-start justify-between gap-5 p-5 sm:p-6">
        <div className="min-w-0 space-y-2">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{title}</p>
            <p className="text-[2rem] font-extrabold leading-none text-foreground">{value}</p>
            <p className="max-w-[18rem] text-[13px] leading-5 text-muted-foreground">{description}</p>
        </div>
        <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] bg-primary-weak text-primary">
            {icon}
        </div>
      </CardContent>
    </Card>
  )
}

function SectionShell({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <RevealOnView className="section-surface overflow-hidden p-5 sm:p-6">
      <div className="space-y-1.5">
        <h2 className="text-[1.1rem] font-bold text-foreground">{title}</h2>
        <p className="text-[13px] leading-5.5 text-muted-foreground">{description}</p>
      </div>
      <div className="mt-5">{children}</div>
    </RevealOnView>
  )
}

export function DashboardPage() {
  const navigate = useNavigate()
  const { t, locale } = useAppTranslation(['dashboard', 'common'])
  const business = useBusiness()
  const stats = useBusinessDashboardStats(business.data?.id)
  const offers = useOffers(business.data?.id)
  const transactions = useTransactions(business.data?.id, 10)

  if (business.isLoading) return <PageSkeleton cards={4} rows={3} />

  if (!business.data) {
    return (
      <EmptyState
        title={t('dashboard.emptyBusiness.title')}
        description={t('dashboard.emptyBusiness.description')}
        actionLabel={t('dashboard.emptyBusiness.action')}
        onAction={() => {
          navigate('/onboarding/business-info')
        }}
      />
    )
  }

  const currentStats = stats.data
  const activeOffers = offers.data?.filter((offer) => offer.status === 'active') ?? []
  const recentTransactions = transactions.data ?? []

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t('dashboard.header.eyebrow')}
        title={business.data.name}
        description={t('dashboard.header.description')}
        actions={
          <>
            <Link to="/customers/record-transaction"><Button variant="outline">{t('dashboard.header.recordTransaction')}</Button></Link>
            <Link to="/offers/create"><Button>{t('dashboard.header.createOffer')}</Button></Link>
          </>
        }
      />

      {business.data.subscription_status === 'past_due' || business.data.subscription_status === 'cancelled' ? (
        <Card className="border-warning-border bg-warning-bg">
          <CardContent className="flex items-center justify-between gap-4 p-6">
            <div>
              <p className="text-lg font-bold text-warning-text">{t('dashboard.subscriptionAlert.title')}</p>
              <p className="text-sm text-warning-text/80">{t('dashboard.subscriptionAlert.description')}</p>
            </div>
            <Link to="/settings/subscription"><Button variant="outline">{t('dashboard.subscriptionAlert.action')}</Button></Link>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,0.86fr)]">
        <StatCard
          title={t('dashboard.stats.transactions')}
          value={stats.isError ? '—' : String(currentStats?.total_transactions ?? 0)}
          description={stats.isError ? t('dashboard.errors.stats') : t('dashboard.stats.today', { count: currentStats?.transactions_today ?? 0 })}
          icon={<HiOutlineArrowTrendingUp className="h-6 w-6" />}
        />
        <StatCard
          title={t('dashboard.stats.customers')}
          value={stats.isError ? '—' : String(currentStats?.unique_customers ?? 0)}
          description={stats.isError ? t('dashboard.errors.stats') : t('dashboard.stats.monthTransactions', { count: currentStats?.transactions_this_month ?? 0 })}
          icon={<HiOutlineUsers className="h-6 w-6" />}
        />
        <StatCard
          title={t('dashboard.stats.rewardsIssued')}
          value={stats.isError ? '—' : String(currentStats?.total_rewards_given ?? 0)}
          description={stats.isError ? t('dashboard.errors.stats') : t('dashboard.stats.activeOffers', { count: currentStats?.active_offers ?? 0 })}
          icon={<HiOutlineGiftTop className="h-6 w-6" />}
        />
        <LazyImage
          alt={business.data.name}
          className="h-full w-full object-cover"
          height={1080}
          skeletonClassName="rounded-[1.5rem]"
          src={charsImage}
          width={1920}
          wrapperClassName="h-full min-h-[148px] w-full rounded-[1.5rem]"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <SectionShell title={t('dashboard.transactions.title')} description={t('dashboard.transactions.description')}>
            {transactions.isLoading ? (
              <PageSkeleton cards={1} rows={3} />
            ) : transactions.isError ? (
              <SectionError message={t('dashboard.errors.transactions')} />
            ) : recentTransactions.length === 0 ? (
              <EmptyState
                compact
                icon={<HiOutlineBanknotes className="h-5 w-5" />}
                title={t('dashboard.transactions.emptyTitle')}
                description={t('dashboard.transactions.emptyDescription')}
                className="section-inner"
              />
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="section-inner flex flex-wrap items-center justify-between gap-4 p-4">
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">{formatCurrency(transaction.amount_spent, locale)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(transaction.created_at, undefined, locale)}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-foreground">{t('dashboard.transactions.points', { count: transaction.rewards_earned })}</p>
                      <p className="text-muted-foreground">{t(`common.status.${transaction.identification_method}`)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
        </SectionShell>

        <SectionShell title={t('dashboard.offers.title')} description={t('dashboard.offers.description')}>
            {offers.isLoading ? (
              <PageSkeleton cards={1} rows={2} />
            ) : offers.isError ? (
              <SectionError message={t('dashboard.errors.offers')} />
            ) : activeOffers.length === 0 ? (
              <EmptyState
                compact
                icon={<HiOutlineTag className="h-5 w-5" />}
                title={t('dashboard.offers.emptyTitle')}
                description={t('dashboard.offers.emptyDescription')}
                actionLabel={t('dashboard.offers.emptyAction')}
                onAction={() => { navigate('/offers/create') }}
                className="section-inner"
              />
            ) : (
              <div className="space-y-3">
                {activeOffers.slice(0, 5).map((offer) => (
                  <div key={offer.id} className="section-inner flex flex-wrap items-start justify-between gap-4 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <HiOutlineTag aria-hidden="true" className="h-4 w-4 shrink-0 text-primary" />
                        <p className="truncate font-semibold text-foreground">{offer.title}</p>
                      </div>
                      <p className="break-words text-sm leading-6 text-muted-foreground">{offer.description ?? t('dashboard.offers.noDescription')}</p>
                    </div>
                    <Link to={`/offers/${offer.id}`} className="inline-flex items-center gap-1 self-start text-sm font-semibold text-primary">{t('dashboard.offers.open')} <HiOutlineChevronRight className="h-4 w-4" /></Link>
                  </div>
                ))}
              </div>
            )}
        </SectionShell>
      </div>
    </div>
  )
}
