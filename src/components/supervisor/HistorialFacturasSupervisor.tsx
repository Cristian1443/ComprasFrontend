import React, { useState, useEffect } from 'react';
import { Search, Receipt, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND = 'var(--brand-secondary)';

interface FacturaHistorial {
    id: string;
    no_factura_cxc: string;
    no_contrato_oc: string;
    concepto: string;
    valor: number | null;
    fecha_factura: string;
    estado: 'pendiente' | 'aprobada' | 'rechazada';
    aprobado_supervisor: boolean;
    comentario_supervisor: string | null;
    actualizado_en: string;
    contrato_codigo: string;
    contrato_objeto: string;
}

const fmtCOP = (v: number | null) =>
    v == null ? '-'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(v));

const fmtFecha = (iso: string) =>
    new Date(iso).toLocaleString('es-CO', {
        day: 'numeric', month: 'numeric', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

function StatusBadge({ aprobada }: { aprobada: boolean }) {
    if (aprobada)
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-100"><CheckCircle2 size={11} /> Aprobada</span>;
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-100"><XCircle size={11} /> Rechazada</span>;
}

interface HistorialFacturasSupervisorProps {
    userEmail?: string;
}

export function HistorialFacturasSupervisor({ userEmail }: HistorialFacturasSupervisorProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [facturas, setFacturas] = useState<FacturaHistorial[]>([]);

    useEffect(() => {
        if (!userEmail) return;
        fetch(`${API_URL}/api/supervisor/historial-facturas?email=${encodeURIComponent(userEmail)}`)
            .then(r => r.ok ? r.json() : [])
            .then(setFacturas)
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [userEmail]);

    const filtered = facturas.filter(f =>
        [f.no_factura_cxc, f.no_contrato_oc, f.concepto, f.contrato_codigo, f.contrato_objeto].some(v =>
            v?.toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-8 py-5">
                <div>
                    <h2 className="text-xl font-black text-gray-900">Histórico de Aprobación de Facturas</h2>
                    <p className="text-sm text-gray-400 mt-0.5">
                        Consulta las facturas que has aprobado o rechazado como supervisor
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="px-8 py-6 space-y-4">

                {/* Buscador */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Buscar por factura, concepto o contrato..."
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
                    ) : (
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
                                {filtered.length > 0 ? filtered.map(fac => (
                                    <tr key={fac.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#eff6ff' }}>
                                                    <Receipt size={13} style={{ color: BRAND }} />
                                                </div>
                                                <span className="text-xs font-black text-gray-700 font-mono">
                                                    {fac.no_factura_cxc || fac.no_contrato_oc || '-'}
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
                                            <StatusBadge aprobada={fac.aprobado_supervisor} />
                                            {fac.comentario_supervisor && (
                                                <p className="text-[10px] text-gray-400 mt-0.5 max-w-[140px] truncate" title={fac.comentario_supervisor}>
                                                    "{fac.comentario_supervisor}"
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
                            {filtered.length} resultado{filtered.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
