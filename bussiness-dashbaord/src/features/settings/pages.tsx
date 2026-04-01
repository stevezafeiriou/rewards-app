import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-provider'
import { invalidateBusinessContext } from '@/features/business/cache'
import { useBusiness, useProfile, useSubscriptionPlans } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/utils'

type NotificationPreferencesFormValues = {
  email_support_updates: boolean
  email_billing_updates: boolean
  email_product_updates: boolean
  in_app_support_updates: boolean
  in_app_billing_updates: boolean
  in_app_product_updates: boolean
}

const defaultNotificationPreferences: NotificationPreferencesFormValues = {
  email_support_updates: true,
  email_billing_updates: true,
  email_product_updates: false,
  in_app_support_updates: true,
  in_app_billing_updates: true,
  in_app_product_updates: true,
}

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
  const notificationForm = useForm<NotificationPreferencesFormValues>({
    defaultValues: defaultNotificationPreferences,
  })
  const notificationPreferences = useQuery({
    queryKey: queryKeys.notificationPreferences(user?.id),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<NotificationPreferencesFormValues> => {
      const { data, error } = await supabase
        .from('user_notification_preferences')
        .select('email_support_updates,email_billing_updates,email_product_updates,in_app_support_updates,in_app_billing_updates,in_app_product_updates')
        .eq('user_id', user!.id)
        .maybeSingle()

      if (error) throw error
      return data ?? defaultNotificationPreferences
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
  const notificationMutation = useMutation({
    mutationFn: async (values: NotificationPreferencesFormValues) => {
      if (!user) throw new Error(t('common.errors.authRequired'))
      const { error } = await supabase
        .from('user_notification_preferences')
        .upsert({ user_id: user.id, ...values }, { onConflict: 'user_id' })

      if (error) throw error
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.notificationPreferences(user?.id) })
    },
  })

  useEffect(() => {
    if (notificationPreferences.data) {
      notificationForm.reset(notificationPreferences.data)
    }
  }, [notificationForm, notificationPreferences.data])

  const notificationRows = [
    {
      key: 'support',
      title: t('settings.notifications.supportTitle'),
      description: t('settings.notifications.supportDescription'),
      emailField: 'email_support_updates' as const,
      inAppField: 'in_app_support_updates' as const,
    },
    {
      key: 'billing',
      title: t('settings.notifications.billingTitle'),
      description: t('settings.notifications.billingDescription'),
      emailField: 'email_billing_updates' as const,
      inAppField: 'in_app_billing_updates' as const,
    },
    {
      key: 'product',
      title: t('settings.notifications.productTitle'),
      description: t('settings.notifications.productDescription'),
      emailField: 'email_product_updates' as const,
      inAppField: 'in_app_product_updates' as const,
    },
  ]

  if (profile.isLoading || notificationPreferences.isLoading) return <PageSkeleton cards={2} rows={4} />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('settings.header.eyebrow')} title={t('settings.header.title')} description={t('settings.header.description')} />
      <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.owner.title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="grid gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
            >
              <FormField label={t('settings.owner.firstName')}>
                <Input placeholder={t('settings.owner.firstName')} {...form.register('first_name')} />
              </FormField>
              <FormField label={t('settings.owner.lastName')}>
                <Input placeholder={t('settings.owner.lastName')} {...form.register('last_name')} />
              </FormField>
              <div className="md:col-span-2">
                <FormField label={t('settings.owner.phone')}>
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

        <Card>
          <CardHeader>
            <CardTitle>{t('settings.notifications.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form
              className="space-y-4"
              onSubmit={notificationForm.handleSubmit((values) => notificationMutation.mutate(values))}
            >
              <div className="overflow-hidden rounded-[1.5rem] border border-border bg-surface-2/40">
                <div className="grid grid-cols-[minmax(0,1fr)_88px_88px] border-b border-border px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">
                  <span>{t('settings.notifications.title')}</span>
                  <span className="text-center">{t('settings.notifications.channelEmail')}</span>
                  <span className="text-center">{t('settings.notifications.channelInApp')}</span>
                </div>
                {notificationRows.map((row, index) => (
                  <div
                    key={row.key}
                    className={`grid grid-cols-[minmax(0,1fr)_88px_88px] items-center gap-3 px-4 py-4 ${
                      index !== notificationRows.length - 1 ? 'border-b border-border' : ''
                    }`}
                  >
                    <div className="pr-2">
                      <p className="text-sm font-semibold text-foreground">{row.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{row.description}</p>
                    </div>
                    <label className="flex justify-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        {...notificationForm.register(row.emailField)}
                      />
                    </label>
                    <label className="flex justify-center">
                      <input
                        type="checkbox"
                        className="size-4 rounded border-border text-primary focus:ring-primary"
                        {...notificationForm.register(row.inAppField)}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <Button
                type="submit"
                loading={notificationMutation.isPending}
                loadingText={t('settings.notifications.saving')}
                disabled={!notificationForm.formState.isDirty}
              >
                {t('settings.notifications.save')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
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
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-surface-2/45">
              <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] text-sm">
                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.status')}</div>
                <div className="border-b border-border px-4 py-3 text-right">
                  <Badge tone={business.data?.subscription_status === 'active' ? 'success' : 'warning'}>
                    {t(`common.status.${business.data?.subscription_status ?? 'inactive'}`)}
                  </Badge>
                </div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('settings.subscription.started')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">
                  {business.data?.subscription_started_at
                    ? formatDate(business.data.subscription_started_at, undefined, locale)
                    : t('settings.subscription.notStarted')}
                </div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('settings.subscription.ends')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">
                  {business.data?.subscription_ends_at
                    ? formatDate(business.data.subscription_ends_at, undefined, locale)
                    : t('settings.subscription.noEnd')}
                </div>

                <div className="px-4 py-3 font-semibold text-foreground">{t('settings.subscription.subscriptionId')}</div>
                <div className="px-4 py-3 text-right text-muted-foreground">
                  {business.data?.lemon_squeezy_subscription_id ?? t('settings.subscription.notLinked')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('settings.subscription.availablePlanTitle')}</CardTitle>
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
