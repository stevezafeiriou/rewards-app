import { z } from 'zod'
import type { TFunction } from 'i18next'

function requiredString(t: TFunction, messageKey = 'validation.required') {
  return z.string().min(1, t(messageKey))
}

export function createLoginSchema(t: TFunction) {
  return z.object({
    email: z.email(t('validation.email')),
    password: z.string().min(8, t('validation.passwordMin')),
  })
}

export function createRegisterSchema(t: TFunction) {
  return z.object({
    firstName: z.string().min(2, t('validation.firstNameMin')).max(50, t('validation.firstNameMin')),
    lastName: z.string().min(2, t('validation.lastNameMin')).max(50, t('validation.lastNameMin')),
    email: z.email(t('validation.email')),
    password: z.string().min(8, t('validation.passwordMin')),
  })
}

export function createForgotPasswordSchema(t: TFunction) {
  return z.object({
    email: z.email(t('validation.email')),
  })
}

export function createResetPasswordSchema(t: TFunction) {
  return z
    .object({
      password: z.string().min(8, t('validation.passwordMin')),
      confirmPassword: z.string().min(8, t('validation.passwordMin')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ['confirmPassword'],
      message: t('validation.passwordsMatch'),
    })
}

export function createBusinessInfoSchema(t: TFunction) {
  return z.object({
    name: z.string().min(2, t('validation.businessName')).max(120, t('validation.businessName')),
    description: z.string().min(20, t('validation.businessDescription')).max(500, t('validation.businessDescription')),
  })
}

export function createCategorySchema(t: TFunction) {
  return z.object({
    categoryId: z.string().uuid(t('validation.required')),
    subcategory: z.string().min(2, t('validation.subcategory')).max(80, t('validation.subcategory')),
  })
}

export function createLocationSchema(t: TFunction) {
  return z.object({
    address_line1: z.string().min(3, t('validation.address')),
    address_line2: z.string().optional(),
    city: z.string().min(2, t('validation.city')),
    postal_code: z.string().min(3, t('validation.postalCode')),
    region: z.string().min(2, t('validation.region')),
    country: z.string().min(2, t('validation.country')).max(2, t('validation.country')),
    google_business_url: z.string().url(t('validation.url')).optional().or(z.literal('')),
  })
}

export function createContactSchema(t: TFunction) {
  return z.object({
    phone: z.string().min(6, t('validation.required')),
    email: z.email(t('validation.email')),
    website: z.string().url(t('validation.url')).optional().or(z.literal('')),
    social_facebook: z.string().url(t('validation.url')).optional().or(z.literal('')),
    social_instagram: z.string().url(t('validation.url')).optional().or(z.literal('')),
  })
}

export function createOfferSchema(t: TFunction) {
  return z.object({
    title: z.string().min(3, t('validation.offerTitle')).max(100, t('validation.offerTitle')),
    description: z.string().min(10, t('validation.offerDescription')).max(500, t('validation.offerDescription')),
    terms_conditions: z.string().max(1000, t('validation.termsMax')).optional().or(z.literal('')),
    offer_type: z.enum(['percentage_discount', 'fixed_discount', 'free_item', 'buy_one_get_one', 'custom']),
    discount_value: z.coerce.number().min(0, t('validation.nonNegative')).optional(),
    starts_at: requiredString(t, 'validation.startsAt'),
    expires_at: z.string().optional().or(z.literal('')),
    max_redemptions: z.coerce.number().min(0, t('validation.nonNegative')).optional(),
    min_purchase_amount: z.coerce.number().min(0, t('validation.nonNegative')).optional(),
    requires_paid_membership: z.boolean().default(false),
    status: z.enum(['draft', 'active']),
  })
}

export function createManualCustomerLookupSchema(t: TFunction) {
  return z.object({
    publicId: z.string().regex(/^\d{9}$/, t('validation.publicId')),
  })
}

export function createTransactionSchema(t: TFunction) {
  return z.object({
    amount_spent: z.coerce.number().min(0.01, t('validation.amountSpent')),
    offer_id: z.string().uuid(t('validation.required')).optional().or(z.literal('')),
    notes: z.string().max(500, t('validation.notesMax')).optional().or(z.literal('')),
  })
}

export function createSupportTicketSchema(t: TFunction) {
  return z.object({
    subject: z.string().min(4, t('validation.ticketSubject')).max(120, t('validation.ticketSubject')),
    description: z.string().min(10, t('validation.ticketDescription')).max(2000, t('validation.ticketDescription')),
    type: z.enum(['general', 'billing', 'card', 'technical', 'business']),
    priority: z.enum(['low', 'medium', 'high']),
  })
}

export function createSupportReplySchema(t: TFunction) {
  return z.object({
    message: z.string().min(1, t('validation.message')).max(2000, t('validation.ticketDescription')),
  })
}

function createTimeField(t: TFunction) {
  return z.string().regex(/^\d{2}:\d{2}$/, t('validation.time'))
}

export function createOperatingHoursSchema(t: TFunction) {
  const timeField = createTimeField(t)

  return z.object({
    monday_closed: z.boolean(),
    monday_open: timeField,
    monday_close: timeField,
    tuesday_closed: z.boolean(),
    tuesday_open: timeField,
    tuesday_close: timeField,
    wednesday_closed: z.boolean(),
    wednesday_open: timeField,
    wednesday_close: timeField,
    thursday_closed: z.boolean(),
    thursday_open: timeField,
    thursday_close: timeField,
    friday_closed: z.boolean(),
    friday_open: timeField,
    friday_close: timeField,
    saturday_closed: z.boolean(),
    saturday_open: timeField,
    saturday_close: timeField,
    sunday_closed: z.boolean(),
    sunday_open: timeField,
    sunday_close: timeField,
  })
}
