/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./components/**/*.{js,vue,ts}",
    "./layouts/**/*.vue",
    "./pages/**/*.vue",
    "./plugins/**/*.{js,ts}",
    "./utils/**/*.{js,ts}",
    "./app.vue",
    "./error.vue",
  ],
  theme: {
    extend: {
      backgroundColor: {
        primary: "#E67E22",
        secondary: "#2C3E50",
        danger: "#E74C3C",
        base: "#1A1D23",
        warning: "#F1C40F",
        accent: "#3498DB",
        success: "#27AE60",
        surface: {
          DEFAULT: "#2A2D35",
          hover: "#33363F",
        },
      },
      colors: {
        primary: "#E67E22",
        secondary: "#2C3E50",
        danger: "#E74C3C",
        base: "#1A1D23",
        warning: "#F1C40F",
        accent: "#3498DB",
        success: "#27AE60",
        surface: {
          DEFAULT: "#2A2D35",
          hover: "#33363F",
        },
      },
      borderColor: {
        surface: "#3B3F48",
      },
    },
  },
  plugins: [],
}
