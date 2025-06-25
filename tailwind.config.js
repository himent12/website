/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        tan: {
          50: '#fefcf8',
          100: '#fdf9f1',
          200: '#faf5e8',
          300: '#f5f1e5',
          400: '#f0ead8',
          500: '#e8dcc6',
          600: '#d4c4a8',
          700: '#b8a082',
          800: '#9c7c5c',
          900: '#7d5a3a',
        },
      },
      fontFamily: {
        'chinese': ['Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', 'sans-serif'],
        'lora': ['Lora', 'Georgia', 'Cambria', 'Times New Roman', 'serif'],
      },
    },
  },
  plugins: [],
}
