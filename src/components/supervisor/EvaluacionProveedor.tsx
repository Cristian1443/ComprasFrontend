import React, { useState, useEffect } from 'react';
import { ArrowLeft, Lock, ShieldAlert, AlertTriangle, CheckCircle2, Loader2, Send } from 'lucide-react';
import { BloqueFirma } from '../shared/BloqueFirma';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

/* ──────────────────────────────────────────────────────────
   Colores que coinciden con el Excel
────────────────────────────────────────────────────────── */
const RED   = '#D0312D';   // encabezados rojos
const AMBER = '#F5A623';   // filas amarillo/dorado

interface Criterio {
  nombre: string;
  puntaje: string;      // valor 1-10 escrito libremente, o vacío
}

const CRITERIOS_INICIALES: Criterio[] = [
  { nombre: 'Cumplimiento del plazo', puntaje: '' },
  { nombre: 'Servicio prestado',      puntaje: '' },
  { nombre: 'Experiencia pertinente', puntaje: '' },
  {
    nombre: 'Capacidad potencial para proporcionar los productos requeridos, en las condiciones requeridas',
    puntaje: '',
  },
  { nombre: 'Confiabilidad', puntaje: '' },
];

/* Umbral de bloqueo del proveedor: debe coincidir con el backend (POST /api/supervisor/evaluacion) */
const UMBRAL_BLOQUEO = 70;

/* Muestra el estado del proveedor igual que el Excel */
function estadoProveedor(total: number): string {
  if (total >= 80) return 'Proveedor aprobado';
  if (total >= UMBRAL_BLOQUEO) return 'Proveedor en observación';
  return 'Proveedor rechazado';
}

/* ── Props opcionales cuando se llama desde DetalleContratoSupervisor ── */
interface EvaluacionProveedorProps {
  solicitudId?: string;
  userEmail?: string;
  contratoData?: {
    proveedor?: string;
    correo?: string;
    tipoContratacion?: string;
    numeroContrato?: string;
    tituloContratacion?: string;
    proponenteId?: string;
  };
  onVolver?: () => void;
  onGuardado?: () => void;
}

/* ──────────────────────────────────────────────────────────
   Componente principal
────────────────────────────────────────────────────────── */
export function EvaluacionProveedor({
  solicitudId,
  userEmail,
  contratoData,
  onVolver,
  onGuardado,
}: EvaluacionProveedorProps = {}) {
  // ── Datos del formulario (pre-rellenados si vienen del contrato) ──────────────────────────────
  const [tipoContratacion,  setTipoContratacion ] = useState(contratoData?.tipoContratacion || '');
  const [tituloContratacion] = useState(contratoData?.tituloContratacion || '');
  const [proveedor,          setProveedor        ] = useState(contratoData?.proveedor || '');
  const [numeroContrato,     setNumeroContrato   ] = useState(contratoData?.numeroContrato || '');
  const [correoProveedor,    setCorreoProveedor  ] = useState(contratoData?.correo || '');
  const [fechaEvaluacion,    setFechaEvaluacion  ] = useState(() => new Date().toISOString().split('T')[0]);
  const [criterios,          setCriterios        ] = useState<Criterio[]>(CRITERIOS_INICIALES);
  const [observaciones,      setObservaciones    ] = useState('');

  // ── Estado de guardado / doble validación ──────────────
  const [guardado,      setGuardado     ] = useState(false);   // bloquea el form (ya persistido + enviado a firma)
  const [guardando,     setGuardando    ] = useState(false);   // spinner mientras se guarda y se envía a firma
  const [confirmoDatos, setConfirmoDatos] = useState(false);   // validación 1: checkbox
  const [mostrarModal,  setMostrarModal ] = useState(false);   // validación 2: modal de confirmación
  const [error,         setError        ] = useState<string | null>(null);
  const [bloqueado,     setBloqueado    ] = useState(false);   // el proveedor quedó bloqueado (total < 70)
  const [cargandoExistente, setCargandoExistente] = useState(true); // evita mostrar el form editable antes de saber si ya hay evaluación

  // ── Si ya existe una evaluación guardada para este contrato, cargarla
  //    bloqueada (no se puede volver a editar/re-guardar) ──────────────
  useEffect(() => {
    if (!solicitudId || !userEmail) { setCargandoExistente(false); return; }
    let cancelado = false;
    fetch(`${API_URL}/api/supervisor/contratos/${solicitudId}?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelado || !data?.evaluacion) return;
        const ev = data.evaluacion;
        if (Array.isArray(ev.criterios) && ev.criterios.length > 0) setCriterios(ev.criterios);
        if (ev.observaciones) setObservaciones(ev.observaciones);
        if (ev.fecha_evaluacion) setFechaEvaluacion(String(ev.fecha_evaluacion).slice(0, 10));
        setGuardado(true);
      })
      .catch(() => { /* si falla, se deja el formulario editable */ })
      .finally(() => { if (!cancelado) setCargandoExistente(false); });
    return () => { cancelado = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId, userEmail]);

  // ── Calcular puntajes ─────────────────────────────────
  const puntajeNumerico = (p: string) => {
    const n = parseFloat(p);
    return isNaN(n) ? 0 : Math.min(Math.max(n, 0), 10);
  };

  const totalPonderado = () => {
    // la suma de los 5 criterios (max 50) multiplicada x2 = max 100
    const suma = criterios.reduce((acc, c) => acc + puntajeNumerico(c.puntaje), 0);
    return suma * 2;
  };

  const handlePuntajeChange = (index: number, valor: string) => {
    const nuevos = [...criterios];
    nuevos[index] = { ...nuevos[index], puntaje: valor };
    setCriterios(nuevos);
  };

  const total = totalPonderado();
  const disabled = guardado || guardando;
  const todosLosCriteriosCalificados = criterios.every(c => c.puntaje !== '' && !isNaN(parseFloat(c.puntaje)));

  // ── Confirmación final (2da validación) → guarda + envía a firma ──
  const confirmarGuardado = async () => {
    if (!solicitudId || !userEmail) {
      setError('Falta información de la sesión o del contrato.');
      return;
    }
    setMostrarModal(false);
    setGuardando(true);
    setError(null);

    try {
      // 1) Persistir la calificación (dispara el bloqueo automático si total < 70)
      const respEval = await fetch(`${API_URL}/api/supervisor/evaluacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          solicitud_id: solicitudId,
          nombre_proveedor: proveedor,
          correo_proveedor: correoProveedor,
          criterios,
          total,
          observaciones,
          fecha_evaluacion: fechaEvaluacion,
          proponente_id: contratoData?.proponenteId || null,
        }),
      });
      const dataEval = await respEval.json();
      if (!respEval.ok) throw new Error(dataEval?.error || 'No se pudo guardar la evaluación.');
      setBloqueado(!!dataEval.bloqueado);

      // 2) Enviar el PDF a firma electrónica del supervisor del contrato
      const respFirma = await fetch(`${API_URL}/api/solicitudes/${solicitudId}/firmas/proveedor/iniciar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const dataFirma = await respFirma.json();
      if (!respFirma.ok) throw new Error(dataFirma?.error || 'La evaluación se guardó, pero no se pudo enviar a firma electrónica.');

      setGuardado(true);
      if (onGuardado) onGuardado();
    } catch (err: any) {
      console.error('Error guardando evaluación:', err);
      setError(err.message || 'Ocurrió un error al guardar la evaluación. Intente nuevamente.');
    } finally {
      setGuardando(false);
    }
  };

  /* ── Estilos inline reutilizables ── */
  const theadCell: React.CSSProperties = {
    backgroundColor: RED,
    color: '#fff',
    fontWeight: 700,
    padding: '8px 12px',
    border: '1px solid #fff',
    textAlign: 'center',
    fontSize: 13,
    fontFamily: 'Gabarito, sans-serif',
  };

  const cellBorder: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '7px 12px',
    fontSize: 13,
    fontFamily: 'Gabarito, sans-serif',
    verticalAlign: 'middle',
  };

  const labelCell: React.CSSProperties = {
    ...cellBorder,
    backgroundColor: RED,
    color: '#fff',
    fontWeight: 700,
    width: '40%',
    textAlign: 'center',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    fontFamily: 'Gabarito, sans-serif',
    fontSize: 13,
    color: '#333',
    cursor: disabled ? 'default' : 'text',
  };

  const puntajeInput: React.CSSProperties = {
    ...inputStyle,
    textAlign: 'center',
    width: '70px',
  };

  if (cargandoExistente) {
    return (
      <div style={{ padding: '24px', background: 'var(--ui-bg)', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6b7280', fontFamily: 'Gabarito, sans-serif' }}>
          <Loader2 size={20} className="animate-spin" /> Cargando evaluación...
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', background: 'var(--ui-bg)', minHeight: '100vh' }}>
      {/* ── Botón volver ── */}
      <button
        onClick={() => onVolver ? onVolver() : window.history.back()}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginBottom: 16, background: 'none', border: 'none',
          cursor: 'pointer', color: '#555', fontFamily: 'Gabarito, sans-serif', fontSize: 14,
        }}
      >
        <ArrowLeft size={18} /> Volver
      </button>

      {/* ══════════════════════════════════════════════════
          FORMULARIO
      ══════════════════════════════════════════════════ */}
      <div
        style={{
          background: '#fff',
          maxWidth: 750,
          margin: '0 auto',
          padding: '24px',
          boxShadow: '0 2px 12px rgba(0,0,0,.12)',
          fontFamily: 'Gabarito, sans-serif',
        }}
      >

        {/* ── 1. ENCABEZADO: Título + Logo ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            <tr>
              <td
                style={{
                  border: '2px solid #999',
                  padding: '12px 16px',
                  fontWeight: 700,
                  fontSize: 15,
                  width: '68%',
                  fontFamily: 'Gabarito, sans-serif',
                }}
              >
                RA1-5 EVALUACIÓN DE PROVEEDORES
              </td>
              <td
                style={{
                  border: '2px solid #999',
                  textAlign: 'center',
                  padding: '10px',
                  width: '32%',
                }}
              >
                {/* Logo Invest in Bogotá */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 12, color: '#333', fontFamily: 'Gabarito, sans-serif' }}>
                    Invest in
                  </span>
                  <span
                    style={{
                      background: RED,
                      color: '#fff',
                      borderRadius: '50%',
                      width: 52,
                      height: 52,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 11,
                      fontFamily: 'Gabarito, sans-serif',
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    Bogotá
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 2. DATOS DEL CONTRATO ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            {/* Título de la contratación */}
            <tr>
              <td style={labelCell}>Título De La Contratación:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {tituloContratacion || '-'}
              </td>
            </tr>
            {/* Tipo */}
            <tr>
              <td style={labelCell}>Tipo De Contratación:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {tipoContratacion || '-'}
              </td>
            </tr>
            {/* Proveedor */}
            <tr>
              <td style={labelCell}>Proveedor:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {proveedor || '-'}
              </td>
            </tr>
            {/* No. Contrato */}
            <tr>
              <td style={labelCell}>No. De Contrato U Orden De Contra Asociado:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {numeroContrato || '-'}
              </td>
            </tr>
            {/* Correo */}
            <tr>
              <td style={labelCell}>Correo Electrónico Del Proveedor:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {correoProveedor || '-'}
              </td>
            </tr>
            {/* Fecha evaluación */}
            <tr>
              <td style={labelCell}>Fecha De Evaluación:</td>
              <td style={{ ...cellBorder, color: '#333' }}>
                {fechaEvaluacion}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 3. SECCIÓN CALIFICACIÓN ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 4 }}>
          <tbody>
            <tr>
              <td
                style={{
                  backgroundColor: RED, color: '#fff', fontWeight: 700,
                  textAlign: 'center', padding: '8px', border: '1px solid #ccc',
                  fontSize: 14, fontFamily: 'Gabarito, sans-serif',
                }}
              >
                Calificación
              </td>
            </tr>
            <tr>
              <td
                style={{
                  border: '1px solid #ccc', padding: '10px',
                  textAlign: 'center', fontSize: 13,
                  fontFamily: 'Gabarito, sans-serif', color: '#333',
                }}
              >
                Evalúe de uno a diez donde uno es{' '}
                <strong>muy insatisfecho</strong> y diez muy satisfecho
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 4. TABLA DE CRITERIOS ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <thead>
            <tr>
              <th style={{ ...theadCell, textAlign: 'left', width: '60%' }}>
                Aspectos para evaluar
              </th>
              <th style={{ ...theadCell, width: '40%' }}>Puntaje Obtenido</th>
            </tr>
          </thead>
          <tbody>
            {criterios.map((c, i) => (
              <tr key={i}>
                <td style={{ ...cellBorder, textAlign: 'left' }}>{c.nombre}</td>
                <td style={{ ...cellBorder, textAlign: 'center' }}>
                  {disabled ? (
                    <span style={{ fontWeight: 'bold', fontSize: 14 }}>{c.puntaje || '0'}</span>
                  ) : (
                    <input
                      style={puntajeInput}
                      type="number"
                      min={0}
                      max={10}
                      value={c.puntaje}
                      onChange={e => handlePuntajeChange(i, e.target.value)}
                      placeholder="0"
                    />
                  )}
                </td>
              </tr>
            ))}

            {/* Fila total – fondo amarillo */}
            <tr style={{ backgroundColor: AMBER }}>
              <td
                style={{
                  ...cellBorder,
                  backgroundColor: RED,
                  color: '#fff',
                  fontWeight: 700,
                  border: '1px solid #fff',
                }}
              >
                Resultado ponderado máximo 100
              </td>
              <td
                style={{
                  ...cellBorder,
                  backgroundColor: AMBER,
                  color: '#fff',
                  fontWeight: 700,
                  textAlign: 'center',
                  fontSize: 15,
                  border: '1px solid #fff',
                }}
              >
                {total.toFixed(2)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 5. ESTADO ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            <tr>
              <td
                style={{
                  backgroundColor: AMBER,
                  color: '#fff',
                  fontWeight: 700,
                  padding: '8px 12px',
                  border: '1px solid #ccc',
                  width: '35%',
                  fontSize: 13,
                  fontFamily: 'Gabarito, sans-serif',
                }}
              >
                Estado:
              </td>
              <td
                style={{
                  ...cellBorder,
                  color: total >= 80 ? '#15803d' : total >= UMBRAL_BLOQUEO ? '#b45309' : '#b91c1c',
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {estadoProveedor(total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 6. OBSERVACIONES ── */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 16 }}>
          <tbody>
            <tr>
              <td
                style={{
                  backgroundColor: RED,
                  color: '#fff',
                  fontWeight: 700,
                  textAlign: 'center',
                  padding: '8px',
                  border: '1px solid #ccc',
                  fontSize: 14,
                  fontFamily: 'Gabarito, sans-serif',
                }}
              >
                Observaciones
              </td>
            </tr>
            <tr>
              <td style={{ ...cellBorder, minHeight: 90 }}>
                {disabled ? (
                  <div style={{ whiteSpace: 'pre-wrap', fontSize: 13, minHeight: 90, padding: 4 }}>
                    {observaciones || '...'}
                  </div>
                ) : (
                  <textarea
                    style={{
                      ...inputStyle,
                      width: '100%',
                      minHeight: 90,
                      resize: 'vertical',
                      fontFamily: 'Gabarito, sans-serif',
                      fontSize: 13,
                    }}
                    value={observaciones}
                    onChange={e => setObservaciones(e.target.value)}
                    placeholder="Ingrese observaciones adicionales..."
                  />
                )}
              </td>
            </tr>
          </tbody>
        </table>

        {/* ── 7. FIRMA ── */}
        <div style={{ textAlign: 'center', paddingTop: 8 }}>
          <div
            style={{
              width: '50%',
              margin: '0 auto',
              borderTop: '2px solid #666',
              paddingTop: 6,
              fontSize: 13,
              fontFamily: 'Gabarito, sans-serif',
              color: '#333',
              fontWeight: 600,
            }}
          >
            Firma Supervisor designado
          </div>
        </div>
      </div>

      {/* ── Aviso de bloqueo del proveedor ── */}
      {bloqueado && (
        <div style={{
          maxWidth: 750, margin: '16px auto 0', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#991B1B', fontFamily: 'Gabarito, sans-serif', fontSize: 13, fontWeight: 700,
        }}>
          <ShieldAlert size={18} />
          Este proveedor quedó bloqueado para futuros contratos (calificación inferior a {UMBRAL_BLOQUEO} puntos).
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          maxWidth: 750, margin: '16px auto 0', display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA',
          color: '#991B1B', fontFamily: 'Gabarito, sans-serif', fontSize: 13, fontWeight: 600,
        }}>
          <AlertTriangle size={16} /> {error}
        </div>
      )}

      {/* ── Bloque de firma electrónica (una vez guardado) ── */}
      {guardado && solicitudId && (
        <div style={{ maxWidth: 750, margin: '16px auto 0' }}>
          <BloqueFirma
            solicitudId={solicitudId}
            etapa="proveedor"
            descripcion="El supervisor del contrato debe firmar electrónicamente esta evaluación. Al completarse la firma, el PDF se guarda automáticamente en SharePoint (03.Postcontractual) y el contrato queda finalizado."
          />
        </div>
      )}

      {/* ── Validación 1: checkbox de confirmación ── */}
      {!guardado && (
        <div style={{ maxWidth: 750, margin: '16px auto 0' }}>
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 16px', borderRadius: 8, background: '#FFFBF7', border: '1px solid #FED7AA',
            fontFamily: 'Gabarito, sans-serif', fontSize: 13, color: '#333', cursor: disabled ? 'default' : 'pointer',
          }}>
            <input
              type="checkbox"
              checked={confirmoDatos}
              disabled={disabled}
              onChange={e => setConfirmoDatos(e.target.checked)}
              style={{ marginTop: 2 }}
            />
            Confirmo que la calificación y las observaciones registradas son correctas. Entiendo que, al guardar,
            el formulario quedará bloqueado y se enviará a firma electrónica del supervisor designado.
          </label>
        </div>
      )}

      {/* ── BOTONES ── */}
      <div style={{ maxWidth: 750, margin: '20px auto 0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => onVolver ? onVolver() : window.history.back()}
          style={{
            padding: '10px 24px',
            border: '2px solid #ccc',
            borderRadius: 8,
            background: '#fff',
            color: '#555',
            fontFamily: 'Gabarito, sans-serif',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          {guardado ? 'Volver' : 'Cancelar'}
        </button>

        {guardado ? (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              background: '#f3f4f6',
              color: '#6b7280',
              fontFamily: 'Gabarito, sans-serif',
              fontWeight: 600,
              fontSize: 14,
              border: '2px solid #e5e7eb',
            }}
          >
            <Lock size={16} />
            Evaluación guardada — enviada a firma
          </div>
        ) : (
          <button
            onClick={() => setMostrarModal(true)}
            disabled={guardando || !confirmoDatos || !todosLosCriteriosCalificados || !proveedor}
            title={!todosLosCriteriosCalificados ? 'Califique los 5 criterios antes de guardar' : undefined}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              background: guardando ? '#f87171' : (!confirmoDatos || !todosLosCriteriosCalificados || !proveedor) ? '#e5989b' : RED,
              color: '#fff',
              fontFamily: 'Gabarito, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: (guardando || !confirmoDatos || !todosLosCriteriosCalificados || !proveedor) ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            {guardando ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            {guardando ? 'Guardando y enviando a firma…' : 'Guardar evaluación'}
          </button>
        )}
      </div>

      {/* ══════════════════════════════════════════════════
          MODAL DE CONFIRMACIÓN (2da validación)
      ══════════════════════════════════════════════════ */}
      {mostrarModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16,
          }}
          onClick={() => setMostrarModal(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: 28, maxWidth: 460, width: '100%',
              fontFamily: 'Gabarito, sans-serif', boxShadow: '0 10px 40px rgba(0,0,0,.2)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <AlertTriangle size={22} color={RED} />
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#111827' }}>
                Confirmar evaluación
              </h3>
            </div>
            <p style={{ fontSize: 13.5, color: '#4b5563', lineHeight: 1.6, marginBottom: 16 }}>
              Está a punto de guardar la evaluación del proveedor <strong>{proveedor || '—'}</strong> con un
              puntaje de <strong>{total.toFixed(2)} / 100</strong> ({estadoProveedor(total)}).
              {total < UMBRAL_BLOQUEO && (
                <>
                  {' '}Al ser inferior a {UMBRAL_BLOQUEO} puntos, <strong>el proveedor quedará bloqueado</strong> para
                  futuros contratos.
                </>
              )}
              {' '}Esta acción bloqueará el formulario, lo enviará a firma electrónica del supervisor y{' '}
              <strong>no se puede deshacer</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setMostrarModal(false)}
                style={{
                  padding: '9px 18px', borderRadius: 8, border: '2px solid #e5e7eb', background: '#fff',
                  color: '#555', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarGuardado}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '9px 18px', borderRadius: 8, border: 'none', background: RED,
                  color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                }}
              >
                <CheckCircle2 size={15} /> Sí, confirmar y guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
