// Sponsor packages, shared by the Sponsors list and each sponsor detail page.
// Mirrors the printed Green Mile Boosters sponsor flyer.

export const SPONSOR_TIERS = [
  {
    slug: 'emperor',
    name: 'Emperor Sponsor',
    price: '$1,000',
    amountCents: 100000,
    featured: true,
    blurb: 'Top billing all season — the most visible way a business can back Dinuba football.',
    perks: [
      'Banner displayed on the field at every home game',
      '½-page business card in the home game program',
      'Entry for TWO at every home game',
      '2 food vouchers per game',
      '2 custom DINUBA hats',
      '2 Green Mile Boosters sponsor t-shirts',
      'Shout-out on the Green Mile Boosters social media',
      'Announced at home games over the PA system',
    ],
  },
  {
    slug: 'green',
    name: 'Green Sponsor',
    price: '$500',
    amountCents: 50000,
    blurb: 'Strong game-day presence with your banner on the field and your card in the program.',
    perks: [
      'Personal banner displayed on the field at every home game',
      'Business card in the home game program',
      'Free entry for 4 to any ONE home game',
      'Shout-out on the Green Mile Boosters social media',
      'Announced at home games over the PA system',
    ],
  },
  {
    slug: 'silver',
    name: 'Silver Sponsor',
    price: '$300',
    amountCents: 30000,
    blurb: 'A great first step — get your name on the field and over the PA on Friday nights.',
    perks: [
      'Personal banner displayed on the field at every home game',
      'Free entry for 2 to any ONE home game',
      'Announced at home games over the PA system',
    ],
  },
]

export const findTier = slug => SPONSOR_TIERS.find(t => t.slug === slug)
