import { supabase } from '@/lib/supabase'
import type { Business, BusinessOperatingHours } from '@/types/app'

const BUSINESS_MEDIA_BUCKET = 'business-media'

function fileExtension(file: File) {
  return file.name.split('.').pop() ?? 'jpg'
}

export async function generateBusinessSlug(name: string) {
  const { data, error } = await supabase.rpc('generate_business_slug', { p_name: name })
  if (error) throw error
  return data as string
}

export async function upsertBusinessInfo(params: {
  userId: string
  business: Business | null
  values: {
    name: string
    description: string
  }
}) {
  const { userId, business, values } = params
  const shouldRegenerateSlug = !business || business.name.trim() !== values.name.trim()
  const slug = shouldRegenerateSlug ? await generateBusinessSlug(values.name) : business.slug

  if (!business) {
    const businessId = crypto.randomUUID()
    const { error } = await supabase
      .from('businesses')
      .insert({
        id: businessId,
        owner_id: userId,
        name: values.name,
        description: values.description,
        slug,
      })

    if (error) throw error

    const { error: staffError } = await supabase.from('business_staff').upsert(
      {
        business_id: businessId,
        user_id: userId,
        staff_role: 'owner',
      },
      { onConflict: 'business_id,user_id', ignoreDuplicates: false },
    )

    if (staffError) throw staffError

    const { data: created, error: fetchError } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single()

    if (fetchError) throw fetchError
    return created
  }

  const { data: updated, error } = await supabase
    .from('businesses')
    .update({
      name: values.name,
      description: values.description,
      ...(shouldRegenerateSlug ? { slug } : {}),
    })
    .eq('id', business.id)
    .select('*')
    .single()

  if (error) throw error

  const { error: staffError } = await supabase.from('business_staff').upsert(
    {
      business_id: business.id,
      user_id: userId,
      staff_role: 'owner',
    },
    { onConflict: 'business_id,user_id', ignoreDuplicates: false },
  )

  if (staffError) throw staffError
  return updated
}

export async function updateBusinessDetails(businessId: string, payload: Partial<Business>) {
  const { data, error } = await supabase
    .from('businesses')
    .update(payload)
    .eq('id', businessId)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function uploadBusinessMediaAsset(businessId: string, file: File, target: 'profile' | 'cover') {
  const path = `${businessId}/${target}-${Date.now()}.${fileExtension(file)}`
  const { error } = await supabase.storage.from(BUSINESS_MEDIA_BUCKET).upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  })

  if (error) throw error

  const publicUrl = supabase.storage.from(BUSINESS_MEDIA_BUCKET).getPublicUrl(path).data.publicUrl
  return { path, publicUrl }
}

export async function removeBusinessMediaAsset(path: string) {
  const { error } = await supabase.storage.from(BUSINESS_MEDIA_BUCKET).remove([path])
  if (error) throw error
}

export function normalizeOperatingHours(hours: BusinessOperatingHours) {
  return hours satisfies BusinessOperatingHours
}
