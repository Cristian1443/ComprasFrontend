import React from 'react';
import { LayoutDashboard, Inbox, History, Users, Menu, X, LogOut, Mail, FileCheck2, BarChart2 } from 'lucide-react';
import { ViewJuridica } from './VistaJuridica';

interface SidebarJuridicaProps {
  currentView: ViewJuridica;
  onNavigate: (view: ViewJuridica) => void;
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export function SidebarJuridica({ currentView, onNavigate, isOpen, onToggle, userName, userEmail, onLogout }: SidebarJuridicaProps) {
  const menuItems = [
    { id: 'dashboard' as ViewJuridica, label: 'Dashboard Global', icon: LayoutDashboard },
    { id: 'powerbi' as ViewJuridica, label: 'Dashboard BI', icon: BarChart2 },
    { id: 'bandeja' as ViewJuridica, label: 'Bandeja de Entrada', icon: Inbox },
    { id: 'convocatorias' as ViewJuridica, label: 'Convocatorias', icon: Mail },
    { id: 'historial' as ViewJuridica, label: 'Historial Jurídica', icon: History },
    { id: 'contratos' as ViewJuridica, label: 'Contratos', icon: FileCheck2 },
    { id: 'proveedores' as ViewJuridica, label: 'Proveedores', icon: Users },
  ];
  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'JU';

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 text-white rounded-md shadow-lg"
        style={{ backgroundColor: 'var(--brand-secondary)' }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`role-sidebar fixed top-0 left-0 h-full text-white w-64 transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
        style={{ ['--role-primary' as any]: 'var(--brand-secondary)', ['--role-accent' as any]: 'var(--brand-accent)' }}
      >
        <div className="role-sidebar-header">
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
          <span className="role-sidebar-subtitle">Área Jurídica</span>
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
                <span className="font-medium" style={{ fontFamily: 'Gabarito, sans-serif' }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="role-sidebar-footer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent)' }}>
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Gabarito, sans-serif' }}>{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-tight truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userName || 'Área Jurídica'}</p>
              <p className="text-xs text-white/75 truncate mt-0.5" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userEmail || 'Juridica'}</p>
            </div>
            {onLogout && (
              <button
                onClick={onLogout}
                title="Cerrar sesión"
                className="flex-shrink-0 p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-md transition-colors"
              >
                <LogOut size={18} />
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
