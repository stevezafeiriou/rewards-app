import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppStatusPage } from '@/components/layout/app-status-page'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { LazyImage } from '@/components/ui/lazy-image'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { invalidateBusinessOperations } from '@/features/business/cache'
import { useBusiness, useOffer, useOffers } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { queryKeys } from '@/lib/query-keys'
import { createOfferSchema } from '@/lib/schemas'
import { supabase } from '@/lib/supabase'
import { getToastErrorMessage, toastPromise } from '@/lib/toast'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Offer, OfferStatus, OfferType } from '@/types/app'

const OFFER_MEDIA_BUCKET = 'offer-media'

function toDatetimeLocal(value?: string | null) {
  if (!value) return new Date().toISOString().slice(0, 16)
  return new Date(value).toISOString().slice(0, 16)
}

async function uploadOfferImage(businessId: string, file: File) {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/offer-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from(OFFER_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error
  return supabase.storage.from(OFFER_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

function OfferForm({
  mode,
  offer,
}: {
  mode: 'create' | 'edit'
  offer?: Offer | null
}) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t: offersT } = useAppTranslation('offers')
  const { t: validationT } = useAppTranslation('validation')
  const { t: commonT } = useAppTranslation('common')
  const { data: business } = useBusiness()
  const [imageFile, setImageFile] = useState<File | null>(null)
  const form = useForm({
    resolver: zodResolver(createOfferSchema(validationT)),
    values: {
      title: offer?.title ?? '',
      description: offer?.description ?? '',
      terms_conditions: offer?.terms_conditions ?? '',
      offer_type: (offer?.offer_type ?? 'percentage_discount') as OfferType,
      discount_value: offer?.discount_value ?? 0,
      starts_at: toDatetimeLocal(offer?.starts_at),
      expires_at: offer?.expires_at ? toDatetimeLocal(offer.expires_at) : '',
      max_redemptions: offer?.max_redemptions ?? undefined,
      min_purchase_amount: offer?.min_purchase_amount ?? undefined,
      requires_paid_membership: offer?.requires_paid_membership ?? false,
      status: (offer?.status === 'draft' || offer?.status === 'active' ? offer.status : 'draft') as 'draft' | 'active',
    },
  })
  const offerType = useWatch({ control: form.control, name: 'offer_type' })
  const usesNumericDiscount = offerType === 'percentage_discount' || offerType === 'fixed_discount'
  const discountHelper = offerType === 'percentage_discount'
    ? offersT('form.discountValueHelperPercentage')
    : offerType === 'fixed_discount'
      ? offersT('form.discountValueHelperFixed')
      : offersT('form.discountValueHelperDisabled')
  const discountPlaceholder = offerType === 'percentage_discount'
    ? offersT('form.discountValuePlaceholderPercentage')
    : offerType === 'fixed_discount'
      ? offersT('form.discountValuePlaceholderFixed')
      : offersT('form.discountValuePlaceholderDisabled')

  const mutation = useMutation({
    mutationFn: async (values: {
      title: string
      description: string
      terms_conditions?: string
      offer_type: OfferType
      discount_value?: number
      starts_at: string
      expires_at?: string
      max_redemptions?: number
      min_purchase_amount?: number
      requires_paid_membership: boolean
      status: 'draft' | 'active'
    }) => {
      if (!business) throw new Error(commonT('errors.businessRequired'))

      let imageUrl = offer?.image_url ?? null
      if (imageFile) {
        imageUrl = await uploadOfferImage(business.id, imageFile)
      }

      const payload = {
        business_id: business.id,
        title: values.title,
        description: values.description,
        terms_conditions: values.terms_conditions || null,
        offer_type: values.offer_type,
        discount_value: values.discount_value ?? null,
        starts_at: new Date(values.starts_at).toISOString(),
        expires_at: values.expires_at ? new Date(values.expires_at).toISOString() : null,
        max_redemptions: values.max_redemptions ?? null,
        min_purchase_amount: values.min_purchase_amount ?? null,
        requires_paid_membership: values.requires_paid_membership ?? false,
        image_url: imageUrl,
        status: values.status as OfferStatus,
      }

      if (mode === 'create') {
        const { data, error } = await supabase.from('offers').insert(payload).select('id').single()
        if (error) throw error
        return data.id
      }

      const { error } = await supabase.from('offers').update(payload).eq('id', offer!.id)
      if (error) throw error
      return offer!.id
    },
    onSuccess: async (offerId) => {
      await invalidateBusinessOperations(queryClient, business?.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.offer(offerId) })
      navigate(`/offers/${offerId}`)
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === 'create' ? offersT('form.createTitle') : offersT('form.editTitle')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-4 lg:grid-cols-2"
          onSubmit={form.handleSubmit(async (values) => {
            const isCreate = mode === 'create'
            await toastPromise(mutation.mutateAsync(values), {
              loading: offersT(isCreate ? 'form.toast.create.loading' : 'form.toast.edit.loading'),
              success: offersT(isCreate ? 'form.toast.create.success' : 'form.toast.edit.success'),
              error: (error: unknown) => getToastErrorMessage(error, offersT(isCreate ? 'form.toast.create.error' : 'form.toast.edit.error')),
            })
          })}
        >
          <div className="lg:col-span-2">
            <FormField label={commonT('fields.name')} error={form.formState.errors.title?.message} required>
              <Input placeholder={offersT('form.titlePlaceholder')} {...form.register('title')} error={form.formState.errors.title?.message} />
            </FormField>
          </div>
          <div className="lg:col-span-2">
            <FormField label={commonT('fields.description')} error={form.formState.errors.description?.message} required>
              <Textarea placeholder={offersT('form.descriptionPlaceholder')} {...form.register('description')} error={form.formState.errors.description?.message} />
            </FormField>
          </div>
          <FormField label={commonT('fields.type')} helper={offersT('form.typeHelper')} error={form.formState.errors.offer_type?.message} required>
            <Select {...form.register('offer_type')} error={form.formState.errors.offer_type?.message}>
              {!offer ? <option value="" disabled>{offersT('form.typePlaceholder')}</option> : null}
              <option value="percentage_discount">{offersT('types.percentage_discount')}</option>
              <option value="fixed_discount">{offersT('types.fixed_discount')}</option>
            </Select>
          </FormField>
          <FormField label={commonT('fields.discount')} helper={discountHelper} error={form.formState.errors.discount_value?.message} required={usesNumericDiscount}>
            <Input
              disabled={!usesNumericDiscount}
              type="number"
              step="0.01"
              placeholder={discountPlaceholder}
              {...form.register('discount_value', { valueAsNumber: true })}
              error={form.formState.errors.discount_value?.message}
            />
          </FormField>
          <FormField label={commonT('fields.starts')} error={form.formState.errors.starts_at?.message} required>
            <Input type="datetime-local" {...form.register('starts_at')} error={form.formState.errors.starts_at?.message} />
          </FormField>
          <FormField label={commonT('fields.expires')} error={form.formState.errors.expires_at?.message}>
            <Input type="datetime-local" {...form.register('expires_at')} error={form.formState.errors.expires_at?.message} />
          </FormField>
          <FormField label={commonT('fields.redemptions')} error={form.formState.errors.max_redemptions?.message}>
            <Input type="number" placeholder={offersT('form.maxRedemptionsPlaceholder')} {...form.register('max_redemptions')} error={form.formState.errors.max_redemptions?.message} />
          </FormField>
          <FormField label={commonT('fields.minPurchase')} error={form.formState.errors.min_purchase_amount?.message}>
            <Input type="number" step="0.01" placeholder={offersT('form.minPurchasePlaceholder')} {...form.register('min_purchase_amount')} error={form.formState.errors.min_purchase_amount?.message} />
          </FormField>
          <div className="lg:col-span-2">
            <FormField label={offersT('detail.terms')} helper={offersT('form.termsHelper')} error={form.formState.errors.terms_conditions?.message}>
              <Textarea placeholder={offersT('form.termsPlaceholder')} {...form.register('terms_conditions')} error={form.formState.errors.terms_conditions?.message} />
            </FormField>
          </div>
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="flex items-center gap-3 text-sm font-medium text-slate-400">
                <input
                  disabled
                  type="checkbox"
                  className="h-4 w-4 cursor-not-allowed rounded border-border bg-slate-100 opacity-70"
                  {...form.register('requires_paid_membership')}
                />
                {offersT('form.requiresPaidMembership')}
              </label>
              <p className="text-xs leading-5 text-muted-foreground">{offersT('form.requiresPaidMembershipHelper')}</p>
            </div>
            <FormField label={commonT('fields.status')} error={form.formState.errors.status?.message} required>
              <Select {...form.register('status')} error={form.formState.errors.status?.message}>
                <option value="draft">{commonT('status.draft')}</option>
                <option value="active">{commonT('status.active')}</option>
              </Select>
            </FormField>
          </div>
          <div className="space-y-3">
            <FormField label={offersT('form.imageInputLabel')} helper={offersT('form.imageHelper')}>
              <Input
                disabled
                type="file"
                accept="image/*"
                placeholder={offersT('form.imageDisabledPlaceholder')}
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
              />
            </FormField>
            {offer?.image_url ? <LazyImage className="h-40 w-full rounded-[1.4rem] object-cover" src={offer.image_url} alt={offer.title} /> : null}
          </div>
          <div className="lg:col-span-2">
            <Button
              type="submit"
              loading={mutation.isPending}
              loadingText={offersT('form.saving')}
            >
              {mode === 'create' ? offersT('form.saveCreate') : offersT('form.saveEdit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

export function OffersListPage() {
  const navigate = useNavigate()
  const { t: offersT } = useAppTranslation('offers')
  const { t: commonT, locale } = useAppTranslation('common')
  const { data: business } = useBusiness()
  const offers = useOffers(business?.id)

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={offersT('header.eyebrow')}
        title={offersT('header.title')}
        actions={<Link to="/offers/create"><Button>{offersT('header.create')}</Button></Link>}
      />

      {offers.isLoading ? (
        <PageSkeleton cards={3} rows={3} />
      ) : offers.data && offers.data.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {offers.data.map((offer) => (
            <Card key={offer.id} className="overflow-hidden">
              {offer.image_url ? <LazyImage className="h-44 w-full object-cover" src={offer.image_url} alt={offer.title} /> : null}
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-lg">{offer.title}</CardTitle>
                  <Badge tone={offer.status === 'active' ? 'success' : 'neutral'}>{commonT(`status.${offer.status}`)}</Badge>
                </div>
                <CardDescription>{offer.description ?? offersT('list.noDescription')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {offersT('list.starts', { date: formatDate(offer.starts_at, { dateStyle: 'medium', timeStyle: undefined }, locale) })}
                  {offer.expires_at ? ` • ${offersT('list.ends', { date: formatDate(offer.expires_at, { dateStyle: 'medium', timeStyle: undefined }, locale) })}` : ''}
                </p>
                <div className="flex gap-3">
                  <Link to={`/offers/${offer.id}`}><Button variant="outline">{offersT('list.view')}</Button></Link>
                  <Link to={`/offers/${offer.id}/edit`}><Button variant="secondary">{offersT('list.edit')}</Button></Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title={offersT('list.emptyTitle')} description={offersT('list.emptyDescription')} actionLabel={offersT('header.create')} onAction={() => { navigate('/offers/create') }} />
      )}
    </div>
  )
}

export function CreateOfferPage() {
  const { t } = useAppTranslation('offers')

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('header.eyebrow')} title={t('header.createTitle')} />
      <OfferForm mode="create" />
    </div>
  )
}

export function OfferDetailPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { offerId } = useParams()
  const { t: offersT } = useAppTranslation('offers')
  const { t: commonT, locale } = useAppTranslation('common')
  const { data: business } = useBusiness()
  const offer = useOffer(offerId)

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!offerId) throw new Error(commonT('errors.notFound'))

      const { error } = await supabase.from('offers').delete().eq('id', offerId)
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateBusinessOperations(queryClient, business?.id)
      await queryClient.invalidateQueries({ queryKey: queryKeys.offers(business?.id) })
      navigate('/offers', { replace: true })
    },
  })

  if (!offerId) return <Navigate to="/offers" replace />
  if (offer.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (!offer.data) {
    return (
      <AppStatusPage
        code={commonT('common.notFound.code')}
        title={commonT('common.notFound.title')}
        description={commonT('common.notFound.description')}
        primaryAction={{ label: commonT('common.buttons.goToOffers'), to: '/offers' }}
        fullscreen={false}
      />
    )
  }

  const item = offer.data

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={offersT('header.eyebrow')}
        title={item.title}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="border-danger-border text-danger-text hover:bg-danger-bg"
              loading={deleteMutation.isPending}
              loadingText={offersT('detail.deleting')}
              onClick={async () => {
                if (!window.confirm(offersT('detail.deleteConfirm'))) return
                await toastPromise(deleteMutation.mutateAsync(), {
                  loading: offersT('detail.toast.delete.loading'),
                  success: offersT('detail.toast.delete.success'),
                  error: (error: unknown) => getToastErrorMessage(error, offersT('detail.toast.delete.error')),
                })
              }}
            >
              {offersT('detail.delete')}
            </Button>
            <Link to={`/offers/${item.id}/edit`}><Button>{offersT('list.edit')}</Button></Link>
          </div>
        }
      />
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <Card className="overflow-hidden">
          {item.image_url ? <LazyImage className="h-64 w-full object-cover xl:h-72" src={item.image_url} alt={item.title} /> : null}
          <CardContent className="space-y-5 p-5 sm:p-6">
            {deleteMutation.error instanceof Error ? (
              <p className="text-sm font-medium text-danger-text">{deleteMutation.error.message}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={item.status === 'active' ? 'success' : 'neutral'}>{commonT(`status.${item.status}`)}</Badge>
              {item.requires_paid_membership ? <Badge tone="primary">{offersT('detail.paidOnly')}</Badge> : null}
            </div>
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">{commonT('fields.description')}</p>
              <p className="text-sm leading-7 text-muted-foreground">{item.description}</p>
            </div>
            {item.terms_conditions ? (
              <div className="rounded-[1.25rem] border border-border bg-surface-2/45 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{offersT('detail.terms')}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">{item.terms_conditions}</p>
              </div>
            ) : null}
            {!item.image_url ? (
              <div className="rounded-[1.25rem] border border-dashed border-border bg-surface-2/35 px-4 py-5 text-sm text-muted-foreground">
                {offersT('form.imageDisabledPlaceholder')}
              </div>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-4">
            <CardTitle>{offersT('detail.metadataTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-[1.25rem] border border-border bg-surface-2/45">
              <div className="grid grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] text-sm">
                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{commonT('fields.type')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{offersT(`types.${item.offer_type}`)}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{commonT('fields.discount')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{item.discount_value ?? offersT('detail.notAvailable')}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{commonT('fields.starts')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{formatDate(item.starts_at, undefined, locale)}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{commonT('fields.expires')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">
                  {item.expires_at ? formatDate(item.expires_at, undefined, locale) : offersT('detail.noExpiry')}
                </div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{commonT('fields.minPurchase')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">
                  {item.min_purchase_amount ? formatCurrency(item.min_purchase_amount, locale) : offersT('detail.notAvailable')}
                </div>

                <div className="px-4 py-3 font-semibold text-foreground">{commonT('fields.redemptions')}</div>
                <div className="px-4 py-3 text-right text-muted-foreground">{item.current_redemptions}/{item.max_redemptions ?? '∞'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function EditOfferPage() {
  const { offerId } = useParams()
  const { t } = useAppTranslation('offers')
  const offer = useOffer(offerId)

  if (!offerId) return <Navigate to="/offers" replace />
  if (offer.isLoading) return <PageSkeleton cards={1} rows={5} />
  if (!offer.data) {
    return (
      <AppStatusPage
        code={t('common.notFound.code')}
        title={t('common.notFound.title')}
        description={t('common.notFound.description')}
        primaryAction={{ label: t('common.buttons.goToOffers'), to: '/offers' }}
        fullscreen={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('header.eyebrow')} title={t('header.editTitle')} />
      <OfferForm mode="edit" offer={offer.data} />
    </div>
  )
}
