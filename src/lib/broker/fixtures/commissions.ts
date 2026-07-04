import type { Commission } from '../types'

// Komisyonlarım (brief §5.4, Sprint 2). history: SarpNet Faz 2 için hazır iz —
// entegrasyon geldiğinde yalnızca in_finance → payment_scheduled → paid besler.
export const COMMISSIONS: Commission[] = [
  {
    id: 'com_lagoon_14c',
    brokerId: 'brk_ahmet',
    unitLabel: 'Lagoon 14C · 3+1',
    saleDate: '2026-06-24',
    customerInitials: 'A.K.',
    amountTRY: 864000,
    status: 'in_finance',
    expectedPaymentDate: '2026-07-10',
    history: [
      { status: 'sale', at: '2026-06-24', by: 'brk_ahmet' },
      { status: 'deposit_received', at: '2026-06-26', by: 'admin' },
      { status: 'earned', at: '2026-06-30', by: 'admin' },
      { status: 'in_finance', at: '2026-07-01', by: 'admin' },
    ],
  },
  {
    id: 'com_central_3a',
    brokerId: 'brk_ahmet',
    unitLabel: 'Central 3A · 1+1',
    saleDate: '2026-06-29',
    customerInitials: 'M.S.',
    amountTRY: 318000,
    status: 'deposit_received',
    history: [
      { status: 'sale', at: '2026-06-29', by: 'brk_ahmet' },
      { status: 'deposit_received', at: '2026-07-02', by: 'admin' },
    ],
  },
]
