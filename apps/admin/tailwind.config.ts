import type { Config } from "tailwindcss";

import preset from "@repo/config/tailwind-preset";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
  ],
  presets: [preset],
  plugins: [],
};

export default config;
