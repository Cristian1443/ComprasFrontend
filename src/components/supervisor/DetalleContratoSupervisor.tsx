import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowLeft, ClipboardList, ExternalLink, FileText, CheckCircle2,
  Loader2, FolderOpen, RefreshCw, AlertCircle,
  ChevronDown, ChevronRight, Circle
} from 'lucide-react';
import { EvaluacionProveedor } from './EvaluacionProveedor';
import { FacturasContrato } from './FacturasContrato';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getGraphClient } from '../../lib/graphService';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

const SITE_SEARCH   = 'Documental';
const DRIVE_NAME    = 'Expedientes';
const PARENT_FOLDER = 'Pruebas tecnicas';

const SUBFOLDERS = [
  { key: 'precontractual',  label: '01.Precontractual',  carpeta: '01.Precontractual',  color: 'blue'   },
  { key: 'contractual',     label: '02.Contractual',     carpeta: '02.Contractual',     color: 'green'  },
  { key: 'postcontractual', label: '03.Postcontractual', carpeta: '03.Postcontractual', color: 'purple' },
] as const;

type SubfolderKey = typeof SUBFOLDERS[number]['key'];

interface SpFile    { id: string; name: string; webUrl: string; }
interface SpFolders { precontractual: SpFile[]; contractual: SpFile[]; postcontractual: SpFile[]; }

interface Proveedor {
  id: string; nombre_proveedor: string;
  datos_contacto: string | null; valor_con_impuestos: number | null; moneda: string;
}
interface ContratoDetalle {
  id: string; codigo: string; objeto: string; estado: string;
  valor_en_cop: number | null; valor_estimado: number | null;
  plazo_ejecucion_meses: number | null; plazo_ejecucion_dias: number | null;
  modalidad: string; solicitante_nombre: string; creado_en: string | null;
  proveedor: Proveedor | null; evaluacion: { total: number } | null;
}

interface DetalleContratoSupervisorProps {
  solicitudId: string; userEmail?: string; onBack: () => void;
}

const COLOR = {
  blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   dot: 'bg-blue-500'   },
  green:  { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  dot: 'bg-green-500'  },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500' },
} as const;

function Chip({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</span>
      <span className={`text-sm ${bold ? 'font-black text-gray-900' : 'font-semibold text-gray-700'}`}>{value}</span>
    </div>
  );
}

export function DetalleContratoSupervisor({ solicitudId, userEmail, onBack }: DetalleContratoSupervisorProps) {
  const { instance, accounts } = useMsal();

  const [contrato, setContrato]           = useState<ContratoDetalle | null>(null);
  const [loading, setLoading]             = useState(true);
  const [verEvaluacion, setVerEvaluacion] = useState(false);
  const [totalFacturado, setTotalFacturado] = useState<number>(0);
  const [nFacturas, setNFacturas]           = useState<number>(0);

  // Entregables con checkbox
  const [entregables, setEntregables]   = useState<any[]>([]);
  // Informes de supervisión con checkbox
  const [informes, setInformes]         = useState<any[]>([]);

  const [expandedEntregables, setExpandedEntregables] = useState(true);
  const [expandedInformes, setExpandedInformes]       = useState(true);

  // SharePoint
  const [spLoading, setSpLoading]       = useState(false);
  const [spError, setSpError]           = useState<string | null>(null);
  const [spFolders, setSpFolders]       = useState<SpFolders | null>(null);
  const [openingFolder, setOpeningFolder] = useState(false);
  const [expanded, setExpanded]         = useState<Record<SubfolderKey, boolean>>({
    precontractual: true, contractual: true, postcontractual: true,
  });

  // ── Carga del contrato ─────────────────────────────────────────────────
  useEffect(() => {
    if (!userEmail || !solicitudId) return;
    fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}?email=${encodeURIComponent(userEmail)}`)
      .then(r => { if (!r.ok) throw new Error('API error'); return r.json(); })
      .then(setContrato).catch(() => setContrato(null)).finally(() => setLoading(false));
  }, [userEmail, solicitudId]);

  // ── Carga de facturas aprobadas para ejecucion financiera ──────────────
  useEffect(() => {
    if (!solicitudId) return;
    fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/facturas`)
      .then(r => r.ok ? r.json() : { facturas: [] })
      .then(data => {
        const aprobadas = (data.facturas || []).filter((f: any) => f.estado === 'aprobada');
        const total = aprobadas.reduce((acc: number, f: any) => acc + Number(f.valor || 0), 0);
        setTotalFacturado(total);
        setNFacturas(aprobadas.length);
      })
      .catch(() => {});
  }, [solicitudId]);

  // ── Carga entregables e informes ───────────────────────────────────────
  useEffect(() => {
    fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/entregables-lista`)
      .then(r => r.json()).then(d => setEntregables(Array.isArray(d) ? d : [])).catch(() => {});
    fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/informes-lista`)
      .then(r => r.json()).then(d => setInformes(Array.isArray(d) ? d : [])).catch(() => {});
  }, [solicitudId]);

  const toggleEntregable = async (item: any) => {
    if (item.completado) return;
    const ahora = new Date().toISOString();
    setEntregables(prev => prev.map(e => e.id === item.id ? { ...e, completado: true, fecha_completado: ahora } : e));
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/entregables-lista/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const updated = await res.json();
        setEntregables(prev => prev.map(e => e.id === item.id ? { ...e, ...updated } : e));
      }
    } catch {
      setEntregables(prev => prev.map(e => e.id === item.id ? { ...e, completado: false, fecha_completado: null } : e));
    }
  };

  const toggleInforme = async (item: any) => {
    if (item.completado) return;
    const ahora = new Date().toISOString();
    setInformes(prev => prev.map(i => i.id === item.id ? { ...i, completado: true, fecha_completado: ahora } : i));
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/informes-lista/${item.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const updated = await res.json();
        setInformes(prev => prev.map(i => i.id === item.id ? { ...i, ...updated } : i));
      }
    } catch {
      setInformes(prev => prev.map(i => i.id === item.id ? { ...i, completado: false, fecha_completado: null } : i));
    }
  };

  // ── SharePoint: obtener config ─────────────────────────────────────────
  const getSpConfig = useCallback(async () => {
    const account = accounts[0];
    if (!account) throw new Error('No hay sesión activa');
    const tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account });
    const client = await getGraphClient(tokenRes.accessToken);

    const sitesRes = await client.api(`/sites?search=${encodeURIComponent(SITE_SEARCH)}`).get();
    const site = sitesRes?.value?.[0];
    if (!site) throw new Error(`Sitio "${SITE_SEARCH}" no encontrado`);

    const drivesRes = await client.api(`/sites/${site.id}/drives`).get();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const drives: any[] = drivesRes?.value || [];
    const drive = drives.find(d => d.name === DRIVE_NAME) ?? drives[0];
    if (!drive) throw new Error(`Biblioteca "${DRIVE_NAME}" no encontrada`);

    return { client, site, drive };
  }, [instance, accounts]);

  // ── SharePoint: listar archivos por subcarpeta ─────────────────────────
  const cargarDocumentosSP = useCallback(async (codigo: string) => {
    setSpLoading(true);
    setSpError(null);
    try {
      const { client, drive } = await getSpConfig();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listFiles = async (sub: string): Promise<SpFile[]> => {
        try {
          const res = await client.api(
            `/drives/${drive.id}/root:/${PARENT_FOLDER}/${codigo}/${sub}:/children`
          ).get();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          return (res?.value || []).map((f: any) => ({ id: f.id, name: f.name, webUrl: f.webUrl }));
        } catch { return []; }
      };
      const [pre, con, post] = await Promise.all([
        listFiles('01.Precontractual'),
        listFiles('02.Contractual'),
        listFiles('03.Postcontractual'),
      ]);
      setSpFolders({ precontractual: pre, contractual: con, postcontractual: post });
    } catch (err: unknown) {
      setSpError(err instanceof Error ? err.message : 'Error al cargar documentos de SharePoint');
    } finally { setSpLoading(false); }
  }, [getSpConfig]);

  useEffect(() => {
    if (contrato?.codigo) cargarDocumentosSP(contrato.codigo);
  }, [contrato?.codigo, cargarDocumentosSP]);

  // ── SharePoint: abrir carpeta ──────────────────────────────────────────
  const abrirCarpetaSharePoint = async () => {
    if (!contrato) return;
    setOpeningFolder(true); setSpError(null);
    try {
      const { client, site, drive } = await getSpConfig();
      const folderName = contrato.codigo || contrato.id;
      let item;
      try {
        item = await client.api(`/drives/${drive.id}/root:/${PARENT_FOLDER}/${folderName}`).get();
      } catch {
        item = await client.api(`/drives/${drive.id}/root:/${PARENT_FOLDER}:/children`).post({
          name: folderName, folder: {}, '@microsoft.graph.conflictBehavior': 'fail',
        });
        for (const sf of SUBFOLDERS) {
          try {
            await client.api(`/drives/${drive.id}/root:/${PARENT_FOLDER}/${folderName}:/children`).post({
              name: sf.carpeta, folder: {}, '@microsoft.graph.conflictBehavior': 'fail',
            });
          } catch { /* ya existe */ }
        }
      }
      window.open(item?.webUrl ?? site.webUrl, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      setSpError(err instanceof Error ? err.message : 'Error al abrir SharePoint');
    } finally { setOpeningFolder(false); }
  };

  const handleEvaluacionGuardada = () => {
    setVerEvaluacion(false);
    if (userEmail && solicitudId)
      fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}?email=${encodeURIComponent(userEmail)}`)
        .then(r => r.json()).then(setContrato);
  };

  const formatCurrency = (val: number | null | undefined) => {
    if (val == null) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val));
  };
  const formatPlazo = () => {
    if (!contrato) return '-';
    const m = contrato.plazo_ejecucion_meses ?? 0, d = contrato.plazo_ejecucion_dias ?? 0;
    if (m > 0 && d > 0) return `${m} meses, ${d} días`;
    if (m > 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
    if (d > 0) return `${d} días`;
    return '-';
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[300px]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--brand-secondary)' }} />
    </div>
  );
  if (!contrato) return (
    <div className="p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4">
        <ArrowLeft size={20} /> Volver
      </button>
      <p className="text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>Contrato no encontrado.</p>
    </div>
  );

  const valor = contrato.valor_en_cop ?? contrato.valor_estimado ?? contrato.proveedor?.valor_con_impuestos;

  // ── Calculos de ejecucion ──────────────────────────────────────────────
  const calcPctTiempo = (): number | null => {
    if (!contrato.creado_en) return null;
    const meses = contrato.plazo_ejecucion_meses ?? 0;
    const diasE = contrato.plazo_ejecucion_dias  ?? 0;
    if (meses === 0 && diasE === 0) return null;
    const inicio   = new Date(contrato.creado_en);
    const fin      = new Date(inicio);
    fin.setMonth(fin.getMonth() + meses);
    fin.setDate(fin.getDate()   + diasE);
    const total    = Math.round((fin.getTime()  - inicio.getTime()) / 86400000);
    const elapsed  = Math.round((Date.now()     - inicio.getTime()) / 86400000);
    return total > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / total) * 100))) : null;
  };

  const calcPctFinanciero = (): number | null => {
    const base = Number(contrato.valor_en_cop ?? contrato.valor_estimado ?? 0);
    if (base <= 0) return null;
    return Math.min(100, Math.max(0, Math.round((totalFacturado / base) * 100)));
  };

  const pctTiempo     = calcPctTiempo();
  const pctFinanciero = calcPctFinanciero();
  const desfase       = pctTiempo !== null && pctFinanciero !== null ? pctTiempo - pctFinanciero : null;

  const fmtCOP = (v: number) =>
    new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

  const BRAND = '#2f6fa3';


  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 lg:px-8 py-4">

          {/* Breadcrumb + accion */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack}
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft size={16} /> Volver a contratos
            </button>
            <button onClick={abrirCarpetaSharePoint} disabled={openingFolder}
              className="flex items-center gap-2 px-4 py-2 text-white rounded-lg text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50 shadow-sm"
              style={{ backgroundColor: BRAND }}>
              {openingFolder ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Abrir en SharePoint
            </button>
          </div>

          {/* Codigo + modalidad */}
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-black" style={{ color: BRAND }}>{contrato.codigo}</span>
            {contrato.modalidad && (
              <span className="text-[10px] font-bold uppercase tracking-wide bg-gray-100 text-gray-500 px-2 py-0.5 rounded border border-gray-200">
                {contrato.modalidad}
              </span>
            )}
          </div>

          {/* Objeto */}
          <h1 className="text-lg font-black text-gray-900 leading-snug mb-4 max-w-4xl">
            {contrato.objeto}
          </h1>

          {/* Chips de datos del contrato */}
          <div className="flex flex-wrap gap-x-6 gap-y-2 pb-1">
            <Chip label="Proveedor" value={contrato.proveedor?.nombre_proveedor || '-'} />
            <Chip label="Valor" value={formatCurrency(valor)} bold />
            <Chip label="Plazo" value={formatPlazo()} />
            <Chip label="Solicitante" value={contrato.solicitante_nombre || '-'} />
          </div>
        </div>
      </div>

      {spError && (
        <div className="mx-6 lg:mx-8 mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" /> {spError}
        </div>
      )}

      {/* ── ENTREGABLES E INFORMES ── */}
      {(entregables.length > 0 || informes.length > 0) && (
        <div className="px-6 lg:px-8 pt-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">

            {/* Entregables */}
            {entregables.length > 0 && (() => {
              const completadosE = entregables.filter(e => e.completado).length;
              const pctE = Math.round((completadosE / entregables.length) * 100);
              return (
                <div className="bg-white rounded-xl border border-green-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedEntregables(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-green-50 hover:brightness-95 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedEntregables
                        ? <ChevronDown size={14} className="text-green-700" />
                        : <ChevronRight size={14} className="text-green-700" />}
                      <span className="font-bold text-sm text-green-700 uppercase tracking-wide">
                        Entregables del contrato
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
                      {completadosE}/{entregables.length} · {pctE}%
                    </span>
                  </button>
                  {expandedEntregables && (
                    <div>
                      <div className="divide-y divide-gray-50">
                        {entregables.map((e: any) => (
                          <button
                            key={e.id}
                            onClick={() => toggleEntregable(e)}
                            disabled={e.completado}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${e.completado ? 'cursor-not-allowed' : 'hover:bg-gray-50'}`}
                          >
                            {e.completado
                              ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                              : <Circle size={18} className="text-gray-300 shrink-0" />
                            }
                            <span className="flex-1 min-w-0">
                              <span className={`text-sm block ${e.completado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                {e.nombre}
                              </span>
                              {e.completado && e.fecha_completado && (
                                <span className="text-xs text-green-600 font-medium">
                                  {new Date(e.fecha_completado).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="px-4 pb-3 pt-2">
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full bg-green-500 transition-all"
                            style={{ width: `${pctE}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Informes de supervisión */}
            {informes.length > 0 && (() => {
              const completadosI = informes.filter(i => i.completado).length;
              const pctI = Math.round((completadosI / informes.length) * 100);
              return (
                <div className="bg-white rounded-xl border border-blue-200 shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpandedInformes(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-blue-50 hover:brightness-95 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {expandedInformes
                        ? <ChevronDown size={14} className="text-blue-700" />
                        : <ChevronRight size={14} className="text-blue-700" />}
                      <span className="font-bold text-sm text-blue-700 uppercase tracking-wide">
                        Informes de supervisión
                      </span>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      {completadosI}/{informes.length} · {pctI}%
                    </span>
                  </button>
                  {expandedInformes && (
                    <div>
                      <div className="divide-y divide-gray-50">
                        {informes.map((inf: any) => (
                          <button
                            key={inf.id}
                            onClick={() => toggleInforme(inf)}
                            disabled={inf.completado}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${inf.completado ? 'cursor-not-allowed' : 'hover:bg-gray-50'}`}
                          >
                            {inf.completado
                              ? <CheckCircle2 size={18} className="text-green-500 shrink-0" />
                              : <Circle size={18} className="text-gray-300 shrink-0" />
                            }
                            <span className="flex-1 min-w-0">
                              <span className={`text-sm block ${inf.completado ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                Informe de supervisión N° {inf.numero}
                              </span>
                              {inf.completado && inf.fecha_completado && (
                                <span className="text-xs text-green-600 font-medium">
                                  {new Date(inf.fecha_completado).toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                      <div className="px-4 pb-3 pt-2">
                        <div className="bg-gray-100 rounded-full h-1.5">
                          <div
                            className="h-1.5 rounded-full transition-all"
                            style={{ width: `${pctI}%`, backgroundColor: BRAND }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          </div>
        </div>
      )}

      {/* ── CONTENT ── */}
      <div className="px-6 lg:px-8 py-5">
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

          {/* ─ Columna izquierda (2/5) ─ */}
          <div className="xl:col-span-2 space-y-4">

          {/* Evaluación proveedor */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide mb-3">Evaluación del proveedor</h2>
            {contrato.evaluacion ? (
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 size={18} className="text-green-500" />
                <span className="text-sm font-semibold text-gray-800">Puntaje: {contrato.evaluacion.total} / 100</span>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mb-3">No se ha registrado evaluación aún.</p>
            )}
            <button
              onClick={() => setVerEvaluacion(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-lg font-semibold transition-all hover:opacity-90"
              style={{ backgroundColor: '#E84922' }}
            >
              <ClipboardList size={18} />
              {contrato.evaluacion ? 'Ver / Editar evaluación' : 'Evaluar proveedor'}
            </button>
          </div>

          {/* Facturas de pago — componente real */}
          <FacturasContrato
            solicitudId={solicitudId}
            userEmail={userEmail}
            contratoData={{ codigo: contrato.codigo, objeto: contrato.objeto }}
          />
        </div>

        {/* ─ Columna derecha: documentos de SharePoint ─ */}
        <div className="xl:col-span-3 space-y-4">

          {/* Panel de documentos */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderOpen size={16} className="text-gray-500" />
                <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">
                  Lista de documentos
                </h2>
              </div>
              <button
                onClick={() => contrato && cargarDocumentosSP(contrato.codigo)}
                disabled={spLoading}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800 transition-colors"
              >
                <RefreshCw size={13} className={spLoading ? 'animate-spin' : ''} />
                Actualizar SP
              </button>
            </div>

            {spError && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle size={14} className="shrink-0" />
                {spError}
              </div>
            )}

            {/* Carpetas siempre visibles */}
            <div className="p-4 space-y-3">
              {spLoading && !spFolders ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={24} className="animate-spin text-gray-400" />
                </div>
              ) : (
                SUBFOLDERS.map(sf => {
                  const c = COLOR[sf.color];
                  const isOpen = expanded[sf.key];
                  const spFiles = spFolders?.[sf.key] ?? [];
                  return (
                    <div key={sf.key} className={`rounded-lg border ${c.border} overflow-hidden`}>
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [sf.key]: !isOpen }))}
                        className={`w-full flex items-center justify-between px-4 py-2.5 ${c.bg} hover:brightness-95 transition-colors`}
                      >
                        <div className="flex items-center gap-2">
                          {isOpen ? <ChevronDown size={14} className={c.text} /> : <ChevronRight size={14} className={c.text} />}
                          <span className={`font-bold text-sm ${c.text}`}>{sf.label}</span>
                        </div>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c.bg} ${c.text} border ${c.border}`}>
                          {spLoading ? '…' : `${spFiles.length} archivo${spFiles.length !== 1 ? 's' : ''}`}
                        </span>
                      </button>

                      {isOpen && (
                        <div>
                          {spLoading ? (
                            <div className="flex items-center gap-2 px-4 py-3 text-xs text-gray-400">
                              <Loader2 size={13} className="animate-spin" /> Cargando archivos...
                            </div>
                          ) : spFiles.length === 0 ? (
                            <p className="px-4 py-3 text-xs text-gray-400 italic">
                              Sin archivos en esta carpeta.
                            </p>
                          ) : (
                            <div className="divide-y divide-gray-50">
                              {spFiles.map(f => (
                                <a
                                  key={f.id}
                                  href={f.webUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors group/sp"
                                >
                                  <FileText size={14} className="text-gray-400 shrink-0" />
                                  <span className={`flex-1 text-sm truncate ${c.text} group-hover/sp:underline`}>
                                    {f.name}
                                  </span>
                                  <ExternalLink size={12} className={`shrink-0 opacity-50 group-hover/sp:opacity-100 ${c.text}`} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
      </div>{/* /px-6 py-5 content */}

      {/* Evaluación modal */}
      {verEvaluacion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, backgroundColor: 'var(--ui-bg)', overflowY: 'auto' }}>
          <EvaluacionProveedor
            solicitudId={solicitudId}
            userEmail={userEmail}
            contratoData={{
              proveedor: contrato.proveedor?.nombre_proveedor || '',
              correo: contrato.proveedor?.datos_contacto || '',
              tipoContratacion: contrato.modalidad || '',
              numeroContrato: contrato.codigo || '',
              proponenteId: contrato.proveedor?.id,
            }}
            onVolver={() => setVerEvaluacion(false)}
            onGuardado={handleEvaluacionGuardada}
          />
        </div>
      )}
    </div>
  );
}
