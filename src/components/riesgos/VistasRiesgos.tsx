import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarRiesgos, ViewRiesgos } from './SidebarRiesgos';
import { ListaRiesgos } from './ListaRiesgos';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function VistasRiesgos() {
    const { instance, accounts } = useMsal();
    const [currentView, setCurrentView] = useState<ViewRiesgos>('pendientes');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Sincroniza automáticamente el usuario con la BD
    useAuthSync();

    const [metrics, setMetrics] = useState<{ pendientes?: number; aprobadas?: number; rechazadas?: number }>({});

    const account = accounts[0];
    const userName = account?.name || 'Riesgos';
    const userEmail = account?.username;

    const fetchMetrics = async () => {
        try {
            const res = await apiFetch(`${API_URL}/api/riesgos/metrics`);
            if (res.ok) setMetrics(await res.json());
        } catch (err) {
            console.error('Error fetching riesgos metrics:', err);
        }
    };

    useEffect(() => {
        fetchMetrics();
    }, [userEmail]);

    const handleLogout = () => {
        instance.logoutRedirect().catch(e => console.error(e));
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--ui-bg)' }}>
            <SidebarRiesgos
                currentView={currentView}
                onNavigate={setCurrentView}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                pendingCount={metrics?.pendientes}
            />
            <main className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
                    <ListaRiesgos userEmail={userEmail} onActionSuccess={fetchMetrics} />
                </div>
            </main>
        </div>
    );
}
