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
        text: 'var(--colour-text)',
        muted: 'var(--colour-text-muted)',
        critical: 'var(--colour-critical)',
        important: 'var(--colour-important)',
        info: 'var(--colour-info)',
        money: 'var(--colour-money)',
        surface: 'var(--colour-surface)',
        'surface-sunken': 'var(--colour-surface-sunken)',
        line: 'var(--colour-line)',
      },
      fontSize: {
        base: ['var(--font-size-base)', { lineHeight: 'var(--line-height)' }],
        sm: ['var(--font-size-sm)', { lineHeight: 'var(--line-height)' }],
      },
      maxWidth: { measure: 'var(--measure)' },
      minHeight: { touch: 'var(--touch-target)' },
      minWidth: { touch: 'var(--touch-target)' },
    },
  },
  plugins: [],
} satisfies Config;
