const settings = {
  header: {
    eyebrow: 'Settings',
    title: 'Account settings',
    description: 'Manage owner contact details and the profile data attached to your business account.',
    subscriptionTitle: 'Subscription',
    subscriptionDescription: 'Monitor current business billing status and the active business subscription plan configured in Supabase.',
  },
  owner: {
    title: 'Owner profile',
    description: 'These fields come from the `profiles` table for the authenticated business owner.',
    firstName: 'First name',
    firstNameHelper: 'Enter the first name of the main account owner.',
    lastName: 'Last name',
    lastNameHelper: 'Enter the last name of the main account owner.',
    phone: 'Phone',
    phoneHelper: 'Add the direct phone number we should associate with the owner.',
    save: 'Save settings',
    saving: 'Saving...',
  },
  subscription: {
    currentStatusTitle: 'Current business status',
    currentStatusDescription: 'State pulled from the `businesses` table.',
    availablePlanTitle: 'Available plan',
    availablePlanDescription: 'Business plans seeded into `subscription_plans` are shown here.',
    started: 'Started',
    ends: 'Ends',
    subscriptionId: 'Lemon Squeezy subscription',
    notStarted: 'Not started',
    notLinked: 'Not linked yet',
    noEnd: 'n/a',
    monthly: '{{price}}/month',
    setupFee: '+ {{fee}} setup fee',
    portalNote: 'Customer portal URLs are expected from Lemon Squeezy webhook data. This page is ready to surface that field once it is stored.',
  },
} as const

export default settings
