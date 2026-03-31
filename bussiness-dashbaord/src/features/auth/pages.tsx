import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { HiOutlineArrowPath } from 'react-icons/hi2'
import googleLogo from '@/assets/google.png'
import { AuthShell } from '@/components/layout/auth-shell'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/features/auth/auth-provider'
import { invalidateBusinessContext } from '@/features/business/cache'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { appEnv } from '@/lib/env'
import {
  createForgotPasswordSchema,
  createLoginSchema,
  createRegisterSchema,
  createResetPasswordSchema,
} from '@/lib/schemas'
import { supabase } from '@/lib/supabase'

type LoginValues = {
  email: string
  password: string
}

type RegisterValues = {
  firstName: string
  lastName: string
  email: string
  password: string
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

export function LandingPage() {
  const { user } = useAuth()
  const { t } = useAppTranslation(['auth'])

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <AuthShell
      title={t('auth.landing.title')}
      description={t('auth.landing.description')}
      asideTitle={t('auth.landing.asideTitle')}
      asideDescription={t('auth.landing.asideDescription')}
    >
      <div className="space-y-4">
        <div className="app-card p-6">
          <p className="text-sm text-muted-foreground">{t('auth.landing.cardDescription')}</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Link to="/auth/register"><Button full>{t('auth.landing.register')}</Button></Link>
          <Link to="/auth/login"><Button full variant="outline">{t('auth.landing.login')}</Button></Link>
        </div>
      </div>
    </AuthShell>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useAppTranslation(['auth', 'validation'])
  const form = useForm<LoginValues>({
    resolver: zodResolver(createLoginSchema(t)),
    defaultValues: { email: '', password: '' },
  })

  const login = useMutation({
    mutationFn: async (values: LoginValues) => {
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      })
      if (error) throw error
    },
    onSuccess: () => {
      navigate((location.state as { redirectTo?: string } | null)?.redirectTo ?? '/dashboard')
    },
  })

  return (
    <AuthShell
      title={t('auth.login.title')}
      description={t('auth.login.description')}
      asideTitle={t('auth.login.asideTitle')}
      asideDescription={t('auth.login.asideDescription')}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => login.mutate(values))}
      >
        <FormField label={t('common.fields.email')} helper={t('auth.login.emailHelper')} error={form.formState.errors.email?.message}>
          <Input placeholder={t('auth.login.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
        </FormField>
        <FormField label={t('auth.login.passwordPlaceholder')} helper={t('auth.login.passwordHelper')} error={form.formState.errors.password?.message}>
          <Input type="password" placeholder={t('auth.login.passwordPlaceholder')} {...form.register('password')} error={form.formState.errors.password?.message} />
        </FormField>
        <Button full type="submit" loading={login.isPending} loadingText={t('auth.login.submitting')}>
          {t('auth.login.submit')}
        </Button>
      </form>

      <div className="relative my-5 text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <span className="bg-elevated px-3">{t('auth.login.or')}</span>
      </div>

      <Button
        full
        variant="outline"
        disabled={!appEnv.googleOAuthEnabled}
        leftIcon={<img className="h-4 w-4 object-contain" src={googleLogo} alt="" aria-hidden="true" />}
      >
        {t('auth.login.continueWithGoogle')}
      </Button>
      {!appEnv.googleOAuthEnabled ? (
        <p className="text-center text-xs text-muted-foreground">{t('auth.login.googleDisabled')}</p>
      ) : null}

      <div className="flex justify-between text-sm text-muted-foreground">
        <Link to="/auth/forgot-password" className="text-primary">{t('auth.login.forgotPassword')}</Link>
        <Link to="/auth/register" className="text-primary">{t('auth.login.createAccount')}</Link>
      </div>
    </AuthShell>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const { t } = useAppTranslation(['auth', 'validation'])
  const form = useForm<RegisterValues>({
    resolver: zodResolver(createRegisterSchema(t)),
    defaultValues: { firstName: '', lastName: '', email: '', password: '' },
  })

  const register = useMutation({
    mutationFn: async (values: RegisterValues) => {
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${appEnv.appUrl}/auth/callback`,
          data: {
            role: 'business',
            first_name: values.firstName,
            last_name: values.lastName,
          },
        },
      })
      if (error) throw error
    },
    onSuccess: () => {
      navigate('/auth/login')
    },
  })

  return (
    <AuthShell
      title={t('auth.register.title')}
      description={t('auth.register.description')}
      asideTitle={t('auth.register.asideTitle')}
      asideDescription={t('auth.register.asideDescription')}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => register.mutate(values))}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t('auth.register.firstNamePlaceholder')} helper={t('auth.register.firstNameHelper')} error={form.formState.errors.firstName?.message}>
            <Input placeholder={t('auth.register.firstNamePlaceholder')} {...form.register('firstName')} error={form.formState.errors.firstName?.message} />
          </FormField>
          <FormField label={t('auth.register.lastNamePlaceholder')} helper={t('auth.register.lastNameHelper')} error={form.formState.errors.lastName?.message}>
            <Input placeholder={t('auth.register.lastNamePlaceholder')} {...form.register('lastName')} error={form.formState.errors.lastName?.message} />
          </FormField>
        </div>
        <FormField label={t('common.fields.email')} helper={t('auth.register.emailHelper')} error={form.formState.errors.email?.message}>
          <Input placeholder={t('auth.register.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
        </FormField>
        <FormField label={t('auth.register.passwordPlaceholder')} helper={t('auth.register.passwordHelper')} error={form.formState.errors.password?.message}>
          <Input type="password" placeholder={t('auth.register.passwordPlaceholder')} {...form.register('password')} error={form.formState.errors.password?.message} />
        </FormField>
        <Button full type="submit" loading={register.isPending} loadingText={t('auth.register.submitting')}>
          {t('auth.register.submit')}
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        {t('auth.register.alreadyHaveAccount')} <Link className="text-primary" to="/auth/login">{t('auth.register.signIn')}</Link>
      </p>
    </AuthShell>
  )
}

export function ForgotPasswordPage() {
  const { t } = useAppTranslation(['auth', 'validation', 'common'])
  const form = useForm<{ email: string }>({
    resolver: zodResolver(createForgotPasswordSchema(t)),
    defaultValues: { email: '' },
  })

  const reset = useMutation({
    mutationFn: async (values: { email: string }) => {
      const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
        redirectTo: `${appEnv.appUrl}/auth/reset-password`,
      })
      if (error) throw error
    },
  })

  return (
    <AuthShell
      title={t('auth.forgotPassword.title')}
      description={t('auth.forgotPassword.description')}
      asideTitle={t('auth.forgotPassword.asideTitle')}
      asideDescription={t('auth.forgotPassword.asideDescription')}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => reset.mutate(values))}
      >
        <FormField label={t('common.fields.email')} helper={t('auth.forgotPassword.emailHelper')} error={form.formState.errors.email?.message}>
          <Input placeholder={t('auth.forgotPassword.emailPlaceholder')} {...form.register('email')} error={form.formState.errors.email?.message} />
        </FormField>
        <Button full type="submit" loading={reset.isPending} loadingText={t('common.states.loading')}>
          {t('auth.forgotPassword.submit')}
        </Button>
      </form>
    </AuthShell>
  )
}

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const { t } = useAppTranslation(['auth', 'validation', 'common'])
  const form = useForm<{ password: string; confirmPassword: string }>({
    resolver: zodResolver(createResetPasswordSchema(t)),
    defaultValues: { password: '', confirmPassword: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: { password: string }) => {
      const { error } = await supabase.auth.updateUser({ password: values.password })
      if (error) throw error
    },
    onSuccess: () => navigate('/auth/login'),
  })

  return (
    <AuthShell
      title={t('auth.resetPassword.title')}
      description={t('auth.resetPassword.description')}
      asideTitle={t('auth.resetPassword.asideTitle')}
      asideDescription={t('auth.resetPassword.asideDescription')}
    >
      <form
        className="space-y-4"
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
      >
        <FormField label={t('auth.resetPassword.passwordPlaceholder')} helper={t('auth.resetPassword.passwordHelper')} error={form.formState.errors.password?.message}>
          <Input type="password" placeholder={t('auth.resetPassword.passwordPlaceholder')} {...form.register('password')} error={form.formState.errors.password?.message} />
        </FormField>
        <FormField label={t('auth.resetPassword.confirmPasswordPlaceholder')} helper={t('auth.resetPassword.confirmPasswordHelper')} error={form.formState.errors.confirmPassword?.message}>
          <Input type="password" placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')} {...form.register('confirmPassword')} error={form.formState.errors.confirmPassword?.message} />
        </FormField>
        <Button full type="submit" loading={mutation.isPending} loadingText={t('common.states.loading')}>
          {t('auth.resetPassword.submit')}
        </Button>
      </form>
    </AuthShell>
  )
}

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { t } = useAppTranslation(['auth'])

  const callback = useMutation({
    mutationFn: async () => {
      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) throw sessionError
      if (!data.session?.user) {
        throw new Error(t('auth.callback.sessionMissing'))
      }

      const { error } = await supabase.rpc('ensure_profile_for_role', { p_role: 'business' })
      if (error) throw error
    },
    onSuccess: async () => {
      await invalidateBusinessContext(queryClient)
      navigate('/dashboard')
    },
  })

  useEffect(() => {
    if (!callback.isPending && !callback.isSuccess && !callback.isError) {
      callback.mutate()
    }
  }, [callback])

  return (
    <AuthShell
      title={t('auth.callback.title')}
      description={t('auth.callback.description')}
      asideTitle={t('auth.callback.asideTitle')}
      asideDescription={t('auth.callback.asideDescription')}
    >
      <div className="app-card flex flex-col items-center gap-4 p-8 text-center">
        <HiOutlineArrowPath className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">
          {callback.isError
            ? getErrorMessage(callback.error, t('auth.callback.failed'))
            : t('auth.callback.loading')}
        </p>
      </div>
    </AuthShell>
  )
}
