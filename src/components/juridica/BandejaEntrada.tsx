import React, { useEffect, useState } from 'react';
import {
  Inbox, Loader2, Search, ArrowRight,
  FileText, CheckCircle2, Clock, Building2, Scale, AlertTriangle
} from 'lucide-react';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const BRAND = '#2f6fa3';
const CTA   = '#E84922';

function formatCOP(val: any): string | null {
  const n = Number(val);
  if (!val || isNaN(n) || n === 0) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function getValor(s: any): string | null {
  const m = String(s?.moneda || 'COP').toUpperCase();
  const txt = m === 'USD' ? s?.valor_moneda_usd_texto : m === 'EUR' ? s?.valor_moneda_eur_texto : s?.valor_moneda_cop_texto;
  if (txt) return `${m} ${txt}`;
  return formatCOP(s?.valor_en_cop || s?.valor_estimado);
}

function diasEnBandeja(iso: string): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

function UrgenciaBadge({ dias }: { dias: number }) {
  if (dias >= 5)
    return <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-600 border border-red-200">{dias}d · Urgente</span>;
  if (dias >= 2)
    return <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-200">{dias}d · Revisar</span>;
  return <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">Nuevo</span>;
}

export function BandejaEntrada({ onSelect }: { onSelect?: (id: string) => void }) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [search, setSearch]           = useState('');
  const [filtroModalidad, setFiltroModalidad] = useState<string>('todos');

  const cargar = () => {
    setLoading(true);
    setError(null);
    fetch(`${API_URL}/api/juridica/bandeja`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(d => setSolicitudes(Array.isArray(d) ? d : []))
      .catch(() => setError('No se pudo cargar la bandeja de entrada. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const modalidades = ['todos', ...Array.from(new Set(solicitudes.map(s => s.modalidad).filter(Boolean)))];

  const filtradas = solicitudes.filter(s => {
    const matchSearch = !search ||
      s.codigo?.toLowerCase().includes(search.toLowerCase()) ||
      s.objeto?.toLowerCase().includes(search.toLowerCase()) ||
      s.solicitante_nombre?.toLowerCase().includes(search.toLowerCase()) ||
      s.gerencia_nombre?.toLowerCase().includes(search.toLowerCase());
    const matchMod = filtroModalidad === 'todos' || s.modalidad === filtroModalidad;
    return matchSearch && matchMod;
  });

  // Ordenadas por urgencia (más días primero)
  const ordenadas = [...filtradas].sort((a, b) => diasEnBandeja(b.actualizado_en) - diasEnBandeja(a.actualizado_en));

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f7fb' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
        <p className="text-sm font-medium text-gray-500">Cargando bandeja…</p>
      </div>
    </div>
  );

  const urgentes  = solicitudes.filter(s => diasEnBandeja(s.actualizado_en) >= 5).length;
  const aRevisar  = solicitudes.filter(s => { const d = diasEnBandeja(s.actualizado_en); return d >= 2 && d < 5; }).length;
  const nuevas    = solicitudes.filter(s => diasEnBandeja(s.actualizado_en) < 2).length;

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── HEADER BLANCO ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-6">
          <div className="flex items-start justify-between gap-6 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Inbox size={14} style={{ color: CTA }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Área Jurídica</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900">
                Bandeja de <span style={{ color: CTA }}>Entrada</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Scale size={12} /> Solicitudes pendientes de revisión legal
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 shrink-0">
              <Inbox size={14} style={{ color: BRAND }} />
              <span className="font-black text-sm" style={{ color: BRAND }}>{solicitudes.length}</span>
              <span className="text-gray-400 text-xs">en bandeja</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              <AlertTriangle size={16} />
              <span className="flex-1">{error}</span>
              <button onClick={cargar} className="text-xs font-black uppercase underline underline-offset-2 hover:opacity-70">
                Reintentar
              </button>
            </div>
          )}

          {/* Mini KPIs */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Urgentes',  val: urgentes, accent: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
              { label: 'A revisar', val: aRevisar,  accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
              { label: 'Nuevas',    val: nuevas,    accent: '#10b981', bg: '#f0fdf4', border: '#a7f3d0' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl px-4 py-3 border"
                style={{ background: s.bg, borderColor: s.border }}>
                <p className="text-2xl font-black" style={{ color: s.accent }}>{s.val}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide mt-0.5 text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="max-w-[1200px] mx-auto px-6 lg:px-10 py-6 space-y-5">

        {/* Barra de búsqueda + filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por código, objeto, solicitante o gerencia..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            />
          </div>

          {/* Filtro modalidad */}
          {modalidades.length > 2 && (
            <div className="flex gap-2 flex-wrap">
              {modalidades.map(m => (
                <button key={m} onClick={() => setFiltroModalidad(m)}
                  className="px-3 py-2 rounded-xl text-xs font-bold border transition-all"
                  style={{
                    background: filtroModalidad === m ? BRAND : 'white',
                    color: filtroModalidad === m ? 'white' : '#6b7280',
                    borderColor: filtroModalidad === m ? BRAND : '#e5e7eb',
                  }}>
                  {m === 'todos' ? 'Todas' : m}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        {ordenadas.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-emerald-400" />
            <p className="text-lg font-black text-gray-700">Bandeja al día</p>
            <p className="text-sm text-gray-400 mt-1">
              {search ? 'No hay resultados para tu búsqueda.' : 'No hay solicitudes pendientes de revisión.'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {ordenadas.map(s => {
              const dias  = diasEnBandeja(s.actualizado_en);
              const valor = getValor(s);
              const fecha = new Date(s.actualizado_en).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric',
              });

              return (
                <div key={s.id}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group cursor-pointer"
                  onClick={() => onSelect?.(s.id)}>
                  <div className="flex items-center gap-4 px-5 py-4">

                    {/* Ícono */}
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: '#eff6ff' }}>
                      <FileText size={18} style={{ color: BRAND }} />
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-black font-mono text-white px-2 py-0.5 rounded-md"
                          style={{ backgroundColor: BRAND }}>
                          {s.codigo || 'S/C'}
                        </span>
                        <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded border ${
                          s.modalidad?.toLowerCase() === 'directa'   ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          s.modalidad?.toLowerCase() === 'invitacion' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          s.modalidad?.toLowerCase() === 'tdr'        ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          'bg-gray-100 text-gray-400 border-gray-200'
                        }`}>
                          {s.modalidad || 'Sin modalidad'}
                        </span>
                        <UrgenciaBadge dias={dias} />
                      </div>

                      <p className="text-sm font-bold text-gray-900 truncate">{s.titulo_contrato || s.objeto || 'Sin objeto'}</p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 mt-1 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <FileText size={10} className="shrink-0" />
                          {s.solicitante_nombre || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 size={10} className="shrink-0" />
                          {nombreGerenciaCompleto(s.gerencia_nombre) || '—'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={10} className="shrink-0" />
                          {fecha}
                        </span>
                        {valor && (
                          <span className="font-bold text-emerald-700">{valor}</span>
                        )}
                      </div>
                    </div>

                    {/* Acción */}
                    <button
                      onClick={e => { e.stopPropagation(); onSelect?.(s.id); }}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 text-white rounded-xl text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
                      style={{ backgroundColor: CTA }}>
                      Gestionar
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer con conteo */}
        {ordenadas.length > 0 && (
          <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
            {ordenadas.length} solicitud{ordenadas.length !== 1 ? 'es' : ''} en bandeja
          </p>
        )}
      </div>
    </div>
  );
}
