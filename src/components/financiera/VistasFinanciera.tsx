import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getUserProfile } from '../../lib/graphService';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarFinanciera } from './SidebarFinanciera';
import { ViewFinanciera } from './VistaFinanciera';
import { DashboardFinanciera } from './DashboardFinanciera';
import { AprobacionPresupuestal } from './AprobacionPresupuestal';
import { HistorialFinanciera } from './HistorialFinanciera';
import { ControlPagos } from './ControlPagos';
import { ReportesFinanciera } from './ReportesFinanciera';
import { ConfirmacionPagos } from './ConfirmacionPagos';
import { PresupuestoVigencia } from './PresupuestoVigencia';

export function VistasFinanciera() {
  const { instance, accounts } = useMsal();
  const [currentView, setCurrentView] = useState<ViewFinanciera>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Sincroniza automáticamente el usuario con la BD
  const { usuarioDB } = useAuthSync();

  const [metrics, setMetrics] = useState<any>(null);
  const [loadingMetrics, setLoadingMetrics] = useState(false);

  const account = accounts[0];
  const userName = account?.name || 'Profesional Financiero';
  const userEmail = account?.username;

  const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

  const fetchMetrics = async () => {
    setLoadingMetrics(true);
    try {
      const res = await fetch(`${API_URL}/api/financiera/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error('Error fetching financial metrics:', err);
    } finally {
      setLoadingMetrics(false);
    }
  };

  useEffect(() => {
    if (account) {
      instance.acquireTokenSilent({ ...loginRequest, account }).then(res => {
        getUserProfile(res.accessToken).then((profile: any) => setUserProfile(profile));
      }).catch(console.error);
    }
  }, [account, instance]);

  useEffect(() => {
    fetchMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => console.error(e));
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardFinanciera
          userName={userName}
          initialMetrics={metrics}
          isLoading={loadingMetrics}
        />;
      case 'aprobacion':
        return <AprobacionPresupuestal
          financieraId={usuarioDB?.id}
          onActionSuccess={fetchMetrics}
        />;
      case 'vigencia':
        return <PresupuestoVigencia />;
      case 'historial':
        return <HistorialFinanciera />;
      case 'pagos':
        return <ControlPagos onGoAprobacion={() => setCurrentView('aprobacion')} />;
      case 'reportes':
        return <ReportesFinanciera />;
      case 'confirmacion_pagos':
        return <ConfirmacionPagos userEmail={userEmail} />;
      default:
        return <DashboardFinanciera
          userName={userName}
          initialMetrics={metrics}
          isLoading={loadingMetrics}
        />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--ui-bg)' }}>
      <SidebarFinanciera
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
        pendingCount={metrics?.stats?.pendientes}
      />
      <main className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${isSidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
