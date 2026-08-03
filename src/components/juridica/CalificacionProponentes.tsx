import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { ArrowLeft, FileText, Loader2, Save, RotateCcw, Mail, BarChart3, Lock, CheckCircle2, Download, Check, X, Star, Eye } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas-pro';
import { toast } from 'sonner';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type ExperienciaCert = { contratante: string; contratista: string; objeto: string; valor: string; fecha_inicio: string; fecha_fin: string; plazo_total: string; observaciones: string; cumple: string };
type EquipoMiembro = { nombre: string; titulo: string; posgrado: string; contratante: string; fecha_inicio: string; fecha_fin: string; plazo_total: string; observaciones: string; cumple: string };

type Score = { 
  propuesta_economica: number; 
  experiencia_adicional: number; 
  experiencia_trabajo: number;
  otros_criterios_puntos: number;
  checklist?: Record<string, string>;
  // Detalle habilitantes
  habilitante_detalle?: {
    experiencia: { requisito: string; certificaciones: ExperienciaCert[] };
    equipo: { 
      director: { requisito: string; miembros: EquipoMiembro[] };
      otros: { id: string; titulo_perfil: string; requisito: string; miembros: EquipoMiembro[] }[];
    };
    otros_criterios: { requisito: string; filas: any[] };
  }
};

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
  const [configPuntajes, setConfigPuntajes] = useState<Record<string, { enabled: boolean; max: number; label: string }>>({
    propuesta_economica: { enabled: true, max: 100, label: 'Propuesta Económica' },
    experiencia_adicional: { enabled: false, max: 0, label: 'Experiencia Adicional / Visional' },
    experiencia_trabajo: { enabled: false, max: 0, label: 'Experiencia de Trabajo Adicional' },
    otros_criterios_puntos: { enabled: false, max: 0, label: 'Otros Criterios' }
  });
  const [proponentesEditados, setProponentesEditados] = useState<Record<string, any>>({});
  const [habilitantesRevisados, setHabilitantesRevisados] = useState<Set<number>>(new Set());
  const [isAutosaving, setIsAutosaving] = useState(false);
  const [calificacionFinalizada, setCalificacionFinalizada] = useState(false);
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
          initial[String(p.numero)] = {
            propuesta_economica: Number(existing?.propuesta_economica || existing?.requisitos_habilitantes || 0),
            experiencia_adicional: Number(existing?.experiencia_adicional || existing?.prueba_tecnica || 0),
            experiencia_trabajo: Number(existing?.experiencia_trabajo || 0),
            otros_criterios_puntos: Number(existing?.otros_criterios_puntos || existing?.experiencia || 0),
            checklist: existing?.checklist || {},
            habilitante_detalle: existing?.habilitante_detalle || {
              experiencia: { requisito: '', certificaciones: [{ contratante: '', contratista: '', objeto: '', valor: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' }] },
              equipo: { 
                director: { requisito: '', miembros: [{ nombre: '', titulo: '', posgrado: '', contratante: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' }] },
                otros: []
              },
              otros_criterios: { requisito: '', filas: [] }
            }
          };
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
        if (ev.config_puntajes) {
          setConfigPuntajes(ev.config_puntajes);
        } else if (ev.calificaciones?.[0]) {
           const hasExp = ev.calificaciones.some((c:any) => c.experiencia_adicional > 0);
           const hasTrab = ev.calificaciones.some((c:any) => c.experiencia_trabajo > 0);
           const hasOtr = ev.calificaciones.some((c:any) => c.otros_criterios_puntos > 0);
           setConfigPuntajes({
             propuesta_economica: { enabled: true, max: 70, label: 'Propuesta Económica' },
             experiencia_adicional: { enabled: hasExp, max: 10, label: 'Experiencia Adicional / Visional' },
             experiencia_trabajo: { enabled: hasTrab, max: 10, label: 'Experiencia de Trabajo Adicional' },
             otros_criterios_puntos: { enabled: hasOtr, max: 10, label: 'Otros Criterios' }
           });
        }
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
        setHabilitantesRevisados(new Set(Array.isArray(ev?.habilitantes_revisados) ? ev.habilitantes_revisados.map(Number) : []));

        const currentData = JSON.stringify({
          calificaciones: initial,
          configPuntajes: ev.config_puntajes || configPuntajes,
          evaluacionConsolidada: String(ev.evaluacion_consolidada || ''),
          ccRecomendado: String(ev.cc_recomendado || ''),
          proponentesEditados: initialProps,
          habilitantesRevisados: Array.isArray(ev?.habilitantes_revisados) ? ev.habilitantes_revisados.map(Number) : []
        });
        lastSavedRef.current = currentData;

        // Aplicar borrador local automáticamente si existe y es diferente
        const saved = localStorage.getItem(`draft_juridica_${selectedId}`);
        if (saved && saved !== currentData) {
          try {
            const draft = JSON.parse(saved);
            setCalificaciones(draft.calificaciones);
            setConfigPuntajes(draft.configPuntajes);
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
      configPuntajes,
      evaluacionConsolidada,
      ccRecomendado,
      proponentesEditados,
      habilitantesRevisados: Array.from(habilitantesRevisados)
    };
    const draftStr = JSON.stringify(current);

    if (draftStr === lastSavedRef.current) return;

    localStorage.setItem(`draft_juridica_${selectedId}`, draftStr);
    setHayBorrador(true);

    const timer = setTimeout(() => {
      guardar(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [calificaciones, configPuntajes, evaluacionConsolidada, ccRecomendado, proponentesEditados, habilitantesRevisados, selectedId, calificacionFinalizada]);

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
      setConfigPuntajes(draft.configPuntajes);
      setEvaluacionConsolidada(draft.evaluacionConsolidada);
      setCcRecomendado(draft.ccRecomendado);
      if (draft.proponentesEditados) setProponentesEditados(draft.proponentesEditados);
      if (Array.isArray(draft.habilitantesRevisados)) setHabilitantesRevisados(new Set(draft.habilitantesRevisados.map(Number)));
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

  const handleScoreChange = (numero: number, key: string, value: number) => {
    const safe = Math.max(0, Math.min(100, Number(value || 0)));
    setCalificaciones(prev => ({
      ...prev,
      [String(numero)]: { 
        ...(prev[String(numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0 }), 
        [key]: safe 
      }
    }));
  };

  const handlePropChange = (numero: number, field: string, value: string) => {
    setProponentesEditados(prev => ({
      ...prev,
      [String(numero)]: {
        ...(prev[String(numero)] || {}),
        [field]: value
      }
    }));
  };

  const total = (numero: number) => {
    const s = calificaciones[String(numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0 };
    let sum = 0;
    Object.entries(configPuntajes).forEach(([key, config]) => {
      if (config.enabled) {
        const grade = (s as any)[key] || 0;
        sum += (grade * config.max) / 100;
      }
    });
    return Number(sum.toFixed(2));
  };

  // Calificación del supervisor (en paralelo) — solo lectura, informativa para Jurídica.
  const supervisorEval = detalle?.evaluacion?.supervisor || null;
  const supervisorTotal = (numero: number): number | null => {
    const c = (Array.isArray(supervisorEval?.calificaciones) ? supervisorEval.calificaciones : [])
      .find((c: any) => Number(c?.numero) === Number(numero));
    return c ? Number(c.total || 0) : null;
  };

  // Ganador: solo entre proponentes que respondieron y tienen puntaje > 0
  const proponentesQueRespondieron = proponentesVista.filter((p: any) => p.respondida);
  const ganadorNumero: number | null = proponentesQueRespondieron.length > 0
    ? proponentesQueRespondieron.reduce((best: any, p: any) =>
        total(p.numero) > total(best.numero) ? p : best,
        proponentesQueRespondieron[0]
      ).numero
    : null;

  // Discrepancia: Jurídica y el Supervisor recomiendan proponentes distintos.
  // La decisión final la toma Jurídica (es quien finaliza y genera el Acta de Adjudicación),
  // pero debe quedar por escrito el porqué en la evaluación consolidada.
  const supervisorRecomendadoNumero = supervisorEval?.proponente_recomendado_numero != null
    ? Number(supervisorEval.proponente_recomendado_numero)
    : null;
  const hayDiscrepancia = ganadorNumero != null && supervisorRecomendadoNumero != null
    && ganadorNumero !== supervisorRecomendadoNumero;

  // Es obligatorio abrir el detalle de requisitos habilitantes de cada proponente
  // que respondió antes de poder cerrar (finalizar) la calificación.
  const proponentesPendientesRevision = proponentesQueRespondieron.filter(
    (p: any) => !habilitantesRevisados.has(Number(p.numero))
  );

  const totalPesoActual = Object.values(configPuntajes).reduce((acc, c) => acc + (c.enabled ? c.max : 0), 0);
  const pesoCompleto = totalPesoActual === 100;
  const habilitantesCompletos = proponentesPendientesRevision.length === 0;
  const justificacionPendiente = hayDiscrepancia && !evaluacionConsolidada.trim();

  const guardar = async (silencioso = false, finalizar = false) => {
    if (!selectedId || !esModalidadCalificable) return;
    if (calificacionFinalizada) return;

    const totalPuntaje = Object.values(configPuntajes).reduce((acc, c) => acc + (c.enabled ? c.max : 0), 0);

    if (finalizar) {
      if (proponentesPendientesRevision.length > 0) {
        toast.error(`Debe revisar el detalle de requisitos habilitantes de todos los proponentes antes de finalizar. Falta revisar: ${proponentesPendientesRevision.map((p: any) => `Proponente ${p.numero}`).join(', ')}.`);
        return;
      }
      if (totalPuntaje !== 100) {
        toast.error(`Para finalizar, la suma de pesos debe ser exactamente 100%. Actualmente es ${totalPuntaje}%.`);
        return;
      }
      if (hayDiscrepancia && !evaluacionConsolidada.trim()) {
        toast.error(`Jurídica recomienda al Proponente ${ganadorNumero} y el Supervisor recomienda al Proponente ${supervisorRecomendadoNumero}. Antes de finalizar debe justificar por escrito en "Evaluación consolidada / Justificación" por qué se decide por uno u otro.`);
        return;
      }
      const ok = window.confirm('¿Está seguro de FINALIZAR la calificación? El documento quedará bloqueado y no podrá modificarse.');
      if (!ok) return;
    } else if (!silencioso && totalPuntaje !== 100) {
      const proceed = window.confirm(`La suma de los pesos de calificación es ${totalPuntaje}% (debe ser 100% para finalizar). ¿Desea guardar como BORRADOR para continuar luego?`);
      if (!proceed) return;
    }

    const winner = ganadorNumero;
    const ganadorProp = proponentesVista.find((p: any) => p.numero === winner);

    try {
      if (silencioso) setIsAutosaving(true);
      else setSaving(true);
      const payload = {
        config_puntajes: configPuntajes,
        calificaciones: proponentesVista.map((p: any) => ({
          numero: p.numero,
          ...(calificaciones[String(p.numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0 }),
          checklist: calificaciones[String(p.numero)]?.checklist || {},
          habilitante_detalle: calificaciones[String(p.numero)]?.habilitante_detalle,
          total: total(p.numero)
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
        habilitantes_revisados: Array.from(habilitantesRevisados)
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
        configPuntajes,
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
      const current = prev[String(numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0, checklist: {} };
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

  const requisitosLegales = [
    { key: 'carta_presentacion', label: 'Carta de presentación de la propuesta' },
    { key: 'camara_comercio', label: 'Certificado de constitución, existencia y representación legal' },
    { key: 'titulo', label: 'Titulo profesional' },
    { key: 'rut', label: 'Certificado de registro único tributario' },
    { key: 'antecedentes_fiscales', label: 'Antecedentes fiscales' },
    { key: 'antecedentes_disciplinarios', label: 'Antecedentes disciplinarios' },
    { key: 'copia_cedula', label: 'Copia de documento de identificación' },
    { key: 'seguridad_social', label: 'Aportes a seguridad social y parafiscales' }
  ];

  const updateHabilitante = (numero: number, updater: (old: any) => any) => {
    setCalificaciones(prev => {
      const cur = prev[String(numero)] || { requisitos_habilitantes: 0, prueba_tecnica: 0, experiencia: 0, habilitante_detalle: {} };
      return {
        ...prev,
        [String(numero)]: {
          ...cur,
          habilitante_detalle: updater(cur.habilitante_detalle || {})
        }
      };
    });
  };

  const [proponenteAbiertoDetalle, setProponenteAbiertoDetalle] = useState<number | null>(null);

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
                    disabled={saving || !habilitantesCompletos || justificacionPendiente}
                    title={!habilitantesCompletos
                      ? `Debe revisar el detalle de requisitos habilitantes de: ${proponentesPendientesRevision.map((p: any) => `Proponente ${p.numero}`).join(', ')}`
                      : justificacionPendiente
                        ? 'Debe justificar en "Evaluación consolidada" la discrepancia con el Supervisor antes de finalizar'
                        : undefined}
                    className="flex items-center gap-2 px-4 py-2 rounded font-bold text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:brightness-110 transition-all"
                    style={{ backgroundColor: '#1d4ed8' }}
                  >
                    <CheckCircle2 size={16} /> Guardar y Finalizar
                    {!habilitantesCompletos && (
                      <span className="text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded">
                        Falta revisar {proponentesPendientesRevision.length}
                      </span>
                    )}
                    {habilitantesCompletos && justificacionPendiente && (
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
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${pesoCompleto ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {pesoCompleto ? <Check size={13} /> : '⚠'} Pesos configurados: {totalPesoActual}/100
            </span>
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${habilitantesCompletos ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
              {habilitantesCompletos ? <Check size={13} /> : '⚠'} Habilitantes revisados: {proponentesQueRespondieron.length - proponentesPendientesRevision.length}/{proponentesQueRespondieron.length}
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
            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CÓDIGO DE SOLICITUD / PROYECTO</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.codigo}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MODALIDAD DE CONTRATACIÓN</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.modalidad?.toUpperCase()}</p>
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
                          <div className="flex flex-col items-center gap-1.5">
                            <span className="text-sm font-black">PROPONENTE {p.numero}</span>
                            <span className="text-[11px] leading-tight font-medium opacity-90 uppercase line-clamp-2" title={p.nombre_proveedor}>
                              {p.nombre_proveedor}
                            </span>
                            <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${p.respondida ? 'bg-green-600' : 'bg-red-500'}`}>
                              {p.respondida ? <Check size={11} /> : <X size={11} />} {p.respondida ? 'RESPONDIÓ' : 'NO RESPONDIÓ'}
                            </span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* SECCIÓN: INVESTIGACIÓN DE MERCADO */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                        I. INFORMACIÓN DEL PROPONENTE (SUMINISTRADA POR SOLICITANTE)
                      </td>
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500, verticalAlign: 'top' }}>Datos de contacto</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0, verticalAlign: 'top' }}>
                          <textarea
                            value={proponentesEditados[String(p.numero)]?.datos_contacto || ''}
                            onChange={(e) => handlePropChange(p.numero, 'datos_contacto', e.target.value)}
                            className="w-full h-full p-2 border-none outline-none focus:bg-blue-50 text-xs resize-none"
                            style={{ backgroundColor: 'transparent', minHeight: '60px', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Requisitos técnicos propuestos</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <textarea 
                            value={proponentesEditados[String(p.numero)]?.requisitos_tecnicos || ''}
                            onChange={(e) => handlePropChange(p.numero, 'requisitos_tecnicos', e.target.value)}
                            className="w-full h-full p-2 border-none outline-none focus:bg-blue-50 text-[11px] resize-none"
                            style={{ backgroundColor: 'transparent', minHeight: '60px' }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Experiencia acreditada</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <input 
                            type="text"
                            value={proponentesEditados[String(p.numero)]?.experiencia || ''}
                            onChange={(e) => handlePropChange(p.numero, 'experiencia', e.target.value)}
                            className="w-full h-full p-2 border-none outline-none focus:bg-blue-50 text-[11px]"
                            style={{ backgroundColor: 'transparent' }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Criterios habilitantes (Sugeridos)</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <input 
                            type="text"
                            value={proponentesEditados[String(p.numero)]?.criterios_habilitantes || ''}
                            onChange={(e) => handlePropChange(p.numero, 'criterios_habilitantes', e.target.value)}
                            className="w-full h-full p-2 border-none outline-none focus:bg-blue-50 text-[11px]"
                            style={{ backgroundColor: 'transparent' }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Valor de la propuesta + Impuestos</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <div className="flex items-center">
                            <input 
                              type="text"
                              value={proponentesEditados[String(p.numero)]?.valor_con_impuestos || ''}
                              onChange={(e) => handlePropChange(p.numero, 'valor_con_impuestos', e.target.value)}
                              className="flex-1 p-2 border-none outline-none focus:bg-blue-50 text-xs font-bold text-emerald-700"
                              style={{ backgroundColor: 'transparent' }}
                            />
                            <span className="pr-2 text-[10px] text-gray-400 font-bold">{p.moneda || 'COP'}</span>
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Valor agregado</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <textarea 
                            value={proponentesEditados[String(p.numero)]?.valor_agregado || ''}
                            onChange={(e) => handlePropChange(p.numero, 'valor_agregado', e.target.value)}
                            className="w-full h-full p-2 border-none outline-none focus:bg-blue-50 text-[11px] resize-none"
                            style={{ backgroundColor: 'transparent', minHeight: '40px' }}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16, fontWeight: 500 }}>Anexos / Observaciones</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, padding: 0 }}>
                          <div className="flex flex-col h-full">
                            <textarea 
                              value={proponentesEditados[String(p.numero)]?.observaciones || ''}
                              onChange={(e) => handlePropChange(p.numero, 'observaciones', e.target.value)}
                              placeholder="Observaciones de investigación..."
                              className="w-full p-2 border-none outline-none focus:bg-blue-50 text-[11px] resize-none italic"
                              style={{ backgroundColor: 'transparent', minHeight: '50px' }}
                            />
                            {p.respuesta_proponente && (
                              <div className="p-2 border-t border-gray-100 bg-blue-50/30 text-blue-600 font-medium text-[10px]" title="Respuesta de invitación">
                                {p.respuesta_proponente}
                              </div>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>

                    {/* SECCIÓN: VERIFICACIÓN DOCUMENTAL */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                        II. VERIFICACIÓN DOCUMENTAL (ÁREA JURÍDICA)
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

                    {requisitosLegales.map(r => (
                      <tr key={r.key}>
                        <td style={{ ...tdCell, ...stickyCol, background: '#fff', textAlign: 'left', paddingLeft: 16 }}>{r.label}</td>
                        {proponentesVista.map((p: any) => {
                          const chk = calificaciones[String(p.numero)]?.checklist || {};
                          return (
                            <td key={p.numero} style={tdCell}>
                              <select 
                                value={chk[r.key] || 'SI'} 
                                onChange={e => handleChecklistChange(p.numero, r.key, e.target.value)} 
                                style={{ 
                                  width: '100%', border: 'none', outline: 'none', 
                                  background: (chk[r.key] || 'SI') === 'NO' ? '#FEE2E2' : 'transparent',
                                  textAlign: 'center', fontWeight: (chk[r.key] || 'SI') === 'NO' ? 'bold' : 'normal',
                                  cursor: 'pointer'
                                }}
                              >
                                <option>SI</option><option>NO</option><option>N/A</option>
                              </select>
                            </td>
                          );
                        })}
                      </tr>
                    ))}

                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, background: '#fff', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16 }}>
                        ¿CUMPLE REQUISITOS HABILITANTES?
                        <p style={{ fontWeight: 400, fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                          Debe revisar el detalle de cada proponente para poder finalizar
                        </p>
                      </td>
                      {proponentesVista.map((p: any) => {
                        const chk = calificaciones[String(p.numero)]?.checklist || {};
                        const cumple = requisitosLegales.every(r => (chk[r.key] || 'SI') !== 'NO') ? 'SI' : 'NO';
                        const revisado = habilitantesRevisados.has(Number(p.numero));
                        return (
                          <td
                            key={p.numero}
                            style={{ ...tdCell, background: cumple === 'SI' ? '#86EFAC' : '#FCA5A5', fontWeight: 'bold', fontSize: 14, padding: '10px 8px' }}
                          >
                            <div className="flex flex-col items-center gap-1.5">
                              <span className="flex items-center gap-1">
                                {cumple === 'SI' ? <Check size={15} className="text-emerald-800" /> : <X size={15} className="text-red-800" />}
                                {cumple}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setProponenteAbiertoDetalle(p.numero);
                                  if (p.respondida) {
                                    setHabilitantesRevisados(prev => new Set(prev).add(Number(p.numero)));
                                  }
                                }}
                                className="flex items-center gap-1 text-[11px] font-semibold bg-white/70 hover:bg-white border border-black/10 rounded-full px-2.5 py-1 shadow-sm transition-colors"
                                style={{ color: '#1e293b' }}
                              >
                                <Eye size={12} /> Ver detalle
                              </button>
                              {p.respondida && (
                                <span className={`flex items-center gap-1 text-[10px] font-bold rounded-full px-2 py-0.5 ${revisado ? 'bg-emerald-800/10 text-emerald-900' : 'bg-red-800/10 text-red-900'}`}>
                                  {revisado ? <><Check size={10} /> REVISADO</> : <>⚠ PENDIENTE</>}
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN: CONFIGURACIÓN DE PESOS */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#fef2f2', borderTop: '2px solid #ef4444' }}>
                        <div className="flex items-center justify-between px-4 py-2">
                           <div className="text-left">
                              <span className="font-bold text-red-700 text-sm">III. CONFIGURACIÓN Y CALIFICACIÓN DE PUNTAJES</span>
                              <p className="text-[10px] text-red-500">Habilite los criterios y asigne el peso (La suma debe ser 100)</p>
                           </div>
                           <div className={`px-3 py-1 rounded text-white font-bold text-xs ${Object.values(configPuntajes).reduce((a,b)=>a+(b.enabled?b.max:0),0) === 100 ? 'bg-green-600' : 'bg-red-600'}`}>
                             TOTAL PESO: {Object.values(configPuntajes).reduce((a,b)=>a+(b.enabled?b.max:0),0)} / 100
                           </div>
                        </div>
                      </td>
                    </tr>

                    {Object.entries(configPuntajes).map(([key, config]) => (
                      <tr key={key}>
                        <td style={{ ...tdCell, ...stickyCol, textAlign: 'left', paddingLeft: 16, background: config.enabled ? '#fff' : '#f9fafb' }}>
                          <div className="flex items-center gap-3">
                            <input 
                              type="checkbox" 
                              checked={config.enabled} 
                              onChange={e => setConfigPuntajes(prev => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))} 
                            />
                            <span className={config.enabled ? 'font-medium' : 'text-gray-400 line-through'}>{config.label}</span>
                            {config.enabled && (
                              <div className="ml-auto flex items-center gap-1">
                                <span className="text-[10px] text-gray-500 font-bold uppercase">PESO:</span>
                                <input
                                  type="number"
                                  value={config.max}
                                  onChange={e => setConfigPuntajes(prev => ({ ...prev, [key]: { ...prev[key], max: Number(e.target.value) } }))}
                                  onFocus={e => e.target.select()}
                                  className="w-16 border rounded text-center text-sm font-bold bg-yellow-50 focus:bg-white outline-none"
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        {proponentesVista.map((p: any) => (
                          <td key={p.numero} style={{ ...tdCell, background: !p.respondida ? '#fafafa' : config.enabled ? '#fff' : '#f1f5f9' }}>
                            {!p.respondida ? (
                              <span className="text-gray-300 text-[10px] italic">Sin respuesta</span>
                            ) : config.enabled ? (
                              <div className="flex flex-col items-center">
                                <input
                                  type="number" min={0} max={100}
                                  value={(calificaciones[String(p.numero)] as any)?.[key] || 0}
                                  onChange={e => handleScoreChange(p.numero, key, Number(e.target.value))}
                                  onFocus={e => e.target.select()}
                                  style={{ width: '100%', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px', fontWeight: 'bold' }}
                                />
                                <span className="text-[9px] text-blue-600 font-bold mt-1">
                                  {(((calificaciones[String(p.numero)] as any)?.[key] || 0) * config.max / 100).toFixed(1)} pts
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-300 text-[10px]">---</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}

                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#334155', color: '#fff' }}>TOTAL PUNTAJE OBTENIDO</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, background: p.respondida ? '#F04B23' : '#E5E7EB', color: p.respondida ? '#fff' : '#9CA3AF', fontWeight: 'bold', fontSize: p.respondida ? 16 : 12 }}>
                          {p.respondida ? total(p.numero) : 'N/A'}
                        </td>
                      ))}
                    </tr>

                    {/* FILA GANADOR — automático por mayor puntaje, solo entre quienes respondieron */}
                    <tr>
                      <td style={{ ...tdCell, ...stickyCol, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#f0fdf4', color: '#065f46', fontSize: 12 }}>
                        PROPONENTE RECOMENDADO
                        <p style={{ fontWeight: 400, fontSize: 10, color: '#6B7280', marginTop: 2 }}>Mayor puntaje obtenido</p>
                      </td>
                      {proponentesVista.map((p: any) => {
                        const esGanador = ganadorNumero === p.numero && total(p.numero) > 0;
                        return (
                          <td
                            key={p.numero}
                            style={{ ...tdCell, background: esGanador ? '#86EFAC' : !p.respondida ? '#fafafa' : '#fff', fontWeight: 'bold', color: esGanador ? '#065f46' : '#D1D5DB', fontSize: 14 }}
                          >
                            {!p.respondida ? <span className="text-[10px] italic text-gray-300">No elegible</span> : esGanador ? <span className="flex items-center justify-center gap-1"><Star size={14} className="fill-emerald-700 text-emerald-700" /> GANADOR</span> : '—'}
                          </td>
                        );
                      })}
                    </tr>

                    {/* CALIFICACIÓN DEL SUPERVISOR — informativa, en paralelo a la de Jurídica */}
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
              proponentesVista.map((p: any) => {
                const chk = calificaciones[String(p.numero)]?.checklist || {};
                const cumple = requisitosLegales.every(r => (chk[r.key] || 'SI') !== 'NO') ? 'SI' : 'NO';
                const resp = respuestasProponentes[p.email || p.datos_contacto];
                
                return (
                  <div key={p.numero} className="mb-12 border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <div className="bg-slate-800 text-white px-4 py-2 font-bold flex justify-between items-center">
                      <span>PROPONENTE {p.numero}: {p.nombre_proveedor?.toUpperCase()}</span>
                      <span className={`px-3 py-1 rounded-full text-xs ${cumple === 'SI' ? 'bg-green-500' : 'bg-red-500'}`}>
                        {cumple === 'SI' ? 'CUMPLE HABILITANTES' : 'NO CUMPLE'}
                      </span>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-sm">
                         <div>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">DATOS DE CONTACTO</p>
                            <p className="p-2 bg-gray-50 rounded border" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.datos_contacto || '---'}</p>
                         </div>
                         <div>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">VALOR DE LA PROPUESTA</p>
                            <p className="p-2 bg-green-50 text-green-700 font-bold rounded border">{p.valor_con_impuestos || '---'} {p.moneda || 'COP'}</p>
                         </div>
                         <div>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">VALOR AGREGADO</p>
                            <p className="p-2 bg-gray-50 rounded border">{p.valor_agregado || '---'}</p>
                         </div>
                         <div className="col-span-2 md:col-span-1">
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">REQUISITOS TÉCNICOS</p>
                            <p className="p-2 bg-gray-50 rounded border min-h-[40px]">{p.requisitos_tecnicos || '---'}</p>
                         </div>
                         <div>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">EXPERIENCIA ACREDITADA</p>
                            <p className="p-2 bg-gray-50 rounded border">{p.experiencia || '---'}</p>
                         </div>
                         <div>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">CRITERIOS HABILITANTES</p>
                            <p className="p-2 bg-gray-50 rounded border">{p.criterios_habilitantes || '---'}</p>
                         </div>
                      </div>

                      {p.respuesta_proponente && (
                        <div className="bg-blue-50 p-4 rounded border border-blue-100">
                          <p className="font-bold text-blue-700 mb-1 uppercase text-[10px]">RESPUESTA TEXTUAL DEL PROPONENTE</p>
                          <p className="text-blue-800 whitespace-pre-line">{p.respuesta_proponente}</p>
                        </div>
                      )}

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
                            {requisitosLegales.map(r => (
                              <tr key={r.key}>
                                <td style={{ ...tdCell, textAlign: 'left' }}>{r.label}</td>
                                <td style={tdCell}>
                                  <select value={chk[r.key] || 'SI'} onChange={e => handleChecklistChange(p.numero, r.key, e.target.value)} className="w-full text-center outline-none border rounded">
                                    <option>SI</option><option>NO</option><option>N/A</option>
                                  </select>
                                </td>
                                <td style={tdCell}>
                                   {/* Intento de mapeo inteligente del archivo si existe por nombre o similar */}
                                   <span className="text-gray-400 italic text-[10px]">Ver en documentos consolidados</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {Object.entries(configPuntajes).filter(([, cfg]) => cfg.enabled).map(([key, cfg]) => (
                          <div key={key}>
                            <p className="font-bold text-gray-500 mb-1 uppercase text-[10px]">{cfg.label} (Peso {cfg.max})</p>
                            <input 
                              type="number" min={0} max={100} 
                              value={(calificaciones[String(p.numero)] as any)?.[key] || 0} 
                              onChange={e => handleScoreChange(p.numero, key, Number(e.target.value))} 
                              className="w-full p-2 border rounded font-bold text-center focus:border-red-500 outline-none" 
                            />
                            <p className="text-[9px] text-blue-600 font-bold text-center mt-1">{(((calificaciones[String(p.numero)] as any)?.[key] || 0) * cfg.max / 100).toFixed(1)} pts</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })
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
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>OBJETO</td>
                      <td colSpan={3} style={{ ...tdP, textAlign: 'left' }}>{detalle?.solicitud?.objeto}</td>
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>GERENCIA SOLICITANTE</td>
                      <td style={tdP}>{nombreGerenciaCompleto(detalle?.solicitud?.gerencia_nombre)}</td>
                      <td style={{ ...tdP, fontWeight: 'bold', background: '#f1f5f9' }}>SUPERVISOR RECOMENDADO</td>
                      <td style={tdP}>{detalle?.solicitud?.solicitante_nombre}</td>
                    </tr>
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
                        I. INFORMACIÓN DEL PROPONENTE (SUMINISTRADA POR SOLICITANTE)
                      </td>
                    </tr>
                    {[
                      { label: 'Datos de contacto', field: 'datos_contacto' },
                      { label: 'Requisitos técnicos propuestos', field: 'requisitos_tecnicos' },
                      { label: 'Experiencia acreditada', field: 'experiencia' },
                      { label: 'Criterios habilitantes (Sugeridos)', field: 'criterios_habilitantes' },
                      { label: 'Valor agregado', field: 'valor_agregado' },
                      { label: 'Anexos / Observaciones', field: 'observaciones' },
                    ].map(({ label, field }) => (
                      <tr key={field}>
                        <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14 }}>{label}</td>
                        {proponentesVista.map((p: any) => (
                          <td key={p.numero} style={{ ...tdP, textAlign: 'left', fontSize: 9, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {proponentesEditados[String(p.numero)]?.[field] || '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14 }}>Valor de la propuesta + Impuestos</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdP, fontSize: 9, fontWeight: 'bold', color: '#065f46' }}>
                          {proponentesEditados[String(p.numero)]?.valor_con_impuestos || '—'} {p.moneda || 'COP'}
                        </td>
                      ))}
                    </tr>

                    {/* SECCIÓN II */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #334155' }}>
                        II. VERIFICACIÓN DOCUMENTAL (ÁREA JURÍDICA)
                      </td>
                    </tr>
                    {requisitosLegales.map((r: any) => (
                      <tr key={r.key}>
                        <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14, fontSize: 9 }}>{r.label}</td>
                        {proponentesVista.map((p: any) => {
                          const val = calificaciones[String(p.numero)]?.checklist?.[r.key] || 'SI';
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
                        const cumple = requisitosLegales.every((r: any) => (chk[r.key] || 'SI') !== 'NO') ? 'SI' : 'NO';
                        return (
                          <td key={p.numero} style={{ ...tdP, background: cumple === 'SI' ? '#86EFAC' : '#FCA5A5', fontWeight: 'bold', fontSize: 14, color: cumple === 'SI' ? '#065f46' : '#991b1b' }}>
                            {cumple}
                          </td>
                        );
                      })}
                    </tr>

                    {/* SECCIÓN III */}
                    <tr>
                      <td colSpan={proponentesVista.length + 1} style={{ ...tdP, background: '#fef2f2', fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, borderTop: '2px solid #ef4444', fontSize: 11 }}>
                        III. CONFIGURACIÓN Y CALIFICACIÓN DE PUNTAJES
                      </td>
                    </tr>
                    {Object.entries(configPuntajes).filter(([, cfg]) => cfg.enabled).map(([key, cfg]) => (
                      <tr key={key}>
                        <td style={{ ...tdP, textAlign: 'left', paddingLeft: 14 }}>
                          {cfg.label} <span style={{ fontSize: 9, color: '#6B7280' }}>(Peso: {cfg.max}%)</span>
                        </td>
                        {proponentesVista.map((p: any) => {
                          const grade = (calificaciones[String(p.numero)] as any)?.[key] || 0;
                          const pts = (grade * cfg.max / 100).toFixed(1);
                          return (
                            <td key={p.numero} style={tdP}>
                              <div style={{ fontWeight: 'bold' }}>{grade}</div>
                              <div style={{ fontSize: 9, color: '#2563eb' }}>{pts} pts</div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, background: '#334155', color: '#fff' }}>TOTAL PUNTAJE OBTENIDO</td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdP, background: '#F04B23', color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                          {total(p.numero)}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ ...tdP, fontWeight: 'bold', textAlign: 'left', paddingLeft: 14, background: '#f0fdf4', color: '#065f46' }}>PROPONENTE RECOMENDADO</td>
                      {proponentesVista.map((p: any) => {
                        const esGanador = ganadorNumero === p.numero && total(p.numero) > 0;
                        return (
                          <td key={p.numero} style={{ ...tdP, background: esGanador ? '#86EFAC' : '#fff', fontWeight: 'bold', color: esGanador ? '#065f46' : '#D1D5DB', fontSize: 14 }}>
                            {esGanador ? '★ GANADOR' : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>

                {/* DETALLE HABILITANTES INLINE POR PROPONENTE */}
                {proponentesVista.map((p: any) => {
                  const det_h = calificaciones[String(p.numero)]?.habilitante_detalle;
                  if (!det_h) return null;
                  const thH: React.CSSProperties = { ...thP, fontSize: 9, padding: '4px 6px' };
                  const tdH: React.CSSProperties = { ...tdP, fontSize: 9, padding: '4px 6px' };
                  const hasCerts = (det_h.experiencia?.certificaciones?.length || 0) > 0;
                  const hasDir = (det_h.equipo?.director?.miembros?.length || 0) > 0;
                  const hasOtros = det_h.equipo?.otros?.some((o: any) => o.miembros?.length > 0);
                  const hasOC = det_h.otros_criterios?.filas?.length > 0;
                  if (!hasCerts && !hasDir && !hasOtros && !hasOC) return null;

                  return (
                    <div key={p.numero} style={{ marginBottom: 28, pageBreakInside: 'avoid' }}>
                      <div style={{ background: '#334155', color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: 12, marginBottom: 10 }}>
                        VERIFICACIÓN HABILITANTE DETALLADA — PROPONENTE {p.numero}: {p.nombre_proveedor?.toUpperCase()}
                      </div>

                      {/* Experiencia */}
                      {hasCerts && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ background: '#F04B23', color: '#fff', padding: '6px 12px', fontWeight: 'bold', fontSize: 10, marginBottom: 0 }}>
                            EXPERIENCIA DEL PROPONENTE
                            {det_h.experiencia.requisito && <div style={{ fontWeight: 400, fontSize: 9, marginTop: 2 }}>{det_h.experiencia.requisito}</div>}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['ID','CONTRATANTE','CONTRATISTA','OBJETO','VALOR','F. INICIO','F. FIN','PLAZO','OBSERVACIONES','CUMPLE'].map(h => (
                                  <th key={h} style={thH}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {det_h.experiencia.certificaciones.map((c: any, i: number) => (
                                <tr key={i}>
                                  <td style={tdH}>CERT. {i+1}</td>
                                  <td style={{ ...tdH, textAlign: 'left' }}>{c.contratante || '—'}</td>
                                  <td style={{ ...tdH, textAlign: 'left' }}>{c.contratista || '—'}</td>
                                  <td style={{ ...tdH, textAlign: 'left', maxWidth: 160, wordBreak: 'break-word' }}>{c.objeto || '—'}</td>
                                  <td style={tdH}>{c.valor || '—'}</td>
                                  <td style={tdH}>{c.fecha_inicio || '—'}</td>
                                  <td style={tdH}>{c.fecha_fin || '—'}</td>
                                  <td style={tdH}>{c.plazo_total || '—'}</td>
                                  <td style={{ ...tdH, textAlign: 'left' }}>{c.observaciones || '—'}</td>
                                  <td style={{ ...tdH, fontWeight: 'bold', background: c.cumple === 'SI' ? '#86EFAC' : c.cumple === 'NO' ? '#FCA5A5' : '#E5E7EB' }}>{c.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Director */}
                      {hasDir && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ background: '#F04B23', color: '#fff', padding: '6px 12px', fontWeight: 'bold', fontSize: 10 }}>
                            DIRECTOR DEL PROYECTO
                            {det_h.equipo.director.requisito && <div style={{ fontWeight: 400, fontSize: 9, marginTop: 2 }}>{det_h.equipo.director.requisito}</div>}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                {['NOMBRE','TÍTULO','POSGRADO','CONTRATANTE','F. INICIO','F. FIN','PLAZO','OBSERVACIONES','CUMPLE'].map(h => (
                                  <th key={h} style={thH}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {det_h.equipo.director.miembros.map((m: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ ...tdH, textAlign: 'left' }}>{m.nombre || '—'}</td>
                                  <td style={tdH}>{m.titulo || '—'}</td>
                                  <td style={tdH}>{m.posgrado || '—'}</td>
                                  <td style={tdH}>{m.contratante || '—'}</td>
                                  <td style={tdH}>{m.fecha_inicio || '—'}</td>
                                  <td style={tdH}>{m.fecha_fin || '—'}</td>
                                  <td style={tdH}>{m.plazo_total || '—'}</td>
                                  <td style={{ ...tdH, textAlign: 'left' }}>{m.observaciones || '—'}</td>
                                  <td style={{ ...tdH, fontWeight: 'bold', background: m.cumple === 'SI' ? '#86EFAC' : m.cumple === 'NO' ? '#FCA5A5' : '#E5E7EB' }}>{m.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {/* Otros perfiles de equipo */}
                      {det_h.equipo?.otros?.map((prof: any, pi: number) => (
                        (prof.miembros?.length > 0) && (
                          <div key={prof.id || pi} style={{ marginBottom: 14 }}>
                            <div style={{ background: '#F04B23', color: '#fff', padding: '6px 12px', fontWeight: 'bold', fontSize: 10 }}>
                              PROFESIONAL {pi+1}: {prof.titulo_perfil}
                              {prof.requisito && <div style={{ fontWeight: 400, fontSize: 9, marginTop: 2 }}>{prof.requisito}</div>}
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  {['NOMBRE','TÍTULO','POSGRADO','CONTRATANTE','F. INICIO','F. FIN','PLAZO','OBSERVACIONES','CUMPLE'].map(h => (
                                    <th key={h} style={thH}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {prof.miembros.map((m: any, i: number) => (
                                  <tr key={i}>
                                    <td style={{ ...tdH, textAlign: 'left' }}>{m.nombre || '—'}</td>
                                    <td style={tdH}>{m.titulo || '—'}</td>
                                    <td style={tdH}>{m.posgrado || '—'}</td>
                                    <td style={tdH}>{m.contratante || '—'}</td>
                                    <td style={tdH}>{m.fecha_inicio || '—'}</td>
                                    <td style={tdH}>{m.fecha_fin || '—'}</td>
                                    <td style={tdH}>{m.plazo_total || '—'}</td>
                                    <td style={{ ...tdH, textAlign: 'left' }}>{m.observaciones || '—'}</td>
                                    <td style={{ ...tdH, fontWeight: 'bold', background: m.cumple === 'SI' ? '#86EFAC' : m.cumple === 'NO' ? '#FCA5A5' : '#E5E7EB' }}>{m.cumple || 'SI'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )
                      ))}

                      {/* Otros criterios */}
                      {hasOC && (
                        <div style={{ marginBottom: 14 }}>
                          <div style={{ background: '#F04B23', color: '#fff', padding: '6px 12px', fontWeight: 'bold', fontSize: 10 }}>
                            OTROS CRITERIOS
                            {det_h.otros_criterios.requisito && <div style={{ fontWeight: 400, fontSize: 9, marginTop: 2 }}>{det_h.otros_criterios.requisito}</div>}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <tbody>
                              {det_h.otros_criterios.filas.map((f: any, i: number) => (
                                <tr key={i} style={{ background: '#f8fafc' }}>
                                  <td style={{ ...tdH, textAlign: 'left', width: '75%' }}>{f.detalle || '—'}</td>
                                  <td style={{ ...tdH, fontWeight: 'bold', background: f.cumple === 'SI' ? '#86EFAC' : f.cumple === 'NO' ? '#FCA5A5' : '#E5E7EB' }}>
                                    {f.cumple || 'SI'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* PIE DE PÁGINA */}
                <div style={{ marginTop: 20, borderTop: '1px solid #E5E7EB', paddingTop: 8, fontSize: 8, color: '#9CA3AF', textAlign: 'center' }}>
                  Documento generado por el Sistema de Compras y Contratación — Invest in Bogotá
                </div>
              </>
            );
          })()}
        </div>
        {/* ===== FIN TEMPLATE PDF ===== */}

        {/* MODAL DETALLE HABILITANTES (IMAGEN EXCEL) */}
        {proponenteAbiertoDetalle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-xl font-bold text-gray-800">Verificación Habilitante Detallada - Proponente {proponenteAbiertoDetalle}</h2>
                <button onClick={() => setProponenteAbiertoDetalle(null)} className="text-gray-500 hover:text-black">Cerrar</button>
              </div>
              <div className="p-6 space-y-12">
                {(() => {
                  const pNum = proponenteAbiertoDetalle;
                  const det = calificaciones[String(pNum)]?.habilitante_detalle || {
                    experiencia: { requisito: '', certificaciones: [] },
                    equipo: { director: { requisito: '', miembros: [] }, otros: [] },
                    otros_criterios: { requisito: '', filas: [] }
                  };

                  const thMini: React.CSSProperties = { ...thCell, background: '#f8fafc', fontSize: 10, padding: '4px' };
                  const tdMini: React.CSSProperties = { ...tdCell, padding: '4px', fontSize: 10 };

                  return (
                    <div style={{ fontFamily: 'Arial, sans-serif' }}>
                      {/* EXPERIENCIA DEL PROPONENTE */}
                      <div className="mb-8">
                        <div style={{ ...orangeBar, background: '#F04B23', textAlign: 'left', padding: '10px 15px', fontWeight: 'bold' }}>
                          EXPERIENCIA DEL PROPONENTE
                          <input 
                            placeholder="Describir el requisito de experiencia habilitante solicitado en el TDR..." 
                            className="block w-full mt-1 bg-white/20 text-white placeholder:text-white/60 p-1 border-none outline-none font-normal text-xs"
                            value={det.experiencia.requisito}
                            onChange={e => updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, requisito: e.target.value } }))}
                          />
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr>
                              <th style={thMini}>ID</th>
                              <th style={thMini}>CONTRATANTE</th>
                              <th style={thMini}>CONTRATISTA</th>
                              <th style={thMini}>OBJETO</th>
                              <th style={thMini}>VALOR</th>
                              <th style={thMini}>FECHA INICIO</th>
                              <th style={thMini}>FECHA FIN</th>
                              <th style={thMini}>PLAZO TOTAL</th>
                              <th style={thMini}>OBSERVACIONES</th>
                              <th style={thMini}>CUMPLE</th>
                              <th style={{ ...thMini, width: 40 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {det.experiencia.certificaciones.map((c, i) => (
                              <tr key={i}>
                                <td style={tdMini}>CERTIFICACIÓN {i+1}</td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.contratante} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].contratante = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.contratista} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].contratista = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.objeto} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].objeto = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.valor} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].valor = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={c.fecha_inicio} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].fecha_inicio = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={c.fecha_fin} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].fecha_fin = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.plazo_total} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].plazo_total = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}><input className="w-full border-none outline-none" value={c.observaciones} onChange={e => {
                                  const list = [...det.experiencia.certificaciones];
                                  list[i].observaciones = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                }} /></td>
                                <td style={tdMini}>
                                  <select className="border-none outline-none font-bold" value={c.cumple} onChange={e => {
                                    const list = [...det.experiencia.certificaciones];
                                    list[i].cumple = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                  }}>
                                    <option>SI</option><option>NO</option><option>N/A</option>
                                  </select>
                                </td>
                                <td style={tdMini}>
                                  <button onClick={() => {
                                    const list = det.experiencia.certificaciones.filter((_, idx) => idx !== i);
                                    updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                                  }} className="text-red-500 font-bold">X</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button 
                          onClick={() => {
                            const list = [...det.experiencia.certificaciones, { contratante: '', contratista: '', objeto: '', valor: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' }];
                            updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: list } }));
                          }}
                          className="mt-2 text-xs text-blue-600 font-bold underline"
                        >
                          + Agregar Certificación
                        </button>
                      </div>

                      {/* EQUIPO DE TRABAJO */}
                      <div className="mb-8">
                        <div style={{ background: '#F04B23', color: '#fff', textAlign: 'center', fontWeight: 'bold', padding: '8px', fontSize: 14 }}>
                          EQUIPO DE TRABAJO
                        </div>
                        
                        {/* DIRECTOR */}
                        <div className="mt-4">
                          <div style={{ ...orangeBar, background: '#F04B23', textAlign: 'left', padding: '6px 15px', fontSize: 11 }}>
                            DIRECTOR DEL PROYECTO
                            <input 
                              placeholder="Describir el requisito de experiencia habilitante solicitado en el TDR..." 
                              className="block w-full mt-1 bg-white/20 text-white placeholder:text-white/60 p-1 border-none outline-none font-normal text-[10px]"
                              value={det.equipo.director.requisito}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, requisito: e.target.value } } }))}
                            />
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr>
                                <th style={thMini}>NOMBRE DEL PROFESIONAL PRESENTADO</th>
                                <th style={thMini}>TÍTULO</th>
                                <th style={thMini}>POSGRADO</th>
                                <th style={thMini}>CONTRATANTE</th>
                                <th style={thMini}>FECHA INICIO</th>
                                <th style={thMini}>FECHA FIN</th>
                                <th style={thMini}>PLAZO TOTAL</th>
                                <th style={thMini}>OBSERVACIONES</th>
                                <th style={thMini}>CUMPLE</th>
                              </tr>
                            </thead>
                            <tbody>
                              {det.equipo.director.miembros.map((m, i) => (
                                <tr key={i}>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.nombre} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].nombre = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.titulo} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].titulo = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.posgrado} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].posgrado = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.contratante} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].contratante = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={m.fecha_inicio} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].fecha_inicio = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={m.fecha_fin} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].fecha_fin = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.plazo_total} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].plazo_total = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}><input className="w-full border-none outline-none" value={m.observaciones} onChange={e => {
                                    const list = [...det.equipo.director.miembros];
                                    list[i].observaciones = e.target.value;
                                    updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                  }} /></td>
                                  <td style={tdMini}>
                                    <select className="border-none outline-none font-bold" value={m.cumple} onChange={e => {
                                      const list = [...det.equipo.director.miembros];
                                      list[i].cumple = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, director: { ...old.equipo.director, miembros: list } } }));
                                    }}>
                                      <option>SI</option><option>NO</option><option>N/A</option>
                                    </select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* PROFESIONALES ADICIONALES */}
                        {det.equipo.otros.map((prof, pi) => (
                          <div className="mt-6" key={prof.id}>
                            <div style={{ ...orangeBar, background: '#F04B23', textAlign: 'left', padding: '6px 15px', fontSize: 11 }}>
                              PROFESIONAL {pi+1}: <input value={prof.titulo_perfil} onChange={e => {
                                const list = [...det.equipo.otros];
                                list[pi].titulo_perfil = e.target.value;
                                updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                              }} className="bg-transparent border-b border-white outline-none" />
                              <input 
                                placeholder="Describir los perfiles requeridos como equipo de trabajo..." 
                                className="block w-full mt-1 bg-white/20 text-white placeholder:text-white/60 p-1 border-none outline-none font-normal text-[10px]"
                                value={prof.requisito}
                                onChange={e => {
                                  const list = [...det.equipo.otros];
                                  list[pi].requisito = e.target.value;
                                  updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                }}
                              />
                            </div>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                              <thead>
                                <tr>
                                  <th style={thMini}>NOMBRE DEL PROFESIONAL PRESENTADO</th>
                                  <th style={thMini}>TÍTULO</th>
                                  <th style={thMini}>POSGRADO</th>
                                  <th style={thMini}>CONTRATANTE</th>
                                  <th style={thMini}>FECHA INICIO</th>
                                  <th style={thMini}>FECHA FIN</th>
                                  <th style={thMini}>PLAZO TOTAL</th>
                                  <th style={thMini}>OBSERVACIONES</th>
                                  <th style={thMini}>CUMPLE</th>
                                  <th style={{ ...thMini, width: 30 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {prof.miembros.map((m, i) => (
                                  <tr key={i}>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.nombre} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].nombre = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.titulo} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].titulo = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.posgrado} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].posgrado = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.contratante} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].contratante = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={m.fecha_inicio} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].fecha_inicio = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input type="date" className="w-full border-none outline-none" value={m.fecha_fin} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].fecha_fin = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.plazo_total} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].plazo_total = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}><input className="w-full border-none outline-none" value={m.observaciones} onChange={e => {
                                      const list = [...det.equipo.otros];
                                      list[pi].miembros[i].observaciones = e.target.value;
                                      updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                    }} /></td>
                                    <td style={tdMini}>
                                      <select className="border-none outline-none font-bold" value={m.cumple} onChange={e => {
                                        const list = [...det.equipo.otros];
                                        list[pi].miembros[i].cumple = e.target.value;
                                        updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                      }}>
                                        <option>SI</option><option>NO</option><option>N/A</option>
                                      </select>
                                    </td>
                                    <td style={tdMini}>
                                      <button onClick={() => {
                                        const list = [...det.equipo.otros];
                                        list[pi].miembros = list[pi].miembros.filter((_, idx) => idx !== i);
                                        updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                                      }} className="text-red-500 font-bold">X</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button 
                              onClick={() => {
                                const list = [...det.equipo.otros];
                                list[pi].miembros.push({ nombre: '', titulo: '', posgrado: '', contratante: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' });
                                updateHabilitante(pNum, old => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                              }}
                              className="mt-1 text-[10px] text-blue-600 font-bold underline"
                            >
                              + Agregar Integrante a este perfil
                            </button>
                          </div>
                        ))}
                        <button 
                          onClick={() => {
                            const list = [...det.equipo.otros, { id: Math.random().toString(36).substring(2, 9), titulo_perfil: 'NUEVO PERFIL', requisito: '', miembros: [] }];
                            updateHabilitante(pNum, (old: any) => ({ ...old, equipo: { ...old.equipo, otros: list } }));
                          }}
                          className="mt-4 text-xs bg-slate-100 p-2 rounded border border-slate-300 font-bold"
                        >
                          + Agregar Otro Perfil de Equipo
                        </button>
                      </div>

                      {/* OTROS CRITERIOS */}
                      <div className="mb-8">
                        <div style={{ ...orangeBar, background: '#F04B23', textAlign: 'left', padding: '10px 15px', fontWeight: 'bold' }}>
                          OTROS CRITERIOS
                          <input 
                            placeholder="Describir los otros criterios habilitantes..." 
                            className="block w-full mt-1 bg-white/20 text-white placeholder:text-white/60 p-1 border-none outline-none font-normal text-xs"
                            value={det.otros_criterios.requisito}
                            onChange={e => updateHabilitante(pNum, old => ({ ...old, otros_criterios: { ...old.otros_criterios, requisito: e.target.value } }))}
                          />
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <tbody>
                            <tr style={{ background: '#f8fafc' }}>
                              <td style={tdMini} className="font-bold w-48">VALOR / DETALLE</td>
                              <td style={tdMini}><input className="w-full border-none outline-none" value={det.otros_criterios.filas[0]?.detalle || ''} onChange={e => {
                                const filas = [{ detalle: e.target.value }];
                                updateHabilitante(pNum, old => ({ ...old, otros_criterios: { ...old.otros_criterios, filas } }));
                              }} /></td>
                              <td style={{ ...tdMini, width: 100 }}>
                                 <select 
                                   className="border-none outline-none font-bold bg-transparent w-full text-center"
                                   value={det.otros_criterios.filas[0]?.cumple || 'SI'}
                                   onChange={e => {
                                     const filas = [{ ...det.otros_criterios.filas[0], cumple: e.target.value }];
                                     updateHabilitante(pNum, (old: any) => ({ ...old, otros_criterios: { ...old.otros_criterios, filas } }));
                                   }}
                                 >
                                    <option>SI</option><option>NO</option><option>N/A</option>
                                 </select>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      <div className="text-[10px] text-gray-400 italic space-y-1 mt-10 border-t pt-4">
                        <p>Instructivo de diligenciamiento:</p>
                        <p>(i) Se debe diligenciar un cuadro por cada proponente que se haya presentado.</p>
                        <p>(ii) Los criterios habilitantes se deberán ajustar a los requerido en cada Término de Referencia.</p>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
                <button onClick={() => setProponenteAbiertoDetalle(null)} className="bg-gray-100 px-6 py-2 rounded font-bold">Cerrar y Volver al Excel</button>
                <button onClick={guardar} className="bg-red-600 text-white px-6 py-2 rounded font-bold">Guardar Cambios</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
