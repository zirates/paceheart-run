import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#fff1f1',
          100: '#ffe1e1',
          300: '#fca5a5',
          500: '#ef4444',
          600: '#e51d1d',
          700: '#c81414',
        },
      },
    },
  },
  plugins: [],
}
export default config
