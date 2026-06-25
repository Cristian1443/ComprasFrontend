import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Loader2, PencilLine } from 'lucide-react';
import { getPresupuestoCertificadoDisplay, getPresupuestoDisplayText } from '../../lib/formatPresupuesto';
import { getCausalComiteDisplay } from './DetalleSolicitudComite';
import { BloqueFirma } from '../shared/BloqueFirma';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface ParticipanteComite {
  nombre: string;
  cargo: string;
  representaA?: string;
  tipo?: 'asistente' | 'invitado';
  /** @deprecated usar `tipo` */
  esInvitado?: boolean;
}

export type DecisionActa = 'aprobada' | 'rechazada' | 'en_revision' | null;

export interface DecisionRegistroActa {
  discusion: string;
  decision: DecisionActa;
}

interface FirmanteConfig {
  rol_firma: string;
  nombre: string;
  cargo: string;
  activo: boolean;
}

interface ActaSesionComiteProps {
  ids: string[];
  participantes: ParticipanteComite[];
  actaNumero: string;
  fechaSesionISO?: string | null;
  discusionesPorId: Record<string, string>;
  decisionesPorId?: Record<string, DecisionRegistroActa>;
  /** ID de la primera solicitud del acta, usado como ancla para Adobe Sign */
  solicitudPrincipalId?: string;
  onBack: () => void;
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS GLOBALES DE IMPRESIÓN
══════════════════════════════════════════════════════════════ */
const printStyles = `
  @page {
    size: A4;
    margin: 0;
  }

  /* Previene subrayado del corrector ortográfico del navegador en el acta */
  #acta-contenido [data-spelling-error],
  #acta-contenido ::spelling-error {
    text-decoration: none !important;
  }
  #acta-contenido ol {
    list-style-type: decimal;
  }

  @media print {
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    [data-print="hide"] { display: none !important; }
    body, html { margin: 0 !important; background: #fff !important; }

    #acta-pagina {
      background: #fff !important;
      padding: 0 !important;
    }

    #acta-hoja {
      box-shadow: none !important;
      margin: 0 !important;
      width: 210mm !important;
      max-width: 210mm !important;
      min-height: 297mm !important;
      padding: 0 !important;
    }

    #acta-header-fixed {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
    }

    #acta-footer-fixed {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      z-index: 9999;
    }

    #acta-contenido {
      margin-top: 28mm;
      margin-bottom: 26mm;
      padding: 0 18mm;
    }

    #acta-header-fixed,
    #acta-footer-fixed { display: block !important; }
  }

  @media screen {
    #acta-header-fixed,
    #acta-footer-fixed { display: none; }
  }
`;

/* ══════════════════════════════════════════════════════════════
   ENCABEZADO INSTITUCIONAL — solo logo en esquina superior derecha
══════════════════════════════════════════════════════════════ */
function EncabezadoInstitucional() {
  return (
    <div style={sx.encabezadoWrap}>
      <img
        src="/logo-iib.png"
        alt="Invest in Bogotá"
        style={{ height: 62, width: 'auto', display: 'block' }}
      />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   PIE DE PÁGINA INSTITUCIONAL
   Izquierda: fotografía/ilustración de Bogotá
   Derecha: datos de contacto
   Abajo-izquierda: código del documento
══════════════════════════════════════════════════════════════ */
function PieInstitucional() {
  return (
    <div style={sx.pieWrap}>
      <div style={sx.pieFilaPrincipal}>
        {/* Silueta de Bogotá — filtro escala de grises para coincidir con el estilo del PDF */}
        <img
          src="/bogota_bg.png"
          alt="Bogotá"
          style={{
            height: 58,
            width: 190,
            display: 'block',
            flexShrink: 0,
            objectFit: 'cover',
            objectPosition: 'center top',
            filter: 'grayscale(100%) brightness(1.4) contrast(0.65) opacity(0.75)',
            borderRadius: 0,
          }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />

        {/* Datos de contacto */}
        <div style={sx.pieContacto}>
          <p style={sx.pieTitulo}>Agencia de promoción de inversión y eventos</p>
          <p style={sx.pieTexto}>Calle 67 # 8-32/44; piso 4; Bogotá, D.C.</p>
          <p style={sx.pieTexto}>(+57) 317 7806158.</p>
          <p style={sx.pieTexto}>www.investinbogota.org</p>
        </div>
      </div>

      {/* Código del documento — abajo izquierda */}
      <p style={sx.pieCodigo}>F13-PR-GD-01. V02.</p>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   COMPONENTE PRINCIPAL
══════════════════════════════════════════════════════════════ */
export function ActaSesionComite({
  ids,
  participantes,
  actaNumero,
  fechaSesionISO,
  discusionesPorId,
  decisionesPorId = {},
  solicitudPrincipalId,
  onBack,
}: ActaSesionComiteProps) {
  const [detalles, setDetalles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [firmantesApi, setFirmantesApi] = useState<FirmanteConfig[]>([]);
  const [desarrolloTexto, setDesarrolloTexto] = useState('');
  const [conclusionTexto, setConclusionTexto] = useState('');
  const [editandoDesarrollo, setEditandoDesarrollo] = useState(false);
  const [editandoConclusion, setEditandoConclusion] = useState(false);
  const desarrolloRef = useRef<HTMLTextAreaElement>(null);
  const conclusionRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const [solicitudes, firmantes] = await Promise.all([
          Promise.all(
            ids.map(async (id) => {
              const r = await fetch(`${API_URL}/api/solicitudes/${id}`);
              return r.ok ? r.json() : {};
            })
          ),
          fetch(`${API_URL}/api/configuracion/firmantes`).then((r) =>
            r.ok ? r.json() : []
          ),
        ]);
        if (mounted) {
          setDetalles(solicitudes);
          setFirmantesApi(
            (firmantes as FirmanteConfig[]).filter((f) => f.activo)
          );
        }
      } catch {
        if (mounted) setDetalles([]);
      } finally {
        if (mounted) setCargando(false);
      }
    };
    cargar();
    return () => { mounted = false; };
  }, [ids]);

  /* ── Fecha y hora ── */
  const fechaSesion = fechaSesionISO ? new Date(fechaSesionISO) : new Date();
  const fechaLarga = fechaSesion.toLocaleDateString('es-CO', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const hora = fechaSesion.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });

  /* ── Participantes ── */
  const asistentes = participantes.filter((p) =>
    p.tipo ? p.tipo === 'asistente' : !p.esInvitado
  );
  const invitados = participantes.filter((p) =>
    p.tipo ? p.tipo === 'invitado' : !!p.esInvitado
  );

  /* ── Firmantes: solo Directora de Comité y Secretaria de Comité ── */
  const ROLES_FIRMA = ['directora_comite', 'secretaria_comite'];
  const firmantes: { nombre: string; cargo: string }[] =
    firmantesApi.length > 0
      ? firmantesApi
          .filter((f) => ROLES_FIRMA.includes(f.rol_firma))
          .map((f) => ({ nombre: f.nombre, cargo: f.cargo }))
      : [
          { nombre: '___________________________', cargo: 'Directora de Comité' },
          { nombre: '___________________________', cargo: 'Secretaria de Comité' },
        ];

  /* ── Helpers ── */
  const getMontoTexto = (sol: any): string => {
    try {
      if (sol.presupuesto_aprobado) return getPresupuestoCertificadoDisplay(sol);
      return getPresupuestoDisplayText(sol);
    } catch {
      return sol.valor_estimado
        ? new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            maximumFractionDigits: 0,
          }).format(Number(sol.valor_estimado))
        : 'No registrado';
    }
  };

  const getPlazoTexto = (sol: any): string => {
    const meses = sol.plazo_ejecucion_meses ?? 0;
    const dias = sol.plazo_ejecucion_dias ?? 0;
    if (!meses && !dias) return 'No especificado';
    const p: string[] = [];
    if (meses) p.push(`${meses} mes${meses === 1 ? '' : 'es'}`);
    if (dias) p.push(`${dias} día${dias === 1 ? '' : 's'}`);
    return p.join(' y ');
  };

  const getDecisionParrafo = (decision: DecisionActa): string => {
    if (decision === 'rechazada')
      return 'En consecuencia, los miembros del Comité no recomiendan a la directora ejecutiva avanzar con este proceso, y dejan constancia de que no presentan conflicto de interés frente a la decisión.';
    if (decision === 'en_revision')
      return 'En consecuencia, los miembros del Comité solicitan una revisión adicional antes de emitir una recomendación definitiva, y dejan constancia de que no presentan conflicto de interés frente a la decisión.';
    return 'En consecuencia, los miembros del Comité, de forma unánime, recomiendan a la directora ejecutiva avanzar con este proceso y dejan constancia de que no presentan conflicto de interés frente a la decisión.';
  };

  /* ── Cargando ── */
  if (cargando) {
    return (
      <div style={sx.loadingWrap}>
        <Loader2 className="animate-spin" size={36} color="#E84922" />
        <p style={sx.loadingText}>Preparando acta del comité...</p>
      </div>
    );
  }

  const fechaCapitalizada = fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1);

  return (
    <div id="acta-pagina" style={sx.pagina}>
      <style>{printStyles}</style>

      {/* ══ ENCABEZADO FIJO (sólo impresión) ══ */}
      <div id="acta-header-fixed">
        <EncabezadoInstitucional />
      </div>

      {/* ══ PIE FIJO (sólo impresión) ══ */}
      <div id="acta-footer-fixed">
        <PieInstitucional />
      </div>

      {/* ══ TOOLBAR (oculto al imprimir) ══ */}
      <div data-print="hide" style={sx.toolbar}>
        <button onClick={onBack} style={sx.btnVolver}>
          <ArrowLeft size={15} /> Volver
        </button>
        <button onClick={() => window.print()} style={sx.btnImprimir}>
          <Printer size={15} /> Imprimir / Guardar PDF
        </button>
      </div>

      {/* ══ FIRMA ELECTRÓNICA (oculto al imprimir) ══ */}
      {solicitudPrincipalId && (
        <div data-print="hide" style={sx.firmaWrap}>
          <BloqueFirma
            solicitudId={solicitudPrincipalId}
            etapa="comite"
            descripcion="El acta de comité debe ser firmada electrónicamente por la Directora y la Secretaria del Comité de Contratación."
            payloadIniciar={{
              actaNumero,
              fechaSesion: fechaSesionISO ?? new Date().toISOString(),
              participantes,
              solicitudesMultiples: ids.map((id) => ({
                id,
                discusion: discusionesPorId[id] ?? '',
                decision: decisionesPorId[id]?.decision ?? 'aprobada',
              })),
            }}
          />
        </div>
      )}

      {/* ══ HOJA A4 ══ */}
      <div id="acta-hoja" style={sx.hoja}>

        {/* Encabezado institucional — pantalla */}
        <div data-print="hide">
          <EncabezadoInstitucional />
        </div>

        {/* ══ CONTENIDO ══ */}
        {/* spellCheck false evita que el corrector del navegador subraye el texto del acta */}
        <div id="acta-contenido" style={sx.contenido} spellCheck={false}>

          {/* ── TÍTULO DEL ACTA ── */}
          <p style={sx.tituloActa}>ACTA No. {actaNumero} COMITÉ DE CONTRATACIÓN</p>
          <p style={sx.subtituloActa}>
            REUNIÓN DEL COMITÉ DE CONTRATACIÓN DE LA CORPORACIÓN PARA EL DESARROLLO Y
            LA PRODUCTIVIDAD BOGOTÁ REGIÓN - REGIÓN DINÁMICA - INVEST IN BOGOTÁ
          </p>

          {/* ── PÁRRAFO DE APERTURA ── */}
          <p style={sx.p}>
            En la ciudad de Bogotá, el {fechaCapitalizada}, siendo las {hora}, se reunió el
            Comité de Contratación de la Corporación para el Desarrollo y la Productividad,
            Bogotá - Región Invest in Bogotá (en adelante, IIB), de manera presencial.
            Esta sesión se llevó a cabo previa convocatoria de la Jefe Administrativa y de
            Talento Humano delegada por la Directora Ejecutiva, conforme a lo dispuesto en
            la Política de Compras y Contratación.
          </p>

          {/* ── ASISTENTES ── */}
          {asistentes.length > 0 && (
            <div style={sx.participantesBloque}>
              <p style={sx.participantesLabel}>Asistentes:</p>
              {asistentes.map((p, i) => (
                <p key={i} style={sx.pParticipante}>
                  {p.nombre} – {p.cargo}
                  {p.representaA ? ` (en representación de ${p.representaA})` : ''}
                </p>
              ))}
            </div>
          )}

          {/* ── INVITADOS ── */}
          {invitados.length > 0 && (
            <div style={sx.participantesBloque}>
              <p style={sx.participantesLabel}>Invitados:</p>
              {invitados.map((p, i) => (
                <p key={i} style={sx.pParticipante}>
                  {p.nombre} – {p.cargo}
                </p>
              ))}
            </div>
          )}

          {/* ── ORDEN DEL DÍA ── */}
          <ol style={sx.olOrden}>
            <li style={sx.liOrden}>Orden del día</li>
            <li style={sx.liOrden}>Contexto y discusión caso</li>
            <li style={sx.liOrden}>Conclusión y cierre</li>
          </ol>

          {/* ── DESARROLLO ── */}
          <p style={sx.seccionBold}>Desarrollo:</p>

          {/* Texto libre de desarrollo */}
          {editandoDesarrollo ? (
            <div data-print="hide" style={{ marginBottom: 12 }}>
              <textarea
                ref={desarrolloRef}
                value={desarrolloTexto}
                onChange={(e) => setDesarrolloTexto(e.target.value)}
                placeholder="Escribe aquí el desarrollo general de la sesión (observaciones previas, acuerdos generales, etc.)"
                style={sx.editArea}
                autoFocus
              />
              <button
                data-print="hide"
                onClick={() => setEditandoDesarrollo(false)}
                style={sx.btnGuardar}
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              {desarrolloTexto.trim()
                ? desarrolloTexto
                    .split(/\n{2,}|\n/)
                    .filter((par) => par.trim())
                    .map((parr, i) => (
                      <p key={i} style={sx.p}>{parr.trim()}</p>
                    ))
                : null}
              <button
                data-print="hide"
                onClick={() => {
                  setEditandoDesarrollo(true);
                  setTimeout(() => desarrolloRef.current?.focus(), 50);
                }}
                style={sx.btnEditarTexto}
              >
                <PencilLine size={13} />
                {desarrolloTexto.trim() ? 'Editar desarrollo' : 'Agregar desarrollo de la sesión'}
              </button>
            </>
          )}

          {/* Lista resumen de solicitudes */}
          <ol style={sx.olOrden}>
            {detalles.map((sol, i) => (
              <li key={i} style={sx.liOrden}>
                {sol.titulo_contrato || sol.objeto || `Solicitud ${i + 1}`}
              </li>
            ))}
          </ol>

          {/* ── BLOQUES POR SOLICITUD ── */}
          {detalles.map((sol, idx) => {
            const solId = String(sol.id || ids[idx] || '');
            const discusion = String(discusionesPorId[solId] || '').trim();
            const decision = decisionesPorId[solId]?.decision ?? null;
            const contexto = (
              sol.justificacion ||
              sol.descripcion_necesidad_detalle ||
              ''
            ).trim();
            const origenPpto =
              sol.rubro || sol.rubro_presupuestal || sol.gerencia_nombre || 'N/A';
            const causal = getCausalComiteDisplay(sol) || 'No registrada';
            const supervisor = sol.supervision_nombre || sol.solicitante_nombre || 'N/A';

            return (
              <div key={solId || idx} style={sx.bloquesSol}>
                {/* Número de solicitud */}
                <p style={sx.solNumero}>Solicitud N. {idx + 1}</p>

                {/* Nombre del proceso */}
                <p style={sx.solObjeto}>{sol.titulo_contrato || sol.objeto || 'Sin objeto registrado'}</p>

                {/* Ficha técnica — formato bold label + valor */}
                <div style={sx.fichaData}>
                  <p style={sx.pFicha}>
                    <strong>Monto:</strong>&nbsp;&nbsp;{getMontoTexto(sol)}
                  </p>
                  <p style={sx.pFicha}>
                    <strong>Plazo:</strong>&nbsp;{getPlazoTexto(sol)}
                  </p>
                  <p style={sx.pFicha}>
                    <strong>Origen de PPTO:</strong>&nbsp;{origenPpto}
                  </p>
                  <p style={sx.pFicha}>
                    <strong>Supervisor Contrato:</strong>&nbsp;{supervisor}
                  </p>
                  <p style={sx.pFicha}>
                    <strong>Causal de contratación:</strong>&nbsp;{causal}
                  </p>
                </div>

                {/* Contexto */}
                <p style={sx.subHeader}>Contexto y descripción de la necesidad:</p>
                <p style={sx.p}>{contexto || 'Sin descripción registrada.'}</p>

                {/* Discusión */}
                <p style={sx.subHeader}>Discusión</p>
                <p style={sx.p}>{discusion || '—'}</p>

              </div>
            );
          })}

          {/* ── CONCLUSIÓN Y CIERRE ── */}
          <div style={sx.seccionHeaderOrden}>
            <p style={sx.seccionCierre}>2.&nbsp;&nbsp;&nbsp;Conclusión y cierre</p>
          </div>

          {editandoConclusion ? (
            <div data-print="hide" style={{ marginBottom: 12 }}>
              <textarea
                ref={conclusionRef}
                value={conclusionTexto}
                onChange={(e) => setConclusionTexto(e.target.value)}
                placeholder="Escribe aquí el texto de conclusión de la sesión..."
                style={sx.editArea}
                autoFocus
              />
              <button
                data-print="hide"
                onClick={() => setEditandoConclusion(false)}
                style={sx.btnGuardar}
              >
                Listo
              </button>
            </div>
          ) : (
            <>
              {conclusionTexto.trim() ? (
                conclusionTexto
                  .split(/\n{2,}|\n/)
                  .filter((par) => par.trim())
                  .map((parr, i) => (
                    <p key={i} style={sx.p}>{parr.trim()}</p>
                  ))
              ) : null}
              <button
                data-print="hide"
                onClick={() => {
                  setEditandoConclusion(true);
                  setTimeout(() => conclusionRef.current?.focus(), 50);
                }}
                style={sx.btnEditarTexto}
              >
                <PencilLine size={13} />
                {conclusionTexto.trim() ? 'Editar conclusión' : 'Personalizar conclusión'}
              </button>
            </>
          )}

          {/* Lista aprobadas */}
          <ol style={sx.olOrden}>
            {detalles.map((sol, idx) => (
              <li key={idx} style={sx.liOrden}>
                {sol.objeto || `Solicitud ${idx + 1}`}
              </li>
            ))}
          </ol>

          {/* ── FIRMAS ── */}
          <p style={{ ...sx.p, marginTop: 24, marginBottom: 16 }}>
            En constancia firman:
          </p>

          <div style={{ ...sx.sigGrid, gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {firmantes.map((f, i) => (
              <div key={i} style={sx.sigBloque}>
                <div style={sx.sigEspacio} />
                <div style={sx.sigLinea} />
                <p style={sx.sigNombre}>{f.nombre}</p>
                <p style={sx.sigCargo}>{f.cargo}</p>
              </div>
            ))}
          </div>

          {/* Footer de pantalla */}
          <div data-print="hide" style={{ marginTop: 32 }}>
            <PieInstitucional />
          </div>
        </div>
        {/* /acta-contenido */}
      </div>
      {/* /acta-hoja */}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   ESTILOS
══════════════════════════════════════════════════════════════ */
const sx: Record<string, React.CSSProperties> = {
  /* ─── Página ─── */
  pagina: {
    minHeight: '100vh',
    background: '#e5e7eb',
    paddingBottom: 48,
    fontFamily: "'Calibri', 'Carlito', Arial, sans-serif",
  },

  /* ─── Toolbar ─── */
  toolbar: {
    maxWidth: '210mm',
    margin: '0 auto',
    padding: '14px 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  btnVolver: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: '1px solid #d1d5db',
    borderRadius: 8,
    background: '#fff',
    padding: '8px 14px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
    color: '#374151',
  },
  btnImprimir: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    border: 'none',
    borderRadius: 8,
    background: '#E84922',
    color: '#fff',
    padding: '8px 18px',
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 13,
  },

  /* ─── Hoja A4 ─── */
  hoja: {
    maxWidth: '210mm',
    margin: '0 auto',
    background: '#ffffff',
    minHeight: '297mm',
    boxShadow: '0 4px 24px rgba(0,0,0,0.18)',
    boxSizing: 'border-box' as const,
    overflow: 'hidden',
  },

  /* ─── Contenido ─── */
  contenido: {
    padding: '16px 18mm 20px',
  },

  /* ─── ENCABEZADO INSTITUCIONAL ─── */
  encabezadoWrap: {
    background: '#fff',
    display: 'flex',
    justifyContent: 'flex-end',
    padding: '12px 18mm 6px',
  },

  /* ─── PIE INSTITUCIONAL ─── */
  pieWrap: {
    background: '#fff',
    padding: '4px 18mm 0',
  },
  pieFilaPrincipal: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  pieContacto: {
    textAlign: 'right' as const,
    flexShrink: 0,
  },
  pieTitulo: {
    margin: 0,
    fontSize: 8,
    fontWeight: 700,
    color: '#E84922',
    lineHeight: 1.5,
  },
  pieTexto: {
    margin: 0,
    fontSize: 8,
    color: '#374151',
    lineHeight: 1.5,
  },
  pieCodigo: {
    margin: '3px 0 3px',
    fontSize: 7.5,
    color: '#6b7280',
    lineHeight: 1.4,
  },

  /* ─── Títulos del acta ─── */
  tituloActa: {
    margin: '20px 0 8px',
    fontSize: 13,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    lineHeight: 1.45,
    letterSpacing: '0.3px',
  },
  subtituloActa: {
    margin: '0 0 16px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    lineHeight: 1.5,
    letterSpacing: '0.1px',
  },

  /* ─── Sección con número (Conclusión y cierre) ─── */
  seccionHeaderOrden: {
    marginTop: 18,
    marginBottom: 6,
  },
  seccionBold: {
    margin: '18px 0 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    lineHeight: 1.4,
  },
  /* Conclusión y cierre: negrita sin subrayado (numerado como ítem de lista) */
  seccionCierre: {
    margin: '20px 0 8px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    lineHeight: 1.4,
  },

  /* ─── Asistentes / Invitados ─── */
  participantesBloque: {
    margin: '8px 0 12px',
  },
  participantesLabel: {
    margin: '0 0 4px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    lineHeight: 1.5,
  },
  pParticipante: {
    margin: '0 0 3px',
    fontSize: 11,
    lineHeight: 1.55,
    color: '#000000',
  },

  /* ─── Orden del día / listas numeradas ─── */
  olOrden: {
    margin: '4px 0 12px 8px',
    paddingLeft: 24,
    listStyleType: 'decimal',
  },
  liOrden: {
    fontSize: 11,
    lineHeight: 1.65,
    color: '#000000',
  },

  /* ─── Bloques por solicitud ─── */
  bloquesSol: {
    margin: '20px 0 0',
    pageBreakInside: 'avoid' as const,
    breakInside: 'avoid' as const,
  },
  solNumero: {
    margin: '0 0 6px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    lineHeight: 1.4,
  },
  solObjeto: {
    margin: '0 0 10px',
    fontSize: 11,
    fontWeight: 700,
    color: '#000000',
    lineHeight: 1.4,
  },

  /* Ficha técnica — etiquetas bold inline */
  fichaData: {
    margin: '0 0 10px',
  },
  pFicha: {
    margin: '0 0 3px',
    fontSize: 11,
    lineHeight: 1.55,
    color: '#000000',
  },

  /* ─── Sub encabezados dentro de solicitud ─── */
  subHeader: {
    fontSize: 11,
    fontWeight: 700,
    margin: '12px 0 4px',
    color: '#000000',
    lineHeight: 1.4,
  },

  /* ─── Texto corrido ─── */
  p: {
    fontSize: 11,
    lineHeight: 1.6,
    margin: '0 0 8px',
    color: '#000000',
    textAlign: 'justify' as const,
    overflowWrap: 'break-word' as const,
    wordBreak: 'break-word' as const,
  },

  /* ─── Edición de texto libre ─── */
  editArea: {
    width: '100%',
    minHeight: 120,
    padding: '8px 10px',
    fontSize: 10.5,
    fontFamily: "'Calibri', Arial, sans-serif",
    border: '1px solid #E84922',
    borderRadius: 6,
    resize: 'vertical' as const,
    outline: 'none',
    lineHeight: 1.6,
    color: '#111827',
    boxSizing: 'border-box' as const,
    overflowWrap: 'break-word' as const,
    wordBreak: 'break-word' as const,
    whiteSpace: 'pre-wrap' as const,
  },
  btnGuardar: {
    marginTop: 6,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '5px 16px',
    fontSize: 11,
    fontWeight: 600,
    border: 'none',
    borderRadius: 5,
    background: '#E84922',
    color: '#fff',
    cursor: 'pointer',
  },
  btnEditarTexto: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    fontSize: 10,
    fontWeight: 500,
    border: '1px dashed #E84922',
    borderRadius: 5,
    background: 'transparent',
    color: '#E84922',
    cursor: 'pointer',
    marginTop: 4,
    marginBottom: 6,
  },

  /* ─── Firmas ─── */
  sigGrid: {
    display: 'grid',
    gap: '8px 40px',
    marginTop: 20,
    marginBottom: 24,
  },
  sigBloque: {
    minHeight: 90,
  },
  sigEspacio: {
    height: 52,
  },
  sigLinea: {
    borderTop: '1.5px solid #1f2937',
    marginBottom: 5,
  },
  sigNombre: {
    margin: '2px 0 0',
    fontWeight: 700,
    fontSize: 11,
    color: '#000000',
  },
  sigCargo: {
    margin: '1px 0 0',
    fontSize: 11,
    color: '#000000',
  },

  /* ─── Bloque de firma ─── */
  firmaWrap: {
    maxWidth: '210mm',
    margin: '0 auto 24px',
    padding: '0 16px',
  },

  /* ─── Loading ─── */
  loadingWrap: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    background: '#f8fafc',
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    margin: 0,
    fontWeight: 600,
  },
};
