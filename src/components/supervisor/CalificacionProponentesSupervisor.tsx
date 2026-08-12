import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Save, CheckCircle2, Lock, ShieldAlert, ClipboardCheck, ArrowRight, Plus, X } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type ScoreSupervisor = {
  puntajes: Record<string, number>;
};

type CriterioPuntaje = { id: string; label: string; max: number };

type ExperienciaCert = { contratante: string; contratista: string; objeto: string; valor: string; fecha_inicio: string; fecha_fin: string; plazo_total: string; observaciones: string; cumple: string };
type EquipoMiembro = { nombre: string; titulo: string; posgrado: string; contratante: string; fecha_inicio: string; fecha_fin: string; plazo_total: string; observaciones: string; cumple: string };
type PersonaNaturalAcademico = { requisito: string; titulo: string; posgrado: string; observaciones: string; cumple: string };

type HabilitanteDetalle = {
  experiencia: { requisito: string; certificaciones: ExperienciaCert[] };
  academico: {
    equipo?: { director: { requisito: string; miembros: EquipoMiembro[] }; otros: { id: string; titulo_perfil: string; requisito: string; miembros: EquipoMiembro[] }[] };
    personaNatural?: PersonaNaturalAcademico;
  };
};

interface CalificacionProponentesSupervisorProps {
  solicitudId: string | null;
  userEmail?: string;
  onBack: () => void;
}

// Documentos que el proponente debe cargar según el checklist oficial RA1-4 (mismo criterio
// usado en Jurídica) — se muestran aquí solo de referencia, en modo lectura.
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
const requisitosLegalesPara = (p: any) => {
  let docs = requisitosLegalesBase.filter(d => !d.soloEmpresa || p?.tipo_persona === 'empresa');
  if (p?.tipo_objeto === 'servicios_profesionales') docs = [...docs, ...requisitosLegalesServiciosProfesionales];
  return docs;
};

const nuevaCertificacion = (): ExperienciaCert => ({ contratante: '', contratista: '', objeto: '', valor: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' });
const nuevoMiembro = (): EquipoMiembro => ({ nombre: '', titulo: '', posgrado: '', contratante: '', fecha_inicio: '', fecha_fin: '', plazo_total: '', observaciones: '', cumple: 'SI' });

function detalleHabilitantePorDefecto(p: any): HabilitanteDetalle {
  return {
    experiencia: { requisito: '', certificaciones: [] },
    academico: p?.tipo_persona === 'empresa'
      ? { equipo: { director: { requisito: '', miembros: [] }, otros: [] } }
      : { personaNatural: { requisito: '', titulo: '', posgrado: '', observaciones: '', cumple: 'SI' } }
  };
}

const thMini: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '4px 6px', fontSize: 9, fontWeight: 700, textAlign: 'center', background: '#f8fafc' };
const tdMini: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '4px 6px', fontSize: 10, textAlign: 'center' };

// Tabla genérica de filas editables (certificaciones de experiencia / miembros de equipo) —
// definida fuera del componente principal para no perder el foco de los inputs en cada render.
function TablaFilasEditable({ campos, filas, onChangeCampo, onRemove }: {
  campos: { key: string; label: string; tipo?: string }[];
  filas: any[];
  onChangeCampo: (indice: number, campo: string, valor: string) => void;
  onRemove: (indice: number) => void;
}) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {campos.map(c => <th key={c.key} style={thMini}>{c.label}</th>)}
          <th style={thMini}>CUMPLE</th>
          <th style={{ ...thMini, width: 30 }}></th>
        </tr>
      </thead>
      <tbody>
        {filas.map((fila, i) => (
          <tr key={i}>
            {campos.map(c => (
              <td key={c.key} style={tdMini}>
                <input
                  className="w-full border-none outline-none text-center"
                  style={{ fontSize: 10 }}
                  type={c.tipo || 'text'}
                  value={fila[c.key] || ''}
                  onChange={e => onChangeCampo(i, c.key, e.target.value)}
                />
              </td>
            ))}
            <td style={tdMini}>
              <select className="border-none outline-none font-bold" style={{ fontSize: 10 }} value={fila.cumple || 'SI'} onChange={e => onChangeCampo(i, 'cumple', e.target.value)}>
                <option>SI</option><option>NO</option><option>N/A</option>
              </select>
            </td>
            <td style={tdMini}>
              <button type="button" onClick={() => onRemove(i)} className="text-red-500"><X size={12} /></button>
            </td>
          </tr>
        ))}
        {filas.length === 0 && (
          <tr><td colSpan={campos.length + 2} style={{ ...tdMini, color: '#9CA3AF', fontStyle: 'italic' }}>Sin registros</td></tr>
        )}
      </tbody>
    </table>
  );
}

const CAMPOS_EXPERIENCIA = [
  { key: 'contratante', label: 'CONTRATANTE' },
  { key: 'contratista', label: 'CONTRATISTA' },
  { key: 'objeto', label: 'OBJETO' },
  { key: 'valor', label: 'VALOR' },
  { key: 'fecha_inicio', label: 'F. INICIO', tipo: 'date' },
  { key: 'fecha_fin', label: 'F. FIN', tipo: 'date' },
  { key: 'plazo_total', label: 'PLAZO' },
  { key: 'observaciones', label: 'OBSERVACIONES' },
];
const CAMPOS_MIEMBRO = [
  { key: 'nombre', label: 'NOMBRE' },
  { key: 'titulo', label: 'TÍTULO' },
  { key: 'posgrado', label: 'POSGRADO' },
  { key: 'contratante', label: 'CONTRATANTE' },
  { key: 'fecha_inicio', label: 'F. INICIO', tipo: 'date' },
  { key: 'fecha_fin', label: 'F. FIN', tipo: 'date' },
  { key: 'plazo_total', label: 'PLAZO' },
  { key: 'observaciones', label: 'OBSERVACIONES' },
];

export function CalificacionProponentesSupervisor({ solicitudId, userEmail, onBack }: CalificacionProponentesSupervisorProps) {
  // Si se llega sin una solicitud puntual (ej. desde el menú lateral), se muestra
  // primero un listado de solicitudes pendientes de calificación para elegir.
  const [selectedId, setSelectedId] = useState<string | null>(solicitudId);
  const [pendientes, setPendientes] = useState<any[]>([]);
  const [loadingPendientes, setLoadingPendientes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorAcceso, setErrorAcceso] = useState<string | null>(null);
  const [detalle, setDetalle] = useState<any>(null);
  const [calificaciones, setCalificaciones] = useState<Record<string, ScoreSupervisor>>({});
  const [configPuntajes, setConfigPuntajes] = useState<CriterioPuntaje[]>([{ id: 'propuesta_economica', label: 'Propuesta Económica', max: 100 }]);
  const [evaluacionConsolidada, setEvaluacionConsolidada] = useState('');
  const [habilitantesRevisados, setHabilitantesRevisados] = useState<Set<number>>(new Set());
  const [habilitanteDetalle, setHabilitanteDetalle] = useState<Record<string, HabilitanteDetalle>>({});
  const [finalizada, setFinalizada] = useState(false);
  const [proponenteAbiertoDetalle, setProponenteAbiertoDetalle] = useState<number | null>(null);

  useEffect(() => {
    setSelectedId(solicitudId);
  }, [solicitudId]);

  useEffect(() => {
    if (selectedId || !userEmail) return;
    let mounted = true;
    setLoadingPendientes(true);
    apiFetch(`${API_URL}/api/supervisor/solicitudes-en-calificacion?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (mounted) setPendientes(Array.isArray(d) ? d : []); })
      .catch(() => { if (mounted) setPendientes([]); })
      .finally(() => { if (mounted) setLoadingPendientes(false); });
    return () => { mounted = false; };
  }, [selectedId, userEmail]);

  useEffect(() => {
    if (!selectedId || !userEmail) return;
    let mounted = true;
    const cargar = async () => {
      setLoading(true);
      setErrorAcceso(null);
      try {
        const res = await apiFetch(`${API_URL}/api/supervisor/solicitudes/${selectedId}/calificacion?email=${encodeURIComponent(userEmail)}`);
        const data = await res.json();
        if (!mounted) return;
        if (!res.ok) {
          setErrorAcceso(data?.error || 'No se pudo cargar la calificación.');
          return;
        }
        setDetalle(data);

        const ev = data?.evaluacion?.supervisor || {};
        const list = Array.isArray(data?.proponentes) ? data.proponentes : [];
        const initial: Record<string, ScoreSupervisor> = {};
        const initialDetalle: Record<string, HabilitanteDetalle> = {};
        list.forEach((p: any) => {
          const existing = (Array.isArray(ev.calificaciones) ? ev.calificaciones : []).find((c: any) => Number(c?.numero) === Number(p.numero));
          // Compatibilidad con evaluaciones guardadas antes de tener puntajes dinámicos.
          const puntajes: Record<string, number> = (existing?.puntajes && Object.keys(existing.puntajes).length)
            ? existing.puntajes
            : {
                propuesta_economica: Number(existing?.propuesta_economica || 0),
                ...(existing?.experiencia_adicional ? { experiencia_adicional: Number(existing.experiencia_adicional) } : {}),
                ...(existing?.experiencia_trabajo ? { experiencia_trabajo: Number(existing.experiencia_trabajo) } : {}),
                ...(existing?.otros_criterios_puntos ? { otros_criterios_puntos: Number(existing.otros_criterios_puntos) } : {}),
              };
          initial[String(p.numero)] = { puntajes };
          initialDetalle[String(p.numero)] = existing?.habilitante_detalle || detalleHabilitantePorDefecto(p);
        });
        setCalificaciones(initial);
        setHabilitanteDetalle(initialDetalle);
        // Compatibilidad con el formato anterior de config_puntajes (objeto con enabled/max/label).
        if (Array.isArray(ev.config_puntajes) && ev.config_puntajes.length) {
          setConfigPuntajes(ev.config_puntajes);
        } else if (ev.config_puntajes && typeof ev.config_puntajes === 'object') {
          const migrado = Object.entries(ev.config_puntajes)
            .filter(([, v]: any) => v?.enabled)
            .map(([key, v]: any) => ({ id: key, label: v.label, max: Number(v.max) || 0 }));
          setConfigPuntajes(migrado.length ? migrado : [{ id: 'propuesta_economica', label: 'Propuesta Económica', max: 100 }]);
        }
        setEvaluacionConsolidada(String(ev.evaluacion_consolidada || ''));
        setHabilitantesRevisados(new Set(Array.isArray(ev.habilitantes_revisados) ? ev.habilitantes_revisados.map(Number) : []));
        setFinalizada(Boolean(ev.finalizada));
      } catch (e) {
        console.error(e);
        if (mounted) setErrorAcceso('Error al conectar con el servidor.');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    cargar();
    return () => { mounted = false; };
  }, [selectedId, userEmail]);

  // Un proponente que no respondió a la invitación no tiene nada que calificar —
  // no debe ocupar una columna en el formato.
  const proponentesVista = useMemo(() => (Array.isArray(detalle?.proponentes) ? detalle.proponentes.filter((p: any) => p.respondida) : []), [detalle]);
  const calificacionesJuridica = useMemo(() => (Array.isArray(detalle?.evaluacion?.calificaciones) ? detalle.evaluacion.calificaciones : []), [detalle]);

  const handleScoreChange = (numero: number, criterioId: string, value: number) => {
    const safe = Math.max(0, Math.min(100, Number(value || 0)));
    setCalificaciones(prev => ({
      ...prev,
      [String(numero)]: { puntajes: { ...(prev[String(numero)]?.puntajes || {}), [criterioId]: safe } }
    }));
  };

  const total = (numero: number) => {
    const s = calificaciones[String(numero)]?.puntajes || {};
    let sum = 0;
    configPuntajes.forEach(cfg => { sum += (s[cfg.id] || 0) * cfg.max / 100; });
    return Number(sum.toFixed(2));
  };

  const agregarCriterio = () => setConfigPuntajes(prev => [...prev, { id: `criterio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, label: '', max: 0 }]);
  const quitarCriterio = (id: string) => setConfigPuntajes(prev => prev.filter(c => c.id !== id));
  const renombrarCriterio = (id: string, label: string) => setConfigPuntajes(prev => prev.map(c => c.id === id ? { ...c, label } : c));
  const cambiarPesoCriterio = (id: string, max: number) => setConfigPuntajes(prev => prev.map(c => c.id === id ? { ...c, max } : c));

  const updateHabilitante = (numero: number, updater: (old: HabilitanteDetalle) => HabilitanteDetalle) => {
    setHabilitanteDetalle(prev => {
      const p = proponentesVista.find((pp: any) => pp.numero === numero);
      const actual = prev[String(numero)] || detalleHabilitantePorDefecto(p);
      return { ...prev, [String(numero)]: updater(actual) };
    });
  };

  const proponentesQueRespondieron = proponentesVista.filter((p: any) => p.respondida);
  const ganadorNumero: number | null = proponentesQueRespondieron.length > 0
    ? proponentesQueRespondieron.reduce((best: any, p: any) => total(p.numero) > total(best.numero) ? p : best, proponentesQueRespondieron[0]).numero
    : null;

  const proponentesPendientesRevision = proponentesQueRespondieron.filter((p: any) => !habilitantesRevisados.has(Number(p.numero)));

  const guardar = async (finalizar = false) => {
    if (!selectedId || !userEmail || finalizada) return;
    const totalPuntaje = configPuntajes.reduce((acc, c) => acc + c.max, 0);

    if (finalizar) {
      if (proponentesPendientesRevision.length > 0) {
        alert(`Debe revisar el detalle de requisitos habilitantes de todos los proponentes antes de finalizar. Falta revisar: ${proponentesPendientesRevision.map((p: any) => `Proponente ${p.numero}`).join(', ')}.`);
        return;
      }
      if (totalPuntaje !== 100) {
        alert(`Para finalizar, la suma de pesos debe ser exactamente 100%. Actualmente es ${totalPuntaje}%.`);
        return;
      }
      const ok = window.confirm('¿Está seguro de FINALIZAR su calificación como supervisor? No podrá modificarla después.');
      if (!ok) return;
    }

    try {
      setSaving(true);
      const payload = {
        email: userEmail,
        config_puntajes: configPuntajes,
        calificaciones: proponentesVista.map((p: any) => ({
          numero: p.numero,
          puntajes: calificaciones[String(p.numero)]?.puntajes || {},
          habilitante_detalle: habilitanteDetalle[String(p.numero)] || detalleHabilitantePorDefecto(p),
          total: total(p.numero)
        })),
        evaluacion_consolidada: evaluacionConsolidada,
        proponente_recomendado_numero: ganadorNumero,
        habilitantes_revisados: Array.from(habilitantesRevisados),
        finalizada: finalizar
      };
      const res = await apiFetch(`${API_URL}/api/supervisor/solicitudes/${selectedId}/calificacion`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'No se pudo guardar');
      }
      if (finalizar) {
        setFinalizada(true);
        alert('Su calificación como supervisor ha sido FINALIZADA.');
      } else {
        alert('Calificación guardada como borrador.');
      }
    } catch (e: any) {
      alert(e?.message || 'Error guardando la calificación');
    } finally {
      setSaving(false);
    }
  };

  const thCell: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '8px', fontSize: 12, fontWeight: 700, textAlign: 'center' };
  const tdCell: React.CSSProperties = { border: '1px solid #9CA3AF', padding: '8px', fontSize: 12, textAlign: 'center' };

  // Volver: si se entró desde un listado interno, regresa al listado;
  // si se entró con una solicitud puntual (ej. desde el aviso del Dashboard), sale de la pantalla.
  const handleVolver = () => {
    if (!solicitudId && selectedId) setSelectedId(null);
    else onBack();
  };

  if (!selectedId) {
    return (
      <div className="ux-page p-4 lg:p-8" style={{ paddingBottom: '4rem' }}>
        <div className="mx-auto space-y-4" style={{ maxWidth: 900 }}>
          <button onClick={onBack} className="text-gray-600 mb-2 font-bold"><ArrowLeft size={16} className="inline mr-1" /> Volver</button>
          <h1 className="text-2xl font-bold">Calificación de Proponentes — Supervisor</h1>
          <p className="text-sm text-gray-500">
            Solicitudes en las que usted es el supervisor designado y Jurídica está evaluando proponentes.
          </p>

          {loadingPendientes ? (
            <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
          ) : pendientes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
              <ClipboardCheck size={32} className="mb-2 opacity-30" />
              <p className="font-semibold">No tiene solicitudes pendientes de calificación</p>
              <p className="text-sm mt-0.5">Aparecerán aquí cuando Jurídica esté evaluando proponentes de una solicitud donde usted sea el supervisor designado.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm divide-y divide-gray-100">
              {pendientes.map((s: any) => (
                <button
                  key={s.id}
                  onClick={() => setSelectedId(s.id)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 text-left transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-black text-blue-700">{s.codigo}</p>
                    <p className="text-sm font-semibold text-gray-800 truncate">{s.titulo_contrato || s.objeto || 'Sin objeto'}</p>
                    {s.supervisor_finalizada && (
                      <span className="inline-block mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Ya finalizó su calificación
                      </span>
                    )}
                  </div>
                  <ArrowRight size={16} className="text-gray-300 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <Loader2 className="animate-spin text-blue-600" size={32} />
        <p className="text-gray-500 text-sm">Cargando calificación...</p>
      </div>
    );
  }

  if (errorAcceso) {
    return (
      <div className="p-10 text-center flex flex-col items-center gap-4 bg-white border rounded shadow m-6">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
          <ShieldAlert size={32} className="text-red-400" />
        </div>
        <h2 className="text-xl font-bold text-gray-700">No disponible</h2>
        <p className="text-gray-500 max-w-md">{errorAcceso}</p>
        <button onClick={handleVolver} className="mt-2 px-6 py-2 bg-slate-800 text-white rounded font-bold">Volver</button>
      </div>
    );
  }

  return (
    <div className="ux-page p-4 lg:p-8" style={{ paddingBottom: '4rem' }}>
      <div className="mx-auto space-y-4" style={{ maxWidth: 1400 }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <div>
            <button onClick={handleVolver} className="text-gray-600 mb-2 font-bold"><ArrowLeft size={16} className="inline mr-1" /> Volver</button>
            <h1 className="text-2xl font-bold">Calificación de Proponentes — Supervisor</h1>
            <p className="text-sm text-gray-500 mt-1">Su calificación es independiente de la de Jurídica y se registra en paralelo.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {finalizada ? (
              <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-300 rounded text-emerald-700 font-bold text-sm">
                <Lock size={15} /> SU CALIFICACIÓN QUEDÓ FINALIZADA
              </div>
            ) : (
              <>
                <button onClick={() => guardar(false)} disabled={saving} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2">
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />} Guardar borrador
                </button>
                <button
                  onClick={() => guardar(true)}
                  disabled={saving || proponentesPendientesRevision.length > 0}
                  title={proponentesPendientesRevision.length > 0
                    ? `Debe revisar el detalle de requisitos habilitantes de: ${proponentesPendientesRevision.map((p: any) => `Proponente ${p.numero}`).join(', ')}`
                    : undefined}
                  className="flex items-center gap-2 px-4 py-2 rounded font-bold text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: '#1d4ed8' }}
                >
                  <CheckCircle2 size={16} /> Guardar y Finalizar
                  {proponentesPendientesRevision.length > 0 && (
                    <span className="text-[10px] font-normal bg-white/20 px-1.5 py-0.5 rounded">Falta revisar {proponentesPendientesRevision.length}</span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-white border rounded shadow p-6" style={{ overflowX: 'hidden' }}>
          {finalizada && (
            <div className="mb-4 flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 font-bold text-sm">
              <Lock size={18} className="text-emerald-600 flex-shrink-0" />
              <span>Su calificación quedó bloqueada y no puede modificarse.</span>
            </div>
          )}
          <div style={{ pointerEvents: finalizada ? 'none' : undefined, opacity: finalizada ? 0.82 : 1 }}>
            <div style={{ background: '#2f6fa3', color: '#fff', padding: '15px', textAlign: 'center', fontWeight: 'bold', fontSize: 20, marginBottom: 24, borderRadius: '4px' }}>
              CALIFICACIÓN DEL SUPERVISOR RECOMENDADO
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 mb-8 bg-gray-50 p-6 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">CÓDIGO DE SOLICITUD</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.codigo}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">MODALIDAD</p>
                <p className="text-lg font-bold text-gray-900">{detalle?.solicitud?.modalidad?.toUpperCase()}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">OBJETO DE LA CONTRATACIÓN</p>
                <p className="text-md font-medium text-gray-800 leading-relaxed">{detalle?.solicitud?.objeto}</p>
              </div>
            </div>

            <div className="overflow-x-auto" style={{ marginBottom: 32 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', minWidth: proponentesVista.length * 220 + 300 }}>
                <thead>
                  <tr>
                    <th style={{ ...thCell, background: '#334155', color: '#fff', width: 320, textAlign: 'left', paddingLeft: 16 }}>CRITERIO / REQUISITO</th>
                    {proponentesVista.map((p: any) => (
                      <th key={p.numero} style={{ ...thCell, background: '#2f6fa3', color: '#fff', padding: '10px 5px' }}>
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xs font-black">PROPONENTE {p.numero}</span>
                          <span className="text-[10px] leading-tight font-medium opacity-90 uppercase line-clamp-2" title={p.nombre_proveedor}>{p.nombre_proveedor}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.respondida ? 'bg-green-600' : 'bg-red-500'}`}>
                            {p.respondida ? '✓ RESPONDIÓ' : '✗ NO RESPONDIÓ'}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#f1f5f9', fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, borderTop: '2px solid #334155' }}>
                      I. VERIFICACIÓN DOCUMENTAL DE JURÍDICA (solo lectura)
                    </td>
                  </tr>
                  <tr>
                    <td style={{ ...tdCell, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16 }}>
                      ¿CUMPLE REQUISITOS HABILITANTES?
                      <p style={{ fontWeight: 400, fontSize: 9, color: '#6B7280', marginTop: 2 }}>
                        Haga clic para diligenciar experiencia y requisitos académicos — debe revisar el detalle de cada proponente para poder finalizar
                      </p>
                    </td>
                    {proponentesVista.map((p: any) => {
                      const cj = calificacionesJuridica.find((c: any) => Number(c?.numero) === Number(p.numero));
                      const chk = cj?.checklist || {};
                      const cumple = requisitosLegalesPara(p).every(r => (chk[r.key] || 'SI') !== 'NO') ? 'SI' : 'NO';
                      const revisado = habilitantesRevisados.has(Number(p.numero));
                      return (
                        <td
                          key={p.numero}
                          style={{ ...tdCell, background: cumple === 'SI' ? '#86EFAC' : '#FCA5A5', fontWeight: 'bold', fontSize: 14, cursor: 'pointer' }}
                          onClick={() => {
                            setProponenteAbiertoDetalle(p.numero);
                            if (p.respondida) setHabilitantesRevisados(prev => new Set(prev).add(Number(p.numero)));
                          }}
                        >
                          {cumple} <span className="text-[10px] block font-normal underline">Ver / Diligenciar Detalle</span>
                          {p.respondida && (
                            <span className={`text-[9px] block font-bold mt-0.5 ${revisado ? 'text-emerald-800' : 'text-red-700'}`}>
                              {revisado ? '✓ REVISADO' : '⚠ PENDIENTE DE REVISAR'}
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  <tr>
                    <td colSpan={proponentesVista.length + 1} style={{ ...tdCell, background: '#eff6ff', borderTop: '2px solid #2f6fa3' }}>
                      <div className="flex items-center justify-between px-4 py-2">
                        <div className="text-left">
                          <span className="font-bold text-blue-700 text-sm">IV. CRITERIOS DE EVALUACIÓN</span>
                          <p className="text-[10px] text-blue-500">La suma de los pesos debe ser 100</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={agregarCriterio} className="flex items-center gap-1 text-xs font-bold text-blue-700 bg-white border border-blue-300 rounded-full px-3 py-1.5 hover:bg-blue-50">
                            <Plus size={13} /> Agregar otro
                          </button>
                          <div className={`px-3 py-1 rounded text-white font-bold text-xs ${configPuntajes.reduce((a, c) => a + c.max, 0) === 100 ? 'bg-green-600' : 'bg-red-600'}`}>
                            TOTAL PESO: {configPuntajes.reduce((a, c) => a + c.max, 0)} / 100
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>

                  {configPuntajes.map((cfg) => (
                    <tr key={cfg.id}>
                      <td style={{ ...tdCell, textAlign: 'left', paddingLeft: 16 }}>
                        <div className="flex items-center gap-2">
                          {cfg.id === 'propuesta_economica' ? (
                            <span className="font-medium">{cfg.label}</span>
                          ) : (
                            <input
                              value={cfg.label}
                              onChange={e => renombrarCriterio(cfg.id, e.target.value)}
                              placeholder="Nombre del criterio..."
                              className="border-b border-dashed border-gray-300 outline-none font-medium flex-1 bg-transparent"
                            />
                          )}
                          <div className="ml-auto flex items-center gap-1 flex-shrink-0">
                            <span className="text-[10px] text-gray-500 font-bold uppercase">PESO:</span>
                            <input
                              type="number"
                              value={cfg.max}
                              onChange={e => cambiarPesoCriterio(cfg.id, Number(e.target.value))}
                              onFocus={e => e.target.select()}
                              className="w-16 border rounded text-center text-sm font-bold bg-yellow-50 focus:bg-white outline-none"
                            />
                          </div>
                          {cfg.id !== 'propuesta_economica' && (
                            <button type="button" onClick={() => quitarCriterio(cfg.id)} className="text-red-500 flex-shrink-0"><X size={14} /></button>
                          )}
                        </div>
                      </td>
                      {proponentesVista.map((p: any) => (
                        <td key={p.numero} style={{ ...tdCell, background: !p.respondida ? '#fafafa' : '#fff' }}>
                          {!p.respondida ? (
                            <span className="text-gray-300 text-[10px] italic">Sin respuesta</span>
                          ) : (
                            <div className="flex flex-col items-center">
                              <input
                                type="number" min={0} max={100}
                                value={calificaciones[String(p.numero)]?.puntajes?.[cfg.id] || 0}
                                onChange={e => handleScoreChange(p.numero, cfg.id, Number(e.target.value))}
                                onFocus={e => e.target.select()}
                                style={{ width: '100%', textAlign: 'center', border: '1px solid #e2e8f0', borderRadius: '4px', padding: '2px', fontWeight: 'bold' }}
                              />
                              <span className="text-[9px] text-blue-600 font-bold mt-1">
                                {((calificaciones[String(p.numero)]?.puntajes?.[cfg.id] || 0) * cfg.max / 100).toFixed(1)} pts
                              </span>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}

                  <tr>
                    <td style={{ ...tdCell, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#334155', color: '#fff' }}>TOTAL PUNTAJE (SUPERVISOR)</td>
                    {proponentesVista.map((p: any) => (
                      <td key={p.numero} style={{ ...tdCell, background: p.respondida ? '#2f6fa3' : '#E5E7EB', color: p.respondida ? '#fff' : '#9CA3AF', fontWeight: 'bold', fontSize: p.respondida ? 16 : 12 }}>
                        {p.respondida ? total(p.numero) : 'N/A'}
                      </td>
                    ))}
                  </tr>

                  <tr>
                    <td style={{ ...tdCell, fontWeight: 'bold', textAlign: 'left', paddingLeft: 16, background: '#f0fdf4', color: '#065f46', fontSize: 12 }}>
                      PROPONENTE RECOMENDADO
                      <p style={{ fontWeight: 400, fontSize: 9, color: '#6B7280', marginTop: 2 }}>Según su calificación</p>
                    </td>
                    {proponentesVista.map((p: any) => {
                      const esGanador = ganadorNumero === p.numero && total(p.numero) > 0;
                      return (
                        <td key={p.numero} style={{ ...tdCell, background: esGanador ? '#86EFAC' : !p.respondida ? '#fafafa' : '#fff', fontWeight: 'bold', color: esGanador ? '#065f46' : '#D1D5DB', fontSize: 14 }}>
                          {!p.respondida ? <span className="text-[10px] italic text-gray-300">No elegible</span> : esGanador ? '★ RECOMENDADO' : '—'}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <p className="font-bold text-gray-700 mb-2 text-sm">Observaciones / concepto del supervisor</p>
              <textarea
                value={evaluacionConsolidada}
                onChange={e => setEvaluacionConsolidada(e.target.value)}
                placeholder="Escriba aquí su concepto técnico sobre los proponentes evaluados..."
                className="w-full border rounded p-3 text-sm min-h-[100px] outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {/* MODAL: EXPERIENCIA Y REQUISITOS ACADÉMICOS — el Supervisor diligencia esto directamente */}
        {proponenteAbiertoDetalle && (() => {
          const pNum = proponenteAbiertoDetalle;
          const p = proponentesVista.find((pp: any) => pp.numero === pNum);
          const cj = calificacionesJuridica.find((c: any) => Number(c?.numero) === Number(pNum));
          const chk = cj?.checklist || {};
          const det = habilitanteDetalle[String(pNum)] || detalleHabilitantePorDefecto(p);
          const esEmpresa = p?.tipo_persona === 'empresa';

          return (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-2xl">
                <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                  <h2 className="text-lg font-bold text-gray-800">Requerimientos Habilitantes — Proponente {pNum}: {p?.nombre_proveedor?.toUpperCase()}</h2>
                  <button onClick={() => setProponenteAbiertoDetalle(null)} className="text-gray-500 hover:text-black">Cerrar</button>
                </div>
                <div className="p-6 space-y-8">

                  {/* I. Verificación legal — solo lectura, la diligencia Jurídica */}
                  <div>
                    <p className="font-bold text-gray-500 mb-2 text-xs uppercase">I. Verificación legal (Jurídica — solo lectura)</p>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={thCell}>Requisito</th>
                          <th style={{ ...thCell, width: 100 }}>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requisitosLegalesPara(p).map(r => (
                          <tr key={r.key}>
                            <td style={{ ...tdCell, textAlign: 'left' }}>{r.label}</td>
                            <td style={{ ...tdCell, fontWeight: 'bold', background: (chk[r.key] || 'SI') === 'NO' ? '#FEE2E2' : 'transparent' }}>{chk[r.key] || 'SI'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* II. Experiencia — la diligencia el Supervisor */}
                  <div>
                    <div style={{ background: '#2f6fa3', color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: 13, borderRadius: '4px 4px 0 0' }}>
                      II. Requerimientos habilitantes de experiencia
                    </div>
                    <div className="border border-t-0 rounded-b p-3" style={{ borderColor: '#2f6fa3' }}>
                      <input
                        placeholder="Describa el requisito de experiencia exigido al proponente..."
                        className="w-full text-sm p-2 border rounded mb-3 outline-none focus:border-blue-500"
                        value={det.experiencia.requisito}
                        onChange={e => updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, requisito: e.target.value } }))}
                      />
                      <TablaFilasEditable
                        campos={CAMPOS_EXPERIENCIA}
                        filas={det.experiencia.certificaciones}
                        onChangeCampo={(i, campo, valor) => updateHabilitante(pNum, old => {
                          const lista = [...old.experiencia.certificaciones];
                          lista[i] = { ...lista[i], [campo]: valor };
                          return { ...old, experiencia: { ...old.experiencia, certificaciones: lista } };
                        })}
                        onRemove={i => updateHabilitante(pNum, old => ({
                          ...old,
                          experiencia: { ...old.experiencia, certificaciones: old.experiencia.certificaciones.filter((_, idx) => idx !== i) }
                        }))}
                      />
                      <button
                        type="button"
                        onClick={() => updateHabilitante(pNum, old => ({ ...old, experiencia: { ...old.experiencia, certificaciones: [...old.experiencia.certificaciones, nuevaCertificacion()] } }))}
                        className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-700"
                      >
                        <Plus size={13} /> Agregar certificación
                      </button>
                    </div>
                  </div>

                  {/* III. Requisitos académicos — la diligencia el Supervisor */}
                  <div>
                    <div style={{ background: '#2f6fa3', color: '#fff', padding: '8px 14px', fontWeight: 'bold', fontSize: 13, borderRadius: '4px 4px 0 0' }}>
                      III. Requerimientos habilitantes académicos
                    </div>
                    <div className="border border-t-0 rounded-b p-3" style={{ borderColor: '#2f6fa3' }}>
                      {esEmpresa ? (
                        <div className="space-y-6">
                          <div>
                            <p className="font-bold text-gray-600 text-xs uppercase mb-1">Director del proyecto</p>
                            <input
                              placeholder="Describa el requisito académico exigido al director del proyecto..."
                              className="w-full text-sm p-2 border rounded mb-2 outline-none focus:border-blue-500"
                              value={det.academico.equipo?.director.requisito || ''}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, director: { ...old.academico.equipo!.director, requisito: e.target.value } } } }))}
                            />
                            <TablaFilasEditable
                              campos={CAMPOS_MIEMBRO}
                              filas={det.academico.equipo?.director.miembros || []}
                              onChangeCampo={(i, campo, valor) => updateHabilitante(pNum, old => {
                                const miembros = [...(old.academico.equipo!.director.miembros)];
                                miembros[i] = { ...miembros[i], [campo]: valor };
                                return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, director: { ...old.academico.equipo!.director, miembros } } } };
                              })}
                              onRemove={i => updateHabilitante(pNum, old => ({
                                ...old,
                                academico: { ...old.academico, equipo: { ...old.academico.equipo!, director: { ...old.academico.equipo!.director, miembros: old.academico.equipo!.director.miembros.filter((_, idx) => idx !== i) } } }
                              }))}
                            />
                            <button
                              type="button"
                              onClick={() => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, director: { ...old.academico.equipo!.director, miembros: [...old.academico.equipo!.director.miembros, nuevoMiembro()] } } } }))}
                              className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-700"
                            >
                              <Plus size={13} /> Agregar miembro
                            </button>
                          </div>

                          {(det.academico.equipo?.otros || []).map((perfil, pi) => (
                            <div key={perfil.id}>
                              <div className="flex items-center gap-2 mb-1">
                                <input
                                  placeholder="Nombre del perfil (ej. Ingeniero residente)..."
                                  className="font-bold text-gray-600 text-xs uppercase border-b border-dashed outline-none flex-1"
                                  value={perfil.titulo_perfil}
                                  onChange={e => updateHabilitante(pNum, old => {
                                    const otros = [...(old.academico.equipo!.otros)];
                                    otros[pi] = { ...otros[pi], titulo_perfil: e.target.value };
                                    return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros } } };
                                  })}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros: old.academico.equipo!.otros.filter((_, idx) => idx !== pi) } } }))}
                                  className="text-red-500"
                                ><X size={13} /></button>
                              </div>
                              <input
                                placeholder="Requisito académico exigido a este perfil..."
                                className="w-full text-sm p-2 border rounded mb-2 outline-none focus:border-blue-500"
                                value={perfil.requisito}
                                onChange={e => updateHabilitante(pNum, old => {
                                  const otros = [...(old.academico.equipo!.otros)];
                                  otros[pi] = { ...otros[pi], requisito: e.target.value };
                                  return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros } } };
                                })}
                              />
                              <TablaFilasEditable
                                campos={CAMPOS_MIEMBRO}
                                filas={perfil.miembros}
                                onChangeCampo={(i, campo, valor) => updateHabilitante(pNum, old => {
                                  const otros = [...(old.academico.equipo!.otros)];
                                  const miembros = [...otros[pi].miembros];
                                  miembros[i] = { ...miembros[i], [campo]: valor };
                                  otros[pi] = { ...otros[pi], miembros };
                                  return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros } } };
                                })}
                                onRemove={i => updateHabilitante(pNum, old => {
                                  const otros = [...(old.academico.equipo!.otros)];
                                  otros[pi] = { ...otros[pi], miembros: otros[pi].miembros.filter((_, idx) => idx !== i) };
                                  return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros } } };
                                })}
                              />
                              <button
                                type="button"
                                onClick={() => updateHabilitante(pNum, old => {
                                  const otros = [...(old.academico.equipo!.otros)];
                                  otros[pi] = { ...otros[pi], miembros: [...otros[pi].miembros, nuevoMiembro()] };
                                  return { ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros } } };
                                })}
                                className="mt-2 flex items-center gap-1 text-xs font-bold text-blue-700"
                              >
                                <Plus size={13} /> Agregar miembro a este perfil
                              </button>
                            </div>
                          ))}

                          <button
                            type="button"
                            onClick={() => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, equipo: { ...old.academico.equipo!, otros: [...old.academico.equipo!.otros, { id: `perfil_${Date.now()}`, titulo_perfil: '', requisito: '', miembros: [] }] } } }))}
                            className="flex items-center gap-1 text-xs font-bold text-emerald-700"
                          >
                            <Plus size={13} /> Agregar otro perfil profesional
                          </button>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Requisito académico exigido</label>
                            <input
                              className="w-full text-sm p-2 border rounded outline-none focus:border-blue-500"
                              value={det.academico.personaNatural?.requisito || ''}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, personaNatural: { ...old.academico.personaNatural!, requisito: e.target.value } } }))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Título</label>
                            <input
                              className="w-full text-sm p-2 border rounded outline-none focus:border-blue-500"
                              value={det.academico.personaNatural?.titulo || ''}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, personaNatural: { ...old.academico.personaNatural!, titulo: e.target.value } } }))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Posgrado</label>
                            <input
                              className="w-full text-sm p-2 border rounded outline-none focus:border-blue-500"
                              value={det.academico.personaNatural?.posgrado || ''}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, personaNatural: { ...old.academico.personaNatural!, posgrado: e.target.value } } }))}
                            />
                          </div>
                          <div className="col-span-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase">Observaciones</label>
                            <input
                              className="w-full text-sm p-2 border rounded outline-none focus:border-blue-500"
                              value={det.academico.personaNatural?.observaciones || ''}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, personaNatural: { ...old.academico.personaNatural!, observaciones: e.target.value } } }))}
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-bold text-gray-500 uppercase block">¿Cumple?</label>
                            <select
                              className="w-full text-sm p-2 border rounded font-bold outline-none"
                              value={det.academico.personaNatural?.cumple || 'SI'}
                              onChange={e => updateHabilitante(pNum, old => ({ ...old, academico: { ...old.academico, personaNatural: { ...old.academico.personaNatural!, cumple: e.target.value } } }))}
                            >
                              <option>SI</option><option>NO</option><option>N/A</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t flex justify-end sticky bottom-0 bg-white">
                  <button onClick={() => setProponenteAbiertoDetalle(null)} className="bg-blue-700 text-white px-6 py-2 rounded font-bold">Cerrar y guardar en el borrador</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
