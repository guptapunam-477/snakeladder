import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // expose on LAN so you can test from your phone during dev
    port: 5173,
  },
  build: {
    outDir: "dist",
  },
});
