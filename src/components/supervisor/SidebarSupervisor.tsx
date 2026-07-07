import React from 'react';
import { Home, FileText, HelpCircle, Menu, X, Plus, LogOut, FileCheck2, ClipboardCheck, Receipt } from 'lucide-react';
import { ViewSupervisor } from './VistasSupervisor';

interface SidebarSupervisorProps {
  currentView: ViewSupervisor;
  onNavigate: (view: ViewSupervisor) => void;
  onNuevaSolicitud: () => void;
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
}

export function SidebarSupervisor({ currentView, onNavigate, onNuevaSolicitud, isOpen, onToggle, userName, userEmail, onLogout }: SidebarSupervisorProps) {
  const menuItems = [
    { id: 'dashboard' as ViewSupervisor, label: 'Panel', icon: Home },
    { id: 'solicitudes' as ViewSupervisor, label: 'Mis Solicitudes', icon: FileText },
    { id: 'calificacionProponentes' as ViewSupervisor, label: 'Calificar Proponentes', icon: ClipboardCheck },
    { id: 'contratos' as ViewSupervisor, label: 'Supervision', icon: FileCheck2 },
    { id: 'historialFacturas' as ViewSupervisor, label: 'Histórico de Facturas', icon: Receipt },
    { id: 'ayuda' as ViewSupervisor, label: 'Ayuda', icon: HelpCircle },
  ];

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'JD';

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-[60] p-2 text-white rounded-md shadow-lg"
        style={{ backgroundColor: 'var(--brand-secondary)' }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Overlay */}
      {isOpen && (
        <div className="role-mobile-overlay lg:hidden z-[45]" onClick={onToggle} />
      )}

      {/* Sidebar */}
      <aside
        className={`role-sidebar fixed top-0 left-0 h-full text-white w-64 transform transition-transform duration-300 z-50 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        style={{ ['--role-primary' as any]: 'var(--brand-secondary)', ['--role-accent' as any]: 'var(--brand-primary)' }}
        data-sidebar-role="supervisor"
      >
        <div className="role-sidebar-header">
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
          <span className="role-sidebar-subtitle">Compras y Contratación</span>
        </div>

        {/* Botón Nueva Solicitud Destacado */}
        <div className="p-4 pb-2">
          <button
            onClick={() => {
              onNuevaSolicitud();
              if (window.innerWidth < 1024) {
                onToggle();
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-white rounded-lg shadow-lg hover:shadow-xl transition-all font-semibold"
            style={{ backgroundColor: '#E84922', fontFamily: 'Gabarito, sans-serif' }}
          >
            <Plus size={20} />
            Nueva Solicitud
          </button>
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

        {/* User Info + Logout */}
        <div className="role-sidebar-footer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-accent)' }}>
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Gabarito, sans-serif' }}>{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-tight break-words" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userName || 'Juan Díaz'}</p>
              <p className="text-xs text-white/75 truncate mt-0.5" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userEmail || 'Solicitante'}</p>
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

    </>
  );
}