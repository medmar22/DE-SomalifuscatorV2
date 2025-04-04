/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html", // Checks the root index.html
      "./src/**/*.{js,ts,jsx,tsx}", // Checks all JS, TS, JSX, TSX files within src
    ],
    theme: {
      extend: {
        // You can add custom theme extensions here if needed
        // e.g., custom colors, fonts, spacing
        // colors: {
        //   'brand-teal': '#14b8a6', // Example
        // },
      },
    },
    plugins: [
      // Add any Tailwind plugins here if you install them
      // e.g., require('@tailwindcss/forms'),
    ],
  }