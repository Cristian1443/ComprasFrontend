import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import {
    Search, Download, Eye, CheckCircle2, XCircle, Clock, Loader2, Receipt
} from 'lucide-react';
import { DetalleAprobacion } from './DetalleAprobacion';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND = '#2f6fa3';

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
}

interface FacturaHistorial {
    id: string;
    no_factura_cxc: string;
    numero_ap: string;
    no_contrato_oc: string;
    concepto: string;
    valor: number | null;
    fecha_factura: string;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    aprobado_gerente: boolean;
    comentario_gerente: string | null;
    actualizado_en: string;
    contrato_codigo: string;
    contrato_objeto: string;
}

const fmtCOP = (v: number | null) =>
    v == null ? '-'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v));

function StatusBadge({ estado }: { estado: string }) {
    if (estado === 'aprobada' || estado === 'aprobado_gerente')
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={11} /> Aprobado</span>;
    if (estado === 'rechazada' || estado === 'rechazado_gerente')
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100"><XCircle size={11} /> Rechazado</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-100"><Clock size={11} /> Pendiente</span>;
}

function getSolicitudStatus(estado: string) {
    if (['aprobado_gerente', 'en_financiera', 'aprobado_financiera', 'aprobado_comite',
         'en_juridica', 'contratado'].includes(estado))
        return 'aprobada';
    if (['rechazado_gerente', 'rechazado_financiera', 'rechazado_comite'].includes(estado))
        return 'rechazada';
    return 'pendiente';
}

export function HistorialAprobaciones({ userEmail }: { userEmail: string }) {
    const [tab, setTab]             = useState<'solicitudes' | 'facturas'>('solicitudes');
    const [searchTerm, setSearchTerm] = useState('');
    const [loadingSol, setLoadingSol]   = useState(true);
    const [loadingFac, setLoadingFac]   = useState(true);
    const [historial, setHistorial]     = useState<SolicitudHistorial[]>([]);
    const [facturas, setFacturas]       = useState<FacturaHistorial[]>([]);
    const [usuarioActual, setUsuarioActual] = useState<any | null>(null);
    const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudHistorial | null>(null);

    const cargarHistorial = () => {
        if (!userEmail) return;
        apiFetch(`${API_URL}/api/gerente/historial?email=${userEmail}`)
            .then(r => r.ok ? r.json() : [])
            .then(setHistorial).catch(() => {}).finally(() => setLoadingSol(false));
    };

    useEffect(() => {
        if (!userEmail) return;
        apiFetch(`${API_URL}/api/usuarios/me?email=${userEmail}`)
            .then(r => r.ok ? r.json() : null)
            .then(setUsuarioActual).catch(() => {});
        cargarHistorial();
        apiFetch(`${API_URL}/api/gerente/historial-facturas?email=${userEmail}`)
            .then(r => r.ok ? r.json() : [])
            .then(setFacturas).catch(() => {}).finally(() => setLoadingFac(false));
    }, [userEmail]);

    if (solicitudSeleccionada) {
        return (
            <DetalleAprobacion
                solicitud={solicitudSeleccionada}
                usuarioActual={usuarioActual}
                onBack={() => {
                    setSolicitudSeleccionada(null);
                    cargarHistorial();
                }}
            />
        );
    }

    const fmtFecha = (iso: string) =>
        new Date(iso).toLocaleString('es-CO', {
            day: 'numeric', month: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
        });

    const getValorOriginal = (row: SolicitudHistorial) => {
        const m = String(row.moneda || 'COP').toUpperCase();
        if (m === 'USD') return row.valor_moneda_usd_texto || '';
        if (m === 'EUR') return row.valor_moneda_eur_texto || '';
        if (m === 'COP') return row.valor_moneda_cop_texto || '';
        return '';
    };

    const filteredSol = historial.filter(h =>
        [h.codigo, h.titulo_contrato, h.objeto, h.solicitante_nombre].some(f =>
            f?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const filteredFac = facturas.filter(f =>
        [f.numero_ap, f.no_factura_cxc, f.concepto, f.contrato_codigo, f.contrato_objeto].some(v =>
            v?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    const loading = tab === 'solicitudes' ? loadingSol : loadingFac;
    const total   = tab === 'solicitudes' ? filteredSol.length : filteredFac.length;

    return (
        <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Historial de Gestión</h2>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Consulta todas las decisiones tomadas en tu gerencia
                        </p>
                    </div>
                    <button className="flex items-center gap-2 px-5 py-2.5 text-white rounded-xl font-bold text-sm shadow-md hover:opacity-90 transition-all"
                        style={{ backgroundColor: '#E84922' }}>
                        <Download size={16} /> Exportar reporte
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mt-5">
                    {([
                        { key: 'solicitudes', label: 'Solicitudes', count: historial.length },
                        { key: 'facturas',    label: 'Facturas de pago', count: facturas.length, icon: Receipt },
                    ] as const).map(t => (
                        <button key={t.key} onClick={() => { setTab(t.key); setSearchTerm(''); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all border
                                ${tab === t.key
                                    ? 'text-white border-transparent shadow-sm'
                                    : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'}`}
                            style={tab === t.key ? { backgroundColor: BRAND } : {}}>
                            {t.icon && <t.icon size={14} />}
                            {t.label}
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full
                                ${tab === t.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                {t.count}
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">

                {/* Buscador */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder={tab === 'solicitudes'
                            ? 'Buscar por código, título o solicitante...'
                            : 'Buscar por factura, concepto o contrato...'}
                        className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all"
                        style={{ fontFamily: 'Gabarito, sans-serif', '--tw-ring-color': BRAND } as any}
                    />
                </div>

                {/* Tabla */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <Loader2 className="animate-spin" size={32} style={{ color: BRAND }} />
                        </div>
                    ) : tab === 'solicitudes' ? (
                        /* ── Tabla Solicitudes ── */
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70">
                                    {['Código', 'Título', 'Solicitante', 'Monto', 'Estado', ''].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredSol.length > 0 ? filteredSol.map(row => (
                                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => setSolicitudSeleccionada(row)}>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className="text-xs font-black font-mono text-white px-2.5 py-1 rounded-md"
                                                style={{ backgroundColor: BRAND }}>
                                                {row.codigo || 'S/C'}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <p className="text-sm font-bold text-gray-800 truncate">{row.titulo_contrato || row.objeto}</p>
                                            <p className="text-[10px] text-gray-400 font-medium mt-0.5">{fmtFecha(row.actualizado_en)}</p>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black text-white"
                                                    style={{ backgroundColor: BRAND }}>
                                                    {row.solicitante_nombre?.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                                                </div>
                                                <span className="text-sm font-semibold text-gray-600">{row.solicitante_nombre}</span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-gray-800">
                                                {getValorOriginal(row)
                                                    ? `${row.moneda || 'COP'} ${getValorOriginal(row)}`
                                                    : fmtCOP(row.valor_en_cop || row.valor_estimado || 0)}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <StatusBadge estado={getSolicitudStatus(row.estado)} />
                                        </td>
                                        <td className="px-5 py-4 text-right">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setSolicitudSeleccionada(row); }}
                                                className="p-2 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                                            >
                                                <Eye size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-6 py-14 text-center text-gray-400 text-sm italic">
                                        No se encontraron solicitudes.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    ) : (
                        /* ── Tabla Facturas ── */
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-100 bg-gray-50/70">
                                    {['Factura', 'Contrato', 'Concepto', 'Valor', 'Decisión', 'Fecha'].map(h => (
                                        <th key={h} className="px-5 py-3.5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {filteredFac.length > 0 ? filteredFac.map(fac => (
                                    <tr key={fac.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center"
                                                    style={{ background: '#eff6ff' }}>
                                                    <Receipt size={13} style={{ color: BRAND }} />
                                                </div>
                                                <span className="text-xs font-black text-gray-700 font-mono">
                                                    {fac.numero_ap ? `AP ${fac.numero_ap}` : (fac.no_factura_cxc || fac.no_contrato_oc || '-')}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 max-w-[180px]">
                                            <p className="text-xs font-black" style={{ color: BRAND }}>{fac.contrato_codigo}</p>
                                            <p className="text-[10px] text-gray-400 truncate">{fac.contrato_objeto}</p>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            <p className="text-sm text-gray-700 truncate">{fac.concepto || '-'}</p>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <span className="text-sm font-black text-gray-800">{fmtCOP(fac.valor)}</span>
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <StatusBadge estado={fac.aprobado_gerente ? 'aprobada' : 'rechazada'} />
                                            {fac.comentario_gerente && (
                                                <p className="text-[10px] text-gray-400 mt-0.5 max-w-[140px] truncate" title={fac.comentario_gerente}>
                                                    "{fac.comentario_gerente}"
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <p className="text-xs font-medium text-gray-500">{fmtFecha(fac.actualizado_en)}</p>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan={6} className="px-6 py-14 text-center text-gray-400 text-sm italic">
                                        Aún no has aprobado ni rechazado ninguna factura.
                                    </td></tr>
                                )}
                            </tbody>
                        </table>
                    )}

                    {/* Footer */}
                    <div className="px-5 py-3.5 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {total} resultado{total !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
