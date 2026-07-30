import React from 'react';
import { Home, CreditCard, BarChart3, Menu, X, LogOut, DollarSign, History, BadgeCheck, Gauge } from 'lucide-react';
import { ViewFinanciera } from './VistaFinanciera';

interface SidebarFinancieraProps {
  currentView: ViewFinanciera;
  onNavigate: (view: ViewFinanciera) => void;
  isOpen: boolean;
  onToggle: () => void;
  userName?: string;
  userEmail?: string;
  onLogout?: () => void;
  pendingCount?: number;
}

export function SidebarFinanciera({ currentView, onNavigate, isOpen, onToggle, userName, userEmail, onLogout, pendingCount = 0 }: SidebarFinancieraProps) {
  const menuItems = [
    { id: 'dashboard' as ViewFinanciera, label: 'Panel Principal', icon: Home },
    { id: 'aprobacion' as ViewFinanciera, label: 'Solicitudes', icon: DollarSign },
    { id: 'vigencia' as ViewFinanciera, label: 'Presupuesto Vigencia', icon: Gauge },
    { id: 'historial' as ViewFinanciera, label: 'Historial', icon: History },
    { id: 'pagos' as ViewFinanciera, label: 'Aprobación de Facturas', icon: CreditCard },
    { id: 'confirmacion_pagos' as ViewFinanciera, label: 'Confirmación de Pagos', icon: BadgeCheck },
    { id: 'reportes' as ViewFinanciera, label: 'Reportes', icon: BarChart3 },
  ];

  const initials = userName
    ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'FI';

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={onToggle}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 text-white rounded-md shadow-lg"
        style={{ backgroundColor: '#1e293b' }}
      >
        {isOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`role-sidebar fixed top-0 left-0 h-full text-white w-64 transform transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0`}
        style={{ ['--role-primary' as any]: '#1e293b', ['--role-accent' as any]: '#10b981' }}
      >
        <div className="role-sidebar-header">
          <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
          <span className="role-sidebar-subtitle">Área Financiera</span>
        </div>

        <nav className="role-sidebar-nav mt-4">
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
                style={{ fontFamily: 'Gabarito, sans-serif' }}
              >
                <Icon size={20} />
                <span className="font-medium">{item.label}</span>
                {item.id === 'aprobacion' && pendingCount > 0 && (
                  <span className="ml-auto text-white text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }}>{pendingCount}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Info + Logout */}
        <div className="role-sidebar-footer">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#10b981' }}>
              <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Gabarito, sans-serif' }}>{initials}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium leading-tight truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userName || 'Carlos López'}</p>
              <p className="text-xs text-white/75 truncate mt-0.5" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userEmail || 'Financiera'}</p>
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
