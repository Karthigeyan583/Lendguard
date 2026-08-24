/**
 * LendGuard Initial Sample Data
 * Preloads realistic personal loan scenarios for instant exploration
 */

const DEMO_LOANS = [
  {
    id: 'LN-2026-0811',
    type: 'lent', // 'lent' (I lent money) or 'borrowed' (I borrowed money)
    borrowerName: 'Marcus Vance',
    borrowerPhone: '+1-555-234-8900',
    borrowerEmail: 'marcus.v@example.com',
    tag: 'Friend',
    principal: 2000,
    currency: '$',
    interestType: 'simple',
    interestRate: 5, // 5% annual
    startDate: '2026-06-01',
    dueDate: '2026-09-30',
    tenureMonths: 4,
    notes: 'Helped him with emergency car engine repairs. Agreed to pay back in installments.',
    status: 'partially_paid',
    payments: [
      { id: 'PAY-1', date: '2026-07-05', amount: 500, method: 'Zelle', notes: 'First installment payment' },
      { id: 'PAY-2', date: '2026-08-10', amount: 300, method: 'Bank Transfer', notes: 'Second partial payment' }
    ]
  },
  {
    id: 'LN-2026-0824',
    type: 'lent',
    borrowerName: 'Sarah Jenkins',
    borrowerPhone: '+1-555-891-2345',
    borrowerEmail: 'sarah.j@techstartup.io',
    tag: 'Colleague',
    principal: 5000,
    currency: '$',
    interestType: 'monthly',
    interestRate: 1.5, // 1.5% per month
    startDate: '2026-07-15',
    dueDate: '2026-11-15',
    tenureMonths: 4,
    notes: 'Bridge loan for her boutique design studio inventory order.',
    status: 'partially_paid',
    payments: [
      { id: 'PAY-3', date: '2026-08-15', amount: 1500, method: 'Wire Transfer', notes: 'August monthly repayment' }
    ]
  },
  {
    id: 'LN-2026-0701',
    type: 'lent',
    borrowerName: 'David Kim',
    borrowerPhone: '+1-555-671-9922',
    borrowerEmail: 'david.kim@family.net',
    tag: 'Family',
    principal: 450,
    currency: '$',
    interestType: 'none', // 0% friendly loan
    interestRate: 0,
    startDate: '2026-07-01',
    dueDate: '2026-08-15', // Past due!
    tenureMonths: 1.5,
    notes: 'Short term cash assistance for moving security deposit.',
    status: 'overdue',
    payments: []
  },
  {
    id: 'LN-2026-0519',
    type: 'borrowed',
    borrowerName: 'Uncle Robert',
    borrowerPhone: '+1-555-404-1288',
    borrowerEmail: 'robert.senior@domain.com',
    tag: 'Family',
    principal: 3000,
    currency: '$',
    interestType: 'simple',
    interestRate: 4,
    startDate: '2026-05-19',
    dueDate: '2026-12-31',
    tenureMonths: 7,
    notes: 'Borrowed for home workshop renovation equipment.',
    status: 'partially_paid',
    payments: [
      { id: 'PAY-4', date: '2026-06-30', amount: 1000, method: 'Check', notes: 'Half payment sent' }
    ]
  },
  {
    id: 'LN-2026-0310',
    type: 'lent',
    borrowerName: 'Elena Rostova',
    borrowerPhone: '+1-555-901-4477',
    borrowerEmail: 'elena.rostova@consulting.org',
    tag: 'Business',
    principal: 1200,
    currency: '$',
    interestType: 'fixed_fee',
    interestRate: 100, // $100 flat fee
    startDate: '2026-03-10',
    dueDate: '2026-06-10',
    tenureMonths: 3,
    notes: 'Equipment rental bridge financing. 100% paid and closed.',
    status: 'settled',
    payments: [
      { id: 'PAY-5', date: '2026-04-10', amount: 650, method: 'Stripe / Card', notes: 'First half' },
      { id: 'PAY-6', date: '2026-06-08', amount: 650, method: 'Bank Transfer', notes: 'Final settlement + fee' }
    ]
  }
];

window.DEMO_LOANS = DEMO_LOANS;
