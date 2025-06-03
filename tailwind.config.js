/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      minHeight: {
        'screen-header': 'calc(100vh - 5rem)',
      },
      maxWidth: {
        'xxs': '16rem',
      },
      fontSize: {
        '2xs': ['0.625rem', '0.75rem'],
      },
      screens: {
        'xs': '475px',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [],
};