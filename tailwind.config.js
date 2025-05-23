const { fontFamily } = import('tailwindcss/defaultTheme')

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx}',
    './src/components/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)', ...fontFamily.sans],
        manrope: ['var(--font-manrope)', ...fontFamily.sans],
      },
    },
  },
  darkMode: ['selector', '[data-theme="dark"]'],
  // rest of config
}