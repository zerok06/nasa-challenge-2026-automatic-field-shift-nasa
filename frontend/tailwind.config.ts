import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'anden-primary': '#1B5E20',
        'anden-earth': '#6D4C41',
        'anden-cream': '#FAF7F0',
        'anden-ink': '#1E231E',
      },
    },
  },
  plugins: [],
} satisfies Config;
