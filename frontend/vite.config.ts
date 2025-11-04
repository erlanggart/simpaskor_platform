import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
	plugins: [
		react({
			// Enable React 19 features
			jsxRuntime: "automatic",
		}),
	],
	server: {
		port: 5173,
		host: true,
		watch: {
			usePolling: true,
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
