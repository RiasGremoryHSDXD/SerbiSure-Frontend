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
          50: '#FFFDF5',
          100: '#FFF7E6',
          200: '#FFE6B3',
          300: '#FFD580',
          400: '#FFA800',
          500: '#F5A623',
          600: '#E09214',
          700: '#B87208',
        },
        navy: {
          800: '#1E293B',
          900: '#0F172A',
        },
        purple: {
          custom: '#7C5CFC',
          light: '#8E72FF',
        },
        amber: {
          custom: '#FFB830',
          light: '#FFCA64',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      }
    },
  },
  plugins: [],
}
