/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FFF9F6',
          100: '#FFF4ED',
          200: '#FFE5D6',
          300: '#FFD4BC',
          400: '#FFC49E',
          500: '#FFB380', // User Specified Orange: #FFB380
          600: '#F5A066',
          700: '#E28B50',
          800: '#C77035',
          DEFAULT: '#FFB380',
        },
        ink: {
          950: '#08080A',
          900: '#0D0D11', // Deep Black
          800: '#18181F',
          700: '#272732',
        },
        canvas: {
          DEFAULT: '#F6F5F2', // Warm Soft Surface
          subtle: '#EFEFEA',
        }
      },
      fontFamily: {
        sans: ['Geist', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '32px',
        '5xl': '40px',
      }
    },
  },
  plugins: [],
}
