import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { HiOutlinePencilSquare } from 'react-icons/hi2'
import { AppStatusPage } from '@/components/layout/app-status-page'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { LazyImage } from '@/components/ui/lazy-image'
import { Textarea } from '@/components/ui/textarea'
import { invalidateBusinessContext } from '@/features/business/cache'
import { useBusiness } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { createContactSchema } from '@/lib/schemas'
import { supabase } from '@/lib/supabase'
import type { BusinessOperatingHours } from '@/types/app'
import type { Json } from '@/types/database.types'

const BUSINESS_MEDIA_BUCKET = 'business-media'
const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

function defaultOperatingHours(): BusinessOperatingHours {
  return {
    monday: { closed: false, open: '09:00', close: '18:00' },
    tuesday: { closed: false, open: '09:00', close: '18:00' },
    wednesday: { closed: false, open: '09:00', close: '18:00' },
    thursday: { closed: false, open: '09:00', close: '18:00' },
    friday: { closed: false, open: '09:00', close: '18:00' },
    saturday: { closed: false, open: '10:00', close: '16:00' },
    sunday: { closed: true, open: '10:00', close: '16:00' },
  }
}

function parseOperatingHours(value: Json | null | undefined): BusinessOperatingHours {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return defaultOperatingHours()
  }

  const base = defaultOperatingHours()
  for (const day of WEEKDAY_ORDER) {
    const source = value[day]
    if (source && typeof source === 'object' && !Array.isArray(source)) {
      const open = typeof source.open === 'string' ? source.open : base[day].open
      const close = typeof source.close === 'string' ? source.close : base[day].close
      const closed = typeof source.closed === 'boolean' ? source.closed : base[day].closed
      base[day] = { open, close, closed }
    }
  }
  return base
}

async function uploadBusinessImage(businessId: string, file: File, target: 'profile' | 'cover') {
  const extension = file.name.split('.').pop() ?? 'jpg'
  const path = `${businessId}/${target}-${Date.now()}.${extension}`
  const { error } = await supabase.storage.from(BUSINESS_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error
  return supabase.storage.from(BUSINESS_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
}

export function BusinessProfilePage() {
  const { t, locale } = useAppTranslation(['profile', 'common'])
  const business = useBusiness()

  if (business.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (!business.data) {
    return (
      <AppStatusPage
        code={t('common.notFound.code')}
        title={t('common.notFound.title')}
        description={t('common.errors.businessRequired')}
        primaryAction={{ label: t('common.buttons.goToDashboard'), to: '/dashboard' }}
        fullscreen={false}
      />
    )
  }

  const locationValue = [business.data.address_line1, business.data.city].filter(Boolean).join(', ') || t('common.states.missing')
  const websiteValue = business.data.website
  const phoneValue = business.data.phone ?? t('common.states.missing')
  const emailValue = business.data.email ?? t('profile.view.noPublicEmail')
  const googleBusinessUrlValue = business.data.google_business_url
  const hours = parseOperatingHours(business.data.operating_hours)
  const weekdayLabels = locale === 'el'
    ? {
        monday: 'Δευτέρα',
        tuesday: 'Τρίτη',
        wednesday: 'Τετάρτη',
        thursday: 'Πέμπτη',
        friday: 'Παρασκευή',
        saturday: 'Σάββατο',
        sunday: 'Κυριακή',
      }
    : {
        monday: 'Monday',
        tuesday: 'Tuesday',
        wednesday: 'Wednesday',
        thursday: 'Thursday',
        friday: 'Friday',
        saturday: 'Saturday',
        sunday: 'Sunday',
      }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('profile.header.eyebrow')} title={business.data.name} description={t('profile.header.description')} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="relative overflow-hidden">
          <Link
            to="/profile/edit"
            aria-label={t('common.buttons.edit')}
            className="absolute right-4 top-4 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-elevated text-foreground shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
          >
            <HiOutlinePencilSquare className="h-5 w-5" />
          </Link>
          {business.data.cover_image_url ? <LazyImage className="h-72 w-full object-cover" src={business.data.cover_image_url} alt={business.data.name} /> : null}
          <CardContent className="mt-4 space-y-4 p-6">
            <div className="flex items-center gap-4">
              {business.data.profile_image_url ? (
                <LazyImage className="h-20 w-20 rounded-full object-cover ring-4 ring-white" src={business.data.profile_image_url} alt={business.data.name} />
              ) : (
                <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-weak text-2xl font-bold text-primary">
                  {business.data.name[0]}
                </div>
              )}
              <div>
                <p className="text-2xl font-extrabold text-foreground">{business.data.name}</p>
                <p className="text-sm text-muted-foreground">{business.data.email ?? t('profile.view.noPublicEmail')}</p>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">{business.data.description ?? t('profile.view.noDescription')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div className="space-y-2">
              <CardTitle>{t('profile.view.detailsTitle')}</CardTitle>
            </div>
            <Link
              to="/profile/edit"
              aria-label={t('common.buttons.edit')}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-elevated text-foreground shadow-soft transition-transform duration-200 hover:-translate-y-0.5 hover:bg-surface-2"
            >
              <HiOutlinePencilSquare className="h-5 w-5" />
            </Link>
          </CardHeader>
          <CardContent>
            <div className="overflow-hidden rounded-[1.5rem] border border-border bg-surface-2/45">
              <div className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] text-sm">
                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('profile.view.slug')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{business.data.slug}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.status')}</div>
                <div className="border-b border-border px-4 py-3 text-right">
                  <Badge tone={business.data.subscription_status === 'active' ? 'success' : 'warning'}>
                    {t(`common.status.${business.data.subscription_status}`)}
                  </Badge>
                </div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.email')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{emailValue}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.location')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{locationValue}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.googleBusinessUrl')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">
                  {googleBusinessUrlValue ? (
                    <a
                      className="underline underline-offset-4 transition-colors hover:text-foreground"
                      href={googleBusinessUrlValue}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {googleBusinessUrlValue}
                    </a>
                  ) : (
                    t('common.states.notProvided')
                  )}
                </div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('common.fields.phone')}</div>
                <div className="border-b border-border px-4 py-3 text-right text-muted-foreground">{phoneValue}</div>

                <div className="border-b border-border px-4 py-3 font-semibold text-foreground">{t('profile.view.operatingHours')}</div>
                <div className="border-b border-border px-4 py-3">
                  <div className="space-y-1.5 text-right text-muted-foreground">
                    {WEEKDAY_ORDER.map((day) => (
                      <p key={day} className="text-xs sm:text-sm">
                        <span className="font-medium text-foreground">{weekdayLabels[day]}:</span>{' '}
                        {hours[day].closed ? t('profile.view.closed') : `${hours[day].open} - ${hours[day].close}`}
                      </p>
                    ))}
                  </div>
                </div>

                <div className="px-4 py-3 font-semibold text-foreground">{t('common.fields.website')}</div>
                <div className="px-4 py-3 text-right text-muted-foreground">
                  {websiteValue ? (
                    <a
                      className="underline underline-offset-4 transition-colors hover:text-foreground"
                      href={websiteValue}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {websiteValue}
                    </a>
                  ) : (
                    t('common.states.missing')
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function EditBusinessProfilePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useAppTranslation(['profile', 'validation', 'common'])
  const business = useBusiness()
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const form = useForm({
    resolver: zodResolver(createContactSchema(t)),
    values: {
      phone: business.data?.phone ?? '',
      email: business.data?.email ?? '',
      website: business.data?.website ?? '',
      social_facebook: business.data?.social_facebook ?? '',
      social_instagram: business.data?.social_instagram ?? '',
    },
  })

  const descriptionForm = useForm({
    defaultValues: {
      name: business.data?.name ?? '',
      description: business.data?.description ?? '',
      address_line1: business.data?.address_line1 ?? '',
      city: business.data?.city ?? '',
      region: business.data?.region ?? '',
      postal_code: business.data?.postal_code ?? '',
      google_business_url: business.data?.google_business_url ?? '',
    },
  })

  const hasChanges =
    form.formState.isDirty ||
    descriptionForm.formState.isDirty ||
    profileFile !== null ||
    coverFile !== null

  const mutation = useMutation({
    mutationFn: async () => {
      if (!business.data) throw new Error(t('common.errors.businessRequired'))

      const contactValues = form.getValues()
      const baseValues = descriptionForm.getValues()
      const updates: Record<string, unknown> = {
        ...baseValues,
        phone: contactValues.phone,
        email: contactValues.email,
        website: contactValues.website || null,
        social_facebook: contactValues.social_facebook || null,
        social_instagram: contactValues.social_instagram || null,
      }

      if (profileFile) {
        updates.profile_image_url = await uploadBusinessImage(business.data.id, profileFile, 'profile')
      }
      if (coverFile) {
        updates.cover_image_url = await uploadBusinessImage(business.data.id, coverFile, 'cover')
      }

      const { error } = await supabase.from('businesses').update(updates).eq('id', business.data.id)
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient)
    },
  })

  if (business.isLoading) return <PageSkeleton cards={1} rows={5} />
  if (!business.data) return null

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('profile.header.eyebrow')} title={t('profile.header.editTitle')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.edit.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <FormField label={t('common.fields.name')}>
              <Input placeholder={t('profile.edit.namePlaceholder')} {...descriptionForm.register('name')} />
            </FormField>
            <FormField label={t('common.fields.email')} error={form.formState.errors.email?.message}>
              <Input placeholder={t('profile.edit.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
            </FormField>
            <div className="lg:col-span-2">
              <FormField label={t('common.fields.description')}>
                <Textarea placeholder={t('profile.edit.descriptionPlaceholder')} {...descriptionForm.register('description')} />
              </FormField>
            </div>
            <FormField label={t('common.fields.phone')} error={form.formState.errors.phone?.message}>
              <Input placeholder={t('profile.edit.phonePlaceholder')} {...form.register('phone')} error={form.formState.errors.phone?.message} />
            </FormField>
            <FormField label={t('common.fields.website')} error={form.formState.errors.website?.message}>
              <Input placeholder={t('profile.edit.websitePlaceholder')} {...form.register('website')} error={form.formState.errors.website?.message} />
            </FormField>
            <FormField label={t('common.fields.location')}>
              <Input placeholder={t('profile.edit.addressPlaceholder')} {...descriptionForm.register('address_line1')} />
            </FormField>
            <FormField label={t('common.fields.city')}>
              <Input placeholder={t('profile.edit.cityPlaceholder')} {...descriptionForm.register('city')} />
            </FormField>
            <FormField label={t('common.fields.region')}>
              <Input placeholder={t('profile.edit.regionPlaceholder')} {...descriptionForm.register('region')} />
            </FormField>
            <FormField label={t('common.fields.postalCode')}>
              <Input placeholder={t('profile.edit.postalCodePlaceholder')} {...descriptionForm.register('postal_code')} />
            </FormField>
            <FormField label={t('common.fields.googleBusinessUrl')} helper={t('profile.edit.googleBusinessHelper')}>
              <Input placeholder={t('profile.edit.googleBusinessPlaceholder')} {...descriptionForm.register('google_business_url')} />
            </FormField>
            <FormField label="Facebook" error={form.formState.errors.social_facebook?.message}>
              <Input placeholder={t('profile.edit.facebookPlaceholder')} {...form.register('social_facebook')} error={form.formState.errors.social_facebook?.message} />
            </FormField>
            <FormField label="Instagram" error={form.formState.errors.social_instagram?.message}>
              <Input placeholder={t('profile.edit.instagramPlaceholder')} {...form.register('social_instagram')} error={form.formState.errors.social_instagram?.message} />
            </FormField>
            <FormField label={t('profile.edit.profileImageLabel')} helper={t('profile.edit.profileImageHelper')}>
              <Input type="file" accept="image/*" onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <FormField label={t('profile.edit.coverImageLabel')} helper={t('profile.edit.coverImageHelper')}>
              <Input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <div className="lg:col-span-2">
              <div className="flex flex-wrap gap-3">
                <Button type="submit" loading={mutation.isPending} loadingText={t('profile.edit.saving')} disabled={!hasChanges}>
                  {t('profile.edit.save')}
                </Button>
                <Button type="button" variant="outline" onClick={() => navigate('/profile')}>
                  {t('common.buttons.cancel')}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function BusinessPreviewPage() {
  const { t } = useAppTranslation('profile')
  const business = useBusiness()

  if (business.isLoading) return <PageSkeleton cards={1} rows={4} />
  if (!business.data) return null

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('profile.header.eyebrow')} title={t('profile.header.previewTitle')} description={t('profile.header.previewDescription')} />
      <Card className="overflow-hidden">
        {business.data.cover_image_url ? <LazyImage className="h-80 w-full object-cover" src={business.data.cover_image_url} alt={business.data.name} /> : null}
        <CardContent className="space-y-6 p-8">
          <div className="flex flex-wrap items-center gap-4">
            {business.data.profile_image_url ? (
              <LazyImage className="h-24 w-24 rounded-full object-cover ring-4 ring-white" src={business.data.profile_image_url} alt={business.data.name} />
            ) : (
              <div className="inline-flex h-24 w-24 items-center justify-center rounded-full bg-primary-weak text-3xl font-bold text-primary">
                {business.data.name[0]}
              </div>
            )}
            <div>
              <p className="text-3xl font-extrabold text-foreground">{business.data.name}</p>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{business.data.description}</p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.4rem] bg-surface-2 p-4 text-sm text-muted-foreground">{business.data.city ?? t('profile.preview.cityMissing')}</div>
            <div className="rounded-[1.4rem] bg-surface-2 p-4 text-sm text-muted-foreground">{business.data.phone ?? t('profile.preview.phoneMissing')}</div>
            <div className="rounded-[1.4rem] bg-surface-2 p-4 text-sm text-muted-foreground">{business.data.website ?? t('profile.preview.websiteMissing')}</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
