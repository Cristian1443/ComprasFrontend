import React, { useState, useEffect } from 'react';
import {
    Users, FileText, CheckCircle, Clock,
    Loader2, Activity, BarChart3, TrendingUp,
    ArrowRight, AlertCircle, ChevronRight
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area
} from 'recharts';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';
const ACCENT     = '#f08a24';

interface DashboardStats {
    pendientes: string;
    aprobadas:  string;
    valor_total: string;
    solicitantes: string;
}
interface ChartData    { name: string; valor: number; }
interface RecentActivity {
    id: string; project: string; user: string; status: string; date: string;
}

const fmtCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

const fmtCOPShort = (v: number) => {
    if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
    if (v >= 1_000_000)     return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)         return `$${(v / 1_000).toFixed(0)}K`;
    return `$${v}`;
};

function estadoBadge(status: string) {
    const map: Record<string, { label: string; color: string; bg: string }> = {
        enviado_gerente:    { label: 'Pendiente',   color: '#b45309', bg: '#fef3c7' },
        aprobado_gerente:   { label: 'Aprobado',    color: '#065f46', bg: '#d1fae5' },
        rechazado_gerente:  { label: 'Rechazado',   color: '#991b1b', bg: '#fee2e2' },
        en_juridica:        { label: 'En Jurídica', color: BRAND_DARK, bg: '#dbeafe' },
        en_financiera:      { label: 'Financiera',  color: '#5b21b6', bg: '#ede9fe' },
        contratado:         { label: 'Contratado',  color: '#065f46', bg: '#d1fae5' },
    };
    const m = map[status] || { label: status, color: '#374151', bg: '#f3f4f6' };
    return (
        <span className="text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
            style={{ color: m.color, backgroundColor: m.bg }}>
            {m.label}
        </span>
    );
}

export function DashboardGerente({
    userName,
    userEmail,
    initialMetrics,
    isLoading,
    onGoPendientes,
    onGoHistorial,
}: {
    userName: string;
    userEmail: string;
    initialMetrics?: any;
    isLoading?: boolean;
    onGoPendientes?: () => void;
    onGoHistorial?: () => void;
}) {
    const [loading, setLoading]   = useState(isLoading ?? true);
    const [metrics, setMetrics]   = useState<{
        stats: DashboardStats; chart: ChartData[]; activity: RecentActivity[];
    } | null>(initialMetrics || null);

    useEffect(() => {
        if (initialMetrics) { setMetrics(initialMetrics); setLoading(false); return; }
        if (!userEmail) return;
        fetch(`${API_URL}/api/gerente/metrics?email=${userEmail}`)
            .then(r => r.ok ? r.json() : null)
            .then(d => { if (d) setMetrics(d); })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [userEmail, initialMetrics]);

    useEffect(() => { if (isLoading !== undefined) setLoading(isLoading); }, [isLoading]);

    if (loading) return (
        <div className="flex h-full items-center justify-center p-20">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin" size={36} style={{ color: BRAND }} />
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Cargando panel...</p>
            </div>
        </div>
    );

    const stats      = metrics?.stats    || { pendientes: '0', aprobadas: '0', valor_total: '0', solicitantes: '0' };
    const chartData  = metrics?.chart?.length ? metrics.chart : [];
    const activity   = metrics?.activity || [];
    const hasChart   = chartData.some(p => Number(p.valor || 0) > 0);
    const pendientes = Number(stats.pendientes || 0);
    const valorTotal = parseFloat(stats.valor_total || '0');

    // Fecha actual
    const hoy = new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    const kpis = [
        {
            label: 'Por Aprobar',
            value: stats.pendientes,
            sub: 'Requieren decisión',
            icon: Clock,
            accent: CTA,
            bg: '#fff5f3',
            action: onGoPendientes,
            urgent: pendientes > 0,
        },
        {
            label: 'Gestionadas',
            value: stats.aprobadas,
            sub: 'Avanzaron en el flujo',
            icon: CheckCircle,
            accent: '#10b981',
            bg: '#f0fdf4',
            action: onGoHistorial,
        },
        {
            label: 'Valor Gestionado',
            value: fmtCOPShort(valorTotal),
            valueFull: fmtCOP(valorTotal),
            sub: 'Monto acumulado',
            icon: BarChart3,
            accent: BRAND,
            bg: '#eff6ff',
        },
        {
            label: 'Solicitantes',
            value: stats.solicitantes,
            sub: 'Usuarios únicos',
            icon: Users,
            accent: ACCENT,
            bg: '#fffbeb',
        },
    ];

    return (
        <div className="min-h-screen font-['Gabarito']" style={{ background: '#f4f7fb' }}>

            {/* ── HEADER ── */}
            <div className="bg-white border-b border-gray-200 px-6 lg:px-10 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Activity size={14} style={{ color: CTA }} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                {hoy}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900">
                            Bienvenido, <span style={{ color: BRAND }}>{userName.split(' ')[0]}</span>
                        </h1>
                        <p className="text-sm text-gray-500 mt-0.5">Panel de control gerencial · Compras y Contratación</p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {pendientes > 0 && (
                            <button onClick={onGoPendientes}
                                className="flex items-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-bold shadow-md hover:opacity-90 transition-all"
                                style={{ backgroundColor: CTA }}>
                                <AlertCircle size={15} />
                                {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                            </button>
                        )}
                        <button onClick={onGoHistorial}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 transition-all">
                            Ver historial
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>
            </div>

            {/* ── CONTENIDO ── */}
            <div className="px-6 lg:px-10 py-6 space-y-6">

                {/* ── KPIs ── */}
                <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                    {kpis.map((k, i) => (
                        <div key={i}
                            onClick={k.action}
                            className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3 transition-all
                                ${k.action ? 'cursor-pointer hover:shadow-md hover:border-gray-200' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                                    style={{ background: k.bg }}>
                                    <k.icon size={18} style={{ color: k.accent }} />
                                </div>
                                {k.urgent && (
                                    <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: CTA }} />
                                )}
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">{k.label}</p>
                                <p className="text-3xl font-black text-gray-900 leading-none" title={k.valueFull}>{k.value}</p>
                                <p className="text-[11px] text-gray-400 mt-1">{k.sub}</p>
                            </div>
                            {k.action && (
                                <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide"
                                    style={{ color: k.accent }}>
                                    Ver detalle <ChevronRight size={12} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {/* ── GRÁFICO + ACTIVIDAD ── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                    {/* Gráfico de evolución */}
                    <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                        <div className="flex items-start justify-between mb-6">
                            <div>
                                <h2 className="text-base font-black text-gray-900">Evolución de solicitudes</h2>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                                    Presupuesto radicado mensualmente
                                </p>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ background: BRAND }} />
                                <span className="text-[10px] font-bold text-gray-400">Valor COP</span>
                            </div>
                        </div>

                        <div className="h-64 w-full">
                            {hasChart ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%"  stopColor={BRAND} stopOpacity={0.15} />
                                                <stop offset="95%" stopColor={BRAND} stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false}
                                            tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} dy={8} />
                                        <YAxis hide />
                                        <Tooltip
                                            formatter={(v: number) => [fmtCOP(v), 'Valor']}
                                            contentStyle={{
                                                borderRadius: 12, border: 'none',
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
                                                backgroundColor: '#1e293b', padding: '10px 14px'
                                            }}
                                            labelStyle={{ color: '#94a3b8', fontWeight: 800, fontSize: 10, textTransform: 'uppercase' }}
                                            itemStyle={{ color: '#fff', fontWeight: 900, fontSize: 13 }}
                                        />
                                        <Area type="monotone" dataKey="valor" stroke={BRAND} strokeWidth={2.5}
                                            fillOpacity={1} fill="url(#grad)" animationDuration={1500} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center gap-2">
                                    <TrendingUp size={32} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-400">Sin datos suficientes aún</p>
                                    <p className="text-xs text-gray-300">La tendencia aparecerá cuando haya solicitudes aprobadas</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actividad reciente */}
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-base font-black text-gray-900">Actividad reciente</h2>
                            <span className="text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full text-white"
                                style={{ background: CTA }}>En vivo</span>
                        </div>

                        <div className="flex-1 overflow-auto divide-y divide-gray-50">
                            {activity.length > 0 ? activity.map(item => (
                                <div key={item.id}
                                    className="px-5 py-3.5 hover:bg-gray-50 transition-colors group cursor-pointer">
                                    <div className="flex items-start gap-3">
                                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                                            style={{ background: '#eff6ff' }}>
                                            <FileText size={13} style={{ color: BRAND }} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-gray-800 truncate leading-snug">
                                                {item.project}
                                            </p>
                                            <p className="text-[10px] text-gray-400 mt-0.5 truncate">{item.user}</p>
                                            <div className="flex items-center gap-2 mt-1.5">
                                                {estadoBadge(item.status)}
                                                <span className="text-[9px] text-gray-300 font-medium">{item.date}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-6">
                                    <Activity size={28} className="text-gray-200" />
                                    <p className="text-sm font-bold text-gray-300">Sin actividad registrada</p>
                                </div>
                            )}
                        </div>

                        <div className="px-5 py-3 border-t border-gray-100">
                            <button onClick={onGoHistorial}
                                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-all border border-gray-100">
                                Ver historial completo <ArrowRight size={13} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
