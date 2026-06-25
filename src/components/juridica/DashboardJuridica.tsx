import React, { useEffect, useState } from 'react';
import {
  Clock, CheckCircle2, XCircle, FileCheck2, Loader2,
  ArrowRight, FileText, Building2, Users, ChevronRight,
  Inbox, History, Scale,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';
const ACCENT     = '#f08a24';

interface DashboardJuridicaProps {
  onGoBandeja?:    () => void;
  onGoHistorial?:  () => void;
  onGoContratos?:  () => void;
  onGoProveedores?:() => void;
  onVerSolicitud?: (id: string) => void;
}

const ESTADO_LABEL: Record<string, string> = {
  en_juridica:        'En Jurídica',
  enviado_juridica:   'En Jurídica',
  aprobado_juridica:  'Aprobado',
  rechazado_juridica: 'Rechazado',
  rechazado_comite:   'Rech. Comité',
  finalizado:         'Finalizado',
  contratado:         'Contratado',
};

function EstadoBadge({ estado }: { estado: string }) {
  const label = ESTADO_LABEL[estado] || estado.replace(/_/g, ' ');
  const cls =
    estado.includes('rechazado') ? 'bg-red-50 text-red-700 border-red-200'
    : estado.includes('aprobado') || estado === 'finalizado' || estado === 'contratado'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : 'bg-blue-50 text-blue-700 border-blue-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

function formatCOP(val: any): string | null {
  const n = Number(val);
  if (!val || isNaN(n) || n === 0) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function getValor(item: any): string | null {
  const m = String(item?.moneda || 'COP').toUpperCase();
  const txt = m === 'USD' ? item?.valor_moneda_usd_texto : item?.valor_moneda_cop_texto;
  if (txt) return `${m} ${txt}`;
  return formatCOP(item?.valor_en_cop || item?.valor_estimado);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diff = Math.round((Date.now() - d.getTime()) / 60000);
  if (diff < 60)   return `Hace ${diff} min`;
  if (diff < 1440) return `Hace ${Math.round(diff / 60)}h`;
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

export function DashboardJuridica({
  onGoBandeja, onGoHistorial, onGoContratos, onGoProveedores, onVerSolicitud,
}: DashboardJuridicaProps) {
  const [metrics, setMetrics]   = useState<any>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filtro, setFiltro]     = useState<'todos' | 'pendientes' | 'calificacion' | 'cerrados'>('todos');

  const load = async () => {
    try {
      setError('');
      const res = await fetch(`${API_URL}/api/juridica/metrics`);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Error al cargar');
      setMetrics(await res.json());
    } catch (err: any) {
      setError(err?.message || 'No fue posible cargar el dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f7fb' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
        <p className="text-sm font-medium text-gray-500">Cargando panel…</p>
      </div>
    </div>
  );

  const pendientes    = Number(metrics?.pendientes    ?? 0);
  const enCalificacion = Number(metrics?.en_calificacion ?? 0);
  const aprobadas     = Number(metrics?.aprobadas     ?? 0);
  const rechazadas    = Number(metrics?.rechazadas    ?? 0);
  const recientes: any[] = metrics?.recientes || [];

  const listaFiltrada = recientes.filter(item => {
    if (filtro === 'pendientes')   return ['en_juridica', 'enviado_juridica'].includes(item.estado);
    if (filtro === 'calificacion') return ['en_juridica', 'enviado_juridica'].includes(item.estado);
    if (filtro === 'cerrados')     return ['aprobado_juridica', 'rechazado_juridica', 'rechazado_comite', 'finalizado', 'contratado'].includes(item.estado);
    return true;
  }).slice(0, 6);

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── HEADER GRADIENTE ── */}
      <div style={{ background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-8 pb-0 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50 mb-2">
              Compras y Contratación · Jurídica
            </p>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Panel de <span style={{ color: ACCENT }}>Jurídica</span>
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Scale size={13} className="text-white/40" />
              <p className="text-white/40 text-xs">Gestión legal de solicitudes y contratos</p>
            </div>
          </div>
          <button onClick={onGoBandeja}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white shadow-md hover:opacity-90 active:scale-95 transition-all shrink-0 mt-1"
            style={{ backgroundColor: CTA }}>
            <Inbox size={16} /> Bandeja de entrada
          </button>
        </div>

        {/* Stats en header */}
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Pendientes',     val: pendientes,     color: pendientes > 0 ? 'text-orange-300' : 'text-white' },
            { label: 'En calificación',val: enCalificacion, color: 'text-yellow-200' },
            { label: 'Aprobadas',      val: aprobadas,      color: 'text-emerald-300' },
            { label: 'Rechazadas',     val: rechazadas,     color: 'text-red-300' },
          ].map((s, i) => (
            <div key={i} className="rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <p className={`text-2xl font-black ${s.color}`}>{s.val}</p>
              <p className="text-white/50 text-[11px] font-semibold uppercase tracking-wide mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-7 space-y-7">

        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            <XCircle size={16} className="shrink-0" /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── COLUMNA PRINCIPAL ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* KPI filtros */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Estado del proceso</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'pendientes'   as const, label: 'Pendientes',     val: pendientes,     icon: Clock,       activeColor: '#f59e0b', activeBg: '#fffbeb' },
                  { id: 'calificacion' as const, label: 'En calificación',val: enCalificacion, icon: FileCheck2,   activeColor: BRAND,     activeBg: '#eff6ff' },
                  { id: 'cerrados'     as const, label: 'Aprobadas',      val: aprobadas,      icon: CheckCircle2, activeColor: '#059669', activeBg: '#f0fdf4' },
                  { id: 'todos'        as const, label: 'Rechazadas',     val: rechazadas,     icon: XCircle,      activeColor: '#e11d48', activeBg: '#fff1f2' },
                ].map(card => {
                  const active = filtro === card.id;
                  return (
                    <button key={card.id} onClick={() => setFiltro(card.id)}
                      className="text-left transition-all duration-200 rounded-xl p-4 border-2"
                      style={{
                        background: active ? card.activeBg : 'white',
                        borderColor: active ? card.activeColor : 'transparent',
                        boxShadow: active ? `0 0 0 3px ${card.activeColor}22` : '0 1px 3px rgba(0,0,0,0.06)',
                      }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                        style={{ background: active ? card.activeBg : '#f4f7fb' }}>
                        <card.icon size={16} style={{ color: active ? card.activeColor : '#9ca3af' }} />
                      </div>
                      <p className="text-2xl font-black" style={{ color: active ? card.activeColor : '#1a2332' }}>{card.val}</p>
                      <p className="text-[11px] font-semibold text-gray-400 mt-1 uppercase tracking-wide">{card.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Lista de actividad */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText size={15} style={{ color: BRAND }} />
                  <h3 className="font-bold text-gray-800 text-sm">Actividad reciente</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-gray-400">{listaFiltrada.length} resultados</span>
                  <button onClick={onGoBandeja}
                    className="text-[11px] font-bold flex items-center gap-1 hover:underline"
                    style={{ color: BRAND }}>
                    Ver bandeja <ChevronRight size={11} />
                  </button>
                </div>
              </div>

              {listaFiltrada.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <FileText size={30} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin solicitudes en este filtro</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {listaFiltrada.map((item: any) => (
                    <div key={item.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => onVerSolicitud?.(item.id)}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: '#eff6ff' }}>
                        <FileText size={14} style={{ color: BRAND }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black" style={{ color: BRAND }}>{item.codigo}</span>
                          <EstadoBadge estado={item.estado} />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 truncate mt-0.5">{item.objeto || 'Sin objeto'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 flex-wrap">
                          {item.solicitante_nombre && <span>{item.solicitante_nombre}</span>}
                          {getValor(item) && <><span>·</span><span className="font-semibold text-emerald-700">{getValor(item)}</span></>}
                          <span>·</span>
                          <span>{formatDate(item.fecha)}</span>
                        </div>
                      </div>
                      <ArrowRight size={14} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── COLUMNA LATERAL ── */}
          <div className="space-y-5">

            {/* Acceso rápido */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h3 className="font-bold text-gray-800 text-sm">Acceso rápido</h3>
              </div>
              <div className="p-3 space-y-2">
                {[
                  { label: 'Bandeja de entrada', sub: `${pendientes} pendientes`, icon: Inbox, color: pendientes > 0 ? CTA : BRAND, bg: pendientes > 0 ? '#fff5f3' : '#eff6ff', action: onGoBandeja },
                  { label: 'Historial jurídica', sub: `${aprobadas + rechazadas} gestionadas`, icon: History, color: '#059669', bg: '#f0fdf4', action: onGoHistorial },
                  { label: 'Contratos',           sub: 'Contratos activos',     icon: Building2, color: BRAND, bg: '#eff6ff', action: onGoContratos },
                  { label: 'Proveedores',          sub: 'Base de proveedores',  icon: Users,     color: '#7c3aed', bg: '#f5f3ff', action: onGoProveedores },
                ].map((item, i) => (
                  <button key={i} onClick={item.action}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-gray-50 transition-all text-left group border border-transparent hover:border-gray-100">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: item.bg }}>
                      <item.icon size={16} style={{ color: item.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-800">{item.label}</p>
                      <p className="text-[11px] text-gray-400">{item.sub}</p>
                    </div>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0" />
                  </button>
                ))}
              </div>
            </div>

            {/* Alerta pendientes */}
            {pendientes > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
                    <Clock size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-amber-900 text-sm">
                      {pendientes} solicitud{pendientes !== 1 ? 'es' : ''} en espera
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Requieren revisión jurídica
                    </p>
                    <button onClick={onGoBandeja}
                      className="mt-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg text-white transition-all hover:opacity-90"
                      style={{ backgroundColor: '#d97706' }}>
                      Revisar ahora <ArrowRight size={12} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Distribución */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-4">Tasa de resolución</p>
              {[
                { label: 'Aprobadas', val: aprobadas, total: aprobadas + rechazadas, color: '#10b981' },
                { label: 'Rechazadas', val: rechazadas, total: aprobadas + rechazadas, color: '#f43f5e' },
              ].map((s, i) => {
                const pct = s.total > 0 ? Math.round((s.val / s.total) * 100) : 0;
                return (
                  <div key={i} className="mb-4 last:mb-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-gray-600">{s.label}</span>
                      <span className="text-xs font-black" style={{ color: s.color }}>{pct}%</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: s.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
