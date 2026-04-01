const legal = {
  terms: {
    title: 'Terms of Service',
    intro: 'Placeholder legal copy for the business dashboard.',
    updated: 'Updated {{date}}',
    sections: {
      scopeTitle: 'Scope',
      scopeBody: 'Add the final terms that apply to this dashboard here.',
      useTitle: 'Use',
      useBody: 'Add account access, acceptable use, and service limits here.',
      liabilityTitle: 'Liability',
      liabilityBody: 'Add the final liability and warranty language here.',
      contactTitle: 'Contact',
      contactBody: 'Add the company contact for legal questions here.',
      privacyLink: 'Read the Privacy Policy',
    },
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'Placeholder privacy copy for the business dashboard.',
    updated: 'Updated {{date}}',
    sections: {
      dataTitle: 'Data',
      dataBody: 'Add the data you collect, store, and process here.',
      useTitle: 'Use',
      useBody: 'Add how that data is used inside the service here.',
      sharingTitle: 'Sharing',
      sharingBody: 'Add any sharing, processors, or legal disclosures here.',
      contactTitle: 'Contact',
      contactBody: 'Add the privacy contact or DPO details here.',
      termsLink: 'Read the Terms of Service',
    },
  },
} as const

export default legal
