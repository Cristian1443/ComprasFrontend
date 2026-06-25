import React from 'react';
import { Users, Shield, ScrollText, Settings, Menu, X } from 'lucide-react';
import { ViewAdministrador } from './VistasAdministrador';

interface SidebarAdministradorProps {
  currentView: ViewAdministrador;
  onNavigate: (view: ViewAdministrador) => void;
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export function SidebarAdministrador({ currentView, onNavigate, isOpen, onToggle, userName, userEmail, onLogout }: SidebarAdministradorProps) {
  const menuItems = [
    { id: 'usuarios' as ViewAdministrador, label: 'Usuarios', icon: Users },
    { id: 'roles' as ViewAdministrador, label: 'Matriz de Roles', icon: Shield },
    { id: 'logs' as ViewAdministrador, label: 'Logs de Auditoría', icon: ScrollText },
    { id: 'parametros' as ViewAdministrador, label: 'Parámetros', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 text-white rounded-md shadow-lg"
        style={{ backgroundColor: 'var(--role-admin-primary)' }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`role-sidebar fixed top-0 left-0 h-full text-white w-64 transform transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        style={{ ['--role-primary' as any]: 'var(--role-admin-primary)', ['--role-accent' as any]: 'var(--role-admin-accent)' }}
      >
        <div className="role-sidebar-header">
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
          <span className="role-sidebar-subtitle">Administración</span>
        </div>

        <nav className="role-sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={`role-sidebar-btn ${isActive ? 'role-sidebar-btn-active' : ''}`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="role-sidebar-footer">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold" style={{ backgroundColor: 'var(--role-admin-accent)' }}>
              {userName ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() : 'AD'}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{userName || 'Admin Sistema'}</p>
              <p className="text-xs text-white/75 truncate">{userEmail || 'Administrador'}</p>
            </div>
            {onLogout && (
              <button onClick={onLogout} className="p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" x2="9" y1="12" y2="12" /></svg>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="role-mobile-overlay lg:hidden z-30"
        />
      )}
    </>
  );
}
