module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          light: '#4DA8FF',
          DEFAULT: '#0066cc',
          dark: '#0055aa',
        },
        secondary: {
          light: '#F8FBFF',
          DEFAULT: '#f0f7ff',
          dark: '#E2EDFF',
        },
        gray: {
          lightest: '#f5f5f5',
          light: '#eeeeee',
          DEFAULT: '#999999',
          dark: '#666666',
          darkest: '#333333',
        }
      },
      spacing: {
        sidebar: '300px',
      },
      minHeight: {
        sidebar: '600px',
      },
      boxShadow: {
        sidebar: '0 0 10px rgba(0, 0, 0, 0.1)',
      }
    },
  },
  plugins: [],
} 