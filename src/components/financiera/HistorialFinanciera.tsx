import React, { useState, useEffect, useCallback } from 'react';
import { nombreGerenciaCompleto } from '../../lib/gerencias';
import { formatMilesInput } from '../../lib/formatPresupuesto';
import {
    Search,
    Download,
    Filter,
    Eye,
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Loader2,
    Receipt,
    Plus,
    TrendingUp,
    X,
    FileText,
    User,
    Building2,
    DollarSign,
    Users
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface SolicitudHistorial {
    id: string;
    codigo: string;
    objeto: string;
    titulo_contrato?: string;
    actualizado_en: string;
    valor_en_cop: number;
    valor_estimado?: number;
    moneda?: string;
    valor_moneda_cop_texto?: string;
    valor_moneda_usd_texto?: string;
    valor_moneda_eur_texto?: string;
    estado: string;
    solicitante_nombre: string;
    gerencia_nombre: string;
}

interface Factura {
    id: string;
    no_factura_cxc: string;
    numero_ap: string;
    fecha_factura: string;
    valor: number | null;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    aprobado_supervisor: boolean | null;
    aprobado_gerente: boolean | null;
    concepto: string;
    adjunto_url: string | null;
    adjunto_nombre: string | null;
}

interface PanelData {
    facturas: Factura[];
    valor_contrato: number;
    loading: boolean;
}

function formatCOP(val: number | null | undefined) {
    if (val === null || val === undefined || isNaN(Number(val))) return '$0';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val));
}

export function HistorialFinanciera() {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [historial, setHistorial] = useState<SolicitudHistorial[]>([]);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [panelData, setPanelData] = useState<Record<string, PanelData>>({});
    const [showFormFor, setShowFormFor] = useState<string | null>(null);
    const [detalleId, setDetalleId] = useState<string | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [detalleData, setDetalleData] = useState<any>(null);
    const [detalleLoading, setDetalleLoading] = useState(false);

    useEffect(() => {
        const fetchHistorial = async () => {
            try {
                const res = await fetch(`${API_URL}/api/financiera/historial`);
                if (res.ok) {
                    const data = await res.json();
                    setHistorial(data);
                }
            } catch (err) {
                console.error('Error fetching financial history:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchHistorial();
    }, []);

    const abrirDetalle = async (id: string) => {
        setDetalleId(id);
        setDetalleData(null);
        setDetalleLoading(true);
        try {
            const r = await fetch(`${API_URL}/api/solicitudes/${id}`);
            if (r.ok) setDetalleData(await r.json());
        } catch { /* silent */ }
        finally { setDetalleLoading(false); }
    };

    const loadFacturas = useCallback(async (solicitudId: string) => {
        if (panelData[solicitudId] && !panelData[solicitudId].loading) return;
        setPanelData(prev => ({ ...prev, [solicitudId]: { facturas: [], valor_contrato: 0, loading: true } }));
        try {
            const r = await fetch(`${API_URL}/api/supervisor/contratos/${solicitudId}/facturas`);
            if (r.ok) {
                const data = await r.json();
                setPanelData(prev => ({
                    ...prev,
                    [solicitudId]: {
                        facturas: Array.isArray(data.facturas) ? data.facturas : [],
                        valor_contrato: Number(data.valor_contrato) || 0,
                        loading: false,
                    }
                }));
            }
        } catch {
            setPanelData(prev => ({ ...prev, [solicitudId]: { facturas: [], valor_contrato: 0, loading: false } }));
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleExpand = (id: string) => {
        if (expandedId === id) {
            setExpandedId(null);
            setShowFormFor(null);
        } else {
            setExpandedId(id);
            setShowFormFor(null);
            loadFacturas(id);
        }
    };

    const filteredHistory = historial.filter(h =>
        h.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.titulo_contrato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.objeto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.solicitante_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.gerencia_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0
    });

    const getValorOriginal = (row: SolicitudHistorial): string => {
        const m = String(row.moneda || 'COP').toUpperCase();
        if (m === 'USD') return row.valor_moneda_usd_texto || '';
        if (m === 'EUR') return row.valor_moneda_eur_texto || '';
        if (m === 'COP') return row.valor_moneda_cop_texto || '';
        return '';
    };

    const getSiglaGerencia = (gerencia?: string): string => {
        if (!gerencia) return 'N/A';
        const conectores = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'en', 'para']);
        const palabras = gerencia.trim().split(/\s+/).filter(Boolean).filter((p) => !conectores.has(p.toLowerCase()));
        if (!palabras.length) return gerencia.replace(/\s+/g, '').slice(0, 3).toUpperCase() || 'N/A';
        return palabras.map((p) => p[0]).join('').slice(0, 4).toUpperCase();
    };

    const getStatusDisplay = (estado: string) => {
        switch (estado) {
            case 'en_financiera':
                return { label: 'En Proceso', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock };
            case 'aprobado_financiera':
            case 'aprobado_comite':
                return { label: 'Aprobado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 };
            case 'en_juridica':
            case 'enviado_juridica':
                return { label: 'En Jurídica', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock };
            case 'aprobado_juridica':
            case 'contratado':
            case 'finalizado':
                return { label: 'Contrato Aprobado', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: CheckCircle2 };
            case 'cerrado':
                return { label: 'Cerrado', color: 'bg-slate-100 text-slate-600 border-slate-200', icon: CheckCircle2 };
            case 'rechazado_financiera':
            case 'rechazado_comite':
            case 'rechazado_juridica':
                return { label: 'Rechazado', color: 'bg-rose-50 text-rose-600 border-rose-100', icon: XCircle };
            default:
                return { label: estado, color: 'bg-slate-100 text-slate-600 border-slate-200', icon: Clock };
        }
    };

    // Sólo con jurídica aprobada el contrato queda firmado y se pueden registrar facturas.
    const ESTADOS_CONTRATO_FIRMADO = ['aprobado_juridica', 'contratado', 'finalizado', 'cerrado'];
    const contratoFirmado = (estado: string) => ESTADOS_CONTRATO_FIRMADO.includes(estado);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="animate-spin text-emerald-700" size={48} />
            </div>
        );
    }

    return (
        <>
        <div className="p-8 space-y-6 bg-white min-h-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        Historial Presupuestal
                    </h2>
                    <p className="text-slate-500 font-medium italic mt-1">
                        Seguimiento detallado de todas las solicitudes procesadas por Financiera.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button className="p-2.5 text-slate-500 hover:text-slate-900 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                        <Download size={20} />
                    </button>
                    <div className="h-10 w-[1px] bg-slate-200 mx-1"></div>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-[#E84922] text-white rounded-xl hover:bg-[#C73D1C] transition-all font-bold shadow-lg shadow-red-100">
                        Generar Reporte
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col md:flex-row gap-4 items-center p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-700 transition-colors" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por código, título, solicitante o gerencia..."
                        className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition-all font-medium text-slate-700 placeholder:text-slate-400"
                        style={{ fontFamily: 'Gabarito, sans-serif' }}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 w-full md:w-auto">
                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all w-full md:w-auto shadow-sm">
                        <Filter size={18} />
                        Rubros
                    </button>
                    <button className="flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all w-full md:w-auto shadow-sm">
                        <Calendar size={18} />
                        Periodo
                    </button>
                </div>
            </div>

            {/* History Table */}
            <div className="overflow-x-auto bg-white border border-slate-100 rounded-2xl shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50">
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Código Solicitud</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Título</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Origen (Gerencia)</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Monto Aprobado</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100">Estado Presupuestal</th>
                            <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 text-right">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredHistory.length > 0 ? filteredHistory.map((row) => {
                            const status = getStatusDisplay(row.estado);
                            const StatusIcon = status.icon;
                            const isExpanded = expandedId === row.id;
                            const panel = panelData[row.id];

                            return (
                                <React.Fragment key={row.id}>
                                    <tr className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-xs font-black text-emerald-700 font-mono tracking-tighter bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-100 whitespace-nowrap inline-block">
                                                {row.codigo || 'S/C'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col min-w-[200px]">
                                                <span className="text-sm font-bold text-slate-800 leading-tight line-clamp-1">{row.titulo_contrato || row.objeto}</span>
                                                <span className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-wider">
                                                    {new Date(row.actualizado_en).toLocaleString('es-CO', {
                                                        day: 'numeric', month: 'numeric', year: 'numeric',
                                                        hour: '2-digit', minute: '2-digit', hour12: true
                                                    })}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-emerald-100 flex items-center justify-center text-[10px] font-black text-emerald-600 uppercase">
                                                    {getSiglaGerencia(nombreGerenciaCompleto(row.gerencia_nombre))}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-semibold text-slate-600">{row.solicitante_nombre}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium">{nombreGerenciaCompleto(row.gerencia_nombre)}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="text-sm font-black text-slate-700 tracking-tight">
                                                {getValorOriginal(row)
                                                    ? `${row.moneda || 'COP'} ${getValorOriginal(row)}`
                                                    : formatter.format(row.valor_en_cop || row.valor_estimado || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${status.color}`}>
                                                <StatusIcon size={12} />
                                                {status.label}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => abrirDetalle(row.id)}
                                                    title="Ver detalle de solicitud"
                                                    className="p-2 text-slate-400 hover:text-emerald-700 hover:bg-white rounded-lg transition-all shadow-none hover:shadow-sm border border-transparent hover:border-slate-100"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => toggleExpand(row.id)}
                                                    title="Ver facturas"
                                                    className={`p-2 rounded-lg transition-all border ${isExpanded ? 'text-white border-transparent' : 'text-slate-400 hover:text-emerald-700 hover:bg-white border-transparent hover:border-slate-100'}`}
                                                    style={isExpanded ? { backgroundColor: 'var(--brand-secondary)' } : {}}
                                                >
                                                    <Receipt size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>

                                    {/* Panel expandido de facturas */}
                                    {isExpanded && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-4 bg-slate-50 border-b border-slate-100">
                                                {panel?.loading ? (
                                                    <div className="flex justify-center py-4">
                                                        <Loader2 size={20} className="animate-spin text-slate-400" />
                                                    </div>
                                                ) : (
                                                    <div className="space-y-3" style={{ fontFamily: 'Gabarito, sans-serif' }}>

                                                        {/* Cabecera del panel */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <Receipt size={14} className="text-slate-500" />
                                                                <span className="text-xs font-black text-slate-600 uppercase tracking-wider">
                                                                    Facturas — {row.codigo}
                                                                </span>
                                                                {panel && panel.facturas.length > 0 && (
                                                                    <span className="text-[10px] text-slate-400">
                                                                        · {panel.facturas.filter(f => f.estado === 'aprobada').length} aprobada(s) / {panel.facturas.filter(f => f.estado === 'pendiente').length} pendiente(s)
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {contratoFirmado(row.estado) ? (
                                                                <button
                                                                    onClick={() => setShowFormFor(showFormFor === row.id ? null : row.id)}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90"
                                                                    style={{ backgroundColor: 'var(--brand-secondary)' }}
                                                                >
                                                                    <Plus size={12} /> Registrar factura
                                                                </button>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-400 italic text-right max-w-[220px]">
                                                                    Disponible cuando jurídica apruebe el contrato
                                                                </span>
                                                            )}
                                                        </div>

                                                        {/* Resumen ejecución */}
                                                        {panel && panel.valor_contrato > 0 && (() => {
                                                            const totalFact = panel.facturas.filter(f => f.estado === 'aprobada').reduce((s, f) => s + (Number(f.valor) || 0), 0);
                                                            const saldo = panel.valor_contrato - totalFact;
                                                            const pct = panel.valor_contrato > 0 ? Math.min(100, Math.round((totalFact / panel.valor_contrato) * 100)) : 0;
                                                            return (
                                                                <div className="bg-white rounded-xl border border-slate-200 p-3">
                                                                    <div className="flex items-center gap-1.5 mb-2">
                                                                        <TrendingUp size={12} className="text-slate-400" />
                                                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Ejecución presupuestal</span>
                                                                    </div>
                                                                    <div className="grid grid-cols-3 gap-4 mb-2">
                                                                        <div>
                                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Valor contrato</p>
                                                                            <p className="text-sm font-bold text-slate-700">{formatCOP(panel.valor_contrato)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Total facturado</p>
                                                                            <p className="text-sm font-bold" style={{ color: 'var(--brand-secondary)' }}>{formatCOP(totalFact)}</p>
                                                                        </div>
                                                                        <div>
                                                                            <p className="text-[10px] text-slate-400 uppercase font-semibold">Saldo</p>
                                                                            <p className={`text-sm font-bold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCOP(saldo)}</p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                                                            <div className="h-full rounded-full transition-all duration-700"
                                                                                style={{ width: `${pct}%`, backgroundColor: pct >= 90 ? '#ef4444' : pct >= 70 ? '#f59e0b' : '#10b981' }} />
                                                                        </div>
                                                                        <span className="text-[10px] font-bold text-slate-500 shrink-0">{pct}%</span>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Lista facturas */}
                                                        {!panel || panel.facturas.length === 0 ? (
                                                            <div className="text-center py-4 text-slate-400">
                                                                <Receipt size={24} className="mx-auto mb-1 opacity-30" />
                                                                <p className="text-xs">Sin facturas registradas. Haz clic en "Registrar factura" para añadir la primera.</p>
                                                            </div>
                                                        ) : (
                                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                {panel.facturas.map(f => (
                                                                    <div key={f.id} className="bg-white rounded-lg border border-slate-200 px-3 py-2.5 flex items-start gap-3">
                                                                        <Receipt size={14} className="text-slate-300 shrink-0 mt-0.5" />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="flex items-center justify-between gap-2 flex-wrap">
                                                                                <span className="text-xs font-bold text-slate-800">AP {f.numero_ap}</span>
                                                                                {f.estado === 'aprobada'
                                                                                    ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700"><CheckCircle2 size={9} />Aprobada</span>
                                                                                    : f.estado === 'rechazada'
                                                                                        ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700"><XCircle size={9} />Rechazada</span>
                                                                                        : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700"><Clock size={9} />Pendiente</span>
                                                                                }
                                                                            </div>
                                                                            <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{f.concepto}</p>
                                                                            <div className="flex items-center gap-2 mt-1 flex-wrap text-[10px]">
                                                                                {f.valor && Number(f.valor) > 0 && <span className="font-bold text-slate-600">{formatCOP(f.valor)}</span>}
                                                                                <span className="text-slate-400">{new Date(f.fecha_factura).toLocaleDateString('es-CO')}</span>
                                                                                <span className={f.aprobado_supervisor === true ? 'text-green-600 font-semibold' : f.aprobado_supervisor === false ? 'text-red-500 font-semibold' : 'text-amber-500'}>
                                                                                    {f.aprobado_supervisor === true ? '✓ Sup.' : f.aprobado_supervisor === false ? '✗ Sup.' : '⏳ Sup.'}
                                                                                </span>
                                                                                <span className={f.aprobado_gerente === true ? 'text-green-600 font-semibold' : f.aprobado_gerente === false ? 'text-red-500 font-semibold' : 'text-amber-500'}>
                                                                                    {f.aprobado_gerente === true ? '✓ Ger.' : f.aprobado_gerente === false ? '✗ Ger.' : '⏳ Ger.'}
                                                                                </span>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Mini formulario rápido */}
                                                        {showFormFor === row.id && (
                                                            <MiniFormFactura
                                                                solicitudId={row.id}
                                                                codigoContrato={row.codigo}
                                                                onSuccess={() => {
                                                                    setShowFormFor(null);
                                                                    setPanelData(prev => { const c = { ...prev }; delete c[row.id]; return c; });
                                                                    loadFacturas(row.id);
                                                                }}
                                                                onCancel={() => setShowFormFor(null)}
                                                            />
                                                        )}
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        }) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-10 text-center text-slate-400 italic">
                                    No se encontraron registros de gestión presupuestal.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Status indicator */}
                <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {filteredHistory.length} resultados encontrados
                    </p>
                    <div className="flex gap-2">
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded-md text-slate-400 cursor-not-allowed text-xs font-bold font-mono">{'<'}</button>
                        <button className="px-3 py-1 bg-emerald-700 border border-emerald-700 rounded-md text-white text-xs font-bold font-mono">1</button>
                        <button className="px-3 py-1 bg-white border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50 text-xs font-bold font-mono">{'>'}</button>
                    </div>
                </div>
            </div>
        </div>

        {/* Modal detalle solicitud */}
        {detalleId && (
            <div
                style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
                onClick={() => setDetalleId(null)}
            >
                <div
                    className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[88vh] overflow-y-auto"
                    style={{ fontFamily: 'Gabarito, sans-serif' }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
                        <div className="flex items-center gap-3">
                            <FileText size={18} className="text-emerald-700" />
                            <div>
                                <p className="font-black text-slate-800 text-sm">
                                    {detalleData?.codigo || '…'}
                                </p>
                                <p className="text-[11px] text-slate-400">Detalle de solicitud</p>
                            </div>
                        </div>
                        <button onClick={() => setDetalleId(null)} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                            <X size={18} />
                        </button>
                    </div>

                    {detalleLoading ? (
                        <div className="flex justify-center items-center py-16">
                            <Loader2 size={28} className="animate-spin text-emerald-700" />
                        </div>
                    ) : detalleData ? (
                        <div className="p-6 space-y-5">
                            {/* Título */}
                            {detalleData.titulo_contrato && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Título</p>
                                    <p className="text-sm font-bold text-slate-800 leading-relaxed">{detalleData.titulo_contrato}</p>
                                </div>
                            )}

                            {/* Objeto */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Objeto / Descripción</p>
                                <p className="text-sm text-slate-800 leading-relaxed">{detalleData.objeto}</p>
                            </div>

                            {/* Grid info básica */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-start gap-2">
                                    <User size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</p>
                                        <p className="text-sm font-semibold text-slate-700">{detalleData.solicitante_nombre || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerencia</p>
                                        <p className="text-sm font-semibold text-slate-700">{nombreGerenciaCompleto(detalleData.gerencia_nombre) || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <DollarSign size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monto aprobado</p>
                                        <p className="text-sm font-bold text-slate-700">
                                            {detalleData.valor_moneda_cop_texto
                                                ? `${detalleData.moneda || 'COP'} ${detalleData.valor_moneda_cop_texto}`
                                                : formatCOP(detalleData.valor_en_cop || detalleData.valor_estimado)}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                    <Calendar size={14} className="text-slate-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Última actualización</p>
                                        <p className="text-sm font-semibold text-slate-700">
                                            {detalleData.actualizado_en ? new Date(detalleData.actualizado_en).toLocaleDateString('es-CO') : '—'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Estado */}
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Estado presupuestal</p>
                                {(() => { const s = getStatusDisplay(detalleData.estado); const Icon = s.icon; return (
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${s.color}`}>
                                        <Icon size={12} />{s.label}
                                    </span>
                                ); })()}
                            </div>

                            {/* Modalidad */}
                            {detalleData.modalidad && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Modalidad de contratación</p>
                                    <p className="text-sm font-semibold text-slate-700 capitalize">{detalleData.modalidad}</p>
                                </div>
                            )}

                            {/* Proveedor */}
                            {(detalleData.proveedor_nombre || detalleData.info_modalidad?.proveedor_nombre) && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Proveedor</p>
                                    <p className="text-sm font-semibold text-slate-700">{detalleData.proveedor_nombre || detalleData.info_modalidad?.proveedor_nombre}</p>
                                </div>
                            )}

                            {/* Proponentes */}
                            {detalleData.proponentes?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <Users size={11} /> Proponentes ({detalleData.proponentes.length})
                                    </p>
                                    <div className="space-y-1.5">
                                        {detalleData.proponentes.map((p: any, i: number) => {
                                            const valorNum = Number(p.valor_con_impuestos);
                                            const valorAgregado = p.valor_agregado || p.valorAgregado || null;
                                            const crit = p.criterios_habilitantes;
                                            const critColor = crit === 'CUMPLE' ? 'bg-green-100 text-green-700'
                                                : crit === 'NO CUMPLE' || crit === 'NO_CUMPLE' ? 'bg-red-100 text-red-600'
                                                : 'bg-slate-200 text-slate-600';
                                            return (
                                                <div key={i} className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg border border-slate-100 text-xs">
                                                    <div className="flex items-center gap-2">
                                                        {p.seleccionado && <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />}
                                                        <span className="font-semibold text-slate-700">{p.nombre_proveedor || '—'}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-right">
                                                        {valorNum > 0 && <span className="text-emerald-700 font-bold">{formatCOP(valorNum)}</span>}
                                                        {valorAgregado && <span className="text-slate-500 italic">{valorAgregado}</span>}
                                                        {crit && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${critColor}`}>{crit}</span>}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {/* Documentos */}
                            {detalleData.anexosDocs?.length > 0 && (
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                        <FileText size={11} /> Documentos ({detalleData.anexosDocs.length})
                                    </p>
                                    <div className="space-y-1">
                                        {detalleData.anexosDocs.map((d: any, i: number) => {
                                            const nombre = d.nombre_documento && d.nombre_documento !== 'NA' ? d.nombre_documento : '(sin nombre)';
                                            const tipo = d.tipo && d.tipo !== 'NA' ? d.tipo : null;
                                            return (
                                                <div key={i} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg text-xs">
                                                    <FileText size={11} className="text-slate-400 shrink-0" />
                                                    <span className="text-slate-700 font-medium">{nombre}</span>
                                                    {tipo && <span className="text-slate-400 ml-auto">{tipo}</span>}
                                                    {d.fecha_documento && <span className="text-slate-400 ml-auto">{new Date(d.fecha_documento).toLocaleDateString('es-CO')}</span>}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="py-12 text-center text-slate-400">
                            <p className="text-sm">No se pudo cargar el detalle.</p>
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}

/* ── Formulario rápido inline ─────────────────────────────────────── */
interface MiniFormFacturaProps {
    solicitudId: string;
    codigoContrato: string;
    onSuccess: () => void;
    onCancel: () => void;
}

function MiniFormFactura({ solicitudId, codigoContrato, onSuccess, onCancel }: MiniFormFacturaProps) {
    const [form, setForm] = useState({ no_contrato_oc: '', no_factura_cxc: '', numero_ap: '', fecha_factura: '', concepto: '', valor: '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(p => ({ ...p, [e.target.name]: e.target.name === 'valor' ? formatMilesInput(e.target.value) : e.target.value }));

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        const valorNorm = form.valor.replace(/\./g, '').replace(',', '.');
        const valorNum = Number(valorNorm);
        if (!form.no_contrato_oc || !form.no_factura_cxc || !form.numero_ap || !form.fecha_factura || !form.concepto) {
            setError('Completa todos los campos obligatorios.');
            return;
        }
        if (!form.valor || isNaN(valorNum) || valorNum <= 0) {
            setError('Ingresa un valor válido mayor a cero. Ej: 1.200.000');
            return;
        }
        setSaving(true);
        setError(null);
        try {
            const r = await fetch(`${API_URL}/api/financiera/facturas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    solicitud_id: solicitudId,
                    nombre_solicitud: codigoContrato,
                    no_contrato_oc: form.no_contrato_oc,
                    no_factura_cxc: form.no_factura_cxc,
                    numero_ap: form.numero_ap,
                    fecha_factura: form.fecha_factura,
                    concepto: form.concepto,
                    valor: valorNum,
                }),
            });
            if (!r.ok) {
                const d = await r.json().catch(() => ({}));
                setError(d.error || 'Error al registrar la factura.');
                return;
            }
            onSuccess();
        } catch {
            setError('Error de conexión. Intenta de nuevo.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={submit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            <p className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                <Plus size={12} /> Nueva factura — {codigoContrato}
            </p>
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">AP *</label>
                    <input name="numero_ap" value={form.numero_ap} onChange={handle} required
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">No. Contrato/OC *</label>
                    <input name="no_contrato_oc" value={form.no_contrato_oc} onChange={handle} required
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">No. Factura/CxC *</label>
                    <input name="no_factura_cxc" value={form.no_factura_cxc} onChange={handle} required
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Fecha factura *</label>
                    <input type="date" name="fecha_factura" value={form.fecha_factura} onChange={handle} required
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                </div>
                <div>
                    <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Valor (COP) *</label>
                    <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400">$</span>
                        <input name="valor" value={form.valor} onChange={handle} placeholder="Ej: 1.200.000" inputMode="decimal"
                            className="w-full pl-6 pr-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
                    </div>
                </div>
            </div>
            <div>
                <label className="text-[10px] font-semibold text-slate-400 uppercase block mb-0.5">Concepto *</label>
                <input name="concepto" value={form.concepto} onChange={handle} required
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300" />
            </div>
            {error && <p className="text-xs text-red-600 font-semibold">{error}</p>}
            <div className="flex gap-2">
                <button type="button" onClick={onCancel}
                    className="flex-1 px-3 py-1.5 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors">
                    Cancelar
                </button>
                <button type="submit" disabled={saving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
                    style={{ backgroundColor: 'var(--brand-secondary)' }}>
                    {saving ? <Loader2 size={12} className="animate-spin" /> : <Receipt size={12} />}
                    {saving ? 'Guardando…' : 'Registrar factura'}
                </button>
            </div>
        </form>
    );
}
