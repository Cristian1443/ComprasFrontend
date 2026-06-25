import React from 'react';
import { X, Printer } from 'lucide-react';
import {
  getPresupuestoCertificadoDisplay,
  getPresupuestoDisplayText,
} from '../../lib/formatPresupuesto';
import { construirEtapasFlujo } from '../shared/TrazabilidadFlujo';

const RED = '#E84922';

interface Props {
  solicitud: any;
  onClose: () => void;
}

// ── Fila de datos (label + valor, dentro de <tbody>) ──────────────────────────
function FR({ label, value, span = 3 }: { label: string; value: any; span?: number }) {
  const vacio = value === null || value === undefined || String(value).trim() === '';
  return (
    <tr>
      <td style={LBL}>{label}</td>
      <td style={{ ...VAL, minHeight: 32 }} colSpan={span}>
        {vacio
          ? <span style={{ color: '#aaa', fontStyle: 'italic' }}>—</span>
          : <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{value}</span>}
      </td>
    </tr>
  );
}

// ── Cabecera de sección roja (dentro de <tbody>) ──────────────────────────────
function SH({ title, cols = 4 }: { title: string; cols?: number }) {
  return (
    <tr>
      <td colSpan={cols} style={{
        background: RED, color: '#fff', fontWeight: 900, fontSize: 9.5,
        padding: '6px 10px', textAlign: 'center',
        letterSpacing: '0.06em', textTransform: 'uppercase',
        border: '1px solid #000',
      }}>
        {title}
      </td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
export function FormatoPlaneacionImprimible({ solicitud, onClose }: Props) {
  const esDirecta = String(solicitud.modalidad || '').toLowerCase() === 'directa';
  const codigo = esDirecta ? 'F38-MA-GAF-02' : 'F30-MA-GAF-02';

  const fechaSolicitud = solicitud.creado_en
    ? new Date(solicitud.creado_en).toLocaleDateString('es-CO')
    : '—';

  const plazoTexto = [
    solicitud.plazo_ejecucion_meses ? `${solicitud.plazo_ejecucion_meses} mes(es)` : '',
    solicitud.plazo_ejecucion_dias  ? `${solicitud.plazo_ejecucion_dias} día(s)`  : '',
  ].filter(Boolean).join(' y ') || '—';

  const proponentes: any[] = Array.isArray(solicitud.proponentes) ? solicitud.proponentes : [];
  const filasProp = proponentes.length > 0
    ? proponentes
    : [{}, {}, {}, {}];

  const presupuestoTexto = solicitud.presupuesto_aprobado
    ? getPresupuestoCertificadoDisplay(solicitud)
    : getPresupuestoDisplayText(solicitud);

  const anexosDocs: any[] = Array.isArray(solicitud.anexosDocs) ? solicitud.anexosDocs : [];

  const FORMAS_PAGO: Record<string, string> = {
    anticipo: 'Anticipo',
    pago_unico: 'Pago único',
    mensual: 'Mensual',
    quincenal: 'Quincenal',
    bimestral: 'Bimestral',
    trimestral: 'Trimestral',
  };
  const formaPagoDisplay = FORMAS_PAGO[solicitud.forma_pago] || solicitud.forma_pago || '—';

  // Numeración de secciones según modalidad
  const n = (noDir: string, dir: string) => esDirecta ? dir : noDir;

  return (
    <>
      <style>{`
        @media print {
          body > *:not(#fpi-root) { display: none !important; }
          #fpi-root {
            position: static !important;
            background: white !important;
            overflow: visible !important;
            padding: 0 !important;
          }
          .fpi-toolbar { display: none !important; }
          .fpi-doc {
            box-shadow: none !important;
            margin: 0 !important;
            max-width: 100% !important;
            padding: 0 !important;
          }
          @page { margin: 10mm 12mm; size: A4; }
        }
      `}</style>

      <div id="fpi-root" style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, overflowY: 'auto',
        background: 'rgba(0,0,0,0.72)',
        fontFamily: 'Arial, Helvetica, sans-serif',
      }}>

        {/* ── Toolbar ── */}
        <div className="fpi-toolbar" style={{
          position: 'sticky', top: 0, zIndex: 10,
          background: '#1e1040', padding: '10px 28px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <span style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>
            Vista previa de impresión — {codigo} v{solicitud.version || '1'}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => window.print()}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: 8,
                background: RED, color: '#fff', border: 'none',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <Printer size={14} /> Imprimir / PDF
            </button>
            <button
              onClick={onClose}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 8,
                background: 'rgba(255,255,255,0.1)', color: '#fff',
                border: '1px solid rgba(255,255,255,0.2)',
                fontSize: 12, fontWeight: 700, cursor: 'pointer',
              }}
            >
              <X size={14} /> Cerrar
            </button>
          </div>
        </div>

        {/* ── Documento ── */}
        <div className="fpi-doc" style={{
          maxWidth: 900, margin: '28px auto 48px',
          background: '#fff', padding: '24px 28px',
          boxShadow: '0 6px 36px rgba(0,0,0,0.45)',
          fontSize: 10, lineHeight: 1.45,
        }}>

          {/* ═══════════ ENCABEZADO ═══════════ */}
          <table style={T}>
            <tbody>
              <tr>
                {/* Logo */}
                <td style={{ ...BORDER, padding: '8px 10px', width: '13%', verticalAlign: 'middle', textAlign: 'center' }}>
                  <img src="/logo-iib.png" alt="Invest in Bogotá" style={{ width: 90, height: 'auto', display: 'block', margin: '0 auto' }} />
                </td>
                {/* Título */}
                <td style={{ ...BORDER, padding: '10px', textAlign: 'center', fontWeight: 900, fontSize: 13, color: RED }}>
                  FORMATO PLANEACIÓN CONTRACTUAL
                </td>
                {/* Meta */}
                <td style={{ ...BORDER, padding: 0, width: '26%', verticalAlign: 'top' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 8.5 }}>
                    <tbody>
                      {[
                        ['Código:', codigo],
                        ['Versión:', '1'],
                        ['Fecha de actualización:', 'Diciembre 17 del 2024'],
                        ['Elaboró:', 'Profesional en Gestión Integral'],
                        ['Aprobó:', 'Gerente Administrativo y Financiero'],
                      ].map(([k, v], i, arr) => (
                        <tr key={k}>
                          <td style={{
                            padding: '3px 5px', fontWeight: 700,
                            borderRight: '1px solid #000',
                            borderBottom: i < arr.length - 1 ? '1px solid #000' : undefined,
                          }}>{k}</td>
                          <td style={{
                            padding: '3px 5px',
                            borderBottom: i < arr.length - 1 ? '1px solid #000' : undefined,
                          }}>{v}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════════ CAMPOS SUPERIORES ═══════════ */}
          <table style={T}>
            <tbody>
              <tr>
                <td style={LBL}>Fecha de solicitud:</td>
                <td style={VAL}>{fechaSolicitud}</td>
                <td style={LBL}>Modalidad de contratación:</td>
                <td style={VAL}>{solicitud.modalidad || '—'}</td>
              </tr>
              <tr>
                <td style={LBL}>Gerencia solicitante:</td>
                <td style={VAL}>{solicitud.gerencia_nombre || '—'}</td>
                <td style={LBL}>Supervisor del contrato:</td>
                <td style={VAL}>{solicitud.supervision_nombre || solicitud.solicitante_nombre || '—'}</td>
              </tr>
              <tr>
                <td style={LBL}>Título del contrato:</td>
                <td style={{ ...VAL }} colSpan={3}>
                  {solicitud.titulo_contrato || '—'}
                </td>
              </tr>
              <tr>
                <td style={LBL}>Objeto:</td>
                <td style={{ ...VAL, minHeight: 52, fontStyle: 'italic' }} colSpan={3}>
                  {solicitud.objeto || '—'}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════════ I. OBJETO, JUSTIFICACIÓN ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title="I. OBJETO, JUSTIFICACIÓN Y DESCRIPCIÓN DE LA NECESIDAD" />
              <FR label="1.0 Título del contrato:" value={solicitud.titulo_contrato} />
              <FR label="1.1 Objeto a contratar:" value={solicitud.objeto} />
              <FR label="1.2 Justificación:" value={solicitud.justificacion} />
              <FR label="1.3 Descripción de la necesidad:" value={solicitud.descripcion_necesidad_detalle} />
            </tbody>
          </table>

          {/* ═══════════ II. PLAZO Y LUGAR ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title="II. DESCRIPCIÓN DEL PLAZO Y LUGAR DE EJECUCIÓN" />
              <FR
                label="2.1 Plazo de ejecución:"
                value={`El plazo de ejecución del contrato será de ${plazoTexto}`}
              />
              <tr>
                <td style={LBL}>2.2 Lugar de ejecución</td>
                <td style={{ ...VAL, minHeight: 52 }} colSpan={3}>
                  {solicitud.lugar_ejecucion ? (
                    <>
                      El lugar de ejecución del contrato será {solicitud.lugar_ejecucion}
                      <br /><br />
                      <strong>PARÁGRAFO:</strong> Para todos los efectos contractuales se tendrán como domicilio la ciudad de {solicitud.lugar_ejecucion}
                    </>
                  ) : <span style={{ color: '#aaa', fontStyle: 'italic' }}>—</span>}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════════ III. INVESTIGACIÓN DE MERCADO ═══════════ */}
          <table style={T}>
            <tbody>
              <tr>
                <td colSpan={8} style={{
                  background: RED, color: '#fff', fontWeight: 900, fontSize: 9.5,
                  padding: '6px 10px', textAlign: 'center', letterSpacing: '0.06em',
                  textTransform: 'uppercase', border: '1px solid #000',
                }}>
                  III. INVESTIGACIÓN DE MERCADO.
                </td>
              </tr>
              <tr>
                <td colSpan={8} style={{ ...BORDER, padding: '4px 8px', fontStyle: 'italic', color: '#555', fontSize: 9 }}>
                  Ingresar la siguiente información de los posibles proponentes que puedan suplir la contratación descrita en el presente documento.
                </td>
              </tr>
              <tr>
                {['No.', 'Nombre del proveedor', 'Correo electrónico', 'Datos de contacto', 'Requisitos técnicos', 'Experiencia', 'Criterios habilitantes', 'Valor agregado', 'Anexo / Observaciones'].map(h => (
                  <td key={h} style={{
                    border: '1px solid #000', padding: '5px 5px',
                    background: RED, color: '#fff', fontWeight: 700,
                    fontSize: 8.5, textAlign: 'center',
                  }}>{h}</td>
                ))}
              </tr>
              {filasProp.map((p: any, i: number) => (
                <tr key={i}>
                  <td style={{ ...BORDER, padding: '5px', textAlign: 'center', fontWeight: 700, minHeight: 26, width: '4%' }}>{i + 1}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.nombre_proveedor || p.nombreProveedor || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.correo || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.datos_contacto   || p.datosContacto   || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.requisitos_tecnicos || p.requisitosTecnicos || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.experiencia || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.criterios_habilitantes || p.criteriosHabilitantes || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.valor_agregado || p.valorAgregado || ''}</td>
                  <td style={{ ...BORDER, padding: '5px', fontSize: 9 }}>{p.observaciones || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* ═══════════ IV. MODALIDAD (solo DIRECTA) ═══════════ */}
          {esDirecta && (
            <table style={T}>
              <tbody>
                <SH title="IV. IDENTIFICACIÓN DEL CONTRATO A CELEBRAR Y MODALIDAD DE SELECCIÓN." />
                <FR label="4.1 Modalidad de selección:" value={solicitud.modalidad_seleccion || solicitud.justificacion_cd} />
                <FR
                  label="Fecha del Comité:"
                  value={solicitud.fecha_comite
                    ? new Date(`${solicitud.fecha_comite}T00:00:00`).toLocaleDateString('es-CO')
                    : ''}
                />
              </tbody>
            </table>
          )}

          {/* ═══════════ IV/V. PRESUPUESTO ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title={`${n('IV', 'V')}. ANÁLISIS DEL VALOR ESTIMADO DEL CONTRATO, PRESUPUESTO Y FORMA DE PAGO.`} />
              <FR label={`${n('4.1', '5.1')} Presupuesto para la contratación`} value={presupuestoTexto} />
              <FR label={`${n('4.2', '5.2')} Rubro presupuestal:`}   value={solicitud.rubro || solicitud.rubro_presupuestal} />
              <FR label={`${n('4.3', '5.3')} Forma de pago:`}        value={formaPagoDisplay} />
            </tbody>
          </table>

          {/* ═══════════ V/VI. SUPERVISIÓN ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title={`${n('V', 'VI')}. SUPERVISIÓN Y ENTREGABLES DEL CONTRATO.`} />
              <FR label={`${n('5.1', '6.1')} Supervisión:`}  value={solicitud.supervision_nombre} />
              <FR label={`${n('5.2', '6.2')} Entregables:`}  value={solicitud.entregables} />
            </tbody>
          </table>

          {/* ═══════════ VI/VII. ANEXOS ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title={`${n('VI', 'VII')}. ANEXOS.`} />
              <tr>
                <td style={LBL}>{`${n('6.1', '7.1')} Anexos`}</td>
                <td style={{ ...VAL, minHeight: 40 }} colSpan={3}>
                  {anexosDocs.length > 0
                    ? anexosDocs.map((a: any, i: number) => (
                        <div key={i}>{i + 1}. {a.nombre_documento || a.nombre || '—'}</div>
                      ))
                    : <span style={{ color: '#aaa', fontStyle: 'italic' }}>—</span>}
                </td>
              </tr>
            </tbody>
          </table>

          {/* ═══════════ VII/VIII. RIESGOS ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title={`${n('VII', 'VIII')}. RIESGOS Y CRITERIOS AMBIENTALES O DE SST.`} />
              <FR label={`${n('7.1', '8.1')} Riesgos`}                     value={solicitud.riesgos} />
              <FR label={`${n('7.2', '8.2')} Criterios ambientales o de SST`} value={solicitud.criterios_ambientales_sst} />
            </tbody>
          </table>

          {/* ═══════════ VIII/IX. CONCLUSIONES ═══════════ */}
          <table style={T}>
            <tbody>
              <SH title={`${n('VIII', 'IX')}. CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES${!esDirecta ? ' PARA TDR > 50 SMMLV' : ''}.`} />
              <FR label={`${n('8.1', '9.1')} Conclusiones del Comité:`} value={solicitud.conclusiones_comite} />
            </tbody>
          </table>

          {/* ═══════════ TRAZABILIDAD DEL FLUJO ═══════════ */}
          <TrazaPDF solicitud={solicitud} />

        </div>
      </div>
    </>
  );
}

// ── Trazabilidad del flujo (versión imprimible) ──────────────────────────────
const ESTADO_LABELS: Record<string, string> = {
  aprobado: 'APROBADO',
  rechazado: 'RECHAZADO',
  pendiente: 'PENDIENTE',
  en_proceso: 'EN PROCESO',
  no_aplica: 'NO APLICA',
};
const ESTADO_COLOR: Record<string, string> = {
  aprobado: '#065F46',
  rechazado: '#991B1B',
  pendiente: '#92400E',
  en_proceso: '#1E40AF',
  no_aplica: '#475569',
};
const ESTADO_BG: Record<string, string> = {
  aprobado: '#ECFDF5',
  rechazado: '#FEF2F2',
  pendiente: '#FFFBEB',
  en_proceso: '#EFF6FF',
  no_aplica: '#F1F5F9',
};

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return `${d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })} · ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

function TrazaPDF({ solicitud }: { solicitud: any }) {
  const etapas = construirEtapasFlujo(solicitud);
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 0 }}>
      <tbody>
        <tr>
          <td colSpan={4} style={{
            background: '#1e1040', color: '#fff', fontWeight: 900, fontSize: 9.5,
            padding: '6px 10px', textAlign: 'center', letterSpacing: '0.06em',
            textTransform: 'uppercase', border: '1px solid #000',
          }}>
            TRAZABILIDAD DEL FLUJO DE APROBACIÓN
          </td>
        </tr>
        <tr>
          {['Etapa', 'Responsable', 'Fecha y hora', 'Estado'].map(h => (
            <td key={h} style={{
              border: '1px solid #000', padding: '5px 7px',
              background: '#3b3060', color: '#fff',
              fontWeight: 700, fontSize: 8.5, textAlign: 'center',
            }}>{h}</td>
          ))}
        </tr>
        {etapas.map(etapa => {
          const color = ESTADO_COLOR[etapa.estado] ?? '#374151';
          const bg    = ESTADO_BG[etapa.estado]    ?? '#F9FAFB';
          return (
            <React.Fragment key={etapa.clave}>
              <tr>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontWeight: 700, fontSize: 9, verticalAlign: 'top', width: '28%' }}>
                  {etapa.titulo}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: 9, verticalAlign: 'top', width: '28%' }}>
                  <span style={{ fontSize: 8, fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block' }}>{etapa.rol}</span>
                  {etapa.persona ?? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Sin registrar</span>}
                </td>
                <td style={{ border: '1px solid #000', padding: '6px 8px', fontSize: 9, verticalAlign: 'top', width: '24%' }}>
                  {fmtFecha(etapa.fecha)}
                </td>
                <td style={{ border: '1px solid #000', padding: '5px 6px', fontSize: 8.5, fontWeight: 800, verticalAlign: 'top', textAlign: 'center', width: '20%', background: bg, color }}>
                  {ESTADO_LABELS[etapa.estado] ?? etapa.estado}
                </td>
              </tr>
              {etapa.comentario && (
                <tr>
                  <td colSpan={4} style={{
                    border: '1px solid #000', padding: '4px 8px',
                    fontSize: 8.5, color: '#374151',
                    background: '#F9FAFB', borderTop: 'none',
                  }}>
                    <span style={{ fontWeight: 700 }}>Observación:</span> {etapa.comentario}
                  </td>
                </tr>
              )}
            </React.Fragment>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Estilos base ─────────────────────────────────────────────────────────────
const BORDER: React.CSSProperties = { border: '1px solid #000' };

const T: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
};

const LBL: React.CSSProperties = {
  border: '1px solid #000',
  padding: '6px 8px',
  fontWeight: 700,
  fontSize: 9.5,
  verticalAlign: 'top',
  width: '22%',
  background: '#fafafa',
};

const VAL: React.CSSProperties = {
  border: '1px solid #000',
  padding: '6px 8px',
  fontSize: 9.5,
  verticalAlign: 'top',
};
