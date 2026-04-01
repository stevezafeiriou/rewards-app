const dashboard = {
  header: {
    eyebrow: 'Πίνακας ελέγχου',
    description: 'Τα βασικά με μια ματιά.',
    createOffer: 'Νέα προσφορά',
    recordTransaction: 'Καταχώριση συναλλαγής',
    viewProfile: 'Προβολή προφίλ',
  },
  emptyBusiness: {
    title: 'Δεν υπάρχει προφίλ επιχείρησης',
    description: 'Ολοκληρώστε το onboarding για να συνεχίσετε.',
    action: 'Έναρξη onboarding',
  },
  subscriptionAlert: {
    title: 'Η συνδρομή χρειάζεται ενέργεια',
    description: 'Ορισμένα εργαλεία μένουν περιορισμένα μέχρι να αποκατασταθεί η χρέωση.',
    action: 'Διαχείριση συνδρομής',
  },
  stats: {
    transactions: 'Συναλλαγές',
    revenue: 'Έσοδα',
    customers: 'Πελάτες',
    rewardsIssued: 'Ανταμοιβές',
    today: '{{count}} σήμερα',
    monthTransactions: '{{count}} αυτόν τον μήνα',
    activeOffers: '{{count}} ενεργές προσφορές',
  },
  transactions: {
    title: 'Πρόσφατες συναλλαγές',
    description: 'Τελευταίες αγορές.',
    emptyTitle: 'Δεν υπάρχουν συναλλαγές',
    emptyDescription: 'Οι συναλλαγές θα εμφανίζονται εδώ μετά την πρώτη αγορά.',
    points: '{{count}} π.',
  },
  offers: {
    title: 'Ενεργές προσφορές',
    description: 'Οι προσφορές που είναι διαθέσιμες τώρα.',
    emptyTitle: 'Δεν υπάρχουν ενεργές προσφορές',
    emptyDescription: 'Δημιουργήστε την πρώτη σας προσφορά.',
    emptyAction: 'Νέα προσφορά',
    noDescription: 'Χωρίς περιγραφή.',
    open: 'Άνοιγμα',
  },
  errors: {
    stats: 'Τα στατιστικά δεν είναι διαθέσιμα αυτή τη στιγμή.',
    transactions: 'Δεν ήταν δυνατή η φόρτωση των συναλλαγών.',
    offers: 'Δεν ήταν δυνατή η φόρτωση των προσφορών.',
  },
} as const

export default dashboard
