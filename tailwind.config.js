/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        // Matching the professional palette used in the Studio
        primary: {
          DEFAULT: '#4f46e5',
          dark: '#4338ca',
          light: '#6366f1',
        },
        studio: {
          bg: '#f8fafc',
          sidebar: '#ffffff',
          border: '#e2e8f0',
          text: '#0f172a',
          soft: '#64748b',
        }
      },
      boxShadow: {
        'canvas': '0 20px 50px -12px rgba(0, 0, 0, 0.15)',
      },
      backgroundImage: {
        'blueprint': 'linear-gradient(#e2e8f0 1px, transparent 1px), linear-gradient(90deg, #e2e8f0 1px, transparent 1px)',
      }
    },
  },
  plugins: [],
}
