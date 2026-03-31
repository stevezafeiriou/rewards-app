import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { PageSkeleton } from '@/components/layout/page-skeleton'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { LazyImage } from '@/components/ui/lazy-image'
import { Textarea } from '@/components/ui/textarea'
import { invalidateBusinessContext } from '@/features/business/cache'
import { useBusiness } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { createContactSchema } from '@/lib/schemas'
import { supabase } from '@/lib/supabase'

const BUSINESS_MEDIA_BUCKET = 'business-media'

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
  const { t } = useAppTranslation(['profile', 'common'])
  const business = useBusiness()

  if (business.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (!business.data) return null

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('profile.header.eyebrow')} title={business.data.name} description={t('profile.header.description')} />
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          {business.data.cover_image_url ? <LazyImage className="h-72 w-full object-cover" src={business.data.cover_image_url} alt={business.data.name} /> : null}
          <CardContent className="space-y-4 p-6">
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
          <CardHeader>
            <CardTitle>{t('profile.view.detailsTitle')}</CardTitle>
            <CardDescription>{t('profile.view.detailsDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p><span className="font-semibold text-foreground">{t('profile.view.slug')}:</span> {business.data.slug}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.status')}:</span> {t(`common.status.${business.data.subscription_status}`)}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.location')}:</span> {business.data.address_line1 ?? t('common.states.missing')} {business.data.city ?? ''}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.phone')}:</span> {business.data.phone ?? t('common.states.missing')}</p>
            <p><span className="font-semibold text-foreground">{t('common.fields.website')}:</span> {business.data.website ?? t('common.states.missing')}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export function EditBusinessProfilePage() {
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
    },
  })

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
      <PageHeader eyebrow={t('profile.header.eyebrow')} title={t('profile.header.editTitle')} description={t('profile.header.editDescription')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.edit.title')}</CardTitle>
          <CardDescription>{t('profile.edit.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault()
              mutation.mutate()
            }}
          >
            <FormField label={t('common.fields.name')} helper={t('profile.edit.nameHelper')}>
              <Input placeholder={t('profile.edit.namePlaceholder')} {...descriptionForm.register('name')} />
            </FormField>
            <FormField label={t('common.fields.email')} helper={t('profile.edit.emailHelper')} error={form.formState.errors.email?.message}>
              <Input placeholder={t('profile.edit.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
            </FormField>
            <div className="lg:col-span-2">
              <FormField label={t('common.fields.description')} helper={t('profile.edit.descriptionHelper')}>
                <Textarea placeholder={t('profile.edit.descriptionPlaceholder')} {...descriptionForm.register('description')} />
              </FormField>
            </div>
            <FormField label={t('common.fields.phone')} helper={t('profile.edit.phoneHelper')} error={form.formState.errors.phone?.message}>
              <Input placeholder={t('profile.edit.phonePlaceholder')} {...form.register('phone')} error={form.formState.errors.phone?.message} />
            </FormField>
            <FormField label={t('common.fields.website')} helper={t('profile.edit.websiteHelper')} error={form.formState.errors.website?.message}>
              <Input placeholder={t('profile.edit.websitePlaceholder')} {...form.register('website')} error={form.formState.errors.website?.message} />
            </FormField>
            <FormField label={t('common.fields.location')} helper={t('profile.edit.addressHelper')}>
              <Input placeholder={t('profile.edit.addressPlaceholder')} {...descriptionForm.register('address_line1')} />
            </FormField>
            <FormField label={t('common.fields.city')} helper={t('profile.edit.cityHelper')}>
              <Input placeholder={t('profile.edit.cityPlaceholder')} {...descriptionForm.register('city')} />
            </FormField>
            <FormField label={t('common.fields.region')} helper={t('profile.edit.regionHelper')}>
              <Input placeholder={t('profile.edit.regionPlaceholder')} {...descriptionForm.register('region')} />
            </FormField>
            <FormField label={t('common.fields.postalCode')} helper={t('profile.edit.postalCodeHelper')}>
              <Input placeholder={t('profile.edit.postalCodePlaceholder')} {...descriptionForm.register('postal_code')} />
            </FormField>
            <FormField label="Facebook" helper={t('profile.edit.facebookHelper')} error={form.formState.errors.social_facebook?.message}>
              <Input placeholder={t('profile.edit.facebookPlaceholder')} {...form.register('social_facebook')} error={form.formState.errors.social_facebook?.message} />
            </FormField>
            <FormField label="Instagram" helper={t('profile.edit.instagramHelper')} error={form.formState.errors.social_instagram?.message}>
              <Input placeholder={t('profile.edit.instagramPlaceholder')} {...form.register('social_instagram')} error={form.formState.errors.social_instagram?.message} />
            </FormField>
            <FormField label={t('profile.edit.profileImageLabel')} helper={t('profile.edit.profileImageHelper')}>
              <Input type="file" accept="image/*" onChange={(event) => setProfileFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <FormField label={t('profile.edit.coverImageLabel')} helper={t('profile.edit.coverImageHelper')}>
              <Input type="file" accept="image/*" onChange={(event) => setCoverFile(event.target.files?.[0] ?? null)} />
            </FormField>
            <div className="lg:col-span-2">
              <Button type="submit" loading={mutation.isPending} loadingText={t('profile.edit.saving')}>
                {t('profile.edit.save')}
              </Button>
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
