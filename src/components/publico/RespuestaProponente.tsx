import React, { useEffect, useState, useRef } from 'react';
import {
  Clock, CheckCircle2, XCircle, Send, Loader2, AlertTriangle, Lock, FileText,
  Upload, Trash2, File, Paperclip, PenLine, Landmark
} from 'lucide-react';
import { COLORES } from '../../styles/colores-corporativos';

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

type DocumentoRA14Key = 'rut' | 'camara_comercio' | 'cedula_rl'
  | 'redam' | 'antecedentes_fiscales' | 'antecedentes_disciplinarios' | 'antecedentes_judiciales'
  | 'hoja_vida' | 'titulo_profesional' | 'certificaciones_laborales';

type TipoObjetoContractual = 'bienes_servicios' | 'servicios_profesionales';

interface DocumentoRA14 {
  tipo: DocumentoRA14Key;
  nombre: string;
  nombre_almacenado: string;
  tamano: number;
  mimetype: string;
  url: string;
  subido_en: string;
}

const DOCUMENTOS_RA14: { tipo: DocumentoRA14Key; label: string }[] = [
  { tipo: 'rut', label: 'RUT' },
  { tipo: 'cedula_rl', label: 'Cédula (persona natural / representante legal)' },
  { tipo: 'camara_comercio', label: 'Certificado de existencia y representación legal (Cámara de comercio)' },
  { tipo: 'redam', label: 'REDAM (Registro de Deudores Alimentarios Morosos)' },
  { tipo: 'antecedentes_fiscales', label: 'Antecedentes fiscales' },
  { tipo: 'antecedentes_disciplinarios', label: 'Antecedentes disciplinarios' },
  { tipo: 'antecedentes_judiciales', label: 'Antecedentes judiciales' },
];

// Documentos adicionales exigidos solo cuando la convocatoria es "Prestación de servicios profesionales"
// (checklist oficial num. 2), según lo definido por Jurídica al crear la convocatoria.
const DOCUMENTOS_RA14_SERVICIOS_PROFESIONALES: { tipo: DocumentoRA14Key; label: string }[] = [
  { tipo: 'hoja_vida', label: 'Hoja de vida' },
  { tipo: 'titulo_profesional', label: 'Título profesional' },
  { tipo: 'certificaciones_laborales', label: 'Certificaciones laborales' },
];

// Documentos del checklist que solo aplican a proponentes tipo "empresa" (persona jurídica) —
// el PDF oficial marca "Certificado de Existencia y Rep. Legal" como "(personas jurídicas)".
const DOCUMENTOS_RA14_SOLO_EMPRESA: DocumentoRA14Key[] = ['camara_comercio'];

function docsRequeridosRA14(tipoPersona?: 'persona' | 'empresa', tipoObjeto?: TipoObjetoContractual) {
  let docs = DOCUMENTOS_RA14;
  if (tipoPersona === 'persona') {
    docs = docs.filter(d => !DOCUMENTOS_RA14_SOLO_EMPRESA.includes(d.tipo));
  }
  if (tipoObjeto === 'servicios_profesionales') {
    docs = [...docs, ...DOCUMENTOS_RA14_SERVICIOS_PROFESIONALES];
  }
  return docs;
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
  tipo_objeto?: TipoObjetoContractual;
  tipo_persona?: 'persona' | 'empresa';
  documento_adjunto_url?: string | null;
  documento_adjunto_nombre?: string | null;
  ya_respondida: boolean;
  respuesta_texto: string | null;
  respuesta_archivos: ArchivoSubido[];
  documentos_proveedor: DocumentoRA14[];
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

/* ── Bloques reutilizables de la tabla RA1-4 (definidos fuera del componente
     para no perder el foco de los inputs en cada render) ── */
function SeccionRoja({ children }: { children: React.ReactNode }) {
  return <div style={p.seccionRoja}>{children}</div>;
}
function EncabezadoTabla({ children }: { children: React.ReactNode }) {
  return <div style={p.encabezadoTabla}>{children}</div>;
}
function Fila({ children, ultima }: { children: React.ReactNode; ultima?: boolean }) {
  return <div style={{ ...p.fila, ...(ultima ? { borderBottom: 'none' } : {}) }}>{children}</div>;
}
function Campo({ label, children, minWidth = 220 }: { label: string; children: React.ReactNode; minWidth?: number }) {
  return (
    <div style={{ ...p.campo, minWidth }}>
      <div style={p.celdaLabel}>{label}</div>
      <div style={p.celdaValor}>{children}</div>
    </div>
  );
}

function DocInputRA14({ label, documento, subiendo, onSelect, onRemove }: {
  label: string; documento: DocumentoRA14 | undefined; subiendo: boolean;
  onSelect: (f: File) => void; onRemove: () => void;
}) {
  return (
    <div style={p.docRow}>
      <div style={p.docLabelWrap}>
        {documento ? <CheckCircle2 size={16} color="#10B981" /> : <FileText size={16} color="#94a3b8" />}
        <span style={p.docLabel}>{label} *</span>
      </div>
      {documento ? (
        <div style={p.docFileChip}>
          <span style={p.docFileName}>{documento.nombre}</span>
          <button type="button" onClick={onRemove} style={p.docRemoveBtn} title="Quitar archivo">
            <XCircle size={14} />
          </button>
        </div>
      ) : subiendo ? (
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, color: '#64748b' }}>
          <Loader2 size={14} className="animate-spin" /> Subiendo...
        </span>
      ) : (
        <label style={p.docUploadBtn}>
          <Upload size={13} /> Adjuntar archivo
          <input
            type="file"
            style={{ display: 'none' }}
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={e => { const f = e.target.files?.[0]; if (f) onSelect(f); e.target.value = ''; }}
          />
        </label>
      )}
    </div>
  );
}

export function RespuestaProponente() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<ConvocatoriaData | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [respuestaTexto, setRespuestaTexto] = useState('');
  const [archivosSubidos, setArchivosSubidos] = useState<ArchivoSubido[]>([]);
  const [subiendoArchivo, setSubiendoArchivo] = useState(false);

  /* ── Formulario RA1-4 — Tesorería y documentos del proveedor ── */
  const [banco, setBanco] = useState('');
  const [bancoSucursal, setBancoSucursal] = useState('');
  const [bancoEmailContacto, setBancoEmailContacto] = useState('');
  const [tipoCuenta, setTipoCuenta] = useState('');
  const [numeroCuenta, setNumeroCuenta] = useState('');
  const [documentosRA14, setDocumentosRA14] = useState<DocumentoRA14[]>([]);
  const [subiendoDocRA14, setSubiendoDocRA14] = useState<DocumentoRA14Key | null>(null);

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
        setDocumentosRA14(Array.isArray(d.documentos_proveedor) ? d.documentos_proveedor : []);
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

  /* ── Subir documento del formulario RA1-4 ── */
  const handleSubirDocumentoRA14 = async (tipo: DocumentoRA14Key, file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      setErrorEnvio(`El archivo "${file.name}" excede el límite de 20MB.`);
      return;
    }
    setSubiendoDocRA14(tipo);
    setErrorEnvio('');
    try {
      const formData = new FormData();
      formData.append('archivo', file);
      formData.append('token', token);
      formData.append('tipo', tipo);

      const resp = await fetch(`${API_URL}/api/proponente/subir-documento-ra14`, {
        method: 'POST',
        body: formData,
      });
      const result = await resp.json();
      if (!resp.ok) throw new Error(result.error || 'Error al subir el documento');
      setDocumentosRA14(prev => [...prev.filter(d => d.tipo !== tipo), result]);
    } catch (err: any) {
      setErrorEnvio(err.message || 'Error al subir el documento');
    } finally {
      setSubiendoDocRA14(null);
    }
  };

  /* ── Eliminar documento del formulario RA1-4 ── */
  const handleEliminarDocumentoRA14 = async (tipo: DocumentoRA14Key) => {
    try {
      const resp = await fetch(`${API_URL}/api/proponente/eliminar-documento-ra14`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, tipo }),
      });
      if (!resp.ok) {
        const r = await resp.json();
        throw new Error(r.error || 'Error');
      }
      setDocumentosRA14(prev => prev.filter(d => d.tipo !== tipo));
    } catch (err: any) {
      setErrorEnvio(err.message || 'Error al eliminar el documento');
    }
  };

  /* ── Enviar respuesta final ── */
  const handleEnviar = async () => {
    if (!respuestaTexto.trim() && archivosSubidos.length === 0) {
      setErrorEnvio('Debes escribir tu respuesta o adjuntar al menos un documento.');
      return;
    }
    if (!banco.trim() || !bancoSucursal.trim() || !bancoEmailContacto.trim() || !tipoCuenta.trim() || !numeroCuenta.trim()) {
      setErrorEnvio('Completa todos los datos de tesorería (banco, sucursal, correo de contacto, tipo y número de cuenta).');
      return;
    }
    const docsRequeridos = docsRequeridosRA14(data?.tipo_persona, data?.tipo_objeto);
    for (const doc of docsRequeridos) {
      if (!documentosRA14.some(d => d.tipo === doc.tipo)) {
        setErrorEnvio(`Debes adjuntar el documento: ${doc.label}.`);
        return;
      }
    }
    setEnviando(true);
    setErrorEnvio('');
    try {
      const resp = await fetch(`${API_URL}/api/proponente/responder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token, respuesta_texto: respuestaTexto, archivos: [],
          banco: banco.trim(), banco_sucursal: bancoSucursal.trim(), banco_email_contacto: bancoEmailContacto.trim(),
          tipo_cuenta: tipoCuenta.trim(), numero_cuenta: numeroCuenta.trim(),
        }),
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
          <Loader2 size={40} className="animate-spin" color={COLORES.sidebar} />
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
                    <File size={14} color={COLORES.sidebar} />
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
            <FileText size={18} color={COLORES.sidebar} />
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
              <Paperclip size={18} color={COLORES.sidebarHover} />
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
                background: COLORES.infoClaro, border: `1px solid ${COLORES.sidebarBorder}`,
                textDecoration: 'none',
              }}
            >
              <File size={22} color={COLORES.sidebar} style={{ flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: COLORES.sidebarHover, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {data.documento_adjunto_nombre || 'Documento adjunto'}
                </p>
                <p style={{ fontFamily: FONT, fontSize: 11, color: COLORES.sidebarHover, margin: '2px 0 0' }}>
                  Haz clic para abrir o descargar
                </p>
              </div>
              <Upload size={15} color={COLORES.sidebar} style={{ flexShrink: 0, transform: 'rotate(180deg)' }} />
            </a>
          </div>
        )}

        {/* ══════════════════ RA1-4 — Tesorería y documentos del proveedor ══════════════════ */}
        <div style={p.formSection}>
          <SeccionRoja>RA1-4 Tesorería y documentos del proveedor</SeccionRoja>
          <div style={p.tablaBox}>
            <EncabezadoTabla>Tesorería</EncabezadoTabla>
            <Fila>
              <Campo label="Banco" minWidth={220}>
                <input style={p.inputTabla} value={banco} onChange={e => setBanco(e.target.value)} placeholder="Ej: Banco de Bogotá" />
              </Campo>
              <Campo label="Sucursal" minWidth={200}>
                <input style={p.inputTabla} value={bancoSucursal} onChange={e => setBancoSucursal(e.target.value)} placeholder="Ej: Las Aguas" />
              </Campo>
              <Campo label="Dirección correo persona contacto" minWidth={260}>
                <input style={p.inputTabla} type="email" value={bancoEmailContacto} onChange={e => setBancoEmailContacto(e.target.value)} placeholder="tesoreria@empresa.com" />
              </Campo>
            </Fila>
            <Fila ultima>
              <Campo label="Tipo de cuenta" minWidth={220}>
                <select style={p.inputTabla} value={tipoCuenta} onChange={e => setTipoCuenta(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="Ahorros">Ahorros</option>
                  <option value="Corriente">Corriente</option>
                </select>
              </Campo>
              <Campo label="Número cuenta" minWidth={220}>
                <input style={p.inputTabla} value={numeroCuenta} onChange={e => setNumeroCuenta(e.target.value)} placeholder="Número de cuenta" />
              </Campo>
            </Fila>
          </div>

          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Landmark size={16} color={COLORES.sidebar} />
              <h3 style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 }}>Datos adjuntos</h3>
            </div>
            <div style={p.docsBox}>
              {docsRequeridosRA14(data?.tipo_persona, data?.tipo_objeto).map(doc => (
                <DocInputRA14
                  key={doc.tipo}
                  label={doc.label}
                  documento={documentosRA14.find(d => d.tipo === doc.tipo)}
                  subiendo={subiendoDocRA14 === doc.tipo}
                  onSelect={f => handleSubirDocumentoRA14(doc.tipo, f)}
                  onRemove={() => handleEliminarDocumentoRA14(doc.tipo)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Sección de carga de archivos ── */}
        <div style={p.formSection}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Paperclip size={18} color={COLORES.sidebar} />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 8px' }}>
            <PenLine size={18} color={COLORES.sidebar} />
            <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>Su respuesta</h3>
          </div>
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
            <p style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT, fontSize: 12, color: '#94a3b8', margin: 0 }}>
              {archivosSubidos.length > 0 && (
                <><Paperclip size={13} /> {archivosSubidos.length} documento{archivosSubidos.length > 1 ? 's' : ''} adjunto{archivosSubidos.length > 1 ? 's' : ''}</>
              )}
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
  pageBg: { minHeight: '100vh', background: COLORES.fondoApp, display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: FONT },
  centrado: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 400 },
  loadText: { fontFamily: FONT, fontSize: 15, color: '#64748b', fontWeight: 600 },
  errorTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#991B1B', margin: '0 0 8px' },
  errorText: { fontFamily: FONT, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 400 },
  mainCard: { background: '#fff', borderRadius: 16, borderTop: `4px solid ${COLORES.primario}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 900, width: '100%', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' },
  logoBadge: { fontFamily: FONT, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  logoBold: { fontWeight: 900, color: COLORES.primario },
  timerBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: COLORES.advertenciaClaro, color: '#92400E', fontSize: 12, fontWeight: 700, fontFamily: FONT },
  infoSection: { padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' },
  codeBadge: { display: 'inline-block', padding: '3px 10px', background: COLORES.sidebar, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, margin: '0 0 8px', fontFamily: FONT },
  titulo: { fontFamily: FONT, fontSize: 20, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' },
  subtitulo: { fontFamily: FONT, fontSize: 13, color: '#64748b', margin: 0 },
  welcomeBox: { margin: '0 28px', padding: '16px 20px', borderRadius: 10, background: COLORES.infoClaro, border: `1px solid ${COLORES.sidebarBorder}`, marginTop: 20 },
  plazoBox: { margin: '16px 28px', padding: '16px 20px', borderRadius: 10, background: COLORES.acentoClaro, border: '1px solid #FED7AA' },
  plazoLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 2px' },
  plazoValue: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 },
  requisitosSection: { padding: '20px 28px' },
  requisitosBox: { padding: '16px 20px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' },
  formSection: { padding: '0 28px 24px' },
  textarea: { width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const, transition: 'border-color 0.2s' },
  errorEnvio: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: COLORES.errorClaro, color: '#991B1B', fontSize: 13, fontWeight: 600, border: '1px solid #FECACA', marginTop: 10, fontFamily: FONT },
  btnEnviar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: COLORES.exito, color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: FONT },
  btnUpload: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: COLORES.infoClaro, color: COLORES.sidebarHover, fontWeight: 700, border: `2px dashed ${COLORES.sidebarBorder}`, cursor: 'pointer', fontSize: 13, fontFamily: FONT, width: '100%', justifyContent: 'center' },
  btnEliminar: { background: 'none', border: 'none', color: COLORES.error, cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center' },
  archivoRow: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: 6 },
  archivoIcon: { width: 36, height: 36, borderRadius: 8, background: COLORES.infoClaro, color: COLORES.sidebar, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  archivoNombre: { fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  archivoMeta: { fontFamily: FONT, fontSize: 11, color: '#94a3b8', margin: '2px 0 0' },
  footer: { textAlign: 'center' as const, padding: '16px 28px', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, fontFamily: FONT },
  respuestaPreview: { marginTop: 20, padding: 16, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', textAlign: 'left' as const },
  fileItem: { display: 'flex', alignItems: 'center', gap: 6, padding: '4px 0' },

  /* ── Tabla RA1-4 ── */
  seccionRoja: { background: COLORES.primario, color: '#fff', padding: '10px 18px', fontFamily: FONT, fontWeight: 900, fontSize: 14, borderRadius: '10px 10px 0 0' },
  tablaBox: { border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: 4 },
  encabezadoTabla: { background: '#eef2f7', padding: '8px 16px', fontFamily: FONT, fontWeight: 800, fontSize: 12, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.03em', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' },
  fila: { display: 'flex', flexWrap: 'wrap' as const, borderBottom: '1px solid #e2e8f0' },
  campo: { flex: '1 1 240px', display: 'flex', borderRight: '1px solid #e2e8f0' },
  celdaLabel: { background: '#f8fafc', padding: '10px 12px', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', width: 150, flexShrink: 0 },
  celdaValor: { padding: '6px 10px', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 },
  inputTabla: { width: '100%', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const, background: '#fff' },

  /* ── Datos adjuntos RA1-4 ── */
  docsBox: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' },
  docRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 14px', borderBottom: '1px solid #e2e8f0', background: '#fff' },
  docLabelWrap: { display: 'flex', alignItems: 'center', gap: 8 },
  docLabel: { fontFamily: FONT, fontSize: 13, fontWeight: 600, color: '#334155' },
  docUploadBtn: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, border: `1px dashed ${COLORES.sidebarBorder}`, background: COLORES.infoClaro, color: COLORES.sidebarHover, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  docFileChip: { display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0' },
  docFileName: { fontFamily: FONT, fontSize: 12, color: '#065F46', fontWeight: 600, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  docRemoveBtn: { background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' },
};
