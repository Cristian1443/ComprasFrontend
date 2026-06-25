import React, { useEffect, useState, useRef } from 'react';
import {
  Clock, CheckCircle2, XCircle, Send, Loader2, AlertTriangle, Lock, FileText,
  Upload, Trash2, File, Paperclip
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const FONT = "'Gabarito', sans-serif";

interface ArchivoSubido {
  id: string;
  nombre: string;
  nombre_almacenado: string;
  tamano: number;
  tipo: string;
  url: string;
  subido_en: string;
}

interface ConvocatoriaData {
  invitacion_id: string;
  proponente_nombre: string;
  proponente_email: string;
  asunto: string;
  descripcion_requisitos: string;
  fecha_inicio: string;
  fecha_limite: string;
  solicitud_codigo: string;
  solicitud_objeto: string;
  documento_adjunto_url?: string | null;
  documento_adjunto_nombre?: string | null;
  ya_respondida: boolean;
  respuesta_texto: string | null;
  respuesta_archivos: ArchivoSubido[];
  respondida_en: string | null;
  vencida: boolean;
  puede_responder: boolean;
}

function fmtFecha(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
}

function fmtTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tiempoRestante(fechaLimite: string): string {
  const diff = new Date(fechaLimite).getTime() - Date.now();
  if (diff <= 0) return 'Plazo vencido';
  const dias = Math.floor(diff / (1000 * 60 * 60 * 24));
  const horas = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (dias > 0) return `${dias} día${dias > 1 ? 's' : ''}, ${horas}h restantes`;
  if (horas > 0) return `${horas}h ${mins}min restantes`;
  return `${mins} minuto${mins > 1 ? 's' : ''} restantes`;
}

export function RespuestaProponente() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<ConvocatoriaData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [archivosSubidos, setArchivosSubidos] = useState<ArchivoSubido[]>([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token') || '';
    setToken(t);
    if (!t) {
      setError('No se proporcionó un token válido. Verifica el enlace recibido.');
      setCargando(false);
      return;
    }

    fetch(`${API_URL}/api/proponente/convocatoria?token=${encodeURIComponent(t)}`)
      .then(r => { if (!r.ok) throw new Error('Enlace inválido'); return r.json(); })
      .then(d => {
        setData(d);
        setArchivosSubidos(Array.isArray(d.respuesta_archivos) ? d.respuesta_archivos : []);
      })
      .catch(() => setError('Enlace inválido o expirado. Por favor contacte al área jurídica.'))
      .finally(() => setCargando(false));
  }, []);

  /* ── Subir archivo ── */
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setErrorEnvio('');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.size > 20 * 1024 * 1024) {
        setErrorEnvio(`El archivo "${file.name}" excede el límite de 20MB.`);
        continue;
      }
      
      setSubiendoArchivo(true);
      try {
        const formData = new FormData();
        formData.append('archivo', file);
        formData.append('token', token);

        const resp = await fetch(`${API_URL}/api/proponente/subir-archivo`, {
          method: 'POST',
          body: formData,
        });
        const result = await resp.json();
        if (!resp.ok) throw new Error(result.error || 'Error al subir');
        setArchivosSubidos(prev => [...prev, result]);
      } catch (err: any) {
        setErrorEnvio(err.message || 'Error al subir archivo');
      } finally {
        setSubiendoArchivo(false);
      }
    }
    // Limpiar input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  /* ── Eliminar archivo ── */
  const handleEliminarArchivo = async (archivoId: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/proponente/eliminar-archivo`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, archivo_id: archivoId }),
      });
      if (!resp.ok) {
        const r = await resp.json();
        throw new Error(r.error || 'Error');
      }
      setArchivosSubidos(prev => prev.filter(a => a.id !== archivoId));
    } catch (err: any) {
      setErrorEnvio(err.message || 'Error al eliminar archivo');
    }
  };

  /* ── Enviar respuesta final ── */
  const handleEnviar = async () => {
    if (!respuestaTexto.trim() && archivosSubidos.length === 0) {
      setErrorEnvio('Debes escribir tu respuesta o adjuntar al menos un documento.');
      return;
    }
    setEnviando(true);
    setErrorEnvio('');
    try {
      const resp = await fetch(`${API_URL}/api/proponente/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, respuesta_texto: respuestaTexto, archivos: [] }),
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Error al enviar');
      setEnviado(true);
    } catch (err: any) {
      setErrorEnvio(err.message || 'Error al enviar la respuesta');
    } finally {
      setEnviando(false);
    }
  };

  /* ── Loading ── */
  if (cargando) {
    return (
      <div style={p.pageBg}>
        <div style={p.centrado}>
          <Loader2 size={40} className="animate-spin" color="#3384D6" />
          <p style={p.loadText}>Cargando convocatoria...</p>
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    return (
      <div style={p.pageBg}>
        <div style={p.centrado}>
          <AlertTriangle size={48} color="#EF4444" />
          <h2 style={p.errorTitle}>Enlace no válido</h2>
          <p style={p.errorText}>{error || 'No se pudo cargar la convocatoria.'}</p>
        </div>
      </div>
    );
  }

  /* ── Ya envió respuesta ── */
  if (enviado || data.ya_respondida) {
    const archivosResp = data.ya_respondida ? (data.respuesta_archivos || []) : archivosSubidos;
    return (
      <div style={p.pageBg}>
        <div style={p.mainCard}>
          <div style={p.header}>
            <div style={p.logoBadge}>Invest in <span style={p.logoBold}>Bogotá</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle2 size={56} color="#10B981" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#065F46', margin: '0 0 8px' }}>
              Respuesta enviada exitosamente
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 14, color: '#64748b' }}>
              Gracias, {data.proponente_nombre || data.proponente_email}. Tu respuesta fue registrada
              {data.respondida_en ? ` el ${fmtFecha(data.respondida_en)}` : ''}.
            </p>
            {data.respuesta_texto && (
              <div style={p.respuestaPreview}>
                <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>Tu respuesta:</p>
                <p style={{ fontFamily: FONT, fontSize: 13, color: '#334155', whiteSpace: 'pre-line', margin: 0 }}>{data.respuesta_texto}</p>
              </div>
            )}
            {archivosResp.length > 0 && (
              <div style={{ ...p.respuestaPreview, marginTop: 12 }}>
                <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>
                  Documentos adjuntos ({archivosResp.length}):
                </p>
                {archivosResp.map((a, i) => (
                  <div key={i} style={p.fileItem}>
                    <File size={14} color="#3384D6" />
                    <span style={{ fontFamily: FONT, fontSize: 12, color: '#334155' }}>{a.nombre}</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8' }}>({fmtTamano(a.tamano)})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ── Plazo vencido ── */
  if (data.vencida) {
    return (
      <div style={p.pageBg}>
        <div style={p.mainCard}>
          <div style={p.header}>
            <div style={p.logoBadge}>Invest in <span style={p.logoBold}>Bogotá</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Lock size={56} color="#EF4444" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#991B1B', margin: '0 0 8px' }}>
              Plazo vencido
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 14, color: '#64748b' }}>
              El plazo para responder a esta convocatoria venció el <strong>{fmtFecha(data.fecha_limite)}</strong>.
            </p>
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', marginTop: 8 }}>
              Si necesitas enviar una respuesta, contacta directamente al área jurídica.
            </p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulario de respuesta ── */
  return (
    <div style={p.pageBg}>
      <div style={p.mainCard}>
        {/* Header */}
        <div style={p.header}>
          <div style={p.logoBadge}>Invest in <span style={p.logoBold}>Bogotá</span></div>
          <div style={p.timerBadge}>
            <Clock size={14} />
            {tiempoRestante(data.fecha_limite)}
          </div>
        </div>

        {/* Info solicitud */}
        <div style={p.infoSection}>
          <p style={p.codeBadge}>{data.solicitud_codigo}</p>
          <h1 style={p.titulo}>{data.asunto}</h1>
          <p style={p.subtitulo}>{data.solicitud_objeto}</p>
        </div>

        {/* Bienvenida */}
        <div style={p.welcomeBox}>
          <p style={{ fontFamily: FONT, fontSize: 14, margin: 0, color: '#1e293b' }}>
            Hola, <strong>{data.proponente_nombre || data.proponente_email}</strong>
          </p>
          <p style={{ fontFamily: FONT, fontSize: 13, margin: '4px 0 0', color: '#64748b' }}>
            Ha sido invitado a participar en esta convocatoria. Por favor revise los requisitos, adjunte los documentos solicitados y envíe su respuesta antes de la fecha límite.
          </p>
        </div>

        {/* Plazo */}
        <div style={p.plazoBox}>
          <div style={{ display: 'flex', gap: 30 }}>
            <div>
              <p style={p.plazoLabel}>Fecha inicio</p>
              <p style={p.plazoValue}>{fmtFecha(data.fecha_inicio)}</p>
            </div>
            <div>
              <p style={p.plazoLabel}>Fecha límite</p>
              <p style={{ ...p.plazoValue, color: '#DC2626', fontWeight: 900 }}>{fmtFecha(data.fecha_limite)}</p>
            </div>
          </div>
        </div>

        {/* Requisitos */}
        <div style={p.requisitosSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <FileText size={18} color="#3384D6" />
            <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>Requisitos solicitados</h3>
          </div>
          <div style={p.requisitosBox}>
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
              {data.descripcion_requisitos}
            </p>
          </div>
        </div>

        {/* Documento adjunto de Invest in Bogotá */}
        {data.documento_adjunto_url && (
          <div style={{ padding: '0 28px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Paperclip size={18} color="#1D4ED8" />
              <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                Documento de la convocatoria
              </h3>
            </div>
            <a
              href={`${API_URL}${data.documento_adjunto_url}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '14px 18px', borderRadius: 10,
                background: '#EFF6FF', border: '1px solid #BFDBFE',
                textDecoration: 'none',
              }}
            >
              <File size={22} color="#3384D6" style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#1D4ED8', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.documento_adjunto_nombre || 'Documento adjunto'}
                </p>
                <p style={{ fontFamily: FONT, fontSize: 11, color: '#3730A3', margin: '2px 0 0' }}>
                  Haz clic para abrir o descargar
                </p>
              </div>
              <Upload size={15} color="#3384D6" style={{ flexShrink: 0, transform: 'rotate(180deg)' }} />
            </a>
          </div>
        )}

        {/* ── Sección de carga de archivos ── */}
        <div style={p.formSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Paperclip size={18} color="#6366F1" />
            <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>Documentos adjuntos</h3>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
            Suba los documentos que le fueron solicitados. Puede subir PDFs, Word, Excel, imágenes o archivos ZIP (máx. 20MB cada uno).
          </p>

          {/* Archivos ya subidos */}
          {archivosSubidos.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              {archivosSubidos.map(archivo => (
                <div key={archivo.id} style={p.archivoRow}>
                  <div style={p.archivoIcon}>
                    <File size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={p.archivoNombre}>{archivo.nombre}</p>
                    <p style={p.archivoMeta}>{fmtTamano(archivo.tamano)} • Subido {fmtFecha(archivo.subido_en)}</p>
                  </div>
                  <button
                    onClick={() => handleEliminarArchivo(archivo.id)}
                    style={p.btnEliminar}
                    title="Eliminar archivo"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Botón de subir */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.zip,.rar,.ppt,.pptx"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={subiendoArchivo}
            style={p.btnUpload}
          >
            {subiendoArchivo ? (
              <><Loader2 size={16} className="animate-spin" /> Subiendo...</>
            ) : (
              <><Upload size={16} /> Seleccionar archivos</>
            )}
          </button>
        </div>

        {/* ── Respuesta de texto ── */}
        <div style={p.formSection}>
          <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 8px' }}>
            ✍️ Su respuesta
          </h3>
          <p style={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
            Escriba su propuesta, detalle los documentos que adjunta y cualquier información relevante.
            Una vez enviada, <strong>no podrá modificarla</strong>.
          </p>

          <textarea
            style={p.textarea}
            rows={8}
            value={respuestaTexto}
            onChange={e => setRespuestaTexto(e.target.value)}
            placeholder="Escriba aquí su respuesta completa..."
          />

          {errorEnvio && (
            <div style={p.errorEnvio}>
              <XCircle size={14} /> {errorEnvio}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <p style={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {archivosSubidos.length > 0 && `📎 ${archivosSubidos.length} documento${archivosSubidos.length > 1 ? 's' : ''} adjunto${archivosSubidos.length > 1 ? 's' : ''}`}
            </p>
            <button onClick={handleEnviar} disabled={enviando} style={p.btnEnviar}>
              {enviando ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              {enviando ? 'Enviando...' : 'Enviar respuesta'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={p.footer}>
          <p>Portal de Compras y Contratación — Invest in Bogotá</p>
          <p>Este enlace es personal e intransferible. No lo comparta con terceros.</p>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════ Estilos ════════════════════ */
const p: Record<string, React.CSSProperties> = {
  pageBg: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: FONT },
  centrado: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 400 },
  loadText: { fontFamily: FONT, fontSize: 15, color: '#64748b', fontWeight: 600 },
  errorTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#991B1B', margin: '0 0 8px' },
  errorText: { fontFamily: FONT, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 400 },
  mainCard: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 700, width: '100%', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' },
  logoBadge: { fontFamily: FONT, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  logoBold: { fontWeight: 900, color: '#E84922' },
  timerBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, fontFamily: FONT },
  infoSection: { padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' },
  codeBadge: { display: 'inline-block', padding: '3px 10px', background: '#3384D6', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, margin: '0 0 8px', fontFamily: FONT },
  titulo: { fontFamily: FONT, fontSize: 20, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' },
  subtitulo: { fontFamily: FONT, fontSize: 13, color: '#64748b', margin: 0 },
  welcomeBox: { margin: '0 28px', padding: '16px 20px', borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE', marginTop: 20 },
  plazoBox: { margin: '16px 28px', padding: '16px 20px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' },
  plazoLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 2px' },
  plazoValue: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 },
  requisitosSection: { padding: '20px 28px' },
  requisitosBox: { padding: '16px 20px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' },
  formSection: { padding: '0 28px 24px' },
  textarea: { width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, transition: 'border-color 0.2s' },
  errorEnvio: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#FEF2F2', color: '#991B1B', fontSize: 13, fontWeight: 600, border: '1px solid #FECACA', marginTop: 10, fontFamily: FONT },
  btnEnviar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: '#10B981', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: FONT },
  btnUpload: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#EEF2FF', color: '#3730A3', fontWeight: 700, border: '2px dashed #C7D2FE', cursor: 'pointer', fontSize: 13, fontFamily: FONT, width: '100%', justifyContent: 'center' },
  btnEliminar: { background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' },
  archivoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 6 },
  archivoIcon: { width: 36, height: 36, borderRadius: 8, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  archivoNombre: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  archivoMeta: { fontFamily: FONT, fontSize: 11, color: '#94a3b8', margin: '2px 0 0' },
  footer: { textAlign: 'center' as const, padding: '16px 28px', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, fontFamily: FONT },
  respuestaPreview: { marginTop: 20, padding: 16, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'left' as const },
  fileItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' },
};
