import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
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
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAuth } from '@/features/auth/auth-provider'
import { useTicket, useTicketMessages, useTickets } from '@/features/business/hooks'
import { useAppTranslation } from '@/i18n/use-app-translation'
import { createSupportReplySchema, createSupportTicketSchema } from '@/lib/schemas'
import { queryKeys } from '@/lib/query-keys'
import { supabase } from '@/lib/supabase'
import { getToastErrorMessage, toastPromise } from '@/lib/toast'
import { formatDate } from '@/lib/utils'

export function SupportPage() {
  const navigate = useNavigate()
  const tickets = useTickets()
  const { t } = useAppTranslation(['support', 'common'])

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('support.header.eyebrow')} title={t('support.header.title')} description={t('support.header.description')} actions={<Link to="/support/new"><Button>{t('support.header.create')}</Button></Link>} />
      {tickets.isLoading ? (
        <PageSkeleton cards={3} rows={2} />
      ) : tickets.data && tickets.data.length > 0 ? (
        <div className="space-y-4">
          {tickets.data.map((ticket) => (
            <Link key={ticket.id} to={`/support/tickets/${ticket.id}`}>
              <Card>
                <CardContent className="flex flex-wrap items-center justify-between gap-4 p-6">
                  <div className="space-y-2">
                    <p className="text-lg font-bold text-foreground">{ticket.subject}</p>
                    <p className="text-sm text-muted-foreground">{ticket.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge tone="neutral">{t(`common.status.${ticket.type}`)}</Badge>
                    <Badge tone={ticket.status === 'resolved' || ticket.status === 'closed' ? 'success' : 'warning'}>{t(`common.status.${ticket.status}`)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title={t('support.list.emptyTitle')} description={t('support.list.emptyDescription')} actionLabel={t('support.list.action')} onAction={() => { navigate('/support/new') }} />
      )}
    </div>
  )
}

export function NewTicketPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t } = useAppTranslation(['support', 'validation', 'common'])
  const form = useForm({
    resolver: zodResolver(createSupportTicketSchema(t)),
    defaultValues: {
      subject: '',
      description: '',
      type: 'business' as const,
      priority: 'medium' as const,
    },
  })

  const mutation = useMutation({
    mutationFn: async (values: { subject: string; description: string; type: string; priority: 'low' | 'medium' | 'high' }) => {
      if (!user) throw new Error(t('common.errors.authRequired'))
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          created_by: user.id,
          subject: values.subject,
          description: values.description,
          type: values.type,
          priority: values.priority,
          metadata: {},
        })
        .select('id')
        .single()

      if (error) throw error
      return data.id
    },
    onSuccess: async (ticketId) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.tickets })
      navigate(`/support/tickets/${ticketId}`)
    },
  })

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('support.header.eyebrow')} title={t('support.header.newTitle')} />
      <Card>
        <CardHeader>
          <CardTitle>{t('support.form.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 lg:grid-cols-2"
            onSubmit={form.handleSubmit(async (values) => {
              await toastPromise(mutation.mutateAsync(values), {
                loading: t('support.form.toast.loading'),
                success: t('support.form.toast.success'),
                error: (error: unknown) => getToastErrorMessage(error, t('support.form.toast.error')),
              })
            })}
          >
            <div className="lg:col-span-2">
              <FormField label={t('support.form.subject')} error={form.formState.errors.subject?.message}>
                <Input placeholder={t('support.form.subjectPlaceholder')} {...form.register('subject')} error={form.formState.errors.subject?.message} />
              </FormField>
            </div>
            <FormField label={t('support.form.type')} error={form.formState.errors.type?.message}>
              <Select {...form.register('type')} error={form.formState.errors.type?.message}>
                <option value="business">{t('common.status.business')}</option>
                <option value="billing">{t('common.status.billing')}</option>
                <option value="technical">{t('common.status.technical')}</option>
                <option value="card">{t('common.status.card')}</option>
                <option value="general">{t('common.status.general')}</option>
              </Select>
            </FormField>
            <FormField label={t('support.form.priority')} error={form.formState.errors.priority?.message}>
              <Select {...form.register('priority')} error={form.formState.errors.priority?.message}>
                <option value="low">{t('common.status.low')}</option>
                <option value="medium">{t('common.status.medium')}</option>
                <option value="high">{t('common.status.high')}</option>
              </Select>
            </FormField>
            <div className="lg:col-span-2">
              <FormField label={t('support.form.details')} error={form.formState.errors.description?.message}>
                <Textarea placeholder={t('support.form.descriptionPlaceholder')} {...form.register('description')} error={form.formState.errors.description?.message} />
              </FormField>
            </div>
            <div className="lg:col-span-2">
              <Button type="submit" loading={mutation.isPending} loadingText={t('support.form.submitting')}>
                {t('support.form.submit')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export function TicketDetailPage() {
  const { ticketId } = useParams()
  const queryClient = useQueryClient()
  const { user } = useAuth()
  const { t, locale } = useAppTranslation(['support', 'validation', 'common'])
  const ticket = useTicket(ticketId)
  const messages = useTicketMessages(ticketId)
  const form = useForm({
    resolver: zodResolver(createSupportReplySchema(t)),
    defaultValues: { message: '' },
  })

  const mutation = useMutation({
    mutationFn: async (values: { message: string }) => {
      if (!user || !ticketId) throw new Error(t('common.errors.contextMissing'))
      const { error } = await supabase.from('support_ticket_messages').insert({
        ticket_id: ticketId,
        sender_id: user.id,
        message: values.message,
        is_internal: false,
      })
      if (error) throw error
    },
    onSuccess: async () => {
      form.reset()
      await queryClient.invalidateQueries({ queryKey: queryKeys.ticketMessages(ticketId) })
    },
  })

  if (!ticketId) return <Navigate to="/support" replace />
  if (ticket.isLoading || messages.isLoading) return <PageSkeleton cards={2} rows={4} />
  if (!ticket.data) {
    return (
      <AppStatusPage
        code={t('common.notFound.code')}
        title={t('common.notFound.title')}
        description={t('common.notFound.description')}
        primaryAction={{ label: t('common.buttons.goToSupport'), to: '/support' }}
        fullscreen={false}
      />
    )
  }

  return (
    <div className="space-y-6">
      <PageHeader eyebrow={t('support.header.eyebrow')} title={ticket.data.subject} />
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={ticket.data.status === 'resolved' || ticket.data.status === 'closed' ? 'success' : 'warning'}>{t(`common.status.${ticket.data.status}`)}</Badge>
            <Badge tone="neutral">{t(`common.status.${ticket.data.priority}`)}</Badge>
            <Badge tone="primary">{t(`common.status.${ticket.data.type}`)}</Badge>
          </div>
          <CardDescription>{ticket.data.description}</CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>{t('support.ticket.conversationTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.data && messages.data.length > 0 ? messages.data.map((message) => (
            <div key={message.id} className="rounded-[1.4rem] bg-surface-2 p-4">
              <p className="text-sm text-foreground">{message.message}</p>
              <p className="mt-2 text-xs text-muted-foreground">{formatDate(message.created_at, undefined, locale)}</p>
            </div>
          )) : <EmptyState title={t('support.ticket.emptyTitle')} description={t('support.ticket.emptyDescription')} />}
          <form
            className="space-y-4"
            onSubmit={form.handleSubmit(async (values) => {
              await toastPromise(mutation.mutateAsync(values), {
                loading: t('support.ticket.toast.loading'),
                success: t('support.ticket.toast.success'),
                error: (error: unknown) => getToastErrorMessage(error, t('support.ticket.toast.error')),
              })
            })}
          >
            <FormField label={t('support.ticket.replySubmit')} error={form.formState.errors.message?.message}>
              <Textarea placeholder={t('support.ticket.replyPlaceholder')} {...form.register('message')} error={form.formState.errors.message?.message} />
            </FormField>
            <Button type="submit" loading={mutation.isPending} loadingText={t('support.ticket.replying')}>
              {t('support.ticket.replySubmit')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
