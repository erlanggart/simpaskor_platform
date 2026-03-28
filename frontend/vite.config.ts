import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
	// loadEnv defaults to loading from env files in project root
	const env = loadEnv(mode, "", "");

	// Local development: use localhost
	// Production: use VITE_PROXY_URL env variable
	const isDev = mode === "development";
	const proxyUrl = isDev
		? "http://localhost:3001"
		: (env.VITE_PROXY_URL || "http://localhost:3001");

	return {
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
					target: proxyUrl,
					changeOrigin: true,
					secure: false,
				},
				"/uploads": {
					target: proxyUrl,
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
	};
});
