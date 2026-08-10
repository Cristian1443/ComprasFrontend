import React from 'react';
import { Download } from 'lucide-react';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

/** Nombre del anexo + enlace de descarga si tiene archivo cargado. */
function AnexoItem({ a }: { a: any }) {
  const nombre = a.nombre_documento || a.nombre || 'Documento sin nombre';
  const url = a.archivo_url || a.archivoUrl;
  return (
    <span>
      {nombre}
      {url && (
        <a href={`${API_URL}${url}`} target="_blank" rel="noopener noreferrer"
          title={a.archivo_nombre_original || a.archivoNombre || 'Ver archivo'}
          style={{ marginLeft: 8, color: 'var(--brand-primary)', display: 'inline-flex', verticalAlign: 'middle' }}
        >
          <Download size={13} />
        </a>
      )}
    </span>
  );
}

/**
 * Documento de planeación contractual — versión de solo lectura.
 * Replica exactamente los mismos estilos, encabezados, hints y numeración
 * que FormularioSolicitud.tsx (vista del Solicitante), para que Gerente,
 * Financiera, Jurídica y Secretaría vean siempre el mismo documento.
 */

interface Props {
  solicitud: Record<string, any>;
}

interface Props2 extends Props {
  /** Reemplaza el bloque de solo-lectura de "Concepto Jurídico y Garantías" por otro
   *  contenido (p. ej. la versión editable que usa Jurídica). Si se omite, se usa
   *  el bloque de solo-lectura por defecto en la posición correcta según modalidad. */
  conceptoJuridicoSlot?: React.ReactNode;
}

const CARD: React.CSSProperties = {
  fontFamily: 'Gabarito, sans-serif',
};

const PDF_LABEL: React.CSSProperties = {
  width: 170, minWidth: 170, padding: '12px 14px',
  fontWeight: 700, fontSize: '0.8rem', color: '#1F2937',
  borderRight: '1px solid #d1d5db', display: 'flex',
  alignItems: 'center', lineHeight: 1.4, flexShrink: 0,
  fontFamily: 'Gabarito, sans-serif',
};
const PDF_HINT: React.CSSProperties = {
  fontSize: '0.72rem', color: 'var(--brand-primary)', fontStyle: 'italic',
  marginBottom: 8, lineHeight: 1.5, fontFamily: 'Gabarito, sans-serif',
};
const PDF_CELL: React.CSSProperties = { flex: 1, padding: '10px 14px' };
const VALUE_TEXT: React.CSSProperties = {
  fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', color: '#1F2937',
  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};
const ROW_B: React.CSSProperties = { display: 'flex', borderBottom: '1px solid #d1d5db' };
const EMPTY = <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>;
const EMPTY_DASH = <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>—</span>;

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: '10px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'Gabarito, sans-serif' }}>
        {title}
      </span>
    </div>
  );
}

/** Fila label + valor con el mismo texto de ayuda (hint) que el formulario editable. */
function DataRow({ label, hint, value, last }: { label: string; hint?: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ ...ROW_B, ...(last ? { borderBottom: 'none' } : {}) }}>
      <div style={{ ...PDF_LABEL, alignItems: 'flex-start', paddingTop: 14 }}>{label}</div>
      <div style={PDF_CELL}>
        {hint && <p style={PDF_HINT}>{hint}</p>}
        <div style={VALUE_TEXT}>{value || EMPTY}</div>
      </div>
    </div>
  );
}

/** Fila de dato "automático" (mismo hint que el formulario editable, sin el recuadro de input). */
function AutoRow({ hint, value }: { hint: string; value: React.ReactNode }) {
  return (
    <div style={PDF_CELL}>
      <p style={PDF_HINT}>{hint}</p>
      <div style={VALUE_TEXT}>{value || EMPTY_DASH}</div>
    </div>
  );
}

function fmtFecha(iso: string | null | undefined): string {
  if (!iso) return '';
  // El backend puede devolver una fecha simple ("2026-07-14") o un timestamp completo
  // ("2026-07-14T00:00:00.000Z"); nos quedamos solo con la parte de fecha antes de
  // reconstruirla en horario local, para no romper el parseo ni desplazar el día.
  const soloFecha = String(iso).slice(0, 10);
  const d = new Date(`${soloFecha}T00:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CO');
}

/**
 * Parte 1: Encabezado + Secciones I, II, III y IV (Identificación del Contrato, solo Directa).
 * Úsala junto con `DetallePlaneacionContractualParte2` cuando la vista necesite intercalar
 * su propia sección de Presupuesto/Forma de Pago entre la Sección IV y la V/VI
 * (esa sección numerada vive fuera de este componente porque en Financiera es editable).
 */
export function DetallePlaneacionContractualParte1({ solicitud: s }: Props) {
  const modalidad = String(s?.modalidad || '').toLowerCase();
  const esDirecta = modalidad.includes('directa');
  const esTDR = modalidad.includes('tdr');
  const modalidadCompleta = esDirecta ? 'Contratación Directa' : esTDR ? 'Términos de Referencia' : 'Invitación a Ofertar';

  const fechaSolicitud = fmtFecha(s?.creado_en);
  const fechaEstimada = fmtFecha(s?.fecha_estimada_solicitud);

  const proponentes: any[] = Array.isArray(s?.proponentes) ? s.proponentes : [];
  const anexosDocsIV: any[] = Array.isArray(s?.anexosDocs) ? s.anexosDocs : (Array.isArray(s?.anexos) ? s.anexos : []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── ENCABEZADO + SECCIÓN I ── */}
      <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
        <div style={{ padding: '11px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            FORMATO PLANEACIÓN CONTRACTUAL
          </span>
        </div>

        <DataRow label="Nombre del proceso:" hint="Escriba el nombre o título con el que se identificará este contrato." value={s?.titulo_contrato} />

        <div style={ROW_B}>
          <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
            <div style={PDF_LABEL}>Fecha de solicitud:</div>
            <AutoRow hint="Indicar fecha de solicitud al Gerente del Área Solicitante." value={fechaSolicitud} />
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <div style={PDF_LABEL}>Modalidad de contratación:</div>
            <AutoRow hint="Seleccione en la lista desplegable la modalidad de contratación para el bien o servicio." value={modalidadCompleta} />
          </div>
        </div>

        <div style={ROW_B}>
          <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
            <div style={PDF_LABEL}>Gerencia solicitante:</div>
            <AutoRow hint="Seleccione en la lista desplegable la Gerencia Solicitante." value={nombreGerenciaCompleto(s?.gerencia_nombre)} />
          </div>
          <div style={{ flex: 1, display: 'flex' }}>
            <div style={PDF_LABEL}>Supervisor del contrato:</div>
            <div style={PDF_CELL}>
              <p style={PDF_HINT}>Indicar nombre del empleado que ejercerá la supervisión y seguimiento del contrato descrito en este documento.</p>
              <div style={VALUE_TEXT}>{s?.supervision_nombre || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No asignado</span>}</div>
            </div>
          </div>
        </div>

        {/* Fecha del Comité: no se muestra aquí — se diligencia en otro paso del flujo. */}

        <div style={ROW_B}>
          <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
            <div style={{ ...PDF_LABEL, lineHeight: 1.35 }}>Fecha estimada en la que se requiere el contrato</div>
            <div style={PDF_CELL}>
              <p style={PDF_HINT}>Incluya la fecha en la que se requiere iniciar el contrato</p>
              <div style={VALUE_TEXT}>{fechaEstimada || EMPTY_DASH}</div>
            </div>
          </div>
          <div style={{ flex: 1 }} />
        </div>

        <DataRow label="Objeto:" hint="Indicar el objeto de la contratación requerida." value={s?.objeto} last />

        <SectionHeader title="I. Justificación y Descripción de la Necesidad" />
        <DataRow
          label="1.1 Justificación y Descripción:"
          hint="En este apartado se redactará la justificación por la cual se requiere el objeto a contratar, indicando la necesidad a satisfacer de conformidad con el propósito superior de La Corporación, objetivos y metas de los cual se deriva la contratación, así como las funciones del área solicitante."
          value={s?.justificacion}
        />
        <DataRow
          label="1.2 Especificaciones técnicas:"
          hint="Describa de forma clara y concisa las especificaciones técnicas del bien o servicio a contratar."
          value={s?.descripcion_necesidad_detalle}
        />
        <DataRow
          label="1.3 Criterios habilitantes:"
          hint="Criterios habilitantes exigidos a los proponentes para esta contratación."
          value={
            Array.isArray(s?.criterios_habilitantes_planeacion) && s.criterios_habilitantes_planeacion.length > 0
              ? (
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  {s.criterios_habilitantes_planeacion.map((c: any, i: number) => <li key={i}>{c.descripcion}</li>)}
                </ol>
              )
              : null
          }
        />
        <DataRow
          label="1.4 Experiencia Acreditada Exigida:"
          hint="Experiencia acreditada exigida al proponente/contratista para esta contratación."
          value={s?.experiencia_acreditada_exigida}
          last
        />
      </div>

      {/* ── SECCIÓN II ── */}
      <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
        <SectionHeader title="II. Descripción del Plazo y Lugar de Ejecución" />
        <DataRow
          label="2.1 Plazo de ejecución:"
          hint="Indique el plazo de ejecución del contrato expresado en meses y/o días calendario."
          value={[
            s?.plazo_ejecucion_meses ? `${s.plazo_ejecucion_meses} mes(es)` : '',
            s?.plazo_ejecucion_dias ? `${s.plazo_ejecucion_dias} día(s)` : '',
          ].filter(Boolean).join(' y ')}
        />
        <DataRow
          label="2.2 Lugar de ejecución:"
          hint="Indique la ciudad o municipio donde se ejecutará el contrato."
          value={s?.lugar_ejecucion}
          last
        />
      </div>

      {/* ── SECCIÓN III — Estudio de Mercado ── */}
      <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
        <SectionHeader title="III. ESTUDIO DE MERCADO" />

        <div style={{ padding: '8px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
          <p style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic', fontFamily: 'Gabarito, sans-serif' }}>
            Ingresar la siguiente información de los posibles proponentes que puedan suplir la contratación.
            {esDirecta && <strong style={{ color: 'var(--brand-primary)', marginLeft: 4 }}>Contratación Directa: solo se registra un (1) proponente.</strong>}
          </p>
        </div>

        {esDirecta ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'Gabarito, sans-serif', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '6%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} />
                <col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} /><col style={{ width: '14%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th colSpan={8} style={{ border: '1px solid #d1d5db', padding: '7px 10px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#374151', backgroundColor: '#fff' }}>
                    ÚNICO PROPONENTE
                  </th>
                </tr>
                <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <th style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '8px 6px', color: '#fff', textAlign: 'center' }}>No.</th>
                  {['Nombre del proveedor', 'Datos de contacto', 'Requisitos técnicos', 'Experiencia', 'Criterios habilitantes', 'Valor + Impuestos', 'Anexo / Observaciones (Valor agregado)'].map(h => (
                    <th key={h} style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '8px', color: '#fff', textAlign: 'center', lineHeight: 1.2, fontWeight: 700 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(proponentes.length > 0 ? proponentes : [{}]).map((p: any, i: number) => {
                  const c = (v: string) => v || EMPTY_DASH;
                  return (
                    <tr key={p.id || i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', verticalAlign: 'top' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.nombre_proveedor || p.nombreProveedor)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.datos_contacto || p.datosContacto)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.requisitos_tecnicos || p.requisitosTecnicos)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.experiencia)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.criterios_habilitantes || p.criteriosHabilitantes)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.valor_con_impuestos || p.valorConImpuestos || p.valorImpuestos)}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: '8px', verticalAlign: 'top', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.observaciones)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <>
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
                    <th style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '6px 4px', color: '#fff', textAlign: 'center' }}>No.</th>
                    {['Nombre del proveedor', 'Datos de contacto', 'Valor de cotización', 'Plazo'].map(h => (
                      <th key={h} style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '6px 8px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(proponentes.length > 0 ? proponentes : [{}, {}, {}]).map((p: any, i: number) => {
                    const c = (v: string) => v || EMPTY_DASH;
                    const plazoTxt = [
                      p.plazo_meses || p.plazoMeses ? `${p.plazo_meses || p.plazoMeses}m` : '',
                      p.plazo_dias || p.plazoDias ? `${p.plazo_dias || p.plazoDias}d` : '',
                    ].filter(Boolean).join(' ');
                    return (
                      <tr key={p.id || i} style={{ backgroundColor: '#fff' }}>
                        <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center', fontWeight: 700, color: '#374151' }}>{i + 1}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.nombre_proveedor || p.nombreProveedor)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{c(p.datos_contacto || p.datosContacto)}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px' }}>{p.valor_cotizacion || p.valorCotizacion ? `$ ${p.valor_cotizacion || p.valorCotizacion}` : EMPTY_DASH}</td>
                        <td style={{ border: '1px solid #e5e7eb', padding: '8px' }}>{plazoTxt || EMPTY_DASH}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ANÁLISIS DEL MERCADO */}
            <div style={{ borderTop: '2px solid #e5e7eb' }}>
              <div style={{ backgroundColor: '#1a3a5c', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif' }}>
                ANÁLISIS DEL MERCADO
              </div>
              <DataRow
                label="Servicios ofertados:"
                hint="Definir si el oferente presta la totalidad de servicios solicitados y si encontró algún valor agregado en el estudio de mercado."
                value={s?.analisis_servicios_ofertados}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #d1d5db' }}>
                <div style={{ display: 'flex', borderRight: '1px solid #d1d5db' }}>
                  <div style={PDF_LABEL}>Valor promedio:</div>
                  <div style={PDF_CELL}>
                    <p style={PDF_HINT}>Promedio calculado a partir de los valores de cotización de los proponentes, uno por cada moneda registrada.</p>
                    <div style={VALUE_TEXT}>
                      {s?.analisis_valor_promedio
                        ? (/^(COP|USD|EUR)\b/.test(String(s.analisis_valor_promedio)) ? s.analisis_valor_promedio : `$ ${s.analisis_valor_promedio}`)
                        : EMPTY}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex' }}>
                  <div style={PDF_LABEL}>Plazo promedio:</div>
                  <div style={PDF_CELL}>
                    <p style={PDF_HINT}>Registre el promedio de los plazos de la satisfacción de la necesidad obtenidos en la investigación de mercado.</p>
                    <div style={VALUE_TEXT}>
                      {[
                        s?.analisis_plazo_promedio_meses ? `${s.analisis_plazo_promedio_meses} mes(es)` : '',
                        s?.analisis_plazo_promedio_dias ? `${s.analisis_plazo_promedio_dias} día(s)` : '',
                      ].filter(Boolean).join(' y ') || EMPTY}
                    </div>
                  </div>
                </div>
              </div>
              <DataRow label="Presupuesto oficial:" value={s?.analisis_presupuesto_oficial ? `$ ${s.analisis_presupuesto_oficial}` : ''} last />
            </div>
          </>
        )}
      </div>

      {/* ── SECCIÓN IV — Identificación del Contrato — solo Directa ── */}
      {esDirecta && (
        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
          <SectionHeader title="IV. Identificación del Contrato a Celebrar y Modalidad de Selección." />
          <DataRow
            label="4.1 Causal de contratación:"
            hint="Conforme con los resultados del apartado anterior 'III. Investigación de mercado', la contratación se debe realizar de manera directa, seleccione la causal que justifica la modalidad de contratación, de acuerdo con lo indicado en el ítem a) del numeral 5.2.1 del MA-GAF-01 Manual de Procedimientos de Compras y Contratación."
            value={s?.modalidad_seleccion}
          />
          <DataRow
            label="4.2 Justificación de la causal:"
            hint="Sustente por qué la causal seleccionada aplica a esta contratación."
            value={s?.justificacion_cd}
          />
          <div style={{ display: 'flex' }}>
            <div style={{ ...PDF_LABEL, alignItems: 'flex-start', paddingTop: 14 }}>4.3 Anexos y cargue de documentos:</div>
            <div style={PDF_CELL}>
              <p style={PDF_HINT}>Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo.</p>
              {anexosDocsIV.length > 0 ? (
                <ol style={{ ...VALUE_TEXT, margin: 0, paddingLeft: 18 }}>
                  {anexosDocsIV.map((a: any, i: number) => <li key={i}><AnexoItem a={a} /></li>)}
                </ol>
              ) : EMPTY_DASH}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/**
 * Parte 2: Secciones V/VI (Supervisión y Entregables), VI/VII (Anexos) y VII/VIII (Riesgos y SST).
 * Va después de la sección de Presupuesto/Forma de Pago propia de cada vista.
 */
export function DetallePlaneacionContractualParte2({ solicitud: s, conceptoJuridicoSlot }: Props2) {
  const modalidad = String(s?.modalidad || '').toLowerCase();
  const esDirecta = modalidad.includes('directa');

  const obligaciones: any[] = Array.isArray(s?.obligaciones_especificas) ? s.obligaciones_especificas : [];
  const entregablesDetalle: any[] = Array.isArray(s?.entregables_detalle) ? s.entregables_detalle : [];
  const anexosDocs: any[] = Array.isArray(s?.anexosDocs) ? s.anexosDocs : (Array.isArray(s?.anexos) ? s.anexos : []);

  const numeroSeccion = (noDir: string, dir: string) => (esDirecta ? dir : noDir);

  const conceptoJuridicoBloque = conceptoJuridicoSlot !== undefined
    ? conceptoJuridicoSlot
    : <SeccionConceptoJuridicoLectura solicitud={s} />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── SECCIÓN V/VI — Supervisión y Entregables ── */}
      <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
        <SectionHeader title={`${numeroSeccion('V', 'VI')}. Supervisión y Entregables del Contrato.`} />
        <div style={ROW_B}>
          <div style={{ ...PDF_LABEL, alignItems: 'flex-start', paddingTop: 14 }}>{numeroSeccion('5.1', '6.1')} Obligaciones Específicas:</div>
          <div style={PDF_CELL}>
            <p style={PDF_HINT}>Liste las obligaciones específicas que debe cumplir el contratista durante la ejecución del contrato.</p>
            {obligaciones.length > 0 ? (
              <ol style={{ ...VALUE_TEXT, margin: 0, paddingLeft: 18 }}>
                {obligaciones.map((o: any, i: number) => <li key={i}>{o.descripcion}</li>)}
              </ol>
            ) : EMPTY}
          </div>
        </div>
        <div style={{ display: 'flex' }}>
          <div style={{ ...PDF_LABEL, alignItems: 'flex-start', paddingTop: 14 }}>{numeroSeccion('5.2', '6.2')} Entregables:</div>
          <div style={PDF_CELL}>
            <p style={PDF_HINT}>Describa cada entregable. Si el pago está ligado al entregable, indique el porcentaje. La suma de los porcentajes con valor debe ser 100%.</p>
            {entregablesDetalle.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif' }}>
                <thead>
                  <tr style={{ backgroundColor: '#fde8e2' }}>
                    <th style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center', width: 32 }}>#</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '6px 10px', textAlign: 'left' }}>Descripción</th>
                    <th style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center', width: 90 }}>% Pago</th>
                  </tr>
                </thead>
                <tbody>
                  {entregablesDetalle.map((e: any, i: number) => (
                    <tr key={i}>
                      <td style={{ border: '1px solid #e5e7eb', padding: 6, textAlign: 'center', color: '#6B7280' }}>{i + 1}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: 6 }}>{e.descripcion}</td>
                      <td style={{ border: '1px solid #e5e7eb', padding: 6, textAlign: 'center' }}>
                        {e.sinPorcentaje || e.sin_porcentaje ? <em style={{ color: '#9CA3AF' }}>Sin %</em> : (e.porcentaje ? `${e.porcentaje}%` : EMPTY_DASH)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : EMPTY}
          </div>
        </div>
      </div>

      {/* ── SECCIÓN VI — Anexos — solo Invitación/TDR (en Directa vive en el punto 4.3) ── */}
      {!esDirecta && (
        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
          <SectionHeader title="VI. Anexos." />
          <div style={{ padding: '10px 20px', backgroundColor: '#fff8f7', borderBottom: '1px solid #fdd5c9' }}>
            <p style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic', fontFamily: 'Gabarito, sans-serif' }}>
              Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo.
            </p>
          </div>
          <div style={{ overflowX: 'auto', padding: '12px 16px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                  <th style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '8px', color: '#fff', width: 38, textAlign: 'center' }}>#</th>
                  <th style={{ border: '1px solid rgba(255,255,255,0.25)', padding: '8px', color: '#fff', textAlign: 'left' }}>Nombre del documento</th>
                </tr>
              </thead>
              <tbody>
                {anexosDocs.length > 0 ? anexosDocs.map((a: any, i: number) => (
                  <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ border: '1px solid #e5e7eb', padding: 6, textAlign: 'center', fontWeight: 700, color: '#374151' }}>{i + 1}</td>
                    <td style={{ border: '1px solid #e5e7eb', padding: 6 }}><AnexoItem a={a} /></td>
                  </tr>
                )) : (
                  <tr><td colSpan={2} style={{ border: '1px solid #e5e7eb', padding: 10, textAlign: 'center' }}>{EMPTY_DASH}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── SECCIÓN VII — Concepto Jurídico y Garantías ── */}
      <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={CARD}>
        <SectionHeader title="VII. Concepto Jurídico y Garantías." />
        {conceptoJuridicoBloque}
      </div>

    </div>
  );
}

/** Sección de solo lectura "Concepto Jurídico y Garantías" (la diligencia Jurídica). */
function SeccionConceptoJuridicoLectura({ solicitud: s }: { solicitud: any }) {
  const n1 = '7.1';
  const n2 = '7.2';
  const n3 = '7.3';
  const n31 = '7.3.1';
  const tieneRiesgos = s?.tiene_riesgos_juridicos === true;
  return (
    <>
      <DataRow label={`${n1} Concepto jurídico:`} value={s?.concepto_juridico} />
      <DataRow label={`${n2} Garantías:`} value={s?.garantias} />
      <DataRow
        label={`${n3} ¿Tiene riesgos jurídicos?:`}
        value={s?.tiene_riesgos_juridicos === true ? 'Sí' : s?.tiene_riesgos_juridicos === false ? 'No' : undefined}
        last={!tieneRiesgos}
      />
      {tieneRiesgos && (
        <DataRow label={`${n31} Riesgos:`} value={s?.riesgos_juridicos} last />
      )}
    </>
  );
}

/** Conveniencia: Parte 1 + Parte 2 seguidas, para vistas sin sección de Presupuesto propia que intercalar. */
export function DetallePlaneacionContractual({ solicitud }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <DetallePlaneacionContractualParte1 solicitud={solicitud} />
      <DetallePlaneacionContractualParte2 solicitud={solicitud} />
    </div>
  );
}
