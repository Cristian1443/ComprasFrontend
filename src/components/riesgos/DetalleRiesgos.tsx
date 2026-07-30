import React, { useEffect, useState } from 'react';
import {
    ArrowLeft, CheckCircle, ShieldAlert,
    RotateCcw, Download
} from 'lucide-react';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { InstanciasAprobacion } from '../shared/InstanciasAprobacion';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface DetalleRiesgosProps {
    solicitud: any;
    usuarioActual: any;
    onBack: () => void;
    onActionSuccess?: () => void;
}

export function DetalleRiesgos({ solicitud, usuarioActual, onBack, onActionSuccess }: DetalleRiesgosProps) {
    const getValorOriginalMoneda = (s: any): string => {
        const m = String(s?.moneda || 'COP').toUpperCase();
        if (m === 'USD') return s?.valor_moneda_usd_texto || '';
        if (m === 'EUR') return s?.valor_moneda_eur_texto || '';
        if (m === 'COP') return s?.valor_moneda_cop_texto || '';
        return '';
    };

    const [solicitudParaPDF, setSolicitudParaPDF] = useState<any | null>(null);
    const [comentario, setComentario] = useState('');
    const [procesando, setProcesando] = useState(false);
    const [solicitudFull, setSolicitudFull] = useState<any>(solicitud);

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

    useEffect(() => {
        const cargarDetalle = async () => {
            try {
                const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}`);
                if (!res.ok) return;
                const det = await res.json();
                setSolicitudFull({ ...solicitud, ...det });
            } catch (err) {
                console.error('No se pudo cargar detalle (riesgos):', err);
            }
        };
        if (solicitud?.id) cargarDetalle();
    }, [solicitud?.id]);

    const handleAccion = async (aprobar: boolean) => {
        if (!aprobar && !comentario.trim()) {
            alert('Por favor, indica un motivo de rechazo en el campo de observaciones.');
            return;
        }

        setProcesando(true);
        try {
            const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/riesgos`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    resultado: aprobar ? 'aprobado' : 'rechazado',
                    comentario: comentario,
                    usuario_email: usuarioActual?.email
                })
            });

            if (res.ok) {
                alert(`La solicitud ha sido ${aprobar ? 'APROBADA y enviada a Comité de Contratación' : 'RECHAZADA'} correctamente.`);
                if (onActionSuccess) onActionSuccess();
                onBack();
            } else {
                const error = await res.json();
                throw new Error(error.mensaje || error.error || 'Error al actualizar el estado');
            }
        } catch (err) {
            console.error(err);
            alert(err instanceof Error ? err.message : 'Ocurrió un error al procesar la solicitud.');
        } finally {
            setProcesando(false);
        }
    };

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
    const puedeDecidir = s.estado === 'en_riesgos';
    const estadoBadge = puedeDecidir
        ? { texto: 'Pendiente de decisión', clase: 'bg-amber-100 text-amber-800 border-amber-300' }
        : s.estado === 'rechazado_riesgos'
            ? { texto: 'Rechazada por Riesgos', clase: 'bg-rose-100 text-rose-800 border-rose-300' }
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
                        <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm font-semibold border border-orange-300">
                            Revisión de Riesgos
                        </span>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${estadoBadge.clase}`}>
                            {estadoBadge.texto}
                        </span>
                    </div>
                    <p className="text-gray-600">{s.codigo} - v{s.version || '1'}</p>
                </div>

                <div className="space-y-6">

                    <DetallePlaneacionContractualParte1 solicitud={s} />

                    <SeccionPresupuestoLectura
                        solicitud={s}
                        esDirecta={esDirecta}
                        rubroFinanciera={s.rubro}
                        presupuestoAprobado={s.presupuesto_aprobado}
                    />

                    <DetallePlaneacionContractualParte2 solicitud={s} />

                    <InstanciasAprobacion solicitud={s} />

                    {/* PANEL DECISIÓN DE RIESGOS — solo si aún está pendiente de esta etapa */}
                    {puedeDecidir && (
                        <div className="rounded-2xl text-white overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #431407 0%, #7c2d12 100%)' }}>
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                                <div className="p-6 lg:p-8 lg:border-r border-white/10">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                                            <ShieldAlert size={20} className="text-[#fb923c]" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-orange-200/80">Decisión de Riesgos</p>
                                            <h3 className="text-xl font-black leading-none mt-1">Aprobar o Rechazar</h3>
                                        </div>
                                    </div>
                                    <p className="text-[12px] text-orange-100/80 leading-relaxed mt-3 mb-5">
                                        Evalúa los riesgos jurídicos identificados en el concepto de Jurídica (sección 7.3.1) antes de que la solicitud continúe hacia el Comité de Contratación.
                                    </p>
                                    <div className="space-y-2.5 pt-4 border-t border-white/10">
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] text-orange-200/70 font-bold uppercase tracking-wider">Solicitante</span>
                                            <span className="text-[11px] text-white font-bold text-right truncate">{s.solicitante_nombre}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <span className="text-[10px] text-orange-200/70 font-bold uppercase tracking-wider">Presupuesto</span>
                                            <span className="text-[11px] font-black text-emerald-300">{presupuestoTexto}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-6 lg:p-8 lg:col-span-2 flex flex-col">
                                    <label className="text-[10px] font-bold text-orange-200/80 uppercase tracking-[0.12em] block mb-2">
                                        Observaciones
                                    </label>
                                    <textarea
                                        value={comentario}
                                        onChange={(e) => setComentario(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-orange-200/40 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all resize-none flex-1 min-h-[120px]"
                                        placeholder="Sustento de la decisión..."
                                        rows={4}
                                    />
                                    <p className="text-[10px] text-orange-200/60 mt-1.5 italic">
                                        Obligatorio si vas a rechazar la solicitud.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                                        <button
                                            onClick={() => handleAccion(false)}
                                            disabled={procesando}
                                            className="w-full bg-black/20 hover:bg-rose-500/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all border border-white/10 hover:border-rose-400/40"
                                        >
                                            <RotateCcw size={16} /> Rechazar
                                        </button>
                                        <button
                                            onClick={() => handleAccion(true)}
                                            disabled={procesando}
                                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
                                        >
                                            {procesando
                                                ? 'Procesando...'
                                                : <><CheckCircle size={16} /> Aprobar y Enviar a Comité</>}
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
