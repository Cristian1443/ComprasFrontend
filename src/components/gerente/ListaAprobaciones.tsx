import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, CheckCircle, XCircle, Clock, TrendingUp, ChevronRight, LayoutDashboard, ListFilter, Sparkles, ArrowUpRight, ClipboardList, Inbox, History } from 'lucide-react';
import { DetalleAprobacion } from './DetalleAprobacion';
import { UxCard, UxEmptyState, UxLoadingState, UxStatusPill } from '../ui/ux';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function ListaAprobaciones({ userEmail, onActionSuccess }: { userEmail: string, onActionSuccess?: () => void }) {
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any | null>(null);
    const [mostrarTodos, setMostrarTodos] = useState(false);
    const [usuarioActual, setUsuarioActual] = useState<any | null>(null);

    const fetchSolicitudes = async () => {
        if (!userEmail) return;
        try {
            setCargando(true);
            const res = await fetch(`${API_URL}/api/gerente/historial?email=${userEmail}`);
            const data = await res.json();
            const arrayData = Array.isArray(data) ? data : [];
            setSolicitudes(arrayData);
        } catch (err) {
            console.error('Error fetching solicitudes:', err);
            setSolicitudes([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (!userEmail) return;
            try {
                setCargando(true);
                // 1. Cargar info del usuario para auditoría
                const resUser = await fetch(`${API_URL}/api/usuarios/me?email=${userEmail}`);
                if (resUser.ok) {
                    const userData = await resUser.json();
                    setUsuarioActual(userData);
                }
                
                // 2. Cargar solicitudes
                await fetchSolicitudes();
            } catch (err) {
                console.error('Error loading initial data:', err);
            } finally {
                setCargando(false);
            }
        };
        loadInitialData();
    }, [userEmail]);

    if (solicitudSeleccionada) {
        return (
            <DetalleAprobacion
                solicitud={solicitudSeleccionada}
                usuarioActual={usuarioActual}
                onActionSuccess={onActionSuccess}
                onBack={() => {
                    setSolicitudSeleccionada(null);
                    fetchSolicitudes();
                }}
            />
        );
    }

    const displayedSolicitudes = mostrarTodos
        ? solicitudes
        : solicitudes.filter(s => s.estado === 'enviado_gerente');

    const filteredSolicitudes = displayedSolicitudes.filter(sol =>
    ((sol.titulo_contrato || sol.objeto)?.toLowerCase().includes(busqueda.toLowerCase()) ||
        sol.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
        sol.solicitante_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
    );

    return (
        <div className="ux-page p-6 lg:p-10 min-h-screen font-['Gabarito']">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header Profesional */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-1 text-[var(--brand-secondary)]">
                            <Inbox size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Gestión de Solicitudes</span>
                        </div>
                        <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                            Bandeja de <span className="text-[#E84922]">Aprobaciones</span>
                        </h1>
                        <p className="text-slate-500 font-medium text-sm mt-1">
                            Revise, evalue y apruebe las solicitudes radicadas por las áreas a su cargo.
                        </p>
                    </div>

                    <div className="flex bg-white p-1 rounded-xl border border-gray-200 shadow-sm">
                        <button
                            onClick={() => setMostrarTodos(false)}
                            className={`px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${!mostrarTodos ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            style={!mostrarTodos ? { backgroundColor: 'var(--brand-secondary)' } : undefined}
                        >
                            Pendientes
                        </button>
                        <button
                            onClick={() => setMostrarTodos(true)}
                            className={`px-6 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all ${mostrarTodos ? 'text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                            style={mostrarTodos ? { backgroundColor: 'var(--brand-secondary)' } : undefined}
                        >
                            Historial
                        </button>
                    </div>
                </div>

                {/* Resumen Ejecutivo */}
                {!busqueda && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { label: 'Pendientes de Firma', val: solicitudes.filter(s => s.estado === 'enviado_gerente').length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
                            { label: 'Efectividad Operativa', val: '98%', icon: TrendingUp, color: 'text-[var(--brand-secondary)]', bg: 'bg-[rgba(51,132,214,0.08)]' },
                            { label: 'Trámites Gestionados', val: solicitudes.length, icon: ClipboardList, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                                <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center`}>
                                    <card.icon size={24} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{card.label}</p>
                                    <p className="text-xl font-black text-gray-900">{card.val}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Buscador */}
                <div className="relative group ux-search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[var(--brand-secondary)]" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por código, título o solicitante..."
                        className="w-full pl-16 pr-8 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none transition-all font-medium text-slate-800 shadow-sm shadow-slate-200/50"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                {/* Listado de Solicitudes */}
                <div className="space-y-4 pb-12">
                    {cargando ? (
                        <UxLoadingState text="Cargando información segura..." className="rounded-2xl p-24 ux-fade-in" />
                    ) : filteredSolicitudes.length === 0 ? (
                        <UxEmptyState
                            title="No se encontraron solicitudes"
                            description="No hay procesos que requieran su atención en este momento."
                            icon={<Inbox size={48} />}
                            className="rounded-2xl p-20"
                        />
                    ) : (
                        <div className="ux-card rounded-2xl overflow-hidden">
                            <table className="ux-table">
                                <thead className="border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Código</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Título / Solicitante</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Estado</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Valor Estimado</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredSolicitudes.map((sol) => (
                                        <tr
                                            key={sol.id}
                                            onClick={() => setSolicitudSeleccionada(sol)}
                                            className="hover:bg-gray-50/80 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-6">
                                                <span className="font-black text-xs px-2 py-1 rounded" style={{ color: 'var(--brand-secondary)', backgroundColor: 'rgba(47,111,163,0.1)' }}>
                                                    {sol.codigo || '—'}
                                                </span>
                                                <p className="text-[10px] text-gray-400 font-medium mt-1">v{sol.version}</p>
                                            </td>
                                            <td className="px-6 py-6 max-w-md">
                                                <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-1 transition-colors group-hover:text-[var(--brand-secondary)]">
                                                    {sol.titulo_contrato || sol.objeto || 'Sin título'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{sol.solicitante_nombre}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                    <span className="text-[10px] text-gray-400 italic">{sol.gerencia_nombre}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <span>
                                                    <UxStatusPill tone={sol.estado === 'enviado_gerente' ? 'warning' : sol.estado.includes('aprobado') ? 'success' : 'neutral'}>
                                                    {sol.estado === 'enviado_gerente' ? 'Pendiente' : sol.estado.replace('_', ' ')}
                                                    </UxStatusPill>
                                                </span>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                {(() => {
                                                    const m = String(sol.moneda || 'COP').toUpperCase();
                                                    const valorTexto = m === 'USD' ? sol.valor_moneda_usd_texto :
                                                                       m === 'EUR' ? sol.valor_moneda_eur_texto :
                                                                       sol.valor_moneda_cop_texto;
                                                    return (
                                                      <p className="text-sm font-black text-gray-900 font-mono">
                                                          {valorTexto
                                                            ? `${sol.moneda || 'COP'} ${valorTexto}`
                                                            : new Intl.NumberFormat('es-CO', {
                                                                style: 'currency',
                                                                currency: sol.moneda === 'COMBINADA' ? 'COP' : (sol.moneda || 'COP'),
                                                                maximumFractionDigits: 0
                                                              }).format(sol.valor_estimado)}
                                                      </p>
                                                    );
                                                })()}
                                                <p className="text-[9px] text-gray-400 font-bold uppercase">{sol.moneda || 'COP'}</p>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <button
                                                    className="p-2.5 bg-gray-100 text-gray-400 rounded-xl transition-all shadow-sm group-hover:text-white"
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--brand-secondary)'; }}
                                                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ''; }}
                                                >
                                                    <ChevronRight size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    <p className="text-[10px] text-gray-400 text-center pt-4 font-medium italic">
                        Mostrando {filteredSolicitudes.length} solicitudes registradas bajo su gerencia.
                    </p>
                </div>
            </div>
        </div>
    );
}
