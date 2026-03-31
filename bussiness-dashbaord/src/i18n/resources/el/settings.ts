const settings = {
  header: {
    eyebrow: 'Ρυθμίσεις',
    title: 'Ρυθμίσεις λογαριασμού',
    description: 'Διαχειριστείτε τα στοιχεία του ιδιοκτήτη και τα δεδομένα προφίλ που συνδέονται με τον λογαριασμό της επιχείρησής σας.',
    subscriptionTitle: 'Συνδρομή',
    subscriptionDescription: 'Παρακολουθήστε την τρέχουσα κατάσταση χρέωσης της επιχείρησης και το ενεργό πλάνο συνδρομής στο Supabase.',
  },
  owner: {
    title: 'Προφίλ ιδιοκτήτη',
    description: 'Αυτά τα πεδία προέρχονται από τον πίνακα `profiles` για τον πιστοποιημένο ιδιοκτήτη της επιχείρησης.',
    firstName: 'Όνομα',
    firstNameHelper: 'Συμπληρώστε το όνομα του βασικού κατόχου του λογαριασμού.',
    lastName: 'Επώνυμο',
    lastNameHelper: 'Συμπληρώστε το επώνυμο του βασικού κατόχου του λογαριασμού.',
    phone: 'Τηλέφωνο',
    phoneHelper: 'Προσθέστε το άμεσο τηλέφωνο που θέλετε να συνδέεται με τον ιδιοκτήτη.',
    save: 'Αποθήκευση ρυθμίσεων',
    saving: 'Αποθήκευση...',
  },
  subscription: {
    currentStatusTitle: 'Τρέχουσα κατάσταση επιχείρησης',
    currentStatusDescription: 'Κατάσταση που αντλείται από τον πίνακα `businesses`.',
    availablePlanTitle: 'Διαθέσιμο πλάνο',
    availablePlanDescription: 'Τα επιχειρηματικά πλάνα που έχουν σπαρθεί στον πίνακα `subscription_plans` εμφανίζονται εδώ.',
    started: 'Έναρξη',
    ends: 'Λήξη',
    subscriptionId: 'Συνδρομή Lemon Squeezy',
    notStarted: 'Δεν έχει ξεκινήσει',
    notLinked: 'Δεν έχει συνδεθεί ακόμη',
    noEnd: 'χωρίς λήξη',
    monthly: '{{price}}/μήνα',
    setupFee: '+ {{fee}} τέλος ενεργοποίησης',
    portalNote: 'Τα URLs του customer portal αναμένονται από τα δεδομένα webhook της Lemon Squeezy. Η σελίδα είναι έτοιμη να τα προβάλλει μόλις αποθηκευτούν.',
  },
} as const

export default settings
