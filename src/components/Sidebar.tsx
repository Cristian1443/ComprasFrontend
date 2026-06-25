import React from 'react';
import { Home, FileText, Users, FolderOpen, Shield, Settings, Menu, X } from 'lucide-react';
import { ViewType } from '../App';

interface SidebarProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ currentView, onNavigate, isOpen, onToggle }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
    { id: 'formulario' as ViewType, label: 'Mis Solicitudes', icon: FileText },
    { id: 'comparacion' as ViewType, label: 'Comparación RF-08', icon: Users },
    { id: 'documentos' as ViewType, label: 'Gestor Documental', icon: FolderOpen },
    { id: 'auditoria' as ViewType, label: 'Auditoría', icon: Shield },
    { id: 'configuracion' as ViewType, label: 'Configuración', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--brand-secondary)] text-white rounded-md shadow-lg"
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full bg-[var(--brand-secondary)] text-white w-64 transform transition-transform duration-300 z-40 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0`}
      >
        <div className="role-sidebar-header" style={{ borderColor: '#245782' }}>
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
          <span className="role-sidebar-subtitle">Compras y Contratación</span>
        </div>

        <nav className="p-4 space-y-2">
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#245782] text-white shadow-md'
                    : 'text-blue-100 hover:bg-[#245782] hover:text-white'
                }`}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-[#245782]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#245782] flex items-center justify-center">
              <span className="text-sm font-semibold">JD</span>
            </div>
            <div>
              <p className="text-sm font-medium">Juan Díaz</p>
              <p className="text-xs text-blue-200">Solicitante</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          onClick={onToggle}
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
        />
      )}
    </>
  );
}
