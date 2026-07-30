import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Loader2, CheckCircle2, XCircle, AlertTriangle,
  Scale, Download, Clock,
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
import { ConfirmDialog } from '../shared/ConfirmDialog';
import {
  construirEstadoFlujo,
  flujoCompleto,
  mensajeFlujoIncompleto,
  ordenPasosParaModalidad,
  pasoAccesible,
  requiereFlujoSecuencial,
} from '../../lib/flujoJuridico';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

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

/* ─── Modal de confirmación previo a la Formalización ─── */
function ConfirmarFormalizacionModal({
  confirmado, setConfirmado, procesando, onCancelar, onConfirmar,
}: {
  confirmado: boolean; setConfirmado: (v: boolean) => void;
  procesando: boolean; onCancelar: () => void; onConfirmar: () => void;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget && !procesando) onCancelar(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" style={{ fontFamily: 'Gabarito, sans-serif' }}>
        <div className="flex items-center gap-2 px-5 py-4" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2f6fa3 100%)' }}>
          <Scale size={18} className="text-white" />
          <h3 className="font-black text-white">Confirmar Formalización</h3>
        </div>
        <div className="p-5 space-y-4">
          <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-all">
            <input
              type="checkbox"
              checked={confirmado}
              onChange={(e) => setConfirmado(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-[#2f6fa3]"
            />
            <span className="text-sm text-slate-700 font-medium leading-snug">
              Confirmo que este proceso ya fue <strong>publicado en el SECOP</strong>.
            </span>
          </label>

          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-amber-200 bg-amber-50">
            <Clock size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              A partir de este momento, <strong>Jurídica cuenta con 3 días hábiles</strong> para completar la formalización del contrato.
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onCancelar}
              disabled={procesando}
              className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-60"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={onConfirmar}
              disabled={!confirmado || procesando}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl font-bold text-sm transition-all ${
                !confirmado || procesando ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 active:scale-95 cursor-pointer'
              }`}
              style={{ backgroundColor: '#10B981', fontFamily: 'Gabarito, sans-serif' }}
            >
              {procesando ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              {procesando ? 'Procesando...' : 'Confirmar Formalización'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── ConceptoJuridicoEditable — Sección "Concepto Jurídico y Garantías" (la diligencia Jurídica) ─── */
const textareaJurStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6,
  fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', resize: 'none',
  outline: 'none', minHeight: 80, boxSizing: 'border-box', backgroundColor: '#fff',
};
const selectJurStyle: React.CSSProperties = {
  ...textareaJurStyle, minHeight: 38, resize: undefined,
};

function ConceptoJuridicoEditable({
  conceptoJuridico, setConceptoJuridico, garantias, setGarantias,
  tieneRiesgos, setTieneRiesgos, riesgosJuridicos, setRiesgosJuridicos,
  guardando, mensaje, onGuardar,
}: {
  conceptoJuridico: string; setConceptoJuridico: (v: string) => void;
  garantias: string; setGarantias: (v: string) => void;
  tieneRiesgos: 'si' | 'no' | ''; setTieneRiesgos: (v: 'si' | 'no' | '') => void;
  riesgosJuridicos: string; setRiesgosJuridicos: (v: string) => void;
  guardando: boolean; mensaje: string; onGuardar: () => void;
}) {
  const n1 = '7.1';
  const n2 = '7.2';
  const n3 = '7.3';
  const n31 = '7.3.1';
  return (
    <>
      <div style={rowStyle}>
        <div style={labelCellStyle}>{n1} Concepto jurídico:</div>
        <div style={valueCellStyle}>
          <textarea
            value={conceptoJuridico}
            onChange={e => setConceptoJuridico(e.target.value)}
            rows={4} style={textareaJurStyle}
            placeholder="Registre el concepto jurídico sobre la modalidad de contratación..."
          />
        </div>
      </div>
      <div style={rowStyle}>
        <div style={labelCellStyle}>{n2} Garantías:</div>
        <div style={valueCellStyle}>
          <textarea
            value={garantias}
            onChange={e => setGarantias(e.target.value)}
            rows={3} style={textareaJurStyle}
            placeholder="Indique las garantías exigidas al contratista..."
          />
        </div>
      </div>
      <div style={{ ...rowStyle, borderBottom: tieneRiesgos === 'si' ? '1px solid #e5e7eb' : 'none' }}>
        <div style={labelCellStyle}>{n3} ¿Tiene riesgos jurídicos?:</div>
        <div style={valueCellStyle}>
          <select
            value={tieneRiesgos}
            onChange={e => setTieneRiesgos(e.target.value as 'si' | 'no' | '')}
            style={{ ...selectJurStyle, maxWidth: 200 }}
          >
            <option value="">-- Seleccione --</option>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>
      {tieneRiesgos === 'si' && (
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={labelCellStyle}>{n31} Riesgos:</div>
          <div style={valueCellStyle}>
            <textarea
              value={riesgosJuridicos}
              onChange={e => setRiesgosJuridicos(e.target.value)}
              rows={3} style={textareaJurStyle}
              placeholder="Describa los riesgos jurídicos identificados..."
            />
          </div>
        </div>
      )}
      <div style={{ padding: '12px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          type="button"
          onClick={onGuardar}
          disabled={guardando}
          className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition-all ${guardando ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-110 cursor-pointer'}`}
          style={{ backgroundColor: '#2f6fa3', fontFamily: 'Gabarito, sans-serif' }}
        >
          {guardando ? 'Guardando...' : 'Guardar concepto jurídico'}
        </button>
        {mensaje && <span style={{ fontSize: '0.78rem', color: '#374151', fontFamily: 'Gabarito, sans-serif' }}>{mensaje}</span>}
      </div>
    </>
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
  const [showConfirmSecop, setShowConfirmSecop] = useState(false);
  const [confirmadoSecop, setConfirmadoSecop] = useState(false);
  const [showConfirmRechazo, setShowConfirmRechazo] = useState(false);

  // Concepto Jurídico y Garantías (lo diligencia Jurídica)
  const [conceptoJuridico, setConceptoJuridico] = useState('');
  const [garantias, setGarantias] = useState('');
  const [tieneRiesgosJur, setTieneRiesgosJur] = useState<'si' | 'no' | ''>('');
  const [riesgosJuridicos, setRiesgosJuridicos] = useState('');
  const [guardandoConcepto, setGuardandoConcepto] = useState(false);
  const [mensajeConcepto, setMensajeConcepto] = useState('');
  const [enviandoConcepto, setEnviandoConcepto] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setCargando(true);
      try {
        const res = await fetch(`${API_URL}/api/solicitudes/${solicitudId}`);
        const data = await res.json();
        if (mounted) {
          setSolicitud(data);
          setConceptoJuridico(data?.concepto_juridico || '');
          setGarantias(data?.garantias || '');
          setTieneRiesgosJur(data?.tiene_riesgos_juridicos === true ? 'si' : data?.tiene_riesgos_juridicos === false ? 'no' : '');
          setRiesgosJuridicos(data?.riesgos_juridicos || '');
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

  const handleGuardarConceptoJuridico = async () => {
    if (!solicitud?.id) return;
    setGuardandoConcepto(true);
    setMensajeConcepto('');
    try {
      const resp = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/concepto-juridico`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto_juridico: conceptoJuridico,
          garantias,
          tiene_riesgos_juridicos: tieneRiesgosJur === 'si',
          riesgos_juridicos: tieneRiesgosJur === 'si' ? riesgosJuridicos : null,
          usuario_email: accounts[0]?.username,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'No se pudo guardar el concepto jurídico');
      setSolicitud((prev: any) => (prev ? {
        ...prev,
        concepto_juridico: data.concepto_juridico,
        garantias: data.garantias,
        tiene_riesgos_juridicos: data.tiene_riesgos_juridicos,
        riesgos_juridicos: data.riesgos_juridicos,
      } : prev));
      setMensajeConcepto('Concepto jurídico guardado correctamente.');
    } catch (e: any) {
      setMensajeConcepto(e.message || 'Error al guardar el concepto jurídico.');
    } finally {
      setGuardandoConcepto(false);
    }
  };

  const handleEnviarConcepto = async () => {
    if (!solicitud?.id) return;
    if (!conceptoJuridico.trim() || !garantias.trim() || !tieneRiesgosJur) {
      setMensajeConcepto('Diligencie el concepto jurídico, las garantías y si tiene riesgos jurídicos antes de enviar.');
      return;
    }
    setEnviandoConcepto(true);
    setMensajeConcepto('');
    try {
      // 1. Guardar los campos (por si hay cambios sin guardar)
      const respGuardar = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/concepto-juridico`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concepto_juridico: conceptoJuridico,
          garantias,
          tiene_riesgos_juridicos: tieneRiesgosJur === 'si',
          riesgos_juridicos: tieneRiesgosJur === 'si' ? riesgosJuridicos : null,
          usuario_email: accounts[0]?.username,
        }),
      });
      if (!respGuardar.ok) {
        const err = await respGuardar.json().catch(() => ({}));
        throw new Error(err?.error || 'No se pudo guardar el concepto jurídico');
      }

      // 2. Enviar: deriva a Riesgos (si aplica) o directo a Comité
      const resp = await fetch(`${API_URL}/api/solicitudes/${solicitud.id}/enviar-concepto-juridico`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_email: accounts[0]?.username }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'No se pudo enviar el concepto jurídico');

      alert(
        tieneRiesgosJur === 'si'
          ? 'Concepto jurídico enviado. La solicitud pasó al rol de Riesgos.'
          : 'Concepto jurídico enviado. La solicitud pasó al Comité de Contratación.'
      );
      onBack();
    } catch (e: any) {
      setMensajeConcepto(e.message || 'Error al enviar el concepto jurídico.');
    } finally {
      setEnviandoConcepto(false);
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
  const esInvitacion = String(solicitud.modalidad || '').toLowerCase().includes('invit');
  // Directa/TDR/Invitación: primera visita de Jurídica — solo diligencia 7.1-7.3 y envía a Riesgos/Comité.
  // Invitación no pasa por Comité: sin riesgos, retoma directo la revisión de Jurídica.
  // En la segunda visita (tras Comité) el concepto ya quedó fijado y se muestra en modo lectura.
  const faseConcepto = solicitud.estado === 'en_juridica_concepto';
  const mostrarConceptoEditable = faseConcepto;
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
      {showConfirmSecop && (
        <ConfirmarFormalizacionModal
          confirmado={confirmadoSecop}
          setConfirmado={setConfirmadoSecop}
          procesando={registrando === 'aprobado'}
          onCancelar={() => { setShowConfirmSecop(false); setConfirmadoSecop(false); }}
          onConfirmar={async () => {
            await handleDecision('aprobado');
            setShowConfirmSecop(false);
            setConfirmadoSecop(false);
          }}
        />
      )}
      <ConfirmDialog
        open={showConfirmRechazo}
        variant="danger"
        title="Rechazar solicitud"
        message={
          <>
            Esta acción es <strong>irreversible</strong>: la solicitud quedará marcada como rechazada por Jurídica
            y el solicitante deberá iniciar un nuevo proceso. ¿Confirmas que deseas rechazarla?
          </>
        }
        confirmLabel="Sí, rechazar"
        processing={registrando === 'rechazado'}
        onCancel={() => setShowConfirmRechazo(false)}
        onConfirm={async () => {
          await handleDecision('rechazado');
          setShowConfirmRechazo(false);
        }}
      />
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

            <DetallePlaneacionContractualParte2
              solicitud={solicitud}
              conceptoJuridicoSlot={
                mostrarConceptoEditable ? (
                  <ConceptoJuridicoEditable
                    conceptoJuridico={conceptoJuridico}
                    setConceptoJuridico={setConceptoJuridico}
                    garantias={garantias}
                    setGarantias={setGarantias}
                    tieneRiesgos={tieneRiesgosJur}
                    setTieneRiesgos={setTieneRiesgosJur}
                    riesgosJuridicos={riesgosJuridicos}
                    setRiesgosJuridicos={setRiesgosJuridicos}
                    guardando={guardandoConcepto}
                    mensaje={mensajeConcepto}
                    onGuardar={handleGuardarConceptoJuridico}
                  />
                ) : undefined
              }
            />

            {/* VIII. Conclusiones del Comité */}
            {mostrarConclusionesComite && (
              <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                <SectionHeader title="VIII. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES." />
                <DataRow label="Decisión del Comité" value={solicitud.resultado_comite ? solicitud.resultado_comite.toUpperCase() : ''} />
                <DataRow label="Conclusiones" value={solicitud.conclusiones_comite} last />
              </div>
            )}

            {!faseConcepto && <EstampaAprobacion etapa="juridica" solicitud={solicitud} />}
            <InstanciasAprobacion solicitud={solicitud} precedidoPorConclusiones={mostrarConclusionesComite} />

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
                <p className="text-xs text-slate-500 truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>{nombreGerenciaCompleto(solicitud.gerencia_nombre)}</p>
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
                {faseConcepto ? 'Concepto Jurídico' : 'Revisión Legal'}
              </p>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed -mt-2" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {faseConcepto
                ? 'Diligencie el concepto jurídico, las garantías y si tiene riesgos jurídicos (sección VII) y envíe la solicitud.'
                : esFlujoSecuencial
                ? 'Siga el flujo de trabajo en orden antes de emitir el concepto legal.'
                : 'Revisa la información y emite tu concepto legal.'}
            </p>

            {!faseConcepto && esFlujoSecuencial && (
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

            {faseConcepto ? (
              /* Fase 1 (Directa/TDR/Invitación): solo enviar el concepto jurídico a Riesgos/Comité */
              <div className="border-t border-slate-100 pt-3 space-y-2">
                <ActionButton
                  disabled={enviandoConcepto}
                  spinning={enviandoConcepto}
                  onClick={handleEnviarConcepto}
                  icon={CheckCircle2}
                  color="#2f6fa3"
                >
                  {tieneRiesgosJur === 'si' ? 'Enviar a Riesgos' : esInvitacion ? 'Continuar' : 'Enviar a Comité'}
                </ActionButton>
              </div>
            ) : (
            <>
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
                    onClick={() => { setConfirmadoSecop(false); setShowConfirmSecop(true); }}
                    icon={CheckCircle2}
                    color="#10B981"
                  >
                    Formalización
                  </ActionButton>
                  <ActionButton
                    disabled={!!registrando}
                    spinning={registrando === 'rechazado'}
                    onClick={() => setShowConfirmRechazo(true)}
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
            </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
