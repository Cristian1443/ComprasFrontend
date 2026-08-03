// Instancia única de MSAL, compartida entre main.tsx (MsalProvider) y
// apiClient.ts (que necesita adquirir el token fuera de un componente React).
import { PublicClientApplication } from "@azure/msal-browser";
import { msalConfig } from "../authConfig";

export const msalInstance = new PublicClientApplication(msalConfig);
