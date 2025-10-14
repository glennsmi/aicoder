/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#97D700',
          500: '#97D700',
          600: '#85C200',
          700: '#73AD00',
          800: '#629800',
          900: '#507D00',
        },
        secondary: {
          50: '#e6f1f3',
          100: '#cce3e7',
          200: '#99c7cf',
          300: '#66abb7',
          400: '#338f9f',
          500: '#0A2E36',
          600: '#0A2E36',
          700: '#082530',
          800: '#061c24',
          900: '#041318',
        },
        gunmetal: {
          50: '#f6f7f8',
          100: '#e4e7e9',
          200: '#ccd2d7',
          300: '#a7b1ba',
          400: '#7b8a97',
          500: '#5f6f7e',
          600: '#4f5c6a',
          700: '#434d58',
          800: '#3a424c',
          900: '#353a42',
        },
        accent: {
          500: '#F75C03',
          600: '#E54F02',
          700: '#D34602',
        }
      },
      fontFamily: {
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
}

