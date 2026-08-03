// ============================================================
// apiFetch: wrapper de fetch() que adjunta el ID token de Azure AD
// (Authorization: Bearer ...) en cada llamada al backend propio.
//
// El backend valida ese mismo ID token (audience = AZURE_CLIENT_ID,
// el Client ID de esta SPA) en middleware/auth.js — ver server.js.
// No aplica a las rutas públicas de proponentes/convocatoria-publica,
// que no requieren sesión de Azure AD.
// ============================================================
import { InteractionRequiredAuthError } from "@azure/msal-browser";
import { msalInstance } from "./msalInstance";
import { loginRequest } from "../authConfig";

async function obtenerIdToken(): Promise<string | null> {
    const account = msalInstance.getActiveAccount() || msalInstance.getAllAccounts()[0];
    if (!account) return null;

    try {
        const resultado = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
        return resultado.idToken || null;
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
            try {
                const resultado = await msalInstance.acquireTokenPopup({ ...loginRequest, account });
                return resultado.idToken || null;
            } catch (popupErr) {
                console.error("No se pudo adquirir el token (popup):", popupErr);
                return null;
            }
        }
        console.error("No se pudo adquirir el token:", err);
        return null;
    }
}

export async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = await obtenerIdToken();
    const headers = new Headers(options.headers || {});
    if (token) headers.set("Authorization", `Bearer ${token}`);
    return fetch(url, { ...options, headers });
}
