import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Save, RotateCcw, Mail, BarChart3, Lock, CheckCircle2, Download, Check, X, Star, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toast } from 'sonner';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type Score = {
  checklist?: Record<string, string>;
};

type CriterioPuntaje = { id: string; label: string; max: number };

interface CalificacionProponentesProps {
  solicitudId?: string | null;
  onBack?: () => void;
  onOpenDocumentos?: (id: string) => void;
  onOpenActa?: (id: string) => void;
  userEmail?: string;
}

export function CalificacionProponentes({ solicitudId, onBack, onOpenDocumentos, onOpenActa, userEmail }: CalificacionProponentesProps) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>(solicitudId || '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detalle, setDetalle] = useState<any>(null);
  const [calificaciones, setCalificaciones] = useState<Record<string, Score>>({});
  const [evaluacionConsolidada, setEvaluacionConsolidada] = useState('');
  const [proponenteRecomendadoNumero, setProponenteRecomendadoNumero] = useState<number | null>(null);
  const [ccRecomendado, setCcRecomendado] = useState('');
  const [diasLimite, setDiasLimite] = useState('');
  const lastSavedRef = React.useRef<string>('');
  const [hayBorrador, setHayBorrador] = useState(false);
  const [firmaEvaluadorNombre, setFirmaEvaluadorNombre] = useState('');
  const [firmaEvaluadorCargo, setFirmaEvaluadorCargo] = useState('EVALUADOR TÉCNICO');
  const [firmaProfesionalNombre, setFirmaProfesionalNombre] = useState('');
  const [firmaProfesionalCargo, setFirmaProfesionalCargo] = useState('PROFESIONAL PARTICIPANTE');
  const [firmaDirectorNombre, setFirmaDirectorNombre] = useState('');
  const [documentosCount, setDocumentosCount] = useState(0);
  const [calificacionGuardada, setCalificacionGuardada] = useState(false);
  const [respuestasProponentes, setRespuestasProponentes] = useState<Record<string, any>>({});
  const [vistaConsolidada, setVistaConsolidada] = useState(true);
  const [proponentesEditados, setProponentesEditados] = useState<Record<string, any>>({});
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [calificacionFinalizada, setCalificacionFinalizada] = useState(false);
  const [proponenteAbiertoDetalle, setProponenteAbiertoDetalle] = useState<number | null>(null);
  const [generandoPdf, setGenerandoPdf] = useState(false);
  const calificacionRef = useRef<HTMLDivElement>(null);
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadSolicitudes = async () => {
      const res = await apiFetch(`${API_URL}/api/juridica/solicitudes`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setSolicitudes(arr);
      if (!selectedId && arr.length > 0) setSelectedId(arr[0].id);
    };
    loadSolicitudes().catch(console.error);
  }, []);

  useEffect(() => {
    if (!solicitudId) return;
    setSelectedId(solicitudId);
  }, [solicitudId]);

  useEffect(() => {
    if (!selectedId) return;
    const loadDetalle = async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/calificacion`);
        const data = await res.json();
        setDetalle(data);

        const ev = data?.evaluacion || {};
        const initial: Record<string, Score> = {};
        const list = Array.isArray(data?.proponentes) ? data.proponentes : [];
        list.forEach((p: any) => {
          const existing = (Array.isArray(ev.calificaciones) ? ev.calificaciones : []).find((c: any) => Number(c?.numero) === Number(p.numero));
          initial[String(p.numero)] = { checklist: existing?.checklist || {} };
        });
        setCalificaciones(initial);

        const initialProps: Record<string, any> = {};
        list.forEach((p: any) => {
          const valBruto = p.valor_con_impuestos;
          const valStr = (valBruto != null && valBruto !== '' && !isNaN(Number(valBruto)))
            ? String(valBruto)
            : '';
          initialProps[String(p.numero)] = {
            datos_contacto: p.datos_contacto || '',
            requisitos_tecnicos: p.requisitos_tecnicos || '',
            experiencia: p.experiencia || '',
            criterios_habilitantes: p.criterios_habilitantes || '',
            valor_con_impuestos: valStr,
            valor_agregado: p.valor_agregado || '',
            observaciones: p.observaciones || ''
          };
        });
        setProponentesEditados(initialProps);
        setCalificaciones(initial);
        setEvaluacionConsolidada(String(ev.evaluacion_consolidada || ''));
        setCcRecomendado(String(ev.cc_recomendado || ''));
        setProponenteRecomendadoNumero(
          ev.proponente_recomendado_numero != null
            ? Number(ev.proponente_recomendado_numero)
            : (list.find((p: any) => p.seleccionado)?.numero ?? null)
        );
        setDiasLimite(String(ev.dias_limite || ''));
        setFirmaEvaluadorNombre(String(ev?.firmas?.evaluador?.nombre || ''));
        setFirmaEvaluadorCargo(String(ev?.firmas?.evaluador?.cargo || ''));
        setFirmaProfesionalNombre(String(ev?.firmas?.profesional?.nombre || ''));
        setFirmaProfesionalCargo(String(ev?.firmas?.profesional?.cargo || ''));
        setFirmaDirectorNombre(String(ev?.firmas?.director?.nombre || ''));
        setCalificacionGuardada(Array.isArray(ev?.calificaciones) && ev.calificaciones.length > 0);
        setCalificacionFinalizada(Boolean(ev?.finalizada));

        const currentData = JSON.stringify({
          calificaciones: initial,
          evaluacionConsolidada: String(ev.evaluacion_consolidada || ''),
          ccRecomendado: String(ev.cc_recomendado || ''),
          proponentesEditados: initialProps,
        });
        lastSavedRef.current = currentData;

        // Aplicar borrador local automáticamente si existe y es diferente
        const saved = localStorage.getItem(`draft_juridica_${selectedId}`);
        if (saved && saved !== currentData) {
          try {
            const draft = JSON.parse(saved);
            setCalificaciones(draft.calificaciones);
            setEvaluacionConsolidada(draft.evaluacionConsolidada);
            setCcRecomendado(draft.ccRecomendado);
            if (draft.proponentesEditados) setProponentesEditados(draft.proponentesEditados);
            console.log('Borrador local aplicado automáticamente.');
          } catch (e) {
            console.error('Error aplicando borrador automático:', e);
          }
        }
        
        setHayBorrador(false); // Ya no necesitamos el boton si lo cargamos solo

        const rDoc = await apiFetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/documentos`);
        const dDoc = await rDoc.json();
        setDocumentosCount(Array.isArray(dDoc?.documentos) ? dDoc.documentos.length : 0);

        const rConv = await apiFetch(`${API_URL}/api/convocatorias?solicitud_id=${selectedId}`);
        const dConv = await rConv.json();
        if (Array.isArray(dConv)) {
          const map: Record<string, any> = {};
          for (const c of dConv) {
            const rDet = await apiFetch(`${API_URL}/api/convocatorias/${c.id}`);
            const dDet = await rDet.json();
            if (Array.isArray(dDet.invitaciones)) {
              dDet.invitaciones.forEach((inv: any) => {
                if (inv.respondida) {
                  map[inv.proponente_email] = inv;
                }
              });
            }
          }
          setRespuestasProponentes(map);
        }
      } catch (e) {
        console.error('Error cargando calificacion juridica:', e);
      } finally {
        setLoading(false);
      }
    };
    loadDetalle();
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId || calificacionFinalizada || (Object.keys(calificaciones).length === 0 && Object.keys(proponentesEditados).length === 0)) return;

    const current = {
      calificaciones,
      evaluacionConsolidada,
      ccRecomendado,
      proponentesEditados,
    };
    const draftStr = JSON.stringify(current);

    if (draftStr === lastSavedRef.current) return;

    localStorage.setItem(`draft_juridica_${selectedId}`, draftStr);
    setHayBorrador(true);

    const timer = setTimeout(() => {
      guardar(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [calificaciones, evaluacionConsolidada, ccRecomendado, proponentesEditados, selectedId, calificacionFinalizada]);

  // La calificación del supervisor se guarda en paralelo, de forma independiente.
  // Se refresca periódicamente para reflejar su avance sin pisar lo que Jurídica está editando.
  useEffect(() => {
    if (!selectedId) return;
    let cancelado = false;
    const refrescarSupervisor = async () => {
      try {
        const res = await apiFetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/calificacion`);
        if (!res.ok || cancelado) return;
        const data = await res.json();
        setDetalle((prev: any) => prev ? { ...prev, evaluacion: { ...prev.evaluacion, supervisor: data?.evaluacion?.supervisor || null } } : prev);
      } catch { /* no-op */ }
    };
    const interval = setInterval(refrescarSupervisor, 20000);
    return () => { cancelado = true; clearInterval(interval); };
  }, [selectedId]);

  const restaurarBorrador = () => {
    try {
      const saved = localStorage.getItem(`draft_juridica_${selectedId}`);
      if (!saved) return;
      const draft = JSON.parse(saved);
      setCalificaciones(draft.calificaciones);
      setEvaluacionConsolidada(draft.evaluacionConsolidada);
      setCcRecomendado(draft.ccRecomendado);
      if (draft.proponentesEditados) setProponentesEditados(draft.proponentesEditados);
      setHayBorrador(false);
      toast.success('Borrador restaurado correctamente.');
    } catch (e) {
      console.error('Error restaurando borrador:', e);
    }
  };

  const esModalidadCalificable = useMemo(() => {
    const m = String(detalle?.solicitud?.modalidad || '').toLowerCase();
    return m === 'invitacion' || m === 'tdr';
  }, [detalle]);

  const proponentes = Array.isArray(detalle?.proponentes) ? detalle.proponentes : [];
  // Un proponente que no respondió a la invitación no tiene nada que calificar —
  // no debe ocupar una columna en el formato.
  const proponentesVista = proponentes.filter((p: any) => p.respondida);

  // Calificación del supervisor (en paralelo) — solo lectura, informativa para Jurídica.
  const supervisorEval = detalle?.evaluacion?.supervisor || null;
  const supervisorTotal = (numero: number): number | null => {
    const c = (Array.isArray(supervisorEval?.calificaciones) ? supervisorEval.calificaciones : [])
      .find((c: any) => Number(c?.numero) === Number(numero));
    return c ? Number(c.total || 0) : null;
  };
  // Criterios reales que usó el Supervisor (incluye cualquier criterio adicional que haya agregado) —
  // compatible con el formato anterior de config_puntajes (objeto con enabled/max/label).
  const supervisorCriterios: CriterioPuntaje[] = (() => {
    const cfg = supervisorEval?.config_puntajes;
    if (Array.isArray(cfg) && cfg.length) return cfg;
    if (cfg && typeof cfg === 'object') {
      return Object.entries(cfg).filter(([, v]: any) => v?.enabled).map(([key, v]: any) => ({ id: key, label: v.label, max: Number(v.max) || 0 }));
    }
    return [];
  })();
  // Puntajes por criterio de una calificación del Supervisor — compatible con el formato anterior
  // (campos fijos propuesta_economica/experiencia_adicional/...) para evaluaciones ya guardadas.
  const puntajesSupervisorDe = (c: any): Record<string, number> => {
    if (c?.puntajes && Object.keys(c.puntajes).length) return c.puntajes;
    const map: Record<string, number> = {};
    ['propuesta_economica', 'experiencia_adicional', 'experiencia_trabajo', 'otros_criterios_puntos'].forEach(k => {
      if (c?.[k]) map[k] = Number(c[k]);
    });
    return map;
  };

  const proponentesQueRespondieron = proponentesVista.filter((p: any) => p.respondida);

  // Discrepancia: Jurídica y el Supervisor recomiendan proponentes distintos.
  // La decisión final la toma Jurídica (es quien finaliza y genera el Acta de Adjudicación),
  // pero debe quedar por escrito el porqué en la evaluación consolidada.
  const supervisorRecomendadoNumero = supervisorEval?.proponente_recomendado_numero != null
    ? Number(supervisorEval.proponente_recomendado_numero)
    : null;

  // Quien califica es el Supervisor — Jurídica solo elige (o confirma) al ganador entre quienes
  // respondieron, por defecto el mismo que recomendó el Supervisor, salvo que Jurídica elija otro
  // (por ejemplo, si ese proponente no cumple los requisitos legales/experiencia/académicos).
  const ganadorNumero: number | null = proponenteRecomendadoNumero
    ?? (supervisorRecomendadoNumero != null && proponentesQueRespondieron.some((p: any) => p.numero === supervisorRecomendadoNumero)
      ? supervisorRecomendadoNumero
      : (proponentesQueRespondieron[0]?.numero ?? null));

  const hayDiscrepancia = ganadorNumero != null && supervisorRecomendadoNumero != null
    && ganadorNumero !== supervisorRecomendadoNumero;

  const justificacionPendiente = hayDiscrepancia && !evaluacionConsolidada.trim();

  const guardar = async (silencioso = false, finalizar = false) => {
    if (!selectedId || !esModalidadCalificable) return;
    if (calificacionFinalizada) return;

    if (finalizar) {
      if (hayDiscrepancia && !evaluacionConsolidada.trim()) {
        toast.error(`Jurídica recomienda al Proponente ${ganadorNumero} y el Supervisor recomienda al Proponente ${supervisorRecomendadoNumero}. Antes de finalizar debe justificar por escrito en "Evaluación consolidada / Justificación" por qué se decide por uno u otro.`);
        return;
      }
      const ok = window.confirm('¿Está seguro de FINALIZAR la calificación? El documento quedará bloqueado y no podrá modificarse.');
      if (!ok) return;
    }

    const winner = ganadorNumero;
    const ganadorProp = proponentesVista.find((p: any) => p.numero === winner);

    try {
      if (silencioso) setIsAutosaving(true);
      else setSaving(true);
      const payload = {
        calificaciones: proponentesVista.map((p: any) => ({
          numero: p.numero,
          checklist: calificaciones[String(p.numero)]?.checklist || {},
        })),
        evaluacion_consolidada: evaluacionConsolidada,
        proponente_recomendado_numero: winner,
        ganador_email: ganadorProp?.email || null,
        ganador_nombre: ganadorProp?.nombre_proveedor || ganadorProp?.datos_contacto || null,
        ganador_cedula_nit: ganadorProp?.cedula_nit || null,
        cc_recomendado: ccRecomendado,
        dias_limite: diasLimite,
        proponentes_editados: proponentesVista.map((p: any) => ({
          numero: p.numero,
          ...(proponentesEditados[String(p.numero)] || {})
        })),
        firmas: {
          evaluador: { nombre: firmaEvaluadorNombre, cargo: firmaEvaluadorCargo },
          profesional: { nombre: firmaProfesionalNombre, cargo: firmaProfesionalCargo },
          director: { nombre: firmaDirectorNombre, cargo: 'Director ejecutivo' }
        },
        email: userEmail,
        finalizada: finalizar,
      };

      const res = await apiFetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/calificacion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo guardar');
      }

      if (!silencioso) {
        if (finalizar) {
          setCalificacionFinalizada(true);
          setCalificacionGuardada(true);
          toast.success('Calificación FINALIZADA. El documento ha quedado bloqueado.');
        } else {
          toast.success('Calificación jurídica guardada correctamente en el servidor.');
          setCalificacionGuardada(true);
        }
      }

      const savedData = JSON.stringify({
        calificaciones,
        evaluacionConsolidada,
        ccRecomendado,
        proponentesEditados
      });
      lastSavedRef.current = savedData;
      localStorage.removeItem(`draft_juridica_${selectedId}`);

      if (!silencioso && finalizar && onOpenActa) {
        if (window.confirm('Calificación FINALIZADA. ¿Desea generar el Acta de Adjudicación ahora?')) {
          onOpenActa(selectedId);
        }
      }
    } catch (e: any) {
      if (!silencioso) toast.error(e?.message || 'Error guardando la calificación');
      else console.error('Autosave error:', e);
    } finally {
      setSaving(false);
      setIsAutosaving(false);
    }
  };

  const descargarPdf = async () => {
    if (!pdfRef.current) return;
    setGenerandoPdf(true);
    try {
      const el = pdfRef.current;
      const SCALE = 2;

      // Medir posiciones reales de filas ANTES de html2canvas
      const elRect = el.getBoundingClientRect();
      const rowBottoms = Array.from(el.querySelectorAll('tr'))
        .map(r => Math.round((r.getBoundingClientRect().bottom - elRect.top) * SCALE))
        .filter(y => y > 0)
        .sort((a, b) => a - b);

      const canvas = await html2canvas(el, {
        scale: SCALE,
        useCORS: true,
        backgroundColor: '#fff',
        logging: false,
        width: el.scrollWidth,
        height: el.scrollHeight
      });

      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();   // 297 mm
      const pageH = pdf.internal.pageSize.getHeight();  // 210 mm
      const margin = 10;
      const contentW = pageW - margin * 2;  // 277 mm
      const contentH = pageH - margin * 2;  // 190 mm

      // Altura de página en píxeles del canvas
      const pageHeightPx = Math.floor((contentH / contentW) * canvas.width);

      // Corte inteligente: última fila que termina antes de idealEndY
      const smartCut = (srcY: number, idealEndY: number): number => {
        const candidates = rowBottoms.filter(y => y > srcY && y <= idealEndY);
        return candidates.length > 0 ? Math.max(...candidates) : idealEndY;
      };

      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = canvas.width;
      const pageCtx = pageCanvas.getContext('2d')!;

      let srcY = 0;
      let isFirst = true;

      while (srcY < canvas.height) {
        const idealEnd = srcY + pageHeightPx;
        const endY = idealEnd >= canvas.height
          ? canvas.height
          : smartCut(srcY, idealEnd);
        const sliceH = Math.max(1, endY - srcY);

        pageCanvas.height = sliceH;
        pageCtx.fillStyle = '#ffffff';
        pageCtx.fillRect(0, 0, pageCanvas.width, sliceH);
        pageCtx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH);

        if (!isFirst) pdf.addPage();
        isFirst = false;

        const sliceHeightMm = (sliceH / canvas.width) * contentW;
        pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, contentW, sliceHeightMm);

        srcY = endY;
        if (srcY >= canvas.height) break;
      }

      const codigoSol = detalle?.solicitud?.codigo || 'documento';
      pdf.save(`Evaluacion_Proponentes_${codigoSol}.pdf`);
    } catch (e) {
      console.error('Error generando PDF:', e);
      toast.error('Error al generar el PDF. Por favor intente de nuevo.');
    } finally {
      setGenerandoPdf(false);
    }
  };

  const handleChecklistChange = (numero: number, field: string, value: string) => {
    setCalificaciones(prev => {
      const current = prev[String(numero)] || { checklist: {} };
      return {
        ...prev,
        [String(numero)]: {
          ...current,
          checklist: { ...(current.checklist || {}), [field]: value }
        }
      };
    });
  };

  const thCell: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '10px', fontSize: 13, fontWeight: 700, textAlign: 'center' };
  const tdCell: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '10px', fontSize: 13, textAlign: 'center' };
  const orangeBar: React.CSSProperties = { background: '#F04B23', color: '#fff', textAlign: 'center', fontWeight: 800, fontSize: 13, padding: '6px' };
  // Columna "CRITERIO / REQUISITO" fija al desplazarse horizontalmente, para no perder la referencia
  // de qué se está calificando cuando hay varios proponentes.
  const stickyCol: React.CSSProperties = { position: 'sticky', left: 0, zIndex: 2, boxShadow: '2px 0 4px -2px rgba(0,0,0,0.15)' };

  // Documentos que el proponente debe cargar según el checklist oficial RA1-4 —
  // el mismo checklist que se le exige en el formulario público (ver RespuestaProponente.tsx / server.js).
  const requisitosLegalesBase = [
    { key: 'rut', label: 'RUT' },
    { key: 'cedula_rl', label: 'Cédula (persona natural / representante legal)' },
    { key: 'camara_comercio', label: 'Certificado de existencia y representación legal (Cámara de comercio)', soloEmpresa: true },
    { key: 'redam', label: 'REDAM (Registro de Deudores Alimentarios Morosos)' },
    { key: 'antecedentes_fiscales', label: 'Antecedentes fiscales' },
    { key: 'antecedentes_disciplinarios', label: 'Antecedentes disciplinarios' },
    { key: 'antecedentes_judiciales', label: 'Antecedentes judiciales' },
  ];
  const requisitosLegalesServiciosProfesionales = [
    { key: 'hoja_vida', label: 'Hoja de vida' },
    { key: 'titulo_profesional', label: 'Título profesional' },
    { key: 'certificaciones_laborales', label: 'Certificaciones laborales' },
  ];
  // Documentos que aplican a un proponente puntual, según si es persona natural/empresa
  // y si la convocatoria es de "Prestación de servicios profesionales".
  const requisitosLegalesPara = (p: any) => {
    let docs = requisitosLegalesBase.filter(d => !d.soloEmpresa || p?.tipo_persona === 'empresa');
    if (p?.tipo_objeto === 'servicios_profesionales') docs = [...docs, ...requisitosLegalesServiciosProfesionales];
    return docs;
  };
  // Unión de los documentos aplicables a CUALQUIER proponente visible — define las filas de la tabla.
  const requisitosLegalesUnion: { key: string; label: string }[] = [];
  const clavesVistas = new Set<string>();
  proponentesVista.forEach((p: any) => {
    requisitosLegalesPara(p).forEach(d => {
      if (!clavesVistas.has(d.key)) { clavesVistas.add(d.key); requisitosLegalesUnion.push(d); }
    });
  });

  return (
    <div className="ux-page p-4 lg:p-8" style={{ paddingBottom: '4rem' }}>
      <div className="mx-auto space-y-4" style={{ maxWidth: 1400 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            {onBack && <button onClick={onBack} className="text-gray-600 mb-2 font-bold"><ArrowLeft size={16} className="inline mr-1"/> Volver</button>}
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Evaluación de Proponentes</h1>
              {isAutosaving && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full animate-pulse border border-emerald-100">
                  <RotateCcw size={10} className="animate-spin" /> AUTOGUARDADO EN SERVIDOR
                </span>
              )}
              <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                supervisorEval?.finalizada
                  ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  : supervisorEval
                    ? 'text-amber-700 bg-amber-50 border-amber-200'
                    : 'text-gray-500 bg-gray-50 border-gray-200'
              }`}>
                SUPERVISOR: {supervisorEval?.finalizada ? '✓ CALIFICACIÓN FINALIZADA' : supervisorEval ? '⏳ BORRADOR EN PROGRESO' : 'AÚN NO HA CALIFICADO'}
              </span>
            </div>
          </div>
          <div className="flex items-stretch gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="border border-gray-300 p-2 rounded text-sm">
                {solicitudes.map(s => <option key={s.id} value={s.id}>{s.codigo}</option>)}
              </select>
              {onOpenDocumentos && selectedId && (
                <button onClick={() => onOpenDocumentos(selectedId)} className="border-2 border-blue-600 text-blue-700 bg-white hover:bg-blue-50 px-4 py-2 rounded flex items-center gap-2 font-semibold text-sm transition-colors">
                  <FileText size={15} /> Ver Documentos
                </button>
              )}
              <button onClick={() => setVistaConsolidada(!vistaConsolidada)} className="bg-white text-gray-700 px-4 py-2 rounded flex items-center gap-2 border border-gray-300 hover:bg-gray-50 text-sm font-semibold transition-colors">
                <Eye size={15} /> {vistaConsolidada ? 'Ver Vista Individual' : 'Ver Vista Excel'}
              </button>
            </div>

            <div className="w-px bg-gray-200 mx-1 hidden sm:block" />

            <div className="flex items-center gap-2">
              <button
                onClick={descargarPdf}
                disabled={generandoPdf}
                className="border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 px-4 py-2 rounded flex items-center gap-2 font-semibold text-sm disabled:opacity-60 cursor-pointer transition-colors"
              >
                {generandoPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {generandoPdf ? 'Generando...' : 'Descargar PDF'}
              </button>
              {calificacionFinalizada ? (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-700 font-bold text-sm">
                  <Lock size={15} /> DOCUMENTO FINALIZADO
                </div>
              ) : (
                <>
                  <button onClick={() => guardar(false, false)} disabled={saving} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded flex items-center gap-2 font-semibold text-sm transition-colors disabled:opacity-60">
                    {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar borrador
                  </button>
                  <button
                    onClick={() => guardar(false, true)}
                    disabled={saving || justificacionPendiente}
                    title={justificacionPendiente
                      ? 'Debe justificar en "Evaluación consolidada" la discrepancia con el Supervisor antes de finalizar'
                      : undefined}
                    className="flex items-center gap-2 px-4 py-2 rounded font-bold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:brightness-110 transition-all"
                    style={{ backgroundColor: '#1d4ed8' }}
                  >
                    <CheckCircle2 size={16} /> Guardar y Finalizar
                    {justificacionPendiente && (
                      <span className="text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded">
                        Falta justificar discrepancia
                      </span>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Resumen de estado — visible siempre, para no depender de descubrir tooltips o validaciones al guardar */}
        {esModalidadCalificable && detalle?.invitaciones_enviadas && !calificacionFinalizada && (
          <div className="flex items-center gap-3 flex-wrap px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-semibold mb-2">
            <span className="text-gray-500 uppercase tracking-wide text-[10px]">Estado de la calificación:</span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${supervisorEval ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {supervisorEval ? <Check size={13} /> : '⚠'} {supervisorEval?.finalizada ? 'Supervisor finalizó su calificación' : supervisorEval ? 'Supervisor calificó (borrador)' : 'Supervisor aún no ha calificado'}
            </span>
            {hayDiscrepancia && (
              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${!justificacionPendiente ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {!justificacionPendiente ? <Check size={13} /> : '⚠'} Justificación de discrepancia
              </span>
            )}
          </div>
        )}

        {loading ? <div className="text-center p-20"><Loader2 className="animate-spin mx-auto text-blue-600" size={32} /></div> :
         (!esModalidadCalificable) ? <div className="p-10 text-center">Solo valido para Invitación o TDR.</div> : 
         (!detalle?.invitaciones_enviadas) ? (
          <div className="p-20 text-center flex flex-col items-center gap-4 bg-white border rounded shadow">
             <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2">
               <Mail size={32} className="text-gray-400" />
             </div>
             <h2 className="text-xl font-bold text-gray-700">Invitación Pendiente</h2>
             <p className="text-gray-500 max-w-md">Debe enviar la invitación a los proponentes desde la vista de detalle antes de proceder con la calificación.</p>
             <button onClick={onBack} className="mt-4 px-6 py-2 bg-slate-800 text-white rounded font-bold">Volver al Detalle</button>
          </div>
         ) : (
          <div ref={calificacionRef} className="bg-white border rounded shadow p-6" style={{ overflowX: 'hidden' }}>
            {calificacionFinalizada && (
              <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-sm" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                <Lock size={18} className="text-emerald-600 flex-shrink-0" />
                <span>DOCUMENTO FINALIZADO — Este documento está bloqueado y no puede modificarse.</span>
              </div>
            )}
            <div style={{ pointerEvents: calificacionFinalizada ? 'none' : undefined, opacity: calificacionFinalizada ? 0.82 : 1 }}>
            <div style={{ background: '#F04B23', color: '#fff', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: 20, marginBottom: 24, borderRadius: '4px' }}>
              FORMATO EVALUACIÓN DE PROPONENTES
            </div>

            {/* INFORMACIÓN GENERAL DE LA SOLICITUD */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-6 bg-gray-50 p-6 rounded-lg border border-gray-200" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CÓDIGO DE SOLICITUD / PROYECTO</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.codigo}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MODALIDAD DE CONTRATACIÓN</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.modalidad?.toUpperCase()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">TÍTULO DEL CONTRATO</p>
                <p className="text-xl font-black text-gray-900">{detalle?.solicitud?.titulo_contrato || detalle?.solicitud?.objeto}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">OBJETO DE LA CONTRATACIÓN</p>
                <p className="text-md font-medium text-gray-800 leading-relaxed">{detalle?.solicitud?.objeto}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">GERENCIA SOLICITANTE</p>
                <p className="text-md font-semibold text-gray-800">{nombreGerenciaCompleto(detalle?.solicitud?.gerencia_nombre)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">SUPERVISOR RECOMENDADO</p>
                <p className="text-md font-semibold text-gray-800">{detalle?.solicitud?.solicitante_nombre}</p>
              </div>
            </div>

            {/* TABLA CONSOLIDADA ESTILO EXCEL */}
            {vistaConsolidada ? (<>
              <div className="overflow-x-auto" style={{ marginBottom: 40, overflowX: 'auto', WebkitOverflowScrolling: 'touch', paddingBottom: 8 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: proponentesVista.length * 250 + 350 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thCell, ...stickyCol, background: '#334155', color: '#fff', width: 350, textAlign: 'left', paddingLeft: 16, zIndex: 3 }}>CRITERIO / REQUISITO</th>
                      {proponentesVista.map((p: any) => (
                        <th key={p.numero} style={{ ...thCell, background: '#F04B23', color: '#fff', padding: '10px 6px' }}>
                          <div className="flex flex-col items-center gap-1">
                            <span className="text-sm font-black">PROPONENTE {p.numero}</span>
                            <span className="text-[11px] leading-tight font-medium opacity-90 uppercase line-clamp-2" title={p.nombre_proveedor}>
                              {p.nombre_proveedor}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.respondida ? 'bg-green-600' : 'bg-red-500'}`}>
                              {p.respondida ? <Check size={11} /> : <X size={11} />} {p.respondida ? 'RESPONDIÓ' : 'NO RESPONDIÓ'}
                            </span>
                            <div className="text-[10px] font-normal opacity-90 leading-tight mt-0.5 space-y-0.5">
                              {p.email && <div className="truncate" title={p.email}>{p.email}</div>}
                              <div className="flex items-center justify-center gap-2">
                                {p.cedula_nit && <span>{p.cedula_nit}</span>}
                                {p.telefono && <span>· {p.telefono}</span>}
                              </div>
                            </div>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* SECCIÓN 0: REQUISITOS DE LA CONTRATACIÓN — el mismo estándar para TODOS los proponentes,
                        por eso ocupa el ancho completo en vez de repetirse por columna. */}
                    {(detalle?.solicitud?.descripcion_necesidad_detalle
                      || detalle?.solicitud?.experiencia_acreditada_exigida
                      || detalle?.solicitud?.presupuesto_aprobado
                      || (detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0)) && (
                      <>
                        <tr>
                          <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#78350F', color: '#fff', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16 }}>
                            0. REQUISITOS DE LA CONTRATACIÓN (definidos en Planeación — aplican a todos los proponentes)
                          </td>
                        </tr>
                        <tr>
                          <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#FFFBEB', padding: '14px 16px', textAlign: 'left', verticalAlign: 'top' }}>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Especificaciones técnicas</p>
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {detalle?.solicitud?.descripcion_necesidad_detalle || <em className="text-gray-400">No definidas</em>}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Criterios habilitantes</p>
                                {detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0 ? (
                                  <ul className="text-sm text-gray-800 list-disc list-inside space-y-0.5">
                                    {detalle.solicitud.criterios_habilitantes_planeacion.map((c: any, i: number) => (
                                      <li key={i}>{c.descripcion}</li>
                                    ))}
                                  </ul>
                                ) : <p className="text-sm text-gray-400 italic">No definidos</p>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Experiencia acreditada exigida</p>
                                <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                  {detalle?.solicitud?.experiencia_acreditada_exigida || <em className="text-gray-400">No definida</em>}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-1">Valor aprobado</p>
                                <p className="text-sm font-bold text-emerald-700">
                                  {detalle?.solicitud?.presupuesto_aprobado
                                    ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(detalle.solicitud.presupuesto_aprobado))} ${detalle?.solicitud?.moneda || 'COP'}`
                                    : <em className="text-gray-400 font-normal">No definido</em>}
                                </p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      </>
                    )}

                    {/* SECCIÓN: VERIFICACIÓN DOCUMENTAL */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                        I. REQUERIMIENTOS HABILITANTES LEGALES
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#fff' }}>DOCUMENTOS RECIBIDOS (Vínculos Graph)</td>
                      {proponentesVista.map((p: any) => {
                        const resp = respuestasProponentes[p.email || p.datos_contacto];
                        return (
                          <td key={p.numero} style={{ ...tdCell, fontSize: 11, textAlign: 'left', verticalAlign: 'top' }}>
                            {resp ? (
                              <div className="space-y-1">
                                {resp.respuesta_archivos?.map((arch: any, ai: number) => (
                                  <a key={ai} href={`${API_URL}${arch.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 underline truncate" title={arch.nombre}>
                                    <FileText size={12} /> {arch.nombre}
                                  </a>
                                ))}
                                {!resp.respuesta_archivos?.length && <span className="text-gray-400 italic">Sin adjuntos</span>}
                              </div>
                            ) : (
                              <span className="text-red-400 italic font-medium">Sin respuesta del proponente</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>

                    {requisitosLegalesUnion.map(r => (
                      <tr key={r.key}>
                        <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16 }}>{r.label}</td>
                        {proponentesVista.map((p: any) => {
                          const aplica = requisitosLegalesPara(p).some(d => d.key === r.key);
                          if (!aplica) {
                            return <td key={p.numero} style={{ ...tdCell, color: '#94a3b8', fontStyle: 'italic', fontSize: 11 }}>No aplica</td>;
                          }
                          const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                          const chk = calificaciones[String(p.numero)]?.checklist || {};
                          const valorDefault = doc ? 'SI' : 'NO';
                          const valor = chk[r.key] || valorDefault;
                          return (
                            <td key={p.numero} style={{ ...tdCell, padding: '6px 4px' }}>
                              <div className="flex flex-col items-center gap-1">
                                {doc ? (
                                  <a href={`${API_URL}${doc.url}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 underline text-[10px]">
                                    <FileText size={11} /> Ver documento
                                  </a>
                                ) : (
                                  <span className="text-red-500 italic text-[10px] font-medium">Sin adjuntar</span>
                                )}
                                <select
                                  value={valor}
                                  onChange={e => handleChecklistChange(p.numero, r.key, e.target.value)}
                                  style={{
                                    width: '100%', border: 'none', outline: 'none',
                                    background: valor === 'NO' ? '#FEE2E2' : 'transparent',
                                    textAlign: 'center', fontWeight: valor === 'NO' ? 'bold' : 'normal',
                                    cursor: 'pointer', fontSize: 12
                                  }}
                                >
                                  <option>SI</option><option>NO</option><option>N/A</option>
                                </select>
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16 }}>
                        ¿CUMPLE REQUISITOS HABILITANTES?
                      </td>
                      {proponentesVista.map((p: any) => {
                        const chk = calificaciones[String(p.numero)]?.checklist || {};
                        const cumple = requisitosLegalesPara(p).every(r => {
                          const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                          return (chk[r.key] || (doc ? 'SI' : 'NO')) !== 'NO';
                        }) ? 'SI' : 'NO';
                        return (
                          <td
                            key={p.numero}
                            style={{ ...tdCell, background: cumple === 'SI' ? '#86EFAC' : '#FCA5A5', fontWeight: 'bold', fontSize: 14 }}
                          >
                            <span className="flex items-center justify-center gap-1">
                              {cumple === 'SI' ? <Check size={15} className="text-emerald-800" /> : <X size={15} className="text-red-800" />}
                              {cumple}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN: EXPERIENCIA Y ACADÉMICOS — diligenciados por el Supervisor, Jurídica solo revisa y decide si cumple */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                        II. REQUERIMIENTOS HABILITANTES DE EXPERIENCIA (diligenciado por el Supervisor)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>¿Cumple experiencia exigida?</td>
                      {proponentesVista.map((p: any) => {
                        const detSup = supervisorEval?.calificaciones?.find((c: any) => Number(c?.numero) === Number(p.numero))?.habilitante_detalle;
                        const nCerts = detSup?.experiencia?.certificaciones?.length || 0;
                        const chk = calificaciones[String(p.numero)]?.checklist || {};
                        const valor = chk['_experiencia'] || 'SI';
                        return (
                          <td key={p.numero} style={{ ...tdCell, padding: '6px 4px' }}>
                            <div className="flex flex-col items-center gap-1">
                              {nCerts > 0 ? (
                                <button type="button" onClick={() => setProponenteAbiertoDetalle(p.numero)} className="text-blue-600 hover:text-blue-800 underline text-[10px] font-semibold">
                                  Ver {nCerts} certificación{nCerts > 1 ? 'es' : ''}
                                </button>
                              ) : (
                                <span className="text-red-500 italic text-[10px] font-medium">Sin registrar</span>
                              )}
                              <select
                                value={valor}
                                onChange={e => handleChecklistChange(p.numero, '_experiencia', e.target.value)}
                                style={{ width: '100%', border: 'none', outline: 'none', background: valor === 'NO' ? '#FEE2E2' : 'transparent', textAlign: 'center', fontWeight: valor === 'NO' ? 'bold' : 'normal', cursor: 'pointer', fontSize: 12 }}
                              >
                                <option>SI</option><option>NO</option><option>N/A</option>
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                        III. REQUERIMIENTOS HABILITANTES ACADÉMICOS (diligenciado por el Supervisor)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>¿Cumple requisitos académicos?</td>
                      {proponentesVista.map((p: any) => {
                        const detSup = supervisorEval?.calificaciones?.find((c: any) => Number(c?.numero) === Number(p.numero))?.habilitante_detalle;
                        const tieneAcademico = p.tipo_persona === 'empresa'
                          ? ((detSup?.academico?.equipo?.director?.miembros?.length || 0) > 0 || detSup?.academico?.equipo?.otros?.some((o: any) => o.miembros?.length > 0))
                          : Boolean(detSup?.academico?.personaNatural?.titulo);
                        const chk = calificaciones[String(p.numero)]?.checklist || {};
                        const valor = chk['_academico'] || 'SI';
                        return (
                          <td key={p.numero} style={{ ...tdCell, padding: '6px 4px' }}>
                            <div className="flex flex-col items-center gap-1">
                              {tieneAcademico ? (
                                <button type="button" onClick={() => setProponenteAbiertoDetalle(p.numero)} className="text-blue-600 hover:text-blue-800 underline text-[10px] font-semibold">
                                  Ver detalle
                                </button>
                              ) : (
                                <span className="text-red-500 italic text-[10px] font-medium">Sin registrar</span>
                              )}
                              <select
                                value={valor}
                                onChange={e => handleChecklistChange(p.numero, '_academico', e.target.value)}
                                style={{ width: '100%', border: 'none', outline: 'none', background: valor === 'NO' ? '#FEE2E2' : 'transparent', textAlign: 'center', fontWeight: valor === 'NO' ? 'bold' : 'normal', cursor: 'pointer', fontSize: 12 }}
                              >
                                <option>SI</option><option>NO</option><option>N/A</option>
                              </select>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* PROPONENTE GANADOR — lo elige Jurídica; por defecto el mismo que recomendó
                        el Supervisor (único que califica con puntajes), salvo que Jurídica elija
                        otro por no cumplir los requisitos legales/experiencia/académicos revisados arriba. */}
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#f0fdf4', color: '#065f46', fontSize: 12 }}>
                        PROPONENTE GANADOR
                        <p style={{ fontWeight: 400, fontSize: 10, color: '#6B7280', marginTop: 2 }}>Haga clic para elegir — por defecto el recomendado por el Supervisor</p>
                      </td>
                      {proponentesVista.map((p: any) => {
                        const esGanador = ganadorNumero === p.numero;
                        return (
                          <td
                            key={p.numero}
                            onClick={() => p.respondida && setProponenteRecomendadoNumero(p.numero)}
                            style={{ ...tdCell, background: esGanador ? '#86EFAC' : !p.respondida ? '#fafafa' : '#fff', fontWeight: 'bold', color: esGanador ? '#065f46' : '#D1D5DB', fontSize: 14, cursor: p.respondida ? 'pointer' : 'default' }}
                          >
                            {!p.respondida ? <span className="text-[10px] italic text-gray-300">No elegible</span> : esGanador ? <span className="flex items-center justify-center gap-1"><Star size={14} className="fill-emerald-700 text-emerald-700" /> GANADOR</span> : <span className="text-[11px] font-normal underline">Elegir</span>}
                          </td>
                        );
                      })}
                    </tr>

                    {/* CALIFICACIÓN DEL SUPERVISOR — informativa, en paralelo a la de Jurídica.
                        Muestra el detalle real de los criterios que usó el Supervisor (incluye
                        cualquier criterio adicional que haya agregado), no solo el total. */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#eff6ff', borderTop: '2px solid #2f6fa3' }}>
                        <div className="flex items-center justify-between px-4 py-2">
                          <span className="font-bold text-blue-700 text-sm">CALIFICACIÓN DEL SUPERVISOR (informativa, en paralelo)</span>
                          <span className={`px-3 py-1 rounded text-white font-bold text-xs ${supervisorEval?.finalizada ? 'bg-emerald-600' : supervisorEval ? 'bg-amber-500' : 'bg-gray-400'}`}>
                            {supervisorEval?.finalizada ? 'FINALIZADA' : supervisorEval ? 'BORRADOR' : 'AÚN NO HA CALIFICADO'}
                          </span>
                        </div>
                      </td>
                    </tr>
                    {supervisorCriterios.map((cfg) => (
                      <tr key={cfg.id}>
                        <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16 }}>
                          {cfg.label || 'Sin nombre'} <span style={{ fontSize: 10, color: '#6B7280', fontWeight: 400 }}>(Peso {cfg.max}%)</span>
                        </td>
                        {proponentesVista.map((p: any) => {
                          const c = supervisorEval?.calificaciones?.find((c: any) => Number(c?.numero) === Number(p.numero));
                          const puntaje = puntajesSupervisorDe(c)[cfg.id] || 0;
                          return (
                            <td key={p.numero} style={{ ...tdCell, background: '#eff6ff' }}>
                              <div style={{ fontWeight: 'bold', color: '#2f6fa3' }}>{puntaje}</div>
                              <div style={{ fontSize: 9, color: '#6B7280' }}>{(puntaje * cfg.max / 100).toFixed(1)} pts</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16 }}>PUNTAJE DEL SUPERVISOR</td>
                      {proponentesVista.map((p: any) => {
                        const st = supervisorTotal(p.numero);
                        return (
                          <td key={p.numero} style={{ ...tdCell, background: '#eff6ff', color: '#2f6fa3', fontWeight: 'bold', fontSize: st != null ? 16 : 12 }}>
                            {st != null ? st : <span className="text-gray-300 text-[10px] italic">Sin calificar</span>}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#f0fdf4', color: '#065f46', fontSize: 12 }}>
                        RECOMENDADO POR EL SUPERVISOR
                      </td>
                      {proponentesVista.map((p: any) => {
                        const esRecomendadoSupervisor = supervisorEval && Number(supervisorEval.proponente_recomendado_numero) === Number(p.numero);
                        return (
                          <td key={p.numero} style={{ ...tdCell, background: esRecomendadoSupervisor ? '#86EFAC' : '#fff', fontWeight: 'bold', color: esRecomendadoSupervisor ? '#065f46' : '#D1D5DB', fontSize: 14 }}>
                            {esRecomendadoSupervisor ? <span className="flex items-center justify-center gap-1"><Star size={14} className="fill-emerald-700 text-emerald-700" /> RECOMENDADO</span> : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>


            </>) : (
              /* VISTA INDIVIDUAL (Simplificada para mantener coherencia) */
              <>
              {(detalle?.solicitud?.descripcion_necesidad_detalle
                || detalle?.solicitud?.experiencia_acreditada_exigida
                || detalle?.solicitud?.presupuesto_aprobado
                || (detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0)) && (
                <div className="mb-8 bg-amber-50 p-6 rounded-lg border border-amber-200" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-3">Requisitos de la contratación (definidos en Planeación — aplican a todos los proponentes)</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Especificaciones técnicas</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {detalle?.solicitud?.descripcion_necesidad_detalle || <em className="text-gray-400">No definidas</em>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Criterios habilitantes</p>
                      {detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0 ? (
                        <ul className="text-sm text-gray-800 list-disc list-inside space-y-0.5">
                          {detalle.solicitud.criterios_habilitantes_planeacion.map((c: any, i: number) => (
                            <li key={i}>{c.descripcion}</li>
                          ))}
                        </ul>
                      ) : <p className="text-sm text-gray-400 italic">No definidos</p>}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Experiencia acreditada exigida</p>
                      <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                        {detalle?.solicitud?.experiencia_acreditada_exigida || <em className="text-gray-400">No definida</em>}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Valor aprobado</p>
                      <p className="text-sm font-bold text-emerald-700">
                        {detalle?.solicitud?.presupuesto_aprobado
                          ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(detalle.solicitud.presupuesto_aprobado))} ${detalle?.solicitud?.moneda || 'COP'}`
                          : <em className="text-gray-400 font-normal">No definido</em>}
                      </p>
                    </div>
                  </div>
                </div>
              )}
              {proponentesVista.map((p: any) => {
                const chk = calificaciones[String(p.numero)]?.checklist || {};
                const requisitosDelProponente = requisitosLegalesPara(p);
                const cumple = requisitosDelProponente.every(r => {
                  const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                  return (chk[r.key] || (doc ? 'SI' : 'NO')) !== 'NO';
                }) ? 'SI' : 'NO';

                return (
                  <div key={p.numero} className="mb-12 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-slate-800 text-white px-4 py-3 flex justify-between items-center">
                      <div>
                        <div className="font-bold">PROPONENTE {p.numero}: {p.nombre_proveedor?.toUpperCase()}</div>
                        <div className="text-[11px] text-gray-300 mt-0.5">
                          {[p.email, p.cedula_nit, p.telefono].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs flex-shrink-0 ${cumple === 'SI' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {cumple === 'SI' ? 'CUMPLE HABILITANTES' : 'NO CUMPLE'}
                      </span>
                    </div>

                    <div className="p-6 space-y-6">
                      <div>
                        <p className="font-bold text-gray-500 mb-2">VERIFICACIÓN LEGAL</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={thCell}>REQUISITO</th>
                              <th style={{ ...thCell, width: 120 }}>ESTADO</th>
                              <th style={thCell}>ADJUNTO RECIBIDO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requisitosDelProponente.map(r => {
                              const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                              const valor = chk[r.key] || (doc ? 'SI' : 'NO');
                              return (
                                <tr key={r.key}>
                                  <td style={{ ...tdCell, textAlign: 'left' }}>{r.label}</td>
                                  <td style={tdCell}>
                                    <select value={valor} onChange={e => handleChecklistChange(p.numero, r.key, e.target.value)} className="w-full text-center outline-none border rounded">
                                      <option>SI</option><option>NO</option><option>N/A</option>
                                    </select>
                                  </td>
                                  <td style={tdCell}>
                                    {doc ? (
                                      <a href={`${API_URL}${doc.url}`} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 underline text-[11px]">
                                        <FileText size={12} /> Ver documento
                                      </a>
                                    ) : (
                                      <span className="text-red-400 italic text-[10px] font-medium">Sin adjuntar</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  </div>
                );
              })}
              </>
            )}

            {hayDiscrepancia && (
              <div className="mt-6 flex items-start gap-3 px-4 py-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-800">
                <span className="text-xl leading-none">⚠</span>
                <div>
                  <p className="font-bold text-sm">Discrepancia entre Jurídica y el Supervisor</p>
                  <p className="text-sm mt-0.5">
                    Jurídica recomienda al <strong>Proponente {ganadorNumero}</strong>, mientras que el Supervisor recomienda al <strong>Proponente {supervisorRecomendadoNumero}</strong>.
                    La decisión final la toma Jurídica, pero antes de finalizar debe justificar por escrito el motivo en el campo de abajo.
                  </p>
                </div>
              </div>
            )}

            <div className="mt-6">
              <p className="font-bold text-gray-700 mb-2 text-sm">
                Evaluación consolidada / Justificación
                {hayDiscrepancia && <span className="text-amber-600 ml-1">(obligatorio por la discrepancia con el Supervisor)</span>}
              </p>
              <textarea
                value={evaluacionConsolidada}
                onChange={e => setEvaluacionConsolidada(e.target.value)}
                placeholder="Registre aquí el análisis consolidado de la evaluación y, si aplica, la justificación de por qué se elige un proponente distinto al recomendado por el supervisor..."
                className={`w-full border rounded p-3 text-sm min-h-[100px] outline-none focus:border-blue-500 ${hayDiscrepancia && !evaluacionConsolidada.trim() ? 'border-amber-400 bg-amber-50/40' : ''}`}
              />
            </div>

            </div>{/* end pointer-events wrapper */}
          </div>
        )}

        {/* ===== TEMPLATE ESTÁTICO PARA PDF — oculto fuera de pantalla ===== */}
        <div
          ref={pdfRef}
          style={{ position: 'absolute', left: '-99999px', top: 0, width: '1100px', background: '#fff', fontFamily: 'Arial, sans-serif', padding: '24px 28px', boxSizing: 'border-box' }}
          aria-hidden="true"
        >
          {(() => {
            const thP: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '6px 8px', fontSize: 10, fontWeight: 700, textAlign: 'center', background: '#f8fafc' };
            const tdP: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '6px 8px', fontSize: 10, textAlign: 'center', verticalAlign: 'top' };
            const badgeStyle = (val: string): React.CSSProperties => ({
              display: 'inline-block', padding: '2px 10px', borderRadius: 4, fontWeight: 'bold', fontSize: 10,
              background: val === 'SI' ? '#86EFAC' : val === 'NO' ? '#FCA5A5' : '#E5E7EB',
              color: val === 'SI' ? '#065f46' : val === 'NO' ? '#991b1b' : '#4B5563'
            });

            return (
              <>
                {/* CABECERA */}
                <div style={{ background: '#F04B23', color: '#fff', padding: '14px', textAlign: 'center', fontWeight: 'bold', fontSize: 20, marginBottom: 20, borderRadius: 4 }}>
                  FORMATO EVALUACIÓN DE PROPONENTES
                </div>

                {/* INFO SOLICITUD */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 18, fontSize: 11 }}>
                  <tbody>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9', width: '22%' }}>CÓDIGO DE SOLICITUD</td>
                      <td style={{ ...tdP, width: '28%' }}>{detalle?.solicitud?.codigo}</td>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9', width: '22%' }}>MODALIDAD</td>
                      <td style={{ ...tdP, width: '28%' }}>{String(detalle?.solicitud?.modalidad || '').toUpperCase()}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>TÍTULO DEL CONTRATO</td>
                      <td colSpan={3} style={{ ...tdP, textAlign: 'left', fontWeight: 'bold' }}>{detalle?.solicitud?.titulo_contrato || detalle?.solicitud?.objeto}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>OBJETO</td>
                      <td colSpan={3} style={{ ...tdP, textAlign: 'left' }}>{detalle?.solicitud?.objeto}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>GERENCIA SOLICITANTE</td>
                      <td style={tdP}>{nombreGerenciaCompleto(detalle?.solicitud?.gerencia_nombre)}</td>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>SUPERVISOR RECOMENDADO</td>
                      <td style={tdP}>{detalle?.solicitud?.solicitante_nombre}</td>
                    </tr>
                    {(detalle?.solicitud?.descripcion_necesidad_detalle || detalle?.solicitud?.experiencia_acreditada_exigida || detalle?.solicitud?.presupuesto_aprobado || detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0) && (
                      <>
                        <tr>
                          <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>ESPECIFICACIONES TÉCNICAS</td>
                          <td colSpan={3} style={{ ...tdP, textAlign: 'left' }}>{detalle?.solicitud?.descripcion_necesidad_detalle || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>CRITERIOS HABILITANTES</td>
                          <td colSpan={3} style={{ ...tdP, textAlign: 'left' }}>
                            {detalle?.solicitud?.criterios_habilitantes_planeacion?.length > 0
                              ? detalle.solicitud.criterios_habilitantes_planeacion.map((c: any) => c.descripcion).join(' · ')
                              : '—'}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>EXPERIENCIA ACREDITADA EXIGIDA</td>
                          <td colSpan={3} style={{ ...tdP, textAlign: 'left' }}>{detalle?.solicitud?.experiencia_acreditada_exigida || '—'}</td>
                        </tr>
                        <tr>
                          <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>VALOR APROBADO</td>
                          <td colSpan={3} style={{ ...tdP, textAlign: 'left', fontWeight: 'bold', color: '#065f46' }}>
                            {detalle?.solicitud?.presupuesto_aprobado
                              ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(detalle.solicitud.presupuesto_aprobado))} ${detalle?.solicitud?.moneda || 'COP'}`
                              : '—'}
                          </td>
                        </tr>
                      </>
                    )}
                  </tbody>
                </table>

                {/* TABLA PRINCIPAL */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thP, background: '#334155', color: '#fff', width: 240, textAlign: 'left', paddingLeft: 14 }}>CRITERIO / REQUISITO</th>
                      {proponentesVista.map((p: any) => (
                        <th key={p.numero} style={{ ...thP, background: '#F04B23', color: '#fff' }}>
                          <div>PROPONENTE {p.numero}</div>
                          <div style={{ fontWeight: 400, fontSize: 9, marginTop: 2 }}>{p.nombre_proveedor}</div>
                          <div style={{ fontWeight: 400, fontSize: 8, marginTop: 1 }}>{p.email}</div>
                          <div style={{ fontWeight: 400, fontSize: 8 }}>{[p.cedula_nit, p.telefono].filter(Boolean).join(' · ')}</div>
                          <div style={{ marginTop: 3 }}>
                            <span style={{ fontSize: 8, background: p.respondida ? '#16a34a' : '#dc2626', color: '#fff', padding: '1px 6px', borderRadius: 4 }}>
                              {p.respondida ? '✓ RESPONDIÓ' : '✗ NO RESPONDIÓ'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* SECCIÓN I */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #334155' }}>
                        I. REQUERIMIENTOS HABILITANTES LEGALES
                      </td>
                    </tr>
                    {requisitosLegalesUnion.map((r: any) => (
                      <tr key={r.key}>
                        <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14, fontSize: 9 }}>{r.label}</td>
                        {proponentesVista.map((p: any) => {
                          const aplica = requisitosLegalesPara(p).some(d => d.key === r.key);
                          if (!aplica) {
                            return <td key={p.numero} style={{ ...tdP, color: '#9CA3AF', fontStyle: 'italic', fontSize: 9 }}>No aplica</td>;
                          }
                          const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                          const val = calificaciones[String(p.numero)]?.checklist?.[r.key] || (doc ? 'SI' : 'NO');
                          return (
                            <td key={p.numero} style={{ ...tdP, background: val === 'NO' ? '#FEE2E2' : val === 'N/A' ? '#F3F4F6' : 'transparent' }}>
                              <span style={badgeStyle(val)}>{val}</span>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, background: '#1e293b', color: '#fff', fontSize: 11 }}>
                        ¿CUMPLE REQUISITOS HABILITANTES?
                      </td>
                      {proponentesVista.map((p: any) => {
                        const chk = calificaciones[String(p.numero)]?.checklist || {};
                        const cumple = requisitosLegalesPara(p).every((r: any) => {
                          const doc = (p.documentos_proveedor || []).find((d: any) => d.tipo === r.key);
                          return (chk[r.key] || (doc ? 'SI' : 'NO')) !== 'NO';
                        }) ? 'SI' : 'NO';
                        return (
                          <td key={p.numero} style={{ ...tdP, background: cumple === 'SI' ? '#86EFAC' : '#FCA5A5', fontWeight: 'bold', fontSize: 14, color: cumple === 'SI' ? '#065f46' : '#991b1b' }}>
                            {cumple}
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN II */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #334155' }}>
                        II. REQUERIMIENTOS HABILITANTES DE EXPERIENCIA (Supervisor)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14, fontSize: 9 }}>¿Cumple experiencia exigida?</td>
                      {proponentesVista.map((p: any) => {
                        const val = calificaciones[String(p.numero)]?.checklist?.['_experiencia'] || 'SI';
                        return (
                          <td key={p.numero} style={{ ...tdP, background: val === 'NO' ? '#FEE2E2' : val === 'N/A' ? '#F3F4F6' : 'transparent' }}>
                            <span style={badgeStyle(val)}>{val}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN III */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #334155' }}>
                        III. REQUERIMIENTOS HABILITANTES ACADÉMICOS (Supervisor)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14, fontSize: 9 }}>¿Cumple requisitos académicos?</td>
                      {proponentesVista.map((p: any) => {
                        const val = calificaciones[String(p.numero)]?.checklist?.['_academico'] || 'SI';
                        return (
                          <td key={p.numero} style={{ ...tdP, background: val === 'NO' ? '#FEE2E2' : val === 'N/A' ? '#F3F4F6' : 'transparent' }}>
                            <span style={badgeStyle(val)}>{val}</span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN IV — calificación del Supervisor (único que puntúa) */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#eff6ff', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #2f6fa3', fontSize: 11 }}>
                        IV. CALIFICACIÓN DEL SUPERVISOR (informativa, en paralelo)
                      </td>
                    </tr>
                    {supervisorCriterios.map((cfg) => (
                      <tr key={cfg.id}>
                        <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14 }}>
                          {cfg.label || 'Sin nombre'} <span style={{ fontSize: 9, color: '#6B7280' }}>(Peso: {cfg.max}%)</span>
                        </td>
                        {proponentesVista.map((p: any) => {
                          const c = supervisorEval?.calificaciones?.find((c: any) => Number(c?.numero) === Number(p.numero));
                          const grade = puntajesSupervisorDe(c)[cfg.id] || 0;
                          const pts = (grade * cfg.max / 100).toFixed(1);
                          return (
                            <td key={p.numero} style={tdP}>
                              <div style={{ fontWeight: 'bold', color: '#2f6fa3' }}>{grade}</div>
                              <div style={{ fontSize: 9, color: '#6B7280' }}>{pts} pts</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, background: '#334155', color: '#fff' }}>PUNTAJE DEL SUPERVISOR</td>
                      {proponentesVista.map((p: any) => {
                        const st = supervisorTotal(p.numero);
                        return (
                          <td key={p.numero} style={{ ...tdP, background: '#2f6fa3', color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                            {st != null ? st : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, background: '#f0fdf4', color: '#065f46' }}>PROPONENTE GANADOR</td>
                      {proponentesVista.map((p: any) => {
                        const esGanador = ganadorNumero === p.numero;
                        return (
                          <td key={p.numero} style={{ ...tdP, background: esGanador ? '#86EFAC' : '#fff', fontWeight: 'bold', color: esGanador ? '#065f46' : '#D1D5DB', fontSize: 14 }}>
                            {esGanador ? '★ GANADOR' : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>

                {/* PIE DE PÁGINA */}
                <div style={{ marginTop: 20, borderTop: '1px solid #E5E7EB', paddingTop: 8, fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>
                  Documento generado por el Sistema de Compras y Contratación — Invest in Bogotá
                </div>
              </>
            );
          })()}
        </div>
        {/* ===== FIN TEMPLATE PDF ===== */}

        {/* MODAL: EXPERIENCIA Y ACADÉMICOS — solo lectura, lo diligencia el Supervisor */}
        {proponenteAbiertoDetalle && (() => {
          const pNum = proponenteAbiertoDetalle;
          const p = proponentesVista.find((pp: any) => pp.numero === pNum);
          const det = supervisorEval?.calificaciones?.find((c: any) => Number(c?.numero) === Number(pNum))?.habilitante_detalle;
          const esEmpresa = p?.tipo_persona === 'empresa';
          const thMini: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '4px 6px', fontSize: 9, fontWeight: 700, textAlign: 'center', background: '#f8fafc' };
          const tdMini: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '4px 6px', fontSize: 10, textAlign: 'center' };
          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                  <h2 className="text-lg font-bold text-gray-800">Experiencia y académicos — Proponente {pNum} <span className="text-xs font-normal text-gray-400">(diligenciado por el Supervisor)</span></h2>
                  <button onClick={() => setProponenteAbiertoDetalle(null)} className="text-gray-500 hover:text-black">Cerrar</button>
                </div>
                <div className="p-6 space-y-6">
                  {!det && <p className="text-sm text-gray-400 italic">El Supervisor aún no ha registrado experiencia ni académicos para este proponente.</p>}

                  {det?.experiencia?.certificaciones?.length > 0 && (
                    <div>
                      <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Experiencia del proponente</p>
                      {det.experiencia.requisito && <p className="text-xs text-gray-500 italic mb-2">{det.experiencia.requisito}</p>}
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>{['Contratante', 'Objeto', 'Valor', 'Plazo', 'Cumple'].map(h => <th key={h} style={thMini}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {det.experiencia.certificaciones.map((c: any, i: number) => (
                            <tr key={i}>
                              <td style={{ ...tdMini, textAlign: 'left' }}>{c.contratante || '—'}</td>
                              <td style={{ ...tdMini, textAlign: 'left' }}>{c.objeto || '—'}</td>
                              <td style={tdMini}>{c.valor || '—'}</td>
                              <td style={tdMini}>{c.plazo_total || '—'}</td>
                              <td style={{ ...tdMini, fontWeight: 'bold' }}>{c.cumple || 'SI'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {esEmpresa ? (
                    <>
                      {det?.academico?.equipo?.director?.miembros?.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Director del proyecto</p>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>{['Nombre', 'Título', 'Posgrado', 'Cumple'].map(h => <th key={h} style={thMini}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {det.academico.equipo.director.miembros.map((m: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ ...tdMini, textAlign: 'left' }}>{m.nombre || '—'}</td>
                                  <td style={tdMini}>{m.titulo || '—'}</td>
                                  <td style={tdMini}>{m.posgrado || '—'}</td>
                                  <td style={{ ...tdMini, fontWeight: 'bold' }}>{m.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                      {(det?.academico?.equipo?.otros || []).filter((o: any) => o.miembros?.length > 0).map((perfil: any, pi: number) => (
                        <div key={perfil.id || pi}>
                          <p className="font-bold text-gray-500 mb-2 text-xs uppercase">{perfil.titulo_perfil || `Perfil ${pi + 1}`}</p>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>{['Nombre', 'Título', 'Posgrado', 'Cumple'].map(h => <th key={h} style={thMini}>{h}</th>)}</tr>
                            </thead>
                            <tbody>
                              {perfil.miembros.map((m: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ ...tdMini, textAlign: 'left' }}>{m.nombre || '—'}</td>
                                  <td style={tdMini}>{m.titulo || '—'}</td>
                                  <td style={tdMini}>{m.posgrado || '—'}</td>
                                  <td style={{ ...tdMini, fontWeight: 'bold' }}>{m.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}
                    </>
                  ) : det?.academico?.personaNatural?.titulo && (
                    <div>
                      <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Académicos del proponente (persona natural)</p>
                      {det.academico.personaNatural.requisito && <p className="text-xs text-gray-500 italic mb-2">{det.academico.personaNatural.requisito}</p>}
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr>{['Título', 'Posgrado', 'Observaciones', 'Cumple'].map(h => <th key={h} style={thMini}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ ...tdMini, textAlign: 'left' }}>{det.academico.personaNatural.titulo || '—'}</td>
                            <td style={{ ...tdMini, textAlign: 'left' }}>{det.academico.personaNatural.posgrado || '—'}</td>
                            <td style={{ ...tdMini, textAlign: 'left' }}>{det.academico.personaNatural.observaciones || '—'}</td>
                            <td style={{ ...tdMini, fontWeight: 'bold' }}>{det.academico.personaNatural.cumple || 'SI'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                <div className="p-4 border-t flex justify-end sticky bottom-0 bg-white">
                  <button onClick={() => setProponenteAbiertoDetalle(null)} className="bg-gray-100 px-6 py-2 rounded font-bold">Cerrar</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
