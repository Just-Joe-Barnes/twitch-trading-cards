module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}", // Include all React components
  ],
  theme: {
    extend: {
      colors: {
        twitch: "#9146ff",
        primary: "#3490dc", // Example primary color
        secondary: "#ffed4a", // Example secondary color
        gray: {
          100: "#f7fafc",
          200: "#edf2f7",
          300: "#e2e8f0",
          400: "#cbd5e0",
          500: "#a0aec0",
          600: "#718096",
          700: "#4a5568",
          800: "#2d3748",
          900: "#1a202c",
        },
      },
      fontFamily: {
        sans: ["Roboto", "sans-serif"], // Example font family
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
