import React, { useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, Send, Loader2, AlertTriangle,
  Lock, FileText, Building2, User, ShieldCheck, ChevronDown, ChevronUp,
} from 'lucide-react';
import { COLORES } from '../../styles/colores-corporativos';
import { buscarTarifaCiiu } from '../../lib/ciiuTarifas';

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
const FONT = "'Gabarito', sans-serif";

interface ConvocatoriaPublica {
  id: string;
  asunto: string;
  descripcion_publica: string;
  descripcion_requisitos: string;
  fecha_inicio: string;
  fecha_limite: string;
  solicitud_codigo: string;
  solicitud_objeto: string;
  vencida: boolean;
  puede_postular: boolean;
  razon_cierre?: string | null;
  tipo_proponente?: 'empresa' | 'persona';
}

const REGIMENES_EMPRESA = ['Régimen Ordinario', 'Régimen Simple de Tributación (RST)', 'Régimen Tributario Especial (RTE)'];
const REGIMENES_PERSONA = ['Régimen Ordinario', 'Régimen Simple de Tributación (RST)'];

function fmtFecha(iso: string) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-CO', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
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

export function PostulacionPublica() {
  const [convId, setConvId] = useState('');
  const [data, setData] = useState<ConvocatoriaPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  /* ── Identificación ── */
  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nit, setNit] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedula, setCedula] = useState('');
  const [tipoProponente, setTipoProponente] = useState<'empresa' | 'persona'>('empresa');
  const [tipoDocumento, setTipoDocumento] = useState('NIT');
  const [domicilio, setDomicilio] = useState('');
  const [paginaWeb, setPaginaWeb] = useState('');

  /* ── Representación legal (solo empresa) ── */
  const [representanteLegalNombre, setRepresentanteLegalNombre] = useState('');
  const [representanteLegalTipoId, setRepresentanteLegalTipoId] = useState('Cédula de ciudadanía');
  const [representanteLegalIdentificacion, setRepresentanteLegalIdentificacion] = useState('');
  const [representanteLegalDireccion, setRepresentanteLegalDireccion] = useState('');
  const [representanteLegalAutorizado, setRepresentanteLegalAutorizado] = useState('');

  /* ── Datos tributarios ── */
  const [ciiu, setCiiu] = useState('');
  const [tarifa, setTarifa] = useState('');
  const [regimen, setRegimen] = useState('');
  const [actividadEconomica, setActividadEconomica] = useState('');
  const [municipioInscripcion, setMunicipioInscripcion] = useState('');
  const [esGranContribuyente, setEsGranContribuyente] = useState('');
  const [granContribuyenteResolucion, setGranContribuyenteResolucion] = useState('');
  const [granContribuyenteFecha, setGranContribuyenteFecha] = useState('');
  const [esAutoRetenedor, setEsAutoRetenedor] = useState('');
  const [autoRetenedorResolucion, setAutoRetenedorResolucion] = useState('');
  const [autoRetenedorFecha, setAutoRetenedorFecha] = useState('');
  const [esEntidadEstado, setEsEntidadEstado] = useState('');
  const [exentoImpuestoRenta, setExentoImpuestoRenta] = useState('');

  /* ── Reconocimiento de proveedor ya registrado antes (por documento) ── */
  const [buscandoProveedor, setBuscandoProveedor] = useState(false);
  const [proveedorReconocido, setProveedorReconocido] = useState(false);

  const [aceptaTratamientoDatos, setAceptaTratamientoDatos] = useState(false);
  const [mostrarPolitica, setMostrarPolitica] = useState(false);

  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id') || '';
    setConvId(id);
    if (!id) {
      setError('No se proporcionó un identificador de convocatoria válido.');
      setCargando(false);
      return;
    }

    fetch(`${API_URL}/api/convocatoria-publica/${encodeURIComponent(id)}`)
      .then(r => {
        if (!r.ok) return r.json().then(d => { throw new Error(d.error || 'No disponible'); });
        return r.json();
      })
      .then(d => setData(d))
      .catch(e => setError(e.message || 'No se pudo cargar la convocatoria.'))
      .finally(() => setCargando(false));
  }, []);

  // Verificar el estado de la convocatoria cada 30 segundos para cerrar la página si Jurídica cierra el registro
  useEffect(() => {
    if (!convId || enviado) return;
    const verificar = () => {
      fetch(`${API_URL}/api/convocatoria-publica/${encodeURIComponent(convId)}`)
        .then(r => { if (!r.ok) return r.json().then(d => { throw new Error(d.error || ''); }); return r.json(); })
        .then(d => setData(d))
        .catch(() => {});
    };
    const intervalo = setInterval(verificar, 30_000);
    return () => clearInterval(intervalo);
  }, [convId, enviado]);

  const seleccionarTipoProponente = (tipo: 'empresa' | 'persona') => {
    setTipoProponente(tipo);
    setTipoDocumento(tipo === 'empresa' ? 'NIT' : 'Cédula de ciudadanía');
    const regimenesValidos = tipo === 'empresa' ? REGIMENES_EMPRESA : REGIMENES_PERSONA;
    setRegimen(prev => regimenesValidos.includes(prev) ? prev : '');
    setProveedorReconocido(false);
  };

  /* ── Al salir del campo CIIU: autocompletar Actividad económica y Tarifa
       según la tabla oficial de tarifas por código CIIU. ── */
  const handleCiiuBlur = () => {
    const encontrado = buscarTarifaCiiu(ciiu);
    if (!encontrado) return;
    setActividadEconomica(encontrado.descripcion);
    if (encontrado.t2024 != null) setTarifa(String(encontrado.t2024));
  };

  /* ── Al salir del campo "Número de documento": buscar si ya se registró antes
       en otra convocatoria y, de encontrarlo, completar los campos vacíos. ── */
  const buscarProveedorPorDocumento = async () => {
    const documento = (tipoProponente === 'empresa' ? nit : cedula).trim();
    if (!documento) return;
    setBuscandoProveedor(true);
    try {
      const resp = await fetch(`${API_URL}/api/proveedores/buscar-por-documento?documento=${encodeURIComponent(documento)}&tipo_persona=${tipoProponente}`);
      if (!resp.ok) return;
      const r = await resp.json();
      if (!r.encontrado) return;

      if (tipoProponente === 'empresa') { if (!nombreEmpresa.trim() && r.nombre) setNombreEmpresa(r.nombre); }
      else { if (!nombreCompleto.trim() && r.nombre) setNombreCompleto(r.nombre); }
      if (!email.trim() && r.email) setEmail(r.email);
      if (!telefono.trim() && r.telefono) setTelefono(r.telefono);
      if (r.tipo_documento) setTipoDocumento(r.tipo_documento);
      if (!domicilio.trim() && r.domicilio) setDomicilio(r.domicilio);
      if (!paginaWeb.trim() && r.pagina_web) setPaginaWeb(r.pagina_web);

      if (tipoProponente === 'empresa') {
        if (!representanteLegalNombre.trim() && r.representante_legal_nombre) setRepresentanteLegalNombre(r.representante_legal_nombre);
        if (r.representante_legal_tipo_id) setRepresentanteLegalTipoId(r.representante_legal_tipo_id);
        if (!representanteLegalIdentificacion.trim() && r.representante_legal_identificacion) setRepresentanteLegalIdentificacion(r.representante_legal_identificacion);
        if (!representanteLegalDireccion.trim() && r.representante_legal_direccion) setRepresentanteLegalDireccion(r.representante_legal_direccion);
        if (!representanteLegalAutorizado.trim() && r.representante_legal_autorizado) setRepresentanteLegalAutorizado(r.representante_legal_autorizado);
      }

      if (!ciiu.trim() && r.ciiu) setCiiu(r.ciiu);
      if (!tarifa.trim() && r.tarifa) setTarifa(r.tarifa);
      if (!regimen.trim() && r.regimen) setRegimen(r.regimen);
      if (!actividadEconomica.trim() && r.actividad_economica) setActividadEconomica(r.actividad_economica);
      if (!municipioInscripcion.trim() && r.municipio_inscripcion) setMunicipioInscripcion(r.municipio_inscripcion);

      if (esGranContribuyente === '' && typeof r.es_gran_contribuyente === 'boolean') {
        setEsGranContribuyente(r.es_gran_contribuyente ? 'true' : 'false');
        if (r.es_gran_contribuyente) {
          if (r.gran_contribuyente_resolucion) setGranContribuyenteResolucion(r.gran_contribuyente_resolucion);
          if (r.gran_contribuyente_fecha) setGranContribuyenteFecha(String(r.gran_contribuyente_fecha).slice(0, 10));
        }
      }
      if (esAutoRetenedor === '' && typeof r.es_auto_retenedor === 'boolean') {
        setEsAutoRetenedor(r.es_auto_retenedor ? 'true' : 'false');
        if (r.es_auto_retenedor) {
          if (r.auto_retenedor_resolucion) setAutoRetenedorResolucion(r.auto_retenedor_resolucion);
          if (r.auto_retenedor_fecha) setAutoRetenedorFecha(String(r.auto_retenedor_fecha).slice(0, 10));
        }
      }
      if (esEntidadEstado === '' && typeof r.es_entidad_estado === 'boolean') setEsEntidadEstado(r.es_entidad_estado ? 'true' : 'false');
      if (exentoImpuestoRenta === '' && typeof r.exento_impuesto_renta === 'boolean') setExentoImpuestoRenta(r.exento_impuesto_renta ? 'true' : 'false');

      setProveedorReconocido(true);
    } catch {
      // silencioso — si falla la búsqueda, el usuario simplemente diligencia el formulario a mano
    } finally {
      setBuscandoProveedor(false);
    }
  };

  const handlePostular = async () => {
    setErrorEnvio('');
    const esPersona = tipoProponente === 'persona';

    if (esPersona) {
      if (!nombreCompleto.trim()) { setErrorEnvio('El nombre completo es obligatorio.'); return; }
      if (!cedula.trim()) { setErrorEnvio('La cédula es obligatoria.'); return; }
    } else {
      if (!nombreEmpresa.trim()) { setErrorEnvio('El nombre de la empresa es obligatorio.'); return; }
      if (!nit.trim()) { setErrorEnvio('El NIT es obligatorio.'); return; }
    }
    if (!email.trim()) { setErrorEnvio('El correo electrónico es obligatorio.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorEnvio('El correo electrónico no es válido.'); return; }
    if (!telefono.trim()) { setErrorEnvio('El teléfono es obligatorio.'); return; }
    if (!tipoDocumento.trim()) { setErrorEnvio('El tipo de documento es obligatorio.'); return; }
    if (!domicilio.trim()) { setErrorEnvio('El domicilio es obligatorio.'); return; }

    if (!esPersona) {
      if (!representanteLegalNombre.trim() || !representanteLegalTipoId.trim() || !representanteLegalIdentificacion.trim() || !representanteLegalDireccion.trim()) {
        setErrorEnvio('Los datos del representante legal son obligatorios.'); return;
      }
    }

    if (!ciiu.trim() || !tarifa.trim() || !regimen.trim() || !actividadEconomica.trim() || !municipioInscripcion.trim()) {
      setErrorEnvio('Completa todos los datos tributarios (CIIU, tarifa, régimen, actividad económica y municipio).'); return;
    }
    if (esGranContribuyente === '') { setErrorEnvio('Indica si es Gran Contribuyente.'); return; }
    if (esGranContribuyente === 'true' && (!granContribuyenteResolucion.trim() || !granContribuyenteFecha)) {
      setErrorEnvio('Indica la Resolución y Fecha de Gran Contribuyente.'); return;
    }
    if (esAutoRetenedor === '') { setErrorEnvio('Indica si es Auto Retenedor.'); return; }
    if (esAutoRetenedor === 'true' && (!autoRetenedorResolucion.trim() || !autoRetenedorFecha)) {
      setErrorEnvio('Indica la Resolución y Fecha de Auto Retenedor.'); return;
    }
    if (esEntidadEstado === '') { setErrorEnvio('Indica si es entidad del estado.'); return; }
    if (exentoImpuestoRenta === '') { setErrorEnvio('Indica si está exento de impuesto a la renta.'); return; }
    if (!aceptaTratamientoDatos) { setErrorEnvio('Debes aceptar la Política de Tratamiento de Datos Personales para continuar.'); return; }

    setEnviando(true);
    try {
      const cuerpo: Record<string, any> = {
        email: email.trim(),
        telefono: telefono.trim(),
        acepta_tratamiento_datos: true,
        tipo_documento: tipoDocumento.trim(),
        domicilio: domicilio.trim(),
        pagina_web: paginaWeb.trim(),
        ciiu: ciiu.trim(),
        tarifa: tarifa.trim(),
        regimen: regimen.trim(),
        actividad_economica: actividadEconomica.trim(),
        municipio_inscripcion: municipioInscripcion.trim(),
        es_gran_contribuyente: esGranContribuyente,
        es_auto_retenedor: esAutoRetenedor,
        es_entidad_estado: esEntidadEstado,
        exento_impuesto_renta: exentoImpuestoRenta,
      };
      if (esPersona) {
        cuerpo.nombre_completo = nombreCompleto.trim();
        cuerpo.cedula = cedula.trim();
      } else {
        cuerpo.nombre_empresa = nombreEmpresa.trim();
        cuerpo.nit = nit.trim();
        cuerpo.representante_legal_nombre = representanteLegalNombre.trim();
        cuerpo.representante_legal_tipo_id = representanteLegalTipoId.trim();
        cuerpo.representante_legal_identificacion = representanteLegalIdentificacion.trim();
        cuerpo.representante_legal_direccion = representanteLegalDireccion.trim();
        if (representanteLegalAutorizado.trim()) cuerpo.representante_legal_autorizado = representanteLegalAutorizado.trim();
      }
      if (esGranContribuyente === 'true') {
        cuerpo.gran_contribuyente_resolucion = granContribuyenteResolucion.trim();
        cuerpo.gran_contribuyente_fecha = granContribuyenteFecha;
      }
      if (esAutoRetenedor === 'true') {
        cuerpo.auto_retenedor_resolucion = autoRetenedorResolucion.trim();
        cuerpo.auto_retenedor_fecha = autoRetenedorFecha;
      }

      const resp = await fetch(`${API_URL}/api/convocatoria-publica/${convId}/postular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cuerpo),
      });
      const result = await resp.json();
      if (!resp.ok) {
        // Si la convocatoria se cerró mientras el usuario estaba en la página, mostrar pantalla de cierre
        if (result.razon_cierre) {
          setData(prev => prev ? { ...prev, vencida: true, puede_postular: false, razon_cierre: result.razon_cierre } : null);
          return;
        }
        throw new Error(result.error || 'Error al enviar');
      }
      setEnviado(true);
    } catch (err: any) {
      setErrorEnvio(err.message || 'Error al registrar. Intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  /* ── Cargando ── */
  if (cargando) {
    return (
      <div style={p.pageBg}>
        <div style={p.centrado}>
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} color={COLORES.sidebar} />
          <p style={p.loadText}>Cargando convocatoria...</p>
        </div>
      </div>
    );
  }

  /* ── Error / no disponible ── */
  if (error || !data) {
    return (
      <div style={p.pageBg}>
        <div style={p.centrado}>
          <AlertTriangle size={48} color="#EF4444" />
          <h2 style={p.errorTitle}>Convocatoria no disponible</h2>
          <p style={p.errorText}>{error || 'No se pudo cargar la convocatoria.'}</p>
        </div>
      </div>
    );
  }

  /* ── Plazo vencido / registro cerrado ── */
  if (data.vencida) {
    const esInvitacionEnviada = data.razon_cierre === 'invitacion_enviada';
    return (
      <div style={p.pageBg}>
        <div style={p.mainCard}>
          <div style={p.header}>
            <div style={p.logoBadge}>Invest in <span style={p.logoBold}>Bogotá</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 28px' }}>
            <Lock size={56} color={esInvitacionEnviada ? '#059669' : '#EF4444'} style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: esInvitacionEnviada ? '#065F46' : '#991B1B', margin: '0 0 12px' }}>
              {esInvitacionEnviada ? 'Registro público cerrado' : 'Convocatoria cerrada'}
            </h2>
            {esInvitacionEnviada ? (
              <>
                <p style={{ fontFamily: FONT, fontSize: 14, color: '#334155', maxWidth: 440, margin: '0 auto 16px', lineHeight: 1.6 }}>
                  El equipo jurídico de Invest in Bogotá ya envió las <strong>invitaciones formales</strong> a todas las empresas registradas.
                </p>
                <div style={{ background: '#D1FAE5', border: '1px solid #A7F3D0', borderRadius: 10, padding: '14px 20px', maxWidth: 440, margin: '0 auto' }}>
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#065F46', margin: 0, lineHeight: 1.6 }}>
                    Si ya te registraste, revisa tu bandeja de entrada — deberías tener un <strong>enlace personal</strong> para presentar tu propuesta.
                  </p>
                </div>
              </>
            ) : (
              <p style={{ fontFamily: FONT, fontSize: 14, color: '#64748b' }}>
                El período de registro venció el <strong>{fmtFecha(data.fecha_limite)}</strong>.
              </p>
            )}
            <p style={{ fontFamily: FONT, fontSize: 13, color: '#94a3b8', marginTop: 16 }}>
              Si tienes preguntas, contacta directamente al área jurídica de Invest in Bogotá.
            </p>
          </div>
          <div style={p.footer}>
            <p>Portal de Compras y Contratación — Invest in Bogotá</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Registro exitoso ── */
  if (enviado) {
    return (
      <div style={p.pageBg}>
        <div style={p.mainCard}>
          <div style={p.header}>
            <div style={p.logoBadge}>Invest in <span style={p.logoBold}>Bogotá</span></div>
          </div>
          <div style={{ textAlign: 'center', padding: '40px 28px' }}>
            <CheckCircle2 size={56} color="#10B981" style={{ marginBottom: 16 }} />
            <h2 style={{ fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#065F46', margin: '0 0 8px' }}>
              ¡Registro exitoso!
            </h2>
            <p style={{ fontFamily: FONT, fontSize: 14, color: '#334155', marginBottom: 16 }}>
              <strong>{tipoProponente === 'persona' ? nombreCompleto : nombreEmpresa}</strong> quedó registrado(a) en la convocatoria:<br />
              <em>{data.asunto}</em>
            </p>
            <div style={{ background: COLORES.infoClaro, border: `1px solid ${COLORES.sidebarBorder}`, borderRadius: 10, padding: '16px 20px', textAlign: 'left', marginBottom: 16 }}>
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: COLORES.sidebarHover, margin: '0 0 6px' }}>
                ¿Qué sigue?
              </p>
              <p style={{ fontFamily: FONT, fontSize: 13, color: '#1e293b', margin: 0, lineHeight: 1.6 }}>
                El equipo jurídico de Invest in Bogotá revisará tu registro y te enviará un <strong>enlace personal y único</strong> al correo <strong>{email}</strong> para que puedas entregar tu propuesta oficial.
              </p>
            </div>
            <p style={{ fontFamily: FONT, fontSize: 12, color: '#94a3b8' }}>
              Revisa tu bandeja de entrada (y la carpeta de spam) en los próximos días.
            </p>
          </div>
          <div style={p.footer}>
            <p>Portal de Compras y Contratación — Invest in Bogotá</p>
            <p>Datos tratados con confidencialidad — Ley 1581 de 2012.</p>
          </div>
        </div>
      </div>
    );
  }

  /* ── Formulario de postulación ── */
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

        {/* Info de la convocatoria */}
        <div style={p.infoSection}>
          <p style={p.codeBadge}>{data.solicitud_codigo}</p>
          <h1 style={p.titulo}>{data.asunto}</h1>
        </div>

        {/* Descripción de la oportunidad — usa descripcion_publica si existe, si no el objeto */}
        {(() => {
          const desc = data.descripcion_publica?.trim() || data.descripcion_requisitos?.trim() || data.solicitud_objeto?.trim();
          if (!desc) return null;
          return (
            <div style={{ ...p.requisitosSection, paddingTop: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <FileText size={18} color={COLORES.sidebar} />
                <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: 0 }}>
                  Descripción de la oportunidad
                </h3>
              </div>
              <div style={p.requisitosBox}>
                <p style={{ fontFamily: FONT, fontSize: 14, color: '#1e293b', lineHeight: 1.7, whiteSpace: 'pre-line', margin: 0 }}>
                  {desc}
                </p>
              </div>
            </div>
          );
        })()}

        {/* Aviso del proceso en 2 pasos */}
        <div style={p.welcomeBox}>
          <p style={{ fontFamily: FONT, fontSize: 14, margin: '0 0 10px', color: '#1e293b', fontWeight: 800 }}>
            Convocatoria abierta — regístrate para participar
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={p.stepBadge}>1</span>
              <p style={{ fontFamily: FONT, fontSize: 13, margin: 0, color: '#334155' }}>
                <strong>Regístrate aquí</strong> con tus datos antes de la fecha límite.
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={p.stepBadge}>2</span>
              <p style={{ fontFamily: FONT, fontSize: 13, margin: 0, color: '#334155' }}>
                El equipo jurídico te enviará un <strong>enlace único y personal</strong> a tu correo para que presentes tu propuesta oficial.
              </p>
            </div>
          </div>
        </div>

        {/* Plazo */}
        <div style={p.plazoBox}>
          <div style={{ display: 'flex', gap: 30 }}>
            <div>
              <p style={p.plazoLabel}>Fecha de publicación</p>
              <p style={p.plazoValue}>{fmtFecha(data.fecha_inicio)}</p>
            </div>
            <div>
              <p style={p.plazoLabel}>Fecha límite de registro</p>
              <p style={{ ...p.plazoValue, color: '#DC2626', fontWeight: 900 }}>{fmtFecha(data.fecha_limite)}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div style={p.formSection}>
          {/* Selector de tipo de proponente */}
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.03em', margin: '0 0 8px' }}>
              ¿Cómo te vas a registrar?
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              {(['empresa', 'persona'] as const).map(tipo => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => seleccionarTipoProponente(tipo)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '10px 20px', borderRadius: 10,
                    border: `2px solid ${tipoProponente === tipo ? COLORES.sidebar : '#e2e8f0'}`,
                    background: tipoProponente === tipo ? COLORES.infoClaro : '#fff',
                    color: tipoProponente === tipo ? COLORES.sidebarHover : '#64748b',
                    fontFamily: FONT, fontSize: 14,
                    fontWeight: tipoProponente === tipo ? 800 : 600,
                    cursor: 'pointer',
                  }}
                >
                  {tipo === 'empresa' ? <Building2 size={15} /> : <User size={15} />}
                  {tipo === 'empresa' ? 'Empresa' : 'Persona natural'}
                </button>
              ))}
            </div>
          </div>

          {/* ══════════════════ RA1-4 — Creación o actualización de proveedores ══════════════════ */}
          <SeccionRoja>RA1-4 Creación o actualización de proveedores</SeccionRoja>
          <div style={p.tablaBox}>

            <EncabezadoTabla>Identificación</EncabezadoTabla>
            <Fila>
              <Campo label={tipoProponente === 'empresa' ? 'Nombre o Razón social' : 'Nombre completo'} minWidth={520}>
                {tipoProponente === 'empresa' ? (
                  <input style={p.inputTabla} value={nombreEmpresa} onChange={e => setNombreEmpresa(e.target.value)} placeholder="Ej: Mi Empresa S.A.S." />
                ) : (
                  <input style={p.inputTabla} value={nombreCompleto} onChange={e => setNombreCompleto(e.target.value)} placeholder="Ej: Juan Pérez López" />
                )}
              </Campo>
            </Fila>
            <Fila>
              <Campo label="Correo electrónico" minWidth={260}>
                <input style={p.inputTabla} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="correo@empresa.com" />
              </Campo>
            </Fila>
            <Fila>
              <Campo label="Tipo de documento" minWidth={260}>
                {tipoProponente === 'empresa' ? (
                  <input style={p.inputTabla} value="NIT" disabled />
                ) : (
                  <select style={p.inputTabla} value={tipoDocumento} onChange={e => setTipoDocumento(e.target.value)}>
                    <option value="Cédula de ciudadanía">Cédula de ciudadanía</option>
                    <option value="Cédula de extranjería">Cédula de extranjería</option>
                    <option value="Pasaporte">Pasaporte</option>
                  </select>
                )}
              </Campo>
              <Campo label="Número de documento" minWidth={260}>
                <div style={{ position: 'relative', width: '100%' }}>
                  <input
                    style={{ ...p.inputTabla, paddingRight: 30 }}
                    value={tipoProponente === 'empresa' ? nit : cedula}
                    onChange={e => { tipoProponente === 'empresa' ? setNit(e.target.value) : setCedula(e.target.value); setProveedorReconocido(false); }}
                    onBlur={buscarProveedorPorDocumento}
                    placeholder="Ej: 900123456-7"
                  />
                  {buscandoProveedor && (
                    <Loader2 size={14} color={COLORES.sidebar} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', animation: 'spin 1s linear infinite' }} />
                  )}
                  {!buscandoProveedor && proveedorReconocido && (
                    <CheckCircle2 size={14} color="#10B981" style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)' }} />
                  )}
                </div>
              </Campo>
            </Fila>
            {proveedorReconocido && (
              <Fila>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: '#F0FDF4', width: '100%' }}>
                  <CheckCircle2 size={15} color="#10B981" />
                  <span style={{ fontFamily: FONT, fontSize: 12, color: '#065F46', fontWeight: 600 }}>
                    ¡Te reconocimos! Completamos tus datos con tu registro anterior — revísalos y ajusta lo que necesites.
                  </span>
                </div>
              </Fila>
            )}
            <Fila>
              <Campo label="Domicilio" minWidth={260}>
                <input style={p.inputTabla} value={domicilio} onChange={e => setDomicilio(e.target.value)} placeholder="Dirección completa" />
              </Campo>
              <Campo label="Teléfono" minWidth={260}>
                <input style={p.inputTabla} value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Ej: 310 000 0000" />
              </Campo>
            </Fila>
            <Fila>
              <Campo label="Página web (opcional)" minWidth={260}>
                <input style={p.inputTabla} value={paginaWeb} onChange={e => setPaginaWeb(e.target.value)} placeholder="www.miempresa.com" />
              </Campo>
            </Fila>

            {tipoProponente === 'empresa' && (
              <>
                <EncabezadoTabla>Representación legal</EncabezadoTabla>
                <Fila>
                  <Campo label="Representante legal" minWidth={220}>
                    <input style={p.inputTabla} value={representanteLegalNombre} onChange={e => setRepresentanteLegalNombre(e.target.value)} placeholder="Nombre completo" />
                  </Campo>
                  <Campo label="Tipo de identificación" minWidth={220}>
                    <select style={p.inputTabla} value={representanteLegalTipoId} onChange={e => setRepresentanteLegalTipoId(e.target.value)}>
                      <option value="Cédula de ciudadanía">Cédula de ciudadanía</option>
                      <option value="Cédula de extranjería">Cédula de extranjería</option>
                      <option value="Pasaporte">Pasaporte</option>
                    </select>
                  </Campo>
                </Fila>
                <Fila>
                  <Campo label="Identificación" minWidth={220}>
                    <input style={p.inputTabla} value={representanteLegalIdentificacion} onChange={e => setRepresentanteLegalIdentificacion(e.target.value)} placeholder="Número de identificación" />
                  </Campo>
                  <Campo label="Dirección" minWidth={220}>
                    <input style={p.inputTabla} value={representanteLegalDireccion} onChange={e => setRepresentanteLegalDireccion(e.target.value)} placeholder="Dirección de contacto" />
                  </Campo>
                </Fila>
                <Fila ultima>
                  <Campo label="Representante legal autorizado" minWidth={260}>
                    <input style={p.inputTabla} value={representanteLegalAutorizado} onChange={e => setRepresentanteLegalAutorizado(e.target.value)} placeholder="Opcional" />
                  </Campo>
                </Fila>
              </>
            )}

            <EncabezadoTabla>Datos tributarios</EncabezadoTabla>
            <Fila>
              <Campo label="CIIU" minWidth={180}>
                <input
                  style={p.inputTabla}
                  value={ciiu}
                  onChange={e => setCiiu(e.target.value)}
                  onBlur={handleCiiuBlur}
                  placeholder="Ej: 7490"
                />
              </Campo>
              <Campo label="Tarifa" minWidth={140}>
                <input style={p.inputTabla} value={tarifa} onChange={e => setTarifa(e.target.value)} placeholder="Ej: 7,66" />
              </Campo>
              <Campo label="Régimen" minWidth={260}>
                <select style={p.inputTabla} value={regimen} onChange={e => setRegimen(e.target.value)}>
                  <option value="">Selecciona...</option>
                  {(tipoProponente === 'empresa' ? REGIMENES_EMPRESA : REGIMENES_PERSONA).map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </Campo>
            </Fila>
            <Fila>
              <Campo label="Actividad económica" minWidth={260}>
                <input style={p.inputTabla} value={actividadEconomica} onChange={e => setActividadEconomica(e.target.value)} placeholder="Ej: Servicios" />
              </Campo>
              <Campo label="Municipio donde está inscrito" minWidth={260}>
                <input style={p.inputTabla} value={municipioInscripcion} onChange={e => setMunicipioInscripcion(e.target.value)} placeholder="Ej: Bogotá D.C." />
              </Campo>
            </Fila>
            <Fila>
              <Campo label="¿Es gran contribuyente?" minWidth={260}>
                <select style={p.inputTabla} value={esGranContribuyente} onChange={e => setEsGranContribuyente(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Campo>
              {esGranContribuyente === 'true' && (
                <>
                  <Campo label="Resolución" minWidth={200}>
                    <input style={p.inputTabla} value={granContribuyenteResolucion} onChange={e => setGranContribuyenteResolucion(e.target.value)} />
                  </Campo>
                  <Campo label="Fecha" minWidth={180}>
                    <input style={p.inputTabla} type="date" value={granContribuyenteFecha} onChange={e => setGranContribuyenteFecha(e.target.value)} />
                  </Campo>
                </>
              )}
            </Fila>
            <Fila>
              <Campo label="¿Es Auto retenedor?" minWidth={260}>
                <select style={p.inputTabla} value={esAutoRetenedor} onChange={e => setEsAutoRetenedor(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Campo>
              {esAutoRetenedor === 'true' && (
                <>
                  <Campo label="Resolución" minWidth={200}>
                    <input style={p.inputTabla} value={autoRetenedorResolucion} onChange={e => setAutoRetenedorResolucion(e.target.value)} />
                  </Campo>
                  <Campo label="Fecha" minWidth={180}>
                    <input style={p.inputTabla} type="date" value={autoRetenedorFecha} onChange={e => setAutoRetenedorFecha(e.target.value)} />
                  </Campo>
                </>
              )}
            </Fila>
            <Fila ultima>
              <Campo label="¿Es entidad del estado?" minWidth={260}>
                <select style={p.inputTabla} value={esEntidadEstado} onChange={e => setEsEntidadEstado(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Campo>
              <Campo label="¿Exento de impuesto a la renta?" minWidth={260}>
                <select style={p.inputTabla} value={exentoImpuestoRenta} onChange={e => setExentoImpuestoRenta(e.target.value)}>
                  <option value="">Selecciona...</option>
                  <option value="true">Sí</option>
                  <option value="false">No</option>
                </select>
              </Campo>
            </Fila>
          </div>

          {/* Tratamiento de datos personales — Habeas Data (Ley 1581 de 2012) */}
          <div style={p.datosPersonalesBox}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={aceptaTratamientoDatos}
                onChange={e => setAceptaTratamientoDatos(e.target.checked)}
                style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, cursor: 'pointer' }}
              />
              <span style={{ fontFamily: FONT, fontSize: 13, color: '#1e293b', lineHeight: 1.5 }}>
                <strong>Autorizo el tratamiento de mis datos personales</strong> por parte de Invest in Bogotá, de acuerdo con la Ley 1581 de 2012, su Decreto reglamentario 1377 de 2013 y la <span
                  onClick={ev => { ev.preventDefault(); setMostrarPolitica(v => !v); }}
                  style={{ color: COLORES.sidebarHover, fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
                >
                  Política de Tratamiento de Datos Personales
                </span>. *
              </span>
            </label>

            <button
              type="button"
              onClick={() => setMostrarPolitica(v => !v)}
              style={p.togglePolitica}
            >
              <ShieldCheck size={13} />
              {mostrarPolitica ? 'Ocultar' : 'Ver'} descripción completa
              {mostrarPolitica ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>

            {mostrarPolitica && (
              <div style={p.politicaBox}>
                <p style={p.politicaParrafo}>
                  <strong>Responsable del tratamiento:</strong> Invest in Bogotá (Agencia de Cooperación e Inversión de Bogotá), a través del portal de Compras y Contratación.
                </p>
                <p style={p.politicaParrafo}>
                  <strong>Finalidad:</strong> los datos personales suministrados en este formulario (nombre, identificación, correo electrónico, teléfono, información de contacto y datos tributarios) serán utilizados exclusivamente para: (i) gestionar tu registro como proponente en la presente convocatoria, (ii) crear o actualizar tu ficha de proveedor, (iii) enviarte el enlace personal para la presentación de tu propuesta —donde completarás tus datos de tesorería y documentos de soporte—, (iv) verificar tu identidad y la de tu empresa, y (v) comunicarte novedades relacionadas con el proceso de contratación.
                </p>
                <p style={p.politicaParrafo}>
                  <strong>Derechos del titular:</strong> conforme a la Ley 1581 de 2012, tienes derecho a conocer, actualizar, rectificar y suprimir tus datos personales, así como a revocar la autorización otorgada, mediante solicitud dirigida al correo de contacto del área jurídica de Invest in Bogotá.
                </p>
                <p style={p.politicaParrafo}>
                  <strong>Confidencialidad y seguridad:</strong> tus datos no serán compartidos con terceros distintos a los involucrados en el proceso de contratación y serán conservados únicamente durante el tiempo necesario para las finalidades aquí descritas, aplicando las medidas de seguridad razonables para evitar su alteración, pérdida o acceso no autorizado.
                </p>
                <p style={{ ...p.politicaParrafo, marginBottom: 0 }}>
                  Al marcar la casilla y hacer clic en "Registrarme en esta convocatoria", declaras que has leído y aceptas voluntaria, previa e informadamente el tratamiento de tus datos personales conforme a lo aquí descrito.
                </p>
              </div>
            )}
          </div>

          {errorEnvio && (
            <div style={p.errorEnvio}>
              <XCircle size={14} /> {errorEnvio}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <button onClick={handlePostular} disabled={enviando || !aceptaTratamientoDatos} style={{ ...p.btnEnviar, opacity: (enviando || !aceptaTratamientoDatos) ? 0.5 : 1, cursor: (enviando || !aceptaTratamientoDatos) ? 'not-allowed' : 'pointer' }}>
              {enviando ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={16} />}
              {enviando ? 'Registrando...' : 'Registrarme en esta convocatoria'}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div style={p.footer}>
          <p>Portal de Compras y Contratación — Invest in Bogotá</p>
          <p>Tus datos son tratados con confidencialidad conforme a la Ley 1581 de 2012 (Habeas Data).</p>
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
  mainCard: { background: '#fff', borderRadius: 16, borderTop: `4px solid ${COLORES.primario}`, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 860, width: '100%', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' },
  logoBadge: { fontFamily: FONT, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  logoBold: { fontWeight: 900, color: COLORES.primario },
  timerBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: COLORES.advertenciaClaro, color: '#92400E', fontSize: 12, fontWeight: 700, fontFamily: FONT },
  infoSection: { padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' },
  codeBadge: { display: 'inline-block', padding: '3px 10px', background: COLORES.sidebar, color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, margin: '0 0 8px', fontFamily: FONT },
  titulo: { fontFamily: FONT, fontSize: 20, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' },
  subtitulo: { fontFamily: FONT, fontSize: 13, color: '#64748b', margin: 0 },
  welcomeBox: { margin: '20px 28px 0', padding: '16px 20px', borderRadius: 10, background: COLORES.infoClaro, border: `1px solid ${COLORES.sidebarBorder}` },
  plazoBox: { margin: '16px 28px', padding: '16px 20px', borderRadius: 10, background: COLORES.acentoClaro, border: '1px solid #FED7AA' },
  plazoLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 2px' },
  plazoValue: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 },
  requisitosSection: { padding: '0 28px 20px' },
  requisitosBox: { padding: '16px 20px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' },
  formSection: { padding: '0 28px 28px' },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 5 },
  input: { width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  errorEnvio: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: COLORES.errorClaro, color: '#991B1B', fontSize: 13, fontWeight: 600, border: '1px solid #FECACA', marginTop: 10, fontFamily: FONT },
  btnEnviar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: COLORES.primario, color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: FONT },
  footer: { textAlign: 'center' as const, padding: '16px 28px', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, fontFamily: FONT },
  stepBadge: { minWidth: 22, height: 22, borderRadius: '50%', background: COLORES.sidebar, color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT },
  datosPersonalesBox: { padding: '14px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', marginTop: 20, marginBottom: 16 },
  togglePolitica: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 28, padding: '4px 0', background: 'none', border: 'none', color: COLORES.sidebarHover, fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  politicaBox: { marginTop: 10, marginLeft: 28, padding: '14px 16px', borderRadius: 8, background: '#fff', border: '1px solid #E2E8F0' },
  politicaParrafo: { fontFamily: FONT, fontSize: 12, color: '#475569', lineHeight: 1.6, margin: '0 0 10px' },

  /* ── Tabla RA1-4 ── */
  seccionRoja: { background: COLORES.primario, color: '#fff', padding: '10px 18px', fontFamily: FONT, fontWeight: 900, fontSize: 14, borderRadius: '10px 10px 0 0' },
  tablaBox: { border: '1px solid #e2e8f0', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden', marginBottom: 4 },
  encabezadoTabla: { background: '#eef2f7', padding: '8px 16px', fontFamily: FONT, fontWeight: 800, fontSize: 12, color: '#334155', textTransform: 'uppercase' as const, letterSpacing: '0.03em', borderBottom: '1px solid #e2e8f0', borderTop: '1px solid #e2e8f0' },
  fila: { display: 'flex', flexWrap: 'wrap' as const, borderBottom: '1px solid #e2e8f0' },
  campo: { flex: '1 1 240px', display: 'flex', borderRight: '1px solid #e2e8f0' },
  celdaLabel: { background: '#f8fafc', padding: '10px 12px', fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', width: 150, flexShrink: 0 },
  celdaValor: { padding: '6px 10px', display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 },
  inputTabla: { width: '100%', padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: 13, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const, background: '#fff' },
};
