/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './docs/.vitepress/**/*.{js,ts,vue}',
    './docs/**/*.md',
  ],
  theme: {
    extend: {
      colors: {
        'mu-black': '#050505',
        'mu-dark-gray': '#0a0a0a',
        'mu-neon-green': '#a7f069',
        'mu-purple': '#bd00ff',
        'mu-blue': '#00f0ff',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      }
    },
  },
  plugins: [],
}
