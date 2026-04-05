/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        parchment: { DEFAULT: '#f7f3ec', dark: '#ede8df', deeper: '#e4ddd1' },
        ink: { DEFAULT: '#1a1710', muted: '#4a4639', light: '#7a7260', faint: '#b0a898' },
        rule: { DEFAULT: '#c8bfae', light: '#ddd6c8' },
        gold: { DEFAULT: '#8b6914', light: '#c4a55a', pale: '#f0e6c8' },
      },
      fontFamily: {
        serif: ['EB Garamond', 'Georgia', 'serif'],
        display: ['Cormorant Garamond', 'Georgia', 'serif'],
        mono: ['DM Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
