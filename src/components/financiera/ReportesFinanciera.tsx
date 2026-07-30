import React, { useState, useEffect } from 'react';
import {
    BarChart3, Download, FileText, PieChart, Activity,
    Loader2, TrendingUp, CheckCircle2, Clock, AlertCircle,
    Receipt, Users, FileSpreadsheet,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

function formatCOP(val: number | null | undefined) {
    if (val == null || isNaN(Number(val))) return '$0';
    return new Intl.NumberFormat('es-CO', {
        style: 'currency', currency: 'COP',
        minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(Number(val));
}

function downloadCSV(rows: string[][], filename: string) {
    const content = rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');
    const blob = new Blob(['﻿' + content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function formatDate(d: string | null) {
    if (!d) return '';
    try { return new Date(d).toLocaleDateString('es-CO'); } catch { return d; }
}

export function ReportesFinanciera() {
    const [consumo, setConsumo] = useState<{ gerencia: string; total: number }[]>([]);
    const [metrics, setMetrics] = useState<any>(null);
    const [resumen, setResumen] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch(`${API_URL}/api/financiera/reporte_consumo`).then(r => r.json()).catch(() => []),
            fetch(`${API_URL}/api/financiera/metrics`).then(r => r.json()).catch(() => null),
            fetch(`${API_URL}/api/financiera/resumen-ejecucion`).then(r => r.json()).catch(() => null),
        ]).then(([c, m, re]) => {
            setConsumo(c);
            setMetrics(m);
            setResumen(re);
        }).finally(() => setLoading(false));
    }, []);

    const totalConsumo = consumo.reduce((a, b) => a + (Number(b.total) || 0), 0);

    async function handleDescargar(tipo: 'ejecucion' | 'pagos' | 'proveedores') {
        setDownloading(tipo);
        try {
            if (tipo === 'ejecucion') {
                const data = await fetch(`${API_URL}/api/financiera/resumen-ejecucion`).then(r => r.json());
                const contratos = data.contratos || [];
                const headers = ['Código', 'Objeto del contrato', 'Valor contrato (COP)', 'Total facturado (COP)', 'Saldo (COP)', '% Ejecución', 'Facturas aprobadas', 'Facturas pendientes', 'Supervisor'];
                const rows = contratos.map((c: any) => {
                    const pct = Number(c.valor_contrato) > 0
                        ? Math.round((Number(c.total_facturado) / Number(c.valor_contrato)) * 100)
                        : 0;
                    return [
                        c.codigo || '',
                        c.objeto || '',
                        Number(c.valor_contrato),
                        Number(c.total_facturado),
                        Number(c.valor_contrato) - Number(c.total_facturado),
                        `${pct}%`,
                        c.facturas_aprobadas,
                        c.facturas_pendientes,
                        c.supervisor_nombre || '',
                    ];
                });
                downloadCSV([headers, ...rows], `Ejecucion_Presupuestal_${new Date().toISOString().slice(0, 10)}.csv`);
            } else if (tipo === 'pagos') {
                const facturas = await fetch(`${API_URL}/api/financiera/facturas`).then(r => r.json());
                const headers = ['AP', 'Código contrato', 'Objeto contrato', 'Concepto', 'Valor (COP)', 'Estado', 'Aprobado supervisor', 'Aprobado gerente', 'Fecha creación'];
                const estadoLabel: Record<string, string> = { aprobada: 'Aprobada', pendiente: 'Pendiente', rechazada: 'Rechazada' };
                const rows = (facturas as any[]).map(f => [
                    f.numero_ap || '',
                    f.contrato_codigo || '',
                    f.contrato_objeto || '',
                    f.concepto || '',
                    Number(f.valor) || 0,
                    estadoLabel[f.estado] || f.estado || '',
                    f.aprobado_supervisor ? 'Sí' : 'No',
                    f.aprobado_gerente ? 'Sí' : 'No',
                    formatDate(f.creado_en),
                ]);
                downloadCSV([headers, ...rows], `Maestro_Pagos_${new Date().toISOString().slice(0, 10)}.csv`);
            } else {
                const proveedores = await fetch(`${API_URL}/api/financiera/reporte-proveedores`).then(r => r.json());
                const headers = ['Código solicitud', 'Objeto', 'Gerencia', 'Estado', 'Proveedor', 'Valor oferta (COP)', 'Moneda', 'Criterios habilitantes', 'Valor agregado', 'Seleccionado'];
                const rows = (proveedores as any[]).map(p => [
                    p.codigo || '',
                    p.objeto || '',
                    p.gerencia || '',
                    p.estado || '',
                    p.nombre_proveedor || '',
                    Number(p.valor_con_impuestos) || 0,
                    p.moneda || 'COP',
                    p.criterios_habilitantes || '',
                    p.valor_agregado || '',
                    p.seleccionado ? 'Sí' : 'No',
                ]);
                downloadCSV([headers, ...rows], `Reporte_Proveedores_${new Date().toISOString().slice(0, 10)}.csv`);
            }
        } catch (e) {
            console.error('Error generando reporte:', e);
        } finally {
            setDownloading(null);
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="w-10 h-10 text-emerald-700 animate-spin" />
                <p className="text-slate-500 font-medium" style={{ fontFamily: 'Gabarito, sans-serif' }}>Cargando reportes...</p>
            </div>
        );
    }

    const kpis = [
        {
            label: 'Solicitudes procesadas',
            value: Number(metrics?.stats?.aprobadas || 0) + Number(metrics?.stats?.pendientes || 0),
            sub: `${metrics?.stats?.pendientes || 0} en proceso`,
            icon: <FileText size={20} />,
            color: 'bg-blue-50 text-blue-600',
        },
        {
            label: 'Valor total aprobado',
            value: formatCOP(metrics?.stats?.valor_total),
            sub: 'solicitudes aprobadas',
            icon: <TrendingUp size={20} />,
            color: 'bg-emerald-50 text-emerald-700',
            money: true,
        },
        {
            label: 'Contratos activos',
            value: resumen?.kpis?.total_contratos || 0,
            sub: 'con facturas o en ejecución',
            icon: <Receipt size={20} />,
            color: 'bg-amber-50 text-amber-600',
        },
        {
            label: 'Total facturado',
            value: formatCOP(resumen?.kpis?.total_facturado),
            sub: `${formatCOP(resumen?.kpis?.total_pendiente)} en revisión`,
            icon: <CheckCircle2 size={20} />,
            color: 'bg-purple-50 text-purple-600',
            money: true,
        },
    ];

    const DESCARGAS = [
        {
            id: 'ejecucion' as const,
            title: 'Ejecución Presupuestal',
            desc: 'Contratos con valor, total facturado, saldo y % de ejecución.',
            icon: <FileSpreadsheet size={20} />,
            color: 'bg-emerald-50 text-emerald-700',
            filename: 'Ejecucion_Presupuestal.csv',
        },
        {
            id: 'pagos' as const,
            title: 'Maestro de Pagos',
            desc: 'Todas las facturas registradas con estado y aprobaciones.',
            icon: <Activity size={20} />,
            color: 'bg-blue-50 text-blue-600',
            filename: 'Maestro_Pagos.csv',
        },
        {
            id: 'proveedores' as const,
            title: 'Reporte de Proveedores',
            desc: 'Proponentes por solicitud con valores y criterios.',
            icon: <Users size={20} />,
            color: 'bg-amber-50 text-amber-600',
            filename: 'Reporte_Proveedores.csv',
        },
    ];

    return (
        <div className="p-6 lg:p-8 space-y-6" style={{ backgroundColor: '#F8F9FA', fontFamily: 'Gabarito, sans-serif', minHeight: '100%' }}>

            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-100 rounded-2xl">
                        <BarChart3 className="text-emerald-700" size={26} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
                        <p className="text-sm text-gray-500">Análisis de ejecución y descargas de gestión</p>
                    </div>
                </div>
                {resumen?.kpis?.total_facturado != null && (
                    <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-3">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-gray-400 tracking-widest">Total facturado</p>
                            <p className="text-lg font-black text-emerald-700">{formatCOP(resumen.kpis.total_facturado)}</p>
                        </div>
                        <Activity className="text-red-400" size={22} />
                    </div>
                )}
            </div>

            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpis.map((k, i) => (
                    <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${k.color}`}>
                            {k.icon}
                        </div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{k.label}</p>
                        <p className="text-xl font-black text-gray-800 leading-tight">{k.value}</p>
                        <p className="text-[11px] text-gray-400 mt-1">{k.sub}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

                {/* Ejecución por gerencia */}
                <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            <PieChart size={18} className="text-emerald-700" />
                            Ejecución por Centro de Costos
                        </h3>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                            Solicitudes aprobadas
                        </span>
                    </div>

                    {consumo.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                            <AlertCircle size={28} className="mb-2 opacity-40" />
                            <p className="text-sm">No hay datos de ejecución registrados.</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {consumo.map((item, i) => {
                                const pct = totalConsumo > 0 ? (Number(item.total) / totalConsumo) * 100 : 0;
                                const color = pct >= 60 ? '#10b981' : pct >= 30 ? '#f59e0b' : '#6366f1';
                                return (
                                    <div key={i}>
                                        <div className="flex justify-between items-end mb-1.5">
                                            <p className="text-sm font-semibold text-gray-700">{item.gerencia}</p>
                                            <div className="text-right">
                                                <span className="text-sm font-black text-gray-900">{formatCOP(item.total)}</span>
                                                <span className="text-[11px] text-gray-400 ml-2">{Math.round(pct)}%</span>
                                            </div>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000"
                                                style={{ width: `${pct}%`, backgroundColor: color }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                            <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total consolidado</span>
                                <span className="text-base font-black text-gray-900">{formatCOP(totalConsumo)}</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Descargas */}
                <div className="space-y-4">
                    <h3 className="font-bold text-gray-700 px-1 flex items-center gap-2">
                        <Download size={16} className="text-gray-500" />
                        Descargas de Gestión
                    </h3>
                    {DESCARGAS.map(d => {
                        const isBusy = downloading === d.id;
                        return (
                            <button
                                key={d.id}
                                onClick={() => handleDescargar(d.id)}
                                disabled={!!downloading}
                                className="w-full group bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all text-left disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                                <div className="flex gap-4 items-start">
                                    <div className={`p-2.5 rounded-xl shrink-0 ${d.color} group-hover:scale-105 transition-transform`}>
                                        {d.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="text-sm font-bold text-gray-900 group-hover:text-emerald-700 transition-colors">{d.title}</h4>
                                        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{d.desc}</p>
                                    </div>
                                    <div className="shrink-0">
                                        {isBusy
                                            ? <Loader2 size={16} className="text-emerald-600 animate-spin" />
                                            : <Download size={16} className="text-gray-300 group-hover:text-emerald-600 transition-colors" />
                                        }
                                    </div>
                                </div>
                                {isBusy && (
                                    <p className="text-[11px] text-emerald-600 font-semibold mt-2 pl-12">Generando archivo...</p>
                                )}
                            </button>
                        );
                    })}

                    {/* Mini resumen facturas */}
                    {resumen?.kpis && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 mt-2">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide">Estado de facturas</h4>
                            <div className="space-y-2">
                                {[
                                    { label: 'Facturado (aprobado)', val: resumen.kpis.total_facturado, icon: <CheckCircle2 size={13} className="text-emerald-600" /> },
                                    { label: 'En revisión', val: resumen.kpis.total_pendiente, icon: <Clock size={13} className="text-amber-500" /> },
                                    { label: 'Saldo disponible', val: Number(resumen.kpis.valor_total_contratos) - Number(resumen.kpis.total_facturado), icon: <TrendingUp size={13} className="text-blue-500" /> },
                                ].map((row, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5 text-gray-600">{row.icon}{row.label}</span>
                                        <span className="font-bold text-gray-800">{formatCOP(row.val)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
