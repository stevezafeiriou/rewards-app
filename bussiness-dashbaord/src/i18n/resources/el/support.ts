const support = {
  header: {
    eyebrow: 'Υποστήριξη',
    title: 'Υποστήριξη',
    description: 'Ανοίξτε και παρακολουθήστε αιτήματα.',
    create: 'Νέο αίτημα',
    newTitle: 'Νέο αίτημα',
  },
  list: {
    emptyTitle: 'Δεν υπάρχουν αιτήματα',
    emptyDescription: 'Δημιουργήστε αίτημα όταν χρειάζεστε βοήθεια.',
    action: 'Νέο αίτημα',
  },
  form: {
    title: 'Στοιχεία αιτήματος',
    subject: 'Θέμα',
    subjectPlaceholder: 'Παράδειγμα: Θέμα χρέωσης',
    type: 'Κατηγορία',
    priority: 'Προτεραιότητα',
    details: 'Περιγραφή',
    descriptionPlaceholder: 'Περιγράψτε το θέμα',
    submit: 'Δημιουργία αιτήματος',
    submitting: 'Δημιουργία...',
    toast: {
      loading: 'Δημιουργία αιτήματος υποστήριξης...',
      success: 'Το αίτημα υποστήριξης δημιουργήθηκε.',
      error: 'Δεν ήταν δυνατή η δημιουργία του αιτήματος.',
    },
  },
  ticket: {
    conversationTitle: 'Συνομιλία',
    emptyTitle: 'Δεν υπάρχουν απαντήσεις',
    emptyDescription: 'Στείλτε μήνυμα για να συνεχίσετε.',
    replyPlaceholder: 'Γράψτε το μήνυμά σας',
    replySubmit: 'Αποστολή απάντησης',
    replying: 'Αποστολή...',
    toast: {
      loading: 'Αποστολή απάντησης...',
      success: 'Η απάντηση στάλθηκε.',
      error: 'Δεν ήταν δυνατή η αποστολή της απάντησης.',
    },
  },
} as const

export default support
