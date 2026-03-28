import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react({
			// Enable React 19 features
			jsxRuntime: "automatic",
		}),
		basicSsl(),
	],
	server: {
		port: 5173,
		host: true,
		https: true,
		watch: {
			usePolling: true,
		},
		proxy: {
			"/api": {
				target: "https://192.168.18.42:3001",
				changeOrigin: true,
				secure: false,
			},
			"/uploads": {
				target: "https://192.168.18.42:3001",
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
