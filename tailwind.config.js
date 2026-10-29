/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F2EFE7',
        raised: '#FAF8F3',
        ink: '#14201B',
        inkSoft: '#39473F',
        muted: '#6C786F',
        line: '#DAD4C7',
        lineStrong: '#C3BBA8',
        forest: {
          DEFAULT: '#1D3B2F',
          deep: '#132A21',
          mid: '#2C5241',
          soft: '#E5EBE3',
        },
        copper: {
          DEFAULT: '#A85C36',
          dark: '#8A4829',
          soft: '#F2E4D9',
        },
        success: '#2E6B4E',
        warning: '#A96B1E',
        critical: '#9E3B33',
        info: '#3D5C6B',
        ochre: '#B9873C',
        sage: '#7C9483',
        rust: '#9C4F3B',
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        sans: ['"IBM Plex Sans"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      borderRadius: {
        none: '0',
        sm: '2px',
        DEFAULT: '3px',
        md: '4px',
        lg: '6px',
      },
      boxShadow: {
        panel: '0 1px 2px rgba(20, 32, 27, 0.05)',
        lift: '0 16px 40px -24px rgba(19, 42, 33, 0.45)',
        drawer: '-18px 0 50px -30px rgba(19, 42, 33, 0.5)',
      },
      letterSpacing: {
        overline: '0.14em',
      },
      transitionTimingFunction: {
        precise: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in': {
          from: { transform: 'translateX(24px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'fade-up': 'fade-up 240ms cubic-bezier(0.2, 0.7, 0.3, 1) both',
        'slide-in': 'slide-in 260ms cubic-bezier(0.2, 0.7, 0.3, 1) both',
      },
    },
  },
  plugins: [],
}
