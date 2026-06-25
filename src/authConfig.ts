import { Configuration, PopupRequest } from "@azure/msal-browser";

// Configuración de MSAL
export const msalConfig: Configuration = {
    auth: {
        clientId: "2784d1dd-ec70-4400-866d-2939b6aee928",
        authority: "https://login.microsoftonline.com/d6d5fec3-991b-462a-af0d-4b24ca6a4c11",
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
