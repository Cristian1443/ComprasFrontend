import React, { useState, useEffect, useCallback } from 'react';
import {
  CalendarDays, Building2, DollarSign, TrendingUp,
  AlertTriangle, CheckCircle2, Plus, RefreshCw,
  Loader2, Edit2, Save, X, Clock,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const GERENCIAS_FINANCIERA = [
  'Gerencia Administrativa y Financiera',
  'Gerencia de Mercadeo y Comunicaciones',
  'Gerencia de Promocion e Inversion',
  'Gerencia de Apoyo Estrategico',
  'Gerencia Bureau de Convenciones',
];

const fmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

interface PresupuestoGerencia {
  id?: string;
  gerencia_nombre: string;
  vigencia: number;
  monto_total: number;
  comprometido: number;  // firme: finalizado/contratado
  certificado: number;   // CDP emitido, aún en trámite
  disponible: number;    // total − comprometido − certificado
}

type SemaforoColor = 'green' | 'amber' | 'red' | 'gray';

function getSemaforo(total: number, disponible: number): { color: SemaforoColor; label: string; pct: number } {
  if (total === 0) return { color: 'gray', label: 'Sin asignación', pct: 0 };
  if (disponible <= 0) return { color: 'red', label: 'Sin fondos', pct: 0 };
  const pct = (disponible / total) * 100;
  if (pct < 10) return { color: 'red', label: 'Crítico', pct };
  if (pct < 30) return { color: 'amber', label: 'Moderado', pct };
  return { color: 'green', label: 'Disponible', pct };
}

const COLORS: Record<SemaforoColor, { bg: string; text: string; border: string; badge: string; dot: string; bar: string }> = {
  green: {
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200',
    badge: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    dot: 'bg-emerald-500', bar: 'bg-emerald-500',
  },
  amber: {
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200',
    badge: 'bg-amber-100 text-amber-800 border border-amber-300',
    dot: 'bg-amber-500', bar: 'bg-amber-500',
  },
  red: {
    bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200',
    badge: 'bg-red-100 text-red-800 border border-red-300',
    dot: 'bg-red-500', bar: 'bg-red-500',
  },
  gray: {
    bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-200',
    badge: 'bg-slate-100 text-slate-500 border border-slate-200',
    dot: 'bg-slate-300', bar: 'bg-slate-300',
  },
};

export function PresupuestoVigencia() {
  const currentYear = new Date().getFullYear();
  const [vigencia, setVigencia] = useState<number>(currentYear);
  const [presupuestos, setPresupuestos] = useState<PresupuestoGerencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formGerencia, setFormGerencia] = useState('');
  const [formMonto, setFormMonto] = useState('');
  const [procesando, setProcesando] = useState(false);

  const cargarPresupuestos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await fetch(`${API_URL}/api/financiera/presupuesto-vigencia?vigencia=${vigencia}`);
      if (res.ok) {
        const data = await res.json();
        // pg devuelve bigint como string → parsear a número
        setPresupuestos(
          Array.isArray(data)
            ? data.map((p: any) => ({
                ...p,
                monto_total: Number(p.monto_total),
                comprometido: Number(p.comprometido),
                certificado: Number(p.certificado),
                disponible: Number(p.disponible),
              }))
            : []
        );
      } else {
        setPresupuestos([]);
      }
    } catch {
      setPresupuestos([]);
    } finally {
      setCargando(false);
    }
  }, [vigencia]);

  useEffect(() => { cargarPresupuestos(); }, [cargarPresupuestos]);

  const abrirEdicion = (p: PresupuestoGerencia) => {
    setFormGerencia(p.gerencia_nombre);
    setFormMonto(p.monto_total > 0 ? String(p.monto_total) : '');
    setShowForm(true);
  };

  const guardar = async () => {
    if (!formGerencia) { alert('Seleccione una gerencia.'); return; }
    const monto = parseInt(formMonto.replace(/[^0-9]/g, ''), 10);
    if (!monto || monto <= 0) { alert('Ingrese un monto válido en COP.'); return; }
    setProcesando(true);
    try {
      const res = await fetch(`${API_URL}/api/financiera/presupuesto-vigencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vigencia, gerencia_nombre: formGerencia, monto_total: monto }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormGerencia('');
        setFormMonto('');
        await cargarPresupuestos();
      } else {
        const err = await res.json().catch(() => ({}));
        alert((err as any).error || 'Error al guardar.');
      }
    } catch {
      alert('Error de conexión.');
    } finally {
      setProcesando(false);
    }
  };

  const gerenciasMap = new Map(presupuestos.map((p) => [p.gerencia_nombre, p]));
  const todas: PresupuestoGerencia[] = GERENCIAS_FINANCIERA.map(
    (n) => gerenciasMap.get(n) ?? { gerencia_nombre: n, vigencia, monto_total: 0, comprometido: 0, certificado: 0, disponible: 0 }
  );

  const totalAsignado = todas.reduce((s, p) => s + p.monto_total, 0);
  const totalComprometido = todas.reduce((s, p) => s + p.comprometido, 0);
  const totalCertificado = todas.reduce((s, p) => s + p.certificado, 0);
  const totalDisponible = todas.reduce((s, p) => s + p.disponible, 0);
  const pctComprometido = totalAsignado > 0 ? (totalComprometido / totalAsignado) * 100 : 0;
  const pctCertificado = totalAsignado > 0 ? (totalCertificado / totalAsignado) * 100 : 0;

  return (
    <div className="ux-page p-6 lg:p-8 space-y-6 animate-in fade-in duration-700 min-h-full" style={{ fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-3 bg-emerald-50 rounded-2xl">
              <CalendarDays className="text-emerald-700" size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">
              Presupuesto por Vigencia
            </h1>
          </div>
          <p className="text-slate-500 font-medium italic mt-1 ml-1">
            Control de la apropiación presupuestal por gerencia y año fiscal.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
            <CalendarDays size={15} className="text-emerald-600" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Vigencia</span>
            <select
              value={vigencia}
              onChange={(e) => setVigencia(Number(e.target.value))}
              className="text-sm font-black text-slate-800 bg-transparent border-none outline-none cursor-pointer ml-1"
            >
              {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => { setFormGerencia(''); setFormMonto(''); setShowForm(true); }}
            className="flex items-center gap-2 px-5 py-2.5 text-white rounded-2xl font-bold text-sm shadow-md transition-all hover:opacity-90 active:scale-95"
            style={{ backgroundColor: '#065F46' }}
          >
            <Plus size={16} /> Cargar Presupuesto
          </button>

          <button
            onClick={cargarPresupuestos}
            className="p-2.5 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-emerald-700 hover:border-emerald-300 shadow-sm transition-all"
            title="Actualizar datos"
          >
            <RefreshCw size={16} className={cargando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ── KPI Summary ── */}
      {!cargando && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Apropiación Total', value: totalAsignado, Icon: DollarSign, cls: 'text-slate-700', sub: null },
            {
              label: 'Comprometido',
              value: totalComprometido,
              Icon: CheckCircle2,
              cls: 'text-emerald-700',
              sub: 'Contratos iniciados',
            },
            {
              label: 'Certificado (CDP)',
              value: totalCertificado,
              Icon: Clock,
              cls: 'text-amber-700',
              sub: 'En trámite — puede liberarse',
            },
            {
              label: 'Disponible Real',
              value: totalDisponible,
              Icon: totalDisponible <= 0 ? AlertTriangle : CheckCircle2,
              cls: totalDisponible <= 0 ? 'text-red-700' : 'text-sky-700',
              sub: null,
            },
          ].map(({ label, value, Icon, cls, sub }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 truncate pr-2">{label}</p>
                <Icon size={16} className={`${cls} shrink-0`} />
              </div>
              <p className={`text-base font-black tracking-tight truncate ${cls}`}>{fmt.format(value)}</p>
              {sub && <p className="text-[10px] text-slate-400 mt-1 truncate">{sub}</p>}
              {!sub && totalAsignado > 0 && label !== 'Apropiación Total' && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {((value / totalAsignado) * 100).toFixed(1)}% del total
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Barra global segmentada ── */}
      {!cargando && totalAsignado > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-3">
            <span>Uso presupuestal global — Vigencia {vigencia}</span>
            <span className="text-slate-400">
              {(pctComprometido + pctCertificado).toFixed(1)}% en uso
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
            {/* Comprometido firme - verde */}
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(pctComprometido, 100)}%` }}
              title={`Comprometido: ${fmt.format(totalComprometido)}`}
            />
            {/* Certificado en trámite - ámbar */}
            <div
              className="h-full bg-amber-400 transition-all duration-700"
              style={{ width: `${Math.min(pctCertificado, 100 - pctComprometido)}%` }}
              title={`Certificado (CDP): ${fmt.format(totalCertificado)}`}
            />
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Comprometido firme</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> CDP en trámite</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200 inline-block" /> Disponible</span>
          </div>
        </div>
      )}

      {/* ── Formulario carga ── */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-emerald-200 shadow-lg p-6 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-slate-800 text-lg">
              Cargar Presupuesto — Vigencia {vigencia}
            </h3>
            <button
              onClick={() => { setShowForm(false); setFormGerencia(''); setFormMonto(''); }}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
            >
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Gerencia
              </label>
              <select
                value={formGerencia}
                onChange={(e) => setFormGerencia(e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Seleccione gerencia...</option>
                {GERENCIAS_FINANCIERA.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Monto Apropiado (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input
                  type="text"
                  value={formMonto}
                  onChange={(e) => setFormMonto(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="500000000"
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
              {formMonto && (
                <p className="text-[10px] text-slate-400 mt-1">
                  {fmt.format(parseInt(formMonto || '0', 10))}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={guardar}
                disabled={procesando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 active:scale-95"
                style={{ backgroundColor: '#065F46' }}
              >
                {procesando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Guardar
              </button>
              <button
                onClick={() => { setShowForm(false); setFormGerencia(''); setFormMonto(''); }}
                className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Loading ── */}
      {cargando && (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin" />
          <p className="text-slate-400 font-medium">Cargando presupuestos de vigencia {vigencia}...</p>
        </div>
      )}

      {/* ── Tarjetas de gerencias ── */}
      {!cargando && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {todas.map((p) => {
            const sem = getSemaforo(p.monto_total, p.disponible);
            const c = COLORS[sem.color];
            const pctComp = p.monto_total > 0 ? (p.comprometido / p.monto_total) * 100 : 0;
            const pctCert = p.monto_total > 0 ? (p.certificado / p.monto_total) * 100 : 0;

            return (
              <div
                key={p.gerencia_nombre}
                className={`bg-white rounded-2xl p-6 border-2 shadow-sm ${c.border} hover:shadow-md transition-shadow`}
              >
                {/* Encabezado tarjeta */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 pr-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Building2 size={14} className="text-slate-400 shrink-0" />
                      <h3 className="font-black text-slate-800 text-sm leading-snug">
                        {p.gerencia_nombre}
                      </h3>
                    </div>
                    <p className="text-[10px] text-slate-400 ml-5">Vigencia {vigencia}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`w-3.5 h-3.5 rounded-full ${c.dot} shadow-sm`} />
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${c.badge}`}>
                      {sem.label}
                    </span>
                    <button
                      onClick={() => abrirEdicion(p)}
                      className="p-1.5 text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all ml-1"
                      title="Editar presupuesto"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Valores — 4 columnas */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Asignado</p>
                    {p.monto_total > 0
                      ? <p className="text-xs font-black text-slate-700 leading-tight">{fmt.format(p.monto_total)}</p>
                      : <p className="text-[10px] text-slate-300 italic">Sin cargar</p>
                    }
                  </div>
                  <div className={`${c.bg} rounded-xl p-3`}>
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${c.text}`}>Disponible Real</p>
                    <p className={`text-xs font-black leading-tight ${c.text}`}>
                      {fmt.format(Math.max(p.disponible, 0))}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Comprometido</p>
                    <p className="text-xs font-black text-emerald-700 leading-tight">{fmt.format(p.comprometido)}</p>
                    <p className="text-[9px] text-emerald-500 mt-0.5">Contratos iniciados</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-1">CDP en Trámite</p>
                    <p className="text-xs font-black text-amber-700 leading-tight">{fmt.format(p.certificado)}</p>
                    <p className="text-[9px] text-amber-400 mt-0.5">Puede liberarse</p>
                  </div>
                </div>

                {/* Barra segmentada */}
                {p.monto_total > 0 ? (
                  <div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1.5">
                      <span className="font-bold uppercase tracking-wider">Uso presupuestal</span>
                      <span className="font-black">{(pctComp + pctCert).toFixed(1)}% en uso</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${Math.min(pctComp, 100)}%` }}
                        title={`Comprometido firme: ${fmt.format(p.comprometido)}`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all duration-700"
                        style={{ width: `${Math.min(pctCert, 100 - pctComp)}%` }}
                        title={`CDP en trámite: ${fmt.format(p.certificado)}`}
                      />
                    </div>
                    {sem.color === 'red' && sem.label === 'Sin fondos' && (
                      <p className="text-[9px] font-bold text-red-600 mt-1.5">
                        ⛔ Presupuesto agotado para esta gerencia.
                      </p>
                    )}
                    {sem.color === 'red' && sem.label !== 'Sin fondos' && (
                      <p className="text-[9px] font-bold text-red-600 mt-1.5">
                        ⚠ Solo queda {sem.pct.toFixed(1)}% del presupuesto.
                      </p>
                    )}
                    {sem.color === 'amber' && (
                      <p className="text-[9px] font-bold text-amber-600 mt-1.5">
                        ⚡ Queda {sem.pct.toFixed(1)}% — planifique nuevas certificaciones con cuidado.
                      </p>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="h-2 bg-slate-100 rounded-full" />
                    <p className="text-[9px] text-slate-300 italic mt-1.5 text-center">
                      No se ha cargado presupuesto para esta gerencia en {vigencia}.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
