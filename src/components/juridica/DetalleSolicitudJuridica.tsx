import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, FileText, Calendar, Building2, Mail,
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  Scale, ArrowUpRight, Paperclip, Download,
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { createExpedienteSharePoint } from '../../services/sharepointService';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { TrazabilidadFlujo } from '../shared/TrazabilidadFlujo';
import { EstampaAprobacion } from '../shared/EstampaAprobacion';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { PasosFlujoJuridica } from './PasosFlujoJuridica';
import {
  construirEstadoFlujo,
  flujoCompleto,
  mensajeFlujoIncompleto,
  pasoAccesible,
  requiereFlujoSecuencial,
} from '../../lib/flujoJuridico';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

/* ─── Estilos del formulario (idénticos a Financiera / Supervisor) ─── */
const rowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #e5e7eb', alignItems: 'stretch',
};
const labelCellStyle: React.CSSProperties = {
  width: 220, minWidth: 180, flexShrink: 0, padding: '16px',
  fontWeight: 600, fontSize: '0.8rem', color: '#1F2937',
  borderRight: '1px solid #e5e7eb', backgroundColor: '#fafafa',
  fontFamily: 'Gabarito, sans-serif', display: 'flex', alignItems: 'flex-start', paddingTop: 18,
};
const valueCellStyle: React.CSSProperties = {
  flex: 1, padding: '16px',
  fontFamily: 'Gabarito, sans-serif',
  fontSize: '0.875rem', color: '#1F2937', backgroundColor: '#fff',
  minHeight: 52, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

const fmtCOP = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const cleaned = String(v).replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return String(v);
  return `$${num.toLocaleString('es-CO')}`;
};

/* ─── SectionHeader color jurídica (azul oscuro) ─── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2f6fa3 100%)',
      color: '#fff', fontWeight: 700,
      fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif',
    }}>
      {title}
    </div>
  );
}

/* ─── DataRow: celda label gris + celda valor blanca ─── */
function DataRow({ label, value, hint, last = false }: {
  label: string; value: React.ReactNode; hint?: string; last?: boolean;
}) {
  const showEmpty = value === null || value === undefined ||
    (typeof value === 'string' && !String(value).trim());
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

/* ─── ActionButton ─── */
function ActionButton({
  onClick, disabled, spinning, icon: Icon, children, color = '#E84922', title: tooltip,
}: {
  onClick?: () => void; disabled?: boolean; spinning?: boolean;
  icon: any; children: React.ReactNode; color?: string; title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={tooltip}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-white text-sm font-bold transition-all ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95 cursor-pointer'
      }`}
      style={{ backgroundColor: disabled ? '#94a3b8' : color, fontFamily: 'Gabarito, sans-serif' }}
    >
      {spinning
        ? <Loader2 size={15} className="flex-shrink-0 animate-spin" />
        : <Icon size={15} className="flex-shrink-0" />
      }
      <span className="text-left leading-tight">{children}</span>
    </button>
  );
}

/* ─── Causales Directa ─── */
const CAUSALES_DIRECTA: Record<string, string> = {
  i: 'I. Cuando no existen otros proveedores para el suministro del bien y/o servicio por ser titular de derechos de propiedad intelectual o por ser proveedor exclusivo en el territorio nacional.',
  ii: 'II. Cuando por razones técnicas sólo se pueda contratar con un proveedor.',
  iii_a: 'III. Cuando se declare desierta la convocatoria por dos (2) veces consecutivas, por falta de proponentes.',
  iv: 'IV. Cuando el suministro, por su especialidad, sólo puede ser ejecutado por una determinada persona (Intuito Personae).',
  v: 'V. Cuando se deba asegurar disponibilidad continua en servicios de alojamiento o transporte.',
  vi: 'VI. Servicios bajo modalidad de suscripción, afiliación o inscripción a publicaciones físicas o digitales.',
  vii: 'VII. Contratos de arrendamiento de bienes inmuebles.',
  viii: 'VIII. Contratación de productos financieros y seguros.',
  ix: 'IX. Contratación de bienes y servicios relacionados con capacitaciones y SG-SST.',
  x: 'X. Cuando sea requerido por urgencia manifiesta.',
};
const getCausal = (codigo: any) =>
  CAUSALES_DIRECTA[String(codigo || '').toLowerCase()] || String(codigo || '');

/* ══════════════════════════ COMPONENTE PRINCIPAL ══════════════════════════ */
interface DetalleSolicitudJuridicaProps {
  solicitudId: string;
  onBack: () => void;
  onOpenCalificacion?: (id: string) => void;
  onOpenDocumentos?: (id: string) => void;
  onOpenConvocatorias?: (id: string) => void;
  onOpenActa?: (id: string) => void;
}

export function DetalleSolicitudJuridica({
  solicitudId, onBack, onOpenCalificacion, onOpenDocumentos, onOpenConvocatorias, onOpenActa,
}: DetalleSolicitudJuridicaProps) {
  const { accounts, instance } = useMsal();

  const [solicitud, setSolicitud] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [registrando, setRegistrando] = useState<'aprobado' | 'rechazado' | null>(null);
  const [resultadoJuridica, setResultadoJuridica] = useState<'aprobado' | 'rechazado' | null>(null);
  const [mensaje, setMensaje] = useState('');
  const [estadoExpediente, setEstadoExpediente] = useState({
    evaluacion: {} as Record<string, any>,
    documentos: [] as Array<{ tipo?: string }>,
    totalInvitaciones: 0,
    invitacionesEnviadas: false,
  });
  const [procesandoRevision, setProcesandoRevision] = useState(false);
  const [mostrarFormato, setMostrarFormato] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setCargando(true);
      try {
        const res = await fetch(`${API_URL}/api/solicitudes/${solicitudId}`);
        const data = await res.json();
        if (mounted) {
          setSolicitud(data);
          if (requiereFlujoSecuencial(data?.modalidad)) {
            try {
              const [rCal, rDoc, rFirma] = await Promise.all([
                fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/calificacion`),
                fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/documentos`),
                fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/acta-firma-estado`),
              ]);
              const dCal = await rCal.json();
              const dDoc = await rDoc.json();
              const dFirma = await rFirma.json().catch(() => ({}));
              // Si el acta está firmada, sobreescribir acta_generada para desbloquear paso 5
              const evaluacion = dCal?.evaluacion || {};
              if (dFirma?.estado === 'firmado' && !evaluacion.acta_generada) {
                evaluacion.acta_generada = true;
              }
              setEstadoExpediente({
                evaluacion,
                documentos: Array.isArray(dDoc?.documentos) ? dDoc.documentos : [],
                totalInvitaciones: Number(dCal?.total_invitaciones || data?.total_invitaciones || 0),
                invitacionesEnviadas: dCal?.invitaciones_enviadas === true,
              });
            } catch {
              setEstadoExpediente({
                evaluacion: {},
                documentos: [],
                totalInvitaciones: data?.total_invitaciones || 0,
                invitacionesEnviadas: false,
              });
            }
          }
          if (data.resultado_juridica) {
            setResultadoJuridica(data.resultado_juridica);
            setMensaje(
              data.resultado_juridica === 'aprobado'
                ? 'Solicitud Aprobada por Jurídica.'
                : 'Solicitud Rechazada por Jurídica.'
            );
          }
        }
      } catch (err) {
        console.error('Error cargando detalle jurídica:', err);
      } finally {
        if (mounted) setCargando(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [solicitudId]);

  const formatterCOP = useMemo(() => new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', maximumFractionDigits: 0,
  }), []);

  const estadoFlujo = useMemo(
    () => construirEstadoFlujo({
      evaluacion: estadoExpediente.evaluacion,
      documentos: estadoExpediente.documentos,
      totalInvitaciones: estadoExpediente.totalInvitaciones,
      invitacionesEnviadas: estadoExpediente.invitacionesEnviadas,
    }),
    [estadoExpediente]
  );

  const esFlujoSecuencial = requiereFlujoSecuencial(solicitud?.modalidad);
  const checklistCompleto = !esFlujoSecuencial || flujoCompleto(estadoFlujo);

  const handleConfirmarRevision = async () => {
    if (!solicitud?.id) return;
    setProcesandoRevision(true);
    setMensaje('');
    try {
      const resp = await fetch(`${API_URL}/api/juridica/solicitudes/${solicitud.id}/flujo/revision-inicial`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_email: accounts[0]?.username }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'No se pudo registrar la revisión');
      setEstadoExpediente((prev) => ({
        ...prev,
        evaluacion: {
          ...prev.evaluacion,
          flujo: data.flujo || { revision_inicial_completada: true },
        },
      }));
      setMensaje('Revisión inicial registrada. Puede continuar con la invitación.');
    } catch (e: any) {
      setMensaje(e.message || 'Error al confirmar la revisión inicial.');
    } finally {
      setProcesandoRevision(false);
    }
  };

  const abrirPaso = (paso: 'invitacion' | 'calificacion' | 'adjudicacion' | 'documentos_finales') => {
    if (!pasoAccesible(paso, estadoFlujo)) {
      setMensaje(mensajeFlujoIncompleto(estadoFlujo));
      return;
    }
    if (paso === 'invitacion') onOpenConvocatorias?.(solicitud.id);
    if (paso === 'calificacion') onOpenCalificacion?.(solicitud.id);
    if (paso === 'adjudicacion') onOpenActa?.(solicitud.id);
    if (paso === 'documentos_finales') onOpenDocumentos?.(solicitud.id);
  };

  const handleDecision = async (decision: 'aprobado' | 'rechazado') => {
    if (decision === 'aprobado' && esFlujoSecuencial && !checklistCompleto) {
      setMensaje(mensajeFlujoIncompleto(estadoFlujo));
      return;
    }
    setRegistrando(decision);
    try {
      const resp = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/juridica`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado: decision, usuario_email: accounts[0]?.username }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Error en API');
      }
      const data = await resp.json();
      setSolicitud((prev: any) =>
        prev ? { ...prev, resultado_juridica: decision, estado: data.estado || prev.estado, fecha_respuesta_juridica: new Date().toISOString() } : prev
      );
      setResultadoJuridica(decision);

      if (decision === 'aprobado') {
        setMensaje('Creando repositorio en SharePoint...');
        try {
          const tokenResp = await instance.acquireTokenSilent({ ...loginRequest, account: accounts[0] });
          const folderName = solicitud.codigo || String(solicitud.id);
          await createExpedienteSharePoint(tokenResp.accessToken, folderName);
          setMensaje('Solicitud Aprobada por Jurídica exitosamente. Repositorio creado en SharePoint.');
        } catch (spError: any) {
          console.error('SharePoint:', spError);
          setMensaje('Solicitud Aprobada por Jurídica exitosamente. (No se pudo crear el repositorio en SharePoint)');
        }
      } else {
        setMensaje('Solicitud Rechazada por Jurídica.');
      }
    } catch (e: any) {
      console.error(e);
      setMensaje(e?.message || 'No se pudo registrar la decisión. Intenta nuevamente.');
    } finally {
      setRegistrando(null);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={36} className="animate-spin" style={{ color: '#2f6fa3' }} />
          <p className="text-slate-500 font-semibold text-sm">{mensaje || 'Cargando revisión legal...'}</p>
        </div>
      </div>
    );
  }

  if (!solicitud || solicitud.error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <AlertTriangle size={36} className="text-red-400" />
          <p className="text-slate-600 font-semibold">Error al cargar la solicitud</p>
          <button onClick={onBack} className="px-4 py-2 text-white rounded-lg font-bold text-sm" style={{ backgroundColor: '#2f6fa3' }}>
            Volver
          </button>
        </div>
      </div>
    );
  }

  const esDirecta = (solicitud.modalidad || '').toLowerCase() === 'directa';
  const montoCOP = Number(solicitud.presupuesto_aprobado || solicitud.valor_en_cop || solicitud.valor_estimado || 0);
  const monedaSol = String(solicitud.moneda || 'COP').toUpperCase();
  const valorOriginalMoneda =
    monedaSol === 'USD' ? solicitud.valor_moneda_usd_texto :
    monedaSol === 'EUR' ? solicitud.valor_moneda_eur_texto :
    solicitud.valor_moneda_cop_texto;
  const presupuestoTexto = valorOriginalMoneda
    ? `${monedaSol} ${valorOriginalMoneda}`
    : formatterCOP.format(montoCOP);
  const plazoTexto = `${solicitud.plazo_ejecucion_meses || 0} meses${(solicitud.plazo_ejecucion_dias || 0) > 0 ? ` y ${solicitud.plazo_ejecucion_dias} días` : ''}`;

  const anexosSolicitante: any[] = (() => {
    const v = solicitud.anexos_solicitante;
    if (Array.isArray(v)) return v;
    if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
    return [];
  })();

  const abrirAnexo = (file: any) => {
    const candidates = [file?.url, file?.path, file?.ruta,
      file?.nombre_almacenado ? `${API_URL}/api/uploads/solicitudes/${file.nombre_almacenado}` : null,
      file?.nombre ? `${API_URL}/api/uploads/solicitudes/${encodeURIComponent(file.nombre)}` : null,
    ].filter(Boolean) as string[];
    if (candidates.length) window.open(candidates[0], '_blank', 'noopener,noreferrer');
    else alert('No se encontró el archivo.');
  };

  const estadosPostComite = new Set(['aprobado_comite', 'rechazado_comite', 'en_juridica', 'enviado_juridica', 'aprobado_juridica', 'rechazado_juridica', 'finalizado']);
  const mostrarConclusionesComite = !!(
    solicitud.conclusiones_comite &&
    (solicitud.resultado_comite || solicitud.fecha_comite_decision || estadosPostComite.has(String(solicitud.estado || '')))
  );

  return (
    <div className="ux-page p-4 lg:p-8" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      {mostrarFormato && solicitud && (
        <FormatoPlaneacionImprimible
          solicitud={solicitud}
          onClose={() => setMostrarFormato(false)}
        />
      )}
      <div className="flex gap-6 items-start">

        {/* ══ CONTENIDO PRINCIPAL (izquierda) ══ */}
        <div className="flex-1 min-w-0">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
                style={{ fontFamily: 'Gabarito, sans-serif' }}
              >
                <ArrowLeft size={20} /> Volver a bandeja
              </button>
              <button
                type="button"
                onClick={() => setMostrarFormato(true)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm transition-colors"
                style={{ backgroundColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}
              >
                <Download size={16} /> Descargar PDF
              </button>
            </div>
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Formato de Planeación Contractual
              </h1>
              <span className="px-3 py-1 rounded-full text-sm font-semibold border" style={{ backgroundColor: '#EFF6FF', color: '#1e3a5f', borderColor: '#BFDBFE' }}>
                Revisión Jurídica
              </span>
              {resultadoJuridica && (
                <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${
                  resultadoJuridica === 'aprobado'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-red-100 text-red-800 border-red-300'
                }`}>
                  {resultadoJuridica === 'aprobado' ? 'Aprobada' : 'Rechazada'}
                </span>
              )}
            </div>
            <p className="text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {solicitud.codigo} · {(solicitud.modalidad || '').toUpperCase()}
            </p>
          </div>

          {/* Encabezado Automático */}
          <div className="bg-white rounded-lg shadow-lg border-2 overflow-hidden mb-6" style={{ borderColor: '#2f6fa3' }}>
            <div className="p-4 border-b" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2f6fa3 100%)' }}>
              <h2 className="text-lg font-semibold text-white" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Información Automática (Office 365)
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { icon: <Building2 size={20} />, label: 'Gerencia', value: solicitud.gerencia_nombre || '—' },
                  { icon: <Mail size={20} />, label: 'Solicitante', value: solicitud.solicitante_nombre || '—' },
                  { icon: <Calendar size={20} />, label: 'Fecha de Solicitud', value: solicitud.creado_en ? new Date(solicitud.creado_en).toLocaleDateString('es-CO') : '—' },
                ].map(({ icon, label, value }) => (
                  <div key={label}>
                    <div className="flex items-center gap-2 mb-2">
                      <span style={{ color: '#2f6fa3' }}>{icon}</span>
                      <label className="block text-sm font-semibold text-gray-700" style={{ fontFamily: 'Gabarito, sans-serif' }}>{label}</label>
                    </div>
                    <div className="px-4 py-3 bg-gray-100 border border-gray-300 rounded-lg">
                      <p className="text-gray-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">

            {/* I. Sección — condicional por modalidad */}
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
                    <div style={pdfCell}>{solicitud.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Fecha de solicitud:</div>
                      <div style={pdfCell}>{autoTag(solicitud.creado_en ? new Date(solicitud.creado_en).toLocaleDateString('es-CO') : '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Fecha del Comité:</div>
                      <div style={pdfCell}>{solicitud.fecha_comite ? autoTag(new Date(`${solicitud.fecha_comite}T00:00:00`).toLocaleDateString('es-CO')) : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Pendiente asignación</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Gerencia solicitante:</div>
                      <div style={pdfCell}>{autoTag(solicitud.gerencia_nombre || '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Supervisor del contrato:</div>
                      <div style={pdfCell}>{solicitud.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada solicitud de propuestas:</div>
                      <div style={pdfCell}>{solicitud.fecha_estimada_solicitud ? new Date(`${solicitud.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada recepción de propuestas:</div>
                      <div style={pdfCell}>{(solicitud as any).fecha_estimada_recepcion ? new Date(`${(solicitud as any).fecha_estimada_recepcion}T00:00:00`).toLocaleDateString('es-CO') : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                    <div style={pdfCell}>{solicitud.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                  </div>
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.1 Justificación:</div>
                    <div style={pdfCell}>{solicitud.justificacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.2 Descripción de la necesidad:</div>
                    <div style={pdfCell}>{solicitud.descripcion_necesidad_detalle || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
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
                    <div style={pdfCell}>{solicitud.titulo_contrato || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Fecha de solicitud:</div>
                      <div style={pdfCell}>{autoTag(solicitud.creado_en ? new Date(solicitud.creado_en).toLocaleDateString('es-CO') : '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Modalidad de contratación:</div>
                      <div style={pdfCell}>{autoTag(String(solicitud.modalidad || '').charAt(0).toUpperCase() + String(solicitud.modalidad || '').slice(1))}</div>
                    </div>
                  </div>
                  <div style={rowB}>
                    <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                      <div style={pdfLabel}>Gerencia solicitante:</div>
                      <div style={pdfCell}>{autoTag(solicitud.gerencia_nombre || '')}</div>
                    </div>
                    <div style={{ flex: 1, display: 'flex' }}>
                      <div style={pdfLabel}>Supervisor del contrato:</div>
                      <div style={pdfCell}>{solicitud.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
                    </div>
                  </div>
                  {solicitud.fecha_estimada_solicitud && (
                    <div style={rowB}>
                      <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                        <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada en la que se requiere el contrato:</div>
                        <div style={pdfCell}>{new Date(`${solicitud.fecha_estimada_solicitud}T00:00:00`).toLocaleDateString('es-CO')}</div>
                      </div>
                      <div style={{ flex: 1 }} />
                    </div>
                  )}
                  <div style={rowB}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                    <div style={pdfCell}>{solicitud.objeto || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                  <div style={{ backgroundColor: 'var(--brand-primary)', padding: '8px 20px', textAlign: 'center' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>I. Justificación y Descripción de la Necesidad</span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Descripción de la necesidad:</div>
                    <div style={pdfCell}>{solicitud.justificacion || solicitud.criterios_contratacion || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}</div>
                  </div>
                </div>
              );
            })()}

            {/* II. Plazo y Lugar */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title="II. DESCRIPCIÓN DEL PLAZO Y LUGAR DE EJECUCIÓN." />
              <DataRow label="2.1 Plazo de ejecución" value={plazoTexto} />
              <DataRow label="2.2 Lugar de ejecución" value={solicitud.lugar_ejecucion} last />
            </div>

            {/* III. Investigación de Mercado */}
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
              {Array.isArray(solicitud.proponentes) && solicitud.proponentes.length > 0 ? (
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
                        {solicitud.proponentes.map((p: any, i: number) => {
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
                        {solicitud.proponentes.map((p: any, i: number) => {
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
                      {solicitud.analisis_servicios_ofertados || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                    <div style={{ borderRight: '1px solid #e5e7eb' }}>
                      <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>VALOR PROMEDIO</span>
                      </div>
                      <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                        {solicitud.analisis_valor_promedio
                          ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(solicitud.analisis_valor_promedio)}</span>
                          : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                      </div>
                    </div>
                    <div>
                      <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PLAZO PROMEDIO</span>
                      </div>
                      <div style={{ padding: '12px 14px', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', minHeight: 48 }}>
                        {(() => {
                          const pm = solicitud.analisis_plazo_promedio_meses;
                          const pd = solicitud.analisis_plazo_promedio_dias;
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
                      {solicitud.analisis_presupuesto_oficial
                        ? <span style={{ fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{fmtCOP(solicitud.analisis_presupuesto_oficial)}</span>
                        : <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* IV. Modalidad de Selección (solo Directa) */}
            {esDirecta && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title="IV. IDENTIFICACIÓN DEL CONTRATO A CELEBRAR Y MODALIDAD DE SELECCIÓN." />
                <DataRow label="4.1 Modalidad de selección" value={getCausal(solicitud.modalidad_seleccion)} />
                <DataRow
                  label="Fecha del Comité"
                  value={solicitud.fecha_comite ? new Date(`${solicitud.fecha_comite}T00:00:00`).toLocaleDateString('es-CO') : ''}
                  hint="Asignado por el Comité de Contrataciones."
                  last
                />
              </div>
            )}

            {/* V / IV. Presupuesto y Forma de Pago (componente compartido) */}
            <SeccionPresupuestoLectura
              solicitud={solicitud}
              esDirecta={esDirecta}
              rubroFinanciera={solicitud.rubro}
              presupuestoAprobado={solicitud.presupuesto_aprobado ? (
                <span style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '4px 12px', borderRadius: 8,
                  backgroundColor: '#EFF6FF', color: '#1e3a5f',
                  fontWeight: 800, fontSize: '0.95rem', border: '1px solid #BFDBFE',
                }}>
                  {presupuestoTexto}
                </span>
              ) : undefined}
            />

            {/* VI / V. Supervisión y Entregables */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title={`${esDirecta ? 'VI' : 'V'}. SUPERVISIÓN Y ENTREGABLES DEL CONTRATO.`} />
              <DataRow label={`${esDirecta ? '6.1' : '5.1'} Posibilidad de Supervisión`} value={solicitud.supervision_nombre} />
              {!esDirecta && (() => {
                const obs: { descripcion: string }[] = (() => {
                  try { return Array.isArray(solicitud.obligaciones_especificas) ? solicitud.obligaciones_especificas : JSON.parse(solicitud.obligaciones_especificas || '[]'); } catch { return []; }
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
                  try { return Array.isArray(solicitud.entregables_detalle) ? solicitud.entregables_detalle : JSON.parse(solicitud.entregables_detalle || '[]'); } catch { return []; }
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

            {/* VII / VI. Anexos */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title={`${esDirecta ? 'VII' : 'VI'}. ANEXOS.`} />
              {Array.isArray(solicitud.anexosDocs) && solicitud.anexosDocs.length > 0 && (
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
                      {solicitud.anexosDocs.map((a: any, i: number) => (
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
                {anexosSolicitante.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {anexosSolicitante.map((file: any, idx: number) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => abrirAnexo(file)}
                        className="p-3 bg-slate-50/60 rounded-xl border border-slate-200 flex items-center justify-between group cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-9 h-9 bg-white rounded-lg border border-slate-200 flex items-center justify-center shrink-0">
                            <FileText size={15} className="text-[#2f6fa3]" />
                          </div>
                          <div className="overflow-hidden">
                            <p className="text-xs font-bold text-slate-700 truncate">{file.nombre || `Documento ${idx + 1}`}</p>
                            <p className="text-[10px] text-slate-400">{file.tamanio || 'Adjunto'} · Soporte</p>
                          </div>
                        </div>
                        <ArrowUpRight size={14} className="text-slate-300 group-hover:text-[#2f6fa3] shrink-0 ml-2" />
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

            {/* VIII / VII. Riesgos y SST */}
            <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
              <SectionHeader title={`${esDirecta ? 'VIII' : 'VII'}. RIESGOS Y CRITERIOS AMBIENTALES O DE SST.`} />
              <DataRow label={`${esDirecta ? '8.1' : '7.1'} Riesgos identificados`} value={solicitud.riesgos} />
              <DataRow label={`${esDirecta ? '8.2' : '7.2'} Criterios ambientales o de SST`} value={solicitud.criterios_ambientales_sst} last />
            </div>

            {/* IX / VIII. Conclusiones del Comité */}
            {mostrarConclusionesComite && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title={`${esDirecta ? 'IX' : 'VIII'}. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES.`} />
                <DataRow label="Decisión del Comité" value={solicitud.resultado_comite ? solicitud.resultado_comite.toUpperCase() : ''} />
                <DataRow label="Conclusiones" value={solicitud.conclusiones_comite} last />
              </div>
            )}

            <EstampaAprobacion etapa="juridica" solicitud={solicitud} />
            <TrazabilidadFlujo solicitud={solicitud} />

          </div>
        </div>

        {/* ══ PANEL DE ACCIONES (derecha, sticky) ══ */}
        <div className="w-80 flex-shrink-0 space-y-4 sticky top-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 3rem)' }}>

          {/* Solicitante */}
          <div className="ux-card p-4">
            <div className="flex items-center gap-3">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-lg flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #1e3a5f, #2f6fa3)' }}
              >
                {String(solicitud.solicitante_nombre || 'S').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-800 truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{solicitud.solicitante_nombre}</p>
                <p className="text-xs text-slate-500 truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{solicitud.gerencia_nombre}</p>
              </div>
            </div>
          </div>

          {/* Presupuesto */}
          <div className="rounded-xl p-4" style={{ background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)' }}>
            <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-400 mb-1">
              Presupuesto Asignado
            </p>
            <p className="text-2xl font-black text-white leading-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {presupuestoTexto}
            </p>
            <p className="text-xs text-slate-500 mt-1">{monedaSol}</p>
          </div>

          {/* Acciones + Checklist + Decisión */}
          <div className="ux-card p-4 space-y-4">

            <div className="flex items-center gap-2">
              <Scale size={14} style={{ color: '#2f6fa3' }} />
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Revisión Legal
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed -mt-2" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {esFlujoSecuencial
                ? 'Siga el flujo de trabajo en orden antes de emitir el concepto legal.'
                : 'Revisa la información y emite tu concepto legal.'}
            </p>

            {esFlujoSecuencial && (
              <PasosFlujoJuridica
                estado={estadoFlujo}
                procesandoRevision={procesandoRevision}
                onConfirmarRevision={handleConfirmarRevision}
                onInvitacion={() => abrirPaso('invitacion')}
                onCalificacion={() => abrirPaso('calificacion')}
                onAdjudicacion={() => abrirPaso('adjudicacion')}
                onDocumentos={() => abrirPaso('documentos_finales')}
              />
            )}

            {/* Aprobar / Rechazar */}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              {resultadoJuridica ? (
                <div className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm font-semibold ${
                  resultadoJuridica === 'aprobado'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`} style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  {resultadoJuridica === 'aprobado'
                    ? <CheckCircle2 size={16} className="flex-shrink-0" />
                    : <XCircle size={16} className="flex-shrink-0" />
                  }
                  <span className="text-xs">{mensaje}</span>
                </div>
              ) : (
                <>
                  <ActionButton
                    disabled={!!registrando || !checklistCompleto}
                    spinning={registrando === 'aprobado'}
                    onClick={() => handleDecision('aprobado')}
                    icon={CheckCircle2}
                    color="#10B981"
                  >
                    Aprobar Legal
                  </ActionButton>
                  <ActionButton
                    disabled={!!registrando}
                    spinning={registrando === 'rechazado'}
                    onClick={() => handleDecision('rechazado')}
                    icon={XCircle}
                    color="#EF4444"
                  >
                    Rechazar
                  </ActionButton>
                </>
              )}

              {mensaje && !resultadoJuridica && (
                <div className={`p-3 rounded-lg border text-xs font-medium text-center ${
                  mensaje.includes('exitosamente') || mensaje.includes('creado')
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`} style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  {mensaje}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
