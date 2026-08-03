import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import { useMsal } from '@azure/msal-react';
import {
  ArrowLeft, FileText, Printer, Sparkles, Loader2, CheckCircle2, XCircle,
  ChevronRight, AlertTriangle,
  BarChart3
} from 'lucide-react';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';
import { InstanciasAprobacion } from '../shared/InstanciasAprobacion';
import { nombreGerenciaCompleto } from '../../lib/gerencias';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';
import { FormatoPlaneacionImprimible } from './FormatoPlaneacionImprimible';
import {
  getPresupuestoCertificadoDisplay,
  getPresupuestoDisplayText,
  getValorMonedaTexto,
} from '../../lib/formatPresupuesto';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
type SolicitudDetalle = any;

interface DetalleSolicitudComiteProps {
  solicitudId: string;
  onBack: () => void;
  soloLectura?: boolean;
}

/* ──────────── Helpers de estilo (mismos del formulario del solicitante) ──────────── */
const rowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #e5e7eb', alignItems: 'stretch'
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
  minHeight: 52,
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

const fmtCOP = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const cleaned = String(v).replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return String(v);
  return `$${num.toLocaleString('es-CO')}`;
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

/* ──────────── Mapeo de causales de modalidad directa ──────────── */
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
  const key = String(codigo).toLowerCase().trim();
  return CAUSALES_DIRECTA[key] || String(codigo);
};

/** Activa modo impresión aislada de ficha y lo retira al terminar. */
const imprimirFichaAislada = () => {
  const body = document.body;
  body.classList.add('is-printing-ficha');
  const limpiar = () => {
    body.classList.remove('is-printing-ficha');
    window.removeEventListener('afterprint', limpiar);
  };
  window.addEventListener('afterprint', limpiar);
  setTimeout(() => {
    window.print();
    setTimeout(() => body.classList.remove('is-printing-ficha'), 500);
  }, 30);
};

/** Texto legible de causal para ficha/acta (código MA-GAF, justificación o modalidad). */
export const getCausalComiteDisplay = (solicitud: SolicitudDetalle): string => {
  const modalidad = String(solicitud?.modalidad || '').trim().toLowerCase();
  if (modalidad === 'invitacion') return 'Por invitación';
  if (modalidad === 'tdr') return 'Por términos de referencia';
  const desdeCodigo = getCausalTexto(solicitud?.modalidad_seleccion);
  if (desdeCodigo) return desdeCodigo;
  const justificacion = String(solicitud?.justificacion_cd || '').trim();
  if (justificacion) return justificacion;
  const criterios = String(solicitud?.criterios_contratacion || '').trim();
  if (criterios) return criterios;
  if (modalidad && modalidad !== 'directa') {
    return `Contratación ${solicitud?.modalidad}`;
  }
  return '';
};

/* ──────────── Mapeo de formas de pago ──────────── */
const FORMAS_PAGO: Record<string, string> = {
  anticipo: 'Anticipo',
  pago_unico: 'Pago único',
  mensual: 'Mensual vencida',
};

const getFormaPagoTexto = (codigo: any): string => {
  if (!codigo) return '';
  const key = String(codigo).toLowerCase();
  return FORMAS_PAGO[key] || String(codigo);
};

/* ══════════════════════════════════════════
   FICHA DE COMITÉ (versión imprimible)
══════════════════════════════════════════ */
export function FichaComite({
  solicitud,
  showToolbar = true,
  onBack,
}: {
  solicitud: SolicitudDetalle;
  showToolbar?: boolean;
  onBack?: () => void;
}) {
  const esDirecta = String(solicitud.modalidad || '').toLowerCase() === 'directa';

  const plazoMeses = solicitud.plazo_ejecucion_meses ?? 0;
  const plazoDias = solicitud.plazo_ejecucion_dias ?? 0;
  const plazoTexto = plazoMeses || plazoDias
    ? `${plazoMeses ? `${plazoMeses} mes${plazoMeses === 1 ? '' : 'es'}` : ''}${plazoMeses && plazoDias ? ' · ' : ''}${plazoDias ? `${plazoDias} día${plazoDias === 1 ? '' : 's'}` : ''}`.trim()
    : 'No especificado';

  const origenPpto = nombreGerenciaCompleto(solicitud.gerencia_nombre) || 'No especificado';
  const rubroPresupuestal = solicitud.rubro || solicitud.rubro_presupuestal || 'No especificado';
  const supervisorNombre = solicitud.supervision_nombre || solicitud.solicitante_nombre || '';
  const supervisorCargo = solicitud.supervision_cargo || solicitud.solicitante_cargo || '';
  const supervisorContrato = supervisorNombre || supervisorCargo
    ? `${supervisorNombre}${supervisorNombre && supervisorCargo ? ' · ' : ''}${supervisorCargo}`
    : 'No especificado';

  const causalTexto = getCausalComiteDisplay(solicitud);
  const contexto = (solicitud.justificacion || solicitud.descripcion_necesidad_detalle || '').trim();
  const montoTexto = solicitud.presupuesto_aprobado
    ? getPresupuestoCertificadoDisplay(solicitud)
    : getPresupuestoDisplayText(solicitud);
  const formaPago = getFormaPagoTexto(solicitud.forma_pago) || 'No especificado';
  // Solo aplica cuando el caso realmente pasa por el rol Riesgos (riesgos jurídicos = sí).
  const riesgos: string = solicitud.tiene_riesgos_juridicos === true ? (solicitud.riesgos || '') : '';
  const conceptoJuridico: string = solicitud.concepto_juridico || '';
  const garantias: string = solicitud.garantias || '';
  const riesgosJuridicos: string = solicitud.tiene_riesgos_juridicos === true ? (solicitud.riesgos_juridicos || '') : '';

  const proponentes: any[] = Array.isArray(solicitud.proponentes) ? solicitud.proponentes : [];
  const proveedorPropuesto = esDirecta
    ? (solicitud.proveedor_propuesto ||
        (proponentes[0]
          ? [proponentes[0].nombre_proveedor || proponentes[0].nombreProveedor || '', proponentes[0].nit ? `NIT: ${proponentes[0].nit}` : ''].filter(Boolean).join(' · ')
          : ''))
    : '';

  const valorRefMercado: string = solicitud.analisis_presupuesto_oficial || solicitud.analisis_valor_promedio || '';
  const alternativaRecomendada: string = solicitud.alternativa_recomendada || solicitud.analisis_servicios_ofertados || '';
  const modalidadLabel = esDirecta ? 'Contratación directa' : 'Proceso competitivo';
  const causalCode = String(solicitud.modalidad_seleccion || '').toLowerCase().trim();
  const causalNombre = causalCode ? CAUSALES_DIRECTA[causalCode] || '' : '';

  const ph = (text: string) => <span style={fc.placeholderText}>{text}</span>;

  return (
    <div style={fc.pageWrap}>
      {showToolbar && (
        <div style={fc.printBar} className="print:hidden" data-print="hide">
          <div style={fc.printBarLeft}>
            {onBack && (
              <button type="button" onClick={onBack} style={fc.backBtn} data-print="hide">
                <ArrowLeft size={15} /> Volver
              </button>
            )}
            <span style={fc.fichaBadge}>FICHA OFICIAL</span>
            <div>
              <p style={fc.printBarTitle}>Ficha de Comité de Contratación</p>
              <p style={fc.printBarSub}>{solicitud.codigo || '—'} · {modalidadLabel}</p>
            </div>
          </div>
          <button type="button" onClick={imprimirFichaAislada} style={fc.printBtn} data-print="hide">
            <Printer size={15} /> Imprimir / PDF
          </button>
        </div>
      )}

      <div className="ficha-print-root" style={{ ...fc.paper, margin: showToolbar ? fc.paper.margin : '0 auto 24px' }}>

        {/* ── HEADER ── */}
        <div style={fc.headerRow}>
          <h1 style={fc.ocTitle}>
            {solicitud.titulo_contrato || solicitud.objeto || 'Sin especificar'}
            {solicitud.gerencia_nombre ? ` — ${nombreGerenciaCompleto(solicitud.gerencia_nombre)}` : ''}
          </h1>
          <div style={fc.logoIB} aria-hidden>
            <img src="/logo-iib.png" alt="Invest in Bogotá" style={{ height: 56, width: 'auto', objectFit: 'contain' }} />
          </div>
        </div>

        {/* ── SECCIÓN SUPERIOR: Contexto | Estudio de mercado / Sustentación ── */}
        <div style={fc.upperSection}>
          {/* Columna izquierda: Contexto */}
          <div style={fc.upperLeft}>
            <p style={fc.cellLabelBold}>Contexto y descripción de la necesidad:</p>
            <p style={contexto ? fc.bodyText : fc.placeholderText}>
              {contexto || '[Describa aquí la necesidad institucional: qué se requiere, por qué surge la necesidad, qué consecuencias tiene no contratar. Máximo tres párrafos concretos y sin jerga.]'}
            </p>
          </div>

          {/* Columna derecha: Estudio de mercado o Sustentación de la causal */}
          <div style={fc.upperRight}>
            <div style={fc.panelHeader}>
              {esDirecta ? 'Sustentación de la causal' : 'Estudio de mercado'}
            </div>
            <div style={fc.panelBody}>
              {esDirecta ? (
                <>
                  <div style={fc.panelRow}>
                    <span style={fc.cLabel}>Causal:</span>{' '}
                    {causalTexto ? <span style={fc.panelText}>{causalTexto}</span> : ph('[Número y descripción de la causal — art. 5.2.1.a MA-GAF-02]')}
                  </div>
                  <div style={fc.panelRow}>
                    <span style={fc.cLabel}>Proveedor propuesto:</span>{' '}
                    {proveedorPropuesto ? <span style={fc.panelText}>{proveedorPropuesto}</span> : ph('[Razón social, NIT, representante legal]')}
                  </div>
                  <div style={fc.panelRow}>
                    <span style={fc.cLabel}>Concepto jurídico:</span>{' '}
                    {conceptoJuridico ? <span>{conceptoJuridico}</span> : ph('Viabilidad jurídica de la modalidad / observaciones')}
                  </div>
                  <div style={fc.panelRow}>
                    <span style={fc.cLabel}>Garantías:</span>{' '}
                    {garantias ? <span>{garantias}</span> : ph('Garantías exigidas al contratista')}
                  </div>
                  {riesgosJuridicos && (
                    <div style={fc.panelRow}>
                      <span style={fc.cLabel}>Riesgos jurídicos:</span> <span>{riesgosJuridicos}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <table style={fc.mercadoTable}>
                    <thead>
                      <tr>
                        <th style={fc.mercadoTh}>Proveedor</th>
                        <th style={{ ...fc.mercadoTh, textAlign: 'right' as const }}>Valor</th>
                        <th style={fc.mercadoTh}>Plazo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {proponentes.slice(0, 3).map((p: any, i: number) => {
                        const pm = p.plazo_meses ?? p.plazoMeses ?? '';
                        const pd = p.plazo_dias ?? p.plazoDias ?? '';
                        const plazoP = [pm ? `${pm} m` : '', pd ? `${pd} d` : ''].filter(Boolean).join('/') || '—';
                        return (
                          <tr key={p.id || i}>
                            <td style={fc.mercadoTd}>{p.nombre_proveedor || p.nombreProveedor || '—'}</td>
                            <td style={fc.mercadoTdVal}>{p.valor_cotizacion ? fmtCOP(p.valor_cotizacion) : <span style={{ color: '#9CA3AF' }}>$</span>}</td>
                            <td style={fc.mercadoTd}>{plazoP}</td>
                          </tr>
                        );
                      })}
                      {Array.from({ length: Math.max(0, 3 - proponentes.length) }).map((_, i) => (
                        <tr key={`ph-${i}`}>
                          <td style={fc.mercadoTd}><span style={{ color: '#9CA3AF' }}>[Proveedor {proponentes.length + i + 1}]</span></td>
                          <td style={fc.mercadoTdVal}><span style={{ color: '#9CA3AF' }}>$</span></td>
                          <td style={fc.mercadoTd}></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={fc.mercadoInfoRow}>
                    <span style={fc.cLabel}>Valor de referencia mercado:</span>{' '}
                    {valorRefMercado ? <span>{fmtCOP(valorRefMercado)}</span> : ph('$ — indicar fuente')}
                  </div>
                  <div style={fc.mercadoInfoRow}>
                    <span style={fc.cLabel}>Alternativa recomendada:</span>{' '}
                    {alternativaRecomendada ? <span>{alternativaRecomendada}</span> : ph('Justificación de la elección')}
                  </div>
                  <div style={fc.mercadoInfoRow}>
                    <span style={fc.cLabel}>Concepto jurídico:</span>{' '}
                    {conceptoJuridico ? <span>{conceptoJuridico}</span> : ph('Viabilidad jurídica de la modalidad / observaciones')}
                  </div>
                  <div style={fc.mercadoInfoRow}>
                    <span style={fc.cLabel}>Garantías:</span>{' '}
                    {garantias ? <span>{garantias}</span> : ph('Garantías exigidas al contratista')}
                  </div>
                  {riesgosJuridicos && (
                    <div style={fc.mercadoInfoRow}>
                      <span style={fc.cLabel}>Riesgos jurídicos:</span> <span>{riesgosJuridicos}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* ── SECCIÓN INFERIOR: Datos del contrato | Modalidad ── */}
        <div style={fc.lowerSection}>
          <div style={fc.lowerLeft}>
            <div style={fc.contractFields}>
              <p style={fc.contractRow}><span style={fc.cLabel}>Monto total:</span> {montoTexto}</p>
              <p style={fc.contractRow}><span style={fc.cLabel}>Plazo:</span> {plazoTexto}</p>
              <p style={fc.contractRow}><span style={fc.cLabel}>Forma de pago:</span> {formaPago}</p>
              <p style={fc.contractRow}><span style={fc.cLabel}>Origen de PPTO:</span> {origenPpto}</p>
              <p style={fc.contractRow}><span style={fc.cLabel}>Supervisor Contrato:</span> {supervisorContrato}</p>
              <p style={fc.contractRow}><span style={fc.cLabel}>Rubro presupuestal:</span> {rubroPresupuestal}</p>
            </div>
            {riesgos && (
              <div style={fc.garantiasArea}>
                <p style={fc.contractRow}>
                  <span style={fc.cLabel}>Riesgos principales:</span> {riesgos}
                </p>
              </div>
            )}
          </div>
          <div style={fc.lowerRight}>
            <p style={fc.modalidadTitle}>Modalidad de<br />contratación</p>
            <p style={fc.modalidadValue}>{modalidadLabel}</p>
            {esDirecta && causalNombre && (
              <p style={fc.modalidadHint}>
                [{causalCode.toUpperCase()}. {causalNombre.replace(/^[IVXLC]+\.\s*/i, '').split('.')[0]}]
              </p>
            )}
          </div>
        </div>

        <div style={fc.docFooter}>
          <span>F38-MA-GAF-02 V01</span>
          <span style={fc.docFooterRight}>{new Date().toLocaleDateString('es-CO')}</span>
        </div>
      </div>
    </div>
  );
}


/* ══════════════════════════════════════════
   DETALLE SOLICITUD COMITÉ (vista completa)
══════════════════════════════════════════ */
export function DetalleSolicitudComite({ solicitudId, onBack, soloLectura = false }: DetalleSolicitudComiteProps) {
  const { accounts } = useMsal();
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

  const [solicitud, setSolicitud] = useState<SolicitudDetalle | null>(null);
  const [cargando, setCargando] = useState(true);
  const [verFicha, setVerFicha] = useState(false);
  const [fichaGenerada, setFichaGenerada] = useState(false);
  const [registrandoComite, setRegistrandoComite] = useState<'aprobado' | 'rechazado' | null>(null);
  const [mensajeComite, setMensajeComite] = useState('');
  const [resultadoComite, setResultadoComite] = useState<'aprobado' | 'rechazado' | null>(null);
  const [mostrarFormato, setMostrarFormato] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      setCargando(true);
      try {
        const res = await apiFetch(`${API_URL}/api/solicitudes/${solicitudId}`);
        const data = await res.json();
        if (mounted) {
          setSolicitud({
            ...data,
            anexos_solicitante: parseAnexosSolicitante(data?.anexos_solicitante),
          });
          if (data.resultado_comite) {
            setResultadoComite(data.resultado_comite);
            setMensajeComite(data.resultado_comite === 'aprobado'
              ? '✅ Solicitud marcada como Aprobada en Comité.'
              : '❌ Solicitud marcada como Rechazada en Comité.');
          }
        }
      } catch (err) {
        console.error('Error cargando detalle:', err);
        if (mounted) setSolicitud(null);
      } finally {
        if (mounted) setCargando(false);
      }
    };
    run();
    return () => { mounted = false; };
  }, [solicitudId]);

  /* ── Loading ── */
  if (cargando) {
    return (
      <div style={dd.loadingPage}>
        <div style={dd.loadingCard}>
          <div style={dd.loadingSpinner} />
          <p style={dd.loadingText}>Cargando información completa...</p>
          <p style={dd.loadingSubText}>Por favor espera un momento</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (!solicitud || solicitud.error) {
    return (
      <div style={dd.loadingPage}>
        <div style={{ ...dd.loadingCard, gap: 12 }}>
          <AlertTriangle size={36} color="#EF4444" />
          <p style={{ ...dd.loadingText, color: '#111' }}>No se pudo cargar la solicitud</p>
          <p style={dd.loadingSubText}>{solicitud?.error || 'Intenta nuevamente.'}</p>
          <button onClick={onBack} style={dd.btnBack}>
            <ArrowLeft size={15} /> Volver
          </button>
        </div>
      </div>
    );
  }

  const presupuestoPanelTexto = solicitud.presupuesto_aprobado
    ? getPresupuestoCertificadoDisplay(solicitud)
    : getPresupuestoDisplayText(solicitud);
  const pasoActual = resultadoComite ? 3 : (fichaGenerada ? 2 : 1);

  const handleComite = async (resultado: 'aprobado' | 'rechazado') => {
    setRegistrandoComite(resultado);
    try {
      const resp = await apiFetch(`${API_URL}/api/solicitudes/${solicitud.id}/comite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resultado, usuario_email: accounts[0]?.username })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (err?.error === 'firma_requerida') {
          setMensajeComite('⚠️ Para aprobar el comité, el acta debe estar firmada por la Directora y la Secretaria. Revisa el bloque "Firma electrónica" más arriba.');
          return;
        }
        throw new Error(err?.error || 'Error en API');
      }
      // No usaremos el segundo body. Salimos:
      setResultadoComite(resultado);
      setMensajeComite(resultado === 'aprobado'
        ? '✅ Solicitud marcada como Aprobada en Comité.'
        : '❌ Solicitud marcada como Rechazada en Comité.');
      return;
    } catch (e) {
      console.error(e);
      setMensajeComite('No se pudo registrar el resultado. Intenta nuevamente.');
      return;
    } finally {
      setRegistrandoComite(null);
    }
  };

  /* ── Checklist ── */
  const checklist = [
    { label: 'Objeto y justificación completos', ok: !!(solicitud.objeto && solicitud.justificacion) },
    { label: 'Plazo y lugar definidos', ok: !!(solicitud.lugar_ejecucion && (solicitud.plazo_ejecucion_meses || solicitud.plazo_ejecucion_dias)) },
    { label: 'Presupuesto y modalidad definidos', ok: !!(solicitud.valor_estimado && solicitud.modalidad) },
    { label: 'Supervisión y entregables diligenciados', ok: !!(solicitud.supervision_nombre && solicitud.entregables) },
  ];
  const completitud = Math.round((checklist.filter(i => i.ok).length / checklist.length) * 100);
  const completitudColor = completitud >= 80 ? '#10B981' : completitud >= 50 ? '#F59E0B' : '#EF4444';

  /* ── Ficha ── */
  if (verFicha) {
    return (
      <div style={{ background: '#F1F5F9', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <FichaComite solicitud={solicitud} onBack={() => setVerFicha(false)} />
      </div>
    );
  }

  return (
    <div className="ux-page p-4 lg:p-8" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      {mostrarFormato && solicitud && (
        <FormatoPlaneacionImprimible
          solicitud={solicitud}
          onClose={() => setMostrarFormato(false)}
        />
      )}
      <div style={{ width: '100%', maxWidth: '100%', margin: '0 auto' }}>

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft size={20} /> Volver a la bandeja
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">
              Formato de Planeación Contractual
            </h1>
            <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-semibold border border-indigo-300">
              Revisión Comité
            </span>
            <span className="px-3 py-1 rounded-full text-sm font-semibold border" style={{
              background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0'
            }}>
              {String(solicitud.estado || '').replaceAll('_', ' ')}
            </span>
            <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm font-semibold border border-slate-200">
              {completitud}% completo
            </span>
          </div>
          <p className="text-gray-600">{solicitud.codigo} - v{solicitud.version || '1'}</p>
        </div>

        {/* Banner solo lectura */}
        {soloLectura && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px', borderRadius: 10, marginBottom: 16,
            background: '#EFF6FF', border: '1.5px solid #BFDBFE',
            fontSize: 13, fontWeight: 600, color: '#1E40AF',
          }}>
            <span style={{ fontSize: 18 }}>ℹ️</span>
            Vista de revisión. La decisión del comité se registra en el paso <strong style={{ marginLeft: 4 }}>"Revisar y decidir"</strong> de la sesión activa.
          </div>
        )}

        {/* Steps — solo cuando no es modo lectura */}
        {!soloLectura && <div style={{ ...dd.stepsBar, marginBottom: 24 }}>
          {['Revisar datos', 'Generar ficha', 'Registrar resultado'].map((step, i) => {
            const paso = i + 1;
            const activo = paso === pasoActual;
            const completado = paso < pasoActual;
            const puedeClick = paso > 1;

            const handleClick = () => {
              if (paso === 2) {
                setFichaGenerada(true);
                setVerFicha(true);
                return;
              }
              if (paso === 3) {
                const panel = document.getElementById('resultado-comite-panel');
                panel?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            };

            return (
              <button
                key={i}
                type="button"
                disabled={!puedeClick}
                onClick={handleClick}
                style={{
                  ...dd.stepItem,
                  cursor: puedeClick ? 'pointer' : 'default',
                  opacity: activo || completado ? 1 : 0.86,
                }}
              >
                <div style={{
                  ...dd.stepNum,
                  background: activo ? '#3D2B86' : completado ? '#10B981' : '#e5e7eb',
                  color: activo || completado ? '#fff' : '#9ca3af',
                }}>
                  {paso}
                </div>
                <span style={{
                  ...dd.stepText,
                  color: activo ? '#3D2B86' : completado ? '#047857' : '#9ca3af',
                  fontWeight: activo ? 700 : 500
                }}>
                  {step}
                </span>
                {i < 2 && <ChevronRight size={14} color="#d1d5db" />}
              </button>
            );
          })}
        </div>}

        <div className="space-y-6">

          {/* Completitud (banner mini ancho) */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <BarChart3 size={18} color={completitudColor} />
              <p className="text-sm font-bold text-slate-700 uppercase tracking-wider flex-1">
                Completitud del expediente
              </p>
              <span className="text-xl font-black" style={{ color: completitudColor }}>{completitud}%</span>
            </div>
            <div style={{ ...dd.progBar, marginBottom: 14 }}>
              <div style={{ ...dd.progFill, width: `${completitud}%`, background: completitudColor }} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2">
              {checklist.map(item => (
                <div key={item.label} className="flex items-center gap-2">
                  {item.ok
                    ? <CheckCircle2 size={14} color="#10B981" style={{ flexShrink: 0 }} />
                    : <XCircle size={14} color="#EF4444" style={{ flexShrink: 0 }} />}
                  <p className="text-xs font-medium m-0" style={{ color: item.ok ? '#374151' : '#9ca3af' }}>
                    {item.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* Secciones de datos — mismo orden que el formulario del solicitante */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {(() => {
            const esDirecta = String(solicitud.modalidad || '').toLowerCase() === 'directa';

            return (
              <div style={dd.sectionsWrap}>

                {/* ── FORMATO PLANEACIÓN CONTRACTUAL — documento unificado con el Solicitante (encabezado + Secciones I a VIII) ── */}
                <DetallePlaneacionContractualParte1 solicitud={solicitud} />

                <SeccionPresupuestoLectura
                  solicitud={solicitud}
                  esDirecta={esDirecta}
                  rubroFinanciera={solicitud.rubro}
                  presupuestoAprobado={solicitud.presupuesto_aprobado ? (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center',
                      padding: '4px 12px', borderRadius: 8,
                      backgroundColor: '#ECFDF5', color: '#065F46',
                      fontWeight: 800, fontSize: '0.95rem', border: '1px solid #A7F3D0',
                    }}>
                      {getPresupuestoCertificadoDisplay(solicitud)}
                    </span>
                  ) : undefined}
                />

                <DetallePlaneacionContractualParte2 solicitud={solicitud} />

                {/* ── SECCIÓN VIII — Conclusiones del Comité (solo no directa) ── */}
                {!esDirecta && solicitud.conclusiones_comite && (
                  <div className="rounded-xl overflow-hidden shadow-md" style={{ border: '1px solid #e5e7eb' }}>
                    <SectionHeader title="VIII. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES." />
                    <DataRow label="8.1 Conclusiones del Comité" value={solicitud.conclusiones_comite} last />
                  </div>
                )}

                <InstanciasAprobacion solicitud={solicitud} precedidoPorConclusiones={!esDirecta && !!solicitud.conclusiones_comite} />

              </div>
            );
          })()}

          {/* ── PANEL ACCIONES (full-width, al final) ── */}
          <div
            id="resultado-comite-panel"
            className="rounded-2xl text-white overflow-hidden shadow-lg"
            style={{ background: 'linear-gradient(135deg, #1e1040 0%, #3D2B86 100%)' }}
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0">
              {/* Contexto */}
              <div className="p-6 lg:p-8 lg:border-r border-white/10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                    <Sparkles size={20} className="text-[#E84922]" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200/80">Secretaría de Comité</p>
                    <h3 className="text-xl font-black leading-none mt-1">
                      {soloLectura ? 'Ficha del comité' : 'Preparar ficha y registrar resultado'}
                    </h3>
                  </div>
                </div>
                <p className="text-[12px] text-indigo-100/80 leading-relaxed mt-3 mb-5">
                  {soloLectura
                    ? 'Visualiza e imprime la ficha oficial para presentación en el Comité.'
                    : 'Genera la ficha oficial para presentación en el Comité o registra directamente la decisión final si ya se discutió.'}
                </p>
                <div className="space-y-2.5 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-indigo-200/70 font-bold uppercase tracking-wider">Solicitante</span>
                    <span className="text-[11px] text-white font-bold text-right truncate">{solicitud.solicitante_nombre}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-indigo-200/70 font-bold uppercase tracking-wider">Gerencia</span>
                    <span className="text-[11px] text-white font-bold text-right truncate">{nombreGerenciaCompleto(solicitud.gerencia_nombre)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-[10px] text-indigo-200/70 font-bold uppercase tracking-wider">
                      {solicitud.presupuesto_aprobado ? 'Presupuesto aprobado' : 'Valor estimado'}
                    </span>
                    <span className="text-[11px] font-black text-emerald-300">
                      {presupuestoPanelTexto}
                    </span>
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="p-6 lg:p-8 lg:col-span-2 flex flex-col gap-4">
                {/* Ficha y print — siempre visibles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => { setFichaGenerada(true); setVerFicha(true); }}
                    className="w-full bg-[#E84922] hover:bg-[#C73D1C] text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-orange-500/30"
                    id="btn-generar-ficha"
                  >
                    <FileText size={16} /> Generar ficha oficial
                  </button>
                  <button
                    onClick={() => setMostrarFormato(true)}
                    className="w-full bg-white/10 hover:bg-white/15 text-white py-3 rounded-xl font-bold text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all border border-white/10"
                  >
                    <Printer size={16} /> Imprimir detalle
                  </button>
                </div>

                {/* Resultado del comité — solo en modo normal */}
                {!soloLectura && (
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-200/80 mb-3">
                      Resultado del Comité
                    </p>
                    {resultadoComite ? (
                      <div
                        className="flex items-center gap-3 px-4 py-3 rounded-xl border"
                        style={{
                          background: resultadoComite === 'aprobado' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                          borderColor: resultadoComite === 'aprobado' ? '#10B981' : '#EF4444',
                          color: resultadoComite === 'aprobado' ? '#A7F3D0' : '#FECACA',
                        }}
                      >
                        {resultadoComite === 'aprobado' ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
                        <span className="text-sm font-bold">{mensajeComite}</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <button
                          disabled={!!registrandoComite}
                          onClick={() => handleComite('rechazado')}
                          className="w-full bg-slate-700/80 hover:bg-rose-500/90 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all border border-slate-600/50 hover:border-rose-400/40"
                          id="btn-rechazar-comite"
                        >
                          {registrandoComite === 'rechazado'
                            ? <><Loader2 size={14} className="animate-spin" /> Registrando...</>
                            : <><XCircle size={16} /> Marcar Rechazada</>}
                        </button>
                        <button
                          disabled={!!registrandoComite}
                          onClick={() => handleComite('aprobado')}
                          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-xl font-black text-xs uppercase tracking-[0.14em] flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/30"
                          id="btn-aprobar-comite"
                        >
                          {registrandoComite === 'aprobado'
                            ? <><Loader2 size={14} className="animate-spin" /> Registrando...</>
                            : <><CheckCircle2 size={16} /> Marcar Aprobada</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ─────────────── Estilos Ficha ─────────────── */
const fc: Record<string, React.CSSProperties> = {
  pageWrap: {
    background: '#F1F5F9',
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
    paddingBottom: 40,
  },
  printBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px',
    background: '#ffffff',
    borderBottom: '1.5px solid #e5e7eb',
    gap: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    fontFamily: "'Gabarito', sans-serif",
    position: 'sticky' as const,
    top: 0,
    zIndex: 20,
  },
  printBarLeft: { display: 'flex', alignItems: 'center', gap: 14 },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', borderRadius: 8,
    background: '#f3f4f6', color: '#374151',
    fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: '1px solid #e5e7eb', fontFamily: "'Gabarito', sans-serif",
  },
  fichaBadge: {
    padding: '5px 12px', borderRadius: 6,
    background: '#E84922', color: '#fff',
    fontSize: 10, fontWeight: 900,
    letterSpacing: '0.1em', whiteSpace: 'nowrap' as const,
  },
  printBarTitle: { fontSize: 14, fontWeight: 800, color: '#111827', margin: 0 },
  printBarSub: { fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 },
  printBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 10,
    background: '#10B981', color: '#ffffff',
    fontSize: 13, fontWeight: 700, cursor: 'pointer', border: 'none',
    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
  },

  paper: {
    maxWidth: 1200,
    margin: '24px auto 40px',
    background: '#ffffff',
    padding: '28px 32px',
    border: '1px solid #e5e7eb',
    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },

  /* Header */
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
    marginBottom: 16,
  },
  ocTitle: {
    flex: 1,
    fontSize: 22,
    color: '#E84922',
    margin: 0,
    fontWeight: 700,
    lineHeight: 1.25,
    wordBreak: 'break-word' as const,
  },
  logoIB: {
    display: 'flex',
    alignItems: 'flex-start',
    flexShrink: 0,
  },

  /* Upper section: Contexto | Estudio/Sustentación — apiladas a ancho completo
     para que un texto largo en "Contexto" no deje la columna vecina con un
     hueco en blanco enorme (se veía roto cuando la descripción era extensa). */
  upperSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    border: '2px solid #E84922',
  },
  upperLeft: {
    padding: '12px 14px',
    borderBottom: '1px solid #E84922',
  },
  upperRight: {
    display: 'flex',
    flexDirection: 'column' as const,
  },

  /* Panel header (banda naranja) */
  panelHeader: {
    backgroundColor: '#E84922',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.82rem',
    padding: '6px 12px',
    letterSpacing: '0.04em',
  },
  panelBody: {
    padding: '10px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    flex: 1,
  },
  panelRow: {
    fontSize: '0.8rem',
    color: '#1F2937',
    lineHeight: 1.5,
    margin: 0,
  },
  panelText: {
    fontSize: '0.8rem',
    color: '#1F2937',
    lineHeight: 1.5,
  },

  /* Estudio de mercado table */
  mercadoTable: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '0.78rem',
    marginBottom: 8,
  },
  mercadoTh: {
    backgroundColor: '#E84922',
    color: '#fff',
    padding: '5px 8px',
    fontWeight: 700,
    textAlign: 'left' as const,
    border: '1px solid #d97458',
    fontSize: '0.78rem',
  },
  mercadoTd: {
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.78rem',
    color: '#1F2937',
    verticalAlign: 'top' as const,
  },
  mercadoTdVal: {
    padding: '4px 8px',
    border: '1px solid #e5e7eb',
    fontSize: '0.78rem',
    color: '#1F2937',
    textAlign: 'right' as const,
    verticalAlign: 'top' as const,
  },
  mercadoInfoRow: {
    fontSize: '0.8rem',
    color: '#1F2937',
    padding: '2px 0',
    lineHeight: 1.4,
    margin: 0,
  },

  /* Lower section: Datos del contrato | Modalidad */
  lowerSection: {
    display: 'flex',
    border: '2px solid #E84922',
    borderTop: 'none',
  },
  lowerLeft: {
    flex: '1 1 62%',
    borderRight: '2px solid #E84922',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  contractFields: {
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
    flex: 1,
  },
  contractRow: {
    margin: 0,
    fontSize: '0.82rem',
    color: '#1F2937',
    lineHeight: 1.5,
  },
  garantiasArea: {
    padding: '8px 14px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 4,
  },
  lowerRight: {
    flex: '0 0 38%',
    padding: '14px 16px',
  },
  modalidadTitle: {
    fontWeight: 700,
    fontSize: '1rem',
    color: '#1F2937',
    margin: '0 0 8px',
    lineHeight: 1.3,
  },
  modalidadValue: {
    fontSize: '0.92rem',
    color: '#1F2937',
    margin: 0,
    fontWeight: 500,
  },
  modalidadHint: {
    fontSize: '0.75rem',
    color: '#6B7280',
    fontStyle: 'italic' as const,
    margin: '6px 0 0',
    lineHeight: 1.4,
  },

  /* Shared text styles */
  cellLabelBold: {
    margin: '0 0 8px',
    fontSize: '0.82rem',
    fontWeight: 700,
    color: '#1F2937',
    lineHeight: 1.4,
  },
  cLabel: {
    fontWeight: 700,
    fontSize: '0.82rem',
    color: '#1F2937',
  },
  bodyText: {
    fontSize: '0.82rem',
    color: '#1F2937',
    lineHeight: 1.6,
    margin: 0,
    whiteSpace: 'pre-line' as const,
  },
  placeholderText: {
    fontSize: '0.8rem',
    color: '#9CA3AF',
    fontStyle: 'italic' as const,
    lineHeight: 1.5,
    margin: 0,
  },

  docFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 10,
    borderTop: '1px solid #e5e7eb',
    fontSize: 11,
    color: '#6B7280',
  },
  docFooterRight: { color: '#9CA3AF' },
};

/* ─────────────── Estilos Detalle ─────────────── */
const dd: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    background: '#F1F5F9',
    fontFamily: "'Gabarito', sans-serif",
    flexDirection: 'row-reverse' as const,
    gap: 0,
  },
  // Sidebar derecho
  sidebar: {
    width: 290,
    minHeight: '100vh',
    background: '#ffffff',
    borderLeft: '1.5px solid #e5e7eb',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
    flexShrink: 0,
    position: 'sticky' as const,
    top: 0,
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '-4px 0 16px rgba(0,0,0,0.04)',
  },
  sideCard: {
    padding: '20px',
    borderBottom: '1px solid #f3f4f6',
  },
  sideAvatarRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  sideAvatar: {
    width: 40,
    height: 40,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #3D2B86, #7c3aed)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
    fontWeight: 900,
    flexShrink: 0,
  },
  sideAvatarName: { fontSize: 13, fontWeight: 800, color: '#111827', margin: 0 },
  sideAvatarRole: { fontSize: 10, color: '#9ca3af', margin: '2px 0 0', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  sideInfoGrid: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  sideInfoRow: { display: 'flex', alignItems: 'center', gap: 6 },
  sideInfoLabel: { fontSize: 10, color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', minWidth: 50 },
  sideInfoVal: { fontSize: 11, color: '#374151', fontWeight: 600, flex: 1 },
  montoCard: {
    padding: '18px 20px',
    background: 'linear-gradient(135deg, #1e1040, #3D2B86)',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
  },
  montoLabel: { fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em', textTransform: 'uppercase', margin: '0 0 6px' },
  montoValue: { fontSize: 20, fontWeight: 900, color: '#ffffff', margin: 0, letterSpacing: '-0.5px' },
  montoMoneda: { fontSize: 11, color: 'rgba(255,255,255,0.4)', margin: '4px 0 0', fontWeight: 600 },
  sideCardHeaderRow: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  sideCardTitle: { fontSize: 11, fontWeight: 800, color: '#374151', flex: 1, margin: 0, textTransform: 'uppercase', letterSpacing: '0.05em' },
  completitudPct: { fontSize: 16, fontWeight: 900 },
  progBar: { height: 6, background: '#f3f4f6', borderRadius: 99, overflow: 'hidden', marginBottom: 14 },
  progFill: { height: '100%', borderRadius: 99, transition: 'width 0.6s ease' },
  checklistList: { display: 'flex', flexDirection: 'column' as const, gap: 7 },
  checkItem: { display: 'flex', alignItems: 'center', gap: 8 },
  checkText: { fontSize: 11, margin: 0, lineHeight: 1.3, fontWeight: 500 },
  accionesCard: {
    padding: '20px',
    background: '#0f0a2a',
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 10,
  },
  accionesHeader: { display: 'flex', alignItems: 'center', gap: 8 },
  accionesTitle: { fontSize: 13, fontWeight: 900, color: '#ffffff', margin: 0 },
  accionesDesc: { fontSize: 11, color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, margin: 0 },
  btnGenerar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '12px', borderRadius: 10, background: '#E84922', color: '#fff',
    fontSize: 12, fontWeight: 800, cursor: 'pointer', border: 'none',
    fontFamily: "'Gabarito', sans-serif",
    boxShadow: '0 4px 14px rgba(232,73,34,0.35)',
    letterSpacing: '0.03em',
  },
  btnImprimir: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '11px', borderRadius: 10, background: 'rgba(255,255,255,0.08)',
    color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)',
    fontFamily: "'Gabarito', sans-serif",
  },
  resultadoSection: { marginTop: 4, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' },
  resultadoTitle: { fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10, margin: '0 0 10px' },
  resultadoBtns: { display: 'flex', flexDirection: 'column' as const, gap: 8 },
  resultadoBadge: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 14px', borderRadius: 10,
    border: '1.5px solid', fontSize: 12, fontWeight: 700,
  },
  btnAprobar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '11px', borderRadius: 10, background: '#10B981', color: '#fff',
    fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
    fontFamily: "'Gabarito', sans-serif",
  },
  btnRechazar: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
    padding: '11px', borderRadius: 10, background: '#EF4444', color: '#fff',
    fontSize: 11, fontWeight: 800, cursor: 'pointer', border: 'none',
    fontFamily: "'Gabarito', sans-serif",
  },
  // Content (izquierda)
  content: {
    flex: 1,
    minWidth: 0,
    padding: '32px 36px 48px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 0,
  },
  fichaPageInner: {
    flex: 1,
    padding: '24px 36px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 20,
    maxWidth: 900,
  },
  contentHeader: {
    marginBottom: 28,
  },
  backLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 12,
    fontWeight: 700,
    color: '#6b7280',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '6px 0',
    marginBottom: 20,
    fontFamily: "'Gabarito', sans-serif",
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  titleRow: { marginBottom: 20 },
  codeBadgeRow: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  codeBadge: {
    display: 'inline-block', padding: '5px 12px', borderRadius: 8,
    background: '#ede9fe', color: '#5b21b6', fontSize: 12, fontWeight: 900,
  },
  versionTag: { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  estadoBadge: {
    display: 'inline-block', padding: '4px 10px', borderRadius: 20,
    fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em',
    border: '1.5px solid',
  },
  pageTitle: {
    fontSize: 26, fontWeight: 900, color: '#0f0a2a',
    margin: 0, letterSpacing: '-0.5px',
  },
  stepsBar: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '12px 16px', borderRadius: 12,
    background: '#ffffff', border: '1px solid #e5e7eb',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  },
  stepItem: {
    display: 'flex', alignItems: 'center', gap: 8,
    background: 'transparent', border: 'none', padding: 0,
    fontFamily: "'Gabarito', sans-serif",
  },
  stepNum: {
    width: 24, height: 24, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 900, flexShrink: 0,
  },
  stepText: { fontSize: 12 },
  sectionsWrap: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  fieldsGrid1: { display: 'flex', flexDirection: 'column' as const, gap: 16 },
  fieldsGrid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  presupuestoBlock: {
    marginTop: 16, padding: '16px 20px',
    borderRadius: 12, background: '#F8FAFC', border: '1.5px solid #e5e7eb',
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  },
  presupuestoLabel: { fontSize: 10, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.1em', margin: '0 0 6px' },
  presupuestoValue: { fontSize: 22, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.5px' },
  proponenteCard: {
    borderRadius: 12, border: '1.5px solid #e5e7eb',
    overflow: 'hidden', background: '#fafafa',
  },
  fileCard: { display: 'flex', alignItems: 'center', gap: 12, padding: 12, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', cursor: 'pointer' },
  fileIcon: { padding: 8, background: '#EEF2FF', borderRadius: 8, color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  fileName: { fontSize: 12, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  fileMeta: { fontSize: 10, color: '#64748b', margin: 0 },
  fileAction: { padding: '4px 8px', background: 'none', border: 'none', color: '#6366F1', fontWeight: 700, fontSize: 11, cursor: 'pointer' },
  proponenteHeader: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 16px', background: '#ede9fe',
    borderBottom: '1px solid #ddd6fe',
  },
  proponenteNum: { fontSize: 11, fontWeight: 800, color: '#5b21b6', margin: 0, textTransform: 'uppercase', letterSpacing: '0.08em' },
  // Loading / Error
  loadingPage: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#F1F5F9', fontFamily: "'Gabarito', sans-serif",
  },
  loadingCard: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: 16, padding: 40, background: '#fff', borderRadius: 20,
    border: '1.5px solid #e5e7eb', boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  },
  loadingSpinner: {
    width: 40, height: 40, borderRadius: '50%',
    border: '3px solid #e5e7eb', borderTopColor: '#3D2B86',
    animation: 'spin 0.7s linear infinite',
  },
  loadingText: { fontSize: 16, fontWeight: 800, color: '#374151', margin: 0 },
  loadingSubText: { fontSize: 13, color: '#9ca3af', margin: 0, fontWeight: 500 },
  btnBack: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 10, background: '#3D2B86',
    color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
    border: 'none', fontFamily: "'Gabarito', sans-serif",
  },
};

/* ─────────────── Estilos secciones ─────────────── */
const ds: Record<string, React.CSSProperties> = {
  sectionWrap: {
    background: '#ffffff',
    borderRadius: 14,
    border: '1.5px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  sectionHeader: {
    padding: '14px 20px',
    background: '#fafafa',
    borderBottom: '1px solid #f3f4f6',
    borderLeft: '4px solid #3D2B86',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionIconBox: {
    width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  sectionTitle: {
    fontSize: 12, fontWeight: 800, color: '#374151',
    textTransform: 'uppercase', letterSpacing: '0.07em', margin: 0,
  },
  sectionSubtitle: { fontSize: 11, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500 },
  sectionBody: { padding: '20px' },
  field: {},
  fieldFull: { gridColumn: '1 / -1' },
  fieldLabel: {
    fontSize: 10, fontWeight: 700, color: '#9ca3af',
    textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 5px',
  },
  fieldValue: {
    fontSize: 13, color: '#374151', fontWeight: 600,
    lineHeight: 1.6, whiteSpace: 'pre-line', margin: 0,
  },
  fieldEmpty: { color: '#d1d5db', fontStyle: 'italic', fontWeight: 400 },
};
