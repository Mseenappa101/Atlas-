/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      paper: 'var(--paper)',
      surface: 'var(--surface)',
      ink: 'var(--ink)',
      muted: 'var(--muted)',
      rule: 'var(--rule)',
      accent: { DEFAULT: 'var(--accent)', hover: 'var(--accent-hover)' },
      status: {
        yes: 'var(--status-yes)',
        unknown: 'var(--status-unknown)',
        no: 'var(--status-no)',
      },
    },
    fontFamily: {
      serif: ['Newsreader', 'Georgia', 'serif'],
      sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
      mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
    },
    fontSize: {
      xs: ['13px', '1.45'],
      sm: ['15px', '1.55'],
      base: ['17px', '1.55'],
      lg: ['21px', '1.4'],
      xl: ['28px', '1.2'],
      '2xl': ['40px', '1.1'],
    },
    borderRadius: {
      none: '0',
      sm: '2px',
      DEFAULT: '2px',
      md: '3px',
    },
    boxShadow: {
      none: 'none',
      drawer: '0 -8px 24px rgba(26, 26, 26, 0.12)',
    },
    extend: {
      maxWidth: { content: '1120px' },
      transitionDuration: { DEFAULT: '140ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(.2,0,0,1)' },
    },
  },
  plugins: [],
}
