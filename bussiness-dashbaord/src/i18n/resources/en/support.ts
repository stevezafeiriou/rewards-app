const support = {
  header: {
    eyebrow: 'Support',
    title: 'Support',
    description: 'Open and track support requests.',
    create: 'Create ticket',
    newTitle: 'New ticket',
  },
  list: {
    emptyTitle: 'No tickets yet',
    emptyDescription: 'Create a ticket when you need help.',
    action: 'Create ticket',
  },
  form: {
    title: 'Ticket details',
    subject: 'Subject',
    subjectPlaceholder: 'Example: Billing issue',
    type: 'Category',
    priority: 'Priority',
    details: 'Details',
    descriptionPlaceholder: 'Describe the issue',
    submit: 'Create ticket',
    submitting: 'Creating...',
    toast: {
      loading: 'Creating support ticket...',
      success: 'Support ticket created.',
      error: 'Could not create support ticket.',
    },
  },
  ticket: {
    conversationTitle: 'Conversation',
    emptyTitle: 'No replies yet',
    emptyDescription: 'Send a message to continue.',
    replyPlaceholder: 'Write your message',
    replySubmit: 'Send reply',
    replying: 'Sending...',
    toast: {
      loading: 'Sending reply...',
      success: 'Reply sent successfully.',
      error: 'Could not send reply.',
    },
  },
} as const

export default support
