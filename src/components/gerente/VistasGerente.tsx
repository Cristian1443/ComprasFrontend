import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getUserProfile } from '../../lib/graphService';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarGerente, ViewGerente } from './SidebarGerente';
import { ListaAprobaciones } from './ListaAprobaciones';
import { DashboardGerente } from './DashboardGerente';
import { HistorialAprobaciones } from './HistorialAprobaciones';
import { ChatSoporteGerente } from './ChatSoporteGerente';
import { FacturasGerente } from './FacturasGerente';
import { ContratosGerente } from './ContratosGerente';

export function VistasGerente() {
    const { instance, accounts } = useMsal();
    const [currentView, setCurrentView] = useState<ViewGerente>('dashboard');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    // Sincroniza automáticamente el usuario con la BD
    const { usuarioDB } = useAuthSync();

    const [metrics, setMetrics] = useState<any>(null);
    const [loadingMetrics, setLoadingMetrics] = useState(false);

    const account = accounts[0];
    const userName = account?.name || 'Gerente de Área';
    const userEmail = account?.username;

    const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

    const fetchMetrics = async () => {
        if (!userEmail) return;
        setLoadingMetrics(true);
        try {
            const res = await apiFetch(`${API_URL}/api/gerente/metrics?email=${userEmail}`);
            if (res.ok) {
                const data = await res.json();
                setMetrics(data);
            }
        } catch (err) {
            console.error('Error fetching manager metrics:', err);
        } finally {
            setLoadingMetrics(false);
        }
    };

    useEffect(() => {
        if (account) {
            instance.acquireTokenSilent({ ...loginRequest, account }).then(res => {
                getUserProfile(res.accessToken).then(profile => setUserProfile(profile));
            }).catch(console.error);
        }
    }, [account]);

    useEffect(() => {
        fetchMetrics();
    }, [userEmail]);

    const handleLogout = () => {
        instance.logoutRedirect().catch(e => console.error(e));
    };

    const renderView = () => {
        switch (currentView) {
            case 'dashboard':
                return <DashboardGerente
                    userName={userName}
                    userEmail={userEmail}
                    initialMetrics={metrics}
                    isLoading={loadingMetrics}
                    onGoPendientes={() => setCurrentView('pendientes')}
                    onGoHistorial={() => setCurrentView('historial')}
                />;
            case 'pendientes':
                return <ListaAprobaciones userEmail={userEmail} onActionSuccess={fetchMetrics} />;
            case 'contratos':
                return <ContratosGerente userEmail={userEmail} />;
            case 'historial':
                return <HistorialAprobaciones userEmail={userEmail} />;
            case 'facturas':
                return <FacturasGerente />;
            case 'ayuda':
                return <ChatSoporteGerente userName={userName} />;
            default:
                return <DashboardGerente
                    userName={userName}
                    userEmail={userEmail}
                    initialMetrics={metrics}
                    isLoading={loadingMetrics}
                    onGoPendientes={() => setCurrentView('pendientes')}
                    onGoHistorial={() => setCurrentView('historial')}
                />;
        }
    };

    return (
        <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--ui-bg)' }}>
            <SidebarGerente
                currentView={currentView}
                onNavigate={setCurrentView}
                isOpen={sidebarOpen}
                onToggle={() => setSidebarOpen(!sidebarOpen)}
                userName={userName}
                userEmail={userEmail}
                onLogout={handleLogout}
                pendingCount={metrics?.stats?.pendientes}
            />
            <main className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
                    {renderView()}
                </div>
            </main>
        </div>
    );
}
