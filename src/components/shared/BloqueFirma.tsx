import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState, useCallback } from 'react';
import {
  PenLine, CheckCircle2, XCircle, Clock, Loader2, FileDown, Send,
  AlertTriangle, RefreshCw, Pencil, Check, X,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export type EtapaFirma = 'gerente' | 'financiera' | 'comite' | 'juridica' | 'proveedor' | 'supervision';

interface FirmanteAPI {
  orden: number;
  rol: string;
  nombre: string;
  email: string;
  cargo?: string;
  estado: 'pendiente' | 'firmado' | 'rechazado' | 'delegado';
  firmado_en?: string | null;
}

interface EnlaceFirma {
  email: string;
  url: string;
}

interface FirmaAPI {
  firma_id: string;
  solicitud_id: string;
  etapa: EtapaFirma;
  tipo_documento: string;
  titulo: string;
  estado_firma: 'pendiente' | 'enviado' | 'firmando' | 'firmado' | 'rechazado' | 'expirado' | 'error';
  agreement_id: string | null;
  enviado_en?: string | null;
  completado_en?: string | null;
  pdf_firmado_path?: string | null;
  firmantes: FirmanteAPI[] | null;
  metadata?: { enlaces_firma?: EnlaceFirma[] } | null;
}

interface BloqueFirmaProps {
  solicitudId: string;
  etapa: EtapaFirma;
  /** Texto descriptivo del documento a firmar */
  descripcion?: string;
  /** Body extra a enviar al iniciar (ej. datos del acta de comité) */
  payloadIniciar?: Record<string, any>;
  /** Se llama cuando la firma queda completa */
  onFirmaCompleta?: (firma: FirmaAPI) => void;
  /** Se llama cada vez que cambia el estado (para refrescar parent) */
  onCambio?: (firma: FirmaAPI | null) => void;
  /** Compacta visualmente el bloque */
  compacto?: boolean;
}

const ESTADO_META: Record<FirmaAPI['estado_firma'], { label: string; color: string; bg: string; border: string; Icon: React.ElementType }> = {
  pendiente:  { label: 'Sin enviar',  color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB', Icon: Clock },
  enviado:    { label: 'Enviado',     color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE', Icon: Send },
  firmando:   { label: 'En firma',    color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', Icon: Loader2 },
  firmado:    { label: 'Firmado',     color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', Icon: CheckCircle2 },
  rechazado:  { label: 'Rechazado',   color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', Icon: XCircle },
  expirado:   { label: 'Expirado',    color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA', Icon: AlertTriangle },
  error:      { label: 'Error',       color: '#7F1D1D', bg: '#FEF2F2', border: '#FECACA', Icon: AlertTriangle },
};

export function BloqueFirma({
  solicitudId, etapa, descripcion, payloadIniciar, onFirmaCompleta, onCambio, compacto = false,
}: BloqueFirmaProps) {
  const [firma, setFirma] = useState<FirmaAPI | null>(null);
  const [cargando, setCargando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editandoRol, setEditandoRol] = useState<string | null>(null);
  const [edicion, setEdicion] = useState({ nombre: '', email: '' });
  const [guardandoFirmante, setGuardandoFirmante] = useState(false);
  const [avisoFirmante, setAvisoFirmante] = useState<string | null>(null);

  const cargarEstadoFirma = useCallback(async () => {
    try {
      const r = await apiFetch(`${API_URL}/api/solicitudes/${solicitudId}/firmas`);
      if (!r.ok) return;
      const todas: FirmaAPI[] = await r.json();
      const mia = todas.find((f) => f.etapa === etapa) || null;
      setFirma(mia);
      onCambio?.(mia);
      if (mia?.estado_firma === 'firmado') onFirmaCompleta?.(mia);
    } finally {
      setCargando(false);
    }
  }, [solicitudId, etapa, onCambio, onFirmaCompleta]);

  useEffect(() => {
    cargarEstadoFirma();
  }, [cargarEstadoFirma]);

  // Polling cada 8s si hay firma en curso
  useEffect(() => {
    if (!firma || !['enviado', 'firmando'].includes(firma.estado_firma)) return;
    const t = setInterval(async () => {
      try {
        const r = await apiFetch(`${API_URL}/api/firmas/${firma.firma_id}/estado`);
        if (r.ok) await cargarEstadoFirma();
      } catch { /* no-op */ }
    }, 8000);
    return () => clearInterval(t);
  }, [firma, cargarEstadoFirma]);

  const iniciarFirma = async () => {
    setEnviando(true);
    setError(null);
    try {
      const resp = await apiFetch(`${API_URL}/api/solicitudes/${solicitudId}/firmas/${etapa}/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadIniciar || {}),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Error iniciando firma');
      await cargarEstadoFirma();
    } catch (e: any) {
      setError(e.message || String(e));
    } finally {
      setEnviando(false);
    }
  };

  const reenviar = async () => {
    if (!firma) return;
    setEnviando(true);
    try {
      // cancela y re-inicia
      await apiFetch(`${API_URL}/api/firmas/${firma.firma_id}/cancelar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Reenvío de firma' }),
      });
      await iniciarFirma();
    } finally {
      setEnviando(false);
    }
  };

  const descargarPdf = () => {
    if (!firma) return;
    window.open(`${API_URL}/api/firmas/${firma.firma_id}/pdf-firmado`, '_blank');
  };

  const empezarEdicion = (f: FirmanteAPI) => {
    setEditandoRol(f.rol);
    setEdicion({ nombre: f.nombre, email: f.email });
    setAvisoFirmante(null);
  };

  const cancelarEdicion = () => {
    setEditandoRol(null);
    setEdicion({ nombre: '', email: '' });
  };

  const guardarEdicionFirmante = async (f: FirmanteAPI) => {
    if (!edicion.email.trim()) return;
    setGuardandoFirmante(true);
    try {
      const r = await apiFetch(`${API_URL}/api/configuracion/firmantes/${f.rol}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: edicion.nombre.trim(),
          email: edicion.email.trim(),
          cargo: f.cargo || null,
          activo: true,
        }),
      });
      if (!r.ok) throw new Error('No se pudo guardar el correo');
      setFirma((prev) => prev ? {
        ...prev,
        firmantes: (prev.firmantes || []).map((x) => x.rol === f.rol
          ? { ...x, nombre: edicion.nombre.trim(), email: edicion.email.trim() }
          : x),
      } : prev);
      setEditandoRol(null);
      const yaEnviado = firma && ['enviado', 'firmando'].includes(firma.estado_firma);
      setAvisoFirmante(
        yaEnviado
          ? 'Correo actualizado. Esta firma ya se envió con el correo anterior — dale "Reenviar firma" para aplicar el cambio.'
          : 'Correo actualizado.'
      );
      setTimeout(() => setAvisoFirmante(null), 6000);
    } catch (e: any) {
      setAvisoFirmante(e.message || 'Error al guardar el correo');
    } finally {
      setGuardandoFirmante(false);
    }
  };

  if (cargando) {
    return (
      <div style={{ ...s.wrap, ...(compacto ? s.wrapCompacto : {}) }}>
        <div style={s.head}>
          <Loader2 size={14} className="animate-spin" />
          <span style={s.headTitle}>Cargando estado de firma...</span>
        </div>
      </div>
    );
  }

  // No hay firma iniciada todavía → botón para arrancar
  if (!firma) {
    return (
      <div style={{ ...s.wrap, ...(compacto ? s.wrapCompacto : {}) }}>
        <div style={s.head}>
          <PenLine size={14} color="#E84922" />
          <span style={s.headTitle}>Firma electrónica requerida</span>
        </div>
        {descripcion && <p style={s.desc}>{descripcion}</p>}
        <button
          type="button"
          onClick={iniciarFirma}
          disabled={enviando}
          style={{ ...s.btnPrincipal, ...(enviando ? s.btnDisabled : {}) }}
        >
          {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          {enviando ? 'Enviando a firma...' : 'Enviar a firma electrónica'}
        </button>
        {error && (
          <div style={s.errorBox}>
            <AlertTriangle size={13} /> {error}
          </div>
        )}
      </div>
    );
  }

  const meta = ESTADO_META[firma.estado_firma];
  const Icon = meta.Icon;
  const firmantes = firma.firmantes || [];

  return (
    <div style={{ ...s.wrap, ...(compacto ? s.wrapCompacto : {}) }}>
      <div style={s.head}>
        <PenLine size={14} color="#E84922" />
        <span style={s.headTitle}>Firma electrónica</span>
        <span
          style={{
            ...s.estadoPill,
            background: meta.bg, color: meta.color, borderColor: meta.border,
          }}
        >
          <Icon
            size={12}
            style={firma.estado_firma === 'firmando' || firma.estado_firma === 'enviado'
              ? { animation: 'spin 1.4s linear infinite' } : undefined}
          />
          {meta.label}
        </span>
      </div>

      {/* Lista de firmantes */}
      <div style={s.firmantesList}>
        {firmantes.length === 0 ? (
          <p style={s.empty}>Sin firmantes configurados.</p>
        ) : firmantes.map((f) => (
          <div key={`${f.email}-${f.orden}`} style={s.firmanteRow}>
            {editandoRol === f.rol ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, minWidth: 0 }}>
                <input
                  type="text"
                  value={edicion.nombre}
                  onChange={(e) => setEdicion((p) => ({ ...p, nombre: e.target.value }))}
                  placeholder="Nombre"
                  style={s.inputEdicion}
                />
                <input
                  type="email"
                  value={edicion.email}
                  onChange={(e) => setEdicion((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Correo"
                  style={s.inputEdicion}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    type="button"
                    onClick={() => guardarEdicionFirmante(f)}
                    disabled={guardandoFirmante}
                    style={s.btnMiniGuardar}
                  >
                    {guardandoFirmante ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Guardar
                  </button>
                  <button type="button" onClick={cancelarEdicion} disabled={guardandoFirmante} style={s.btnMiniCancelar}>
                    <X size={12} /> Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={s.firmanteLeft}>
                  <span style={s.firmanteOrden}>{f.orden}</span>
                  <div style={{ minWidth: 0 }}>
                    <p style={s.firmanteNombre}>{f.nombre}</p>
                    <p style={s.firmanteEmail}>
                      {f.email}{f.cargo ? ` · ${f.cargo}` : ''}
                    </p>
                  </div>
                </div>
                {f.estado !== 'firmado' && (
                  <button
                    type="button"
                    onClick={() => empezarEdicion(f)}
                    title="Cambiar nombre/correo"
                    style={s.btnEditarFirmante}
                  >
                    <Pencil size={12} />
                  </button>
                )}
                <span
                  style={{
                    ...s.estadoMini,
                    background: f.estado === 'firmado' ? '#ECFDF5'
                      : f.estado === 'rechazado' ? '#FEF2F2' : '#F3F4F6',
                    color: f.estado === 'firmado' ? '#065F46'
                      : f.estado === 'rechazado' ? '#991B1B' : '#6B7280',
                    borderColor: f.estado === 'firmado' ? '#A7F3D0'
                      : f.estado === 'rechazado' ? '#FECACA' : '#E5E7EB',
                  }}
                >
                  {f.estado === 'firmado' ? <CheckCircle2 size={11} />
                    : f.estado === 'rechazado' ? <XCircle size={11} />
                    : <Clock size={11} />}
                  {f.estado === 'firmado' ? 'Firmado' : f.estado === 'rechazado' ? 'Rechazado' : 'Pendiente'}
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      {avisoFirmante && (
        <p style={s.avisoFirmante}>{avisoFirmante}</p>
      )}

      {/* Acciones según estado */}
      <div style={s.actions}>
        {firma.estado_firma === 'firmado' && (
          <button type="button" onClick={descargarPdf} style={s.btnDescargar}>
            <FileDown size={14} /> Descargar PDF firmado
          </button>
        )}
        {(firma.estado_firma === 'rechazado' || firma.estado_firma === 'expirado' || firma.estado_firma === 'error' || firma.estado_firma === 'firmando') && (
          <button type="button" onClick={reenviar} disabled={enviando} style={s.btnReenviar}>
            <RefreshCw size={14} /> {enviando ? 'Reenviando...' : 'Reenviar firma'}
          </button>
        )}
        {(firma.estado_firma === 'enviado' || firma.estado_firma === 'firmando') && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={s.hint}>
              <Loader2 size={12} className="animate-spin" style={{ marginRight: 6 }} />
              Esperando firma electrónica. El estado se actualiza automáticamente.
            </p>
            {(firma.metadata?.enlaces_firma || []).map((enlace) => (
              <a
                key={enlace.email}
                href={enlace.url}
                target="_blank"
                rel="noreferrer"
                style={s.btnEnlaceFirma}
              >
                <Send size={13} /> Abrir enlace de firma ({enlace.email})
              </a>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div style={s.errorBox}>
          <AlertTriangle size={13} /> {error}
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrap: {
    border: '1px solid #FED7AA',
    background: '#FFFBF7',
    borderRadius: 10,
    padding: 14,
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
  },
  wrapCompacto: { padding: 10, gap: 8 },
  head: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  headTitle: { fontSize: 12, fontWeight: 800, color: '#9A3412', letterSpacing: '0.04em', textTransform: 'uppercase' },
  estadoPill: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 800,
    border: '1px solid', letterSpacing: '0.04em', textTransform: 'uppercase',
    marginLeft: 'auto',
  },
  desc: { margin: 0, fontSize: 12.5, color: '#6B7280', lineHeight: 1.5 },
  btnPrincipal: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: '10px 14px', borderRadius: 8,
    background: '#E84922', color: '#fff', border: 'none',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(232,73,34,0.28)',
  },
  btnDisabled: { opacity: 0.7, cursor: 'not-allowed' },
  btnDescargar: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 8,
    background: '#10B981', color: '#fff', border: 'none',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  btnReenviar: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 8,
    background: '#fff', color: '#9A3412', border: '1px solid #FDBA74',
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
  },
  btnEnlaceFirma: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 12px', borderRadius: 8,
    background: '#1f4e79', color: '#fff', border: 'none',
    fontSize: 12, fontWeight: 700, textDecoration: 'none',
  },
  firmantesList: { display: 'flex', flexDirection: 'column', gap: 6 },
  firmanteRow: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 10px',
    background: '#fff', border: '1px solid #FED7AA', borderRadius: 8,
  },
  firmanteLeft: { display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 },
  firmanteOrden: {
    width: 22, height: 22, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    background: '#9A3412', color: '#fff', fontSize: 11, fontWeight: 800,
    flexShrink: 0,
  },
  firmanteNombre: { margin: 0, fontSize: 12.5, fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  firmanteEmail: { margin: '1px 0 0', fontSize: 10.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  estadoMini: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 800,
    border: '1px solid', whiteSpace: 'nowrap',
  },
  empty: { margin: 0, fontSize: 11, color: '#9CA3AF', fontStyle: 'italic' },
  btnEditarFirmante: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
    background: '#fff', color: '#9A3412', border: '1px solid #FED7AA', cursor: 'pointer',
  },
  inputEdicion: {
    width: '100%', padding: '6px 8px', borderRadius: 6,
    border: '1px solid #FDBA74', fontSize: 12, fontFamily: "'Gabarito', 'Segoe UI', sans-serif",
    color: '#111827',
  },
  btnMiniGuardar: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6,
    background: '#E84922', color: '#fff', border: 'none',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
  },
  btnMiniCancelar: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '5px 10px', borderRadius: 6,
    background: '#fff', color: '#6B7280', border: '1px solid #E5E7EB',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
  },
  avisoFirmante: {
    margin: 0, fontSize: 11, color: '#065F46', background: '#ECFDF5',
    border: '1px solid #A7F3D0', borderRadius: 6, padding: '6px 10px', fontWeight: 700,
  },
  actions: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  hint: { margin: 0, fontSize: 11, color: '#92400E', display: 'inline-flex', alignItems: 'center', fontWeight: 600 },
  errorBox: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 10px', borderRadius: 6,
    background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA',
    fontSize: 11.5, fontWeight: 600,
  },
};

export default BloqueFirma;
