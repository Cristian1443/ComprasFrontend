import React from 'react';
import { CheckCircle2, Clock, ShieldCheck } from 'lucide-react';

export type EtapaEstampa = 'gerente' | 'financiera' | 'juridica';

interface EstampaAprobacionProps {
  etapa: EtapaEstampa;
  solicitud: Record<string, any>;
  usuarioActual?: { nombre?: string; email?: string } | null;
  compacto?: boolean;
}

const ETAPA_META: Record<
  EtapaEstampa,
  { titulo: string; rol: string; fechaKey: string; nombreKey: string; comentarioKey: string; accent: string; bg: string; border: string }
> = {
  gerente: {
    titulo: 'Aprobación Gerencial',
    rol: 'Gerente de Área',
    fechaKey: 'fecha_respuesta_gerente',
    nombreKey: 'gerente_nombre',
    comentarioKey: 'comentario_gerente',
    accent: '#1E40AF',
    bg: '#EFF6FF',
    border: '#BFDBFE',
  },
  financiera: {
    titulo: 'Aprobación Financiera',
    rol: 'Área Financiera',
    fechaKey: 'fecha_respuesta_financiera',
    nombreKey: 'financiera_nombre',
    comentarioKey: 'comentario_financiera',
    accent: '#065F46',
    bg: '#ECFDF5',
    border: '#A7F3D0',
  },
  juridica: {
    titulo: 'Revisión Jurídica',
    rol: 'Área Jurídica',
    fechaKey: 'fecha_respuesta_juridica',
    nombreKey: 'juridica_nombre',
    comentarioKey: 'comentario_juridica',
    accent: '#5B21B6',
    bg: '#F5F3FF',
    border: '#DDD6FE',
  },
};

const formatearFechaHora = (iso: string | null | undefined): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const fecha = d.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  const hora = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  return `${fecha} · ${hora}`;
};

export function EstampaAprobacion({ etapa, solicitud, usuarioActual, compacto = false }: EstampaAprobacionProps) {
  const meta = ETAPA_META[etapa];
  const fecha = solicitud?.[meta.fechaKey] as string | null | undefined;
  const aprobado = Boolean(fecha);
  const nombre = (solicitud?.[meta.nombreKey] as string | undefined) || usuarioActual?.nombre || '—';
  const comentario = solicitud?.[meta.comentarioKey] as string | null | undefined;
  const fechaTexto = formatearFechaHora(fecha);

  if (!aprobado) {
    return (
      <div style={{ ...s.wrap, ...(compacto ? s.wrapCompacto : {}), background: '#F8FAFC', borderColor: '#E2E8F0' }}>
        <div style={s.head}>
          <ShieldCheck size={14} color="#64748B" />
          <span style={{ ...s.headTitle, color: '#475569' }}>Constancia de aprobación</span>
        </div>
        <p style={s.descPendiente}>
          Al aprobar, el sistema registrará automáticamente la fecha, hora y responsable en el expediente.
          No se requiere firma electrónica en esta etapa.
        </p>
        {usuarioActual?.nombre && (
          <p style={s.responsableHint}>
            <Clock size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
            Responsable: <strong>{usuarioActual.nombre}</strong> · {meta.rol}
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      style={{
        ...s.wrap,
        ...(compacto ? s.wrapCompacto : {}),
        background: meta.bg,
        borderColor: meta.border,
      }}
    >
      <div style={s.stampRow}>
        <div style={{ ...s.seal, borderColor: meta.accent, color: meta.accent }}>
          <CheckCircle2 size={22} strokeWidth={2.2} />
          <span style={s.sealText}>APROBADO</span>
        </div>
        <div style={s.stampBody}>
          <p style={{ ...s.stampTitulo, color: meta.accent }}>{meta.titulo}</p>
          <p style={s.stampRol}>{meta.rol}</p>
          <p style={s.stampNombre}>{nombre}</p>
          {fechaTexto && (
            <p style={s.stampFecha}>
              <Clock size={12} style={{ marginRight: 5, verticalAlign: '-2px' }} />
              {fechaTexto}
            </p>
          )}
          <p style={s.stampLegal}>
            Registro electrónico con estampa de tiempo · Invest in Bogotá
          </p>
        </div>
      </div>
      {comentario?.trim() && (
        <div style={s.comentarioBox}>
          <span style={s.comentarioLabel}>Observación registrada:</span>
          <span style={s.comentarioTexto}>{comentario}</span>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    border: '1px solid',
    borderRadius: 10,
    padding: 14,
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },
  wrapCompacto: { padding: 10 },
  head: { display: 'flex', alignItems: 'center', gap: 8 },
  headTitle: { fontSize: 12, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' },
  descPendiente: { margin: '8px 0 0', fontSize: 12.5, color: '#64748B', lineHeight: 1.55 },
  responsableHint: { margin: '10px 0 0', fontSize: 11.5, color: '#475569', fontWeight: 600 },
  stampRow: { display: 'flex', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  seal: {
    width: 88,
    height: 88,
    borderRadius: '50%',
    border: '3px double',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    background: 'rgba(255,255,255,0.85)',
    boxShadow: 'inset 0 0 0 4px rgba(255,255,255,0.6)',
  },
  sealText: { fontSize: 9, fontWeight: 900, letterSpacing: '0.12em', marginTop: 4 },
  stampBody: { flex: 1, minWidth: 200 },
  stampTitulo: { margin: 0, fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em' },
  stampRol: { margin: '4px 0 0', fontSize: 12, color: '#6B7280', fontWeight: 600 },
  stampNombre: { margin: '6px 0 0', fontSize: 15, fontWeight: 800, color: '#111827' },
  stampFecha: { margin: '8px 0 0', fontSize: 12, fontWeight: 700, color: '#374151', fontFamily: 'ui-monospace, monospace' },
  stampLegal: { margin: '10px 0 0', fontSize: 10, color: '#9CA3AF', fontStyle: 'italic' },
  comentarioBox: {
    marginTop: 12,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.7)',
    borderRadius: 6,
    fontSize: 12,
    lineHeight: 1.45,
  },
  comentarioLabel: { fontWeight: 700, color: '#6B7280', marginRight: 6 },
  comentarioTexto: { color: '#374151' },
};

export default EstampaAprobacion;
