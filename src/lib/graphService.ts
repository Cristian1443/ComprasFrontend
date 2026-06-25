import { Client } from "@microsoft/microsoft-graph-client";
import { graphConfig } from "../authConfig";

export async function getGraphClient(accessToken: string) {
    return Client.init({
        authProvider: (done) => {
            done(null, accessToken);
        },
    });
}

export async function getUserProfile(accessToken: string) {
    const client = await getGraphClient(accessToken);
    return await client.api("/me").select("displayName,mail,department,jobTitle").get();
}

export async function getCompanyUsers(accessToken: string) {
    const client = await getGraphClient(accessToken);
    try {
        // Consulta ideal: solo usuarios activos (requiere permisos para accountEnabled).
        return await client
            .api("/users")
            .filter("accountEnabled eq true")
            .select("id,displayName,mail,userPrincipalName,jobTitle,department,accountEnabled")
            .top(999)
            .get();
    } catch (_error) {
        // Fallback: cuando el tenant no permite leer accountEnabled con los scopes actuales.
        return await client
            .api("/users")
            .select("id,displayName,mail,userPrincipalName,jobTitle,department")
            .top(999)
            .get();
    }
}

export async function getCompanyUsersFromGroup(accessToken: string, groupId: string) {
    const client = await getGraphClient(accessToken);
    const usersById = new Map<string, any>();

    const addUsers = (items: any[]) => {
        for (const u of items || []) {
            if (!u) continue;
            // En consultas sin cast, pueden venir otros tipos de objetos (grupos/dispositivos).
            if (u["@odata.type"] && u["@odata.type"] !== "#microsoft.graph.user") continue;
            if (!u.id) continue;
            usersById.set(u.id, u);
        }
    };

    const collectFrom = async (initialPath: string) => {
        let nextUrl: string | null = initialPath;
        while (nextUrl) {
            const req = client.api(nextUrl).header("ConsistencyLevel", "eventual");
            const response = await req.get();
            if (Array.isArray(response?.value)) addUsers(response.value);
            nextUrl = response?.["@odata.nextLink"] || null;
        }
    };

    const errors: string[] = [];

    // Estrategia 1: miembros transitivos tipados a usuario (incluye anidamientos).
    try {
        await collectFrom(`/groups/${groupId}/transitiveMembers/microsoft.graph.user?$select=id,displayName,mail,userPrincipalName,jobTitle,department&$top=999`);
    } catch (e: any) {
        errors.push(`transitiveMembers cast: ${e?.message || "error"}`);
    }

    // Estrategia 2: miembros directos tipados a usuario.
    if (usersById.size === 0) {
        try {
            await collectFrom(`/groups/${groupId}/members/microsoft.graph.user?$select=id,displayName,mail,userPrincipalName,jobTitle,department&$top=999`);
        } catch (e: any) {
            errors.push(`members cast: ${e?.message || "error"}`);
        }
    }

    // Estrategia 3: miembros transitivos sin cast (filtrado local por tipo user).
    if (usersById.size === 0) {
        try {
            await collectFrom(`/groups/${groupId}/transitiveMembers?$select=id,displayName,mail,userPrincipalName,jobTitle,department&$top=999`);
        } catch (e: any) {
            errors.push(`transitiveMembers raw: ${e?.message || "error"}`);
        }
    }

    if (usersById.size === 0 && errors.length > 0) {
        throw new Error(`No se pudieron obtener miembros del grupo ${groupId}. Detalle: ${errors.join(" | ")}`);
    }

    return { value: Array.from(usersById.values()) };
}

export async function hydrateUsersDepartment(accessToken: string, users: any[]) {
    const client = await getGraphClient(accessToken);
    const safeUsers = Array.isArray(users) ? users : [];
    const missingDepartment = safeUsers.filter((u) => u?.id && !String(u?.department || "").trim());

    if (missingDepartment.length === 0) return safeUsers;

    const departmentById = new Map<string, string>();

    // Completa department por usuario cuando no viene en la consulta de miembros de grupo.
    await Promise.all(
        missingDepartment.map(async (u) => {
            try {
                const detail = await client
                    .api(`/users/${u.id}`)
                    .select("id,department")
                    .get();
                const dept = String(detail?.department || "").trim();
                if (dept) departmentById.set(String(u.id), dept);
            } catch {
                // Si no hay permisos para esta lectura puntual, se conserva el valor existente.
            }
        })
    );

    return safeUsers.map((u) => ({
        ...u,
        department: departmentById.get(String(u?.id)) || u?.department || "",
    }));
}

export async function getRecentEmails(accessToken: string) {
    const client = await getGraphClient(accessToken);
    return await client.api("/me/messages").select("subject,from,receivedDateTime").top(5).get();
}

export async function sendEmail(
    accessToken: string,
    to: string,
    subject: string,
    htmlBody: string
) {
    const client = await getGraphClient(accessToken);
    await client.api("/me/sendMail").post({
        message: {
            subject,
            importance: "High",
            body: {
                contentType: "HTML",
                content: htmlBody,
            },
            toRecipients: [
                {
                    emailAddress: {
                        address: to,
                    },
                },
            ],
        },
        saveToSentItems: true,
    });
}

// --- SharePoint Functions ---

/**
 * Busca un sitio de SharePoint por su nombre o URL.
 */
export async function searchSharePointSite(accessToken: string, siteName: string) {
    const client = await getGraphClient(accessToken);
    return await client.api(`/sites?search=${encodeURIComponent(siteName)}`).get();
}

/**
 * Obtiene las bibliotecas de documentos (Drives) de un sitio específico.
 */
export async function getSiteDrives(accessToken: string, siteId: string) {
    const client = await getGraphClient(accessToken);
    return await client.api(`/sites/${siteId}/drives`).get();
}

/**
 * Obtiene el contenido de una carpeta en un Drive específico.
 */
export async function getDriveItems(accessToken: string, driveId: string, path: string = "root") {
    const client = await getGraphClient(accessToken);
    const apiPath = path === "root" ? `/drives/${driveId}/root/children` : `/drives/${driveId}/root:/${path}:/children`;
    return await client.api(apiPath).get();
}

/**
 * Sube un archivo a una carpeta específica en SharePoint.
 * Utiliza sesiones de carga para manejar archivos de cualquier tamaño de forma robusta.
 */
export async function uploadFileToSharePoint(
    accessToken: string,
    driveId: string,
    folderPath: string,
    file: File,
    onProgress?: (progress: number) => void
) {
    const client = await getGraphClient(accessToken);
    const fileName = file.name;
    const path = folderPath ? `${folderPath}/${fileName}` : fileName;

    // Crear sesión de carga
    const uploadSession = await client.api(`/drives/${driveId}/root:/${path}:/createUploadSession`).post({
        item: {
            "@microsoft.graph.conflictBehavior": "rename",
            name: fileName,
        },
    });

    const uploadUrl = uploadSession.uploadUrl;
    const fileSize = file.size;
    const sliceSize = 327680 * 10; // ~3.2MB por fragmento (debe ser múltiplo de 327,680 bytes)
    let start = 0;

    while (start < fileSize) {
        const end = Math.min(start + sliceSize, fileSize);
        const fileSlice = file.slice(start, end);
        const arrayBuffer = await fileSlice.arrayBuffer();

        const response = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
                "Content-Length": `${end - start}`,
                "Content-Range": `bytes ${start}-${end - 1}/${fileSize}`,
            },
            body: arrayBuffer,
        });

        if (!response.ok && response.status !== 201 && response.status !== 200) {
            throw new Error(`Error subiendo fragmento: ${response.statusText}`);
        }

        start = end;
        if (onProgress) {
            onProgress(Math.round((start / fileSize) * 100));
        }

        if (response.status === 201 || response.status === 200) {
            return await response.json();
        }
    }
}
