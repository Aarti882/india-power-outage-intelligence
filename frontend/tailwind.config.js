/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: '#050917',
          900: '#0a1128',
          800: '#111a36',
          700: '#1b264f',
          600: '#273469',
          500: '#303f82',
        },
        orange: {
          500: '#ff7a00',
          400: '#ff9233',
          600: '#e06b00',
          300: '#ffaa66',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-hover': '0 8px 32px 0 rgba(255, 122, 0, 0.15)',
        'orange-glow': '0 0 20px rgba(255, 122, 0, 0.40)',
      },
      backdropBlur: {
        xs: '2px',
      }
    },
  },
  plugins: [],
}
