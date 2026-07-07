import React, { useEffect, useState } from 'react';
import {
    ArrowLeft, CheckCircle, BadgeCheck,
    RotateCcw, Download
} from 'lucide-react';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { InstanciasAprobacion } from '../shared/InstanciasAprobacion';
import { EstampaAprobacion } from '../shared/EstampaAprobacion';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface DetalleAprobacionProps {
    solicitud: any;
    usuarioActual: any;
    onBack: () => void;
    onActionSuccess?: () => void;
}

/* ──────────── Mapeo de formas de pago ──────────── */
const FORMAS_PAGO: Record<string, string> = {
    anticipo: 'Anticipo',
    pago_unico: 'Pago único',
    mensual: 'Mensual',
};

const getFormaPagoTexto = (codigo: any): string => {
    if (!codigo) return '';
    const key = String(codigo).toLowerCase();
    return FORMAS_PAGO[key] || String(codigo);
};

export function DetalleAprobacion({ solicitud, usuarioActual, onBack, onActionSuccess }: DetalleAprobacionProps) {
    const getValorOriginalMoneda = (s: any): string => {
        const m = String(s?.moneda || 'COP').toUpperCase();
        if (m === 'USD') return s?.valor_moneda_usd_texto || '';
        if (m === 'EUR') return s?.valor_moneda_eur_texto || '';
        if (m === 'COP') return s?.valor_moneda_cop_texto || '';
        return '';
    };

    const parseAnexosSolicitante = (value: any): any[] => {
        if (Array.isArray(value)) return value;
        if (typeof value === 'string') {
            try {
                const parsed = JSON.parse(value);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const [solicitudParaPDF, setSolicitudParaPDF] = useState<any | null>(null);
    const [comentario, setComentario] = useState('');

    const abrirPDF = async () => {
        try {
            const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}`);
            if (res.ok) {
                const data = await res.json();
                setSolicitudParaPDF(data);
            } else {
                setSolicitudParaPDF(solicitud);
            }
        } catch {
            setSolicitudParaPDF(solicitud);
        }
    };
    const [procesando, setProcesando] = useState(false);
    /* solicitudFull: detalle completo desde GET /api/solicitudes/:id — tiene todas las columnas */
    const [solicitudFull, setSolicitudFull] = useState<any>(solicitud);
    const [proponentesDetalle, setProponentesDetalle] = useState<any[]>(
        Array.isArray(solicitud?.proponentes) ? solicitud.proponentes : []
    );
    const [anexosSolicitante, setAnexosSolicitante] = useState<any[]>(
        parseAnexosSolicitante(solicitud?.anexos_solicitante)
    );

    useEffect(() => {
        const cargarDetalle = async () => {
            try {
                const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}`);
                if (!res.ok) return;
                const det = await res.json();
                /* Reemplazar con el detalle completo — el listado no trae todas las columnas */
                setSolicitudFull({ ...solicitud, ...det });
                setProponentesDetalle(Array.isArray(det?.proponentes) ? det.proponentes : []);
                setAnexosSolicitante(parseAnexosSolicitante(det?.anexos_solicitante));
            } catch (err) {
                console.error('No se pudo cargar detalle (gerente):', err);
            }
        };
        if (solicitud?.id) cargarDetalle();
    }, [solicitud?.id]);

    useEffect(() => {
        setAnexosSolicitante(parseAnexosSolicitante(solicitud?.anexos_solicitante));
    }, [solicitud]);

    const handleAccion = async (aprobar: boolean) => {
        if (!aprobar && !comentario.trim()) {
            alert('Por favor, indica un motivo de devolución en el campo de observaciones.');
            return;
        }

        setProcesando(true);
        try {
            const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/estado`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    estado: aprobar ? 'en_financiera' : 'devuelto_al_solicitante',
                    comentario: comentario,
                    gerente_id: usuarioActual?.id || 'b60c8abb-d8ab-4447-bce3-e846cc9b5c22'
                })
            });

            if (res.ok) {
                alert(`La solicitud ha sido ${aprobar ? 'APROBADA y enviada a revisión de Financiera' : 'DEVUELTA al solicitante para correcciones'} correctamente.`);
                if (onActionSuccess) onActionSuccess();
                onBack();
            } else {
                const error = await res.json();
                throw new Error(error.error || 'Error al actualizar el estado');
            }
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Ocurrió un error al procesar la solicitud.');
        } finally {
            setProcesando(false);
        }
    };

    const diasDesdeRadicacion = (() => {
        if (!solicitud.creado_en) return 0;
        const hoy = new Date();
        const fechaInicio = new Date(solicitud.creado_en);
        const d1 = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const d2 = Date.UTC(fechaInicio.getFullYear(), fechaInicio.getMonth(), fechaInicio.getDate());
        const diffDays = Math.floor((d1 - d2) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 ? diffDays : 0;
    })();

    /* Usar solicitudFull (detalle completo) para todos los campos de datos */
    const s = solicitudFull;
    const monedaSol = String(s.moneda || 'COP').toUpperCase();

    const presupuestoTexto = getValorOriginalMoneda(s)
        ? `${monedaSol} ${getValorOriginalMoneda(s)}`
        : new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: monedaSol === 'COMBINADA' ? 'COP' : monedaSol,
            maximumFractionDigits: 0
        }).format(s.valor_estimado || 0);

    const esDirecta = String(s.modalidad || '').toLowerCase() === 'directa';
    const puedeDecidir = s.estado === 'enviado_gerente';
    const estadoBadge = puedeDecidir
        ? { texto: 'Pendiente de decisión', clase: 'bg-amber-100 text-amber-800 border-amber-300' }
        : s.estado === 'devuelto_al_solicitante'
            ? { texto: 'Devuelta al solicitante', clase: 'bg-rose-100 text-rose-800 border-rose-300' }
            : { texto: 'Ya decidida', clase: 'bg-emerald-100 text-emerald-800 border-emerald-300' };

    return (
        <div className="ux-page p-4 lg:p-8" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            {solicitudParaPDF && (
                <FormatoPlaneacionImprimible
                    solicitud={solicitudParaPDF}
                    onClose={() => setSolicitudParaPDF(null)}
                />
            )}
            <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>

                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={onBack}
                            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                        >
                            <ArrowLeft size={20} /> Volver al listado
                        </button>
                        <button
                            type="button"
                            onClick={abrirPDF}
                            className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm transition-colors"
                            style={{ backgroundColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}
                        >
                            <Download size={16} /> Descargar PDF
                        </button>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-3xl font-semibold text-gray-900 mb-1">
                            Formato de Planeación Contractual
                        </h1>
                        <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm font-semibold border border-purple-300">
                            Revisión Gerencial
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${estadoBadge.clase}`}>
                            {estadoBadge.texto}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold border border-slate-200">
                            {diasDesdeRadicacion} días en bandeja
                        </span>
                    </div>
                    <p className="text-gray-600">{s.codigo} - v{s.version || '1'}</p>
                </div>

                <div className="space-y-6">

                    {/* Documento base de Planeación Contractual — misma estructura que en el formulario del Solicitante */}
                    <DetallePlaneacionContractualParte1 solicitud={s} />

                    <SeccionPresupuestoLectura
                        solicitud={s}
                        esDirecta={esDirecta}
                        rubroFinanciera={s.rubro}
                        presupuestoAprobado={s.presupuesto_aprobado}
                    />

                    <DetallePlaneacionContractualParte2 solicitud={s} />

                    {/* Sección VIII — Conclusiones del Comité: no visible para Gerente */}

                    <InstanciasAprobacion solicitud={s} />

                    <EstampaAprobacion
                        etapa="gerente"
                        solicitud={s}
                        usuarioActual={usuarioActual}
                    />

                    {/* PANEL DECISIÓN GERENCIAL — solo si aún está pendiente de esta etapa */}
                    {puedeDecidir && (
                    <div className="rounded-2xl text-white overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)' }}>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                            {/* Contexto y mini info solicitante */}
                            <div className="p-6 lg:p-8 lg:border-r border-white/10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                        <BadgeCheck size={20} className="text-[#3384D6]" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">Decisión Gerencial</p>
                                        <h3 className="text-xl font-black leading-none mt-1">Aprobar o Devolver</h3>
                                    </div>
                                </div>
                                <p className="text-[12px] text-slate-300 leading-relaxed mt-3 mb-5">
                                    Tu observación quedará registrada en el expediente y será visible para el solicitante y para Financiera.
                                </p>
                                <div className="space-y-2.5 pt-4 border-t border-white/10">
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solicitante</span>
                                        <span className="text-[11px] text-slate-200 font-bold text-right truncate">{s.solicitante_nombre}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Radicación</span>
                                        <span className="text-[11px] text-slate-200 font-bold">
                                            {new Date(s.creado_en).toLocaleDateString('es-CO')}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between gap-3">
                                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Días en bandeja</span>
                                        <span className="text-[11px] font-bold text-[#3384D6]">{diasDesdeRadicacion}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Observaciones */}
                            <div className="p-6 lg:p-8 lg:col-span-2 flex flex-col">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em] block mb-2">
                                    Observaciones
                                </label>
                                <textarea
                                    value={comentario}
                                    onChange={(e) => setComentario(e.target.value)}
                                    className="w-full bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-[#3384D6] focus:border-transparent transition-all resize-none flex-1 min-h-[120px]"
                                    placeholder="Sustento de la decisión..."
                                    rows={4}
                                />
                                <p className="text-[10px] text-slate-500 mt-1.5 italic">
                                    Obligatorio si vas a devolver la solicitud.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                                    <button
                                        onClick={() => handleAccion(false)}
                                        disabled={procesando}
                                        className="w-full bg-slate-700/80 hover:bg-amber-500/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all border border-slate-600/50 hover:border-amber-400/40"
                                    >
                                        <RotateCcw size={16} /> Devolver para Corrección
                                    </button>
                                    <button
                                        onClick={() => handleAccion(true)}
                                        disabled={procesando}
                                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
                                    >
                                        {procesando
                                            ? 'Procesando...'
                                            : <><CheckCircle size={16} /> Aprobar y Enviar</>}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    )}

                </div>
            </div>
        </div>
    );
}
