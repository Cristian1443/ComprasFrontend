import React from 'react';
import { CheckCircle2, Clock, XCircle, Loader2 } from 'lucide-react';

type EstadoInstancia = 'aprobado' | 'rechazado' | 'pendiente' | 'en_proceso';

const ESTADO_META: Record<
  EstadoInstancia,
  { label: string; color: string; bg: string; border: string; Icon: React.ElementType }
> = {
  aprobado: { label: 'Aprobado', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle2 },
  rechazado: { label: 'Rechazado', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle },
  pendiente: { label: 'Pendiente', color: '#92400E', bg: '#FFFBEB', border: '#FCD34D', Icon: Clock },
  en_proceso: { label: 'En proceso', color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', Icon: Loader2 },
};

function formatearFecha(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearHora(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });
}

interface Aprobador {
  numero: number;
  rol: string;
  subtitulo: string;
  estado: EstadoInstancia;
  comentarioLabel: string;
  comentario: string | null;
  identificadorLabel: string;
  identificador: string | null;
  fecha: string | null;
}

export interface InstanciasAprobacionProps {
  solicitud: Record<string, any>;
  className?: string;
  /** true si la vista ya renderizó la sección "Conclusiones del Comité" (VIII) justo antes de esta —
   *  en ese caso esta sección pasa a ser IX; si no, es VIII. */
  precedidoPorConclusiones?: boolean;
}

/** VIII/IX. Instancias de aprobación — Gerente, Financiera y (si aplica) Comité, lado a lado. */
export function InstanciasAprobacion({ solicitud, className, precedidoPorConclusiones }: InstanciasAprobacionProps) {
  const esInvitacion = String(solicitud?.modalidad || '').toLowerCase().includes('invit');
  const estado = String(solicitud?.estado || '').toLowerCase();
  const numeroSeccion = precedidoPorConclusiones ? 'IX' : 'VIII';

  // Al devolver/rechazar y volver a enviar, el backend conserva la fecha/comentario/nombre de la
  // decisión anterior — por eso el estado "en curso" (enviado_gerente / en_financiera) se evalúa
  // primero, y solo se muestran esos datos históricos cuando el resultado ya quedó zanjado.
  const estadoGerente: EstadoInstancia =
    estado === 'enviado_gerente' ? 'en_proceso'
    : (estado === 'rechazado_gerente' || estado === 'devuelto_al_solicitante') ? 'rechazado'
    : solicitud?.fecha_respuesta_gerente ? 'aprobado'
    : 'pendiente';
  const zanjadoGerente = estadoGerente === 'aprobado' || estadoGerente === 'rechazado';

  const estadoFinanciera: EstadoInstancia =
    estado === 'en_financiera' ? 'en_proceso'
    : estado === 'rechazado_financiera' ? 'rechazado'
    : solicitud?.fecha_respuesta_financiera ? 'aprobado'
    : 'pendiente';
  const zanjadoFinanciera = estadoFinanciera === 'aprobado' || estadoFinanciera === 'rechazado';

  const tieneRiesgos = solicitud?.tiene_riesgos_juridicos === true;

  const estadoRiesgos: EstadoInstancia =
    estado === 'en_riesgos' ? 'en_proceso'
    : estado === 'rechazado_riesgos' ? 'rechazado'
    : solicitud?.fecha_respuesta_riesgos ? 'aprobado'
    : 'pendiente';

  const aprobadores: Aprobador[] = [
    {
      numero: 1,
      rol: 'Gerente',
      subtitulo: 'Gerente de Área Solicitante',
      estado: estadoGerente,
      comentarioLabel: 'Comentario',
      comentario: zanjadoGerente ? (solicitud?.comentario_gerente || null) : null,
      identificadorLabel: 'Nombre',
      identificador: zanjadoGerente ? (solicitud?.gerente_nombre || null) : null,
      fecha: zanjadoGerente ? (solicitud?.fecha_respuesta_gerente || null) : null,
    },
    {
      numero: 2,
      rol: 'Financiera',
      subtitulo: 'Aprobación de presupuesto',
      estado: estadoFinanciera,
      comentarioLabel: 'Comentario',
      comentario: zanjadoFinanciera ? (solicitud?.comentario_financiera || null) : null,
      identificadorLabel: 'Nombre',
      identificador: zanjadoFinanciera ? (solicitud?.financiera_nombre || null) : null,
      fecha: zanjadoFinanciera ? (solicitud?.fecha_respuesta_financiera || null) : null,
    },
  ];

  if (tieneRiesgos) {
    aprobadores.push({
      numero: aprobadores.length + 1,
      rol: 'Riesgos',
      subtitulo: 'Evaluación de riesgos jurídicos',
      estado: estadoRiesgos,
      comentarioLabel: 'Comentario',
      comentario: estadoRiesgos !== 'pendiente' ? (solicitud?.comentario_riesgos || null) : null,
      identificadorLabel: 'Nombre',
      identificador: estadoRiesgos !== 'pendiente' ? (solicitud?.riesgos_nombre || null) : null,
      fecha: estadoRiesgos !== 'pendiente' ? (solicitud?.fecha_respuesta_riesgos || null) : null,
    });
  }

  if (!esInvitacion) {
    const resultadoComite = String(solicitud?.resultado_comite || '').toLowerCase();
    aprobadores.push({
      numero: aprobadores.length + 1,
      rol: 'Secretaría de Comité',
      subtitulo: 'Comité de Contratación',
      estado:
        resultadoComite === 'aprobado' ? 'aprobado'
        : resultadoComite === 'rechazado' ? 'rechazado'
        : resultadoComite === 'en_revision' ? 'en_proceso'
        : 'pendiente',
      comentarioLabel: 'Conclusiones',
      comentario: solicitud?.conclusiones_comite || solicitud?.comentario_comite || null,
      identificadorLabel: 'Número de Acta',
      identificador: solicitud?.acta_numero || solicitud?.numero_acta || null,
      fecha: solicitud?.fecha_comite_decision || null,
    });
  }

  return (
    <section style={s.wrap} className={className}>
      <div style={s.header}>{numeroSeccion}. INSTANCIAS DE APROBACIÓN.</div>
      <div style={{ ...s.grid, gridTemplateColumns: `repeat(${aprobadores.length}, 1fr)` }}>
        {aprobadores.map((ap, idx) => {
          const meta = ESTADO_META[ap.estado];
          const Icon = meta.Icon;
          const fecha = formatearFecha(ap.fecha);
          const hora = formatearHora(ap.fecha);
          const esUltimo = idx === aprobadores.length - 1;
          return (
            <div key={ap.numero} style={{ ...s.card, ...(esUltimo ? {} : { borderRight: '1px solid #E5E7EB' }) }}>
              <div style={s.cardHeadRow}>
                <span style={s.cardTitle}>Aprobador {ap.numero}</span>
                <span style={{ ...s.badge, color: meta.color, background: meta.bg, borderColor: meta.border }}>
                  <Icon size={11} style={ap.estado === 'en_proceso' ? { animation: 'spin 1.2s linear infinite' } : undefined} />
                  {meta.label}
                </span>
              </div>
              <p style={s.rol}>{ap.rol}</p>
              <p style={s.subtitulo}>{ap.subtitulo}</p>

              <div style={s.comentarioBox}>
                <span style={s.smallLabel}>{ap.comentarioLabel}</span>
                <p style={s.comentarioTexto}>
                  {ap.comentario || <em style={s.placeholder}>Sin registrar</em>}
                </p>
              </div>

              <div style={s.fieldsGrid}>
                <div>
                  <span style={s.smallLabel}>{ap.identificadorLabel}</span>
                  <p style={s.fieldValue}>{ap.identificador || <em style={s.placeholder}>—</em>}</p>
                </div>
                <div>
                  <span style={s.smallLabel}>Fecha</span>
                  <p style={s.fieldValue}>{fecha || <em style={s.placeholder}>—</em>}</p>
                </div>
                <div>
                  <span style={s.smallLabel}>Hora</span>
                  <p style={s.fieldValue}>{hora || <em style={s.placeholder}>—</em>}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    marginTop: 24,
    borderRadius: 12,
    overflow: 'hidden',
    border: '1px solid #E5E7EB',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },
  header: {
    backgroundColor: 'var(--brand-primary)',
    color: '#fff',
    fontWeight: 700,
    fontSize: '0.82rem',
    textAlign: 'center',
    padding: '10px 24px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  },
  grid: {
    display: 'grid',
    background: '#fff',
  },
  card: {
    padding: 16,
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  cardHeadRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 11, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#6B7280' },
  badge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    fontSize: 10, fontWeight: 800, letterSpacing: '0.03em',
    padding: '3px 8px', borderRadius: 999, border: '1px solid', whiteSpace: 'nowrap',
  },
  rol: { margin: 0, fontSize: 14, fontWeight: 800, color: '#111827' },
  subtitulo: { margin: '-4px 0 4px', fontSize: 11.5, color: '#6B7280' },
  comentarioBox: {
    background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 6,
    padding: '8px 10px', minHeight: 52,
  },
  smallLabel: { fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#9CA3AF' },
  comentarioTexto: { margin: '2px 0 0', fontSize: 12, color: '#374151', lineHeight: 1.4 },
  fieldsGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 },
  fieldValue: { margin: '2px 0 0', fontSize: 12.5, fontWeight: 600, color: '#111827' },
  placeholder: { color: '#9CA3AF', fontWeight: 500, fontStyle: 'italic' },
};
