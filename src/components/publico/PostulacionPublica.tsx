import React, { useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, Send, Loader2, AlertTriangle,
  Lock, FileText, Building2, Mail, Phone, User, Info, ShieldCheck, ChevronDown, ChevronUp
} from 'lucide-react';

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

export function PostulacionPublica() {
  const [convId, setConvId] = useState('');
  const [data, setData] = useState<ConvocatoriaPublica | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [nombreEmpresa, setNombreEmpresa] = useState('');
  const [nombreContacto, setNombreContacto] = useState('');
  const [nit, setNit] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [nombreCompleto, setNombreCompleto] = useState('');
  const [cedula, setCedula] = useState('');
  const [tipoProponente, setTipoProponente] = useState<'empresa' | 'persona'>('empresa');
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

  const handlePostular = async () => {
    setErrorEnvio('');
    const esPersona = tipoProponente === 'persona';
    if (esPersona) {
      if (!nombreCompleto.trim()) { setErrorEnvio('El nombre completo es obligatorio.'); return; }
      if (!cedula.trim()) { setErrorEnvio('La cédula es obligatoria.'); return; }
    } else {
      if (!nombreEmpresa.trim()) { setErrorEnvio('El nombre de la empresa es obligatorio.'); return; }
    }
    if (!email.trim()) { setErrorEnvio('El correo electrónico es obligatorio.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setErrorEnvio('El correo electrónico no es válido.'); return; }
    if (!aceptaTratamientoDatos) { setErrorEnvio('Debes aceptar la Política de Tratamiento de Datos Personales para continuar.'); return; }

    setEnviando(true);
    try {
      const cuerpo = esPersona
        ? { nombre_completo: nombreCompleto.trim(), cedula: cedula.trim(), email: email.trim(), telefono: telefono.trim() || undefined, acepta_tratamiento_datos: true }
        : { nombre_empresa: nombreEmpresa.trim(), nombre_contacto: nombreContacto.trim() || undefined, nit: nit.trim() || undefined, email: email.trim(), telefono: telefono.trim() || undefined, acepta_tratamiento_datos: true };
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
          <Loader2 size={40} style={{ animation: 'spin 1s linear infinite' }} color="#3384D6" />
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
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '16px 20px', textAlign: 'left', marginBottom: 16 }}>
              <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 800, color: '#1D4ED8', margin: '0 0 6px' }}>
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
                <FileText size={18} color="#3384D6" />
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
                  onClick={() => setTipoProponente(tipo)}
                  style={{
                    padding: '10px 20px', borderRadius: 10,
                    border: `2px solid ${tipoProponente === tipo ? '#3384D6' : '#e2e8f0'}`,
                    background: tipoProponente === tipo ? '#EFF6FF' : '#fff',
                    color: tipoProponente === tipo ? '#1D4ED8' : '#64748b',
                    fontFamily: FONT, fontSize: 14,
                    fontWeight: tipoProponente === tipo ? 800 : 600,
                    cursor: 'pointer',
                  }}
                >
                  {tipo === 'empresa' ? '🏢 Empresa' : '👤 Persona natural'}
                </button>
              ))}
            </div>
          </div>

          <h3 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: '#1e293b', margin: '0 0 16px' }}>
            {tipoProponente === 'persona' ? '👤 Tus datos personales' : '🏢 Datos de tu empresa'}
          </h3>

          {tipoProponente === 'persona' ? (
            /* ── Persona natural ── */
            <>
              <div style={p.fieldGroup}>
                <label style={p.label}>
                  <User size={13} style={{ display: 'inline', marginRight: 5 }} />
                  Nombre completo *
                </label>
                <input
                  style={p.input}
                  value={nombreCompleto}
                  onChange={e => setNombreCompleto(e.target.value)}
                  placeholder="Ej: Juan Pérez López"
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={p.label}>
                    <Info size={13} style={{ display: 'inline', marginRight: 5 }} />
                    Cédula de ciudadanía *
                  </label>
                  <input
                    style={p.input}
                    value={cedula}
                    onChange={e => setCedula(e.target.value)}
                    placeholder="Ej: 1234567890"
                  />
                </div>
                <div>
                  <label style={p.label}>
                    <Phone size={13} style={{ display: 'inline', marginRight: 5 }} />
                    Teléfono
                  </label>
                  <input
                    style={p.input}
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej: 310 000 0000"
                    type="tel"
                  />
                </div>
              </div>
            </>
          ) : (
            /* ── Empresa ── */
            <>
              <div style={p.fieldGroup}>
                <label style={p.label}>
                  <Building2 size={13} style={{ display: 'inline', marginRight: 5 }} />
                  Nombre de la empresa / Razón social *
                </label>
                <input
                  style={p.input}
                  value={nombreEmpresa}
                  onChange={e => setNombreEmpresa(e.target.value)}
                  placeholder="Ej: Mi Empresa S.A.S."
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={p.label}>
                    <Info size={13} style={{ display: 'inline', marginRight: 5 }} />
                    NIT
                  </label>
                  <input
                    style={p.input}
                    value={nit}
                    onChange={e => setNit(e.target.value)}
                    placeholder="Ej: 900123456-7"
                  />
                </div>
                <div>
                  <label style={p.label}>
                    <User size={13} style={{ display: 'inline', marginRight: 5 }} />
                    Nombre del contacto
                  </label>
                  <input
                    style={p.input}
                    value={nombreContacto}
                    onChange={e => setNombreContacto(e.target.value)}
                    placeholder="Nombre completo"
                  />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={p.label}>
                    <Phone size={13} style={{ display: 'inline', marginRight: 5 }} />
                    Teléfono
                  </label>
                  <input
                    style={p.input}
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="Ej: 310 000 0000"
                    type="tel"
                  />
                </div>
              </div>
            </>
          )}

          <div style={p.fieldGroup}>
            <label style={p.label}>
              <Mail size={13} style={{ display: 'inline', marginRight: 5 }} />
              Correo electrónico *
            </label>
            <input
              style={p.input}
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="correo@empresa.com"
              type="email"
            />
          </div>

          {/* Aviso: la propuesta se entrega después por el link individual */}
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: '12px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A', marginTop: 8, marginBottom: 16 }}>
            <Info size={16} color="#92400E" style={{ flexShrink: 0, marginTop: 1 }} />
            <p style={{ fontFamily: FONT, fontSize: 12, color: '#92400E', margin: 0, lineHeight: 1.5 }}>
              <strong>Solo necesitas registrarte aquí.</strong> Tu propuesta y documentos los entregarás después a través del enlace personal que recibirás en tu correo.
            </p>
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
                  style={{ color: '#1D4ED8', fontWeight: 700, textDecoration: 'underline', cursor: 'pointer' }}
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
                  <strong>Finalidad:</strong> los datos personales suministrados en este formulario (nombre, identificación, correo electrónico, teléfono y demás información de contacto) serán utilizados exclusivamente para: (i) gestionar tu registro como proponente en la presente convocatoria, (ii) enviarte el enlace personal para la presentación de tu propuesta, (iii) verificar tu identidad y la de tu empresa, y (iv) comunicarte novedades relacionadas con el proceso de contratación.
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
  pageBg: { minHeight: '100vh', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: FONT },
  centrado: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, minHeight: 400 },
  loadText: { fontFamily: FONT, fontSize: 15, color: '#64748b', fontWeight: 600 },
  errorTitle: { fontFamily: FONT, fontSize: 22, fontWeight: 900, color: '#991B1B', margin: '0 0 8px' },
  errorText: { fontFamily: FONT, fontSize: 14, color: '#64748b', textAlign: 'center', maxWidth: 400 },
  mainCard: { background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', maxWidth: 860, width: '100%', overflow: 'hidden' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 28px', borderBottom: '1px solid #f1f5f9' },
  logoBadge: { fontFamily: FONT, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  logoBold: { fontWeight: 900, color: '#E84922' },
  timerBadge: { display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 20, background: '#FEF3C7', color: '#92400E', fontSize: 12, fontWeight: 700, fontFamily: FONT },
  infoSection: { padding: '24px 28px 16px', borderBottom: '1px solid #f1f5f9' },
  codeBadge: { display: 'inline-block', padding: '3px 10px', background: '#3384D6', color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 800, margin: '0 0 8px', fontFamily: FONT },
  titulo: { fontFamily: FONT, fontSize: 20, fontWeight: 900, color: '#1e293b', margin: '0 0 4px' },
  subtitulo: { fontFamily: FONT, fontSize: 13, color: '#64748b', margin: 0 },
  welcomeBox: { margin: '20px 28px 0', padding: '16px 20px', borderRadius: 10, background: '#EEF2FF', border: '1px solid #C7D2FE' },
  plazoBox: { margin: '16px 28px', padding: '16px 20px', borderRadius: 10, background: '#FFF7ED', border: '1px solid #FED7AA' },
  plazoLabel: { fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' as const, margin: '0 0 2px' },
  plazoValue: { fontFamily: FONT, fontSize: 14, fontWeight: 700, color: '#1e293b', margin: 0 },
  requisitosSection: { padding: '0 28px 20px' },
  requisitosBox: { padding: '16px 20px', borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0' },
  formSection: { padding: '0 28px 28px' },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontFamily: FONT, fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: '0.03em', marginBottom: 5 },
  input: { width: '100%', padding: '11px 14px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '14px 16px', border: '2px solid #e2e8f0', borderRadius: 10, fontSize: 14, fontFamily: FONT, outline: 'none', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  errorEnvio: { display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: '#FEF2F2', color: '#991B1B', fontSize: 13, fontWeight: 600, border: '1px solid #FECACA', marginTop: 10, fontFamily: FONT },
  btnEnviar: { display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px', borderRadius: 10, background: '#E84922', color: '#fff', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: FONT },
  footer: { textAlign: 'center' as const, padding: '16px 28px', borderTop: '1px solid #f1f5f9', color: '#94a3b8', fontSize: 11, fontFamily: FONT },
  stepBadge: { minWidth: 22, height: 22, borderRadius: '50%', background: '#3384D6', color: '#fff', fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: FONT },
  datosPersonalesBox: { padding: '14px 16px', borderRadius: 10, background: '#F8FAFC', border: '1px solid #E2E8F0', marginTop: 8, marginBottom: 16 },
  togglePolitica: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, marginLeft: 28, padding: '4px 0', background: 'none', border: 'none', color: '#3384D6', fontFamily: FONT, fontSize: 12, fontWeight: 700, cursor: 'pointer' },
  politicaBox: { marginTop: 10, marginLeft: 28, padding: '14px 16px', borderRadius: 8, background: '#fff', border: '1px solid #E2E8F0' },
  politicaParrafo: { fontFamily: FONT, fontSize: 12, color: '#475569', lineHeight: 1.6, margin: '0 0 10px' },
};
