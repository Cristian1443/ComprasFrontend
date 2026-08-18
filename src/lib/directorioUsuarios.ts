import { loginRequest } from '../authConfig';
import { getCompanyUsers, getCompanyUsersFromGroup, hydrateUsersDepartment } from './graphService';
import { apiFetch } from './apiClient';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_SECURITY_GROUP_ID = '1d5f9278-85f5-4f01-a651-e6c1e160cc55';

export interface CandidatoDirectorio {
  /** ID de objeto de Azure AD (no es el id de la fila en `usuarios`) */
  id: string;
  nombre: string;
  email: string;
  cargo: string;
  gerencia_nombre?: string;
}

/**
 * Trae las personas del grupo de seguridad de Azure AD configurado (todo el
 * directorio activo de la organización), no solo quienes ya iniciaron sesión
 * alguna vez en el portal — a diferencia de GET /api/usuarios, que solo lista
 * filas ya sincronizadas en la base de datos.
 * Si Graph falla (sin permisos, sin sesión, tenant sin acceso, etc.) cae a
 * GET /api/usuarios como respaldo para no dejar la pantalla sin opciones.
 */
export async function cargarUsuariosDirectorio(instance: any, accounts: any[]): Promise<CandidatoDirectorio[]> {
  const account = accounts?.[0];
  if (!account) return cargarDesdeApi();

  try {
    const groupId =
      (import.meta as any).env.VITE_SECURITY_GROUP_ID ||
      (import.meta as any).env.VITE_AAD_SECURITY_GROUP_ID ||
      DEFAULT_SECURITY_GROUP_ID;

    const baseScopes = [...new Set([...(loginRequest.scopes || []), 'GroupMember.Read.All'])];
    const extendedScopes = [...new Set([...baseScopes, 'User.Read.All', 'Directory.Read.All'])];

    let tokenResponse;
    try {
      tokenResponse = await instance.acquireTokenSilent({ ...loginRequest, account, scopes: extendedScopes });
    } catch {
      try {
        tokenResponse = await instance.acquireTokenPopup({ ...loginRequest, account, scopes: extendedScopes, prompt: 'consent' });
      } catch {
        tokenResponse = await instance.acquireTokenSilent({ ...loginRequest, account, scopes: baseScopes });
      }
    }

    const graphResponse = groupId
      ? await getCompanyUsersFromGroup(tokenResponse.accessToken, groupId)
      : await getCompanyUsers(tokenResponse.accessToken);

    const rawUsers = Array.isArray(graphResponse?.value) ? graphResponse.value : [];
    const hydrated = await hydrateUsersDepartment(tokenResponse.accessToken, rawUsers);

    const candidatos: CandidatoDirectorio[] = hydrated
      .map((g: any) => ({
        id: g.id,
        nombre: g.displayName || g.mail || g.userPrincipalName || 'Sin nombre',
        email: String(g.mail || g.userPrincipalName || '').toLowerCase(),
        cargo: g.jobTitle || '',
        gerencia_nombre: g.department || '',
      }))
      .filter((c: CandidatoDirectorio) => !!c.email)
      .sort((a: CandidatoDirectorio, b: CandidatoDirectorio) => a.nombre.localeCompare(b.nombre));

    return candidatos.length > 0 ? candidatos : await cargarDesdeApi();
  } catch {
    return cargarDesdeApi();
  }
}

async function cargarDesdeApi(): Promise<CandidatoDirectorio[]> {
  try {
    const res = await apiFetch(`${API_URL}/api/usuarios`);
    const data = await res.json();
    return Array.isArray(data)
      ? data.map((u: any) => ({
          id: u.id,
          nombre: u.nombre,
          email: u.email,
          cargo: u.cargo || '',
          gerencia_nombre: u.gerencia_nombre || '',
        }))
      : [];
  } catch {
    return [];
  }
}