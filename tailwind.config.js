/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Field greens — brighter than DHRC's heritage green so this reads as
        // its own brand against dark surfaces.
        field: {
          50:  '#eafff1',
          100: '#ccffdd',
          200: '#9cf7bd',
          300: '#5fe893',
          400: '#28cf6a',
          500: '#13b056', // primary accent
          600: '#0c8c43',
          700: '#0c6e37',
          800: '#0e5630',
          900: '#0c3d24',
          950: '#04230f',
        },
        // Charcoal / near-black surfaces.
        charcoal: {
          900: '#0a0c0b', // page background
          850: '#0f1311',
          800: '#141815',
          700: '#1b211d',
          600: '#252c27',
          500: '#323a34',
        },
      },
      fontFamily: {
        display: ['Anton', 'Oswald', 'sans-serif'],
        heading: ['Oswald', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px -8px rgba(19,176,86,0.45)',
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
