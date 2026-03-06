/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#fef3e2',
          100: '#fde4b9',
          200: '#fcd38c',
          300: '#fbc15f',
          400: '#fab43d',
          500: '#f9a825',
          600: '#f59b20',
          700: '#ef8c1a',
          800: '#e97d15',
          900: '#df640c',
        },
        dark: {
          50:  '#e8e8e8',
          100: '#c6c6c6',
          200: '#a0a0a0',
          300: '#7a7a7a',
          400: '#5e5e5e',
          500: '#424242',
          600: '#3c3c3c',
          700: '#333333',
          800: '#2b2b2b',
          900: '#1d1d1d',
        },
      },
    },
  },
  plugins: [],
}
