/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Heritage green to match DHRC (dinubahomerun.club): #18532a primary,
        // #0f3d1e dark. Lighter steps (300/400) are tints of the same green so
        // green TEXT stays legible on the dark theme; 500–700 are the DHRC
        // solid-fill greens for buttons and bands.
        field: {
          50:  '#eaf3ed',
          100: '#cfe3d6',
          200: '#a7cbb4',
          300: '#74c08e', // light accent text on dark
          400: '#4aa86a', // accent / eyebrow text
          500: '#18532a', // DHRC heritage green (primary fill)
          600: '#134320',
          700: '#0f3d1e', // DHRC dark green
          800: '#0b2e16',
          900: '#082011',
          950: '#04120a',
        },
        // Silver — DHRC's secondary (nav bar / accents).
        silver: {
          300: '#c4c6ca',
          400: '#a8a9ad',
          500: '#8b8d92',
        },
        // Charcoal surfaces — a true dark-gray charcoal (green-tinted), not
        // near-black. 900 is the page background; 850/800 step up for bands
        // and cards so elevation reads with the card shadow.
        charcoal: {
          900: '#181b19', // page background
          850: '#1e221f',
          800: '#252a26', // cards
          700: '#2d332e',
          600: '#373e38',
          500: '#434b44',
        },
      },
      fontFamily: {
        display: ['Anton', 'Oswald', 'sans-serif'],
        heading: ['Oswald', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(24,83,42,0.55)',
        card: '0 12px 32px -12px rgba(0,0,0,0.55), 0 2px 8px -2px rgba(0,0,0,0.4)',
      },
      backgroundImage: {
        'field-lines':
          'repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 2px, transparent 2px, transparent 64px)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(16px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.6s ease-out both',
      },
    },
  },
  plugins: [],
}
