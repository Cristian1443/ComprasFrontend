import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { Search, ChevronRight, ShieldAlert, ClipboardList } from 'lucide-react';
import { DetalleRiesgos } from './DetalleRiesgos';
import { UxEmptyState, UxLoadingState, UxStatusPill } from '../ui/ux';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function ListaRiesgos({ userEmail, onActionSuccess }: { userEmail: string, onActionSuccess?: () => void }) {
    const [solicitudes, setSolicitudes] = useState<any[]>([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargando, setCargando] = useState(true);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<any | null>(null);
    const [usuarioActual, setUsuarioActual] = useState<any | null>(null);

    const fetchSolicitudes = async () => {
        try {
            setCargando(true);
            const res = await apiFetch(`${API_URL}/api/riesgos/solicitudes`);
            const data = await res.json();
            setSolicitudes(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching solicitudes de riesgos:', err);
            setSolicitudes([]);
        } finally {
            setCargando(false);
        }
    };

    useEffect(() => {
        const loadInitialData = async () => {
            if (!userEmail) return;
            try {
                const resUser = await apiFetch(`${API_URL}/api/usuarios/me?email=${userEmail}`);
                if (resUser.ok) {
                    const userData = await resUser.json();
                    setUsuarioActual(userData);
                }
            } catch (err) {
                console.error('Error loading initial data:', err);
            }
            await fetchSolicitudes();
        };
        loadInitialData();
    }, [userEmail]);

    if (solicitudSeleccionada) {
        return (
            <DetalleRiesgos
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

    const filteredSolicitudes = solicitudes.filter(sol =>
        ((sol.titulo_contrato || sol.objeto)?.toLowerCase().includes(busqueda.toLowerCase()) ||
            sol.codigo?.toLowerCase().includes(busqueda.toLowerCase()) ||
            sol.solicitante_nombre?.toLowerCase().includes(busqueda.toLowerCase()))
    );

    return (
        <div className="ux-page p-6 lg:p-10 min-h-screen font-['Gabarito']">
            <div className="max-w-7xl mx-auto space-y-8">

                <div>
                    <div className="flex items-center gap-2 mb-1" style={{ color: '#7c2d12' }}>
                        <ShieldAlert size={20} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Gestión de Riesgos</span>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                        Solicitudes <span className="text-[#E84922]">Pendientes</span>
                    </h1>
                    <p className="text-slate-500 font-medium text-sm mt-1">
                        Solicitudes con riesgos jurídicos identificados por Jurídica, a la espera de tu evaluación antes de continuar a Comité.
                    </p>
                </div>

                <div className="relative group ux-search">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por código, título o solicitante..."
                        className="w-full pl-16 pr-8 py-4 bg-white border border-gray-200 rounded-2xl focus:outline-none transition-all font-medium text-slate-800 shadow-sm shadow-slate-200/50"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>

                <div className="space-y-4 pb-12">
                    {cargando ? (
                        <UxLoadingState text="Cargando información segura..." className="rounded-2xl p-24 ux-fade-in" />
                    ) : filteredSolicitudes.length === 0 ? (
                        <UxEmptyState
                            title="No se encontraron solicitudes"
                            description="No hay solicitudes con riesgos jurídicos pendientes de evaluación en este momento."
                            icon={<ClipboardList size={48} />}
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
                                                <span className="font-black text-xs px-2 py-1 rounded" style={{ color: '#7c2d12', backgroundColor: 'rgba(124,45,18,0.08)' }}>
                                                    {sol.codigo || '—'}
                                                </span>
                                                <p className="text-[10px] text-gray-400 font-medium mt-1">v{sol.version}</p>
                                            </td>
                                            <td className="px-6 py-6 max-w-md">
                                                <p className="text-sm font-bold text-gray-900 line-clamp-1 mb-1 transition-colors">
                                                    {sol.titulo_contrato || sol.objeto || 'Sin título'}
                                                </p>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{sol.solicitante_nombre}</span>
                                                    <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                                                    <span className="text-[10px] text-gray-400 italic">{nombreGerenciaCompleto(sol.gerencia_nombre)}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-center">
                                                <UxStatusPill tone="warning">Pendiente</UxStatusPill>
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
                                                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#7c2d12'; }}
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
                        Mostrando {filteredSolicitudes.length} solicitudes pendientes de evaluación de riesgos.
                    </p>
                </div>
            </div>
        </div>
    );
}
