import React, { useRef, useState } from 'react';
import { ArrowLeft, FileDown, Lock } from 'lucide-react';
import html2canvas from 'html2canvas-pro';
import jsPDF from 'jspdf';

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

/* Muestra el estado del proveedor igual que el Excel */
function estadoProveedor(total: number): string {
  if (total >= 80) return 'Proveedor aprobado';
  if (total >= 50) return 'Proveedor en observación';
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
  const [proveedor,          setProveedor        ] = useState(contratoData?.proveedor || '');
  const [numeroContrato,     setNumeroContrato   ] = useState(contratoData?.numeroContrato || '');
  const [correoProveedor,    setCorreoProveedor  ] = useState(contratoData?.correo || '');
  const [fechaEvaluacion,    setFechaEvaluacion  ] = useState(() => new Date().toISOString().split('T')[0]);
  const [criterios,          setCriterios        ] = useState<Criterio[]>(CRITERIOS_INICIALES);
  const [observaciones,      setObservaciones    ] = useState('');

  // ── Estado de guardado ────────────────────────────────
  const [guardado,   setGuardado  ] = useState(false);   // bloquea el form
  const [generando,  setGenerando ] = useState(false);   // spinner del botón

  const formRef = useRef<HTMLDivElement>(null);

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

  // ── Guardar → PDF ─────────────────────────────────────
  const handleGuardar = async () => {
    if (!formRef.current) return;
    setGenerando(true);
    
    // Bloquear el formulario ANTES de la foto para que se vuelvan textos planos
    setGuardado(true);

    try {
      // Espera para que React re-renderice sin inputs, luego toma la foto
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(formRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      });

      const imgData  = canvas.toDataURL('image/png');
      const pdf      = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW    = pdf.internal.pageSize.getWidth();
      const pageH    = pdf.internal.pageSize.getHeight();
      const imgW     = pageW;
      const imgH     = (canvas.height * pageW) / canvas.width;

      let posY = 0;
      let remaining = imgH;

      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, posY, imgW, imgH);
        remaining -= pageH;
        posY -= pageH;
        if (remaining > 0) pdf.addPage();
      }

      pdf.save(`EvaluacionProveedor_${proveedor || 'sin-nombre'}_${fechaEvaluacion || 'sin-fecha'}.pdf`);

      if (onGuardado) onGuardado();
    } catch (err) {
      console.error('Error generando PDF:', err);
      alert('Ocurrió un error al generar el PDF. Intente nuevamente.');
      setGuardado(false); // restaurar si falló
    } finally {
      setGenerando(false);
    }
  };

  const total    = totalPonderado();
  const disabled = guardado;

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
          CONTENIDO QUE SE CONVIERTE A PDF
      ══════════════════════════════════════════════════ */}
      <div
        ref={formRef}
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

        {/* ── 5. ESTADO + PRÓXIMA FECHA ── */}
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
                Proveedor aprobado Estado:
              </td>
              <td
                style={{
                  ...cellBorder,
                  color: total >= 80 ? '#15803d' : total >= 50 ? '#b45309' : '#b91c1c',
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
      {/* FIN del área que se convierte a PDF */}

      {/* ── BOTÓN GUARDAR / ESTADO BLOQUEADO ── */}
      <div style={{ maxWidth: 750, margin: '20px auto 0', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
        <button
          onClick={() => window.history.back()}
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
          Cancelar
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
            Evaluación guardada — PDF descargado
          </div>
        ) : (
          <button
            onClick={handleGuardar}
            disabled={generando}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px',
              borderRadius: 8,
              background: generando ? '#f87171' : RED,
              color: '#fff',
              fontFamily: 'Gabarito, sans-serif',
              fontWeight: 700,
              fontSize: 14,
              border: 'none',
              cursor: generando ? 'not-allowed' : 'pointer',
              transition: 'background .2s',
            }}
          >
            <FileDown size={18} />
            {generando ? 'Generando PDF…' : 'Guardar y Descargar PDF'}
          </button>
        )}
      </div>
    </div>
  );
}
