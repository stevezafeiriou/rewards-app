const dashboard = {
  header: {
    eyebrow: 'Dashboard',
    description: 'Key activity at a glance.',
    createOffer: 'Create offer',
    recordTransaction: 'Record transaction',
    viewProfile: 'View profile',
  },
  emptyBusiness: {
    title: 'No business profile yet',
    description: 'Finish onboarding to continue.',
    action: 'Start onboarding',
  },
  subscriptionAlert: {
    title: 'Subscription needs attention',
    description: 'Some tools stay limited until billing is restored.',
    action: 'Manage subscription',
  },
  stats: {
    transactions: 'Transactions',
    revenue: 'Revenue',
    customers: 'Customers',
    rewardsIssued: 'Rewards',
    today: '{{count}} today',
    monthTransactions: '{{count}} this month',
    activeOffers: '{{count}} active offers',
  },
  transactions: {
    title: 'Recent transactions',
    description: 'Latest purchases.',
    emptyTitle: 'No transactions yet',
    emptyDescription: 'Transactions appear here after the first purchase.',
    points: '{{count}} pts',
  },
  offers: {
    title: 'Active offers',
    description: 'Offers visible now.',
    emptyTitle: 'No active offers',
    emptyDescription: 'Create your first offer.',
    emptyAction: 'Create offer',
    noDescription: 'No description.',
    open: 'Open',
  },
  errors: {
    stats: 'Stats are unavailable right now.',
    transactions: 'Could not load transactions.',
    offers: 'Could not load offers.',
  },
} as const

export default dashboard
