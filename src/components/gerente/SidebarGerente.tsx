import React from 'react';
import { Home, ClipboardCheck, History, Menu, X, LogOut, MessageSquare, Receipt } from 'lucide-react';

export type ViewGerente = 'dashboard' | 'pendientes' | 'historial' | 'ayuda' | 'facturas';

interface SidebarGerenteProps {
    currentView: ViewGerente;
    onNavigate: (view: ViewGerente) => void;
    isOpen: boolean;
    onToggle: () => void;
    userName?: string;
    userEmail?: string;
    onLogout?: () => void;
    pendingCount?: number;
}

export function SidebarGerente({ currentView, onNavigate, isOpen, onToggle, userName, userEmail, onLogout, pendingCount = 0 }: SidebarGerenteProps) {
    const menuItems = [
        { id: 'dashboard' as ViewGerente, label: 'Panel Principal', icon: Home },
        { id: 'pendientes' as ViewGerente, label: 'Por Aprobar', icon: ClipboardCheck },
        { id: 'facturas' as ViewGerente, label: 'Facturas', icon: Receipt },
        { id: 'historial' as ViewGerente, label: 'Mi Historial', icon: History },
        { id: 'ayuda' as ViewGerente, label: 'Chat de Ayuda', icon: MessageSquare },
    ];

    const initials = userName
        ? userName.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
        : 'GA';

    return (
        <>
            {/* Mobile Toggle Button */}
            <button
                onClick={onToggle}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 text-white rounded-md shadow-lg"
                style={{ backgroundColor: 'var(--role-primary)' }}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside
                className={`role-sidebar fixed top-0 left-0 h-full text-white w-64 transform transition-transform duration-300 z-40 ${isOpen ? 'translate-x-0' : '-translate-x-full'
                    } lg:translate-x-0`}
                style={{ ['--role-primary' as any]: '#2c3e50', ['--role-accent' as any]: 'var(--brand-primary)' }}
            >
                <div className="role-sidebar-header">
                    <img src="/logo-iib-blanco.png" alt="Invest in Bogotá" />
                    <span className="role-sidebar-subtitle">Área de Gerencia</span>
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
                                {item.id === 'pendientes' && pendingCount > 0 && (
                                    <span className="ml-auto text-white text-[10px] px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--brand-primary)' }}>{pendingCount}</span>
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* User Info + Logout */}
                <div className="role-sidebar-footer">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'var(--brand-primary)' }}>
                            <span className="text-sm font-semibold text-white" style={{ fontFamily: 'Gabarito, sans-serif' }}>{initials}</span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-sm font-medium leading-tight truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userName || 'Gerente de Área'}</p>
                            <p className="text-xs text-white/75 truncate mt-0.5" style={{ fontFamily: 'Gabarito, sans-serif' }}>{userEmail || 'Gerencia'}</p>
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
