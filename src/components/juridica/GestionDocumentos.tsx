import React, { useEffect, useState } from 'react';
import { FolderOpen, Upload, FileText, Trash2, Loader2, ArrowLeft, CheckCircle2, User, Save, ExternalLink, Hash, Lock, AlertCircle } from 'lucide-react';
import { TipoDocumentoFinal } from '../../lib/flujoJuridico';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const TIPOS_FINALES: { tipo: TipoDocumentoFinal; label: string; hint: string }[] = [
  {
    tipo: 'contrato_orden_compra',
    label: 'Contrato u orden de compra',
    hint: 'Documento contractual o orden de compra firmada.',
  },
  {
    tipo: 'acta_supervision',
    label: 'Acta de supervisión',
    hint: 'Acta de designación o inicio de supervisión del contrato.',
  },
];

interface GestionDocumentosProps {
  solicitudId?: string | null;
  onBack?: () => void;
}

export function GestionDocumentos({ solicitudId, onBack }: GestionDocumentosProps) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string>(solicitudId || '');
  const [detalle, setDetalle] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState<TipoDocumentoFinal | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Supervisor
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [supervisionId, setSupervisionId] = useState<string>('');
  const [savingSuper, setSavingSuper] = useState(false);
  const [superOk, setSuperOk] = useState(false);

  // Cambio de código
  const [codigoAnio, setCodigoAnio] = useState('');
  const [codigoConsec, setCodigoConsec] = useState('');
  const [savingCodigo, setSavingCodigo] = useState(false);
  const [codigoMsg, setCodigoMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const loadSolicitudes = async () => {
      const res = await fetch(`${API_URL}/api/juridica/solicitudes`);
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setSolicitudes(arr);
      if (!selectedId && arr.length > 0) setSelectedId(arr[0].id);
    };
    loadSolicitudes().catch(console.error);

    fetch(`${API_URL}/api/usuarios`)
      .then(r => r.json())
      .then(d => setUsuarios(Array.isArray(d) ? d : []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!solicitudId) return;
    setSelectedId(solicitudId);
  }, [solicitudId]);

  const loadDocs = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/juridica/solicitudes/${id}/documentos`);
      const data = await res.json();
      setDetalle(data);
      setSupervisionId(data?.solicitud?.supervision_id || '');
      setSuperOk(false);
      setCodigoMsg(null);
      // Pre-llenar los campos con los valores actuales del código
      const partes = (data?.solicitud?.codigo || '').split('-');
      if (partes.length >= 3) {
        setCodigoAnio(partes[1] || '');
        setCodigoConsec(partes[2] || '');
      }
    } catch (e) {
      console.error('Error cargando documentos:', e);
      setError('No se pudieron cargar los documentos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedId) return;
    loadDocs(selectedId);
  }, [selectedId]);

  const onFileForTipo = async (tipo: TipoDocumentoFinal, files: FileList | null) => {
    if (!files?.length || !selectedId) return;
    setAdding(tipo);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        const formData = new FormData();
        formData.append('archivo', f);
        formData.append('tipo', tipo);
        formData.append('descripcion', TIPOS_FINALES.find((t) => t.tipo === tipo)?.label || '');

        const resp = await fetch(
          `${API_URL}/api/juridica/solicitudes/${selectedId}/documentos/upload`,
          { method: 'POST', body: formData }
        );
        if (!resp.ok) {
          const err = await resp.json().catch(() => ({}));
          throw new Error(err?.error || 'Error al cargar el documento');
        }
      }
      await loadDocs(selectedId);
    } catch (e: any) {
      setError(e.message || 'No se pudieron cargar los documentos.');
    } finally {
      setAdding(null);
    }
  };

  const removeDoc = async (docId: string) => {
    if (!selectedId) return;
    await fetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/documentos/${docId}`, { method: 'DELETE' });
    await loadDocs(selectedId);
  };

  const guardarSupervisor = async () => {
    if (!selectedId || !supervisionId) return;
    setSavingSuper(true);
    setError(null);
    try {
      const resp = await fetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/supervisor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ supervision_id: supervisionId }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err?.error || 'Error al actualizar supervisor');
      }
      setSuperOk(true);
      await loadDocs(selectedId);
    } catch (e: any) {
      setError(e.message || 'Error al guardar supervisor');
    } finally {
      setSavingSuper(false);
    }
  };

  const guardarCodigo = async () => {
    if (!selectedId || !codigoAnio || !codigoConsec) return;
    setSavingCodigo(true);
    setCodigoMsg(null);
    try {
      const resp = await fetch(`${API_URL}/api/juridica/solicitudes/${selectedId}/codigo`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anio: codigoAnio, consecutivo: codigoConsec }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Error al cambiar el código');
      setCodigoMsg({ ok: true, text: `Código actualizado a ${data.codigo}` });
      await loadDocs(selectedId);
    } catch (e: any) {
      setCodigoMsg({ ok: false, text: e.message || 'Error al cambiar el código' });
    } finally {
      setSavingCodigo(false);
    }
  };

  const docs = Array.isArray(detalle?.documentos) ? detalle.documentos : [];
  const docPorTipo = (tipo: TipoDocumentoFinal) => docs.filter((d: any) => d.tipo === tipo);

  const supervisorActual = detalle?.solicitud?.supervisor_nombre;
  const codigoOriginal = detalle?.solicitud?.codigo_original;
  const codigoActual = detalle?.solicitud?.codigo || '';

  return (
    <div className="ux-page p-4 lg:p-8">
      <div className="max-w-[900px] mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            {onBack && (
              <button onClick={onBack} className="flex items-center gap-2 text-gray-600 mb-3">
                <ArrowLeft size={18} /> Volver
              </button>
            )}
            <div className="flex items-center gap-3 mb-2">
              <FolderOpen style={{ color: 'var(--brand-secondary)' }} size={28} />
              <h1 className="text-3xl font-semibold text-gray-900">Documentos finales</h1>
            </div>
            <p className="text-gray-600">
              Paso 5 del flujo jurídico: cargue el contrato u orden de compra y el acta de supervisión.
            </p>
          </div>
          {!solicitudId && (
            <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)} className="px-3 py-2 min-w-[280px]">
              <option value="">Seleccione solicitud...</option>
              {solicitudes.map((s) => (
                <option key={s.id} value={s.id}>{s.codigo} - {s.objeto}</option>
              ))}
            </select>
          )}
        </div>

        {error && (
          <div className="ux-card p-4 border border-red-200 bg-red-50 text-red-700 text-sm font-medium">{error}</div>
        )}

        {loading ? (
          <div className="ux-card p-16 text-center"><Loader2 className="animate-spin mx-auto text-[var(--brand-secondary)]" /></div>
        ) : !selectedId ? (
          <div className="ux-card p-10 text-center text-slate-500">Seleccione una solicitud para gestionar documentos.</div>
        ) : (
          <>
            {/* Info solicitud */}
            <div className="ux-card p-6">
              <p className="font-bold text-slate-800">{detalle?.solicitud?.codigo}</p>
              <p className="text-slate-700">{detalle?.solicitud?.objeto}</p>
            </div>

            {/* Cambio de código */}
            <div className="ux-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <Hash size={18} className="text-[var(--brand-secondary)]" />
                <h2 className="text-lg font-bold text-slate-800">Código de la solicitud</h2>
                {codigoOriginal && (
                  <span className="ml-auto flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    <Lock size={11} /> Solo se permite un cambio
                  </span>
                )}
              </div>

              {codigoOriginal ? (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-sm">
                  <Lock size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-slate-500 text-xs">Código original</p>
                    <p className="font-mono font-bold text-slate-500 line-through">
                      {codigoOriginal.split('-').slice(1).join('-') || codigoOriginal}
                    </p>
                  </div>
                  <span className="text-slate-300 font-bold">→</span>
                  <div>
                    <p className="text-slate-500 text-xs">Código actual</p>
                    <p className="font-mono font-bold text-slate-800">{codigoActual}</p>
                  </div>
                  <p className="ml-auto text-xs text-slate-400 italic">No se puede modificar de nuevo</p>
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-500 -mt-2">
                    Puede cambiar el año y consecutivo una sola vez. El nuevo código tendrá el formato <span className="font-mono font-bold">año-consecutivo</span>.
                  </p>
                  <div className="flex gap-3 flex-wrap items-end">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Año</label>
                      <input
                        type="text"
                        maxLength={4}
                        placeholder="2026"
                        value={codigoAnio}
                        onChange={e => { setCodigoAnio(e.target.value.replace(/\D/g, '').slice(0, 4)); setCodigoMsg(null); }}
                        className="w-24 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Consecutivo</label>
                      <input
                        type="text"
                        maxLength={6}
                        placeholder="0071"
                        value={codigoConsec}
                        onChange={e => { setCodigoConsec(e.target.value.replace(/\D/g, '').slice(0, 6)); setCodigoMsg(null); }}
                        className="w-28 border border-slate-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="pb-0.5">
                      <p className="text-xs text-slate-400 mb-1">Vista previa</p>
                      <p className="font-mono font-bold text-slate-700 text-sm bg-slate-100 px-3 py-2 rounded-lg border border-slate-200">
                        {codigoAnio || '????'}-{codigoConsec ? String(codigoConsec).padStart(4, '0') : '????'}
                      </p>
                    </div>
                    <button
                      onClick={guardarCodigo}
                      disabled={savingCodigo || !codigoAnio || codigoAnio.length !== 4 || !codigoConsec}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                      style={{ backgroundColor: '#E84922' }}
                    >
                      {savingCodigo ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      Guardar código
                    </button>
                  </div>
                  {codigoMsg && (
                    <div className={`flex items-center gap-2 p-3 rounded-lg text-sm font-medium border ${codigoMsg.ok ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                      {codigoMsg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                      {codigoMsg.text}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Supervisor del contrato */}
            <div className="ux-card p-6 space-y-4">
              <div className="flex items-center gap-2">
                <User size={18} className="text-[var(--brand-secondary)]" />
                <h2 className="text-lg font-bold text-slate-800">Supervisor del contrato</h2>
              </div>

              {supervisorActual && (
                <p className="text-sm text-slate-600">
                  Actual: <span className="font-semibold text-slate-800">{supervisorActual}</span>
                  {detalle?.solicitud?.supervisor_cargo ? ` — ${detalle.solicitud.supervisor_cargo}` : ''}
                </p>
              )}

              <div className="flex gap-3 flex-wrap items-end">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Asignar / cambiar supervisor
                  </label>
                  <select
                    value={supervisionId}
                    onChange={e => { setSupervisionId(e.target.value); setSuperOk(false); }}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">— Seleccione un usuario —</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}{u.cargo ? ` · ${u.cargo}` : ''}{u.gerencia_nombre ? ` (${nombreGerenciaCompleto(u.gerencia_nombre)})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={guardarSupervisor}
                  disabled={savingSuper || !supervisionId}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-bold text-sm disabled:opacity-50"
                  style={{ backgroundColor: '#2f6fa3' }}
                >
                  {savingSuper ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                  Guardar supervisor
                </button>
                {superOk && (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm font-bold">
                    <CheckCircle2 size={16} /> Guardado
                  </span>
                )}
              </div>
            </div>

            {/* Documentos por tipo */}
            <div className="space-y-4">
              {TIPOS_FINALES.map(({ tipo, label, hint }) => {
                const cargados = docPorTipo(tipo);
                const completo = cargados.length > 0;
                return (
                  <div key={tipo} className={`ux-card p-6 border-2 ${completo ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`}>
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {completo && <CheckCircle2 size={18} className="text-emerald-500" />}
                          <h3 className="text-lg font-bold text-slate-900">{label}</h3>
                        </div>
                        <p className="text-sm text-slate-500">{hint}</p>
                      </div>
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white cursor-pointer text-sm font-bold" style={{ backgroundColor: '#6366F1' }}>
                        <Upload size={16} />
                        {adding === tipo ? 'Cargando...' : completo ? 'Reemplazar / agregar' : 'Cargar archivo'}
                        <input
                          type="file"
                          className="hidden"
                          disabled={adding !== null}
                          onChange={(e) => onFileForTipo(tipo, e.target.files)}
                        />
                      </label>
                    </div>

                    {cargados.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {cargados.map((doc: any) => (
                          <div key={doc.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
                            <div className="flex items-center gap-3 min-w-0">
                              <FileText size={18} className="text-[var(--brand-secondary)] shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium text-slate-900 truncate">{doc.nombre}</p>
                                <p className="text-xs text-slate-500">
                                  {doc.tamano_bytes ? `${Math.round(Number(doc.tamano_bytes) / 1024)} KB` : 'Sin tamaño'}
                                  {doc.creado_en ? ` · ${new Date(doc.creado_en).toLocaleDateString('es-CO')}` : ''}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              {doc.url_storage && (
                                <a
                                  href={`${API_URL}${doc.url_storage}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                                  title="Ver / descargar"
                                >
                                  <ExternalLink size={15} />
                                </a>
                              )}
                              <button onClick={() => removeDoc(doc.id)} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
