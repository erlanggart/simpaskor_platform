import { defineConfig, type UserConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

const isDocker = process.env.DOCKER === "true";

// Load local overrides from vite.config.local.json if exists (gitignored)
let localConfig: { https?: boolean; backendTarget?: string } = {};
const localJsonPath = path.resolve(__dirname, "vite.config.local.json");
if (fs.existsSync(localJsonPath)) {
	localConfig = JSON.parse(fs.readFileSync(localJsonPath, "utf-8"));
}

const useHttps = !isDocker && (localConfig.https ?? false);
const backendTarget = localConfig.backendTarget ?? (isDocker ? "http://backend:3001" : "http://localhost:3001");

// https://vitejs.dev/config/
export default defineConfig(async () => {
	const plugins: any[] = [
		react({
			jsxRuntime: "automatic",
		}),
	];

	if (useHttps) {
		const basicSsl = await import("@vitejs/plugin-basic-ssl");
		plugins.push(basicSsl.default());
	}

	const config: UserConfig = {
		plugins,
		server: {
			port: 5173,
			host: true,
			...(isDocker && {
				allowedHosts: ["simpaskor.id", "www.simpaskor.id"],
				hmr: { host: "simpaskor.id", protocol: "wss", clientPort: 443 },
			}),
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
	};

	return config;
});
