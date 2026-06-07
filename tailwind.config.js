/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      keyframes: {
        pop: {
          "0%": { transform: "scale(0.7)", opacity: "0" },
          "60%": { transform: "scale(1.05)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shake: {
          "0%,100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-4px) rotate(-4deg)" },
          "40%": { transform: "translateX(4px) rotate(4deg)" },
          "60%": { transform: "translateX(-3px) rotate(-2deg)" },
          "80%": { transform: "translateX(3px) rotate(2deg)" },
        },
        floaty: {
          "0%,100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        pop: "pop 0.28s ease-out",
        shake: "shake 0.5s ease-in-out",
        floaty: "floaty 2.5s ease-in-out infinite",
        fadeIn: "fadeIn 0.25s ease-out",
      },
    },
  },
  plugins: [],
};
