/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontSize: {
        '2xs': ['10px', { lineHeight: '1.6' }],
        'xs': ['10px', { lineHeight: '1.6' }],
        'sm': ['10px', { lineHeight: '1.6' }],
        'base': ['12px', { lineHeight: '1.6' }],
        'lg': ['14px', { lineHeight: '1.6' }],
        'xl': ['16px', { lineHeight: '1.6' }],
      },
      colors: {
        'bg-primary': 'var(--bg-primary)',
        'bg-secondary': 'var(--bg-secondary)',
        'bg-tertiary': 'var(--bg-tertiary)',
        'border-default': 'var(--border-default)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent': 'var(--accent)',
        'accent-dim': 'var(--accent-dim)',
        'accent-cyan': 'var(--accent-cyan)',
        'accent-red': 'var(--accent-red)',
        'accent-green': 'var(--accent-green)',
        'accent-gold': 'var(--accent-gold)',
        'accent-pink': 'var(--accent-pink)',
        'accent-purple': 'var(--accent-purple)',
        'bg-elevated': 'var(--bg-elevated)',
        'border-bright': 'var(--border-bright)',
      },
      boxShadow: {
        retro: 'var(--shadow-retro)',
        'retro-sm': 'var(--shadow-retro-sm)',
      },
    },
  },
  plugins: [
    function({ addUtilities }) {
      addUtilities({
        '.font-pixel': {
          fontFamily: "'Press Start 2P', 'PingFang SC', 'Microsoft YaHei', monospace",
          letterSpacing: '1px',
          lineHeight: '1.6',
        },
      });
    },
  ],
}
