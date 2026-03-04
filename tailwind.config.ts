import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#9db99d",
          dark: "#7da07d",
          light: "#c7d8c7",
        },
        secondary: {
          DEFAULT: "#566668",
          dark: "#454f50",
        },
        accent: "#566668",
        bg: "#ffffff",
        surface: {
          DEFAULT: "#f4f7f4",
          alt: "#eaf0ea",
        },
        text: {
          DEFAULT: "#1a1a1a",
          secondary: "#566668",
          muted: "#8a9a9c",
        },
        border: "#d9e2d9",
        success: "#4CAF50",
        warning: "#F59E0B",
        error: "#DC2626",
        info: "#3B82F6",
      },
      fontFamily: {
        heebo: ["Heebo", "sans-serif"],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
      },
    },
  },
  plugins: [],
};

export default config;
