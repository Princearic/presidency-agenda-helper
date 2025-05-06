/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './*.js',
    './**/*.html' // Ensure inline scripts in HTML are scanned
  ],
  darkMode: 'class', // Enable dark mode with class-based toggle
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif']
      }
    }
  },
  plugins: []
}