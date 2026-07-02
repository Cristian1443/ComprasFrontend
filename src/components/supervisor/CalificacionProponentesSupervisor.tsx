import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Loader2, Save, CheckCircle2, Lock, ShieldAlert, ClipboardCheck, ArrowRight } from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

type ScoreSupervisor = {
  propuesta_economica: number;
  experiencia_adicional: number;
  experiencia_trabajo: number;
  otros_criterios_puntos: number;
};

interface CalificacionProponentesSupervisorProps {
  solicitudId: string | null;
  userEmail?: string;
  onBack: () => void;
}

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
  const [configPuntajes, setConfigPuntajes] = useState<Record<string, { enabled: boolean; max: number; label: string }>>({
    propuesta_economica: { enabled: true, max: 100, label: 'Propuesta Económica' },
    experiencia_adicional: { enabled: false, max: 0, label: 'Experiencia Adicional / Visional' },
    experiencia_trabajo: { enabled: false, max: 0, label: 'Experiencia de Trabajo Adicional' },
    otros_criterios_puntos: { enabled: false, max: 0, label: 'Otros Criterios' }
  });
  const [evaluacionConsolidada, setEvaluacionConsolidada] = useState('');
  const [habilitantesRevisados, setHabilitantesRevisados] = useState<Set<number>>(new Set());
  const [finalizada, setFinalizada] = useState(false);
  const [proponenteAbiertoDetalle, setProponenteAbiertoDetalle] = useState<number | null>(null);

  useEffect(() => {
    setSelectedId(solicitudId);
  }, [solicitudId]);

  useEffect(() => {
    if (selectedId || !userEmail) return;
    let mounted = true;
    setLoadingPendientes(true);
    fetch(`${API_URL}/api/supervisor/solicitudes-en-calificacion?email=${encodeURIComponent(userEmail)}`)
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
        const res = await fetch(`${API_URL}/api/supervisor/solicitudes/${selectedId}/calificacion?email=${encodeURIComponent(userEmail)}`);
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
        list.forEach((p: any) => {
          const existing = (Array.isArray(ev.calificaciones) ? ev.calificaciones : []).find((c: any) => Number(c?.numero) === Number(p.numero));
          initial[String(p.numero)] = {
            propuesta_economica: Number(existing?.propuesta_economica || 0),
            experiencia_adicional: Number(existing?.experiencia_adicional || 0),
            experiencia_trabajo: Number(existing?.experiencia_trabajo || 0),
            otros_criterios_puntos: Number(existing?.otros_criterios_puntos || 0)
          };
        });
        setCalificaciones(initial);
        if (ev.config_puntajes) setConfigPuntajes(ev.config_puntajes);
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

  const total = (numero: number) => {
    const s = calificaciones[String(numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0 };
    let sum = 0;
    Object.entries(configPuntajes).forEach(([key, config]) => {
      if (config.enabled) sum += ((s as any)[key] || 0) * config.max / 100;
    });
    return Number(sum.toFixed(2));
  };

  const proponentesQueRespondieron = proponentesVista.filter((p: any) => p.respondida);
  const ganadorNumero: number | null = proponentesQueRespondieron.length > 0
    ? proponentesQueRespondieron.reduce((best: any, p: any) => total(p.numero) > total(best.numero) ? p : best, proponentesQueRespondieron[0]).numero
    : null;

  const proponentesPendientesRevision = proponentesQueRespondieron.filter((p: any) => !habilitantesRevisados.has(Number(p.numero)));

  const guardar = async (finalizar = false) => {
    if (!selectedId || !userEmail || finalizada) return;
    const totalPuntaje = Object.values(configPuntajes).reduce((acc, c) => acc + (c.enabled ? c.max : 0), 0);

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
          ...(calificaciones[String(p.numero)] || { propuesta_economica: 0, experiencia_adicional: 0, experiencia_trabajo: 0, otros_criterios_puntos: 0 }),
          total: total(p.numero)
        })),
        evaluacion_consolidada: evaluacionConsolidada,
        proponente_recomendado_numero: ganadorNumero,
        habilitantes_revisados: Array.from(habilitantesRevisados),
        finalizada: finalizar
      };
      const res = await fetch(`${API_URL}/api/supervisor/solicitudes/${selectedId}/calificacion`, {
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
                      <p style={{ fontWeight: 400, fontSize: 9, color: '#6B7280', marginTop: 2 }}>Debe revisar el detalle de cada proponente para poder finalizar</p>
                    </td>
                    {proponentesVista.map((p: any) => {
                      const cj = calificacionesJuridica.find((c: any) => Number(c?.numero) === Number(p.numero));
                      const chk = cj?.checklist || {};
                      const cumple = requisitosLegales.every(r => (chk[r.key] || 'SI') !== 'NO') ? 'SI' : 'NO';
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
                          {cumple} <span className="text-[10px] block font-normal underline">Ver Detalle</span>
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
                          <span className="font-bold text-blue-700 text-sm">II. CALIFICACIÓN DEL SUPERVISOR</span>
                          <p className="text-[10px] text-blue-500">Habilite los criterios y asigne el peso (la suma debe ser 100)</p>
                        </div>
                        <div className={`px-3 py-1 rounded text-white font-bold text-xs ${Object.values(configPuntajes).reduce((a, b) => a + (b.enabled ? b.max : 0), 0) === 100 ? 'bg-green-600' : 'bg-red-600'}`}>
                          TOTAL PESO: {Object.values(configPuntajes).reduce((a, b) => a + (b.enabled ? b.max : 0), 0)} / 100
                        </div>
                      </div>
                    </td>
                  </tr>

                  {Object.entries(configPuntajes).map(([key, config]) => (
                    <tr key={key}>
                      <td style={{ ...tdCell, textAlign: 'left', paddingLeft: 16, background: config.enabled ? '#fff' : '#f9fafb' }}>
                        <div className="flex items-center gap-3">
                          <input type="checkbox" checked={config.enabled} onChange={e => setConfigPuntajes(prev => ({ ...prev, [key]: { ...prev[key], enabled: e.target.checked } }))} />
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

        {/* MODAL DETALLE HABILITANTES — SOLO LECTURA */}
        {proponenteAbiertoDetalle && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-gray-800">Verificación Habilitante — Proponente {proponenteAbiertoDetalle}</h2>
                <button onClick={() => setProponenteAbiertoDetalle(null)} className="text-gray-500 hover:text-black">Cerrar</button>
              </div>
              <div className="p-6 space-y-6">
                {(() => {
                  const cj = calificacionesJuridica.find((c: any) => Number(c?.numero) === Number(proponenteAbiertoDetalle));
                  const chk = cj?.checklist || {};
                  const det = cj?.habilitante_detalle;
                  return (
                    <>
                      <div>
                        <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Verificación legal (Jurídica)</p>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc' }}>
                              <th style={thCell}>Requisito</th>
                              <th style={{ ...thCell, width: 100 }}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {requisitosLegales.map(r => (
                              <tr key={r.key}>
                                <td style={{ ...tdCell, textAlign: 'left' }}>{r.label}</td>
                                <td style={{ ...tdCell, fontWeight: 'bold', background: (chk[r.key] || 'SI') === 'NO' ? '#FEE2E2' : 'transparent' }}>{chk[r.key] || 'SI'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {det?.experiencia?.certificaciones?.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Experiencia del proponente</p>
                          {det.experiencia.requisito && <p className="text-xs text-gray-500 italic mb-2">{det.experiencia.requisito}</p>}
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Contratante', 'Objeto', 'Valor', 'Plazo', 'Cumple'].map(h => <th key={h} style={{ ...thCell, fontSize: 10 }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {det.experiencia.certificaciones.map((c: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ ...tdCell, fontSize: 10, textAlign: 'left' }}>{c.contratante || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10, textAlign: 'left' }}>{c.objeto || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10 }}>{c.valor || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10 }}>{c.plazo_total || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10, fontWeight: 'bold' }}>{c.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {det?.equipo?.director?.miembros?.length > 0 && (
                        <div>
                          <p className="font-bold text-gray-500 mb-2 text-xs uppercase">Director del proyecto</p>
                          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                              <tr style={{ background: '#f8fafc' }}>
                                {['Nombre', 'Título', 'Posgrado', 'Cumple'].map(h => <th key={h} style={{ ...thCell, fontSize: 10 }}>{h}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {det.equipo.director.miembros.map((m: any, i: number) => (
                                <tr key={i}>
                                  <td style={{ ...tdCell, fontSize: 10, textAlign: 'left' }}>{m.nombre || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10 }}>{m.titulo || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10 }}>{m.posgrado || '—'}</td>
                                  <td style={{ ...tdCell, fontSize: 10, fontWeight: 'bold' }}>{m.cumple || 'SI'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}

                      {!det && (
                        <p className="text-sm text-gray-400 italic">Jurídica aún no ha registrado el detalle habilitante de este proponente.</p>
                      )}
                    </>
                  );
                })()}
              </div>
              <div className="p-4 border-t flex justify-end sticky bottom-0 bg-white">
                <button onClick={() => setProponenteAbiertoDetalle(null)} className="bg-gray-100 px-6 py-2 rounded font-bold">Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
