import type { Config } from 'tailwindcss';

/**
 * Tokens live in CSS custom properties (styles/globals.css) so that the print
 * stylesheet, which is raw CSS, reads the same values. Tailwind maps onto them
 * rather than defining a parallel scale.
 */
export default {
  content: ['./app/**/*.{ts,tsx,mdx}', './components/**/*.{ts,tsx}', './content/**/*.mdx'],
  theme: {
    extend: {
      colors: {
        text: 'var(--ink)',
        muted: 'var(--ink-muted)',
        critical: 'var(--critical)',
        important: 'var(--important)',
        info: 'var(--brand-bright)',
        money: 'var(--brand)',
        surface: 'var(--surface)',
        'surface-sunken': 'var(--surface-sunk)',
        line: 'var(--line-strong)',
      },
      fontSize: {
        base: ['var(--text-base)', { lineHeight: 'var(--leading)' }],
        sm: ['var(--text-sm)', { lineHeight: 'var(--leading)' }],
      },
      maxWidth: { measure: 'var(--measure)' },
      minHeight: { touch: 'var(--tap)' },
      minWidth: { touch: 'var(--tap)' },
    },
  },
  plugins: [],
} satisfies Config;
