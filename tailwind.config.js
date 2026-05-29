/** @type {import('tailwindcss').Config} */
export default {
  content: ['./app/**/*.{vue,js,ts}'],
  theme: {
    extend: {
      colors: {
        tensor: {
          teal:       '#1B6B6D',
          'teal-dark':'#155556',
          'teal-light':'#E8F4F4',
          text:       '#1A1A1A',
          body:       '#3D3D3D',
          muted:      '#5F5F5B',
          bg:         '#F2F1EE',
          border:     '#E5E5E0',
        },
        atlas: {
          bg:     '#0D1117',
          panel:  '#161B22',
          border: '#30363D',
          text:   '#E6EDF3',
          muted:  '#8B949E',
          'score-1': '#d73027',
          'score-2': '#f46d43',
          'score-3': '#fdae61',
          'score-4': '#a6d96a',
          'score-5': '#66bd63',
          'score-6': '#1a9850',
        },
      },
      fontFamily: {
        head: ['Space Grotesk', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
}
