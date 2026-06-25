import { createRoot } from "react-dom/client";
import { PublicClientApplication } from "@azure/msal-browser";
import { MsalProvider } from "@azure/msal-react";
import { msalConfig } from "./authConfig";
import App from "./App.tsx";
import "./index.css";

const msalInstance = new PublicClientApplication(msalConfig);

// Inicializar MSAL y manejar la respuesta del redirect antes de renderizar
msalInstance.initialize().then(() => {
  // Esto es CRÍTICO: procesa el #code=... de la URL después del redirect de Azure
  msalInstance.handleRedirectPromise().then(() => {
    createRoot(document.getElementById("root")!).render(
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    );
  }).catch((err) => {
    console.error("Error handleRedirectPromise:", err);
    createRoot(document.getElementById("root")!).render(
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    );
  });
});
