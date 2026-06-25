import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Send, Clock, Users, Mail, Copy, CheckCircle2,
  XCircle, Loader2, Plus, Trash2, Eye, Globe,
  File, Download, EyeOff, ShieldCheck, Lock, Unlock, AlertTriangle, Upload
} from 'lucide-react';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const FONT = "'Gabarito', sans-serif";

const PREAMBULO_INVEST = `1. LA CORPORACIÓN
La Corporación para el Desarrollo y la Productividad Bogotá Región - Invest in Bogotá es la agencia de promoción de Bogotá y su región, tiene como propósito atraer inversión extranjera directa a Bogotá y su región, posicionarla internacionalmente y contribuir al desarrollo económico, diversificando la base productiva con actividades de valor agregado que generen nuevas oportunidades de empleo, propicien la transferencia de conocimiento y tecnología y faciliten la creación de vínculo entre el empresario local y los inversionistas.

`;

interface Proponente { email: string; nombre: string; fijo?: boolean; }
interface ArchivoResp {
  id: string; nombre: string; tamano: number; url: string; subido_en: string;
}
interface Invitacion {
  id?: string;
  proponente_email: string;
  proponente_nombre: string;
  token: string;
  enlace?: string;
  respondida?: boolean;
  respondida_en?: string;
  respuesta_texto?: string;
  respuesta_archivos?: ArchivoResp[];
  primer_acceso_en?: string;
  total_accesos?: number;
  es_postulacion_publica?: boolean;
  telefono?: string;
  link_enviado_en?: string;
}
interface Convocatoria {
  id: string;
  asunto: string;
  descripcion_requisitos: string;
  fecha_inicio: string;
  fecha_limite: string | null;
  fecha_limite_registro?: string | null;
  fase_invitacion_enviada?: boolean;
  invitacion_enviada_en?: string;
  fase1_notificacion_enviada?: boolean;
  fase1_notificacion_enviada_en?: string;
  total_invitados?: number;
  total_respondidos?: number;
  creado_en: string;
  link_publico_activo?: boolean;
  tipo_proponente?: 'empresa' | 'persona';
  documento_adjunto_url?: string | null;
  documento_adjunto_nombre?: string | null;
}

interface Props {
  solicitudId: string | null;
  onBack: () => void;
  userEmail?: string;
}

function fmtFecha(iso: string | null | undefined) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}
function fmtTamano(bytes: number) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function hoy() { return new Date().toISOString().slice(0, 16); }
function enNDias(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 16);
}

export function ConvocatoriaProponentes({ solicitudId, onBack, userEmail }: Props) {
  /* ─── Lista ─── */
  const [convocatorias, setConvocatorias] = useState<Convocatoria[]>([]);
  const [cargandoLista, setCargandoLista] = useState(true);

  /* ─── Modo de vista ─── */
  const [modo, setModo] = useState<'lista' | 'crear' | 'detalle'>('lista');

  /* ─── Formulario crear — FASE 1 ─── */
  const [asunto, setAsunto] = useState('');
  const [objetoSolicitud, setObjetoSolicitud] = useState('');
  const [descripcionPublica, setDescripcionPublica] = useState('');  // descripción visible en link público
  const [fechaLimiteRegistro, setFechaLimiteRegistro] = useState(enNDias(7));  // Fase 1: fecha cierre de registro

  /* ─── Formulario crear — FASE 2 (opcional al crear, se puede dejar para después) ─── */
  const [requisitos, setRequisitos] = useState('');  // requisitos técnicos detallados (Fase 2)
  const [fechaLimitePropuesta, setFechaLimitePropuesta] = useState(enNDias(21)); // Fase 2: fecha entrega propuesta
  const [proponentes, setProponentes] = useState<Proponente[]>([{ email: '', nombre: '' }]);

  /* ─── Estados de creación ─── */
  const [creando, setCreando] = useState(false);
  const [errorCrear, setErrorCrear] = useState('');

  /* ─── Detalle de convocatoria ─── */
  const [detalleConv, setDetalleConv] = useState<Convocatoria | null>(null);
  const [detalleInvitaciones, setDetalleInvitaciones] = useState<Invitacion[]>([]);
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date | null>(null);

  /* ─── Envío masivo (Fase 2) ─── */
  const [enviandoMasivo, setEnviandoMasivo] = useState(false);
  const [resultadoMasivo, setResultadoMasivo] = useState<{ total: number; mensaje: string } | null>(null);
  const [fechaLimiteMasivo, setFechaLimiteMasivo] = useState('');  // fecha límite para propuestas en Fase 2

  /* ─── Link público ─── */
  const [togglingLink, setTogglingLink] = useState(false);
  const [copiadoPublicoId, setCopiadoPublicoId] = useState<string | null>(null);

  /* ─── Error global y copia de enlace individual ─── */
  const [error, setError] = useState('');
  const [copiado, setCopiado] = useState<string | null>(null);
  const [eliminandoInv, setEliminandoInv] = useState<string | null>(null);
  const [eliminandoConv, setEliminandoConv] = useState<string | null>(null);

  /* ─── Fase 1 — envío de notificación ─── */
  const [enviandoFase1, setEnviandoFase1] = useState(false);
  const [resultadoFase1, setResultadoFase1] = useState<{ total: number } | null>(null);

  /* ─── Edición de requisitos en detalle (antes de Fase 2) ─── */
  const [editRequisitos, setEditRequisitos] = useState('');
  const [guardandoReq] = useState(false);
  const [guardadoReq] = useState(false);

  /* ─── Tipo de proponente y documento adjunto (formulario crear) ─── */
  const [tipoProponente, setTipoProponente] = useState<'empresa' | 'persona'>('empresa');
  const [docAdjunto, setDocAdjunto] = useState<{ url: string; nombre: string } | null>(null);
  const [subiendoDoc, setSubiendoDoc] = useState(false);
  const [errorDoc, setErrorDoc] = useState('');
  // ID de convocatoria ya creada por "Enviar Fase 1" — evita crear duplicado al enviar Fase 2
  const [convIdCreado, setConvIdCreado] = useState<string | null>(null);

  /* ════ Cargar lista de convocatorias ════ */
  useEffect(() => {
    setCargandoLista(true);
    const url = solicitudId
      ? `${API_URL}/api/convocatorias?solicitud_id=${solicitudId}`
      : `${API_URL}/api/convocatorias`;
    fetch(url)
      .then(r => r.json())
      .then(d => setConvocatorias(Array.isArray(d) ? d : []))
      .catch(() => setConvocatorias([]))
      .finally(() => setCargandoLista(false));
  }, [solicitudId]);

  /* ════ Pre-llenar desde solicitud ════ */
  useEffect(() => {
    if (!solicitudId) return;
    fetch(`${API_URL}/api/solicitudes/${solicitudId}`)
      .then(r => r.json())
      .then(sol => {
        if (Array.isArray(sol.proponentes) && sol.proponentes.length > 0) {
          setProponentes(sol.proponentes.map((p: any) => ({
            email: p.correo || (p.datos_contacto || '').match(/[^\s@]+@[^\s@]+\.[^\s@]+/)?.[0] || p.email || '',
            nombre: p.nombre_proveedor || p.nombre || '',
            fijo: true,
          })));
          setAsunto(`Convocatoria — ${sol.codigo || ''} — ${sol.titulo_contrato || sol.objeto || ''}`);
          setObjetoSolicitud(sol.titulo_contrato || sol.objeto || '');
        }
      })
      .catch(() => {});
  }, [solicitudId]);

  /* ════ Pre-llenar fecha de propuesta cuando se abre el detalle ════ */
  useEffect(() => {
    if (detalleConv) {
      setFechaLimiteMasivo(
        detalleConv.fecha_limite
          ? detalleConv.fecha_limite.slice(0, 16)
          : enNDias(21)
      );
    }
  }, [detalleConv?.id]);

  /* ════ Polling automático en vista de detalle — actualiza cada 15s ════ */
  useEffect(() => {
    if (modo !== 'detalle' || !detalleConv) return;

    const poll = async () => {
      try {
        const resp = await fetch(`${API_URL}/api/convocatorias/${detalleConv.id}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setDetalleConv(data.convocatoria);
        setDetalleInvitaciones(data.invitaciones || []);
        setUltimaActualizacion(new Date());
      } catch {
        // fallo silencioso — no mostrar error por polling de fondo
      }
    };

    const intervalo = setInterval(poll, 15_000);
    return () => clearInterval(intervalo);
  }, [modo, detalleConv?.id]);

  /* ════ Helpers de creación ════ */
  const [faseCreando, setFaseCreando] = useState<1 | 2 | null>(null);

  const crearBase = async () => {
    const propsFiltrados = proponentes.filter(p => p.email.trim());
    const resp = await fetch(`${API_URL}/api/convocatorias`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        solicitud_id: solicitudId,
        asunto,
        descripcion_publica: descripcionPublica.trim(),
        descripcion_requisitos: requisitos.trim() ? requisitos.trim() : '',
        fecha_inicio: new Date().toISOString(),
        fecha_limite: fechaLimitePropuesta || null,
        fecha_limite_registro: fechaLimiteRegistro,
        proponentes: propsFiltrados,
        creada_por: userEmail || 'juridica',
        tipo_proponente: tipoProponente,
        documento_adjunto_url: docAdjunto?.url || null,
        documento_adjunto_nombre: docAdjunto?.nombre || null,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error al crear');
    return data.convocatoria.id as string;
  };

  const refrescarListaYDetalle = async (convId: string) => {
    const listUrl = solicitudId
      ? `${API_URL}/api/convocatorias?solicitud_id=${solicitudId}`
      : `${API_URL}/api/convocatorias`;
    const listResp = await fetch(listUrl);
    setConvocatorias(await listResp.json());
    await verDetalle(convId);
  };

  /* Botón "Enviar Fase 1" — crea + activa link + notifica proponentes conocidos.
     NO cambia a la vista de detalle para que el usuario pueda completar y enviar Fase 2 en la misma sesión. */
  const handleEnviarFase1Nuevo = async () => {
    setErrorCrear('');
    if (!asunto.trim()) { setErrorCrear('El asunto es obligatorio'); return; }
    if (!descripcionPublica.trim()) { setErrorCrear('La descripción pública es obligatoria'); return; }
    if (!fechaLimiteRegistro) { setErrorCrear('La fecha límite de registro es obligatoria'); return; }
    if (new Date(fechaLimiteRegistro) <= new Date()) { setErrorCrear('La fecha límite de registro debe ser en el futuro'); return; }
    setCreando(true); setFaseCreando(1);
    try {
      const convId = await crearBase();
      await fetch(`${API_URL}/api/convocatorias/${convId}/enviar-fase1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_email: userEmail }),
      });
      // Quedar en el formulario de creación para que el usuario pueda enviar Fase 2
      setConvIdCreado(convId);
      // Actualizar lista en segundo plano
      const listUrl = solicitudId
        ? `${API_URL}/api/convocatorias?solicitud_id=${solicitudId}`
        : `${API_URL}/api/convocatorias`;
      fetch(listUrl).then(r => r.json()).then(d => setConvocatorias(Array.isArray(d) ? d : [])).catch(() => {});
    } catch (err: any) {
      setErrorCrear(err.message || 'Error al enviar la Fase 1');
    } finally {
      setCreando(false); setFaseCreando(null);
    }
  };

  /* Botón "Enviar Fase 2" — si Fase 1 ya fue enviada usa el ID existente, si no crea la convocatoria. */
  const handleEnviarFase2Nuevo = async () => {
    setErrorCrear('');
    if (!asunto.trim()) { setErrorCrear('El asunto es obligatorio'); return; }
    if (!descripcionPublica.trim()) { setErrorCrear('La descripción pública es obligatoria'); return; }
    if (!fechaLimiteRegistro) { setErrorCrear('La fecha límite de registro es obligatoria'); return; }
    if (!fechaLimitePropuesta) { setErrorCrear('La fecha límite para entregar propuesta es obligatoria al enviar la Fase 2'); return; }
    if (new Date(fechaLimitePropuesta) <= new Date()) { setErrorCrear('La fecha límite de propuesta debe ser en el futuro'); return; }
    setCreando(true); setFaseCreando(2);
    try {
      let convId: string;
      if (convIdCreado) {
        // Convocatoria ya creada por "Enviar Fase 1" — actualizar descripción y documento
        convId = convIdCreado;
        await fetch(`${API_URL}/api/convocatorias/${convId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            descripcion_requisitos: requisitos.trim() || '',
            ...(docAdjunto ? { documento_adjunto_url: docAdjunto.url, documento_adjunto_nombre: docAdjunto.nombre } : {}),
          }),
        });
      } else {
        // Flujo normal: crear nueva convocatoria con todos los campos
        convId = await crearBase();
      }
      const r2 = await fetch(`${API_URL}/api/convocatorias/${convId}/enviar-invitacion-masiva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_limite: fechaLimitePropuesta, usuario_email: userEmail }),
      });
      if (!r2.ok) { const d = await r2.json(); throw new Error(d.error || 'Error al enviar la Fase 2'); }
      await refrescarListaYDetalle(convId);
    } catch (err: any) {
      setErrorCrear(err.message || 'Error al enviar la Fase 2');
    } finally {
      setCreando(false); setFaseCreando(null);
    }
  };

  /* ════ Ver detalle de una convocatoria ════ */
  const verDetalle = async (convId: string) => {
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${convId}`);
      const data = await resp.json();
      setDetalleConv(data.convocatoria);
      setDetalleInvitaciones(data.invitaciones || []);
      setEditRequisitos(data.convocatoria?.descripcion_requisitos || '');
      if (data.convocatoria?.documento_adjunto_url) {
        setDocAdjunto({ url: data.convocatoria.documento_adjunto_url, nombre: data.convocatoria.documento_adjunto_nombre || 'Documento adjunto' });
      } else {
        setDocAdjunto(null);
      }
      setResultadoMasivo(null);
      setModo('detalle');
    } catch {
      setError('Error al cargar detalle');
    }
  };

  /* ════ Activar / desactivar link público ════ */
  const toggleLinkPublico = async (convId: string, activar: boolean) => {
    setTogglingLink(true);
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${convId}/link-publico`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: activar }),
      });
      if (!resp.ok) throw new Error('Error al actualizar');
      setDetalleConv(prev => prev ? { ...prev, link_publico_activo: activar } : prev);
      setConvocatorias(prev => prev.map(c => c.id === convId ? { ...c, link_publico_activo: activar } : c));
    } catch {
      setError('No se pudo actualizar el link público.');
    } finally {
      setTogglingLink(false);
    }
  };

  /* ════ Copiar link público ════ */
  const copiarLinkPublico = (convId: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/convocatoria-publica?id=${convId}`);
    setCopiadoPublicoId(convId);
    setTimeout(() => setCopiadoPublicoId(null), 2500);
  };

  /* ════ Copiar enlace individual ════ */
  const copiarEnlace = (enlace: string, token: string) => {
    navigator.clipboard.writeText(enlace);
    setCopiado(token);
    setTimeout(() => setCopiado(null), 2000);
  };

  /* ════ Eliminar invitación ════ */
  const eliminarInvitacion = async (invId: string) => {
    if (!detalleConv) return;
    if (!window.confirm('¿Eliminar esta invitación? Esta acción no se puede deshacer.')) return;
    setEliminandoInv(invId);
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${detalleConv.id}/invitaciones/${invId}`, {
        method: 'DELETE',
      });
      if (!resp.ok) throw new Error('Error al eliminar');
      setDetalleInvitaciones(prev => prev.filter(i => i.id !== invId));
    } catch { /* silent */ }
    finally { setEliminandoInv(null); }
  };

  /* Auto-guarda requisitos al perder el foco — sin botón explícito */
  const guardarRequisitos = async () => {
    if (!detalleConv || editRequisitos === detalleConv.descripcion_requisitos) return;
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${detalleConv.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descripcion_requisitos: editRequisitos }),
      });
      if (resp.ok) setDetalleConv(prev => prev ? { ...prev, descripcion_requisitos: editRequisitos } : prev);
    } catch { /* silent */ }
  };

  /* ════ Subir documento adjunto para Fase 2 ════ */
  const handleSubirDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendoDoc(true); setErrorDoc('');
    try {
      const formData = new FormData();
      formData.append('documento', file);
      const resp = await fetch(`${API_URL}/api/convocatorias/upload-documento`, { method: 'POST', body: formData });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Error al subir');
      setDocAdjunto({ url: data.url, nombre: data.nombre });
    } catch (err: any) {
      setErrorDoc(err.message || 'Error al subir el archivo');
    } finally {
      setSubiendoDoc(false);
    }
  };

  /* ════ Enviar notificación Fase 1 (link público a proponentes conocidos) ════ */
  const enviarFase1 = async (convId: string) => {
    setEnviandoFase1(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${convId}/enviar-fase1`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario_email: userEmail }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        if (data.ya_enviada) {
          const det = await fetch(`${API_URL}/api/convocatorias/${convId}`);
          const d = await det.json();
          setDetalleConv(d.convocatoria);
        }
        throw new Error(data.error || 'Error al enviar');
      }
      setResultadoFase1({ total: data.total_notificados });
      const det = await fetch(`${API_URL}/api/convocatorias/${convId}`);
      const d = await det.json();
      setDetalleConv(d.convocatoria);
      setDetalleInvitaciones(d.invitaciones || []);
    } catch (err: any) {
      setError(err.message || 'Error al enviar la notificación de Fase 1');
    } finally {
      setEnviandoFase1(false);
    }
  };

  /* ════ Enviar Invitación a Ofertar (Fase 2) ════ */
  const enviarInvitacionMasiva = async (convId: string) => {
    if (!fechaLimiteMasivo) {
      setError('Debes definir la fecha límite para entregar la propuesta antes de enviar.');
      return;
    }
    if (new Date(fechaLimiteMasivo) <= new Date()) {
      setError('La fecha límite para la propuesta debe ser en el futuro.');
      return;
    }
    // Guardar descripción y documento antes de enviar
    await guardarRequisitos();
    if (docAdjunto && docAdjunto.url !== detalleConv?.documento_adjunto_url) {
      await fetch(`${API_URL}/api/convocatorias/${convId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documento_adjunto_url: docAdjunto.url, documento_adjunto_nombre: docAdjunto.nombre }),
      });
    }
    setEnviandoMasivo(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${convId}/enviar-invitacion-masiva`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha_limite: fechaLimiteMasivo, usuario_email: userEmail }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        // Si ya fue enviada, refrescar para mostrar estado correcto y ocultar el botón
        if (data.ya_enviada) {
          const det = await fetch(`${API_URL}/api/convocatorias/${convId}`);
          const d = await det.json();
          setDetalleConv(d.convocatoria);
          setDetalleInvitaciones(d.invitaciones || []);
        }
        throw new Error(data.error || 'Error al enviar');
      }
      setResultadoMasivo({ total: data.total_enviados, mensaje: data.mensaje });
      // Refrescar detalle
      const det = await fetch(`${API_URL}/api/convocatorias/${convId}`);
      const d = await det.json();
      setDetalleConv(d.convocatoria);
      setDetalleInvitaciones(d.invitaciones || []);
    } catch (err: any) {
      setError(err.message || 'Error al enviar las invitaciones');
    } finally {
      setEnviandoMasivo(false);
    }
  };

  /* ════ Eliminar convocatoria completa ════ */
  const eliminarConvocatoria = async (convId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('¿Eliminar esta convocatoria y todas sus invitaciones? Esta acción no se puede deshacer.')) return;
    setEliminandoConv(convId);
    try {
      const resp = await fetch(`${API_URL}/api/convocatorias/${convId}`, { method: 'DELETE' });
      if (!resp.ok) throw new Error('Error al eliminar');
      setConvocatorias(prev => prev.filter(c => c.id !== convId));
    } catch {
      setError('No se pudo eliminar la convocatoria.');
    } finally {
      setEliminandoConv(null);
    }
  };

  /* ════ Helpers proponentes ════ */
  const agregarProponente = () => setProponentes([...proponentes, { email: '', nombre: '' }]);
  const eliminarProponente = (i: number) => setProponentes(proponentes.filter((_, idx) => idx !== i));
  const actualizarProponente = (i: number, field: 'email' | 'nombre', val: string) => {
    const copia = [...proponentes];
    copia[i] = { ...copia[i], [field]: val };
    setProponentes(copia);
  };

  /* ════════════════════════════════════════════
     RENDER — DETALLE DE CONVOCATORIA
  ════════════════════════════════════════════ */
  if (modo === 'detalle' && detalleConv) {
    const ahora = new Date();
    const registroCerrado = detalleConv.fecha_limite_registro
      ? ahora > new Date(detalleConv.fecha_limite_registro)
      : false;
    const invitacionEnviada = detalleConv.fase_invitacion_enviada === true;

    const registradosPublicos = detalleInvitaciones.filter(i => i.es_postulacion_publica);
    const registradosDirectos = detalleInvitaciones.filter(i => !i.es_postulacion_publica);

    return (
      <div style={s.page}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <button onClick={() => setModo('lista')} style={{ ...s.backBtn, marginBottom: 0 }}>
            <ArrowLeft size={15} /> Volver a convocatorias
          </button>
          <button
            onClick={async e => { await eliminarConvocatoria(detalleConv.id, e); setModo('lista'); }}
            disabled={eliminandoConv === detalleConv.id}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', cursor: 'pointer', color: '#991B1B', fontSize: 12, fontWeight: 700, fontFamily: FONT }}
          >
            {eliminandoConv === detalleConv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
            Eliminar convocatoria
          </button>
        </div>
        <h2 style={s.pageTitle}>{detalleConv.asunto}</h2>
        {error && (
          <div style={s.errorBox}><XCircle size={15} /> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991B1B' }}>✕</button>
          </div>
        )}

        {/* ══════════════════════════════════════
            FASE 1 — REGISTRO PÚBLICO
        ══════════════════════════════════════ */}
        <div style={{ ...s.card, borderLeft: `4px solid ${registroCerrado ? '#94a3b8' : detalleConv.fase1_notificacion_enviada ? '#3384D6' : '#94a3b8'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={faseBadge(registroCerrado ? '#94a3b8' : detalleConv.fase1_notificacion_enviada ? '#3384D6' : '#94a3b8')}>1</div>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Fase 1 — Registro Público</h3>
            <span style={{ ...s.badge, marginLeft: 'auto',
              ...(registroCerrado
                ? { background: '#F1F5F9', color: '#64748b' }
                : detalleConv.fase1_notificacion_enviada
                  ? { background: '#ECFDF5', color: '#065F46' }
                  : { background: '#F8FAFC', color: '#94a3b8' })
            }}>
              {registroCerrado ? <><Lock size={10} /> Registro cerrado</> : detalleConv.fase1_notificacion_enviada ? <><Globe size={10} /> Activa</> : 'Pendiente de envío'}
            </span>
          </div>

          {/* Estado A: Borrador — Fase 1 no enviada todavía */}
          {!detalleConv.fase1_notificacion_enviada && !resultadoFase1 && !registroCerrado && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: '16px 20px', marginBottom: 14 }}>
              <p style={{ fontFamily: FONT, fontSize: 13, color: '#334155', margin: '0 0 4px', fontWeight: 700 }}>
                Convocatoria creada como borrador
              </p>
              <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
                Al enviar la Fase 1: se activa el link público para Computrabajo y se notifica por correo a los {registradosDirectos.length} proponente(s) ya registrado(s).
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => enviarFase1(detalleConv.id)}
                  disabled={enviandoFase1}
                  style={{ ...s.btnPrimary, background: '#3384D6', fontSize: 14 }}
                >
                  {enviandoFase1
                    ? <><Loader2 size={15} className="animate-spin" /> Enviando Fase 1...</>
                    : <><Send size={15} /> Enviar Fase 1</>}
                </button>
                <span style={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8' }}>
                  Activa el link + notifica a proponentes conocidos
                </span>
              </div>
            </div>
          )}

          {/* Estado B: Fase 1 enviada — link activo */}
          {(detalleConv.fase1_notificacion_enviada || resultadoFase1) && !registroCerrado && (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Enviada el</p>
                  <p style={s.infoChipVal}>{fmtFecha(detalleConv.fase1_notificacion_enviada_en)}</p>
                </div>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Registrados públicamente</p>
                  <p style={s.infoChipVal}>{registradosPublicos.length} empresa(s)</p>
                </div>
              </div>
              <div style={s.linkPublicoBox}>
                <Globe size={14} color="#065F46" style={{ flexShrink: 0 }} />
                <span style={s.linkPublicoUrl}>{window.location.origin}/convocatoria-publica?id={detalleConv.id}</span>
                <button
                  onClick={() => copiarLinkPublico(detalleConv.id)}
                  style={{ ...s.btnCopy, background: copiadoPublicoId === detalleConv.id ? '#10B981' : '#3384D6', flexShrink: 0 }}
                >
                  {copiadoPublicoId === detalleConv.id ? <><CheckCircle2 size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}
                </button>
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  onClick={() => toggleLinkPublico(detalleConv.id, !detalleConv.link_publico_activo)}
                  disabled={togglingLink}
                  style={{ ...s.btnSecondary,
                    background: detalleConv.link_publico_activo ? '#FEF2F2' : '#ECFDF5',
                    color: detalleConv.link_publico_activo ? '#991B1B' : '#065F46',
                    border: `1px solid ${detalleConv.link_publico_activo ? '#FECACA' : '#A7F3D0'}` }}
                >
                  {togglingLink ? <Loader2 size={14} className="animate-spin" /> :
                    detalleConv.link_publico_activo ? <><Lock size={13} /> Cerrar registro antes de tiempo</> : <><Unlock size={13} /> Reabrir registro</>}
                </button>
              </div>
            </>
          )}

          {/* Estado C: Registro cerrado */}
          {registroCerrado && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={s.infoChip}>
                <p style={s.infoChipLabel}>Fecha límite de registro</p>
                <p style={{ ...s.infoChipVal, color: '#991B1B' }}>{fmtFecha(detalleConv.fecha_limite_registro)}</p>
              </div>
              <div style={s.infoChip}>
                <p style={s.infoChipLabel}>Total registrados</p>
                <p style={s.infoChipVal}>{detalleInvitaciones.length} empresa(s)</p>
              </div>
            </div>
          )}
        </div>

        {/* ══════════════════════════════════════
            FASE 2 — INVITACIÓN A OFERTAR
        ══════════════════════════════════════ */}
        <div style={{ ...s.card, borderLeft: `4px solid ${invitacionEnviada ? '#10B981' : '#E84922'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <div style={faseBadge(invitacionEnviada ? '#10B981' : '#E84922')}>2</div>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Fase 2 — Invitación a Ofertar</h3>
            {invitacionEnviada && (
              <span style={{ ...s.badge, background: '#ECFDF5', color: '#065F46', marginLeft: 'auto' }}>
                <CheckCircle2 size={11} /> Invitaciones enviadas
              </span>
            )}
          </div>

          {invitacionEnviada ? (
            /* Ya fue enviada — resumen + descripción de solo lectura */
            <div>
              <p style={{ fontFamily: FONT, fontSize: 13, color: '#065F46', fontWeight: 700, margin: '0 0 12px' }}>
                ¡Invitación formal enviada el {fmtFecha(detalleConv.invitacion_enviada_en)}!
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Fecha límite para propuesta</p>
                  <p style={{ ...s.infoChipVal, color: '#E84922' }}>{fmtFecha(detalleConv.fecha_limite)}</p>
                </div>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Total invitados</p>
                  <p style={s.infoChipVal}>{detalleInvitaciones.filter(i => i.link_enviado_en).length}</p>
                </div>
              </div>
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14 }}>
                <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.08em', margin: '0 0 6px' }}>
                  Descripción y requisitos enviados
                </p>
                <p style={s.reqText}>{detalleConv.descripcion_requisitos || <em style={{ color: '#94a3b8' }}>Sin descripción registrada.</em>}</p>
              </div>
            </div>
          ) : (
            /* Pendiente de enviar — formulario completo */
            <div>
              {!registroCerrado && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 14px', borderRadius: 8, background: '#FFF7ED', border: '1px solid #FED7AA', marginBottom: 14 }}>
                  <AlertTriangle size={15} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
                  <p style={{ fontFamily: FONT, fontSize: 12, color: '#92400E', margin: 0 }}>
                    El período de registro todavía está abierto. Puedes enviar la invitación antes o esperar a que se cierre.
                  </p>
                </div>
              )}

              <p style={{ fontFamily: FONT, fontSize: 13, color: '#475569', margin: '0 0 14px', lineHeight: 1.5 }}>
                La invitación formal se enviará a <strong>{detalleInvitaciones.length} destinatarios</strong>: los registrados en el link público y los proponentes ya registrados en la solicitud.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Registrados vía link público</p>
                  <p style={s.infoChipVal}>{registradosPublicos.length} empresa(s)</p>
                </div>
                <div style={s.infoChip}>
                  <p style={s.infoChipLabel}>Proponentes ya registrados</p>
                  <p style={s.infoChipVal}>{registradosDirectos.length} proponente(s)</p>
                </div>
              </div>

              {/* Descripción y requisitos — integrada en el mismo card */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 14, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...s.label, margin: 0 }}>Descripción y requisitos</label>
                  <span style={{ ...s.badge, background: '#FFF7ED', color: '#92400E' }}>Se incluye en el correo</span>
                </div>
                <textarea
                  style={{ ...s.input, width: '100%', minHeight: 130, resize: 'vertical', marginBottom: 0, boxSizing: 'border-box' as const }}
                  value={editRequisitos}
                  onChange={e => setEditRequisitos(e.target.value)}
                  onBlur={guardarRequisitos}
                  placeholder="Documentos requeridos, especificaciones técnicas, experiencia mínima, requisitos legales, etc."
                />
              </div>

              {/* Documento adjunto */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ ...s.label, margin: 0 }}>Documento adjunto <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
                  <span style={{ ...s.badge, background: '#EFF6FF', color: '#1D4ED8' }}>TDR, ficha técnica, etc.</span>
                </div>
                {docAdjunto ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                    <File size={15} color="#3384D6" />
                    <span style={{ fontFamily: FONT, fontSize: 13, color: '#1D4ED8', fontWeight: 600, flex: 1 }}>{docAdjunto.nombre}</span>
                    <button type="button" onClick={() => setDocAdjunto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                      <XCircle size={14} />
                    </button>
                  </div>
                ) : (
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px dashed #CBD5E1', cursor: subiendoDoc ? 'default' : 'pointer', background: '#fff' }}>
                    {subiendoDoc
                      ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> <span style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Subiendo...</span></>
                      : <><Upload size={14} color="#64748b" /> <span style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Adjuntar documento (PDF, Word, Excel…)</span></>}
                    <input type="file" style={{ display: 'none' }} onChange={handleSubirDoc} disabled={subiendoDoc} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
                  </label>
                )}
                {errorDoc && <p style={{ fontFamily: FONT, fontSize: 12, color: '#991B1B', margin: '4px 0 0' }}>{errorDoc}</p>}
              </div>

              <label style={{ ...s.label, marginTop: 0 }}>
                Fecha límite para ENTREGAR la propuesta *
              </label>
              <input
                style={{ ...s.input, maxWidth: 280, marginBottom: 6 }}
                type="datetime-local"
                value={fechaLimiteMasivo}
                onChange={e => setFechaLimiteMasivo(e.target.value)}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 16px' }}>
                Fecha hasta la cual los proponentes pueden entregar su propuesta.
              </p>

              {resultadoMasivo ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
                  <CheckCircle2 size={20} color="#10B981" />
                  <div>
                    <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#065F46', margin: 0 }}>¡Invitaciones enviadas!</p>
                    <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{resultadoMasivo.mensaje}</p>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => detalleConv && enviarInvitacionMasiva(detalleConv.id)}
                  disabled={enviandoMasivo}
                  style={{ ...s.btnPrimary, background: '#E84922' }}
                >
                  {enviandoMasivo
                    ? <><Loader2 size={15} className="animate-spin" /> Enviando...</>
                    : <><Send size={15} /> Enviar Fase 2 — Invitación a ofertar</>}
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Panel de proponentes ── */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>
              👥 Proponentes &nbsp;
              <span style={{ fontWeight: 400, color: '#64748b', fontSize: 12 }}>
                {detalleInvitaciones.filter(i => i.respondida).length} respondieron &bull;{' '}
                {detalleInvitaciones.filter(i => !i.respondida && i.primer_acceso_en && i.link_enviado_en).length} abrieron enlace &bull;{' '}
                {detalleInvitaciones.length} total
              </span>
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <span style={{
                width: 8, height: 8, borderRadius: '50%', background: '#10B981',
                boxShadow: '0 0 0 2px #A7F3D0',
                animation: 'pulse 2s infinite',
                display: 'inline-block'
              }} />
              <span style={{ fontFamily: FONT, fontSize: 11, color: '#64748b' }}>
                En vivo
                {ultimaActualizacion && ` · ${ultimaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
              </span>
            </div>
          </div>

          {detalleInvitaciones.length === 0 ? (
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', textAlign: 'center', padding: '20px 0' }}>
              Aún no hay proponentes registrados.
            </p>
          ) : (
            detalleInvitaciones.map((inv, i) => {
              // Solo cuenta como "abrió enlace Fase 2" si el acceso fue DESPUÉS de que se envió la invitación
              const abrioPhaseDos = !!(inv.link_enviado_en && inv.primer_acceso_en &&
                new Date(inv.primer_acceso_en) > new Date(inv.link_enviado_en));
              const estadoColor = inv.respondida ? '#10B981'
                : abrioPhaseDos ? '#F59E0B'
                : inv.es_postulacion_publica && !inv.link_enviado_en ? '#3384D6'
                : '#E5E7EB';
              return (
                <div key={i} style={{ ...s.invRow, borderLeft: `4px solid ${estadoColor}`, position: 'relative' as const }}>
                  {inv.id && (
                    <button
                      onClick={() => eliminarInvitacion(inv.id!)}
                      disabled={eliminandoInv === inv.id}
                      title="Eliminar invitación"
                      style={{ position: 'absolute' as const, top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#cbd5e1', padding: 2, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                    >
                      {eliminandoInv === inv.id ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={13} />}
                    </button>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' as const }}>
                      <p style={{ ...s.invNombre, margin: 0 }}>{inv.proponente_nombre || inv.proponente_email}</p>
                      {inv.es_postulacion_publica && (
                        <span style={{ ...s.estadoBadge, background: '#EFF6FF', color: '#1D4ED8' }}>
                          <Globe size={10} /> Registrado público
                        </span>
                      )}
                      {inv.respondida && (
                        <span style={{ ...s.estadoBadge, background: '#ECFDF5', color: '#065F46' }}>
                          <CheckCircle2 size={10} /> Respondió
                        </span>
                      )}
                      {!inv.respondida && abrioPhaseDos && (
                        <span style={{ ...s.estadoBadge, background: '#FFFBEB', color: '#92400E' }}>
                          <Eye size={10} /> Abrió enlace
                        </span>
                      )}
                      {!inv.respondida && inv.link_enviado_en && !abrioPhaseDos && (
                        <span style={{ ...s.estadoBadge, background: '#F8FAFC', color: '#94a3b8' }}>
                          <EyeOff size={10} /> Invitado — sin abrir
                        </span>
                      )}
                      {!inv.link_enviado_en && inv.es_postulacion_publica && (
                        <span style={{ ...s.estadoBadge, background: '#EFF6FF', color: '#1D4ED8' }}>
                          ⏳ Esperando Fase 2
                        </span>
                      )}
                    </div>
                    <p style={s.invEmail}>
                      {inv.proponente_email}
                      {inv.telefono && <span style={{ color: '#94a3b8', marginLeft: 8 }}>· {inv.telefono}</span>}
                    </p>

                    {inv.respondida ? (
                      <>
                        <p style={{ ...s.invStatus, color: '#065F46' }}>
                          Respondió el {fmtFecha(inv.respondida_en || '')}
                        </p>
                        {inv.primer_acceso_en && (
                          <p style={{ ...s.invStatus, color: '#64748b', fontSize: 11 }}>
                            <ShieldCheck size={10} style={{ display: 'inline', marginRight: 3 }} />
                            Primer acceso: {fmtFecha(inv.primer_acceso_en)}
                            {(inv.total_accesos ?? 0) > 1 && ` · ${inv.total_accesos} visitas`}
                          </p>
                        )}
                        {inv.respuesta_texto && (
                          <div style={s.respuestaBox}>
                            <p style={s.respuestaTexto}>{inv.respuesta_texto}</p>
                          </div>
                        )}
                        {Array.isArray(inv.respuesta_archivos) && inv.respuesta_archivos.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#334155', marginBottom: 6 }}>
                              Documentos adjuntos ({inv.respuesta_archivos.length}):
                            </p>
                            {inv.respuesta_archivos.map((arch, ai) => (
                              <div key={ai} style={s.archivoRow}>
                                <div style={s.archivoIcon}><File size={14} /></div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <p style={s.archivoNombre}>{arch.nombre}</p>
                                  <p style={s.archivoMeta}>{fmtTamano(arch.tamano)}</p>
                                </div>
                                <a href={`${API_URL}${arch.url}`} target="_blank" rel="noreferrer" style={s.btnDescargar}>
                                  <Download size={14} /> Descargar
                                </a>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : inv.es_postulacion_publica && !inv.link_enviado_en ? (
                      <p style={{ ...s.invStatus, color: '#1D4ED8' }}>
                        Registrado vía link público — recibirá su enlace personal cuando se envíe la Fase 2
                      </p>
                    ) : inv.link_enviado_en ? (
                      <>
                        <p style={{ ...s.invStatus, color: '#065F46' }}>
                          Invitación enviada el {fmtFecha(inv.link_enviado_en)}
                        </p>
                        <p style={{ ...s.invStatus, color: '#92400E', fontSize: 11 }}>
                          {abrioPhaseDos
                            ? `Abrió el enlace el ${fmtFecha(inv.primer_acceso_en!)}`
                            : 'Pendiente de abrir el enlace'}
                        </p>
                        {inv.token && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                            <span style={{ fontFamily: FONT, fontSize: 11, color: '#94a3b8', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '3px 8px', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                              {`${window.location.origin}/respuesta-proponente?token=${inv.token}`}
                            </span>
                            <button
                              onClick={() => copiarEnlace(`${window.location.origin}/respuesta-proponente?token=${inv.token}`, inv.token)}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 6, border: '1px solid #e2e8f0', background: copiado === inv.token ? '#D1FAE5' : '#fff', color: copiado === inv.token ? '#065F46' : '#64748b', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                            >
                              {copiado === inv.token ? <><CheckCircle2 size={11} /> Copiado</> : <><Copy size={11} /> Copiar link</>}
                            </button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p style={{ ...s.invStatus, color: '#94a3b8' }}>
                        Registrado — invitación pendiente de envío
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RENDER — CREAR NUEVA CONVOCATORIA
  ════════════════════════════════════════════ */
  if (modo === 'crear') {
    return (
      <div style={s.page}>
        <button onClick={() => { setModo('lista'); setConvIdCreado(null); }} style={s.backBtn}><ArrowLeft size={15} /> Cancelar</button>
        <h2 style={s.pageTitle}>Nueva convocatoria</h2>
        <p style={s.pageSubtitle}>
          Completa los campos y usa el botón de la fase que quieres enviar ahora.
        </p>

        {errorCrear && <div style={s.errorBox}><XCircle size={16} /> {errorCrear}</div>}

        {/* ─── Información general ─── */}
        <div style={s.card}>
          <h3 style={{ ...s.cardTitle, marginBottom: 16 }}>Información general</h3>
          <label style={s.label}>Asunto de la convocatoria *</label>
          <input
            style={{ ...s.input, fontWeight: 'bold', marginBottom: 12 }}
            value={asunto}
            onChange={e => setAsunto(e.target.value)}
            placeholder="Ej: Convocatoria — SOL-001 — Servicio de consultoría"
          />
          {objetoSolicitud && (
            <>
              <label style={s.label}>Objeto del contrato</label>
              <div style={{ ...s.input, backgroundColor: '#f8fafc', fontWeight: 500, color: '#1e293b', marginBottom: 4 }}>
                {objetoSolicitud}
              </div>
            </>
          )}

          <label style={{ ...s.label, marginTop: 12 }}>Tipo de proponente</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
            {(['empresa', 'persona'] as const).map(tipo => (
              <button
                key={tipo}
                type="button"
                onClick={() => setTipoProponente(tipo)}
                style={{
                  padding: '8px 18px', borderRadius: 8,
                  border: `2px solid ${tipoProponente === tipo ? '#3384D6' : '#e2e8f0'}`,
                  background: tipoProponente === tipo ? '#EFF6FF' : '#fff',
                  color: tipoProponente === tipo ? '#1D4ED8' : '#64748b',
                  fontFamily: FONT, fontSize: 13, fontWeight: tipoProponente === tipo ? 800 : 600, cursor: 'pointer'
                }}
              >
                {tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona natural'}
              </button>
            ))}
          </div>
          <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 0' }}>
            Define si el proceso aplica para empresas o personas naturales. Esto determina los campos del formulario de registro público.
          </p>
        </div>

        {/* ─── FASE 1: Registro Público ─── */}
        <div style={{ ...s.card, borderLeft: `4px solid ${convIdCreado ? '#10B981' : '#3384D6'}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: convIdCreado ? 12 : 4 }}>
            <div style={faseBadge(convIdCreado ? '#10B981' : '#3384D6')}>1</div>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Fase 1 — Link Público de Registro</h3>
            {convIdCreado && (
              <span style={{ ...s.badge, background: '#ECFDF5', color: '#065F46', marginLeft: 'auto' }}>
                <CheckCircle2 size={11} /> Enviada
              </span>
            )}
          </div>

          {convIdCreado ? (
            /* Fase 1 ya enviada — mostrar confirmación compacta + link */
            <div>
              <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 18px', marginBottom: 12 }}>
                <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#065F46', margin: '0 0 4px' }}>
                  ✓ Fase 1 enviada exitosamente
                </p>
                <p style={{ fontFamily: FONT, fontSize: 12, color: '#064E3B', margin: 0, lineHeight: 1.5 }}>
                  El link público está activo. Ahora completa los campos de la Fase 2 y envíala cuando estés listo.
                </p>
              </div>
              <div style={s.linkPublicoBox}>
                <Globe size={14} color="#065F46" style={{ flexShrink: 0 }} />
                <span style={s.linkPublicoUrl}>{window.location.origin}/convocatoria-publica?id={convIdCreado}</span>
                <button
                  onClick={() => copiarLinkPublico(convIdCreado)}
                  style={{ ...s.btnCopy, background: copiadoPublicoId === convIdCreado ? '#10B981' : '#3384D6', flexShrink: 0 }}
                >
                  {copiadoPublicoId === convIdCreado ? <><CheckCircle2 size={13} /> Copiado</> : <><Copy size={13} /> Copiar link</>}
                </button>
              </div>
            </div>
          ) : (
            /* Formulario Fase 1 — no enviada aún */
            <>
              <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: '0 0 14px' }}>
                Lo que verán las empresas externas al abrir el link.
              </p>

              <label style={s.label}>Descripción pública de la oportunidad *</label>
              <textarea
                style={{ ...s.input, minHeight: 100, resize: 'vertical', marginBottom: 4 }}
                value={descripcionPublica}
                onChange={e => setDescripcionPublica(e.target.value)}
                placeholder="Ej: Invest in Bogotá busca proveedor para el licenciamiento de Microsoft 365 para aprox. 120 usuarios. Se requiere experiencia en venta y soporte de licencias empresariales Microsoft. Registro abierto hasta [fecha]."
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 0, marginBottom: 14 }}>
                Este texto aparece en el link público. Sé claro y atractivo para que las empresas se animen a registrarse.
              </p>

              <label style={s.label}>Fecha límite de registro *</label>
              <input
                style={{ ...s.input, maxWidth: 280, marginBottom: 4 }}
                type="datetime-local"
                value={fechaLimiteRegistro}
                onChange={e => setFechaLimiteRegistro(e.target.value)}
              />
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 0, marginBottom: 20 }}>
                Después de esta fecha el link se cierra automáticamente.
              </p>

              <button
                onClick={handleEnviarFase1Nuevo}
                disabled={creando}
                style={{ ...s.btnPrimary, background: '#3384D6', opacity: creando && faseCreando !== 1 ? 0.5 : 1 }}
              >
                {creando && faseCreando === 1
                  ? <><Loader2 size={15} className="animate-spin" /> Enviando Fase 1...</>
                  : <><Send size={15} /> Enviar Fase 1</>}
              </button>
            </>
          )}
        </div>

        {/* ─── FASE 2: Invitación a Ofertar ─── */}
        <div style={{ ...s.card, borderLeft: '4px solid #E84922' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <div style={faseBadge('#E84922')}>2</div>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Fase 2 — Invitación a Ofertar</h3>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: '0 0 16px' }}>
            Invitación formal con enlace único por proponente. Se envía a todos los registrados + los proponentes conocidos.
          </p>

          <label style={s.label}>Descripción y requisitos técnicos</label>
          <textarea
            style={{ ...s.input, minHeight: 110, resize: 'vertical', marginBottom: 4 }}
            value={requisitos}
            onChange={e => setRequisitos(e.target.value)}
            placeholder="Documentos requeridos, especificaciones técnicas, experiencia mínima, requisitos legales, etc."
          />
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 0, marginBottom: 16 }}>
            Se incluye en el correo de invitación. También puedes editarlo desde el detalle antes de enviar.
          </p>

          {/* ─── Documento adjunto ─── */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...s.label, margin: 0 }}>Documento adjunto <span style={{ fontWeight: 400, color: '#94a3b8' }}>(opcional)</span></label>
              <span style={{ ...s.badge, background: '#EFF6FF', color: '#1D4ED8' }}>TDR, ficha técnica, etc.</span>
            </div>
            {docAdjunto ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
                <File size={15} color="#3384D6" />
                <span style={{ fontFamily: FONT, fontSize: 13, color: '#1D4ED8', fontWeight: 600, flex: 1 }}>{docAdjunto.nombre}</span>
                <button type="button" onClick={() => setDocAdjunto(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 0, display: 'flex', alignItems: 'center' }}>
                  <XCircle size={14} />
                </button>
              </div>
            ) : (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, border: '1px dashed #CBD5E1', cursor: subiendoDoc ? 'default' : 'pointer', background: '#fff' }}>
                {subiendoDoc
                  ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> <span style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Subiendo...</span></>
                  : <><Upload size={14} color="#64748b" /> <span style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Adjuntar documento (PDF, Word, Excel…)</span></>}
                <input type="file" style={{ display: 'none' }} onChange={handleSubirDoc} disabled={subiendoDoc} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx" />
              </label>
            )}
            {errorDoc && <p style={{ fontFamily: FONT, fontSize: 12, color: '#991B1B', margin: '4px 0 0' }}>{errorDoc}</p>}
          </div>

          <label style={s.label}>Fecha límite para entregar propuesta *</label>
          <input
            style={{ ...s.input, maxWidth: 280, marginBottom: 4 }}
            type="datetime-local"
            value={fechaLimitePropuesta}
            onChange={e => setFechaLimitePropuesta(e.target.value)}
          />
          <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 0, marginBottom: 20 }}>
            Fecha hasta la cual los proponentes pueden entregar su propuesta.
          </p>

          <button
            onClick={handleEnviarFase2Nuevo}
            disabled={creando}
            style={{ ...s.btnPrimary, background: '#E84922', opacity: creando && faseCreando !== 2 ? 0.5 : 1 }}
          >
            {creando && faseCreando === 2
              ? <><Loader2 size={15} className="animate-spin" /> Enviando Fase 2...</>
              : <><Send size={15} /> Enviar Fase 2</>}
          </button>
        </div>

        {/* ─── Proponentes conocidos ─── */}
        <div style={s.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <h3 style={{ ...s.cardTitle, margin: 0 }}>Proponentes conocidos</h3>
            <button onClick={agregarProponente} style={s.btnAddProp}>
              <Plus size={13} /> Agregar
            </button>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>
            Recibirán la notificación del link (Fase 1) y la invitación formal (Fase 2). Los que se registren vía link se agregan solos.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {proponentes.map((p, i) => (
              <div key={i} style={s.propRow}>
                <input
                  style={{ ...s.input, flex: 1, backgroundColor: p.fijo ? '#f8fafc' : '#fff', fontWeight: p.fijo ? 'bold' : 'normal' }}
                  value={p.nombre}
                  onChange={e => !p.fijo && actualizarProponente(i, 'nombre', e.target.value)}
                  readOnly={p.fijo}
                  placeholder="Nombre de la empresa"
                />
                <input
                  style={{ ...s.input, flex: 1.5, backgroundColor: p.fijo ? '#f8fafc' : '#fff', fontWeight: p.fijo ? 600 : 'normal', color: p.fijo ? '#64748b' : 'inherit' }}
                  value={p.email}
                  onChange={e => !p.fijo && actualizarProponente(i, 'email', e.target.value)}
                  readOnly={p.fijo}
                  placeholder="Correo electrónico"
                />
                {!p.fijo ? (
                  <button onClick={() => eliminarProponente(i)} style={s.btnDelete}><Trash2 size={15} /></button>
                ) : (
                  <div style={{ width: 28 }} />
                )}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: 40 }}>
          <button onClick={() => { setModo('lista'); setConvIdCreado(null); }} style={s.btnSecondary}>Cancelar</button>
        </div>
      </div>
    );
  }

  /* ════════════════════════════════════════════
     RENDER — LISTA DE CONVOCATORIAS
  ════════════════════════════════════════════ */
  const modoGlobal = !solicitudId;

  return (
    <div style={s.page}>
      {!modoGlobal && (
        <button onClick={onBack} style={s.backBtn}><ArrowLeft size={15} /> Volver</button>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={s.pageTitle}>
            {modoGlobal ? 'Convocatorias' : 'Convocatorias de esta solicitud'}
          </h2>
          <p style={s.pageSubtitle}>
            {modoGlobal
              ? 'Gestiona el proceso de dos fases: registro público e invitación formal.'
              : 'Crea y gestiona la convocatoria para esta solicitud.'}
          </p>
        </div>
        {!modoGlobal && (
          <button onClick={() => setModo('crear')} style={s.btnPrimary}>
            <Plus size={16} /> Nueva convocatoria
          </button>
        )}
      </div>

      {cargandoLista ? (
        <div style={s.centrado}><Loader2 size={28} className="animate-spin" color="#3384D6" /></div>
      ) : convocatorias.length === 0 ? (
        <div style={{ ...s.card, textAlign: 'center', padding: 48, color: '#94a3b8' }}>
          <Mail size={40} style={{ marginBottom: 12, opacity: 0.4 }} />
          <p style={{ fontFamily: FONT, fontSize: 14 }}>
            {modoGlobal
              ? 'No hay convocatorias creadas aún. Ve a una solicitud desde la Bandeja de Entrada.'
              : 'No se han creado convocatorias para esta solicitud.'}
          </p>
          {!modoGlobal && (
            <button onClick={() => setModo('crear')} style={{ ...s.btnPrimary, marginTop: 16 }}>
              <Plus size={14} /> Crear primera convocatoria
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {convocatorias.map(conv => {
            const registroCerrado = conv.fecha_limite_registro
              ? new Date() > new Date(conv.fecha_limite_registro)
              : false;
            const invEnviada = conv.fase_invitacion_enviada === true;
            return (
              <div
                key={conv.id}
                style={{ ...s.card, cursor: 'pointer', position: 'relative' as const }}
                onClick={() => verDetalle(conv.id)}
              >
                {/* Botón eliminar convocatoria */}
                <button
                  onClick={e => eliminarConvocatoria(conv.id, e)}
                  disabled={eliminandoConv === conv.id}
                  title="Eliminar convocatoria"
                  style={{ position: 'absolute' as const, top: 10, right: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, cursor: 'pointer', color: '#991B1B', padding: '3px 7px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, fontFamily: FONT }}
                >
                  {eliminandoConv === conv.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                  Eliminar
                </button>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1, minWidth: 0, paddingRight: 80 }}>
                    <h3 style={{ fontFamily: FONT, fontSize: 14, fontWeight: 800, margin: '0 0 4px', color: '#1e293b' }}>
                      {conv.asunto}
                    </h3>
                    <p style={s.metaText}>
                      <Clock size={12} /> Creada: {fmtFecha(conv.creado_en)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0, marginLeft: 12 }}>
                    {/* Fase 1 badge */}
                    {conv.link_publico_activo && !registroCerrado ? (
                      <span style={{ ...s.badge, background: '#EFF6FF', color: '#1D4ED8' }}>
                        <Globe size={11} /> Registro abierto
                      </span>
                    ) : registroCerrado ? (
                      <span style={{ ...s.badge, background: '#F1F5F9', color: '#64748b' }}>
                        <Lock size={11} /> Registro cerrado
                      </span>
                    ) : (
                      <span style={{ ...s.badge, background: '#FFF7ED', color: '#92400E' }}>
                        Link inactivo
                      </span>
                    )}
                    {/* Fase 2 badge */}
                    {invEnviada ? (
                      <span style={{ ...s.badge, background: '#ECFDF5', color: '#065F46' }}>
                        <CheckCircle2 size={11} /> Invitación enviada
                      </span>
                    ) : (
                      <span style={{ ...s.badge, background: '#FEF2F2', color: '#991B1B' }}>
                        Inv. pendiente
                      </span>
                    )}
                    <span style={{ ...s.badge, background: '#EEF2FF', color: '#3730A3' }}>
                      <Users size={11} /> {conv.total_respondidos || 0}/{conv.total_invitados || 0}
                    </span>
                    <Eye size={15} color="#94a3b8" />
                  </div>
                </div>

                {/* Mini-resumen de fases */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid #f1f5f9', display: 'flex', gap: 24 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...faseBadge('#3384D6'), width: 18, height: 18, fontSize: 10 }}>1</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: '#64748b' }}>
                      Reg. hasta {conv.fecha_limite_registro ? fmtFecha(conv.fecha_limite_registro) : '—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ ...faseBadge('#E84922'), width: 18, height: 18, fontSize: 10 }}>2</span>
                    <span style={{ fontFamily: FONT, fontSize: 11, color: '#64748b' }}>
                      {invEnviada
                        ? `Enviada · propuesta hasta ${fmtFecha(conv.fecha_limite)}`
                        : 'Invitación formal pendiente'}
                    </span>
                  </div>
                </div>

                {/* Link público en lista */}
                {conv.link_publico_activo && !registroCerrado && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}
                    onClick={e => e.stopPropagation()}>
                    <Globe size={12} color="#1D4ED8" />
                    <span style={{ flex: 1, fontSize: 11, color: '#1D4ED8', fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>
                      {window.location.origin}/convocatoria-publica?id={conv.id}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); copiarLinkPublico(conv.id); }}
                      style={{ ...s.btnCopy, padding: '4px 10px', fontSize: 11, background: copiadoPublicoId === conv.id ? '#10B981' : '#3384D6', flexShrink: 0 }}
                    >
                      {copiadoPublicoId === conv.id ? <><CheckCircle2 size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ════════════════════ Estilos ════════════════════ */
const s: Record<string, any> = {
  page: { padding: '32px 48px', fontFamily: FONT, maxWidth: 900, margin: '0 auto' },
  centrado: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 300, fontFamily: FONT },
  backBtn: { display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginBottom: 16, fontFamily: FONT },
  pageTitle: { fontSize: 22, fontWeight: 900, color: '#1e293b', margin: '0 0 4px', fontFamily: FONT },
  pageSubtitle: { fontSize: 13, color: '#64748b', margin: '0 0 20px', fontFamily: FONT },
  card: { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' } as React.CSSProperties,
  cardTitle: { fontSize: 14, fontWeight: 800, color: '#1e293b', margin: '0 0 12px', fontFamily: FONT },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 4, marginTop: 12, fontFamily: FONT },
  input: { width: '100%', padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const },
  btnPrimary: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 20px', borderRadius: 10, background: '#3384D6', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: FONT },
  btnSecondary: { display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 10, background: '#f1f5f9', color: '#475569', fontWeight: 700, border: '1px solid #e2e8f0', cursor: 'pointer', fontSize: 12, fontFamily: FONT },
  btnDelete: { background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: 6 },
  btnAddProp: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: '#f8fafc', color: '#3384D6', fontWeight: 700, border: '1px dashed #cbd5e1', cursor: 'pointer', fontSize: 12, fontFamily: FONT },
  btnCopy: { display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, color: '#fff', fontWeight: 700, border: 'none', cursor: 'pointer', fontSize: 12, fontFamily: FONT, whiteSpace: 'nowrap' as const },
  propRow: { display: 'flex', gap: 10, alignItems: 'center' },
  errorBox: { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', borderRadius: 8, background: '#FEF2F2', color: '#991B1B', fontSize: 13, fontWeight: 600, border: '1px solid #FECACA', marginBottom: 16, fontFamily: FONT },
  badge: { padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 700, fontFamily: FONT, display: 'inline-flex', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT },
  infoRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  infoChip: { padding: '10px 14px', borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0' },
  infoChipLabel: { fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, margin: '0 0 3px', letterSpacing: '0.05em' },
  infoChipVal: { fontFamily: FONT, fontSize: 14, fontWeight: 800, color: '#1e293b', margin: 0 },
  invRow: { padding: 14, borderRadius: 10, background: '#f8fafc', marginBottom: 8, paddingLeft: 16 },
  estadoBadge: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, fontFamily: FONT },
  invNombre: { fontSize: 13, fontWeight: 800, color: '#1e293b', margin: 0, fontFamily: FONT },
  invEmail: { fontSize: 12, color: '#64748b', margin: '2px 0 4px', fontFamily: FONT },
  invStatus: { fontSize: 12, fontWeight: 600, fontFamily: FONT, margin: '1px 0' },
  linkPublicoBox: { display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 8, background: '#F0FDF4', border: '1px solid #BBF7D0', marginBottom: 4 },
  linkPublicoUrl: { flex: 1, fontSize: 12, color: '#065F46', fontWeight: 600, wordBreak: 'break-all' as const, fontFamily: 'monospace', minWidth: 0 },
  reqText: { fontSize: 13, color: '#334155', lineHeight: 1.6, whiteSpace: 'pre-line' as const, fontFamily: FONT },
  respuestaBox: { marginTop: 8, padding: 10, borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0' },
  respuestaTexto: { fontSize: 13, color: '#065F46', whiteSpace: 'pre-line' as const, margin: 0, fontFamily: FONT },
  archivoRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #e2e8f0', marginBottom: 4 },
  archivoIcon: { width: 30, height: 30, borderRadius: 6, background: '#EEF2FF', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  archivoNombre: { fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const },
  archivoMeta: { fontFamily: FONT, fontSize: 10, color: '#94a3b8', margin: '1px 0 0' },
  btnDescargar: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', borderRadius: 6, background: '#3384D6', color: '#fff', fontWeight: 700, fontSize: 11, fontFamily: FONT, textDecoration: 'none', whiteSpace: 'nowrap' as const },
};

function faseBadge(color: string): React.CSSProperties {
  return {
    minWidth: 24, height: 24, borderRadius: '50%', background: color, color: '#fff',
    fontSize: 12, fontWeight: 900, display: 'inline-flex', alignItems: 'center',
    justifyContent: 'center', flexShrink: 0, fontFamily: FONT
  };
}
