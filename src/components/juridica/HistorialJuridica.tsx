import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import {
    Search, Eye, Loader2, ChevronDown, ChevronUp,
    CheckCircle2, XCircle, Clock, FileText, Shield,
    AlertCircle, Trash2, Send, UserCheck, Lock
} from 'lucide-react';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface LogEntry {
    accion: string;
    descripcion: string;
    campo: string | null;
    valor_anterior: string | null;
    valor_nuevo: string | null;
    usuario_nombre: string;
    rol_usuario: string;
    resultado: string;
    creado_en: string;
}

interface SolicitudHistorial {
    id: string;
    codigo: string;
    objeto: string;
    titulo_contrato?: string;
    actualizado_en: string;
    estado: string;
    modalidad: string;
    solicitante_nombre: string;
    gerencia_nombre: string;
    tiene_calificacion: boolean;
    documentos_count: number;
    logs: LogEntry[];
}

const ACCION_CONFIG: Record<string, { label: string; color: string; bg: string; Icon: any }> = {
    LOGIN:                  { label: 'Inicio de sesión',        color: '#64748b', bg: '#f1f5f9', Icon: UserCheck },
    INSERT:                 { label: 'Solicitud creada',        color: '#0891b2', bg: '#ecfeff', Icon: FileText },
    UPDATE:                 { label: 'Actualización',            color: '#2563eb', bg: '#eff6ff', Icon: FileText },
    APROBACION:             { label: 'Aprobado',                 color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle2 },
    RECHAZO:                { label: 'Rechazado',                color: '#dc2626', bg: '#fef2f2', Icon: XCircle },
    DEVOLUCION:             { label: 'Devuelto',                 color: '#d97706', bg: '#fffbeb', Icon: AlertCircle },
    DELETE:                 { label: 'Eliminación',              color: '#dc2626', bg: '#fef2f2', Icon: Trash2 },
    CONVOCATORIA_CREADA:    { label: 'Convocatoria creada',     color: '#7c3aed', bg: '#f5f3ff', Icon: Send },
    INVITACION_FASE1:       { label: 'Invitación Fase 1',       color: '#7c3aed', bg: '#f5f3ff', Icon: Send },
    INVITACION_MASIVA:      { label: 'Invitación masiva',       color: '#7c3aed', bg: '#f5f3ff', Icon: Send },
    INVITACION_LINK:        { label: 'Link de invitación',      color: '#7c3aed', bg: '#f5f3ff', Icon: Send },
    CALIFICACION_GUARDADA:  { label: 'Proponentes calificados', color: '#059669', bg: '#ecfdf5', Icon: CheckCircle2 },
    CALIFICACION_FINALIZADA:{ label: 'Calificación finalizada', color: '#1d4ed8', bg: '#eff6ff', Icon: Lock },
    ACTA_GENERADA:          { label: 'Acta de Adjudicación',    color: '#b45309', bg: '#fefce8', Icon: FileText },
    DEFAULT:                { label: 'Acción',                  color: '#64748b', bg: '#f8fafc', Icon: Clock },
};

const CAMPO_LABELS: Record<string, string> = {
    estado:                  'Estado',
    objeto:                  'Objeto',
    datos_contacto:          'Datos de contacto',
    modalidad:               'Modalidad',
    valor_estimado:          'Valor estimado',
    solicitante_nombre:      'Solicitante',
    gerencia_nombre:         'Gerencia',
    observaciones:           'Observaciones',
    requisitos_tecnicos:     'Requisitos técnicos',
    experiencia:             'Experiencia',
    criterios_habilitantes:  'Criterios habilitantes',
    valor_con_impuestos:     'Valor con impuestos',
    valor_agregado:          'Valor agregado',
    evaluacion_consolidada:  'Evaluación consolidada',
    cc_recomendado:          'CC del recomendado',
};

function getAccionConfig(accion: string) {
    return ACCION_CONFIG[accion] || { ...ACCION_CONFIG.DEFAULT, label: accion };
}

function buildLogDetail(log: LogEntry): string {
    if (log.descripcion) return log.descripcion;
    if (log.accion === 'UPDATE' && log.campo) {
        const campoLabel = CAMPO_LABELS[log.campo] || log.campo;
        if (log.valor_anterior && log.valor_nuevo) {
            const ant = log.valor_anterior.length > 50 ? log.valor_anterior.substring(0, 50) + '…' : log.valor_anterior;
            const nvo = log.valor_nuevo.length > 50 ? log.valor_nuevo.substring(0, 50) + '…' : log.valor_nuevo;
            return `${campoLabel}: "${ant}" → "${nvo}"`;
        }
        if (log.valor_nuevo) {
            const nvo = log.valor_nuevo.length > 60 ? log.valor_nuevo.substring(0, 60) + '…' : log.valor_nuevo;
            return `${campoLabel} actualizado a "${nvo}"`;
        }
        return `${campoLabel} actualizado`;
    }
    if (log.accion === 'INSERT') return 'Solicitud registrada en el sistema';
    return '';
}

function getStatusDisplay(estado: string) {
    switch (estado) {
        case 'en_juridica':        return { label: 'En Proceso',  color: 'bg-amber-50 text-amber-600 border-amber-200',      Icon: Clock };
        case 'aprobado_juridica':  return { label: 'Aprobado',    color: 'bg-emerald-50 text-emerald-600 border-emerald-200', Icon: CheckCircle2 };
        case 'enviado_juridica':   return { label: 'Enviado',     color: 'bg-blue-50 text-blue-600 border-blue-200',         Icon: Send };
        case 'rechazado_juridica': return { label: 'Rechazado',   color: 'bg-rose-50 text-rose-600 border-rose-200',         Icon: XCircle };
        case 'finalizado':         return { label: 'Finalizado',  color: 'bg-slate-100 text-slate-600 border-slate-200',     Icon: Shield };
        default:                   return { label: String(estado).replaceAll('_', ' '), color: 'bg-slate-50 text-slate-500 border-slate-200', Icon: Clock };
    }
}

export function HistorialJuridica({ onSelect }: { onSelect?: (id: string) => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [historial, setHistorial] = useState<SolicitudHistorial[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const fetchHistorial = () => {
        setLoading(true);
        setError(null);
        apiFetch(`${API_URL}/api/juridica/historial`)
            .then(res => { if (!res.ok) throw new Error(); return res.json(); })
            .then(data => setHistorial(Array.isArray(data) ? data : []))
            .catch(err => {
                console.error('Error fetching juridica history:', err);
                setError('No se pudo cargar el historial. Intenta de nuevo.');
            })
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchHistorial(); }, []);

    const filteredHistory = historial.filter(h =>
        h.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.titulo_contrato?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.objeto?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.solicitante_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.gerencia_nombre?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleExpanded = (id: string) =>
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center min-h-[400px]">
                <Loader2 className="animate-spin" style={{ color: '#E84922' }} size={48} />
            </div>
        );
    }

    return (
        <div className="p-6 lg:p-8 space-y-6 bg-white min-h-full">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                    Historial Jurídica
                </h2>
                <p className="text-slate-500 font-medium italic mt-1">
                    Registro de acciones realizadas por el Área Jurídica sobre cada solicitud.
                </p>
            </div>

            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
                    <AlertCircle size={16} />
                    <span className="flex-1">{error}</span>
                    <button onClick={fetchHistorial} className="text-xs font-black uppercase underline underline-offset-2 hover:opacity-70">
                        Reintentar
                    </button>
                </div>
            )}

            {/* Search */}
            <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                    type="text"
                    placeholder="Buscar por código, título, solicitante o gerencia..."
                    className="w-full bg-transparent border-none outline-none font-medium text-slate-700 placeholder:text-slate-400"
                    style={{ fontFamily: 'Gabarito, sans-serif' }}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <span className="text-xs text-slate-400 font-bold shrink-0">{filteredHistory.length} registros</span>
            </div>

            {/* Cards con log */}
            <div className="space-y-4">
                {filteredHistory.length === 0 ? (
                    <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center">
                        <AlertCircle size={40} className="mx-auto text-slate-300 mb-3" />
                        <p className="text-slate-400 font-medium">No se encontraron registros.</p>
                    </div>
                ) : filteredHistory.map((sol) => {
                    const status = getStatusDisplay(sol.estado);
                    const StatusIcon = status.Icon;
                    const isOpen = expanded[sol.id];

                    return (
                        <div key={sol.id} className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                            {/* Cabecera */}
                            <div className="flex items-start justify-between gap-4 p-5 bg-white">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <span className="text-xs font-black font-mono px-2.5 py-1 rounded-md border" style={{ color: '#E84922', backgroundColor: '#FEF2EF', borderColor: '#FCCFBF' }}>
                                            {sol.codigo}
                                        </span>
                                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${status.color}`}>
                                            <StatusIcon size={11} />
                                            {status.label}
                                        </span>
                                        {sol.modalidad && (
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 uppercase">
                                                {sol.modalidad}
                                            </span>
                                        )}
                                        {sol.tiene_calificacion && (
                                            <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                                                ✓ Calificado
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm font-bold text-slate-800 leading-snug line-clamp-1 mt-1">{sol.titulo_contrato || sol.objeto}</p>
                                    <p className="text-xs text-slate-400 mt-1">
                                        {sol.solicitante_nombre} · {nombreGerenciaCompleto(sol.gerencia_nombre)} · Actualizado {new Date(sol.actualizado_en).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                    <button
                                        onClick={() => onSelect?.(sol.id)}
                                        title="Ver expediente"
                                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                                        style={{ color: '#E84922' }}
                                    >
                                        <Eye size={16} />
                                    </button>
                                    <button
                                        onClick={() => toggleExpanded(sol.id)}
                                        className="flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors text-xs font-bold"
                                    >
                                        {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                        {sol.logs.length} {sol.logs.length === 1 ? 'acción' : 'acciones'}
                                    </button>
                                </div>
                            </div>

                            {/* Timeline de logs */}
                            {isOpen && (
                                <div className="border-t border-slate-100 bg-slate-50/60 px-6 py-4">
                                    {sol.logs.length === 0 ? (
                                        <p className="text-xs text-slate-400 italic py-2">No hay acciones registradas para esta solicitud.</p>
                                    ) : (
                                        <ol className="relative border-l-2 border-slate-200 ml-2 space-y-0">
                                            {sol.logs.map((log, i) => {
                                                const cfg = getAccionConfig(log.accion);
                                                const CfgIcon = cfg.Icon;
                                                return (
                                                    <li key={i} className="mb-4 ml-5">
                                                        <span
                                                            className="absolute -left-[11px] flex items-center justify-center w-5 h-5 rounded-full ring-2 ring-white"
                                                            style={{ backgroundColor: cfg.bg, marginTop: '2px' }}
                                                        >
                                                            <CfgIcon size={10} style={{ color: cfg.color }} />
                                                        </span>
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex-1 min-w-0">
                                                                <span
                                                                    className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full mb-1"
                                                                    style={{ color: cfg.color, backgroundColor: cfg.bg }}
                                                                >
                                                                    {cfg.label}
                                                                    {log.resultado && log.resultado !== 'exitoso' && (
                                                                        <span className="text-rose-500 ml-1">· {log.resultado}</span>
                                                                    )}
                                                                </span>
                                                                {buildLogDetail(log) && (
                                                                    <p className="text-xs text-slate-600 leading-snug">{buildLogDetail(log)}</p>
                                                                )}
                                                                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                                                                    por <span className="font-bold text-slate-500">{log.usuario_nombre}</span>
                                                                    {log.rol_usuario && ` · ${String(log.rol_usuario).replaceAll('_', ' ')}`}
                                                                </p>
                                                            </div>
                                                            <time className="text-[10px] text-slate-400 font-mono shrink-0 mt-0.5">
                                                                {new Date(log.creado_en).toLocaleString('es-CO', {
                                                                    day: '2-digit', month: '2-digit', year: '2-digit',
                                                                    hour: '2-digit', minute: '2-digit'
                                                                })}
                                                            </time>
                                                        </div>
                                                    </li>
                                                );
                                            })}
                                        </ol>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
