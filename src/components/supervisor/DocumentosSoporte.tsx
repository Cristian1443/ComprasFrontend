import React, { useEffect, useState, useMemo } from 'react';
import {
  FileText, Eye, Upload, CheckCircle2, AlertCircle,
  Clock, ChevronDown, ChevronRight, Search, Loader2, FolderOpen
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';

interface DocumentosSoporteProps {
  userEmail?: string;
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador', enviado_gerente: 'En gerencia',
  aprobado_gerente: 'Aprobado gerente', rechazado_gerente: 'Devuelto gerente',
  en_financiera: 'En financiera', aprobado_financiera: 'Aprobado financiera',
  rechazado_financiera: 'Devuelto financiera', en_juridica: 'En juridica',
  enviado_juridica: 'En juridica', aprobado_juridica: 'Aprobado juridica',
  rechazado_juridica: 'Devuelto juridica', aprobado_comite: 'Aprobado comite',
  rechazado_comite: 'Devuelto comite', devuelto_al_solicitante: 'Devuelto',
  finalizado: 'Finalizado', contratado: 'Contratado',
};

function parseAnexos(v: any): any[] {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
  return [];
}

function abrirDoc(doc: any) {
  const candidates = [
    doc?.url, doc?.path, doc?.ruta,
    doc?.nombre_almacenado ? `${API_URL}/api/uploads/solicitudes/${doc.nombre_almacenado}` : null,
    doc?.nombre_almacenado ? `${API_URL}/api/uploads/convocatorias/${doc.nombre_almacenado}` : null,
  ].filter(Boolean) as string[];
  if (!candidates.length) { alert('Sin ruta valida.'); return; }
  const url = candidates[0].startsWith('http') ? candidates[0] : `${API_URL}${candidates[0]}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function EstadoBadge({ estado }: { estado: string }) {
  const label = ESTADO_LABEL[estado] || estado.replace(/_/g, ' ');
  const r = estado.includes('rechazado') || estado === 'devuelto_al_solicitante';
  const a = estado.includes('aprobado') || ['finalizado','contratado'].includes(estado);
  const e = estado.includes('en_') || estado.startsWith('enviado');
  const cls = r ? 'bg-red-50 text-red-600 border-red-200'
    : a ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : e ? 'bg-blue-50 text-blue-600 border-blue-200'
    : 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

type Filtro = 'todas' | 'con_docs' | 'sin_docs' | 'requieren_accion';

export function DocumentosSoporte({ userEmail }: DocumentosSoporteProps) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [cargando, setCargando]       = useState(true);
  const [busqueda, setBusqueda]       = useState('');
  const [filtro, setFiltro]           = useState<Filtro>('todas');
  const [expandida, setExpandida]     = useState<string | null>(null);
  const [subiendo, setSubiendo]       = useState<string | null>(null);

  useEffect(() => {
    const email = String(userEmail || '').trim().toLowerCase();
    if (!email) { setSolicitudes([]); setCargando(false); return; }

    setCargando(true);
    fetch(`${API_URL}/api/solicitudes?email=${encodeURIComponent(email)}`)
      .then(r => r.ok ? r.json() : [])
      .then(async (base: any[]) => {
        const detallados = await Promise.all(
          base.map(async (s: any) => {
            try {
              const r = await fetch(`${API_URL}/api/solicitudes/${s.id}`);
              return r.ok ? { ...s, ...await r.json() } : s;
            } catch { return s; }
          })
        );
        setSolicitudes(Array.isArray(detallados) ? detallados : []);
      })
      .catch(() => setSolicitudes([]))
      .finally(() => setCargando(false));
  }, [userEmail]);

  const subirArchivo = async (solicitudId: string, file: File) => {
    setSubiendo(solicitudId);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('solicitud_id', solicitudId);
      const r = await fetch(`${API_URL}/api/solicitudes/${solicitudId}/anexos`, { method: 'POST', body: form });
      if (r.ok) {
        // Recargar esa solicitud
        const det = await fetch(`${API_URL}/api/solicitudes/${solicitudId}`);
        if (det.ok) {
          const data = await det.json();
          setSolicitudes(prev => prev.map(s => s.id === solicitudId ? { ...s, ...data } : s));
        }
      } else {
        alert('Error al subir el archivo. Verifica que el servidor soporte este endpoint.');
      }
    } catch {
      alert('Error de conexion al subir el archivo.');
    } finally {
      setSubiendo(null);
    }
  };

  const lista = useMemo(() => {
    return solicitudes.filter(s => {
      const anexos = parseAnexos(s.anexos_solicitante);
      const tieneDocs = anexos.length > 0;
      const sinDocs   = !tieneDocs;
      const requiereAccion = sinDocs && !['finalizado','contratado','aprobado_juridica'].includes(s.estado || '');

      const matchFiltro =
        filtro === 'con_docs'         ? tieneDocs :
        filtro === 'sin_docs'         ? sinDocs :
        filtro === 'requieren_accion' ? requiereAccion :
        true;

      const q = busqueda.toLowerCase();
      return matchFiltro && (!q || (s.objeto||'').toLowerCase().includes(q) || (s.codigo||'').toLowerCase().includes(q));
    });
  }, [solicitudes, filtro, busqueda]);

  const stats = useMemo(() => {
    const conDocs = solicitudes.filter(s => parseAnexos(s.anexos_solicitante).length > 0).length;
    const sinDocs = solicitudes.length - conDocs;
    const totalDocs = solicitudes.reduce((acc, s) => acc + parseAnexos(s.anexos_solicitante).length, 0);
    const requierenAccion = solicitudes.filter(s =>
      parseAnexos(s.anexos_solicitante).length === 0 &&
      !['finalizado','contratado','aprobado_juridica'].includes(s.estado || '')
    ).length;
    return { conDocs, sinDocs, totalDocs, requierenAccion };
  }, [solicitudes]);

  const TABS: { id: Filtro; label: string; count: number }[] = [
    { id: 'todas',            label: 'Todas',           count: solicitudes.length },
    { id: 'con_docs',         label: 'Con documentos',  count: stats.conDocs },
    { id: 'sin_docs',         label: 'Sin documentos',  count: stats.sinDocs },
    { id: 'requieren_accion', label: 'Requieren accion', count: stats.requierenAccion },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 lg:px-8 py-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Compras y Contratacion</p>
          <h1 className="text-xl font-black text-gray-900">
            Centro de <span style={{ color: BRAND }}>Documentos</span>
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Documentos de soporte por solicitud — suba, vea y gestione desde aqui</p>
        </div>

        {/* Stats strip */}
        {!cargando && solicitudes.length > 0 && (
          <div className="px-6 lg:px-8 pb-4 flex flex-wrap gap-6 border-t border-gray-100 pt-4">
            <Stat icon={<FileText size={13} />} label="Total documentos" value={stats.totalDocs} color={BRAND} />
            <Stat icon={<CheckCircle2 size={13} />} label="Solicitudes con docs" value={stats.conDocs} color="#10b981" />
            {stats.requierenAccion > 0 && (
              <Stat icon={<AlertCircle size={13} />} label="Requieren carga" value={stats.requierenAccion} color={CTA} />
            )}
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-100 px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Buscar por codigo u objeto..."
              value={busqueda} onChange={e => setBusqueda(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit flex-wrap">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setFiltro(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
                style={filtro === t.id
                  ? { background: BRAND, color: 'white', boxShadow: '0 1px 3px rgba(47,111,163,0.3)' }
                  : { color: '#6b7280' }}>
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${filtro === t.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500'}`}>
                  {t.count}
                </span>
              </button>
            ))}
          </div>
          <span className="text-sm text-gray-400 ml-auto shrink-0">
            <span className="font-black text-gray-800">{lista.length}</span> / {solicitudes.length}
          </span>
        </div>
      </div>

      {/* LISTA */}
      <div className="px-6 lg:px-8 py-5 space-y-3">
        {cargando ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
            <FolderOpen size={32} className="mb-2 opacity-30" />
            <p className="font-semibold">Sin resultados</p>
            <p className="text-sm mt-0.5">Cambia el filtro o la busqueda</p>
          </div>
        ) : (
          lista.map(sol => {
            const estado      = String(sol.estado || 'borrador');
            const anexos      = parseAnexos(sol.anexos_solicitante);
            const isExpanded  = expandida === sol.id;
            const sinDocs     = anexos.length === 0;
            const activa      = !['finalizado','contratado','aprobado_juridica'].includes(estado);
            const necesita    = sinDocs && activa;

            return (
              <div key={sol.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

                {/* FILA PRINCIPAL */}
                <div
                  className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandida(isExpanded ? null : sol.id)}
                >
                  {/* Acento lateral */}
                  <div className="w-0.5 h-10 rounded-full shrink-0"
                    style={{ backgroundColor: necesita ? CTA : sinDocs ? '#e5e7eb' : '#10b981' }} />

                  {/* Info principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="text-[11px] font-black" style={{ color: BRAND }}>{sol.codigo}</span>
                      <EstadoBadge estado={estado} />
                      {necesita && (
                        <span className="text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded uppercase">
                          Sin soportes
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-semibold text-gray-800 truncate">{sol.titulo_contrato || sol.objeto || 'Sin objeto'}</p>
                  </div>

                  {/* Conteo documentos */}
                  <div className="shrink-0 text-center hidden sm:block">
                    <p className="text-lg font-black" style={{ color: anexos.length > 0 ? '#10b981' : '#d1d5db' }}>
                      {anexos.length}
                    </p>
                    <p className="text-[10px] text-gray-400 font-semibold">
                      {anexos.length === 1 ? 'archivo' : 'archivos'}
                    </p>
                  </div>

                  {/* Chevron */}
                  <div className="shrink-0 text-gray-400">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </div>
                </div>

                {/* PANEL EXPANDIDO */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 space-y-4">

                    {/* Lista de archivos */}
                    {anexos.length === 0 ? (
                      <div className="flex items-center gap-3 p-4 bg-white rounded-lg border border-dashed border-gray-200 text-gray-400">
                        <FileText size={18} className="opacity-40 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold text-gray-600">No hay documentos cargados</p>
                          <p className="text-xs text-gray-400">Sube los soportes de esta solicitud desde aqui</p>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide">
                          Documentos cargados ({anexos.length})
                        </p>
                        {anexos.map((doc: any, i: number) => (
                          <div key={i} className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 px-4 py-3">
                            <FileText size={15} className="text-blue-400 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-800 truncate">
                                {doc.nombre || doc.name || `Documento ${i + 1}`}
                              </p>
                              {doc.tamanio && (
                                <p className="text-[10px] text-gray-400">{doc.tamanio}</p>
                              )}
                            </div>
                            <button
                              onClick={() => abrirDoc(doc)}
                              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                              style={{ backgroundColor: BRAND }}
                            >
                              <Eye size={12} /> Ver
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Boton subir */}
                    {activa && (
                      <div>
                        <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">
                          Agregar soporte
                        </p>
                        <label className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-all w-fit ${
                          subiendo === sol.id
                            ? 'border-gray-200 bg-gray-100 text-gray-400 pointer-events-none'
                            : 'border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100'
                        }`}>
                          {subiendo === sol.id
                            ? <><Loader2 size={14} className="animate-spin" /> Subiendo...</>
                            : <><Upload size={14} /> Subir documento</>
                          }
                          <input
                            type="file"
                            className="hidden"
                            disabled={subiendo === sol.id}
                            onChange={e => {
                              const file = e.target.files?.[0];
                              if (file) subirArchivo(sol.id, file);
                              e.target.value = '';
                            }}
                          />
                        </label>
                        <p className="text-[10px] text-gray-400 mt-1.5">
                          PDF, Word, Excel, imagen — max 20 MB
                        </p>
                      </div>
                    )}

                    {/* Info de etapa */}
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>
                        Creada el {sol.creado_en
                          ? new Date(sol.creado_en).toLocaleDateString('es-CO', { day:'2-digit', month:'long', year:'numeric' })
                          : '-'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}18` }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div>
        <p className="text-[10px] text-gray-400 font-semibold uppercase">{label}</p>
        <p className="text-sm font-black text-gray-800">{value}</p>
      </div>
    </div>
  );
}
