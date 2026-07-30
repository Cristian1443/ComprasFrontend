import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Printer, Loader2, Download, Save, Send, X, CheckCircle2, AlertCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toast } from 'sonner';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  solicitudId: string | null;
  onBack: () => void;
}

export function ActaAdjudicacion({ solicitudId, onBack }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [ccEditable, setCcEditable] = useState('');
  const [savingCc, setSavingCc] = useState(false);
  const [ccGuardado, setCcGuardado] = useState(false);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const [enviandoAdobe, setEnviandoAdobe] = useState(false);
  const [modalAdobe, setModalAdobe] = useState(false);
  const [adobeResultado, setAdobeResultado] = useState<{ ok: boolean; message: string } | null>(null);
  const [adobeConectado, setAdobeConectado] = useState(false);
  const [adobeConfigurado, setAdobeConfigurado] = useState(false);
  const [firmaEstado, setFirmaEstado] = useState<{ estado: string; firmaId: string | null; pdfDisponible: boolean; firmadoEn: string | null } | null>(null);
  const [firmantes, setFirmantes] = useState([
    { name: '', email: '', role: 'Evaluador Técnico' },
    { name: '', email: '', role: 'Profesional Jurídico' },
    { name: '', email: '', role: 'Director Ejecutivo' },
  ]);
  const actaRef = useRef<HTMLDivElement>(null);
  const ccTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const consultarFirmaEstado = async () => {
    if (!solicitudId) return;
    try {
      const r = await fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/acta-firma-estado`);
      const d = await r.json();
      setFirmaEstado(d);
      // Si ya está firmado, detener el polling
      if (d.estado === 'firmado' || d.estado === 'rechazado' || d.estado === 'sin_firma') {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
      }
    } catch { /* silencioso */ }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/adobe-sign/status`)
      .then(r => r.json())
      .then(d => { setAdobeConectado(d.connected); setAdobeConfigurado(d.configured); })
      .catch(() => {});
  }, []);

  // Consultar estado de firma al montar y arrancar polling si está en proceso
  useEffect(() => {
    consultarFirmaEstado();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [solicitudId]);

  useEffect(() => {
    if (firmaEstado && ['enviado', 'firmando'].includes(firmaEstado.estado)) {
      if (!pollRef.current) {
        pollRef.current = setInterval(consultarFirmaEstado, 30000);
      }
    }
    return () => { if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firmaEstado?.estado]);

  const conectarAdobe = () => {
    const popup = window.open(`${API_URL}/api/adobe-sign/oauth/iniciar`, 'AdobeSign', 'width=600,height=700');
    const handler = (e: MessageEvent) => {
      if (e.data?.adobeOk === true) {
        setAdobeConectado(true);
        window.removeEventListener('message', handler);
        popup?.close();
      } else if (e.data?.adobeOk === false) {
        toast.error('Error al conectar: ' + (e.data.error || 'desconocido'));
        window.removeEventListener('message', handler);
      }
    };
    window.addEventListener('message', handler);
  };

  useEffect(() => {
    if (!solicitudId) return;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/calificacion`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Error fetching acta data', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [solicitudId]);

  // MUST be before any conditional returns (Rules of Hooks)
  useEffect(() => {
    if (!data) return;
    const invs: any[] = data.proponentes || [];
    const cals: any[] = data.evaluacion?.calificaciones || [];
    let g: any = null;
    let ms = -Infinity;
    invs.forEach((p: any) => {
      const cal = cals.find((c: any) => Number(c.numero) === Number(p.numero));
      const score = Number(cal?.total) || 0;
      if (score > ms) { ms = score; g = p; }
    });
    if (!g && invs.length > 0) g = invs[0];
    const ev = data.evaluacion || {};
    setCcEditable(g?.cedula_nit || ev.cc_recomendado || '');
    setCcGuardado(false);
    // Pre-poblar firmantes con nombres guardados en la calificación
    const firmas = ev.firmas || {};
    setFirmantes([
      { name: firmas.evaluador?.nombre || '', email: ev.email || '', role: firmas.evaluador?.cargo || 'Evaluador Técnico' },
      { name: firmas.profesional?.nombre || '', email: '', role: firmas.profesional?.cargo || 'Profesional Jurídico' },
      { name: firmas.director?.nombre || '', email: '', role: 'Director Ejecutivo' },
    ]);
  }, [solicitudId, data]);

  const enviarAAdobe = async () => {
    const firmantesValidos = firmantes.filter(f => f.email.trim());
    if (firmantesValidos.length === 0) {
      toast.error('Ingrese al menos un correo electrónico de firmante.');
      return;
    }
    if (!actaRef.current) return;
    setEnviandoAdobe(true);
    setAdobeResultado(null);
    try {
      const actaEl = actaRef.current;

      // Medir posición de cada cuadro FIRMA relativa al contenedor del acta
      // getBoundingClientRect + scroll da la posición absoluta en el documento
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      const actaRect = actaEl.getBoundingClientRect();
      const actaDocTop = actaRect.top + scrollTop;
      const actaDocLeft = actaRect.left + scrollLeft;
      const actaW = actaEl.scrollWidth;
      const actaH = actaEl.scrollHeight;

      const firmaEls = Array.from(actaEl.querySelectorAll('[data-firma-slot]')) as HTMLElement[];
      const firmaPos = firmaEls.map(el => {
        const rect = el.getBoundingClientRect();
        const elDocTop = rect.top + scrollTop;
        const elDocLeft = rect.left + scrollLeft;
        // Centro del espacio de firma: 30px debajo del encabezado "FIRMA" (la mitad del marginBottom: 60px)
        const pixTop = elDocTop - actaDocTop + rect.height + 30;
        const pixLeft = elDocLeft - actaDocLeft;
        return { relX: pixLeft / actaW, relY: pixTop / actaH, relW: rect.width / actaW };
      });

      const canvas = await html2canvas(actaEl, { scale: 1.5, useCORS: true, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/jpeg', 0.82);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let posY = 0;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, posY === 0 ? 0 : -posY, pageW, imgH);
        remaining -= pageH;
        posY += pageH;
        if (remaining > 0) pdf.addPage();
      }

      // Insertar text tags de Adobe Sign como texto real en las posiciones de los cuadros FIRMA.
      // Blanco = invisible para humanos pero Adobe Sign lo detecta y coloca el campo de firma ahí.
      // El font-size controla el TAMAÑO del campo de firma; se auto-ajusta para llenar el ancho del cuadro.
      const signerTags = ['{{Sig_es_:signer1:signature}}', '{{Sig_es_:signer2:signature}}', '{{Sig_es_:signer3:signature}}'];
      pdf.setTextColor(255, 255, 255);
      firmantesValidos.forEach((_, idx) => {
        const pos = firmaPos[idx];
        if (!pos) return;
        const absY = pos.relY * imgH;
        const absX = pos.relX * pageW;
        const boxW = pos.relW * pageW - 4; // ancho disponible con margen
        // Auto-size: empezar grande y reducir hasta que el tag quepa en el cuadro
        let fs = 20;
        pdf.setFontSize(fs);
        while (fs > 10 && pdf.getStringUnitWidth(signerTags[idx]) * fs / (pdf.internal.scaleFactor) > boxW) {
          fs -= 1;
          pdf.setFontSize(fs);
        }
        const pageNum = Math.min(Math.max(1, Math.ceil(absY / pageH || 1)), pdf.getNumberOfPages());
        const yOnPage = absY - (pageNum - 1) * pageH;
        pdf.setPage(pageNum);
        pdf.text(signerTags[idx], Math.max(absX + 2, 2), Math.min(Math.max(yOnPage, 5), pageH - 5));
      });
      pdf.setTextColor(0, 0, 0);

      const pdfBase64 = pdf.output('datauristring').split(',')[1];

      const res = await fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/enviar-acta-adobe-sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          signers: firmantesValidos,
          asunto: `Acta de Adjudicación ${data?.solicitud?.codigo || solicitudId}`
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Error al enviar a Adobe Sign');
      setAdobeResultado({ ok: true, message: result.message });
      // Marcar acta como generada para desbloquear el paso 5 del flujo jurídico
      await registrarActa('Adobe Sign');
      // Refrescar estado de firma y cerrar modal tras 2s
      await consultarFirmaEstado();
      setTimeout(() => setModalAdobe(false), 2000);
    } catch (e: any) {
      setAdobeResultado({ ok: false, message: e.message || 'Error al conectar con Adobe Sign' });
    } finally {
      setEnviandoAdobe(false);
    }
  };

  if (!solicitudId) return null;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <Loader2 className="animate-spin text-blue-600" size={48} />
      </div>
    );
  }

  if (!data || !data.evaluacion || !data.evaluacion.calificaciones) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-gray-700">Evaluación no encontrada</h2>
        <p className="text-gray-500 mt-2">Debe completar y guardar la calificación antes de generar el acta.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-800 text-white rounded">Volver</button>
      </div>
    );
  }

  const solicitud = data.solicitud || {};
  const evaluacion = data.evaluacion || {};

  // Backend ya deduplica por email — se usa directamente
  const invitados: any[] = data.proponentes || [];

  const configPuntajes = evaluacion.config_puntajes || {};
  const calificaciones: any[] = evaluacion.calificaciones || [];

  // Proponentes en el acta = solo los que enviaron su información (respondida = true)
  const proponentes = invitados.filter((inv: any) => inv.respondida);

  // Ganador: primero por email guardado (estable aunque cambien los índices),
  // luego por mayor puntaje en calificaciones, luego primer invitado.
  let ganador: any = null;
  if (evaluacion.ganador_email) {
    ganador = invitados.find((p: any) =>
      String(p.email || '').toLowerCase() === String(evaluacion.ganador_email).toLowerCase()
    ) || null;
  }
  if (!ganador) {
    let maxScore = -Infinity;
    invitados.forEach((p: any) => {
      const cal = calificaciones.find((c: any) => Number(c.numero) === Number(p.numero));
      const score = Number(cal?.total) || 0;
      if (score > maxScore) { maxScore = score; ganador = { ...p, score }; }
    });
  }
  if (!ganador) {
    // Fallback: usar nombre/cedula guardados directamente en evaluacion
    ganador = {
      nombre_proveedor: evaluacion.ganador_nombre || null,
      cedula_nit: evaluacion.ganador_cedula_nit || null,
      score: 0
    };
  }

  const guardarCc = async (valor: string) => {
    if (!solicitudId) return;
    setSavingCc(true);
    try {
      await fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/calificacion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cc_recomendado: valor })
      });
      setCcGuardado(true);
    } catch (e) {
      console.error('Error guardando CC:', e);
    } finally {
      setSavingCc(false);
    }
  };

  const handleCcChange = (val: string) => {
    setCcEditable(val);
    setCcGuardado(false);
    if (ccTimerRef.current) clearTimeout(ccTimerRef.current);
    ccTimerRef.current = setTimeout(() => guardarCc(val), 1500);
  };

  const firmas = evaluacion.firmas || {};

  const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const today = new Date();
  const day = today.getDate();
  const month = monthNames[today.getMonth()];
  const year = today.getFullYear();

  const registrarActa = async (tipo: string) => {
    if (!solicitudId) return;
    try {
      await fetch(`${API_URL}/api/juridica/solicitudes/${solicitudId}/acta-generada`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, ganador_nombre: ganador?.nombre_proveedor || null })
      });
    } catch (_e) { /* no bloquear si falla el log */ }
  };

  const printDocument = () => {
    registrarActa('Impresión');
    window.print();
  };

  const descargarPdf = async () => {
    if (!actaRef.current) return;
    setGenerandoPdf(true);
    try {
      const canvas = await html2canvas(actaRef.current, { scale: 2, useCORS: true, backgroundColor: '#fff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW;
      const imgH = (canvas.height * pageW) / canvas.width;
      let posY = 0;
      let remaining = imgH;
      while (remaining > 0) {
        pdf.addImage(imgData, 'PNG', 0, posY === 0 ? 0 : -posY, imgW, imgH);
        remaining -= pageH;
        posY += pageH;
        if (remaining > 0) pdf.addPage();
      }
      pdf.save(`Acta_Adjudicacion_${solicitud.codigo || 'documento'}.pdf`);
      await registrarActa('PDF');
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('Error al generar el PDF. Intente con el botón Imprimir.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const borderStyle = '1px solid #000';
  const thStyle = { border: borderStyle, padding: '4px 8px', fontSize: '11px', textAlign: 'center' as const, fontWeight: 'bold' };
  const tdStyle = { border: borderStyle, padding: '4px 8px', fontSize: '11px' };
  const headerStyle = { ...thStyle, backgroundColor: '#F04B23', color: '#fff', fontSize: '12px' };

  return (
    <div className="bg-gray-100 min-h-screen p-4 lg:p-8 flex flex-col items-center">
      <div className="w-full max-w-[900px] flex justify-between mb-4 print:hidden">
        <button onClick={onBack} className="flex items-center gap-2 px-4 py-2 bg-white rounded shadow text-gray-700 font-bold hover:bg-gray-50">
          <ArrowLeft size={16} /> Volver
        </button>
        <div className="flex gap-2">
          <button onClick={printDocument} className="flex items-center gap-2 px-4 py-2 bg-slate-600 rounded shadow text-white font-bold hover:bg-slate-700">
            <Printer size={16} /> Imprimir
          </button>
          <button
            onClick={descargarPdf}
            disabled={generandoPdf}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded shadow text-white font-bold hover:bg-red-700 disabled:opacity-60"
          >
            {generandoPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
            {generandoPdf ? 'Generando...' : 'Descargar PDF'}
          </button>
          {firmaEstado?.estado === 'firmado' ? (
            <>
              <span className="flex items-center gap-2 px-4 py-2 bg-green-600 rounded shadow text-white font-bold">
                <CheckCircle2 size={16} /> Acta Firmada
              </span>
              {firmaEstado.pdfDisponible && (
                <a
                  href={`${API_URL}/api/juridica/solicitudes/${solicitudId}/acta-pdf-firmado`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-700 rounded shadow text-white font-bold hover:bg-emerald-800"
                >
                  <Download size={16} /> PDF Firmado
                </a>
              )}
            </>
          ) : ['enviado', 'firmando'].includes(firmaEstado?.estado || '') ? (
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-yellow-500 rounded shadow text-white font-bold cursor-not-allowed">
              <Loader2 size={16} className="animate-spin" /> Firma en curso...
            </button>
          ) : !adobeConfigurado ? (
            <button disabled className="flex items-center gap-2 px-4 py-2 bg-gray-400 rounded shadow text-white font-bold cursor-not-allowed">
              <Send size={16} /> Adobe Sign (sin config.)
            </button>
          ) : !adobeConectado ? (
            <button onClick={conectarAdobe} className="flex items-center gap-2 px-4 py-2 bg-orange-600 rounded shadow text-white font-bold hover:bg-orange-700">
              <Send size={16} /> Conectar Adobe Sign
            </button>
          ) : (
            <button
              onClick={() => { setModalAdobe(true); setAdobeResultado(null); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-700 rounded shadow text-white font-bold hover:bg-blue-800"
            >
              <Send size={16} /> Firmar con Adobe Sign
            </button>
          )}
        </div>
      </div>

      {/* ── Modal Adobe Sign ── */}
      {modalAdobe && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 print:hidden">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-blue-700 text-white">
              <h2 className="font-bold text-lg flex items-center gap-2"><Send size={18} /> Enviar a Adobe Sign</h2>
              <button onClick={() => setModalAdobe(false)} className="hover:opacity-70"><X size={20} /></button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <p className="text-sm text-gray-600">Ingrese el correo de cada firmante. Adobe Sign les enviará el acta para firma electrónica en el orden indicado.</p>

              {firmantes.map((f, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-2 bg-gray-50">
                  <p className="text-xs font-bold text-gray-500 uppercase">Firmante {i + 1} — {f.role}</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nombre"
                      value={f.name}
                      onChange={e => setFirmantes(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      className="border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                    />
                    <input
                      type="email"
                      placeholder="correo@investinbogota.org"
                      value={f.email}
                      onChange={e => setFirmantes(prev => prev.map((x, j) => j === i ? { ...x, email: e.target.value } : x))}
                      className="border rounded px-2 py-1 text-sm outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              ))}

              {adobeResultado && (
                <div className={`flex items-start gap-2 p-3 rounded-lg text-sm font-medium ${adobeResultado.ok ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
                  {adobeResultado.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                  {adobeResultado.message}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-2 bg-gray-50">
              <button onClick={() => setModalAdobe(false)} className="px-4 py-2 rounded border text-gray-700 font-medium hover:bg-gray-100">Cancelar</button>
              <button
                onClick={enviarAAdobe}
                disabled={enviandoAdobe}
                className="flex items-center gap-2 px-5 py-2 bg-blue-700 text-white rounded font-bold hover:bg-blue-800 disabled:opacity-60"
              >
                {enviandoAdobe ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {enviandoAdobe ? 'Enviando...' : 'Enviar para firma'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div ref={actaRef} className="bg-white w-full max-w-[900px] shadow-lg print:shadow-none print:max-w-none bg-white p-10 font-sans text-black" style={{ border: borderStyle }}>

        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex-1 text-center font-bold text-sm tracking-wide">
            CALIFICACIÓN DE PROPUESTAS
          </div>
          <div className="text-right flex items-center">
            <img src="/logo-iib.png" alt="Invest in Bogotá" style={{ height: 44, width: 'auto' }} />
          </div>
        </div>

        <div className="mb-6 text-xs leading-relaxed space-y-3">
          <p><span className="font-bold">Nombre de Invitación:</span> <span className="underline uppercase">{solicitud.codigo} - {solicitud.objeto}</span></p>
          <p className="font-bold">Objeto de la invitación:</p>
          <p className="uppercase">{solicitud.objeto}</p>
        </div>

        {/* INVITADOS */}
        <table className="w-full mb-6 border-collapse" style={{ border: borderStyle }}>
          <thead>
            <tr>
              <th colSpan={2} style={headerStyle}>INVITADOS</th>
            </tr>
          </thead>
          <tbody>
            {invitados.map((inv: any, idx: number) => (
              <tr key={idx}>
                <td style={{ ...tdStyle, width: '30px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...tdStyle, textTransform: 'uppercase' }}>{inv.nombre_proveedor || inv.datos_contacto}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* PROPONENTES */}
        <table className="w-full mb-2 border-collapse" style={{ border: borderStyle }}>
          <thead>
            <tr>
              <th colSpan={2} style={headerStyle}>PROPONENTES</th>
            </tr>
          </thead>
          <tbody>
            {proponentes.map((prop: any, idx: number) => (
              <tr key={idx}>
                <td style={{ ...tdStyle, width: '30px', textAlign: 'center' }}>{idx + 1}</td>
                <td style={{ ...tdStyle, textTransform: 'uppercase' }}>{prop.nombre_proveedor || prop.datos_contacto}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="text-xs text-center mb-2">A continuación, y en cumplimiento a lo estipulado en los términos de referencia, se procede evaluar las propuestas habilitadas</p>

        {/* EVALUACIÓN DE LAS PROPUESTAS HABILITADAS */}
        <table className="w-full mb-6 border-collapse" style={{ border: borderStyle }}>
          <thead>
            <tr>
              <th colSpan={2 + proponentes.length} style={headerStyle}>EVALUACIÓN DE LAS PROPUESTAS HABILITADAS</th>
            </tr>
            <tr>
              <th style={{ ...headerStyle, width: '30px' }}>N°</th>
              <th style={{ ...headerStyle, width: '150px' }}>Factores de evaluación</th>
              <th style={{ ...headerStyle, width: '150px', backgroundColor: '#F04B23' }}>Puntaje máximo</th>
              {proponentes.map((p: any, idx: number) => (
                <th key={idx} style={{ ...headerStyle, backgroundColor: '#fff', color: '#000', fontSize: '10px' }}>{p.nombre_proveedor?.toUpperCase() || p.datos_contacto?.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>1</td>
              <td style={{ ...tdStyle, backgroundColor: '#5c4b8b', color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>REQUISITOS HABILITANTES</td>
              <td style={{ ...tdStyle, textAlign: 'center', fontStyle: 'italic' }}>Pasa/No pasa</td>
              {proponentes.map((p: any, idx: number) => {
                const cal = calificaciones.find((c: any) => Number(c.numero) === Number(p.numero));
                const chk = cal?.checklist || {};
                const cumple = Object.values(chk).every(v => v !== 'NO') ? 'Pasa' : 'No pasa';
                return <td key={idx} style={{ ...tdStyle, textAlign: 'center' }}>{cumple}</td>;
              })}
            </tr>

            {/* Factores configurados */}
            {Object.entries(configPuntajes).filter(([_, conf]: [string, any]) => conf.enabled).map(([key, conf]: [string, any], i: number) => (
              <tr key={key}>
                <td style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{i + 2}</td>
                <td style={{ ...tdStyle, backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' }}>{conf.label}</td>
                <td style={{ ...tdStyle, textAlign: 'center', fontStyle: 'italic' }}>{conf.max} puntos</td>
                {proponentes.map((p: any, idx: number) => {
                  const cal = calificaciones.find((c: any) => Number(c.numero) === Number(p.numero));
                  const score = cal?.[key] || 0;
                  const pts = ((score * conf.max) / 100).toFixed(1);
                  return <td key={idx} style={{ ...tdStyle, textAlign: 'center' }}>{pts}</td>;
                })}
              </tr>
            ))}

            <tr>
              <td colSpan={3} style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold', backgroundColor: '#f3f4f6' }}>Puntaje total</td>
              {proponentes.map((p: any, idx: number) => {
                const cal = calificaciones.find((c: any) => Number(c.numero) === Number(p.numero));
                return <td key={idx} style={{ ...tdStyle, textAlign: 'center', fontWeight: 'bold' }}>{cal?.total || 0}</td>;
              })}
            </tr>
          </tbody>
        </table>

        {/* EVALUACIÓN CONSOLIDADA */}
        <div style={{ ...headerStyle, marginBottom: 0 }}>EVALUACIÓN CONSOLIDADA</div>
        <div style={{ border: borderStyle, borderTop: 'none', padding: '12px', fontSize: '11px', textAlign: 'justify', lineHeight: '1.6' }} className="mb-8">
          Por lo anterior se concluye que, de acuerdo con las propuestas presentadas, el proponente <span className="font-bold border-b border-black inline-block px-4">{ganador?.nombre_proveedor?.toUpperCase() || ganador?.datos_contacto?.toUpperCase() || '_______________________'}</span> cumple los requerimientos mínimos y características técnicas solicitadas en los términos de la invitación y ha obtenido el mayor puntaje, por lo tanto, se sugiere se le adjudique el proceso.
          <br /><br />
          La presente acta contiene el resultado del procedimiento de habilitación técnica y se expide a los <span className="font-bold border-b border-black inline-block px-4">{day}</span> días del mes de <span className="font-bold border-b border-black inline-block px-4">{month}</span> de <span className="font-bold border-b border-black inline-block px-4">{year}</span> así como la recomendación para adjudicar al proponente <span className="font-bold border-b border-black inline-block px-4">{ganador?.nombre_proveedor?.toUpperCase() || '_______________________'}</span> identificado con CC o NIT No.{' '}
          <span className="inline-flex items-center gap-1 print:inline">
            <input
              type="text"
              value={ccEditable}
              onChange={e => handleCcChange(e.target.value)}
              placeholder="_________________"
              className="border-b border-black outline-none font-bold text-center bg-transparent print:border-b print:border-black"
              style={{ minWidth: '140px', fontSize: '11px' }}
            />
            {savingCc && <Loader2 size={10} className="animate-spin text-gray-400 print:hidden" />}
            {ccGuardado && !savingCc && <span title="Guardado"><Save size={10} className="text-green-600 print:hidden" /></span>}
          </span>.
          <br /><br />
          La presente evaluación fue realizada el <span className="font-bold border-b border-black inline-block px-4">{day} de {month} de {year}</span>
        </div>

        {/* FIRMAS */}
        <div className="grid grid-cols-2 gap-8 mt-12">
          <div>
            <div data-firma-slot="0" style={{ ...headerStyle, marginBottom: '60px' }}>FIRMA</div>
            <div className="border-t border-black pt-1 px-2 text-[10px] font-bold">
              {firmas?.evaluador?.nombre || 'Evaluador técnico'}<br />
              <span className="font-normal text-[9px]">{firmas?.evaluador?.cargo || 'Evaluador Técnico'}</span>
            </div>
          </div>
          <div>
            <div data-firma-slot="1" style={{ ...headerStyle, marginBottom: '60px' }}>FIRMA</div>
            <div className="border-t border-black pt-1 px-2 text-[10px] font-bold">
              {firmas?.profesional?.nombre || 'Profesional participe del proceso de evaluación'}<br />
              <span className="font-normal text-[9px]">{firmas?.profesional?.cargo || 'Profesional Jurídico'}</span>
            </div>
          </div>
          <div>
            <div data-firma-slot="2" style={{ ...headerStyle, marginBottom: '60px' }}>FIRMA</div>
            <div className="border-t border-black pt-1 px-2 text-[10px] font-bold">
              {firmas?.director?.nombre || 'Director ejecutivo'}<br />
              <span className="font-normal text-[9px]">Director ejecutivo</span>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @media print {
          @page { margin: 1cm; size: auto; }
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:max-w-none { max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
