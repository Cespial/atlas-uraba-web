/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        atlas: {
          dark:   '#0f0f1a',
          panel:  '#161625',
          border: '#2a2a45',
          accent: '#4ade80',
          text:   '#e2e8f0',
          muted:  '#94a3b8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
}
