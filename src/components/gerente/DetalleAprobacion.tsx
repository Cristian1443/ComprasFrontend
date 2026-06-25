import React, { useEffect, useState } from 'react';
import {
    ArrowLeft, CheckCircle, FileText, Calendar, BadgeCheck,
    ArrowUpRight, Paperclip, RotateCcw, Building2, Mail, Download
} from 'lucide-react';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { TrazabilidadFlujo } from '../shared/TrazabilidadFlujo';
import { EstampaAprobacion } from '../shared/EstampaAprobacion';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface DetalleAprobacionProps {
    solicitud: any;
    usuarioActual: any;
    onBack: () => void;
    onActionSuccess?: () => void;
}

/* ──────────── Helpers de estilo (mismos del formulario del solicitante) ──────────── */
const rowStyle: React.CSSProperties = {
    display: 'flex', borderBottom: '1px solid #e5e7eb', alignItems: 'stretch'
};
const labelCellStyle: React.CSSProperties = {
    width: 220, minWidth: 180, flexShrink: 0, padding: '16px',
    fontWeight: 600, fontSize: '0.8rem', color: '#1F2937',
    borderRight: '1px solid #e5e7eb', backgroundColor: '#fafafa',
    fontFamily: 'Gabarito, sans-serif', display: 'flex', alignItems: 'flex-start', paddingTop: 18
};
const valueCellStyle: React.CSSProperties = {
    flex: 1, padding: '16px',
    fontFamily: 'Gabarito, sans-serif',
    fontSize: '0.875rem', color: '#1F2937', backgroundColor: '#fff',
    minHeight: 52,
    whiteSpace: 'pre-wrap', wordBreak: 'break-word'
};

/* ──────────── SectionHeader (banda roja tipo Excel) ──────────── */
function SectionHeader({ title }: { title: string }) {
    return (
        <div style={{
            backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 700,
            fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px',
            letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif'
        }}>
            {title}
        </div>
    );
}

/* ──────────── DataRow tipo formato ──────────── */
function DataRow({ label, value, hint, last = false }: { label: string; value: any; hint?: string; last?: boolean }) {
    const showEmpty = value === null || value === undefined || String(value).trim() === '';
    return (
        <div style={{ ...rowStyle, borderBottom: last ? 'none' : '1px solid #e5e7eb' }}>
            <div style={labelCellStyle}>{label}</div>
            <div style={valueCellStyle}>
                {showEmpty
                    ? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>
                    : value}
                {hint && (
                    <p style={{ marginTop: 6, fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic' }}>{hint}</p>
                )}
            </div>
        </div>
    );
}

/* ──────────── Mapeo de causales para modalidad directa ──────────── */
const CAUSALES_DIRECTA: Record<string, string> = {
    i: 'I. Cuando no existen otros proveedores para el suministro del bien y/o servicio por ser titular de derechos de propiedad intelectual o por ser proveedor exclusivo en el territorio nacional.',
    ii: 'II. Cuando por razones técnicas sólo se pueda contratar con un proveedor.',
    iii_a: 'III. Cuando se declare desierta la convocatoria para la adquisición del bien y/o servicio por dos (2) veces consecutivas, por falta de proponentes.',
    iv: 'IV. Cuando el suministro de los bienes y servicios, por su especialidad, sólo puede ser ejecutado y/o suministrado por una determinada persona natural o jurídica (Intuito Personae).',
    v: 'V. Cuando se deba asegurar disponibilidad de manera continua en servicios de alojamiento o transporte.',
    vi: 'VI. En los servicios bajo la modalidad de suscripción, afiliación o inscripción a publicaciones físicas o digitales que sean de interés de La Corporación.',
    vii: 'VII. Contratos de arrendamiento de bienes inmuebles.',
    viii: 'VIII. Contratación de productos financieros y seguros.',
    ix: 'IX. Contratación de bienes y servicios relacionados con capacitaciones y Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).',
    x: 'X. Cuando sea requerido por urgencia manifiesta de contar con el bien y/o servicio de manera inmediata.',
};

const getCausalTexto = (codigo: any): string => {
    if (!codigo) return '';
    const key = String(codigo).toLowerCase();
    return CAUSALES_DIRECTA[key] || String(codigo);
};

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

/* Formatea un valor monetario con puntos de miles (es-CO). Acepta texto con/sin puntos. */
const fmtCOP = (v: any): string => {
    if (v === null || v === undefined || v === '') return '';
    const cleaned = String(v).replace(/\./g, '').replace(',', '.');
    const num = Number(cleaned);
    if (isNaN(num)) return String(v);
    return `$${num.toLocaleString('es-CO')}`;
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

    const abrirDocumentoSolicitante = (file: any) => {
        const rawCandidates = [
            file?.url,
            file?.path,
            file?.ruta,
            file?.nombre_almacenado ? `/api/uploads/solicitudes/${file.nombre_almacenado}` : null,
            file?.nombre_almacenado ? `/api/uploads/convocatorias/${file.nombre_almacenado}` : null,
            file?.nombre ? `/api/uploads/solicitudes/${encodeURIComponent(file.nombre)}` : null,
            file?.nombre ? `/api/uploads/convocatorias/${encodeURIComponent(file.nombre)}` : null,
        ].filter(Boolean) as string[];

        const candidates = Array.from(new Set(rawCandidates)).map((u) =>
            u.startsWith('http') ? u : `${API_URL}${u}`
        );

        if (candidates.length > 0) {
            window.open(candidates[0], '_blank', 'noopener,noreferrer');
            return;
        }

        alert('Este archivo no tiene una ruta válida para abrirse.');
    };

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

    const plazoTexto = `${s.plazo_ejecucion_meses || 0} meses${(s.plazo_ejecucion_dias || 0) > 0 ? ` y ${s.plazo_ejecucion_dias} días` : ''}`;

    const esDirecta = String(s.modalidad || '').toLowerCase() === 'directa';

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
                        <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-300">
                            Pendiente de decisión
                        </span>
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold border border-slate-200">
                            {diasDesdeRadicacion} días en bandeja
                        </span>
                    </div>
                    <p className="text-gray-600">{s.codigo} - v{s.version || '1'}</p>
                </div>

                <div className="space-y-6">

                    {/* Encabezado Automático (igual que el solicitante) */}
                    <div className="bg-white rounded-lg shadow-lg border-2 overflow-hidden" style={{ borderColor: 'var(--brand-primary)' }}>
                        <div className="p-4 border-b" style={{ backgroundColor: 'var(--brand-secondary)' }}>
                            <h2 className="text-lg font-semibold text-white">Información Automática (Office 365)</h2>
                        </div>
                        <div className="p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {[
                                    { icon: <Building2 size={20} />, label: 'Gerencia', value: s.gerencia_nombre || '—' },
                                    { icon: <Mail size={20} />, label: 'Solicitante', value: s.solicitante_nombre || '—' },
                                    { icon: <Calendar size={20} />, label: 'Fecha de Solicitud', value: s.creado_en ? new Date(s.creado_en).toLocaleDateString('es-CO') : '—' },
                                ].map(({ icon, label, value }) => (
                                    <div key={label}>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span style={{ color: 'var(--brand-secondary)' }}>{icon}</span>
                                            <label className="block text-sm font-semibold text-gray-700">{label}</label>
                                        </div>
                                        <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                                            <p className="text-gray-900">{value}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ══════════════════════════════════════════════════════════════════ */}
                    {/* Mismo orden que el formulario contractual del Solicitante         */}
                    {/* ══════════════════════════════════════════════════════════════════ */}

                    {/* ── SECCIÓN I — condicional por modalidad ── */}
                    {esDirecta ? (() => {
                        const pdfLabel: React.CSSProperties = {
                            width: 180, minWidth: 160, padding: '12px 14px', fontWeight: 700,
                            fontSize: '0.8rem', color: '#1F2937', borderRight: '1px solid #d1d5db',
                            display: 'flex', alignItems: 'center', lineHeight: 1.4, flexShrink: 0,
                            fontFamily: 'Gabarito, sans-serif', backgroundColor: '#fafafa',
                        };
                        const pdfCell: React.CSSProperties = { flex: 1, padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', color: '#1F2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
                        const rowB: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #d1d5db' };
                        const autoTag = (v: string) => <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: '0.85rem' }}>{v || '—'}</span>;
                        return (
                            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                                <div style={{ backgroundColor: 'var(--brand-primary)', padding: '11px 20px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FORMATO PLANEACIÓN CONTRACTUAL</span>
                                </div>
                                <div style={rowB}>
                                    <div style={pdfLabel}>Nombre del proceso:</div>
                                    <div style={pdfCell}>{s.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                        <div style={pdfLabel}>Fecha de solicitud:</div>
                                        <div style={pdfCell}>{autoTag(s.creado_en ? new Date(s.creado_en).toLocaleDateString('es-CO') : '')}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={pdfLabel}>Fecha del Comité:</div>
                                        <div style={pdfCell}>{s.fecha_comite ? autoTag(new Date(`${s.fecha_comite}T00:00:00`).toLocaleDateString('es-CO')) : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pendiente asignación</span>}</div>
                                    </div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                        <div style={pdfLabel}>Gerencia solicitante:</div>
                                        <div style={pdfCell}>{autoTag(s.gerencia_nombre || '')}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={pdfLabel}>Supervisor del contrato:</div>
                                        <div style={pdfCell}>{s.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                                    </div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                        <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada solicitud de propuestas:</div>
                                        <div style={pdfCell}>{s.fecha_estimada_solicitud ? new Date(`${s.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada recepción de propuestas:</div>
                                        <div style={pdfCell}>{s.fecha_estimada_recepcion ? new Date(`${s.fecha_estimada_recepcion}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                                    </div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                                    <div style={pdfCell}>{s.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                                <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                                </div>
                                <div style={rowB}>
                                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.1 Justificación:</div>
                                    <div style={pdfCell}>{s.justificacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                                <div style={{ display: 'flex' }}>
                                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.2 Descripción de la necesidad:</div>
                                    <div style={pdfCell}>{s.descripcion_necesidad_detalle || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                            </div>
                        );
                    })() : (() => {
                        /* Invitación/TDR — fiel al PDF F30-MA-GAF-02 */
                        const pdfLabel: React.CSSProperties = {
                            width: 180, minWidth: 160, padding: '12px 14px', fontWeight: 700,
                            fontSize: '0.8rem', color: '#1F2937', borderRight: '1px solid #d1d5db',
                            display: 'flex', alignItems: 'center', lineHeight: 1.4, flexShrink: 0,
                            fontFamily: 'Gabarito, sans-serif', backgroundColor: '#fafafa',
                        };
                        const pdfCell: React.CSSProperties = { flex: 1, padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', color: '#1F2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word' };
                        const rowB: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #d1d5db' };
                        const autoTag = (v: string) => <span style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, backgroundColor: '#f3f4f6', border: '1px solid #e5e7eb', color: '#374151', fontSize: '0.85rem' }}>{v || '—'}</span>;
                        return (
                            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                                <div style={{ backgroundColor: 'var(--brand-primary)', padding: '11px 20px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>FORMATO PLANEACIÓN CONTRACTUAL</span>
                                </div>
                                <div style={rowB}>
                                    <div style={pdfLabel}>Nombre del proceso:</div>
                                    <div style={pdfCell}>{s.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                        <div style={pdfLabel}>Fecha de solicitud:</div>
                                        <div style={pdfCell}>{autoTag(s.creado_en ? new Date(s.creado_en).toLocaleDateString('es-CO') : '')}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={pdfLabel}>Modalidad de contratación:</div>
                                        <div style={pdfCell}>{autoTag(String(s.modalidad || '').charAt(0).toUpperCase() + String(s.modalidad || '').slice(1))}</div>
                                    </div>
                                </div>
                                <div style={rowB}>
                                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                        <div style={pdfLabel}>Gerencia solicitante:</div>
                                        <div style={pdfCell}>{autoTag(s.gerencia_nombre || '')}</div>
                                    </div>
                                    <div style={{ flex: 1, display: 'flex' }}>
                                        <div style={pdfLabel}>Supervisor del contrato:</div>
                                        <div style={pdfCell}>{s.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                                    </div>
                                </div>
                                {s.fecha_estimada_solicitud && (
                                    <div style={rowB}>
                                        <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                                            <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada en la que se requiere el contrato:</div>
                                            <div style={pdfCell}>{new Date(`${s.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO')}</div>
                                        </div>
                                        <div style={{ flex: 1 }} />
                                    </div>
                                )}
                                <div style={rowB}>
                                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                                    <div style={pdfCell}>{s.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                                <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                                </div>
                                <div style={{ display: 'flex' }}>
                                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Descripción de la necesidad:</div>
                                    <div style={pdfCell}>{s.justificacion || s.criterios_contratacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* ── SECCIÓN II — Plazo y Lugar ── */}
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                        <SectionHeader title="II. DESCRIPCIÓN DEL PLAZO Y LUGAR DE EJECUCIÓN." />
                        <DataRow label="2.1 Plazo de ejecución" value={plazoTexto} />
                        <DataRow label="2.2 Lugar de ejecución" value={s.lugar_ejecucion} last />
                    </div>

                    {/* ── SECCIÓN III — Investigación de Mercado ── */}
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                        {esDirecta
                            ? <SectionHeader title="III. INVESTIGACIÓN DE MERCADO." />
                            : <div style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif' }}>DATOS DEL CONTACTO / ESTUDIO DE MERCADO</div>
                        }

                        <div style={{ padding: '8px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic' }}>
                                Ingresar la siguiente información de los posibles proponentes que puedan suplir la contratación.
                                {esDirecta && <strong style={{ color: 'var(--brand-primary)', marginLeft: 4 }}>Contratación Directa: mínimo 4 proponentes.</strong>}
                            </p>
                        </div>

                        {Array.isArray(proponentesDetalle) && proponentesDetalle.length > 0 ? (
                            esDirecta ? (
                                /* Directa — 7 columnas según PDF F30-MA-GAF-02 */
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'Gabarito, sans-serif', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '6%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} />
                                            <col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} />
                                            <col style={{ width: '12%' }} /><col style={{ width: '14%' }} />
                                        </colgroup>
                                        <thead>
                                            <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                <th style={{ border: '1px solid #d97458', padding: '8px 6px', color: '#fff', textAlign: 'center' }}>No.</th>
                                                {['Nombre del proveedor', 'Datos de contacto', 'Requisitos técnicos', 'Experiencia', 'Criterios habilitantes', 'Valor + Impuestos', 'Anexo / Observaciones (Valor agregado)'].map(h => (
                                                    <th key={h} style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', textAlign: 'center', lineHeight: 1.2, fontWeight: 700 }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proponentesDetalle.map((p: any, i: number) => {
                                                const e = (v: string) => v || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>;
                                                return (
                                                    <tr key={p.id || i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', verticalAlign: 'top' }}>{i + 1}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.nombre_proveedor || p.nombreProveedor || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.datos_contacto || p.datosContacto || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.requisitos_tecnicos || p.requisitosTecnicos || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.experiencia || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.criterios_habilitantes || p.criteriosHabilitantes || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.valor_con_impuestos || p.valorConImpuestos || p.valorImpuestos || '')}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e(p.observaciones || '')}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                /* Invitación/TDR — tabla INVITADOS fiel al PDF */
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'Gabarito, sans-serif', tableLayout: 'fixed' }}>
                                        <colgroup>
                                            <col style={{ width: '4%' }} /><col style={{ width: '27%' }} />
                                            <col style={{ width: '27%' }} /><col style={{ width: '22%' }} /><col style={{ width: '20%' }} />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th colSpan={5} style={{ border: '1px solid #d1d5db', padding: '7px 10px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#374151', backgroundColor: '#fff' }}>INVITADOS</th>
                                            </tr>
                                            <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                                                <th style={{ border: '1px solid #d97458', padding: '6px 4px', color: '#fff', textAlign: 'center' }}>No.</th>
                                                {['Nombre del proveedor', 'Datos de contacto', 'Valor de cotización', 'Plazo'].map(h => (
                                                    <th key={h} style={{ border: '1px solid #d97458', padding: '6px 8px', color: '#fff', textAlign: 'left' }}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {proponentesDetalle.map((p: any, i: number) => {
                                                const pm = p.plazo_meses ?? p.plazoMeses ?? '';
                                                const pd = p.plazo_dias ?? p.plazoDias ?? '';
                                                const plazoStr = [pm ? `${pm} m` : '', pd ? `${pd} d` : ''].filter(Boolean).join(' / ') || '—';
                                                return (
                                                    <tr key={p.id || i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', verticalAlign: 'top' }}>{i + 1}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.nombre_proveedor || p.nombreProveedor || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.datos_contacto || p.datosContacto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'right', verticalAlign: 'top', fontWeight: 700, color: '#065F46' }}>
                                                            {p.valor_cotizacion ? fmtCOP(p.valor_cotizacion) : <span style={{ color: '#9CA3AF', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                                                        </td>
                                                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', verticalAlign: 'top' }}>{plazoStr}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        ) : (
                            <div style={{ padding: 24, textAlign: 'center', color: '#9CA3AF', fontStyle: 'italic', fontSize: '0.85rem' }}>
                                No se registraron proponentes en la investigación de mercado.
                            </div>
                        )}

                        {/* Análisis del Mercado — mismo layout que el formulario de invitación */}
                        {!esDirecta && (
                            <div style={{ borderTop: '2px solid #e5e7eb' }}>
                                <div style={{ backgroundColor: '#1a3a5c', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif' }}>
                                    ANÁLISIS DEL MERCADO
                                </div>

                                {/* SERVICIOS OFERTADOS — full width */}
                                <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>SERVICIOS OFERTADOS</span>
                                    </div>
                                    <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', color: '#1F2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 48 }}>
                                        {s.analisis_servicios_ofertados || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                                    </div>
                                </div>

                                {/* VALOR PROMEDIO | PLAZO PROMEDIO — grid 50/50 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                                    <div style={{ borderRight: '1px solid #e5e7eb' }}>
                                        <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>VALOR PROMEDIO</span>
                                        </div>
                                        <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                                            {s.analisis_valor_promedio
                                                ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(s.analisis_valor_promedio)}</span>
                                                : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                                            <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PLAZO PROMEDIO</span>
                                        </div>
                                        <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                                            {(() => {
                                                const pm = s.analisis_plazo_promedio_meses;
                                                const pd = s.analisis_plazo_promedio_dias;
                                                const texto = [pm ? `${pm} meses` : '', pd ? `${pd} días` : ''].filter(Boolean).join(' y ');
                                                return texto
                                                    ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{texto}</span>
                                                    : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>;
                                            })()}
                                        </div>
                                    </div>
                                </div>

                                {/* PRESUPUESTO OFICIAL — full width */}
                                <div>
                                    <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PRESUPUESTO OFICIAL</span>
                                    </div>
                                    <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                                        {s.analisis_presupuesto_oficial
                                            ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(s.analisis_presupuesto_oficial)}</span>
                                            : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ── SECCIÓN IV — Modalidad de Selección (solo Directa) ── */}
                    {esDirecta && (
                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                            <SectionHeader title="IV. IDENTIFICACIÓN DEL CONTRATO A CELEBRAR Y MODALIDAD DE SELECCIÓN." />
                            <DataRow label="4.1 Modalidad de selección:" value={getCausalTexto(s.modalidad_seleccion)} />
                            <DataRow
                                label="Fecha del Comité"
                                value={s.fecha_comite ? new Date(`${s.fecha_comite}T00:00:00`).toLocaleDateString('es-CO') : ''}
                                hint="Asignado por el Comité de Contrataciones."
                                last
                            />
                        </div>
                    )}

                    <SeccionPresupuestoLectura
                        solicitud={s}
                        esDirecta={esDirecta}
                        rubroFinanciera={s.rubro}
                        presupuestoAprobado={s.presupuesto_aprobado}
                    />

                    {/* ── SECCIÓN VI/V — Supervisión y Entregables ── */}
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                        <SectionHeader title={`${esDirecta ? 'VI' : 'V'}. SUPERVISIÓN Y ENTREGABLES DEL CONTRATO.`} />
                        <DataRow label={`${esDirecta ? '6.1' : '5.1'} Posibilidad de Supervisión`} value={s.supervision_nombre} />

                        {/* Obligaciones Específicas — solo Invitación/TDR */}
                        {!esDirecta && (() => {
                            const obs: { descripcion: string }[] = (() => {
                                try { return Array.isArray(s.obligaciones_especificas) ? s.obligaciones_especificas : JSON.parse(s.obligaciones_especificas || '[]'); } catch { return []; }
                            })().filter((o: any) => o?.descripcion?.trim());
                            return (
                                <div style={{ ...rowStyle }}>
                                    <div style={labelCellStyle}>5.2 Obligaciones Específicas</div>
                                    <div style={valueCellStyle}>
                                        {obs.length === 0
                                            ? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>
                                            : <ol style={{ margin: 0, paddingLeft: 20 }}>
                                                {obs.map((o, i) => (
                                                    <li key={i} style={{ marginBottom: 6, lineHeight: 1.5 }}>{o.descripcion}</li>
                                                ))}
                                              </ol>}
                                    </div>
                                </div>
                            );
                        })()}

                        {/* Entregables con porcentaje */}
                        {(() => {
                            const ents: { descripcion: string; porcentaje: string; sinPorcentaje: boolean }[] = (() => {
                                try { return Array.isArray(s.entregables_detalle) ? s.entregables_detalle : JSON.parse(s.entregables_detalle || '[]'); } catch { return []; }
                            })().filter((e: any) => e?.descripcion?.trim());
                            const hayPct = ents.some(e => !e.sinPorcentaje && e.porcentaje);
                            return (
                                <div style={{ ...rowStyle, borderBottom: 'none' }}>
                                    <div style={labelCellStyle}>{`${esDirecta ? '6.3' : '5.3'} Entregables`}</div>
                                    <div style={{ ...valueCellStyle, padding: 12 }}>
                                        {ents.length === 0
                                            ? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>
                                            : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif' }}>
                                                <thead>
                                                    <tr style={{ backgroundColor: '#fde8e2' }}>
                                                        <th style={{ border: '1px solid #e5e7eb', padding: '6px 8px', fontWeight: 700, color: '#374151', textAlign: 'center', width: 32 }}>#</th>
                                                        <th style={{ border: '1px solid #e5e7eb', padding: '6px 10px', fontWeight: 700, color: '#374151', textAlign: 'left' }}>Descripción del entregable</th>
                                                        {hayPct && <th style={{ border: '1px solid #e5e7eb', padding: '6px 10px', fontWeight: 700, color: '#374151', textAlign: 'center', width: 100 }}>% Pago</th>}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {ents.map((e, i) => (
                                                        <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                                            <td style={{ border: '1px solid #e5e7eb', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>{i + 1}</td>
                                                            <td style={{ border: '1px solid #e5e7eb', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{e.descripcion}</td>
                                                            {hayPct && (
                                                                <td style={{ border: '1px solid #e5e7eb', padding: '8px', textAlign: 'center', fontWeight: 700, color: e.sinPorcentaje ? '#9CA3AF' : '#065F46' }}>
                                                                    {e.sinPorcentaje ? <span style={{ fontStyle: 'italic', fontWeight: 400 }}>Sin %</span> : `${e.porcentaje}%`}
                                                                </td>
                                                            )}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                                {hayPct && (
                                                    <tfoot>
                                                        <tr style={{ backgroundColor: '#f0fdf4' }}>
                                                            <td colSpan={2} style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'right', fontWeight: 700, fontSize: '0.78rem', color: '#15803d' }}>Total:</td>
                                                            <td style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'center', fontWeight: 700, color: '#15803d' }}>
                                                                {ents.reduce((s, e) => s + (!e.sinPorcentaje && e.porcentaje ? parseFloat(e.porcentaje) || 0 : 0), 0)}%
                                                            </td>
                                                        </tr>
                                                    </tfoot>
                                                )}
                                              </table>}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* ── SECCIÓN VII/VI — Anexos y Documentos Soporte ── */}
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                        <SectionHeader title={`${esDirecta ? 'VII' : 'VI'}. ANEXOS.`} />
                        {Array.isArray(s.anexosDocs) && s.anexosDocs.length > 0 && (
                            <div style={{ padding: '12px 20px', borderBottom: '1px solid #e5e7eb' }}>
                                <p style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                    Documentos relacionados
                                </p>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#E84922' }}>
                                            <th style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', width: 38, textAlign: 'center' }}>#</th>
                                            <th style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', textAlign: 'left' }}>Nombre del documento</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {s.anexosDocs.map((a: any, i: number) => (
                                            <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                                <td style={{ border: '1px solid #e5e7eb', padding: 6, textAlign: 'center', fontWeight: 700, color: '#374151' }}>{i + 1}</td>
                                                <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>{a.nombre_documento || a.nombre || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                        <div className="p-6">
                            <p style={{ fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                                Archivos cargados por el solicitante
                            </p>
                            {Array.isArray(anexosSolicitante) && anexosSolicitante.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {anexosSolicitante.map((file: any, idx: number) => (
                                        <button
                                            key={idx}
                                            type="button"
                                            onClick={() => abrirDocumentoSolicitante(file)}
                                            className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:bg-[#E84922]/5 hover:border-[#E84922]/30 transition-all text-left"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                                                    <FileText size={15} className="text-[#E84922]" />
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-xs font-bold text-slate-700 truncate">{file.nombre || `Documento ${idx + 1}`}</p>
                                                    <p className="text-[10px] text-slate-400">{file.tamanio || 'Adjunto'} · Soporte</p>
                                                </div>
                                            </div>
                                            <ArrowUpRight size={14} className="text-slate-300 group-hover:text-[#E84922] shrink-0 ml-2" />
                                        </button>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 px-3 rounded-xl bg-slate-50/60 border border-dashed border-slate-200">
                                    <Paperclip size={20} className="mx-auto text-slate-300 mb-1.5" />
                                    <p className="text-[12px] text-slate-400 italic">El solicitante no adjuntó soportes</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── SECCIÓN VIII/VII — Riesgos y SST ── */}
                    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                        <SectionHeader title={`${esDirecta ? 'VIII' : 'VII'}. RIESGOS Y CRITERIOS AMBIENTALES O DE SST.`} />
                        <DataRow label={`${esDirecta ? '8.1' : '7.1'} Riesgos`} value={s.riesgos} />
                        <DataRow
                            label={`${esDirecta ? '8.2' : '7.2'} Criterios ambientales o de SST`}
                            value={s.criterios_ambientales_sst}
                            last
                        />
                    </div>

                    {/* Sección VIII — Conclusiones del Comité: no visible para Gerente */}

                    <TrazabilidadFlujo solicitud={s} />

                    <EstampaAprobacion
                        etapa="gerente"
                        solicitud={s}
                        usuarioActual={usuarioActual}
                    />

                    {/* PANEL DECISIÓN GERENCIAL */}
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

                </div>
            </div>
        </div>
    );
}
