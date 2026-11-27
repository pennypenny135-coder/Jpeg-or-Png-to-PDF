import type { Config } from "tailwindcss";

// Tailwind v4 透過 globals.css 的 @config 載入此檔
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;
