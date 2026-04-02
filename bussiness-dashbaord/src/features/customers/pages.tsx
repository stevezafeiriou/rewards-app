import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { HiOutlineArrowRight, HiOutlineUserCircle } from 'react-icons/hi2'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { BarcodeScanner } from '@/components/ui/barcode-scanner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { invalidateBusinessOperations } from '@/features/business/cache'
import { useBusiness, useMemberLookup, useOffers, useRecordTransaction, useTransactions } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { createManualCustomerLookupSchema, createTransactionSchema } from '@/lib/schemas'
import { clearSessionValue, readSessionValue, writeSessionValue } from '@/lib/storage'
import { getToastErrorMessage, toastPromise } from '@/lib/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { MemberLookupResult } from '@/types/app'

const CURRENT_MEMBER_KEY = 'business-dashboard-current-member'
const TRANSACTION_DRAFT_KEY = 'business-dashboard-transaction-draft'

function clearCurrentCustomerFlow() {
  clearSessionValue(CURRENT_MEMBER_KEY)
  clearSessionValue(TRANSACTION_DRAFT_KEY)
}

function SelectedMemberStrip({
  member,
  title,
  description,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  tertiaryLabel,
  onTertiary,
}: {
  member: MemberLookupResult
  title: string
  description: string
  primaryLabel: string
  onPrimary: () => void
  secondaryLabel: string
  onSecondary: () => void
  tertiaryLabel: string
  onTertiary: () => void
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
          <p className="text-sm font-medium text-foreground">
            {member.first_name} {member.last_name}
            <span className="ml-2 text-muted-foreground">#{member.public_user_id}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={onPrimary}>{primaryLabel}</Button>
          <Button size="sm" variant="outline" onClick={onSecondary}>{secondaryLabel}</Button>
          <Button size="sm" variant="ghost" onClick={onTertiary}>{tertiaryLabel}</Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function CustomersPage() {
  const { t } = useAppTranslation('customers')
  const cards = [
    {
      to: '/customers/identify',
      title: t('customers.cards.identifyTitle'),
      description: t('customers.cards.identifyDescription'),
    },
    {
      to: '/customers/history',
      title: t('customers.cards.historyTitle'),
      description: t('customers.cards.historyDescription'),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('customers.header.eyebrow')} title={t('customers.header.title')} description={t('customers.header.description')} />
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => {
          return (
            <Link key={card.to} to={card.to} className="group block h-full">
              <Card className="h-full transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
                <CardHeader>
                  <CardTitle>{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function IdentifyCustomerPage() {
  const navigate = useNavigate()
  const lookup = useMemberLookup()
  const { t } = useAppTranslation(['customers', 'validation'])
  const selectedMember = readSessionValue<MemberLookupResult>(CURRENT_MEMBER_KEY)
  const form = useForm({
    resolver: zodResolver(createManualCustomerLookupSchema(t)),
    defaultValues: { publicId: '' },
  })

  function handleLookup(publicId: string) {
    lookup.mutate(publicId, {
      onSuccess: (data) => {
        writeSessionValue(CURRENT_MEMBER_KEY, data)
        navigate(`/customers/identify/${publicId}`)
      },
    })
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('customers.header.eyebrow')} title={t('customers.identify.title')} description={t('customers.identify.description')} />
      {selectedMember ? (
        <SelectedMemberStrip
          member={selectedMember}
          title={t('customers.identify.selectedTitle')}
          description={t('customers.identify.selectedDescription')}
          primaryLabel={t('customers.identify.continueSelected')}
          onPrimary={() => { navigate('/customers/record-transaction') }}
          secondaryLabel={t('customers.identify.changeMember')}
          onSecondary={() => {
            clearCurrentCustomerFlow()
            form.reset({ publicId: '' })
          }}
          tertiaryLabel={t('customers.identify.cancelSelection')}
          onTertiary={() => {
            clearCurrentCustomerFlow()
            navigate('/customers')
          }}
        />
      ) : null}
      {lookup.isError ? (
        <Card className="border-danger-border bg-danger-bg/40 shadow-none">
          <CardContent className="p-4 sm:p-5">
            <p className="text-sm font-medium text-danger-text">
              {lookup.error instanceof Error ? lookup.error.message : t('customers.identify.lookupError')}
            </p>
          </CardContent>
        </Card>
      ) : null}
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('customers.identify.scannerEyebrow')}</p>
            <CardTitle>{t('customers.identify.scannerCardTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-[1.5rem] bg-surface-2 px-4 py-4">
              <div className="grid gap-4 sm:grid-cols-3 sm:gap-5">
                {[1, 2, 3].map((step) => (
                  <div key={step} className="relative space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white shadow-[0_0_18px_color-mix(in_srgb,var(--primary)_40%,transparent)]">
                        {step}
                      </span>
                      <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{t(`customers.identify.steps.${step}.label`)}</p>
                    </div>
                    <p className="pl-11 text-sm leading-6 text-muted-foreground">{t(`customers.identify.steps.${step}.description`)}</p>
                  </div>
                ))}
              </div>
            </div>
            <BarcodeScanner
              disabled={lookup.isPending}
              onDetected={handleLookup}
              title={t('customers.identify.scannerTitle')}
              description={t('customers.identify.scannerDescription')}
              helper={t('customers.identify.scannerHelper')}
              idleLabel={t('customers.identify.scannerIdle')}
              startLabel={t('customers.identify.startScanner')}
              startingLabel={t('customers.identify.startingScanner')}
              stopLabel={t('customers.identify.stopScanner')}
              activeLabel={t('customers.identify.scannerActive')}
              unsupportedLabel={t('customers.identify.scannerUnsupported')}
              errorPrefix={t('customers.identify.scannerErrorPrefix')}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('customers.identify.manualEyebrow')}</p>
            <CardTitle>{t('customers.identify.manualTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) => handleLookup(values.publicId))}
            >
              <FormField label={t('customers.identify.manualTitle')} error={form.formState.errors.publicId?.message}>
                <Input placeholder={t('customers.identify.placeholder')} maxLength={9} {...form.register('publicId')} error={form.formState.errors.publicId?.message} />
              </FormField>
              <Button
                type="submit"
                loading={lookup.isPending}
                loadingText={t('customers.identify.submitting')}
                rightIcon={<HiOutlineArrowRight className="h-4 w-4" />}
              >
                {t('customers.identify.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function CustomerFoundPage() {
  const navigate = useNavigate()
  const { publicId } = useParams()
  const { t } = useAppTranslation(['customers', 'common'])
  const lookup = useMemberLookup()
  const cached = readSessionValue<MemberLookupResult>(CURRENT_MEMBER_KEY)
  const member = lookup.data ?? (cached?.public_user_id === publicId ? cached : null)

  useEffect(() => {
    if (!publicId || member) return
    lookup.mutate(publicId, {
      onSuccess: (data) => {
        writeSessionValue(CURRENT_MEMBER_KEY, data)
      },
    })
  }, [lookup, member, publicId])

  if (!publicId) return <Navigate to="/customers/identify" replace />
  if (lookup.isPending && !member) return <PageSkeleton cards={1} rows={3} />
  if (!member) return <Navigate to="/customers/identify" replace />

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('customers.header.eyebrow')} title={t('customers.member.title')} description={t('customers.member.description')} />
      <Card>
        <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-weak text-primary">
              <HiOutlineUserCircle className="h-8 w-8" />
            </div>
            <div className="space-y-1">
              <p className="text-xl font-bold text-foreground">{member.first_name} {member.last_name}</p>
              <p className="text-sm text-muted-foreground">{t('customers.member.memberCode', { code: member.public_user_id })}</p>
              <div className="flex gap-2">
                <Badge tone={member.subscription_tier === 'end_user_free' ? 'neutral' : 'primary'}>{t(`common.status.${member.subscription_tier}`)}</Badge>
                <Badge tone={member.is_active ? 'success' : 'danger'}>{t(`common.status.${member.is_active ? 'active' : 'inactive'}`)}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('customers.member.redemptionsRemaining', { count: member.remaining_monthly_redemptions })}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 md:justify-end">
            <Button
              onClick={() => {
                writeSessionValue(CURRENT_MEMBER_KEY, member)
                navigate('/customers/record-transaction')
              }}
            >
              {t('customers.member.recordTransaction')}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearCurrentCustomerFlow()
                navigate('/customers/identify')
              }}
            >
              {t('customers.member.chooseAnother')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                clearCurrentCustomerFlow()
                navigate('/customers')
              }}
            >
              {t('customers.member.cancel')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function RecordTransactionPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useAppTranslation(['customers', 'validation', 'common'])
  const { data: business } = useBusiness()
  const offers = useOffers(business?.id)
  const member = readSessionValue<MemberLookupResult>(CURRENT_MEMBER_KEY)
  const transactionDraft = readSessionValue<{ amount_spent?: number; offer_id?: string; notes?: string }>(TRANSACTION_DRAFT_KEY)
  const recordTransaction = useRecordTransaction()
  const form = useForm({
    resolver: zodResolver(createTransactionSchema(t)),
    values: {
      amount_spent: transactionDraft?.amount_spent ?? 0,
      offer_id: transactionDraft?.offer_id ?? '',
      notes: transactionDraft?.notes ?? '',
    },
  })

  if (!member) {
    return <Navigate to="/customers/identify" replace />
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('customers.header.eyebrow')} title={t('customers.transaction.title')} description={t('customers.transaction.description')} />
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.transaction.currentMemberTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xl font-bold text-foreground">{member.first_name} {member.last_name}</p>
            <p className="text-sm text-muted-foreground">{t('customers.member.memberCode', { code: member.public_user_id })}</p>
            <div className="flex gap-2">
              <Badge tone={member.subscription_tier === 'end_user_free' ? 'neutral' : 'primary'}>{t(`common.status.${member.subscription_tier}`)}</Badge>
              <Badge tone={member.is_active ? 'success' : 'danger'}>{t(`common.status.${member.is_active ? 'active' : 'inactive'}`)}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('customers.member.redemptionsRemaining', { count: member.remaining_monthly_redemptions })}
            </p>
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  clearCurrentCustomerFlow()
                  navigate('/customers/identify')
                }}
              >
                {t('customers.transaction.changeMember')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  clearCurrentCustomerFlow()
                  navigate('/customers')
                }}
              >
                {t('customers.transaction.cancel')}
              </Button>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t('customers.transaction.detailsTitle')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              className="space-y-4"
              onSubmit={form.handleSubmit((values) =>
                toastPromise(
                  recordTransaction.mutateAsync(
                    {
                      businessId: business!.id,
                      publicUserId: member.public_user_id,
                      amountSpent: values.amount_spent,
                      offerId: values.offer_id || undefined,
                      notes: values.notes || undefined,
                    },
                    {
                      onSuccess: async () => {
                        writeSessionValue(TRANSACTION_DRAFT_KEY, values)
                        await invalidateBusinessOperations(queryClient, business?.id)
                        navigate('/customers/history')
                      },
                    },
                  ),
                  {
                    loading: t('customers.transaction.toast.loading'),
                    success: t('customers.transaction.toast.success'),
                    error: (error: unknown) => getToastErrorMessage(error, t('customers.transaction.toast.error')),
                  },
                ),
              )}
            >
              <FormField label={t('common.fields.amount')} error={form.formState.errors.amount_spent?.message}>
                <Input type="number" step="0.01" placeholder={t('customers.transaction.amountPlaceholder')} {...form.register('amount_spent')} error={form.formState.errors.amount_spent?.message} />
              </FormField>
              <FormField label={t('common.fields.category')} error={form.formState.errors.offer_id?.message}>
                <Select {...form.register('offer_id')} error={form.formState.errors.offer_id?.message}>
                  <option value="">{t('customers.transaction.noOffer')}</option>
                  {offers.data?.filter((offer) => offer.status === 'active').map((offer) => (
                    <option key={offer.id} value={offer.id}>{offer.title}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label={t('common.fields.notes')} error={form.formState.errors.notes?.message}>
                <Textarea placeholder={t('customers.transaction.notesPlaceholder')} {...form.register('notes')} error={form.formState.errors.notes?.message} />
              </FormField>
              <Button
                type="submit"
                disabled={!business}
                loading={recordTransaction.isPending}
                loadingText={t('customers.transaction.submitting')}
              >
                {t('customers.transaction.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function TransactionHistoryPage() {
  const { t, locale } = useAppTranslation('customers')
  const { data: business } = useBusiness()
  const transactions = useTransactions(business?.id)

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('customers.header.eyebrow')} title={t('customers.history.title')} description={t('customers.history.description')} />
      {transactions.isLoading ? (
        <PageSkeleton cards={2} rows={4} />
      ) : transactions.data && transactions.data.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-6">
            {transactions.data.map((transaction) => (
              <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-4 rounded-[1.4rem] bg-surface-2 p-4">
                <div>
                  <p className="font-semibold text-foreground">{formatCurrency(transaction.amount_spent, locale)}</p>
                  <p className="text-xs text-muted-foreground">{t('customers.history.userLabel', { id: transaction.user_id })}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold text-foreground">{t('customers.history.points', { count: transaction.rewards_earned })}</p>
                  <p className="text-muted-foreground">{formatDate(transaction.created_at, undefined, locale)}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : (
        <EmptyState title={t('customers.history.emptyTitle')} description={t('customers.history.emptyDescription')} />
      )}
    </div>
  )
}
