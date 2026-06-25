import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarAdministrador } from './SidebarAdministrador';
import { GestionUsuarios } from './GestionUsuarios';
import { MatrizRoles } from './MatrizRoles';
import { LogsAuditoria } from './LogsAuditoria';
import { Parametros } from './Parametros';

export type ViewAdministrador = 'usuarios' | 'roles' | 'logs' | 'parametros';

export function VistasAdministrador() {
  const { instance, accounts } = useMsal();
  const [currentView, setCurrentView] = useState<ViewAdministrador>('usuarios');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Sincroniza automáticamente el usuario con la BD
  useAuthSync();

  const account = accounts[0];
  const userName = account?.name || 'Administrador del Sistema';
  const userEmail = account?.username;

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => console.error(e));
  };

  const renderView = () => {
    switch (currentView) {
      case 'usuarios':
        return <GestionUsuarios />;
      case 'roles':
        return <MatrizRoles />;
      case 'logs':
        return <LogsAuditoria />;
      case 'parametros':
        return <Parametros />;
      default:
        return <GestionUsuarios />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--ui-bg)' }}>
      <SidebarAdministrador
        currentView={currentView}
        onNavigate={setCurrentView}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <main className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 h-full">
          {renderView()}
        </div>
      </main>
    </div>
  );
}
