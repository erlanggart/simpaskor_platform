import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const isDocker = process.env.DOCKER === "true" || process.env.NODE_ENV === "production";
const backendTarget = isDocker ? "http://backend:3001" : "http://localhost:3001";

// https://vitejs.dev/config/
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
		hmr: isDocker
			? { host: "simpaskor.id", protocol: "wss", clientPort: 443 }
			: true,
		watch: {
			usePolling: true,
		},
		proxy: {
			"/api": {
				target: backendTarget,
				changeOrigin: true,
				secure: false,
			},
			"/uploads": {
				target: backendTarget,
				changeOrigin: true,
				secure: false,
			},
		},
	},
	build: {
		target: "es2022",
		rollupOptions: {
			output: {
				manualChunks: {
					"react-vendor": ["react", "react-dom", "react-router-dom"],
				},
			},
		},
	},
});
