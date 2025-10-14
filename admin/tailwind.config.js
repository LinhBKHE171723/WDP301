/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: { brand: { DEFAULT: "#2563eb", fg: "#1e40af" } },
    },
  },
  plugins: [],
};
