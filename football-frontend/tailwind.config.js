/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0f172a',      // Deep slate background
        panel: '#1e293b',     // Slightly lighter for cards/panels
        accent: '#10b981',    // Emerald green for primary actions/stats
        accentHover: '#059669'
      }
    },
  },
  plugins: [],
}