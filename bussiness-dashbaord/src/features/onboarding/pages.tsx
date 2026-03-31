import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  HiMiniArrowRightOnRectangle,
  HiMiniBuildingOffice2,
  HiMiniCheck,
  HiMiniClock,
  HiMiniEnvelope,
  HiMiniGlobeAlt,
  HiMiniHashtag,
  HiMiniMapPin,
  HiMiniPhoto,
  HiMiniPhone,
  HiMiniPencilSquare,
  HiMiniRectangleGroup,
  HiMiniSparkles,
  HiMiniUserCircle,
} from 'react-icons/hi2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { LanguageSwitcher } from '@/components/ui/language-switcher'
import { LazyImage } from '@/components/ui/lazy-image'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/auth-provider'
import { invalidateBusinessContext } from '@/features/business/cache'
import { fetchCurrentBusiness, useBusiness, useBusinessCategories, useProfile, useSubscriptionPlans } from '@/features/business/hooks'
import { removeBusinessMediaAsset, updateBusinessDetails, uploadBusinessMediaAsset, upsertBusinessInfo } from '@/features/business/onboarding'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { appEnv } from '@/lib/env'
import {
  createBusinessInfoSchema,
  createCategorySchema,
  createContactSchema,
  createLocationSchema,
  createOperatingHoursSchema,
} from '@/lib/schemas'
import { clearOnboardingDraft, readOnboardingDraft, writeOnboardingDraft } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import { formatCurrency } from '@/lib/utils'
import type { Business, BusinessCategory, BusinessOperatingHours, OnboardingDraft } from '@/types/app'
import type { Json } from '@/types/database.types'
const WEEKDAY_ORDER = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const

type OnboardingStepKey =
  | 'business-info'
  | 'category'
  | 'location'
  | 'contact'
  | 'media'
  | 'operations'
  | 'review'
  | 'payment'
  | 'complete'

type OnboardingStepConfig = {
  key: OnboardingStepKey
  route: string
  title: string
  description: string
  sideTitle: string
  sideBullets: string[]
}

function getOnboardingSteps(t: ReturnType<typeof useAppTranslation>['t']): OnboardingStepConfig[] {
  return [
    {
      key: 'business-info',
      route: '/onboarding/business-info',
      title: t('onboarding.steps.businessInfo.title'),
      description: t('onboarding.steps.businessInfo.description'),
      sideTitle: t('onboarding.steps.businessInfo.sideTitle'),
      sideBullets: t('onboarding.steps.businessInfo.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'category',
      route: '/onboarding/category',
      title: t('onboarding.steps.category.title'),
      description: t('onboarding.steps.category.description'),
      sideTitle: t('onboarding.steps.category.sideTitle'),
      sideBullets: t('onboarding.steps.category.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'location',
      route: '/onboarding/location',
      title: t('onboarding.steps.location.title'),
      description: t('onboarding.steps.location.description'),
      sideTitle: t('onboarding.steps.location.sideTitle'),
      sideBullets: t('onboarding.steps.location.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'contact',
      route: '/onboarding/contact',
      title: t('onboarding.steps.contact.title'),
      description: t('onboarding.steps.contact.description'),
      sideTitle: t('onboarding.steps.contact.sideTitle'),
      sideBullets: t('onboarding.steps.contact.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'media',
      route: '/onboarding/media',
      title: t('onboarding.steps.media.title'),
      description: t('onboarding.steps.media.description'),
      sideTitle: t('onboarding.steps.media.sideTitle'),
      sideBullets: t('onboarding.steps.media.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'operations',
      route: '/onboarding/operations',
      title: t('onboarding.steps.operations.title'),
      description: t('onboarding.steps.operations.description'),
      sideTitle: t('onboarding.steps.operations.sideTitle'),
      sideBullets: t('onboarding.steps.operations.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'review',
      route: '/onboarding/review',
      title: t('onboarding.steps.review.title'),
      description: t('onboarding.steps.review.description'),
      sideTitle: t('onboarding.steps.review.sideTitle'),
      sideBullets: t('onboarding.steps.review.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'payment',
      route: '/onboarding/payment',
      title: t('onboarding.steps.payment.title'),
      description: t('onboarding.steps.payment.description'),
      sideTitle: t('onboarding.steps.payment.sideTitle'),
      sideBullets: t('onboarding.steps.payment.sideBullets', { returnObjects: true }) as string[],
    },
    {
      key: 'complete',
      route: '/onboarding/complete',
      title: t('onboarding.steps.complete.title'),
      description: t('onboarding.steps.complete.description'),
      sideTitle: t('onboarding.steps.complete.sideTitle'),
      sideBullets: t('onboarding.steps.complete.sideBullets', { returnObjects: true }) as string[],
    },
  ]
}

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

function operatingHoursToFormValues(hours: BusinessOperatingHours) {
  return {
    monday_closed: hours.monday.closed,
    monday_open: hours.monday.open,
    monday_close: hours.monday.close,
    tuesday_closed: hours.tuesday.closed,
    tuesday_open: hours.tuesday.open,
    tuesday_close: hours.tuesday.close,
    wednesday_closed: hours.wednesday.closed,
    wednesday_open: hours.wednesday.open,
    wednesday_close: hours.wednesday.close,
    thursday_closed: hours.thursday.closed,
    thursday_open: hours.thursday.open,
    thursday_close: hours.thursday.close,
    friday_closed: hours.friday.closed,
    friday_open: hours.friday.open,
    friday_close: hours.friday.close,
    saturday_closed: hours.saturday.closed,
    saturday_open: hours.saturday.open,
    saturday_close: hours.saturday.close,
    sunday_closed: hours.sunday.closed,
    sunday_open: hours.sunday.open,
    sunday_close: hours.sunday.close,
  }
}

function formValuesToOperatingHours(values: ReturnType<typeof operatingHoursToFormValues>): BusinessOperatingHours {
  return {
    monday: { closed: values.monday_closed, open: values.monday_open, close: values.monday_close },
    tuesday: { closed: values.tuesday_closed, open: values.tuesday_open, close: values.tuesday_close },
    wednesday: { closed: values.wednesday_closed, open: values.wednesday_open, close: values.wednesday_close },
    thursday: { closed: values.thursday_closed, open: values.thursday_open, close: values.thursday_close },
    friday: { closed: values.friday_closed, open: values.friday_open, close: values.friday_close },
    saturday: { closed: values.saturday_closed, open: values.saturday_open, close: values.saturday_close },
    sunday: { closed: values.sunday_closed, open: values.sunday_open, close: values.sunday_close },
  }
}

function useDraft() {
  const { user } = useAuth()
  const persistedDraft = user ? readOnboardingDraft(user.id) ?? {} : {}
  const [draft, setDraft] = useState<OnboardingDraft>({})
  const currentDraft = { ...persistedDraft, ...draft }

  function save(partial: Partial<OnboardingDraft>) {
    if (!user) return
    const next = { ...currentDraft, ...partial }
    setDraft(next)
    writeOnboardingDraft(user.id, next)
  }

  function reset() {
    if (!user) return
    clearOnboardingDraft(user.id)
    setDraft({})
  }

  return { draft: currentDraft, save, reset }
}

async function resolveBusinessForUser(userId: string) {
  return fetchCurrentBusiness(userId)
}

function deriveBusinessFromDraft(business: Business | null | undefined, draft: OnboardingDraft) {
  return {
    name: business?.name ?? draft.name ?? '',
    description: business?.description ?? draft.description ?? '',
    category_id: business?.category_id ?? draft.categoryId ?? '',
    subcategory: business?.subcategory ?? draft.subcategory ?? '',
    address_line1: business?.address_line1 ?? draft.address_line1 ?? '',
    address_line2: business?.address_line2 ?? draft.address_line2 ?? '',
    city: business?.city ?? draft.city ?? '',
    postal_code: business?.postal_code ?? draft.postal_code ?? '',
    region: business?.region ?? draft.region ?? '',
    country: business?.country ?? draft.country ?? 'GR',
    latitude: business?.latitude ?? draft.latitude ?? null,
    longitude: business?.longitude ?? draft.longitude ?? null,
    phone: business?.phone ?? draft.phone ?? '',
    email: business?.email ?? draft.email ?? '',
    website: business?.website ?? draft.website ?? '',
    social_facebook: business?.social_facebook ?? draft.social_facebook ?? '',
    social_instagram: business?.social_instagram ?? draft.social_instagram ?? '',
    profile_image_url: business?.profile_image_url ?? draft.profile_image_url ?? null,
    cover_image_url: business?.cover_image_url ?? draft.cover_image_url ?? null,
    operating_hours: (business?.operating_hours ?? draft.operating_hours ?? defaultOperatingHours()) as Json,
  }
}

function isTruthy(value: string | null | undefined) {
  return Boolean(value && value.trim().length > 0)
}

function getStepCompletion(snapshot: ReturnType<typeof deriveBusinessFromDraft>) {
  const hours = parseOperatingHours(snapshot.operating_hours)
  return {
    'business-info': isTruthy(snapshot.name) && isTruthy(snapshot.description),
    category: Boolean(snapshot.category_id) && isTruthy(snapshot.subcategory),
    location:
      isTruthy(snapshot.address_line1) &&
      isTruthy(snapshot.city) &&
      isTruthy(snapshot.postal_code) &&
      isTruthy(snapshot.region) &&
      isTruthy(snapshot.country),
    contact: isTruthy(snapshot.phone) && isTruthy(snapshot.email),
    media: Boolean(snapshot.profile_image_url) && Boolean(snapshot.cover_image_url),
    operations: WEEKDAY_ORDER.every((day) => hours[day].closed || (isTruthy(hours[day].open) && isTruthy(hours[day].close))),
  } as const
}

function firstIncompleteRoute(snapshot: ReturnType<typeof deriveBusinessFromDraft>, steps: OnboardingStepConfig[]) {
  const completion = getStepCompletion(snapshot)
  const orderedPrereqs = ['business-info', 'category', 'location', 'contact', 'media', 'operations'] as const
  const missing = orderedPrereqs.find((step) => !completion[step])
  return missing ? steps.find((step) => step.key === missing)?.route ?? '/onboarding/business-info' : null
}

function FieldBlock({
  label,
  helper,
  error,
  children,
}: {
  label: string
  helper: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <FormField label={label} helper={helper} error={error}>
      {children}
    </FormField>
  )
}

function MutationErrorText({ error }: { error?: unknown }) {
  if (!(error instanceof Error) || !error.message) return null
  return <p className="text-sm font-medium text-danger-text">{error.message}</p>
}

function StepCard({
  active,
  category,
  onSelect,
  fallbackDescription,
}: {
  active: boolean
  category: BusinessCategory
  onSelect: (categoryId: string) => void
  fallbackDescription: string
}) {
  return (
    <button
      type="button"
      className={`rounded-[1.05rem] border p-3.5 text-left transition ${
        active
          ? 'border-primary bg-primary-weak shadow-[0_12px_30px_color-mix(in_srgb,var(--primary)_20%,transparent)]'
          : 'border-border bg-elevated hover:border-primary/30 hover:bg-surface-2'
      }`}
      onClick={() => onSelect(category.id)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <p className="text-base font-bold text-foreground">{category.name}</p>
          <p className="text-sm text-muted-foreground">{category.description ?? fallbackDescription}</p>
        </div>
        {active ? (
          <span className="inline-flex size-8 items-center justify-center rounded-full bg-primary text-white">
            <HiMiniCheck className="size-4" />
          </span>
        ) : null}
      </div>
    </button>
  )
}

function OnboardingShell({
  children,
}: {
  children: React.ReactNode
}) {
  const { t } = useAppTranslation(['onboarding', 'common'])
  const location = useLocation()
  const navigate = useNavigate()
  const { signOut } = useAuth()
  const { data: business } = useBusiness()
  const { draft } = useDraft()
  const steps = useMemo(() => getOnboardingSteps(t), [t])

  const snapshot = deriveBusinessFromDraft(business, draft)
  const step = steps.find((item) => item.route === location.pathname) ?? steps[0]
  const stepIndex = steps.findIndex((item) => item.route === step.route)
  const progress = Math.round(((stepIndex + 1) / steps.length) * 100)

  useEffect(() => {
    if (step.key === 'complete') return
    const firstMissing = firstIncompleteRoute(snapshot, steps)
    if (!firstMissing) return
    const currentIndex = steps.findIndex((item) => item.route === location.pathname)
    const firstMissingIndex = steps.findIndex((item) => item.route === firstMissing)
    if (currentIndex > firstMissingIndex) {
      navigate(firstMissing, { replace: true })
    }
  }, [location.pathname, navigate, snapshot, step.key, steps])

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-[1160px] flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <p className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              <HiMiniSparkles className="size-4" />
              {t('onboarding.shell.eyebrow')}
            </p>
            <div>
              <h1 className="text-[clamp(2rem,2.4vw,2.75rem)] font-extrabold leading-tight text-foreground">{step.title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Button
              variant="outline"
              leftIcon={<HiMiniArrowRightOnRectangle className="size-4" />}
              onClick={async () => {
                await signOut()
                navigate('/auth/login')
              }}
            >
              {t('common.buttons.signOut')}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 px-1">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--primary)_10%,white)]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#7b73ff_0%,#6c63ff_100%)] transition-[width] duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="min-w-fit text-sm font-semibold text-primary">{t('common.labels.percentComplete', { value: progress })}</p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Card className="overflow-hidden">
            <CardContent className="p-5 sm:p-6 lg:p-8">{children}</CardContent>
          </Card>
          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-xl">{step.sideTitle}</CardTitle>
              <CardDescription>
                {business?.name ? `${t('common.labels.currentDraft')}: ${business.name}` : t('common.labels.draftBusinessProfile')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step.sideBullets.map((bullet, index) => (
                <div key={bullet} className="flex items-start gap-3">
                  <div className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-weak text-xs font-bold text-primary">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-6 text-muted-foreground">{bullet}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function StepActions({
  backHref,
  submitLabel,
  submitting,
}: {
  backHref?: string
  submitLabel: string
  submitting?: boolean
}) {
  const { t } = useAppTranslation('common')

  return (
    <div className="flex flex-wrap items-center gap-3 pt-2">
      {backHref ? (
        <Link to={backHref}>
          <Button type="button" variant="outline">{t('common.buttons.back')}</Button>
        </Link>
      ) : null}
      <Button type="submit" loading={submitting} loadingText={t('common.states.saving')}>
        {submitLabel}
      </Button>
    </div>
  )
}

export function BusinessInfoStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'validation', 'common', 'auth'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const initial = deriveBusinessFromDraft(business, draft)
  const form = useForm({
    resolver: zodResolver(createBusinessInfoSchema(t)),
    values: {
      name: initial.name,
      description: initial.description,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: { name: string; description: string }) => {
      if (!user) throw new Error(t('common.errors.authRequired'))
      const { error: ensureError } = await supabase.rpc('ensure_profile_for_role', { p_role: 'business' })
      if (ensureError) throw ensureError

      const currentBusiness = business ?? await resolveBusinessForUser(user.id)
      const persisted = await upsertBusinessInfo({
        userId: user.id,
        business: currentBusiness,
        values,
      })

      save({ businessId: persisted.id, name: persisted.name, description: persisted.description })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/category')
    },
  })

  return (
    <OnboardingShell>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldBlock label={t('onboarding.fields.businessName')} helper={t('onboarding.fields.businessNameHelper')} error={form.formState.errors.name?.message}>
          <Input leftIcon={<HiMiniBuildingOffice2 className="size-4" />} placeholder={t('onboarding.fields.businessNamePlaceholder')} {...form.register('name')} error={form.formState.errors.name?.message} />
        </FieldBlock>
        <FieldBlock label={t('onboarding.fields.businessDescription')} helper={t('onboarding.fields.businessDescriptionHelper')} error={form.formState.errors.description?.message}>
          <Textarea
            leftIcon={<HiMiniPencilSquare className="size-4" />}
            placeholder={t('onboarding.fields.businessDescriptionPlaceholder')}
            className="min-h-28"
            {...form.register('description')}
            error={form.formState.errors.description?.message}
          />
        </FieldBlock>
        <MutationErrorText error={mutation.error} />
        <StepActions submitLabel={t('common.buttons.saveAndContinue')} submitting={mutation.isPending} />
      </form>
    </OnboardingShell>
  )
}

export function CategoryStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'validation', 'common'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const categories = useBusinessCategories()
  const initial = deriveBusinessFromDraft(business, draft)
  const form = useForm({
    resolver: zodResolver(createCategorySchema(t)),
    values: {
      categoryId: initial.category_id,
      subcategory: initial.subcategory,
    },
  })
  const selectedCategoryId = useWatch({ control: form.control, name: 'categoryId' })

  const mutation = useMutation({
    mutationFn: async (values: { categoryId: string; subcategory: string }) => {
      if (!business) throw new Error(t('common.errors.businessRequired'))
      const updated = await updateBusinessDetails(business.id, {
        category_id: values.categoryId,
        subcategory: values.subcategory,
      })
      save({ businessId: updated.id, categoryId: values.categoryId, subcategory: values.subcategory })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/location')
    },
  })

  return (
    <OnboardingShell>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FieldBlock label={t('onboarding.fields.category')} helper={t('onboarding.fields.categoryHelper')} error={form.formState.errors.categoryId?.message}>
          <div className="grid gap-3 lg:grid-cols-2">
            {categories.data?.map((category) => (
              <StepCard
                key={category.id}
                active={selectedCategoryId === category.id}
                category={category}
                fallbackDescription={t('onboarding.fields.categoryDescriptionFallback')}
                onSelect={(categoryId) => form.setValue('categoryId', categoryId, { shouldValidate: true })}
              />
            ))}
          </div>
          {form.formState.errors.categoryId?.message ? <p className="text-xs font-medium text-danger-text">{form.formState.errors.categoryId.message}</p> : null}
        </FieldBlock>
        <FieldBlock label={t('onboarding.fields.subcategory')} helper={t('onboarding.fields.subcategoryHelper')} error={form.formState.errors.subcategory?.message}>
          <Input leftIcon={<HiMiniRectangleGroup className="size-4" />} placeholder={t('onboarding.fields.subcategoryPlaceholder')} {...form.register('subcategory')} error={form.formState.errors.subcategory?.message} />
        </FieldBlock>
        <MutationErrorText error={mutation.error} />
        <StepActions backHref="/onboarding/business-info" submitLabel={t('common.buttons.saveAndContinue')} submitting={mutation.isPending} />
      </form>
    </OnboardingShell>
  )
}

export function LocationStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'validation', 'common'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const initial = deriveBusinessFromDraft(business, draft)
  const form = useForm({
    resolver: zodResolver(createLocationSchema(t)),
    values: {
      address_line1: initial.address_line1,
      address_line2: initial.address_line2,
      city: initial.city,
      postal_code: initial.postal_code,
      region: initial.region,
      country: initial.country,
      latitude: initial.latitude,
      longitude: initial.longitude,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: {
      address_line1: string
      address_line2?: string
      city: string
      postal_code: string
      region: string
      country: string
      latitude?: number | null
      longitude?: number | null
    }) => {
      if (!business) throw new Error(t('common.errors.businessRequired'))
      const payload = {
        address_line1: values.address_line1,
        address_line2: values.address_line2 || null,
        city: values.city,
        postal_code: values.postal_code,
        region: values.region,
        country: values.country,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
      }
      const updated = await updateBusinessDetails(business.id, payload)
      save({
        businessId: updated.id,
        address_line1: values.address_line1,
        address_line2: values.address_line2 || '',
        city: values.city,
        postal_code: values.postal_code,
        region: values.region,
        country: values.country,
        latitude: values.latitude ?? null,
        longitude: values.longitude ?? null,
      })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/contact')
    },
  })

  const countryOptions = [
    { value: 'GR', label: t('onboarding.countries.GR') },
    { value: 'CY', label: t('onboarding.countries.CY') },
  ]

  return (
    <OnboardingShell>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <FieldBlock label={t('onboarding.fields.addressLine1')} helper={t('onboarding.fields.addressLine1Helper')} error={form.formState.errors.address_line1?.message}>
              <Input leftIcon={<HiMiniMapPin className="size-4" />} placeholder={t('onboarding.fields.addressLine1Placeholder')} {...form.register('address_line1')} error={form.formState.errors.address_line1?.message} />
            </FieldBlock>
          </div>
          <div className="md:col-span-2">
            <FieldBlock label={t('onboarding.fields.addressLine2')} helper={t('onboarding.fields.addressLine2Helper')} error={form.formState.errors.address_line2?.message}>
              <Input leftIcon={<HiMiniMapPin className="size-4" />} placeholder={t('onboarding.fields.addressLine2Placeholder')} {...form.register('address_line2')} error={form.formState.errors.address_line2?.message} />
            </FieldBlock>
          </div>
          <FieldBlock label={t('onboarding.fields.city')} helper={t('onboarding.fields.cityHelper')} error={form.formState.errors.city?.message}>
            <Input leftIcon={<HiMiniBuildingOffice2 className="size-4" />} placeholder={t('onboarding.fields.cityPlaceholder')} {...form.register('city')} error={form.formState.errors.city?.message} />
          </FieldBlock>
          <FieldBlock label={t('onboarding.fields.region')} helper={t('onboarding.fields.regionHelper')} error={form.formState.errors.region?.message}>
            <Input leftIcon={<HiMiniMapPin className="size-4" />} placeholder={t('onboarding.fields.regionPlaceholder')} {...form.register('region')} error={form.formState.errors.region?.message} />
          </FieldBlock>
          <FieldBlock label={t('onboarding.fields.postalCode')} helper={t('onboarding.fields.postalCodeHelper')} error={form.formState.errors.postal_code?.message}>
            <Input leftIcon={<HiMiniHashtag className="size-4" />} placeholder={t('onboarding.fields.postalCodePlaceholder')} {...form.register('postal_code')} error={form.formState.errors.postal_code?.message} />
          </FieldBlock>
          <FieldBlock label={t('onboarding.fields.country')} helper={t('onboarding.fields.countryHelper')} error={form.formState.errors.country?.message}>
            <Select leftIcon={<HiMiniGlobeAlt className="size-4" />} {...form.register('country')} error={form.formState.errors.country?.message}>
              {countryOptions.map((country) => (
                <option key={country.value} value={country.value}>{country.label}</option>
              ))}
            </Select>
          </FieldBlock>
        </div>
        <div className="rounded-[1rem] border border-border bg-surface-2 p-3.5">
          <div className="mb-4 flex items-center gap-2">
            <HiMiniMapPin className="size-5 text-primary" />
            <p className="text-sm font-semibold text-foreground">{t('onboarding.fields.advancedCoordinates')}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <FieldBlock label={t('onboarding.fields.latitude')} helper={t('onboarding.fields.latitudeHelper')} error={form.formState.errors.latitude?.message}>
              <Input leftIcon={<HiMiniMapPin className="size-4" />} type="number" step="any" placeholder={t('onboarding.fields.latitudePlaceholder')} {...form.register('latitude')} error={form.formState.errors.latitude?.message} />
            </FieldBlock>
            <FieldBlock label={t('onboarding.fields.longitude')} helper={t('onboarding.fields.longitudeHelper')} error={form.formState.errors.longitude?.message}>
              <Input leftIcon={<HiMiniMapPin className="size-4" />} type="number" step="any" placeholder={t('onboarding.fields.longitudePlaceholder')} {...form.register('longitude')} error={form.formState.errors.longitude?.message} />
            </FieldBlock>
          </div>
        </div>
        <MutationErrorText error={mutation.error} />
        <StepActions backHref="/onboarding/category" submitLabel={t('common.buttons.saveAndContinue')} submitting={mutation.isPending} />
      </form>
    </OnboardingShell>
  )
}

export function ContactStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'validation', 'common'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const initial = deriveBusinessFromDraft(business, draft)
  const form = useForm({
    resolver: zodResolver(createContactSchema(t)),
    values: {
      phone: initial.phone,
      email: initial.email,
      website: initial.website,
      social_facebook: initial.social_facebook,
      social_instagram: initial.social_instagram,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: {
      phone: string
      email: string
      website?: string
      social_facebook?: string
      social_instagram?: string
    }) => {
      if (!business) throw new Error(t('common.errors.businessRequired'))
      const payload = {
        phone: values.phone,
        email: values.email,
        website: values.website || null,
        social_facebook: values.social_facebook || null,
        social_instagram: values.social_instagram || null,
      }
      const updated = await updateBusinessDetails(business.id, payload)
      save({
        businessId: updated.id,
        phone: values.phone,
        email: values.email,
        website: values.website || undefined,
        social_facebook: values.social_facebook || undefined,
        social_instagram: values.social_instagram || undefined,
      })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/media')
    },
  })

  return (
    <OnboardingShell>
      <form
        className="space-y-6"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <FieldBlock label={t('onboarding.fields.phone')} helper={t('onboarding.fields.phoneHelper')} error={form.formState.errors.phone?.message}>
            <Input leftIcon={<HiMiniPhone className="size-4" />} placeholder={t('onboarding.fields.phonePlaceholder')} {...form.register('phone')} error={form.formState.errors.phone?.message} />
          </FieldBlock>
          <FieldBlock label={t('onboarding.fields.email')} helper={t('onboarding.fields.emailHelper')} error={form.formState.errors.email?.message}>
            <Input leftIcon={<HiMiniEnvelope className="size-4" />} placeholder={t('onboarding.fields.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
          </FieldBlock>
          <div className="md:col-span-2">
            <FieldBlock label={t('onboarding.fields.website')} helper={t('onboarding.fields.websiteHelper')} error={form.formState.errors.website?.message}>
              <Input leftIcon={<HiMiniGlobeAlt className="size-4" />} placeholder={t('onboarding.fields.websitePlaceholder')} {...form.register('website')} error={form.formState.errors.website?.message} />
            </FieldBlock>
          </div>
          <FieldBlock label={t('onboarding.fields.facebook')} helper={t('onboarding.fields.facebookHelper')} error={form.formState.errors.social_facebook?.message}>
            <Input leftIcon={<HiMiniGlobeAlt className="size-4" />} placeholder={t('onboarding.fields.facebookPlaceholder')} {...form.register('social_facebook')} error={form.formState.errors.social_facebook?.message} />
          </FieldBlock>
          <FieldBlock label={t('onboarding.fields.instagram')} helper={t('onboarding.fields.instagramHelper')} error={form.formState.errors.social_instagram?.message}>
            <Input leftIcon={<HiMiniGlobeAlt className="size-4" />} placeholder={t('onboarding.fields.instagramPlaceholder')} {...form.register('social_instagram')} error={form.formState.errors.social_instagram?.message} />
          </FieldBlock>
        </div>
        <MutationErrorText error={mutation.error} />
        <StepActions backHref="/onboarding/location" submitLabel={t('common.buttons.saveAndContinue')} submitting={mutation.isPending} />
      </form>
    </OnboardingShell>
  )
}

export function MediaStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'common'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const [profileFile, setProfileFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const initial = deriveBusinessFromDraft(business, draft)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error(t('common.errors.businessRequired'))

      const updates: Partial<Business> = {}
      const uploadedPaths: string[] = []
      if (profileFile) {
        const uploaded = await uploadBusinessMediaAsset(business.id, profileFile, 'profile')
        uploadedPaths.push(uploaded.path)
        updates.profile_image_url = uploaded.publicUrl
      }
      if (coverFile) {
        const uploaded = await uploadBusinessMediaAsset(business.id, coverFile, 'cover')
        uploadedPaths.push(uploaded.path)
        updates.cover_image_url = uploaded.publicUrl
      }

      try {
        if (Object.keys(updates).length > 0) {
          await updateBusinessDetails(business.id, updates)
        }
      } catch (error) {
        if (uploadedPaths.length > 0) {
          await Promise.allSettled(uploadedPaths.map((path) => removeBusinessMediaAsset(path)))
        }
        throw error
      }

      save({
        businessId: business.id,
        profile_image_url: updates.profile_image_url ?? initial.profile_image_url ?? undefined,
        cover_image_url: updates.cover_image_url ?? initial.cover_image_url ?? undefined,
      })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/operations')
    },
  })

  return (
    <OnboardingShell>
      <div className="space-y-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.1rem] border border-border bg-elevated p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-weak text-primary">
                <HiMiniUserCircle className="size-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('onboarding.fields.profileImage')}</p>
                <p className="text-sm text-muted-foreground">{t('onboarding.fields.profileImageDescription')}</p>
              </div>
            </div>
            <FormField label={t('onboarding.fields.profileImage')} helper={t('onboarding.fields.uploadProfileHelper')} compact>
              <Input type="file" accept="image/*" onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <div className="mt-4 overflow-hidden rounded-[1rem] bg-surface-2">
              {profileFile ? (
                <LazyImage className="h-56 w-full object-cover" src={URL.createObjectURL(profileFile)} alt={t('onboarding.fields.profileImage')} />
              ) : initial.profile_image_url ? (
                <LazyImage className="h-56 w-full object-cover" src={initial.profile_image_url} alt={t('onboarding.fields.profileImage')} />
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{t('onboarding.fields.uploadProfile')}</div>
              )}
            </div>
          </div>

          <div className="rounded-[1.1rem] border border-border bg-elevated p-4">
            <div className="mb-4 flex items-center gap-3">
              <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-weak text-primary">
                <HiMiniPhoto className="size-6" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t('onboarding.fields.coverImage')}</p>
                <p className="text-sm text-muted-foreground">{t('onboarding.fields.coverImageDescription')}</p>
              </div>
            </div>
            <FormField label={t('onboarding.fields.coverImage')} helper={t('onboarding.fields.uploadCoverHelper')} compact>
              <Input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <div className="mt-4 overflow-hidden rounded-[1rem] bg-surface-2">
              {coverFile ? (
                <LazyImage className="h-56 w-full object-cover" src={URL.createObjectURL(coverFile)} alt={t('onboarding.fields.coverImage')} />
              ) : initial.cover_image_url ? (
                <LazyImage className="h-56 w-full object-cover" src={initial.cover_image_url} alt={t('onboarding.fields.coverImage')} />
              ) : (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">{t('onboarding.fields.uploadCover')}</div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link to="/onboarding/contact">
            <Button type="button" variant="outline">{t('common.buttons.back')}</Button>
          </Link>
          <MutationErrorText error={mutation.error} />
          <Button
            type="button"
            loading={mutation.isPending}
            loadingText={t('common.states.loading')}
            onClick={() => mutation.mutate()}
          >
            {t('common.buttons.saveAndContinue')}
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}

export function OperationsStep() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'validation', 'common'])
  const { data: business } = useBusiness()
  const { draft, save } = useDraft()
  const initial = deriveBusinessFromDraft(business, draft)
  const form = useForm({
    resolver: zodResolver(createOperatingHoursSchema(t)),
    values: operatingHoursToFormValues(parseOperatingHours(initial.operating_hours)),
  })
  const operationValues = useWatch({ control: form.control })

  const mutation = useMutation({
    mutationFn: async (values: ReturnType<typeof operatingHoursToFormValues>) => {
      if (!business) throw new Error(t('common.errors.businessRequired'))
      const operatingHours = formValuesToOperatingHours(values)
      const updated = await updateBusinessDetails(business.id, {
        operating_hours: operatingHours,
      })
      save({ businessId: updated.id, operating_hours: operatingHours as Json })
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/onboarding/review')
    },
  })

  return (
    <OnboardingShell>
      <form
        className="space-y-5"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        {WEEKDAY_ORDER.map((day) => {
          const closedField = `${day}_closed` as const
          const openField = `${day}_open` as const
          const closeField = `${day}_close` as const
          const closed = operationValues?.[closedField] ?? false
          return (
            <div key={day} className="rounded-[1rem] border border-border bg-elevated p-3.5">
              <div className="grid gap-4 lg:grid-cols-[170px_1fr_auto] lg:items-center">
                <div>
                  <p className="text-sm font-bold text-foreground">{t(`onboarding.weekdays.${day}`)}</p>
                  <p className="text-xs text-muted-foreground">{t('onboarding.fields.dayAvailability')}</p>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label={t('onboarding.fields.open')} helper={t('onboarding.fields.openHelper')} error={form.formState.errors[openField]?.message as string | undefined}>
                    <Input type="time" disabled={closed} {...form.register(openField)} />
                  </FieldBlock>
                  <FieldBlock label={t('onboarding.fields.close')} helper={t('onboarding.fields.closeHelper')} error={form.formState.errors[closeField]?.message as string | undefined}>
                    <Input type="time" disabled={closed} {...form.register(closeField)} />
                  </FieldBlock>
                </div>
                <label className="inline-flex items-center gap-3 rounded-[0.8rem] bg-surface-2 px-3 py-2.5 text-sm font-semibold text-foreground">
                  <input type="checkbox" className="size-4 rounded border-border" {...form.register(closedField)} />
                  {t('onboarding.fields.closed')}
                </label>
              </div>
            </div>
          )
        })}
        <MutationErrorText error={mutation.error} />
        <StepActions backHref="/onboarding/media" submitLabel={t('common.buttons.saveAndContinue')} submitting={mutation.isPending} />
      </form>
    </OnboardingShell>
  )
}

function ReviewPanel({
  title,
  icon,
  children,
  editHref,
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  editHref: string
}) {
  const { t } = useAppTranslation('common')

  return (
    <div className="rounded-[1.05rem] border border-border bg-elevated p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="inline-flex size-11 items-center justify-center rounded-2xl bg-primary-weak text-primary">
            {icon}
          </div>
          <p className="font-bold text-foreground">{title}</p>
        </div>
        <Link to={editHref} className="text-sm font-semibold text-primary">{t('common.buttons.edit')}</Link>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
    </div>
  )
}

export function ReviewStep() {
  const { t } = useAppTranslation(['onboarding', 'common'])
  const snapshot = deriveBusinessFromDraft(useBusiness().data, useDraft().draft)
  const hours = parseOperatingHours(snapshot.operating_hours)
  const categories = useBusinessCategories()
  const categoryName = useMemo(
    () => categories.data?.find((category) => category.id === snapshot.category_id)?.name ?? t('common.states.notProvided'),
    [categories.data, snapshot.category_id, t],
  )

  return (
    <OnboardingShell>
      <div className="space-y-5">
        <div className="grid gap-5 lg:grid-cols-2">
          <ReviewPanel title={t('onboarding.review.businessIdentity')} icon={<HiMiniBuildingOffice2 className="size-5" />} editHref="/onboarding/business-info">
            <p><span className="font-semibold text-foreground">{t('common.fields.name')}:</span> {snapshot.name || t('common.states.missing')}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.description')}:</span> {snapshot.description || t('common.states.missing')}</p>
          </ReviewPanel>
          <ReviewPanel title={t('onboarding.review.category')} icon={<HiMiniRectangleGroup className="size-5" />} editHref="/onboarding/category">
            <p><span className="font-semibold text-foreground">{t('common.fields.category')}:</span> {categoryName}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.subcategory')}:</span> {snapshot.subcategory || t('common.states.missing')}</p>
          </ReviewPanel>
          <ReviewPanel title={t('onboarding.review.location')} icon={<HiMiniMapPin className="size-5" />} editHref="/onboarding/location">
            <p>{snapshot.address_line1 || t('common.states.missing')} {snapshot.address_line2 || ''}</p>
            <p>{snapshot.city || t('common.states.missing')}, {snapshot.region || t('common.states.missing')} {snapshot.postal_code || ''}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.country')}:</span> {snapshot.country}</p>
          </ReviewPanel>
          <ReviewPanel title={t('onboarding.review.contact')} icon={<HiMiniUserCircle className="size-5" />} editHref="/onboarding/contact">
            <p><span className="font-semibold text-foreground">{t('common.fields.phone')}:</span> {snapshot.phone || t('common.states.missing')}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.email')}:</span> {snapshot.email || t('common.states.missing')}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.website')}:</span> {snapshot.website || t('common.states.notProvided')}</p>
          </ReviewPanel>
          <ReviewPanel title={t('onboarding.review.media')} icon={<HiMiniPhoto className="size-5" />} editHref="/onboarding/media">
            <p><span className="font-semibold text-foreground">{t('onboarding.review.profileImage')}:</span> {snapshot.profile_image_url ? t('common.states.uploaded') : t('common.states.missing')}</p>
            <p><span className="font-semibold text-foreground">{t('onboarding.review.coverImage')}:</span> {snapshot.cover_image_url ? t('common.states.uploaded') : t('common.states.missing')}</p>
          </ReviewPanel>
          <ReviewPanel title={t('onboarding.review.hours')} icon={<HiMiniClock className="size-5" />} editHref="/onboarding/operations">
            {WEEKDAY_ORDER.map((day) => (
              <p key={day}>
                <span className="font-semibold text-foreground">{t(`onboarding.weekdays.${day}`)}:</span>{' '}
                {hours[day].closed ? t('onboarding.fields.closed') : `${hours[day].open} - ${hours[day].close}`}
              </p>
            ))}
          </ReviewPanel>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/onboarding/operations">
            <Button type="button" variant="outline">{t('common.buttons.back')}</Button>
          </Link>
          <Link to="/onboarding/payment">
            <Button>{t('onboarding.actions.payment')}</Button>
          </Link>
        </div>
      </div>
    </OnboardingShell>
  )
}

export function PaymentStep() {
  const navigate = useNavigate()
  const { t, locale } = useAppTranslation(['onboarding', 'common'])
  const plans = useSubscriptionPlans()
  const { data: business } = useBusiness()
  const profile = useProfile()
  const plan = plans.data?.[0] ?? null
  const isAdmin = profile.data?.role === 'admin'

  const mutation = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error(t('common.errors.businessRequired'))

      if (isAdmin) {
        const { error } = await supabase
          .from('businesses')
          .update({
            subscription_status: 'active',
            onboarding_completed: true,
            is_active: true,
            one_time_fee_paid: true,
            subscription_started_at: new Date().toISOString(),
          })
          .eq('id', business.id)

        if (error) throw error
        return { mode: 'admin_bypass' as const }
      }

      if (!plan) throw new Error(t('onboarding.payment.noPlan'))
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: {
          variant_id: plan.lemon_squeezy_variant_id,
          plan_type: 'business',
          redirect_url: `${appEnv.appUrl}/onboarding/complete`,
          custom_data: {
            business_id: business.id,
          },
        },
      })

      if (error) throw error
      if (!data?.checkout_url) throw new Error(t('onboarding.payment.checkoutError'))
      return {
        mode: 'checkout' as const,
        checkoutUrl: data.checkout_url as string,
      }
    },
    onSuccess: async (result) => {
      if (result.mode === 'admin_bypass') {
        await Promise.all([
          profile.refetch(),
          plans.refetch(),
        ])
        navigate('/dashboard', { replace: true })
        return
      }

      window.location.assign(result.checkoutUrl)
    },
  })

  return (
    <OnboardingShell>
      <div className="space-y-6">
        <div className="rounded-[1.15rem] border border-border bg-elevated p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('onboarding.payment.planEyebrow')}</p>
              <h2 className="mt-2 text-2xl font-extrabold text-foreground">
                {isAdmin ? t('onboarding.payment.adminBypassTitle') : plan?.name ?? t('onboarding.payment.fallbackPlan')}
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {isAdmin
                  ? t('onboarding.payment.adminBypassDescription')
                  : plan
                  ? t('onboarding.payment.monthlyWithSetup', {
                    monthly: formatCurrency(plan.price_monthly_cents / 100, locale),
                    setup: formatCurrency(plan.setup_fee_cents / 100, locale),
                  })
                  : t('onboarding.payment.noPlan')}
              </p>
            </div>
            <div className="rounded-[0.95rem] bg-primary-weak px-4 py-2.5 text-right">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">{t('onboarding.payment.readyEyebrow')}</p>
              <p className="mt-1 text-lg font-bold text-primary">{t('onboarding.payment.readyTitle')}</p>
            </div>
          </div>
        </div>
        <div className="rounded-[1.05rem] border border-warning-border bg-warning-bg p-4 text-sm text-warning-text">
          {isAdmin ? t('onboarding.payment.adminBypassNote') : t('onboarding.payment.billingNote')}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/onboarding/review">
            <Button type="button" variant="outline">{t('common.buttons.back')}</Button>
          </Link>
          <MutationErrorText error={mutation.error} />
          <Button
            disabled={!isAdmin && !plan}
            loading={mutation.isPending}
            loadingText={t('common.states.loading')}
            onClick={() => mutation.mutate()}
          >
            {isAdmin ? t('onboarding.actions.adminBypass') : t('onboarding.actions.checkout')}
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}

export function OnboardingCompletePage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['onboarding', 'common'])
  const { data: business, refetch } = useBusiness()
  const { reset } = useDraft()

  const finalize = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error(t('common.errors.businessRequired'))
      if (business.subscription_status !== 'active') {
        throw new Error(t('common.status.inactive'))
      }

      const { error } = await supabase.from('businesses').update({ onboarding_completed: true }).eq('id', business.id)
      if (error) throw error
    },
    onSuccess: async () => {
      reset()
      await invalidateBusinessContext(queryClient, user?.id)
      navigate('/dashboard')
    },
  })

  useEffect(() => {
    if (!business || business.subscription_status === 'active') return
    const timer = window.setInterval(() => {
      void refetch()
    }, 5000)
    return () => window.clearInterval(timer)
  }, [business, refetch])

  if (!business) {
    return <Navigate to="/onboarding/business-info" replace />
  }

  return (
    <OnboardingShell>
      <div className="space-y-6">
        <div className="rounded-[1.15rem] border border-border bg-elevated p-6">
          <div className="mb-6 inline-flex size-16 items-center justify-center rounded-3xl bg-primary-weak text-primary">
            <HiMiniCheck className="size-8" />
          </div>
          <h2 className="text-3xl font-extrabold text-foreground">{t('onboarding.complete.title', { status: t(`common.status.${business.subscription_status}`) })}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{t('onboarding.complete.description')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/onboarding/payment">
            <Button type="button" variant="outline">{t('common.buttons.back')}</Button>
          </Link>
          <MutationErrorText error={finalize.error} />
          <Button
            onClick={() => finalize.mutate()}
            disabled={business.subscription_status !== 'active'}
            loading={finalize.isPending}
            loadingText={t('common.states.loading')}
          >
            {business.subscription_status === 'active' ? t('onboarding.actions.complete') : t('onboarding.actions.waiting')}
          </Button>
        </div>
      </div>
    </OnboardingShell>
  )
}
