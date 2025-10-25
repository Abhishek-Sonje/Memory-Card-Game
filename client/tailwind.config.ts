import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        "rubik-iso": ["var(--font-rubik-iso)"],
        "zain": ["var(--font-zain)"],
      },
    },
  },
  plugins: [],
};

export default config;
