import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  Scale, Download,
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { createExpedienteSharePoint } from '../../services/sharepointService';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';
import { InstanciasAprobacion } from '../shared/InstanciasAprobacion';
import { EstampaAprobacion } from '../shared/EstampaAprobacion';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { PasosFlujoJuridica } from './PasosFlujoJuridica';
import {
  construirEstadoFlujo,
  flujoCompleto,
  mensajeFlujoIncompleto,
  ordenPasosParaModalidad,
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
  const ordenPasos = ordenPasosParaModalidad(solicitud?.modalidad);
  const checklistCompleto = !esFlujoSecuencial || flujoCompleto(estadoFlujo, ordenPasos);

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
    if (!pasoAccesible(paso, estadoFlujo, ordenPasos)) {
      setMensaje(mensajeFlujoIncompleto(estadoFlujo, ordenPasos));
      return;
    }
    if (paso === 'invitacion') onOpenConvocatorias?.(solicitud.id);
    if (paso === 'calificacion') onOpenCalificacion?.(solicitud.id);
    if (paso === 'adjudicacion') onOpenActa?.(solicitud.id);
    if (paso === 'documentos_finales') onOpenDocumentos?.(solicitud.id);
  };

  const handleDecision = async (decision: 'aprobado' | 'rechazado') => {
    if (decision === 'aprobado' && esFlujoSecuencial && !checklistCompleto) {
      setMensaje(mensajeFlujoIncompleto(estadoFlujo, ordenPasos));
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

          <div className="space-y-6">

            {/* I–IV. Documento de Planeación Contractual (encabezado, justificación, plazo/lugar,
                estudio de mercado y, para Directa, identificación del contrato) — componente compartido,
                igual al de FormularioSolicitud.tsx */}
            <DetallePlaneacionContractualParte1 solicitud={solicitud} />

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

            <DetallePlaneacionContractualParte2 solicitud={solicitud} />

            {/* IX / VIII. Conclusiones del Comité */}
            {mostrarConclusionesComite && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title={`${esDirecta ? 'IX' : 'VIII'}. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES.`} />
                <DataRow label="Decisión del Comité" value={solicitud.resultado_comite ? solicitud.resultado_comite.toUpperCase() : ''} />
                <DataRow label="Conclusiones" value={solicitud.conclusiones_comite} last />
              </div>
            )}

            <EstampaAprobacion etapa="juridica" solicitud={solicitud} />
            <InstanciasAprobacion solicitud={solicitud} />

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
                modalidad={solicitud?.modalidad}
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
