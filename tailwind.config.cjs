/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#FFFFFF',
      canvas: 'var(--app-bg)',
      card: 'var(--app-surface)',
      fg: { DEFAULT: 'var(--app-text)', 2: 'var(--app-text-2)' },
      line: 'var(--app-border)',
      brand: { DEFAULT: 'var(--app-brand)', hover: 'var(--app-brand-hover)', tint: 'var(--app-brand-tint)' },
      navy: 'var(--app-navy)',
      brass: { DEFAULT: 'var(--app-brass)', soft: 'var(--app-brass-soft)' },
      st: {
        open: 'var(--st-open)', 'open-text': 'var(--st-open-text)', 'open-bg': 'var(--st-open-bg)',
        soon: 'var(--st-soon)', 'soon-text': 'var(--st-soon-text)', 'soon-bg': 'var(--st-soon-bg)',
        closed: 'var(--st-closed)', 'closed-text': 'var(--st-closed-text)', 'closed-bg': 'var(--st-closed-bg)',
        unknown: 'var(--st-unknown)', 'unknown-bg': 'var(--st-unknown-bg)',
      },
    },
    fontFamily: {
      // Hanken Grotesk is the default for everything; JetBrains Mono for dates and counts;
      // Newsreader only inside document previews (resumes, letters).
      sans: ['"Hanken Grotesk"', '"Hanken Fallback"', 'system-ui', 'sans-serif'],
      app: ['"Hanken Grotesk"', '"Hanken Fallback"', 'system-ui', 'sans-serif'],
      data: ['"JetBrains Mono"', '"Mono Fallback"', 'ui-monospace', 'monospace'],
      mono: ['"JetBrains Mono"', '"Mono Fallback"', 'ui-monospace', 'monospace'],
      doc: ['Newsreader', 'Georgia', 'serif'],
      // Judiciary: carved display caps + reading serif (self-hosted in index.css).
      display: ['Cinzel', '"Hanken Fallback"', 'Georgia', 'serif'],
      serif: ['"EB Garamond"', 'Newsreader', 'Georgia', 'serif'],
    },
    fontSize: {
      // App scale: 12/14/16/20/24/32.
      t12: ['12px', '16px'],
      t14: ['14px', '20px'],
      t16: ['16px', '24px'],
      t20: ['20px', '28px'],
      t24: ['24px', '30px'],
      t32: ['32px', '38px'],
    },
    borderRadius: {
      none: '0',
      DEFAULT: '6px',
      app: '6px',
      pill: '999px',
    },
    boxShadow: {
      none: 'none',
      pop: '0 8px 28px rgba(20, 24, 31, 0.12), 0 1px 3px rgba(20, 24, 31, 0.08)',
    },
    extend: {
      maxWidth: { app: '1280px' },
      transitionDuration: { DEFAULT: '150ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(.2,0,0,1)' },
    },
  },
  plugins: [],
}
