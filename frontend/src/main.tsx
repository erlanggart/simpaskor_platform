import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient();
const recaptchaSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<GoogleReCaptchaProvider reCaptchaKey={recaptchaSiteKey}>
			<QueryClientProvider client={queryClient}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</QueryClientProvider>
		</GoogleReCaptchaProvider>
	</React.StrictMode>
);
