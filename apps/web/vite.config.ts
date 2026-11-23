import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const API_TARGET = process.env["VITE_API_TARGET"] ?? "http://localhost:4000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In development the browser talks to the Vite server, which forwards API calls. No CORS needed.
    proxy: {
      "/api": API_TARGET,
      "/health": API_TARGET,
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    css: false,
  },
});
