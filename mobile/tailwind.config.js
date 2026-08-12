/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.tsx', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Static brand colors safe to use regardless of light/dark (Tailwind's
        // own `dark:` variant handles the rest for layout-only components).
        // These match src/theme/tokens.ts exactly.
        primary: '#10b981',
        ink: '#0f172a',
        paper: '#f8fafc',
        midnight: '#0b0c10',
      },
      fontFamily: {
        sans: ['Inter-Regular'],
        'inter-regular': ['Inter-Regular'],
        'inter-medium': ['Inter-Medium'],
        'inter-semibold': ['Inter-SemiBold'],
        'inter-bold': ['Inter-Bold'],
        'inter-extrabold': ['Inter-ExtraBold'],
      },
    },
  },
  plugins: [],
};
