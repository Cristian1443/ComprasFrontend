import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  FileText,
  Calendar,
  Loader2,
  Building2,
  ArrowLeft,
  BadgeCheck,
  RotateCcw,
  Download
} from 'lucide-react';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';
import { InstanciasAprobacion } from '../shared/InstanciasAprobacion';
import { EstampaAprobacion } from '../shared/EstampaAprobacion';
import { getPresupuestoCertificadoDisplay, parseValorMoneda } from '../../lib/formatPresupuesto';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface SolicitudPresupuestal {
  id: string;
  codigo: string;
  version?: string;
  titulo_contrato?: string;
  objeto: string;
  rubro?: string;
  presupuesto_aprobado?: number;
  solicitante_nombre: string;
  solicitante_cargo?: string;
  creado_en: string;
  modalidad: string;
  modalidad_seleccion?: string;
  justificacion_cd?: string;
  valor_estimado: string | number;
  moneda?: string;
  valor_en_cop?: number;
  valor_moneda_cop_texto?: string;
  valor_moneda_usd_texto?: string;
  valor_moneda_eur_texto?: string;
  gerencia_nombre: string;
  justificacion?: string;
  descripcion_necesidad_detalle?: string;
  lugar_ejecucion?: string;
  plazo_ejecucion_meses?: number;
  plazo_ejecucion_dias?: number;
  rubro_presupuestal?: string;
  efecto_estimar_presupuesto?: string;
  forma_pago?: string;
  fecha_comite?: string;
  supervision_nombre?: string;
  entregables?: string;
  fecha_estimada_solicitud?: string;
  criterios_contratacion?: string;
  riesgos?: string;
  criterios_ambientales_sst?: string;
  conclusiones_comite?: string;
  resultado_comite?: string | null;
  fecha_comite_decision?: string | null;
  presupuestoDisponible?: string;
  anexos_solicitante?: any[];
  anexosDocs?: any[];
  proponentes?: any[];
  estado: string;
}

interface Rubro {
  id: string;
  nombre: string;
  codigo: string;
  gerencia_nombre?: string;
}

interface AprobacionPresupuestalProps {
  financieraId?: string;
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

const fmtCOP = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const cleaned = String(v).replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return String(v);
  return `$${num.toLocaleString('es-CO')}`;
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)',
      color: '#fff', fontWeight: 700,
      fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif'
    }}>
      {title}
    </div>
  );
}

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

export function AprobacionPresupuestal({ financieraId, onActionSuccess }: AprobacionPresupuestalProps) {
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

  const [solicitudes, setSolicitudes] = useState<SolicitudPresupuestal[]>([]);
  const [rubros, setRubros] = useState<Rubro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<SolicitudPresupuestal | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [rubro, setRubro] = useState('');
  const [presupuestoAprobado, setPresupuestoAprobado] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [solicitudParaPDF, setSolicitudParaPDF] = useState<any | null>(null);
  const [presupuestoGerencia, setPresupuestoGerencia] = useState<{
    monto_total: number; comprometido: number; disponible: number;
  } | null>(null);

  const abrirPDF = async (sol: any) => {
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${sol.id}`);
      if (res.ok) {
        const data = await res.json();
        setSolicitudParaPDF(data);
      } else {
        setSolicitudParaPDF(sol);
      }
    } catch {
      setSolicitudParaPDF(sol);
    }
  };

  const fetchSolicitudes = async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/solicitudes?estado=en_financiera`);
      if (res.ok) {
        const data = await res.json();
        setSolicitudes(data);
      }
    } catch (err) {
      console.error('Error al cargar solicitudes financieras:', err);
    } finally {
      setCargando(false);
    }
  };

  const fetchRubros = async () => {
    try {
      const res = await fetch(`${API_URL}/api/rubros`);
      if (res.ok) {
        const data = await res.json();
        setRubros(data);
      }
    } catch (err) {
      console.error('Error al cargar rubros:', err);
    }
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchRubros();
  }, []);

  useEffect(() => {
    if (!rubro) { setPresupuestoGerencia(null); return; }
    const year = new Date().getFullYear();
    fetch(`${API_URL}/api/financiera/presupuesto-vigencia?vigencia=${year}`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: any[]) => {
        const found = Array.isArray(data) ? data.find((p: any) => p.gerencia_nombre === rubro) : null;
        setPresupuestoGerencia(found ?? null);
      })
      .catch(() => setPresupuestoGerencia(null));
  }, [rubro]);

  const handleAprobar = async (solicitud: SolicitudPresupuestal) => {
    let detalleCompleto: SolicitudPresupuestal = solicitud;
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}`);
      if (res.ok) {
        const det = await res.json();
        detalleCompleto = { ...solicitud, ...det };
        setSolicitudSeleccionada(detalleCompleto);
      } else {
        setSolicitudSeleccionada(solicitud);
      }
    } catch {
      setSolicitudSeleccionada(solicitud);
    }
    // Pre-carga el valor certificado si ya existe, si no usa el valor original del solicitante
    const aprobadoNum = Number(detalleCompleto.presupuesto_aprobado);
    const valorPrecargado = detalleCompleto.presupuesto_aprobado && !isNaN(aprobadoNum) && aprobadoNum > 0
      ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(aprobadoNum)
      : getValorOriginal(detalleCompleto) || String(detalleCompleto.valor_estimado || '');
    setPresupuestoAprobado(valorPrecargado);
    setObservaciones('');
    setRubro(detalleCompleto.rubro || '');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cerrarDetalle = () => {
    setSolicitudSeleccionada(null);
    setObservaciones('');
    setRubro('');
    setPresupuestoAprobado('');
  };

  const confirmarAprobacion = async () => {
    if (!solicitudSeleccionada || !rubro || !presupuestoAprobado) {
      alert('Por favor complete el Rubro y el Presupuesto Aprobado');
      return;
    }

    setProcesando(true);
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${solicitudSeleccionada.id}/aprobar-financiera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprobar: true,
          comentario: observaciones,
          rubro: rubro,
          presupuesto_aprobado: parseValorMoneda(presupuestoAprobado),
          financiera_id: financieraId || null
        })
      });

      if (res.ok) {
        alert('Solicitud aprobada y rubro asignado exitosamente.');
        cerrarDetalle();
        fetchSolicitudes();
        if (onActionSuccess) onActionSuccess();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error al aprobar');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al procesar la aprobación');
    } finally {
      setProcesando(false);
    }
  };

  const confirmarRechazoActual = async () => {
    if (!solicitudSeleccionada) return;
    if (!observaciones.trim()) {
      alert('Indique el motivo de devolución en las observaciones.');
      return;
    }
    setProcesando(true);
    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${solicitudSeleccionada.id}/aprobar-financiera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprobar: false,
          comentario: observaciones,
          financiera_id: financieraId || null
        })
      });

      if (res.ok) {
        alert('Solicitud devuelta para corrección.');
        cerrarDetalle();
        fetchSolicitudes();
        if (onActionSuccess) onActionSuccess();
      } else {
        const error = await res.json();
        throw new Error(error.error || 'Error al devolver');
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : 'Error al procesar la devolución');
    } finally {
      setProcesando(false);
    }
  };

  const handleRechazar = async (solic: SolicitudPresupuestal) => {
    const feedback = prompt('Ingrese el motivo del rechazo financiero:');
    if (!feedback) return;

    try {
      const res = await fetch(`${API_URL}/api/solicitudes/${solic.id}/aprobar-financiera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aprobar: false,
          comentario: feedback,
          financiera_id: financieraId || null
        })
      });

      if (res.ok) {
        alert('Solicitud rechazada');
        fetchSolicitudes();
        if (onActionSuccess) onActionSuccess();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (cargando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full gap-4" style={{ backgroundColor: 'var(--ui-bg)' }}>
        <Loader2 className="w-12 h-12 text-emerald-700 animate-spin" />
        <p className="text-slate-500 font-bold font-gabarito">Consultando carga pendiente...</p>
      </div>
    );
  }

  const formatter = new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0
  });

  const getValorOriginal = (s: SolicitudPresupuestal): string => {
    const m = String(s.moneda || 'COP').toUpperCase();
    if (m === 'USD') return s.valor_moneda_usd_texto || '';
    if (m === 'EUR') return s.valor_moneda_eur_texto || '';
    if (m === 'COP') return s.valor_moneda_cop_texto || '';
    return '';
  };

  /* ════════════ Vista de DETALLE FULL-WIDTH (cuando hay solicitud seleccionada) ════════════ */
  if (solicitudSeleccionada) {
    const sol = solicitudSeleccionada;
    const monedaSol = String(sol.moneda || 'COP').toUpperCase();
    const presupuestoTexto = getValorOriginal(sol)
      ? `${monedaSol} ${getValorOriginal(sol)}`
      : formatter.format(Number(sol.valor_estimado || 0));
    const plazoTexto = `${sol.plazo_ejecucion_meses || 0} meses${(sol.plazo_ejecucion_dias || 0) > 0 ? ` y ${sol.plazo_ejecucion_dias} días` : ''}`;
    const esDirecta = String(sol.modalidad || '').toLowerCase() === 'directa';
    const estadosPostComite = new Set([
      'aprobado_comite', 'rechazado_comite', 'en_juridica', 'enviado_juridica',
      'aprobado_juridica', 'rechazado_juridica', 'finalizado'
    ]);
    const mostrarConclusionesComite = !!(
      sol.conclusiones_comite &&
      (sol.resultado_comite || sol.fecha_comite_decision || estadosPostComite.has(String(sol.estado || '')))
    );

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
                onClick={cerrarDetalle}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft size={20} /> Volver a la bandeja
              </button>
              <button
                type="button"
                onClick={() => abrirPDF(solicitudSeleccionada)}
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
              <span className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm font-semibold border border-emerald-300">
                Revisión Financiera
              </span>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-300">
                Pendiente aprobación
              </span>
            </div>
            <p className="text-gray-600">{sol.codigo} - v{sol.version || '1'}</p>
          </div>

          <div className="space-y-6">

            {/* ══════════════════════════════════════════════════════════════════ */}
            {/* Mismo orden que el formulario contractual del Solicitante         */}
            {/* ══════════════════════════════════════════════════════════════════ */}

            {/* ── Documento unificado de Planeación Contractual ── */}
            {/* (misma estructura, encabezados y numeración que usan Solicitante, */}
            {/* Gerente, Jurídica y Secretaría — vía DetallePlaneacionContractual) */}
            <DetallePlaneacionContractualParte1 solicitud={sol} />

            <SeccionPresupuestoLectura
              solicitud={sol}
              esDirecta={esDirecta}
              rubroFinanciera={sol.rubro}
              presupuestoAprobado={sol.presupuesto_aprobado ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 12px', borderRadius: 8,
                  backgroundColor: '#ECFDF5', color: '#065F46',
                  fontWeight: 800, fontSize: '0.95rem', border: '1px solid #A7F3D0',
                }}>
                  {getPresupuestoCertificadoDisplay(sol)}
                </span>
              ) : undefined}
            />

            <DetallePlaneacionContractualParte2 solicitud={sol} />

            {/* ── SECCIÓN VIII — Conclusiones del Comité (solo no directa, si aplica) ── */}
            {!esDirecta && mostrarConclusionesComite && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title="VIII. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES." />
                <DataRow label="8.1 Conclusiones del Comité" value={sol.conclusiones_comite} last />
              </div>
            )}

            <InstanciasAprobacion solicitud={sol} />

            <EstampaAprobacion
              etapa="financiera"
              solicitud={sol}
            />

            {/* PANEL DE DECISIÓN FINANCIERA */}
            <div className="rounded-2xl text-white overflow-hidden shadow-lg" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' }}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
                <div className="p-6 lg:p-8 lg:border-r border-white/10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                      <BadgeCheck size={20} className="text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-emerald-200/80">Decisión Financiera</p>
                      <h3 className="text-xl font-black leading-none mt-1">Aprobar o Devolver</h3>
                    </div>
                  </div>
                  <p className="text-[12px] text-emerald-100/80 leading-relaxed mt-3 mb-5">
                    Asigna el rubro presupuestal y el valor certificado. La aprobación enviará la solicitud al Comité.
                  </p>
                  <div className="space-y-2.5 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-emerald-200/70 font-bold uppercase tracking-wider">Solicitante</span>
                      <span className="text-[11px] text-white font-bold text-right truncate">{sol.solicitante_nombre}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-emerald-200/70 font-bold uppercase tracking-wider">Gerencia</span>
                      <span className="text-[11px] text-white font-bold text-right truncate">{sol.gerencia_nombre}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-[10px] text-emerald-200/70 font-bold uppercase tracking-wider">Valor estimado</span>
                      <span className="text-[11px] font-black text-emerald-300">{presupuestoTexto}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 lg:p-8 lg:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-[0.12em] block mb-2">
                        Gerencia / Rubro Presupuestal
                      </label>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60" size={16} />
                        <select
                          value={rubro}
                          onChange={(e) => setRubro(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-emerald-900/40 border border-emerald-700/60 rounded-xl text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all appearance-none cursor-pointer"
                        >
                          <option value="" className="text-slate-700">Seleccione gerencia...</option>
                          {[
                            'Gerencia Administrativa y Financiera',
                            'Gerencia de Mercadeo y Comunicaciones',
                            'Gerencia de Promocion e Inversion',
                            'Gerencia de Apoyo Estrategico',
                            'Gerencia Bureau de Convenciones'
                          ].map(gerencia => (
                            <option key={gerencia} value={gerencia} className="text-slate-700">
                              {gerencia}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* Semáforo de disponibilidad presupuestal */}
                      {rubro && (
                        <div className={`mt-2 px-3 py-2 rounded-xl border text-xs transition-all ${
                          !presupuestoGerencia
                            ? 'border-white/10 bg-white/5 text-emerald-200/50'
                            : presupuestoGerencia.disponible <= 0
                            ? 'border-red-400/40 bg-red-900/25 text-red-300'
                            : presupuestoGerencia.disponible / presupuestoGerencia.monto_total < 0.1
                            ? 'border-amber-400/40 bg-amber-900/25 text-amber-300'
                            : 'border-emerald-400/40 bg-emerald-900/25 text-emerald-300'
                        }`}>
                          {!presupuestoGerencia ? (
                            <p className="italic">Sin presupuesto cargado para esta vigencia.</p>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold">Disponible {new Date().getFullYear()}:</span>
                                <span className="font-black font-mono">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.max(presupuestoGerencia.disponible, 0))}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-2 mt-0.5 opacity-70">
                                <span>Comprometido:</span>
                                <span className="font-mono">
                                  {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(presupuestoGerencia.comprometido)}
                                </span>
                              </div>
                              {presupuestoGerencia.disponible <= 0 && (
                                <p className="font-bold mt-1 text-[10px]">⛔ Sin disponibilidad presupuestal.</p>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-[0.12em] block mb-2">
                        Valor certificado
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-300/60" size={16} />
                        <input
                          type="text"
                          value={presupuestoAprobado}
                          onChange={(e) => setPresupuestoAprobado(e.target.value)}
                          className="w-full pl-10 pr-3 py-2.5 bg-emerald-900/40 border border-emerald-700/60 rounded-xl text-sm font-black text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all font-mono"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-emerald-200/80 uppercase tracking-[0.12em] block mb-2">
                      Observaciones presupuestales
                    </label>
                    <textarea
                      value={observaciones}
                      onChange={(e) => setObservaciones(e.target.value)}
                      rows={3}
                      className="w-full bg-emerald-900/40 border border-emerald-700/60 rounded-xl p-3 text-sm text-white placeholder:text-emerald-200/40 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-all resize-none"
                      placeholder="Notas para el acta de disponibilidad o motivo de devolución..."
                    />
                    <p className="text-[10px] text-emerald-200/60 mt-1.5 italic">
                      Obligatorio si vas a devolver la solicitud.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      onClick={confirmarRechazoActual}
                      disabled={procesando}
                      className="w-full bg-slate-800/60 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all border border-slate-600/50"
                    >
                      <RotateCcw size={16} /> Devolver para Corrección
                    </button>
                    <button
                      onClick={confirmarAprobacion}
                      disabled={procesando}
                      className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 disabled:cursor-not-allowed text-emerald-950 py-3 rounded-xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
                    >
                      {procesando ? <Loader2 className="animate-spin" size={16} /> : <><CheckCircle size={16} /> Aprobar y Enviar</>}
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

  /* ════════════ Vista de BANDEJA (lista de solicitudes pendientes) ════════════ */
  return (
    <div className="ux-page p-8 space-y-8 animate-in fade-in duration-700 min-h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <DollarSign className="text-emerald-700" size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Carga Presupuestal
            </h1>
          </div>
          <p className="text-slate-500 font-medium italic mt-2">
            Asigne rubros y certifique la disponibilidad presupuestal.
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Pendientes</p>
            <p className="text-sm font-black text-emerald-700">{solicitudes.length} Casos</p>
          </div>
          <div className="h-8 w-[1px] bg-slate-100"></div>
          <Calendar className="text-slate-400" size={20} />
        </div>
      </div>

      {/* Grid de tarjetas */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {solicitudes.length === 0 ? (
          <div className="col-span-full bg-white p-20 rounded-[3rem] text-center border-2 border-dashed border-slate-200">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="text-slate-200" size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-900 mb-2 font-gabarito">Bandeja Vacía</h3>
            <p className="text-slate-400 font-medium italic">No hay registros pendientes de asignación presupuestal en este momento.</p>
          </div>
        ) : (
          solicitudes.map((solicitud) => (
            <div key={solicitud.id} className="group bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm hover:shadow-xl hover:translate-y-[-4px] transition-all duration-500 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 opacity-40 rounded-bl-[5rem] -mr-8 -mt-8 group-hover:bg-emerald-100 transition-colors"></div>

              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                    <span className="text-[11px] font-black text-emerald-600 font-mono tracking-tighter bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                      {solicitud.codigo}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 leading-tight mt-3 line-clamp-2" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                      {solicitud.titulo_contrato || solicitud.objeto}
                    </h3>
                  </div>
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-sm">
                    <FileText size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6 mb-8 pt-4 border-t border-slate-50">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solicitante</p>
                    <p className="text-sm font-bold text-slate-700 truncate">{solicitud.solicitante_nombre}</p>
                    <p className="text-[10px] text-slate-400 font-medium truncate">{solicitud.gerencia_nombre}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Estimada</p>
                    <p className="text-lg font-black text-emerald-600 tracking-tighter" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                      {getValorOriginal(solicitud)
                        ? `${solicitud.moneda || 'COP'} ${getValorOriginal(solicitud)}`
                        : formatter.format(Number(solicitud.valor_estimado))}
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => handleRechazar(solicitud)}
                    className="flex-1 px-4 py-3 rounded-2xl border-2 border-rose-100 text-rose-500 font-black text-xs uppercase tracking-widest hover:bg-rose-50 transition-all"
                  >
                    Devolver
                  </button>
                  <button
                    onClick={() => handleAprobar(solicitud)}
                    className="flex-[2] text-white px-4 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#E84922' }}
                  >
                    <CheckCircle size={16} />
                    Ver y Asignar Rubro
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
