import type { Config } from "tailwindcss";
const config: Config = { content: ["./app/**/*.{js,ts,jsx,tsx,mdx}", "./components/**/*.{js,ts,jsx,tsx,mdx}"], theme: { extend: { colors: { kage: { black: "#080808", panel: "#111111", red: "#E50914", white: "#F7F7F7" } }, boxShadow: { red: "0 12px 40px rgba(229, 9, 20, .22)" } } }, plugins: [] };
export default config;
