import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: "automatic",
    }),
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: ["simpaskor.id", "www.simpaskor.id"],
    hmr: {
      host: "simpaskor.id",
      protocol: "wss",
      clientPort: 443,
    },
    watch: {
      usePolling: true,
    },
    proxy: {
      "/api": {
        target: "http://backend:3001",
        changeOrigin: true,
        secure: false,
      },
      "/uploads": {
        target: "http://backend:3001",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
