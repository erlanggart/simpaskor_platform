import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();

// NOTE: GoogleReCaptchaProvider is intentionally NOT mounted here.
// The Google reCAPTCHA SDK injects a ~150 KB blocking script on mount,
// so we scope it to the only page that actually calls executeRecaptcha
// (see pages/Register.tsx). The landing page and the rest of the app
// no longer pay that cost on first paint.

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<QueryClientProvider client={queryClient}>
			<BrowserRouter>
				<App />
			</BrowserRouter>
		</QueryClientProvider>
	</React.StrictMode>
);
