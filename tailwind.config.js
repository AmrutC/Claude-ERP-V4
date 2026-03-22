/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          DEFAULT: '#0D1E35',
          dark:    '#07101E',
          light:   '#1A3A5C',
          mid:     '#1E4070',
        },
        gold: {
          DEFAULT: '#C9951E',
          light:   '#F0C040',
          pale:    '#FBF3E2',
          dark:    '#9A6E0E',
        },
        brand: {
          bg:      '#EAF0F8',
          border:  '#C5D5E8',
        },
        // High-contrast grays for readability
        ink: {
          DEFAULT: '#111827',  // near black — primary text
          mid:     '#374151',  // secondary text
          soft:    '#4B5563',  // muted text
          faint:   '#6B7280',  // hint text
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        'xs':  ['11px', { lineHeight: '16px' }],
        'sm':  ['12.5px', { lineHeight: '18px' }],
        'base':['13.5px', { lineHeight: '20px' }],
      },
    },
  },
  plugins: [],
};
