module.exports = {
  darkMode: 'class',
  content: [
    '../public/**/*.{html,js}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'ui-monospace', 'monospace']
      }
    }
  },
  plugins: []
};
