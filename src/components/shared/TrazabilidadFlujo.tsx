import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  XCircle,
  Loader2,
  CircleDashed,
  History,
  FileDown,
  PenLine,
} from 'lucide-react';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type SolicitudFlujo = Record<string, any>;

type EstadoEtapa = 'aprobado' | 'rechazado' | 'pendiente' | 'en_proceso' | 'no_aplica';

interface EtapaFlujo {
  clave: string;
  titulo: string;
  rol: string;
  persona: string | null;
  fecha: string | null;
  estado: EstadoEtapa;
  comentario?: string | null;
}

const formatearFechaHora = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fecha = d.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  const hora = d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${fecha} · ${hora}`;
};

const ESTADO_META: Record<
  EstadoEtapa,
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  aprobado: { label: 'Aprobado', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle2 },
  rechazado: { label: 'Rechazado', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D', Icon: Clock },
  en_proceso: { label: 'En proceso', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', Icon: Loader2 },
  no_aplica: { label: 'No aplica', color: '#475569', bg: '#F1F5F9', border: '#E2E8F0', Icon: CircleDashed },
};

/** Orden real del flujo: Solicitante → Gerente → Financiera → Comité → Jurídica */
const ORDEN_ESTADOS = [
  'borrador',
  'enviado_gerente',
  'rechazado_gerente',
  'aprobado_gerente',
  'en_financiera',
  'rechazado_financiera',
  'aprobado_financiera',
  'en_juridica',
  'rechazado_juridica',
  'aprobado_juridica',
  'contratado',
  'cerrado',
];

function llegoA(estadoActual: string, umbral: string): boolean {
  const a = ORDEN_ESTADOS.indexOf(estadoActual);
  const b = ORDEN_ESTADOS.indexOf(umbral);
  if (a < 0 || b < 0) return false;
  return a >= b;
}

function esInvitacion(solicitud: SolicitudFlujo): boolean {
  return String(solicitud?.modalidad || '').toLowerCase().includes('invitaci');
}

function estadoComite(solicitud: SolicitudFlujo, estado: string): EstadoEtapa {
  // Invitación no pasa por Comité: Riesgos (si aplica) devuelve directo a Jurídica.
  if (esInvitacion(solicitud)) return 'no_aplica';
  const r = String(solicitud?.resultado_comite || '').toLowerCase();
  if (r === 'aprobado') return 'aprobado';
  if (r === 'rechazado') return 'rechazado';
  if (r === 'en_revision') return 'en_proceso';
  if (estado === 'en_comite') return 'en_proceso';
  if (llegoA(estado, 'aprobado_financiera') && !r) return 'en_proceso';
  return 'pendiente';
}

function estadoRiesgos(solicitud: SolicitudFlujo, estado: string): EstadoEtapa {
  if (estado === 'en_riesgos') return 'en_proceso';
  if (estado === 'rechazado_riesgos') return 'rechazado';
  if (solicitud?.fecha_respuesta_riesgos) return 'aprobado';
  return 'pendiente';
}

function estadoJuridica(solicitud: SolicitudFlujo, estado: string): EstadoEtapa {
  if (estado === 'rechazado_juridica') return 'rechazado';
  if (solicitud?.fecha_respuesta_juridica || estado === 'aprobado_juridica') return 'aprobado';
  if (estado === 'en_juridica') return 'en_proceso';
  const comiteOk = String(solicitud?.resultado_comite || '').toLowerCase() === 'aprobado';
  if (comiteOk && !solicitud?.fecha_respuesta_juridica) return 'pendiente';
  if (llegoA(estado, 'aprobado_juridica')) return 'aprobado';
  return 'pendiente';
}

export function construirEtapasFlujo(solicitud: SolicitudFlujo): EtapaFlujo[] {
  const estado = String(solicitud?.estado || '').toLowerCase();
  const etapas: EtapaFlujo[] = [];

  etapas.push({
    clave: 'solicitante',
    titulo: 'Solicitud creada',
    rol: 'Solicitante',
    persona: solicitud?.solicitante_nombre || null,
    fecha: solicitud?.creado_en || null,
    estado: 'aprobado',
    comentario: solicitud?.gerencia_nombre ? `Gerencia: ${nombreGerenciaCompleto(solicitud.gerencia_nombre)}` : null,
  });

  etapas.push({
    clave: 'gerente',
    titulo: 'Aprobación Gerente de Área',
    rol: 'Gerente',
    // Si se devolvió y volvió a enviarse, la fecha/nombre/comentario de la decisión anterior
    // siguen en la solicitud — por eso "en curso" se evalúa antes que "ya tiene fecha".
    persona: estado === 'enviado_gerente' ? null : (solicitud?.gerente_nombre || null),
    fecha: estado === 'enviado_gerente' ? null : (solicitud?.fecha_respuesta_gerente || null),
    estado:
      estado === 'enviado_gerente'
        ? 'en_proceso'
        : (estado === 'rechazado_gerente' || estado === 'devuelto_al_solicitante')
        ? 'rechazado'
        : solicitud?.fecha_respuesta_gerente
        ? 'aprobado'
        : llegoA(estado, 'aprobado_gerente')
        ? 'aprobado'
        : 'pendiente',
    comentario: estado === 'enviado_gerente' ? null : (solicitud?.comentario_gerente || null),
  });

  etapas.push({
    clave: 'financiera',
    titulo: 'Aprobación Financiera',
    rol: 'Financiera',
    persona: estado === 'en_financiera' ? null : (solicitud?.financiera_nombre || null),
    fecha: estado === 'en_financiera' ? null : (solicitud?.fecha_respuesta_financiera || null),
    estado:
      estado === 'en_financiera'
        ? 'en_proceso'
        : estado === 'rechazado_financiera'
        ? 'rechazado'
        : solicitud?.fecha_respuesta_financiera
        ? 'aprobado'
        : llegoA(estado, 'aprobado_financiera')
        ? 'aprobado'
        : 'pendiente',
    comentario: estado === 'en_financiera' ? null : (solicitud?.comentario_financiera || null),
  });

  if (solicitud?.tiene_riesgos_juridicos === true) {
    etapas.push({
      clave: 'riesgos',
      titulo: 'Evaluación de Riesgos',
      rol: 'Riesgos',
      persona: solicitud?.riesgos_nombre || null,
      fecha: solicitud?.fecha_respuesta_riesgos || null,
      estado: estadoRiesgos(solicitud, estado),
      comentario: solicitud?.comentario_riesgos || null,
    });
  }

  etapas.push({
    clave: 'comite',
    titulo: 'Decisión Comité de Contratación',
    rol: 'Secretaría Comité',
    persona:
      solicitud?.comite_aprobador_nombre ||
      solicitud?.comite_secretaria_nombre ||
      null,
    fecha: solicitud?.fecha_comite_decision || null,
    estado: estadoComite(solicitud, estado),
    comentario: solicitud?.comentario_comite || null,
  });

  etapas.push({
    clave: 'juridica',
    titulo: 'Revisión Jurídica',
    rol: 'Jurídica',
    persona: solicitud?.juridica_nombre || null,
    fecha: solicitud?.fecha_respuesta_juridica || null,
    estado: estadoJuridica(solicitud, estado),
    comentario: solicitud?.comentario_juridica || null,
  });

  return etapas;
}

export interface TrazabilidadFlujoProps {
  solicitud: SolicitudFlujo;
  /** Variante visual: 'card' (con borde y sombra) o 'flat' (sin contenedor). */
  variant?: 'card' | 'flat';
  /** Si se proveen IDs, los eventos del flujo aparecerán filtrados. */
  className?: string;
  /** Título personalizable (por defecto: "Trazabilidad del flujo de aprobación"). */
  titulo?: string;
  /** Subtítulo personalizable. */
  subtitulo?: string;
}

export function TrazabilidadFlujo({
  solicitud,
  variant = 'card',
  className,
  titulo = 'Trazabilidad del flujo de aprobación',
  subtitulo = 'Registro cronológico de aprobaciones, revisiones y decisiones sobre esta solicitud.',
}: TrazabilidadFlujoProps) {
  const etapas = construirEtapasFlujo(solicitud);
  const [firmasPorEtapa, setFirmasPorEtapa] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!solicitud?.id) return;
    let cancel = false;
    (async () => {
      try {
        const r = await apiFetch(`${API_URL}/api/solicitudes/${solicitud.id}/firmas`);
        if (!r.ok) return;
        const lista = await r.json();
        if (cancel) return;
        const map: Record<string, any> = {};
        for (const f of lista) map[f.etapa] = f;
        setFirmasPorEtapa(map);
      } catch { /* no-op */ }
    })();
    return () => { cancel = true; };
  }, [solicitud?.id]);

  if (etapas.length === 0) return null;

  const wrapStyle: React.CSSProperties = variant === 'card' ? s.wrapCard : s.wrapFlat;

  return (
    <section style={wrapStyle} className={className}>
      <header style={s.header}>
        <div style={s.headerIcon}>
          <History size={16} />
        </div>
        <div>
          <p style={s.title}>{titulo}</p>
          <p style={s.subtitle}>{subtitulo}</p>
        </div>
      </header>

      <ol style={s.list}>
        {etapas.map((etapa, idx) => {
          const meta = ESTADO_META[etapa.estado];
          const Icon = meta.Icon;
          const fechaTexto = formatearFechaHora(etapa.fecha);
          const esUltimo = idx === etapas.length - 1;
          return (
            <li key={etapa.clave} style={s.item}>
              <div style={s.left}>
                <span
                  style={{
                    ...s.bullet,
                    background: meta.bg,
                    border: `2px solid ${meta.border}`,
                    color: meta.color,
                  }}
                >
                  <Icon
                    size={14}
                    style={etapa.estado === 'en_proceso' ? { animation: 'spin 1.2s linear infinite' } : undefined}
                  />
                </span>
                {!esUltimo && <span style={s.line} aria-hidden />}
              </div>
              <div style={s.card}>
                <div style={s.row1}>
                  <p style={s.etapa}>{etapa.titulo}</p>
                  <span
                    style={{
                      ...s.badge,
                      color: meta.color,
                      background: meta.bg,
                      borderColor: meta.border,
                    }}
                  >
                    {meta.label}
                  </span>
                </div>
                <div style={s.row2}>
                  <div style={s.col}>
                    <span style={s.label}>{etapa.rol}</span>
                    <span style={s.value}>
                      {etapa.persona || <em style={s.placeholder}>Sin registrar</em>}
                    </span>
                  </div>
                  <div style={s.col}>
                    <span style={s.label}>Fecha y hora</span>
                    <span style={s.value}>
                      {fechaTexto || <em style={s.placeholder}>—</em>}
                    </span>
                  </div>
                </div>
                {etapa.comentario && (
                  <p style={s.comment}>
                    <span style={s.commentLabel}>Observación: </span>
                    {etapa.comentario}
                  </p>
                )}

                {etapa.clave === 'comite' && firmasPorEtapa[etapa.clave] && (
                  <BloqueEstadoFirma firma={firmasPorEtapa[etapa.clave]} />
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function BloqueEstadoFirma({ firma }: { firma: any }) {
  const ef = firma.estado_firma as string;
  const meta =
    ef === 'firmado' ? { bg: '#ECFDF5', color: '#065F46', label: 'Firmado electrónicamente' } :
    ef === 'rechazado' ? { bg: '#FEF2F2', color: '#991B1B', label: 'Firma rechazada' } :
    ef === 'expirado' ? { bg: '#FEF2F2', color: '#7F1D1D', label: 'Firma expirada' } :
    ef === 'firmando' || ef === 'enviado' ? { bg: '#EFF6FF', color: '#1E40AF', label: 'Esperando firma' } :
    { bg: '#F3F4F6', color: '#6B7280', label: 'Firma pendiente' };

  const firmantes = Array.isArray(firma.firmantes) ? firma.firmantes : [];
  return (
    <div style={{ ...s.firmaBlock, background: meta.bg, color: meta.color }}>
      <div style={s.firmaHead}>
        <PenLine size={12} />
        <span style={{ fontWeight: 800, fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
          {meta.label}
        </span>
        {ef === 'firmado' && (
          <a
            href={`${API_URL}/api/firmas/${firma.firma_id}/pdf-firmado`}
            target="_blank"
            rel="noreferrer"
            style={s.firmaLink}
          >
            <FileDown size={11} /> PDF firmado
          </a>
        )}
      </div>
      {firmantes.length > 0 && (
        <div style={s.firmaFirmantes}>
          {firmantes.map((f: any, i: number) => (
            <span key={i} style={s.firmaFirmanteItem}>
              {f.estado === 'firmado'
                ? <CheckCircle2 size={10} />
                : f.estado === 'rechazado'
                ? <XCircle size={10} />
                : <Clock size={10} />}
              {f.nombre || f.email}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapCard: {
    marginTop: 24,
    padding: 20,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },
  wrapFlat: {
    marginTop: 22,
    paddingTop: 18,
    borderTop: '1px solid #E5E7EB',
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },
  header: { display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  headerIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: '#F5F3FF',
    color: '#5B21B6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  title: { margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' },
  subtitle: { margin: '2px 0 0', fontSize: 11.5, color: '#6B7280' },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 0,
  },
  item: { display: 'flex', gap: 14, paddingBottom: 12 },
  left: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: 2,
    flexShrink: 0,
  },
  bullet: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  line: { flex: 1, width: 2, background: '#E5E7EB', marginTop: 4, minHeight: 32 },
  card: {
    flex: 1,
    background: '#FFFFFF',
    border: '1px solid #E5E7EB',
    borderRadius: 8,
    padding: '10px 14px 12px',
    minWidth: 0,
  },
  row1: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 8,
  },
  etapa: { margin: 0, fontSize: 13, fontWeight: 700, color: '#111827' },
  badge: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    padding: '3px 8px',
    borderRadius: 999,
    border: '1px solid',
    whiteSpace: 'nowrap',
  },
  row2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  col: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 },
  label: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#9CA3AF',
  },
  value: {
    fontSize: 12.5,
    color: '#111827',
    fontWeight: 600,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  placeholder: { color: '#9CA3AF', fontWeight: 500, fontStyle: 'italic' },
  comment: {
    marginTop: 10,
    marginBottom: 0,
    padding: '8px 10px',
    background: '#F9FAFB',
    borderLeft: '3px solid #E5E7EB',
    borderRadius: 4,
    fontSize: 11.5,
    color: '#374151',
    lineHeight: 1.45,
  },
  commentLabel: { fontWeight: 700, color: '#6B7280' },
  firmaBlock: {
    marginTop: 10,
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid rgba(0,0,0,0.06)',
  },
  firmaHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  firmaLink: {
    marginLeft: 'auto',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10,
    fontWeight: 800,
    padding: '3px 8px',
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 4,
    border: '1px solid rgba(0,0,0,0.08)',
    color: 'inherit',
    textDecoration: 'none',
  },
  firmaFirmantes: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  firmaFirmanteItem: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 10.5,
    fontWeight: 600,
    background: 'rgba(255,255,255,0.6)',
    padding: '2px 8px',
    borderRadius: 999,
    border: '1px solid rgba(0,0,0,0.06)',
  },
};
