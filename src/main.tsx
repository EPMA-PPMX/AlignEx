import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { MsalProvider } from "@azure/msal-react";
import { AuthenticationResult } from "@azure/msal-browser";

import App from "./App";
import { msalInstance } from "./auth/msalInstance";
import "./index.css";

async function startApp(): Promise<void> {
  await msalInstance.initialize();

  const response: AuthenticationResult | null =
    await msalInstance.handleRedirectPromise();

  // LOGIN SUCCESS
  if (response) {
    debugger;

    console.log("LOGIN RESPONSE");
    console.log(response);

    console.log("ACCESS TOKEN");
    console.log(response.accessToken);

    console.log("NAME");
    console.log(response.account?.name);

    console.log("EMAIL");
    console.log(response.account?.username);

    // STORE SESSION
    localStorage.setItem("token", response.accessToken ?? "");

    localStorage.setItem("username", response.account?.name ?? "");

    localStorage.setItem("email", response.account?.username ?? "");

    // DOMAIN
    const domain = response.account?.username?.split("@")[1] ?? "";

    localStorage.setItem("domain", domain);

    // REDIRECT
    sessionStorage.setItem("isAuthenticated", "true");
  }

  const rootElement = document.getElementById("root");

  if (!rootElement) {
    throw new Error("Root element not found");
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <MsalProvider instance={msalInstance}>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </MsalProvider>
    </React.StrictMode>,
  );
}

startApp().catch((error) => {
  console.error("Application startup failed:", error);
});
