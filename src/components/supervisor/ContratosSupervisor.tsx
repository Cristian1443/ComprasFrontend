import React, { useState, useEffect } from 'react';
import { Search, FileCheck2, ArrowRight, Clock, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';
const ACCENT     = '#f08a24';

interface Contrato {
  id: string;
  codigo: string;
  objeto: string;
  titulo_contrato?: string | null;
  estado: string;
  moneda?: string;
  valor_en_cop: number | null;
  valor_estimado: number | null;
  valor_moneda_cop_texto?: string | null;
  valor_moneda_usd_texto?: string | null;
  valor_moneda_eur_texto?: string | null;
  plazo_ejecucion_meses: number | null;
  plazo_ejecucion_dias: number | null;
  creado_en: string;
  solicitante_nombre: string;
  proveedor_nombre: string | null;
  total_facturado: number | null;
  facturas_aprobadas: number | null;
  total_facturas: number | null;
}

interface ContratosSupervisorProps {
  userEmail?: string;
  onVerDetalle: (solicitudId: string) => void;
  onBack?: () => void;
}

const fmtNum = (v: any): string | null =>
  v != null && !isNaN(Number(v))
    ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v))
    : null;

function getValor(c: Contrato): { moneda: string; valor: string } | null {
  const m = String(c.moneda || 'COP').toUpperCase();
  const txt = m === 'USD' ? c.valor_moneda_usd_texto : m === 'EUR' ? c.valor_moneda_eur_texto : c.valor_moneda_cop_texto;
  if (txt) return { moneda: m, valor: txt };
  const n = fmtNum(c.valor_en_cop ?? c.valor_estimado);
  if (n) return { moneda: 'COP', valor: n };
  return null;
}

function formatPlazo(c: Contrato): string {
  const m = c.plazo_ejecucion_meses ?? 0;
  const d = c.plazo_ejecucion_dias   ?? 0;
  if (m > 0 && d > 0) return `${m} m, ${d} d`;
  if (m > 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
  if (d > 0) return `${d} dias`;
  return '-';
}

function getDiasRestantes(c: Contrato): number | null {
  if (!c.creado_en) return null;
  const meses = c.plazo_ejecucion_meses ?? 0;
  const dias  = c.plazo_ejecucion_dias  ?? 0;
  if (meses === 0 && dias === 0) return null;
  const inicio = new Date(c.creado_en);
  const fin    = new Date(inicio);
  fin.setMonth(fin.getMonth() + meses);
  fin.setDate(fin.getDate()  + dias);
  const hoy  = new Date();
  return Math.round((fin.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function EstadoContrato({ contrato }: { contrato: Contrato }) {
  const dias = getDiasRestantes(contrato);
  if (dias === null) {
    return <span className="text-[10px] font-bold uppercase text-gray-400 bg-gray-100 border border-gray-200 px-2 py-0.5 rounded">Sin plazo</span>;
  }
  if (dias < 0) {
    return <span className="text-[10px] font-bold uppercase text-white px-2 py-0.5 rounded" style={{ backgroundColor: CTA }}>Vencido</span>;
  }
  if (dias <= 30) {
    return <span className="text-[10px] font-bold uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Vence en {dias}d</span>;
  }
  return <span className="text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Activo</span>;
}

function calcPctTiempo(contrato: Contrato): number | null {
  if (!contrato.creado_en) return null;
  const meses    = contrato.plazo_ejecucion_meses ?? 0;
  const diasExtra = contrato.plazo_ejecucion_dias  ?? 0;
  if (meses === 0 && diasExtra === 0) return null;
  const inicio    = new Date(contrato.creado_en);
  const fin       = new Date(inicio);
  fin.setMonth(fin.getMonth() + meses);
  fin.setDate(fin.getDate()   + diasExtra);
  const totalDias      = Math.round((fin.getTime()  - inicio.getTime()) / 86400000);
  const transcurridos  = Math.round((Date.now()     - inicio.getTime()) / 86400000);
  if (totalDias <= 0) return null;
  return Math.min(100, Math.max(0, Math.round((transcurridos / totalDias) * 100)));
}

function calcPctFinanciero(contrato: Contrato): number | null {
  const base = Number(contrato.valor_en_cop ?? contrato.valor_estimado ?? 0);
  if (base <= 0) return null;
  const facturado = Number(contrato.total_facturado ?? 0);
  return Math.min(100, Math.max(0, Math.round((facturado / base) * 100)));
}

function AlertaDesfase({ contrato }: { contrato: Contrato }) {
  const pctT = calcPctTiempo(contrato);
  const pctF = calcPctFinanciero(contrato);
  if (pctT === null || pctF === null) return null;
  const desfase = pctT - pctF;
  if (desfase <= 25) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded mt-1">
      <AlertTriangle size={9} /> Ejecucion lenta
    </span>
  );
}

type Filtro = 'todos' | 'activos' | 'por_vencer' | 'vencidos';

export function ContratosSupervisor({ userEmail, onVerDetalle }: ContratosSupervisorProps) {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filtro, setFiltro]       = useState<Filtro>('todos');

  useEffect(() => {
    if (!userEmail) { setLoading(false); return; }
    fetch(`${API_BASE}/api/supervisor/contratos?email=${encodeURIComponent(userEmail)}`)
      .then(r => r.json())
      .then(d => setContratos(Array.isArray(d) ? d : []))
      .catch(() => setContratos([]))
      .finally(() => setLoading(false));
  }, [userEmail]);

  const filtered = contratos.filter(c => {
    const dias = getDiasRestantes(c);
    const matchFiltro =
      filtro === 'activos'    ? (dias !== null && dias > 30) :
      filtro === 'por_vencer' ? (dias !== null && dias >= 0 && dias <= 30) :
      filtro === 'vencidos'   ? (dias !== null && dias < 0) :
      true;
    const q = search.toLowerCase();
    return matchFiltro && (!q || (c.codigo||'').toLowerCase().includes(q) || (c.titulo_contrato||'').toLowerCase().includes(q) || (c.objeto||'').toLowerCase().includes(q) || (c.proveedor_nombre||'').toLowerCase().includes(q));
  });

  const porVencer = contratos.filter(c => { const d = getDiasRestantes(c); return d !== null && d >= 0 && d <= 30; }).length;
  const vencidos  = contratos.filter(c => { const d = getDiasRestantes(c); return d !== null && d < 0; }).length;

  const valorTotal = contratos.reduce((acc, c) => acc + (c.valor_en_cop ?? c.valor_estimado ?? 0), 0);

  const TABS: { id: Filtro; label: string; count: number }[] = [
    { id: 'todos',      label: 'Todos',      count: contratos.length },
    { id: 'activos',    label: 'Activos',    count: contratos.length - porVencer - vencidos },
    { id: 'por_vencer', label: 'Por vencer', count: porVencer },
    { id: 'vencidos',   label: 'Vencidos',   count: vencidos },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 lg:px-8 py-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Compras y Contratacion</p>
            <h1 className="text-xl font-black text-gray-900">
              Mis <span style={{ color: BRAND }}>Contratos</span>
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">Contratos donde usted es supervisor</p>
          </div>
          <span className="text-sm text-gray-400 shrink-0 mt-1">
            <span className="font-black text-gray-800">{filtered.length}</span>
            <span className="mx-1 text-gray-300">/</span>
            {contratos.length} contratos
          </span>
        </div>

        {/* KPI strip */}
        {contratos.length > 0 && (
          <div className="px-6 lg:px-8 pb-4 flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${BRAND}15` }}>
                <TrendingUp size={13} style={{ color: BRAND }} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-semibold uppercase">Valor total</p>
                <p className="text-sm font-black text-gray-800">COP {fmtNum(valorTotal)}</p>
              </div>
            </div>
            {porVencer > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50">
                  <AlertTriangle size={13} className="text-amber-500" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Por vencer</p>
                  <p className="text-sm font-black text-amber-600">{porVencer} contrato{porVencer !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
            {vencidos > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${CTA}15` }}>
                  <Clock size={13} style={{ color: CTA }} />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 font-semibold uppercase">Vencidos</p>
                  <p className="text-sm font-black" style={{ color: CTA }}>{vencidos} contrato{vencidos !== 1 ? 's' : ''}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-100 px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por codigo, objeto o proveedor..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
            />
          </div>
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg w-fit">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setFiltro(t.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
                style={filtro === t.id
                  ? { background: BRAND, color: 'white', boxShadow: '0 1px 3px rgba(47,111,163,0.3)' }
                  : { color: '#6b7280' }}
              >
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">{t.label.split(' ')[0]}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  filtro === t.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                }`}>{t.count}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* TABLA */}
      <div className="px-6 lg:px-8 py-5">
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
            <FileCheck2 size={32} className="mb-2 opacity-30" />
            <p className="font-semibold">{contratos.length === 0 ? 'No tiene contratos asignados' : 'Sin resultados'}</p>
            <p className="text-sm mt-0.5">Cambia el filtro o la busqueda</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Cabecera desktop */}
            <div
              className="hidden lg:grid border-b border-gray-100 bg-gray-50 px-5 py-2.5"
              style={{ gridTemplateColumns: '150px 1fr 140px 100px 200px 120px' }}
            >
              {['Codigo', 'Objeto', 'Proveedor', 'Plazo', 'Valor', 'Estado'].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</p>
              ))}
            </div>

            {filtered.map((c, idx) => {
              const dias  = getDiasRestantes(c);
              const valor = getValor(c);
              const accentColor = dias === null ? '#e5e7eb' : dias < 0 ? CTA : dias <= 30 ? ACCENT : BRAND;

              return (
                <div key={c.id} className={idx !== 0 ? 'border-t border-gray-100' : ''}>

                  {/* DESKTOP */}
                  <div
                    className="hidden lg:grid items-center px-5 py-3 hover:bg-gray-50/70 transition-colors cursor-pointer"
                    style={{ gridTemplateColumns: '150px 1fr 140px 100px 200px 120px' }}
                    onClick={() => onVerDetalle(c.id)}
                  >
                    {/* Codigo + fecha */}
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-7 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                      <div>
                        <p className="text-[11px] font-black" style={{ color: BRAND }}>{c.codigo || c.id.slice(0,8)}</p>
                        <p className="text-[10px] text-gray-400">
                          {c.creado_en ? new Date(c.creado_en).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'2-digit' }) : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Objeto */}
                    <div className="min-w-0 pr-3">
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.titulo_contrato || c.objeto || 'Sin objeto'}</p>
                    </div>

                    {/* Proveedor */}
                    <p className="text-xs text-gray-500 truncate pr-3">{c.proveedor_nombre || '-'}</p>

                    {/* Plazo */}
                    <div>
                      <p className="text-xs font-semibold text-gray-700">{formatPlazo(c)}</p>
                      {dias !== null && dias >= 0 && (
                        <p className="text-[10px] text-gray-400">{dias}d restantes</p>
                      )}
                    </div>

                    {/* Valor */}
                    <div className="min-w-0">
                      {valor ? (
                        <p className="text-sm font-bold text-gray-800 truncate">
                          <span className="text-[10px] font-semibold text-gray-400 mr-1">{valor.moneda}</span>
                          {valor.valor}
                        </p>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                      <AlertaDesfase contrato={c} />
                    </div>

                    {/* Estado + accion */}
                    <div className="flex flex-col gap-1.5 items-start" onClick={e => e.stopPropagation()}>
                      <EstadoContrato contrato={c} />
                      <button
                        onClick={() => onVerDetalle(c.id)}
                        className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: BRAND }}
                      >
                        Ver detalle <ArrowRight size={10} />
                      </button>
                    </div>
                  </div>

                  {/* MOVIL */}
                  <div
                    className="flex lg:hidden items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onVerDetalle(c.id)}
                  >
                    <div className="w-0.5 h-full min-h-[48px] rounded-full shrink-0 mt-1" style={{ backgroundColor: accentColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[10px] font-black" style={{ color: BRAND }}>{c.codigo}</span>
                        <EstadoContrato contrato={c} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{c.titulo_contrato || c.objeto || 'Sin objeto'}</p>
                      <p className="text-xs text-gray-500 truncate">{c.proveedor_nombre || '-'}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {valor && <span className="font-semibold text-gray-700">{valor.moneda} {valor.valor}</span>}
                        <span>{formatPlazo(c)}</span>
                      </div>
                      <AlertaDesfase contrato={c} />
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onVerDetalle(c.id); }}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white mt-1"
                      style={{ backgroundColor: BRAND }}
                    >
                      Ver <ArrowRight size={11} />
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
