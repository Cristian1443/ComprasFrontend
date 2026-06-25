import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  CheckCircle,
  FileText,
  Calendar,
  Loader2,
  Building2,
  ArrowLeft,
  ArrowUpRight,
  Paperclip,
  BadgeCheck,
  RotateCcw,
  Mail,
  Download
} from 'lucide-react';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { TrazabilidadFlujo } from '../shared/TrazabilidadFlujo';
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

    alert('Este soporte no tiene una ruta válida para abrirse.');
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
    const anexos = parseAnexosSolicitante(sol.anexos_solicitante);

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

            {/* Encabezado automático (estilo verde Financiera) */}
            <div className="bg-white rounded-lg shadow-lg border-2 overflow-hidden" style={{ borderColor: '#065F46' }}>
              <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg, #064E3B 0%, #065F46 100%)' }}>
                <h2 className="text-lg font-semibold text-white">Información Automática (Office 365)</h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[
                    { icon: <Building2 size={20} />, label: 'Gerencia', value: sol.gerencia_nombre || '—' },
                    { icon: <Mail size={20} />, label: 'Solicitante', value: sol.solicitante_nombre || '—' },
                    { icon: <Calendar size={20} />, label: 'Fecha de Solicitud', value: sol.creado_en ? new Date(sol.creado_en).toLocaleDateString('es-CO') : '—' },
                  ].map(({ icon, label, value }) => (
                    <div key={label}>
                      <div className="flex items-center gap-2 mb-2">
                        <span style={{ color: '#065F46' }}>{icon}</span>
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
                    <div style={pdfCell}>{sol.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Fecha de solicitud:</div>
                      <div style={pdfCell}>{autoTag(sol.creado_en ? new Date(sol.creado_en).toLocaleDateString('es-CO') : '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Fecha del Comité:</div>
                      <div style={pdfCell}>{sol.fecha_comite ? autoTag(new Date(`${sol.fecha_comite}T00:00:00`).toLocaleDateString('es-CO')) : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pendiente asignación</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Gerencia solicitante:</div>
                      <div style={pdfCell}>{autoTag(sol.gerencia_nombre || '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Supervisor del contrato:</div>
                      <div style={pdfCell}>{sol.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada solicitud de propuestas:</div>
                      <div style={pdfCell}>{sol.fecha_estimada_solicitud ? new Date(`${sol.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada recepción de propuestas:</div>
                      <div style={pdfCell}>{(sol as any).fecha_estimada_recepcion ? new Date(`${(sol as any).fecha_estimada_recepcion}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                    <div style={pdfCell}>{sol.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                  </div>
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.1 Justificación:</div>
                    <div style={pdfCell}>{sol.justificacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.2 Descripción de la necesidad:</div>
                    <div style={pdfCell}>{sol.descripcion_necesidad_detalle || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                </div>
              );
            })() : (() => {
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
                    <div style={pdfCell}>{sol.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Fecha de solicitud:</div>
                      <div style={pdfCell}>{autoTag(sol.creado_en ? new Date(sol.creado_en).toLocaleDateString('es-CO') : '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Modalidad de contratación:</div>
                      <div style={pdfCell}>{autoTag(String(sol.modalidad || '').charAt(0).toUpperCase() + String(sol.modalidad || '').slice(1))}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Gerencia solicitante:</div>
                      <div style={pdfCell}>{autoTag(sol.gerencia_nombre || '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Supervisor del contrato:</div>
                      <div style={pdfCell}>{sol.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                    </div>
                  </div>
                  {sol.fecha_estimada_solicitud && (
                    <div style={rowB}>
                      <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                        <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada en la que se requiere el contrato:</div>
                        <div style={pdfCell}>{new Date(`${sol.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO')}</div>
                      </div>
                      <div style={{ flex: 1 }} />
                    </div>
                  )}
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                    <div style={pdfCell}>{sol.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Descripción de la necesidad:</div>
                    <div style={pdfCell}>{sol.justificacion || sol.criterios_contratacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                </div>
              );
            })()}

            {/* ── SECCIÓN II — Plazo y Lugar ── */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title="II. DESCRIPCIÓN DEL PLAZO Y LUGAR DE EJECUCIÓN." />
              <DataRow label="2.1 Plazo de ejecución" value={plazoTexto} />
              <DataRow label="2.2 Lugar de ejecución" value={sol.lugar_ejecucion} last />
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
              {Array.isArray(sol.proponentes) && sol.proponentes.length > 0 ? (
                esDirecta ? (
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
                        {sol.proponentes.map((p: any, i: number) => {
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
                        {sol.proponentes.map((p: any, i: number) => {
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
              {!esDirecta && (
                <div style={{ borderTop: '2px solid #e5e7eb' }}>
                  <div style={{ backgroundColor: '#1a3a5c', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif' }}>
                    ANÁLISIS DEL MERCADO
                  </div>
                  <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>SERVICIOS OFERTADOS</span>
                    </div>
                    <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', color: '#1F2937', whiteSpace: 'pre-wrap', wordBreak: 'break-word', minHeight: 48 }}>
                      {sol.analisis_servicios_ofertados || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>VALOR PROMEDIO</span>
                      </div>
                      <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                        {sol.analisis_valor_promedio
                          ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(sol.analisis_valor_promedio)}</span>
                          : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PLAZO PROMEDIO</span>
                      </div>
                      <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                        {(() => {
                          const pm = sol.analisis_plazo_promedio_meses;
                          const pd = sol.analisis_plazo_promedio_dias;
                          const texto = [pm ? `${pm} meses` : '', pd ? `${pd} días` : ''].filter(Boolean).join(' y ');
                          return texto
                            ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{texto}</span>
                            : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div>
                    <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PRESUPUESTO OFICIAL</span>
                    </div>
                    <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                      {sol.analisis_presupuesto_oficial
                        ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(sol.analisis_presupuesto_oficial)}</span>
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
                <DataRow label="4.1 Modalidad de selección:" value={getCausalTexto(sol.modalidad_seleccion)} />
                <DataRow
                  label="Fecha del Comité"
                  value={sol.fecha_comite ? new Date(`${sol.fecha_comite}T00:00:00`).toLocaleDateString('es-CO') : ''}
                  hint="Asignado por el Comité de Contrataciones."
                  last
                />
              </div>
            )}

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

            {/* ── SECCIÓN VI/V — Supervisión y Entregables ── */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title={`${esDirecta ? 'VI' : 'V'}. SUPERVISIÓN Y ENTREGABLES DEL CONTRATO.`} />
              <DataRow label={`${esDirecta ? '6.1' : '5.1'} Posibilidad de Supervisión`} value={sol.supervision_nombre} />
              {!esDirecta && (() => {
                const obs: { descripcion: string }[] = (() => {
                  try { return Array.isArray(sol.obligaciones_especificas) ? sol.obligaciones_especificas : JSON.parse(sol.obligaciones_especificas || '[]'); } catch { return []; }
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
              {(() => {
                const ents: { descripcion: string; porcentaje: string; sinPorcentaje: boolean }[] = (() => {
                  try { return Array.isArray(sol.entregables_detalle) ? sol.entregables_detalle : JSON.parse(sol.entregables_detalle || '[]'); } catch { return []; }
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
              {Array.isArray(sol.anexosDocs) && sol.anexosDocs.length > 0 && (
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
                      {sol.anexosDocs.map((a: any, i: number) => (
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
                {anexos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {anexos.map((file: any, idx: number) => (
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
              <DataRow label={`${esDirecta ? '8.1' : '7.1'} Riesgos`} value={sol.riesgos} />
              <DataRow
                label={`${esDirecta ? '8.2' : '7.2'} Criterios ambientales o de SST`}
                value={sol.criterios_ambientales_sst}
                last
              />
            </div>

            {/* ── SECCIÓN VIII — Conclusiones del Comité (solo no directa, si aplica) ── */}
            {!esDirecta && mostrarConclusionesComite && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title="VIII. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES." />
                <DataRow label="8.1 Conclusiones del Comité" value={sol.conclusiones_comite} last />
              </div>
            )}

            <TrazabilidadFlujo solicitud={sol} />

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
                      {solicitud.objeto}
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
