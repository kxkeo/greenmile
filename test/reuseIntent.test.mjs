// Zero-dependency checks on the PaymentIntent reuse guard: run `npm test`.
// The important ones are the refusals — a mismatched client secret must never
// return an intent (that would hand out someone else's payment), and anything
// already paid, cancelled or in flight must fall through to a new intent
// rather than being re-priced under the buyer.
import { reuseIntent, intentIdFromSecret } from '../functions/_lib/reuseIntent.js'

const SECRET = 'pi_ABC123_secret_XYZ789'
let lastUpdate = null
const stub = (pi) => { global.fetch = async (url, opts) => {
  if (!opts || opts.method !== 'POST') return { json: async () => pi }
  lastUpdate = Object.fromEntries(new URLSearchParams(opts.body))
  return { json: async () => ({ ...pi, ...lastUpdate, id: pi.id, client_secret: pi.client_secret }) }
} }

const params = {
  amount: '20629', currency: 'usd', 'payment_method_types[]': 'card',
  'automatic_payment_methods[enabled]': 'true',
  description: 'Green Mile Boosters: 2 x Raffle', 'metadata[participant_id]': '15',
}
let failed = 0
const ok = (n, c) => { if (!c) failed++; console.log(`${c ? 'PASS' : 'FAIL'}  ${n}`) }
const base = { id: 'pi_ABC123', client_secret: SECRET, status: 'requires_payment_method', metadata: { participant_id: '15' } }

ok('parses id from secret', intentIdFromSecret(SECRET) === 'pi_ABC123')
ok('rejects junk secret',   intentIdFromSecret('not-a-secret') === null)
ok('rejects bare pi id',    intentIdFromSecret('pi_ABC123') === null)

stub(base)
ok('updates an open intent', !!(await reuseIntent('sk', SECRET, params)))
ok('strips create-only currency',      !('currency' in lastUpdate))
ok('strips create-only pm_types',      !('payment_method_types[]' in lastUpdate))
ok('strips create-only auto_pm',       !('automatic_payment_methods[enabled]' in lastUpdate))
ok('keeps new amount',                 lastUpdate.amount === '20629')
ok('keeps description + metadata',     !!lastUpdate.description && lastUpdate['metadata[participant_id]'] === '15')

ok('no secret -> create new', (await reuseIntent('sk', undefined, params)) === null)
ok('wrong secret -> refused (no leak)', (await reuseIntent('sk', 'pi_ABC123_secret_WRONG', params)) === null)

stub({ ...base, status: 'succeeded' })
ok('already paid -> create new', (await reuseIntent('sk', SECRET, params)) === null)
stub({ ...base, status: 'canceled' })
ok('canceled -> create new',    (await reuseIntent('sk', SECRET, params)) === null)
stub({ ...base, status: 'processing' })
ok('processing -> create new',  (await reuseIntent('sk', SECRET, params)) === null)

stub(base)
ok('verify() false -> create new (other buyer)',
   (await reuseIntent('sk', SECRET, params, { verify: pi => pi.metadata.participant_id === '99' })) === null)
ok('verify() true -> reused',
   !!(await reuseIntent('sk', SECRET, params, { verify: pi => pi.metadata.participant_id === '15' })))

global.fetch = async () => { throw new Error('network down') }
ok('stripe error -> create new', (await reuseIntent('sk', SECRET, params)) === null)

process.exitCode = failed ? 1 : 0
console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed')
