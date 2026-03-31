import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-provider'
import { invalidateBusinessContext } from '@/features/business/cache'
import { useBusiness, useProfile, useSubscriptionPlans } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

export function SettingsPage() {
  const queryClient = useQueryClient()
  const profile = useProfile()
  const { user } = useAuth()
  const { t } = useAppTranslation(['settings', 'common'])
  const form = useForm({
    values: {
      first_name: profile.data?.first_name ?? '',
      last_name: profile.data?.last_name ?? '',
      phone: profile.data?.phone ?? '',
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: { first_name: string; last_name: string; phone: string }) => {
      if (!user) throw new Error(t('common.errors.authRequired'))
      const { error } = await supabase.from('profiles').update(values).eq('id', user.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
    },
  })

  if (profile.isLoading) return <PageSkeleton cards={1} rows={4} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('settings.header.eyebrow')} title={t('settings.header.title')} description={t('settings.header.description')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('settings.owner.title')}</CardTitle>
          <CardDescription>{t('settings.owner.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          >
            <FormField label={t('settings.owner.firstName')} helper={t('settings.owner.firstNameHelper')}>
              <Input placeholder={t('settings.owner.firstName')} {...form.register('first_name')} />
            </FormField>
            <FormField label={t('settings.owner.lastName')} helper={t('settings.owner.lastNameHelper')}>
              <Input placeholder={t('settings.owner.lastName')} {...form.register('last_name')} />
            </FormField>
            <div className="md:col-span-2">
              <FormField label={t('settings.owner.phone')} helper={t('settings.owner.phoneHelper')}>
                <Input placeholder={t('settings.owner.phone')} {...form.register('phone')} />
              </FormField>
            </div>
            <div className="md:col-span-2">
              <Button type="submit" loading={mutation.isPending} loadingText={t('settings.owner.saving')}>
                {t('settings.owner.save')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function SubscriptionPage() {
  const { t, locale } = useAppTranslation(['settings', 'common'])
  const business = useBusiness()
  const plans = useSubscriptionPlans()

  if (business.isLoading || plans.isLoading) return <PageSkeleton cards={2} rows={4} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('settings.header.eyebrow')} title={t('settings.header.subscriptionTitle')} description={t('settings.header.subscriptionDescription')} />
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.subscription.currentStatusTitle')}</CardTitle>
            <CardDescription>{t('settings.subscription.currentStatusDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <span className="font-semibold text-foreground">{t('common.fields.status')}:</span>
              <Badge tone={business.data?.subscription_status === 'active' ? 'success' : 'warning'}>
                {t(`common.status.${business.data?.subscription_status ?? 'inactive'}`)}
              </Badge>
            </p>
            <p><span className="font-semibold text-foreground">{t('settings.subscription.started')}:</span> {business.data?.subscription_started_at ? formatDate(business.data.subscription_started_at, undefined, locale) : t('settings.subscription.notStarted')}</p>
            <p><span className="font-semibold text-foreground">{t('settings.subscription.ends')}:</span> {business.data?.subscription_ends_at ? formatDate(business.data.subscription_ends_at, undefined, locale) : t('settings.subscription.noEnd')}</p>
            <p><span className="font-semibold text-foreground">{t('settings.subscription.subscriptionId')}:</span> {business.data?.lemon_squeezy_subscription_id ?? t('settings.subscription.notLinked')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.subscription.availablePlanTitle')}</CardTitle>
            <CardDescription>{t('settings.subscription.availablePlanDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {plans.data?.map((plan) => (
              <div key={plan.id} className="rounded-[1.5rem] bg-surface-2 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-foreground">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t('settings.subscription.monthly', { price: formatCurrency(plan.price_monthly_cents / 100, locale) })} {t('settings.subscription.setupFee', { fee: formatCurrency(plan.setup_fee_cents / 100, locale) })}
                    </p>
                  </div>
                  <Badge tone="primary">{t(`common.status.${plan.plan_type}`)}</Badge>
                </div>
              </div>
            ))}
            <div className="rounded-[1.4rem] bg-surface-2 p-4 text-sm text-muted-foreground">
              {t('settings.subscription.portalNote')}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
