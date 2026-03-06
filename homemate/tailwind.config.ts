import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        surface: "#ffffff",
        page: "#f5f9ff",
        ink: "#2f4662",
        muted: "#6d88aa",
        line: "#d5e3f3",
        primary: "#7aa7d9",
        primarySoft: "#eaf2fc",
      },
      boxShadow: {
        soft: "0 10px 28px rgba(122, 167, 217, 0.18)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
