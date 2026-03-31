const dashboard = {
  header: {
    eyebrow: 'Dashboard',
    description: 'Live operating data from Supabase for transactions, rewards, active offers, and subscription state.',
    createOffer: 'Create offer',
    recordTransaction: 'Record transaction',
    viewProfile: 'View profile',
  },
  emptyBusiness: {
    title: 'No business profile yet',
    description: 'Start onboarding to create the business record that powers offers, customer lookup, and subscription billing.',
    action: 'Start onboarding',
  },
  subscriptionAlert: {
    title: 'Subscription attention required',
    description: 'Operational routes are limited until billing is restored. Review your subscription details now.',
    action: 'Manage subscription',
  },
  stats: {
    transactions: 'Transactions',
    revenue: 'Revenue',
    customers: 'Customers',
    rewardsIssued: 'Rewards issued',
    today: '{{count}} today',
    monthTransactions: '{{count}} transactions this month',
    activeOffers: '{{count}} active offers',
  },
  transactions: {
    title: 'Recent transactions',
    description: 'Latest recorded purchases from the local business account.',
    emptyTitle: 'No transactions yet',
    emptyDescription: 'Once the team records member purchases, they will appear here immediately.',
    points: '{{count}} pts',
  },
  offers: {
    title: 'Active offers',
    description: 'Offers visible to marketplace members right now.',
    emptyTitle: 'No active offers',
    emptyDescription: 'Create your first marketplace offer to start attracting paid and free members.',
    emptyAction: 'Create offer',
    noDescription: 'No description provided.',
    open: 'Open',
  },
  errors: {
    stats: 'Dashboard statistics are temporarily unavailable.',
    transactions: 'Recent transactions could not be loaded.',
    offers: 'Active offers could not be loaded.',
  },
} as const

export default dashboard
