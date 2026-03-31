const support = {
  header: {
    eyebrow: 'Support',
    title: 'Support hub',
    description: 'Business-side ticketing backed by `support_tickets` and `support_ticket_messages`.',
    create: 'Create ticket',
    newTitle: 'Create support ticket',
    newDescription: 'Open a support request directly from the business console.',
    detailDescription: 'Ticket detail and conversation thread for the selected support request.',
  },
  list: {
    emptyTitle: 'No support tickets yet',
    emptyDescription: 'Open your first ticket for billing, onboarding, technical, or business support.',
    action: 'Create ticket',
  },
  form: {
    title: 'Ticket details',
    description: 'Tickets are inserted directly into Supabase and immediately available in the list and detail routes.',
    subject: 'Subject',
    subjectHelper: 'Write a short subject that explains the issue at a glance.',
    subjectPlaceholder: 'Ticket subject',
    type: 'Category',
    typeHelper: 'Choose the category that best matches your request.',
    priority: 'Priority',
    priorityHelper: 'Choose how urgent this issue is for your team.',
    details: 'Details',
    descriptionHelper: 'Describe the issue clearly so support can help faster.',
    descriptionPlaceholder: 'Describe the issue',
    submit: 'Create ticket',
    submitting: 'Creating...',
  },
  ticket: {
    conversationTitle: 'Conversation',
    conversationDescription: 'Only non-internal messages are visible to business users.',
    emptyTitle: 'No replies yet',
    emptyDescription: 'Send the first message to continue the conversation with support.',
    replyHelper: 'Write the next message you want the support team to read.',
    replyPlaceholder: 'Write your message',
    replySubmit: 'Send reply',
    replying: 'Sending...',
  },
} as const

export default support
