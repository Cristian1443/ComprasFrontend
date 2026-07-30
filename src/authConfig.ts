import { Configuration, PopupRequest } from "@azure/msal-browser";

// Configuración de MSAL
export const msalConfig: Configuration = {
    auth: {
        clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
        authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
        redirectUri: window.location.origin,
    },
    cache: {
        cacheLocation: "sessionStorage",
    },
};

// Scopes necesarios para leer perfil, usuarios, correos y SharePoint
export const loginRequest: PopupRequest = {
    scopes: ["User.Read", "User.ReadBasic.All", "Mail.Read", "Mail.Send", "Files.ReadWrite.All", "Sites.Read.All"],
};

// Endpoints de Microsoft Graph API
export const graphConfig = {
    graphMeEndpoint: "https://graph.microsoft.com/v1.0/me",
    graphUsersEndpoint: "https://graph.microsoft.com/v1.0/users",
    graphMailEndpoint: "https://graph.microsoft.com/v1.0/me/messages",
    graphSitesEndpoint: "https://graph.microsoft.com/v1.0/sites",
};
