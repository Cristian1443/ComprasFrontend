import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, ThumbsUp, ThumbsDown, Filter
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface FacturaGerente {
  id: string;
  nombre_solicitud: string | null;
  aprobador_1: string | null;
  aprobador_2: string | null;
  fecha_factura: string;
  no_contrato_oc: string;
  no_factura_cxc: string;
  numero_ap: string;
  concepto: string;
  valor: number | null;
  adjunto_url: string | null;
  adjunto_nombre: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  creado_por_email: string | null;
  creado_en: string;
  contrato_codigo: string;
  contrato_objeto: string;
  aprobado_supervisor: boolean | null;
  comentario_supervisor: string | null;
  aprobado_gerente: boolean | null;
  comentario_gerente: string | null;
}

type Filtro = 'todos' | 'pendiente' | 'aprobada' | 'rechazada';

function formatCOP(val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(Number(val))) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val));
}

function EstadoBadge({ estado }: { estado: FacturaGerente['estado'] }) {
  if (estado === 'aprobada')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle2 size={12} /> Aprobada</span>;
  if (estado === 'rechazada')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700"><XCircle size={12} /> Rechazada</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={12} /> Pendiente</span>;
}

export function FacturasGerente() {
  const [facturas, setFacturas] = useState<FacturaGerente[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [comentarios, setComentarios] = useState<Record<string, string>>({});

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/gerente/facturas`);
      const data = r.ok ? await r.json() : [];
      setFacturas(Array.isArray(data) ? data : []);
    } catch {
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const aprobar = async (id: string, aprobado: boolean, comentarioTexto?: string) => {
    setProcesandoId(id);
    try {
      await fetch(`${API_BASE}/api/gerente/facturas/${id}/aprobar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprobado, comentario: comentarioTexto?.trim() || null }),
      });
      setComentarios(prev => { const c = { ...prev }; delete c[id]; return c; });
      await cargar();
    } finally {
      setProcesandoId(null);
    }
  };

  const rechazar = (id: string) => {
    const texto = (comentarios[id] || '').trim();
    if (!texto) {
      alert('Indica el motivo del rechazo en el comentario.');
      return;
    }
    aprobar(id, false, texto);
  };

  const facturasFiltradas = filtro === 'todos' ? facturas : facturas.filter(f => f.estado === filtro);
  const conteos = {
    todos: facturas.length,
    pendiente: facturas.filter(f => f.estado === 'pendiente').length,
    aprobada: facturas.filter(f => f.estado === 'aprobada').length,
    rechazada: facturas.filter(f => f.estado === 'rechazada').length,
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO');
  };

  const FILTROS: { key: Filtro; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'aprobada', label: 'Aprobadas' },
    { key: 'rechazada', label: 'Rechazadas' },
  ];

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-secondary) 12%, white)' }}>
          <Receipt size={22} style={{ color: 'var(--brand-secondary)' }} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Facturas por aprobar</h2>
          <p className="text-sm text-gray-500">Facturas de contratos enviadas por el área financiera</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', count: conteos.todos, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'Pendientes', count: conteos.pendiente, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Aprobadas', count: conteos.aprobada, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Rechazadas', count: conteos.rechazada, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className={`text-xs font-semibold ${s.color} opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        {FILTROS.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtro === f.key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filtro === f.key ? { backgroundColor: 'var(--brand-secondary)' } : {}}>
            {f.label} ({conteos[f.key]})
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
      ) : facturasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Receipt size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">No hay facturas</p>
          <p className="text-sm mt-1">{filtro === 'todos' ? 'No hay facturas registradas aún.' : `No hay facturas "${filtro}".`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {facturasFiltradas.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full border"
                      style={{ color: 'var(--brand-secondary)', backgroundColor: 'color-mix(in srgb, var(--brand-secondary) 8%, white)', borderColor: 'color-mix(in srgb, var(--brand-secondary) 20%, white)' }}>
                      {f.contrato_codigo}
                    </span>
                    <EstadoBadge estado={f.estado} />
                    {/* Chip supervisor */}
                    {f.aprobado_supervisor === true && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold"><CheckCircle2 size={10} /> Supervisor ✓</span>}
                    {f.aprobado_supervisor === false && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold"><XCircle size={10} /> Supervisor ✗</span>}
                    {f.aprobado_supervisor === null && <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold"><Clock size={10} /> Supervisor…</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.contrato_objeto}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500 flex-wrap">
                    <span className="font-mono font-semibold">AP {f.numero_ap}</span>
                    <span>·</span>
                    <span>{formatDate(f.fecha_factura)}</span>
                    {formatCOP(f.valor) && (
                      <><span>·</span><span className="font-semibold text-gray-700">{formatCOP(f.valor)}</span></>
                    )}
                    {f.creado_por_email && <><span>·</span><span className="truncate max-w-[180px]">{f.creado_por_email}</span></>}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {f.aprobado_gerente === true && <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold"><CheckCircle2 size={13} /> Aprobaste</span>}
                  {f.aprobado_gerente === false && <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold"><XCircle size={13} /> Rechazaste</span>}
                  <button onClick={() => setExpandedId(prev => (prev === f.id ? null : f.id))}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                    <ChevronDown size={16} className={`transition-transform ${expandedId === f.id ? 'rotate-180' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Comentario + botones de acción si aún no ha actuado el gerente */}
              {f.aprobado_gerente === null && f.estado === 'pendiente' && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2">
                  <textarea value={comentarios[f.id] || ''} onChange={e => setComentarios(prev => ({ ...prev, [f.id]: e.target.value }))} rows={2}
                    placeholder="Comentario (obligatorio si rechazas)..."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 resize-none bg-white"
                    style={{ fontFamily: 'Gabarito, sans-serif' }} />
                  <div className="flex gap-2">
                    <button onClick={() => aprobar(f.id, true, comentarios[f.id])} disabled={procesandoId === f.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 bg-green-600"
                      style={{ fontFamily: 'Gabarito, sans-serif' }}>
                      {procesandoId === f.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsUp size={12} />} Aprobar
                    </button>
                    <button onClick={() => rechazar(f.id)} disabled={procesandoId === f.id}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-50 bg-red-600"
                      style={{ fontFamily: 'Gabarito, sans-serif' }}>
                      {procesandoId === f.id ? <Loader2 size={12} className="animate-spin" /> : <ThumbsDown size={12} />} Rechazar
                    </button>
                  </div>
                </div>
              )}

              {/* Detalle expandido */}
              {expandedId === f.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-2 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">AP</p><p className="text-gray-800 font-semibold">{f.numero_ap}</p></div>
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Contrato/OC</p><p className="text-gray-800">{f.no_contrato_oc}</p></div>
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Factura/CxC</p><p className="text-gray-800">{f.no_factura_cxc}</p></div>
                  </div>
                  {formatCOP(f.valor) && (
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Valor</p><p className="text-gray-900 font-bold text-base">{formatCOP(f.valor)}</p></div>
                  )}
                  <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Concepto</p><p className="text-gray-800">{f.concepto}</p></div>
                  {(f.aprobador_1 || f.aprobador_2) && (
                    <div className="grid grid-cols-2 gap-3">
                      {f.aprobador_1 && <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Aprobador 1</p><p>{f.aprobador_1}</p></div>}
                      {f.aprobador_2 && <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Aprobador 2</p><p>{f.aprobador_2}</p></div>}
                    </div>
                  )}
                  {(f.adjunto_url || f.adjunto_nombre) && (
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Adjunto</p>
                      {f.adjunto_url && f.adjunto_url.startsWith('http') ? (
                        <a href={f.adjunto_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          📎 {f.adjunto_nombre || 'Ver adjunto'}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{f.adjunto_nombre || f.adjunto_url}</span>
                      )}
                    </div>
                  )}
                  {f.comentario_supervisor && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase">Comentario supervisor</p>
                      <p className="text-amber-800 text-sm">{f.comentario_supervisor}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Registrada el {formatDate(f.creado_en)}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
