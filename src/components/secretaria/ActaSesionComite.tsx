import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Loader2, PencilLine, Lock } from 'lucide-react';
import { getPresupuestoCertificadoDisplay, getPresupuestoDisplayText } from '../../lib/formatPresupuesto';
import { getCausalComiteDisplay } from './DetalleSolicitudComite';
import { BloqueFirma } from '../shared/BloqueFirma';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

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
  /** ID del registro en actas_comite para persistir textos libres */
  actaId?: string;
  desarrolloInicial?: string;
  conclusionInicial?: string;
  desarrolloCerradoInicial?: boolean;
  conclusionCerradaInicial?: boolean;
  /** Firmantes propios de esta acta (pueden variar de una sesión a otra) */
  firmanteDirectoraNombreInicial?: string;
  firmanteDirectoraCargoInicial?: string;
  firmanteSecretariaNombreInicial?: string;
  firmanteSecretariaCargoInicial?: string;
  /** Fecha en la que el acta quedó firmada electrónicamente (null = pendiente) */
  cerradaEnInicial?: string | null;
  /** Si true, oculta los botones de edición (vista de historial) */
  soloLectura?: boolean;
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
        src="/logo-iib-oficial.png"
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
        {/* Silueta de Bogotá — ilustración institucional del pie de página oficial */}
        <img
          src="/bogota-skyline.png"
          alt="Bogotá"
          style={{
            height: 58,
            width: 'auto',
            display: 'block',
            flexShrink: 0,
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
  actaId,
  desarrolloInicial = '',
  conclusionInicial = '',
  desarrolloCerradoInicial = false,
  conclusionCerradaInicial = false,
  firmanteDirectoraNombreInicial = '',
  firmanteDirectoraCargoInicial = '',
  firmanteSecretariaNombreInicial = '',
  firmanteSecretariaCargoInicial = '',
  cerradaEnInicial = null,
  soloLectura = false,
  onBack,
}: ActaSesionComiteProps) {
  const [detalles, setDetalles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [firmantesApi, setFirmantesApi] = useState<FirmanteConfig[]>([]);
  const [desarrolloTexto, setDesarrolloTexto] = useState(desarrolloInicial);
  const [conclusionTexto, setConclusionTexto] = useState(conclusionInicial);
  const [editandoDesarrollo, setEditandoDesarrollo] = useState(false);
  const [editandoConclusion, setEditandoConclusion] = useState(false);
  const [desarrolloCerrado, setDesarrolloCerrado] = useState(desarrolloCerradoInicial);
  const [conclusionCerrada, setConclusionCerrada] = useState(conclusionCerradaInicial);
  const [guardando, setGuardando] = useState<'desarrollo' | 'conclusion' | null>(null);
  const [cerradaEn, setCerradaEn] = useState<string | null>(cerradaEnInicial);
  const desarrolloRef = useRef<HTMLTextAreaElement>(null);
  const conclusionRef = useRef<HTMLTextAreaElement>(null);

  const guardarTexto = async (
    campo: 'desarrollo' | 'conclusion',
    texto: string
  ) => {
    if (!actaId) return;
    setGuardando(campo);
    try {
      await apiFetch(`${API_URL}/api/secretaria/actas/${actaId}/textos`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          campo === 'desarrollo'
            ? { desarrollo_texto: texto, cerrar_desarrollo: true }
            : { conclusion_texto: texto, cerrar_conclusion: true }
        ),
      });
      if (campo === 'desarrollo') setDesarrolloCerrado(true);
      else setConclusionCerrada(true);
    } catch { /* no-op */ }
    setGuardando(null);
  };

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const [solicitudes, firmantes] = await Promise.all([
          Promise.all(
            ids.map(async (id) => {
              const r = await apiFetch(`${API_URL}/api/solicitudes/${id}`);
              return r.ok ? r.json() : {};
            })
          ),
          apiFetch(`${API_URL}/api/configuracion/firmantes`).then((r) =>
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

  /* ── Firmantes: Directora y Secretaria de este comité en particular.
     Se editan por acta porque las personas en esos cargos pueden cambiar
     de una sesión a otra (ver botón "Editar firmantes" más abajo). ── */
  const directoraGlobal = firmantesApi.find((f) => f.rol_firma === 'directora_comite');
  const secretariaGlobal = firmantesApi.find((f) => f.rol_firma === 'secretaria_comite');
  const firmantes: { nombre: string; cargo: string }[] = [
    {
      nombre: firmanteDirectoraNombreInicial || directoraGlobal?.nombre || '___________________________',
      cargo: firmanteDirectoraCargoInicial || directoraGlobal?.cargo || 'Directora de Comité',
    },
    {
      nombre: firmanteSecretariaNombreInicial || secretariaGlobal?.nombre || '___________________________',
      cargo: firmanteSecretariaCargoInicial || secretariaGlobal?.cargo || 'Secretaria de Comité',
    },
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
      <div
        data-print="hide"
        style={{
          margin: '0 auto 16px', maxWidth: 820, padding: '12px 18px', borderRadius: 12,
          fontSize: '0.85rem', fontWeight: 700,
          ...(cerradaEn
            ? { background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }
            : { background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }),
        }}
      >
        {cerradaEn
          ? `✅ Acta cerrada — firmada electrónicamente el ${new Date(cerradaEn).toLocaleString('es-CO')}.`
          : '⚠ Acta pendiente de firma electrónica — no se considera cerrada hasta que la Directora y la Secretaria del Comité completen la firma en Adobe Sign.'}
      </div>

      {solicitudPrincipalId && (
        <div data-print="hide" style={sx.firmaWrap}>
          <BloqueFirma
            solicitudId={solicitudPrincipalId}
            etapa="comite"
            descripcion="El acta de comité debe ser firmada electrónicamente por la Directora y la Secretaria del Comité de Contratación."
            payloadIniciar={{
              actaId,
              actaNumero,
              fechaSesion: fechaSesionISO ?? new Date().toISOString(),
              participantes,
              solicitudesMultiples: ids.map((id) => ({
                id,
                discusion: discusionesPorId[id] ?? '',
                decision: decisionesPorId[id]?.decision ?? 'aprobada',
              })),
            }}
            onFirmaCompleta={() => setCerradaEn(new Date().toISOString())}
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
                onClick={async () => {
                  await guardarTexto('desarrollo', desarrolloTexto);
                  setEditandoDesarrollo(false);
                }}
                style={sx.btnGuardar}
                disabled={guardando === 'desarrollo'}
              >
                {guardando === 'desarrollo'
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : 'Guardar y cerrar'}
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
              {!soloLectura && (desarrolloCerrado ? (
                <div data-print="hide" style={sx.cerradoBadge}>
                  <Lock size={12} />
                  Desarrollo cerrado — no editable
                </div>
              ) : (
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
              ))}
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
              sol.rubro || sol.rubro_presupuestal || nombreGerenciaCompleto(sol.gerencia_nombre) || 'N/A';
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
                onClick={async () => {
                  await guardarTexto('conclusion', conclusionTexto);
                  setEditandoConclusion(false);
                }}
                style={sx.btnGuardar}
                disabled={guardando === 'conclusion'}
              >
                {guardando === 'conclusion'
                  ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Guardando...</>
                  : 'Guardar y cerrar'}
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
              {!soloLectura && (conclusionCerrada ? (
                <div data-print="hide" style={sx.cerradoBadge}>
                  <Lock size={12} />
                  Conclusión cerrada — no editable
                </div>
              ) : (
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
              ))}
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
    justifyContent: 'center',
    gap: 20,
  },
  pieContacto: {
    textAlign: 'left' as const,
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
    margin: '3px 0 3px -16mm',
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
  cerradoBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '3px 10px',
    fontSize: 10,
    fontWeight: 600,
    border: '1px solid #D1D5DB',
    borderRadius: 5,
    background: '#F3F4F6',
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 6,
  },

  /* ─── Edición de firmantes ─── */
  firmantesEditWrap: {
    border: '1px solid #E84922',
    borderRadius: 8,
    padding: 14,
    marginBottom: 16,
    background: '#FFF7F5',
  },
  firmanteEditFila: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  firmanteEditLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    color: '#111827',
  },
  firmanteInput: {
    padding: '6px 8px',
    fontSize: 11,
    fontFamily: "'Calibri', Arial, sans-serif",
    border: '1px solid #d1d5db',
    borderRadius: 5,
    outline: 'none',
    color: '#111827',
    boxSizing: 'border-box' as const,
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
