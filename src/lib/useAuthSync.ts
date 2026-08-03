import { apiFetch } from './apiClient';
// ============================================================
// Hook: useAuthSync
// Sincroniza el usuario de Azure AD con la base de datos
// al iniciar sesión. Se llama una vez por sesión.
// ============================================================

import { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../authConfig';
import { getUserProfile } from './graphService';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export interface UsuarioDB {
    id: string;
    rol: 'administrador' | 'gerente_area' | 'supervisor' | 'juridica' | 'financiera';
    gerencia_id: string | null;
    gerencia_nombre: string | null;
    es_nuevo: boolean;
}

export function useAuthSync() {
    const { instance, accounts, inProgress } = useMsal();
    const [usuarioDB, setUsuarioDB] = useState<UsuarioDB | null>(null);
    const [sincronizando, setSincronizando] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const account = accounts[0];
        if (!account || inProgress !== 'none') return;

        // Evitar doble llamada en la misma sesión
        const syncKey = `synced_${account.localAccountId}`;
        if (sessionStorage.getItem(syncKey)) {
            // Ya se sincronizó en esta sesión — solo cargar del sessionStorage
            const cached = sessionStorage.getItem(`usuario_db_${account.localAccountId}`);
            if (cached) setUsuarioDB(JSON.parse(cached));
            return;
        }

        setSincronizando(true);
        setError(null);

        instance
            .acquireTokenSilent({ ...loginRequest, account })
            .then(async (tokenResponse) => {
                // Obtener perfil completo con department desde Graph API
                const profile = await getUserProfile(tokenResponse.accessToken);

                // Llamar al API para sincronizar en la BD
                const response = await apiFetch(`${API_URL}/api/auth/sync`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        azure_id: account.localAccountId,   // Object ID real desde el token
                        email: account.username,
                        nombre: account.name || profile.displayName,
                        cargo: profile.jobTitle || null,
                        departamento: profile.department || null,
                    }),
                });

                if (!response.ok) throw new Error(`Error API: ${response.status}`);

                const data: UsuarioDB = await response.json();
                setUsuarioDB(data);

                // Cachear en sessionStorage para no repetir en la misma sesión
                sessionStorage.setItem(syncKey, 'true');
                sessionStorage.setItem(
                    `usuario_db_${account.localAccountId}`,
                    JSON.stringify(data)
                );

                if (data.es_nuevo) {
                    console.log('✅ Nuevo usuario registrado en la base de datos:', account.username);
                }
            })
            .catch((err) => {
                console.error('Error sincronizando con la BD:', err);
                setError('No se pudo sincronizar con la base de datos.');
            })
            .finally(() => setSincronizando(false));
    }, [accounts, inProgress]);

    return { usuarioDB, sincronizando, error };
}
