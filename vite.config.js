import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'fs'

const snap = JSON.parse(readFileSync('./snapshot.json', 'utf-8'))

// Placeholder Stripe publishable key. Replace with the real live/test
// publishable key via the VITE_STRIPE_PUBLISHABLE_KEY env var (or CF Pages
// build env). Until a real key is set, the donation/checkout payment step
// will render but cannot process live charges.
const STRIPE_PK_FALLBACK = 'pk_test_placeholder_set_VITE_STRIPE_PUBLISHABLE_KEY'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const stripePk = env.VITE_STRIPE_PUBLISHABLE_KEY || STRIPE_PK_FALLBACK

  return {
    plugins: [react()],
    define: {
      __APP_VERSION__: JSON.stringify(snap.version),
      __APP_SNAPSHOT__: JSON.stringify(snap),
      'import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY': JSON.stringify(stripePk),
    },
  }
})
