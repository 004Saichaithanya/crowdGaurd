/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#060e20',
        'surface-container-low': '#091328',
        'surface-container-lowest': '#050a17',
        'surface-container-highest': '#192540',
        'surface-bright': 'rgba(255, 255, 255, 0.6)',
        'surface-variant': 'rgba(163, 170, 196, 0.2)', // approximate for glass buttons
        'on-surface': '#dee5ff',
        'on-surface-variant': '#a3aac4',
        primary: '#5eb4ff',
        'primary-container': '#2aa7ff',
        'on-primary': '#000000',
        'primary-dim': 'rgba(94, 180, 255, 0.2)',
        secondary: '#6bfe9c',
        'secondary-container': '#184a29', // dark green for pill back
        tertiary: '#ffe084',
        error: '#ff716c',
        'error-container': '#4a1818', // dark red for pill back
        'outline-variant': 'rgba(64, 72, 93, 0.15)', // ghost border 15% opacity
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #5eb4ff, #2aa7ff)',
      },
      boxShadow: {
        'ambient': '0px 0px 60px -5px rgba(222, 229, 255, 0.04)',
      }
    },
  },
  plugins: [],
}
