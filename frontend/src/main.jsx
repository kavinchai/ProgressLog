import React from "react";
import ReactDOM from "react-dom/client";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { ToastProvider } from "./components/Toast";
import { isIOSApp } from "./native/platform";
import "./styles/variables.css";
import "./styles/global.css";

// Switches the iPhone app to Apple's system font (see variables.css).
if (isIOSApp()) document.documentElement.classList.add("ios-app");

ReactDOM.createRoot(document.getElementById("root")).render(
	<React.StrictMode>
		<ToastProvider>
			<App />
		</ToastProvider>
		<Analytics />
	</React.StrictMode>,
);
