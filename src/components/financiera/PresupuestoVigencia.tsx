import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  CalendarDays, Building2, DollarSign, AlertTriangle, CheckCircle2, Plus, RefreshCw,
  Loader2, Edit2, Save, X, Clock, Receipt, Paperclip, Ban, History, Wallet,
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { formatMilesInput, parseValorMoneda } from '../../lib/formatPresupuesto';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export const GERENCIAS_FINANCIERA = [
  'Gerencia Administrativa y Financiera',
  'Gerencia de Mercadeo y Comunicaciones',
  'Gerencia de Promocion e Inversion',
  'Gerencia de Apoyo Estrategico',
  'Gerencia Bureau de Convenciones',
];

const CONCEPTOS_RECONOCIMIENTO: { value: string; label: string }[] = [
  { value: 'transporte', label: 'Transporte' },
  { value: 'alimentacion', label: 'Alimentación' },
  { value: 'viaticos', label: 'Viáticos' },
  { value: 'papeleria', label: 'Papelería / Insumos' },
  { value: 'otro', label: 'Otro' },
];

const conceptoLabel = (v: string) => CONCEPTOS_RECONOCIMIENTO.find((c) => c.value === v)?.label || v;

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
  comprometido_vigencia_anterior: number; // reservas presupuestales / cuentas por pagar de años anteriores
  comprometido: number;  // firme: finalizado/contratado
  certificado: number;   // CDP emitido, aún en trámite
  reconocido_gasto: number; // gastos menores ya ejecutados (transporte, alimentación, etc.)
  disponible: number;    // total − reservas anteriores − comprometido − certificado − reconocido
  disponible_tramite: number; // asignado − comprometido − CDP en trámite − reconocido (no descuenta reservas)
}

interface ReconocimientoGasto {
  id: string;
  gerencia_nombre: string;
  vigencia: number;
  concepto: string;
  descripcion: string | null;
  monto: number;
  fecha_gasto: string;
  soporte_url: string | null;
  soporte_nombre: string | null;
  registrado_por_email: string | null;
  registrado_por_nombre: string | null;
  estado: 'activo' | 'anulado';
  motivo_anulacion: string | null;
  anulado_por_email: string | null;
  anulado_en: string | null;
  creado_en: string;
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

const emptyFormPresupuesto = { gerencia: '', monto: '', reservaAnterior: '' };

const emptyFormReco = { concepto: '', descripcion: '', monto: '', fecha_gasto: '', soporteNombre: '', soporteUrl: '' };

/** Overlay modal genérico — header con ícono/título/cierre, click en backdrop cierra. */
function ModalShell({
  icono: Icono, titulo, subtitulo, onClose, children, maxWidth = 'max-w-2xl',
}: {
  icono: React.ComponentType<{ size?: number; className?: string }>;
  titulo: string;
  subtitulo?: string;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(15,23,42,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-y-auto`} style={{ fontFamily: 'Gabarito, sans-serif' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10" style={{ backgroundColor: '#065F46' }}>
          <div className="flex items-center gap-2 min-w-0">
            <Icono size={18} className="text-white shrink-0" />
            <div className="min-w-0">
              <h3 className="font-black text-white leading-tight truncate">{titulo}</h3>
              {subtitulo && <p className="text-[11px] text-emerald-100 truncate">{subtitulo}</p>}
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:opacity-70 transition-opacity shrink-0 ml-2">
            <X size={20} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function PresupuestoVigencia() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username || '';
  const userNombre = accounts[0]?.name || '';

  const currentYear = new Date().getFullYear();
  const [vigencia, setVigencia] = useState<number>(currentYear);
  const [presupuestos, setPresupuestos] = useState<PresupuestoGerencia[]>([]);
  const [cargando, setCargando] = useState(true);

  // ── Modal Cargar/Editar Presupuesto ──
  const [showForm, setShowForm] = useState(false);
  const [formPresupuesto, setFormPresupuesto] = useState({ ...emptyFormPresupuesto });
  const [procesando, setProcesando] = useState(false);
  const [errorForm, setErrorForm] = useState<string | null>(null);

  // ── Modal Reconocer Gasto ──
  const [gerenciaReco, setGerenciaReco] = useState<string | null>(null);
  const [reconocimientos, setReconocimientos] = useState<ReconocimientoGasto[]>([]);
  const [cargandoReco, setCargandoReco] = useState(false);
  const [formReco, setFormReco] = useState({ ...emptyFormReco });
  const [subiendoSoporte, setSubiendoSoporte] = useState(false);
  const [guardandoReco, setGuardandoReco] = useState(false);
  const [errorReco, setErrorReco] = useState<string | null>(null);
  const [anulandoId, setAnulandoId] = useState<string | null>(null);
  const [motivoAnulacion, setMotivoAnulacion] = useState('');
  const [procesandoAnulacion, setProcesandoAnulacion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cargarPresupuestos = useCallback(async () => {
    setCargando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/financiera/presupuesto-vigencia?vigencia=${vigencia}`);
      if (res.ok) {
        const data = await res.json();
        // pg devuelve bigint como string → parsear a número
        setPresupuestos(
          Array.isArray(data)
            ? data.map((p: any) => ({
                ...p,
                monto_total: Number(p.monto_total),
                comprometido_vigencia_anterior: Number(p.comprometido_vigencia_anterior ?? 0),
                comprometido: Number(p.comprometido),
                certificado: Number(p.certificado),
                reconocido_gasto: Number(p.reconocido_gasto ?? 0),
                disponible: Number(p.disponible),
                disponible_tramite: Number(p.disponible_tramite),
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

  // ── Acciones: Cargar / Editar Presupuesto ──
  const abrirEdicion = (p: PresupuestoGerencia) => {
    setFormPresupuesto({
      gerencia: p.gerencia_nombre,
      monto: p.monto_total > 0 ? formatMilesInput(String(p.monto_total)) : '',
      reservaAnterior: p.comprometido_vigencia_anterior > 0 ? formatMilesInput(String(p.comprometido_vigencia_anterior)) : '',
    });
    setErrorForm(null);
    setShowForm(true);
  };

  const cerrarFormPresupuesto = () => {
    setShowForm(false);
    setFormPresupuesto({ ...emptyFormPresupuesto });
    setErrorForm(null);
  };

  const guardarPresupuesto = async () => {
    if (!formPresupuesto.gerencia) { setErrorForm('Seleccione una gerencia.'); return; }
    const monto = parseValorMoneda(formPresupuesto.monto);
    if (!monto || monto <= 0) { setErrorForm('Ingrese un monto apropiado válido en COP.'); return; }
    const reservaAnterior = parseValorMoneda(formPresupuesto.reservaAnterior) || 0;
    if (reservaAnterior > monto) {
      setErrorForm('Las reservas de vigencias anteriores no pueden superar el monto apropiado total.');
      return;
    }
    setProcesando(true);
    setErrorForm(null);
    try {
      const res = await apiFetch(`${API_URL}/api/financiera/presupuesto-vigencia`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vigencia,
          gerencia_nombre: formPresupuesto.gerencia,
          monto_total: monto,
          comprometido_vigencia_anterior: reservaAnterior,
        }),
      });
      if (res.ok) {
        cerrarFormPresupuesto();
        await cargarPresupuestos();
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorForm((err as any).error || 'Error al guardar.');
      }
    } catch {
      setErrorForm('Error de conexión.');
    } finally {
      setProcesando(false);
    }
  };

  // ── Acciones: Reconocer Gasto ──
  const cargarReconocimientos = useCallback(async (gerenciaNombre: string) => {
    setCargandoReco(true);
    try {
      const res = await apiFetch(
        `${API_URL}/api/financiera/reconocimientos-gasto?vigencia=${vigencia}&gerencia_nombre=${encodeURIComponent(gerenciaNombre)}`
      );
      const data = res.ok ? await res.json() : [];
      setReconocimientos(
        Array.isArray(data) ? data.map((r: any) => ({ ...r, monto: Number(r.monto) })) : []
      );
    } catch {
      setReconocimientos([]);
    } finally {
      setCargandoReco(false);
    }
  }, [vigencia]);

  const abrirReconocimiento = (gerenciaNombre: string) => {
    setGerenciaReco(gerenciaNombre);
    setFormReco({ ...emptyFormReco, fecha_gasto: new Date().toISOString().slice(0, 10) });
    setErrorReco(null);
    setAnulandoId(null);
    cargarReconocimientos(gerenciaNombre);
  };

  const cerrarReconocimiento = () => {
    setGerenciaReco(null);
    setReconocimientos([]);
    setFormReco({ ...emptyFormReco });
    setErrorReco(null);
    setAnulandoId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const subirSoporte = async (file: File) => {
    setSubiendoSoporte(true);
    setErrorReco(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await apiFetch(`${API_URL}/api/financiera/reconocimientos-gasto/upload`, { method: 'POST', body: fd });
      if (r.ok) {
        const d = await r.json();
        setFormReco((prev) => ({ ...prev, soporteNombre: file.name, soporteUrl: `${API_URL}${d.url}` }));
      } else {
        setErrorReco('Error al subir el soporte. Intenta de nuevo.');
      }
    } catch {
      setErrorReco('Error de conexión al subir el soporte.');
    } finally {
      setSubiendoSoporte(false);
    }
  };

  const guardarReconocimiento = async () => {
    if (!gerenciaReco) return;
    if (!formReco.concepto) { setErrorReco('Seleccione el concepto del gasto.'); return; }
    if (!formReco.fecha_gasto) { setErrorReco('Ingrese la fecha del gasto.'); return; }
    const monto = parseValorMoneda(formReco.monto);
    if (!monto || monto <= 0) { setErrorReco('Ingrese un monto válido mayor a cero.'); return; }

    setGuardandoReco(true);
    setErrorReco(null);
    try {
      const res = await apiFetch(`${API_URL}/api/financiera/reconocimientos-gasto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gerencia_nombre: gerenciaReco,
          vigencia,
          concepto: formReco.concepto,
          descripcion: formReco.descripcion || null,
          monto,
          fecha_gasto: formReco.fecha_gasto,
          soporte_url: formReco.soporteUrl || null,
          soporte_nombre: formReco.soporteNombre || null,
          registrado_por_email: userEmail || null,
          registrado_por_nombre: userNombre || null,
        }),
      });
      if (res.ok) {
        setFormReco({ ...emptyFormReco, fecha_gasto: new Date().toISOString().slice(0, 10) });
        if (fileInputRef.current) fileInputRef.current.value = '';
        await Promise.all([cargarReconocimientos(gerenciaReco), cargarPresupuestos()]);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorReco((err as any).error || 'Error al registrar el gasto.');
      }
    } catch {
      setErrorReco('Error de conexión.');
    } finally {
      setGuardandoReco(false);
    }
  };

  const confirmarAnulacion = async (id: string) => {
    if (!motivoAnulacion.trim()) { setErrorReco('Ingrese el motivo de anulación.'); return; }
    if (!gerenciaReco) return;
    setProcesandoAnulacion(true);
    setErrorReco(null);
    try {
      const res = await apiFetch(`${API_URL}/api/financiera/reconocimientos-gasto/${id}/anular`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivoAnulacion.trim(), anulado_por_email: userEmail || null }),
      });
      if (res.ok) {
        setAnulandoId(null);
        setMotivoAnulacion('');
        await Promise.all([cargarReconocimientos(gerenciaReco), cargarPresupuestos()]);
      } else {
        const err = await res.json().catch(() => ({}));
        setErrorReco((err as any).error || 'Error al anular el reconocimiento.');
      }
    } catch {
      setErrorReco('Error de conexión.');
    } finally {
      setProcesandoAnulacion(false);
    }
  };

  const gerenciasMap = new Map(presupuestos.map((p) => [p.gerencia_nombre, p]));
  const todas: PresupuestoGerencia[] = GERENCIAS_FINANCIERA.map(
    (n) => gerenciasMap.get(n) ?? {
      gerencia_nombre: n, vigencia, monto_total: 0,
      comprometido_vigencia_anterior: 0, comprometido: 0, certificado: 0, reconocido_gasto: 0, disponible: 0, disponible_tramite: 0,
    }
  );

  const totalAsignado = todas.reduce((s, p) => s + p.monto_total, 0);
  const totalComprometido = todas.reduce((s, p) => s + p.comprometido, 0);
  const totalCertificado = todas.reduce((s, p) => s + p.certificado, 0);
  const totalReconocido = todas.reduce((s, p) => s + p.reconocido_gasto, 0);
  const totalDisponible = todas.reduce((s, p) => s + p.disponible, 0);
  const totalDisponibleTramite = todas.reduce((s, p) => s + p.disponible_tramite, 0);
  const pctComprometido = totalAsignado > 0 ? (totalComprometido / totalAsignado) * 100 : 0;
  const pctCertificado = totalAsignado > 0 ? (totalCertificado / totalAsignado) * 100 : 0;
  const pctReconocido = totalAsignado > 0 ? (totalReconocido / totalAsignado) * 100 : 0;

  const gerenciaRecoData = gerenciaReco ? gerenciasMap.get(gerenciaReco) : undefined;

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO', { timeZone: 'UTC' });
  };

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
            onClick={() => { setFormPresupuesto({ ...emptyFormPresupuesto }); setErrorForm(null); setShowForm(true); }}
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { label: 'Apropiación Total', value: totalAsignado, Icon: DollarSign, cls: 'text-slate-700', sub: null },
            {
              label: 'Comprometido-RP',
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
              label: 'Gastos Reconocidos',
              value: totalReconocido,
              Icon: Receipt,
              cls: 'text-violet-700',
              sub: 'Gastos menores ejecutados',
            },
            {
              label: 'Disponible Total',
              value: totalDisponible,
              Icon: totalDisponible <= 0 ? AlertTriangle : CheckCircle2,
              cls: totalDisponible <= 0 ? 'text-red-700' : 'text-sky-700',
              sub: null,
            },
            {
              label: 'Disponible para Trámite',
              value: totalDisponibleTramite,
              Icon: totalDisponibleTramite <= 0 ? AlertTriangle : CheckCircle2,
              cls: totalDisponibleTramite <= 0 ? 'text-red-700' : 'text-sky-700',
              sub: 'No descuenta reservas ant.',
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
              {(pctComprometido + pctCertificado + pctReconocido).toFixed(1)}% en uso
            </span>
          </div>
          <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
            {/* Comprometido firme - verde */}
            <div
              className="h-full bg-emerald-500 transition-all duration-700"
              style={{ width: `${Math.min(pctComprometido, 100)}%` }}
              title={`Comprometido-RP: ${fmt.format(totalComprometido)}`}
            />
            {/* Certificado en trámite - ámbar */}
            <div
              className="h-full bg-amber-400 transition-all duration-700"
              style={{ width: `${Math.min(pctCertificado, 100 - pctComprometido)}%` }}
              title={`Certificado (CDP): ${fmt.format(totalCertificado)}`}
            />
            {/* Reconocido - violeta */}
            <div
              className="h-full bg-violet-400 transition-all duration-700"
              style={{ width: `${Math.min(pctReconocido, Math.max(0, 100 - pctComprometido - pctCertificado))}%` }}
              title={`Gastos reconocidos: ${fmt.format(totalReconocido)}`}
            />
          </div>
          <div className="flex flex-wrap gap-4 mt-2 text-[10px] text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-400 inline-block" /> Reservas vig. anterior</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Comprometido-RP firme</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> CDP en trámite</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" /> Gastos reconocidos</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-100 border border-slate-200 inline-block" /> Disponible</span>
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
            const pctReserva = p.monto_total > 0 ? (p.comprometido_vigencia_anterior / p.monto_total) * 100 : 0;
            const pctComp = p.monto_total > 0 ? (p.comprometido / p.monto_total) * 100 : 0;
            const pctCert = p.monto_total > 0 ? (p.certificado / p.monto_total) * 100 : 0;
            const pctReco = p.monto_total > 0 ? (p.reconocido_gasto / p.monto_total) * 100 : 0;

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
                      onClick={() => abrirReconocimiento(p.gerencia_nombre)}
                      className="p-1.5 text-slate-300 hover:text-violet-700 hover:bg-violet-50 rounded-lg transition-all ml-1"
                      title="Reconocer gasto"
                    >
                      <Receipt size={13} />
                    </button>
                    <button
                      onClick={() => abrirEdicion(p)}
                      className="p-1.5 text-slate-300 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
                      title="Editar presupuesto"
                    >
                      <Edit2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Valores — grid de datos */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Asignado</p>
                    {p.monto_total > 0
                      ? <p className="text-xs font-black text-slate-700 leading-tight">{fmt.format(p.monto_total)}</p>
                      : <p className="text-[10px] text-slate-300 italic">Sin cargar</p>
                    }
                  </div>
                  <div className={`${c.bg} rounded-xl p-3`}>
                    <p className={`text-[9px] font-black uppercase tracking-wider mb-1 ${c.text}`}>Disponible Total</p>
                    <p className={`text-xs font-black leading-tight ${c.text}`}>
                      {fmt.format(Math.max(p.disponible, 0))}
                    </p>
                    {(p.comprometido_vigencia_anterior > 0 || p.reconocido_gasto > 0) && (
                      <p className="text-[8px] text-orange-500 font-semibold mt-1 leading-tight">
                        ↳ ya descontadas reservas / gastos reconocidos
                      </p>
                    )}
                  </div>
                  <div className="bg-emerald-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-wider mb-1">Comprometido-RP</p>
                    <p className="text-xs font-black text-emerald-700 leading-tight">{fmt.format(p.comprometido)}</p>
                    <p className="text-[9px] text-emerald-500 mt-0.5">Contratos iniciados</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-3">
                    <p className="text-[9px] font-black text-amber-500 uppercase tracking-wider mb-1">CDP en Trámite</p>
                    <p className="text-xs font-black text-amber-700 leading-tight">{fmt.format(p.certificado)}</p>
                    <p className="text-[9px] text-amber-400 mt-0.5">Puede liberarse</p>
                  </div>
                </div>

                {/* Disponible para trámite — asignado − comprometido firme − CDP en trámite − reconocido (no descuenta reservas) */}
                <div className="bg-sky-50 border border-sky-200 rounded-xl px-3 py-2 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[9px] font-black text-sky-600 uppercase tracking-wider">
                        Disponible para Trámite
                      </p>
                      <p className="text-xs font-black text-sky-700 truncate">
                        {fmt.format(Math.max(p.disponible_tramite, 0))}
                      </p>
                    </div>
                  </div>
                  <p className="text-[9px] text-sky-600 font-semibold mt-1.5 pl-5">
                    Asignado − comprometido firme − CDP en trámite − gastos reconocidos (no descuenta reservas de vigencias anteriores): lo máximo que aún se podría certificar en este rubro.
                  </p>
                </div>

                {/* Reservas vigencias anteriores — fila completa, solo si existe */}
                {p.comprometido_vigencia_anterior > 0 && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-orange-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-orange-500 uppercase tracking-wider">
                          Reservas Vigencias Anteriores
                        </p>
                        <p className="text-xs font-black text-orange-700 truncate">
                          {fmt.format(p.comprometido_vigencia_anterior)}
                        </p>
                      </div>
                      <p className="text-[9px] text-orange-400 shrink-0 text-right">
                        Contratos año anterior<br />
                        <span className="font-bold">{pctReserva.toFixed(1)}% de la apropiación</span>
                      </p>
                    </div>
                    <p className="text-[9px] text-orange-600 font-semibold mt-1.5 pl-5">
                      ⚠ Este monto ya está descontado del Disponible Total — no es plata libre.
                    </p>
                  </div>
                )}

                {/* Gastos reconocidos — fila completa, solo si existe */}
                {p.reconocido_gasto > 0 && (
                  <div className="bg-violet-50 border border-violet-200 rounded-xl px-3 py-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] font-black text-violet-500 uppercase tracking-wider">
                          Gastos Reconocidos
                        </p>
                        <p className="text-xs font-black text-violet-700 truncate">
                          {fmt.format(p.reconocido_gasto)}
                        </p>
                      </div>
                      <button
                        onClick={() => abrirReconocimiento(p.gerencia_nombre)}
                        className="text-[9px] font-bold text-violet-500 hover:text-violet-700 flex items-center gap-1 shrink-0"
                      >
                        <History size={11} /> Ver historial
                      </button>
                    </div>
                    <p className="text-[9px] text-violet-600 font-semibold mt-1.5 pl-5">
                      Gastos menores ya ejecutados (transporte, alimentación, etc.) — ya descontados del disponible.
                    </p>
                  </div>
                )}

                {/* Barra segmentada */}
                {p.monto_total > 0 ? (
                  <div>
                    <div className="flex justify-between items-center text-[9px] text-slate-400 mb-1.5">
                      <span className="font-bold uppercase tracking-wider">Uso presupuestal</span>
                      <span className="font-black">{(pctReserva + pctComp + pctCert + pctReco).toFixed(1)}% en uso</span>
                    </div>
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                      {/* Reservas vigencias anteriores - naranja */}
                      {pctReserva > 0 && (
                        <div
                          className="h-full bg-orange-400 transition-all duration-700"
                          style={{ width: `${Math.min(pctReserva, 100)}%` }}
                          title={`Reservas vigencias anteriores: ${fmt.format(p.comprometido_vigencia_anterior)}`}
                        />
                      )}
                      <div
                        className="h-full bg-emerald-500 transition-all duration-700"
                        style={{ width: `${Math.min(pctComp, Math.max(0, 100 - pctReserva))}%` }}
                        title={`Comprometido-RP firme: ${fmt.format(p.comprometido)}`}
                      />
                      <div
                        className="h-full bg-amber-400 transition-all duration-700"
                        style={{ width: `${Math.min(pctCert, Math.max(0, 100 - pctReserva - pctComp))}%` }}
                        title={`CDP en trámite: ${fmt.format(p.certificado)}`}
                      />
                      {pctReco > 0 && (
                        <div
                          className="h-full bg-violet-400 transition-all duration-700"
                          style={{ width: `${Math.min(pctReco, Math.max(0, 100 - pctReserva - pctComp - pctCert))}%` }}
                          title={`Gastos reconocidos: ${fmt.format(p.reconocido_gasto)}`}
                        />
                      )}
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
                    <button
                      onClick={() => abrirEdicion(p)}
                      className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-all"
                    >
                      <Plus size={12} /> Cargar presupuesto
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Cargar / Editar Presupuesto ── */}
      {showForm && (
        <ModalShell
          icono={Wallet}
          titulo={`Cargar Presupuesto — Vigencia ${vigencia}`}
          onClose={cerrarFormPresupuesto}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4">
            {/* Gerencia */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Gerencia
              </label>
              <select
                value={formPresupuesto.gerencia}
                onChange={(e) => setFormPresupuesto((prev) => ({ ...prev, gerencia: e.target.value }))}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="">Seleccione gerencia...</option>
                {GERENCIAS_FINANCIERA.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>

            {/* Monto Apropiado */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Monto Apropiado (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formPresupuesto.monto}
                  onChange={(e) => setFormPresupuesto((prev) => ({ ...prev, monto: formatMilesInput(e.target.value) }))}
                  placeholder="500.000.000"
                  autoComplete="off"
                  className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 font-mono"
                />
              </div>
              {formPresupuesto.monto && (
                <p className="text-[10px] text-slate-400 mt-1">{fmt.format(parseValorMoneda(formPresupuesto.monto))}</p>
              )}
            </div>

            {/* Reservas de vigencias anteriores */}
            <div>
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                Reservas Vigencias Anteriores (COP)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formPresupuesto.reservaAnterior}
                  onChange={(e) => setFormPresupuesto((prev) => ({ ...prev, reservaAnterior: formatMilesInput(e.target.value) }))}
                  placeholder="0"
                  autoComplete="off"
                  className="w-full pl-7 pr-3 py-2.5 border border-orange-200 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-300 font-mono bg-orange-50"
                />
              </div>
              {formPresupuesto.reservaAnterior && parseValorMoneda(formPresupuesto.reservaAnterior) > 0 ? (
                <p className="text-[10px] text-orange-500 mt-1 font-semibold">
                  {fmt.format(parseValorMoneda(formPresupuesto.reservaAnterior))} ya comprometido
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 mt-1">
                  Contratos año anterior que consumen esta vigencia
                </p>
              )}
            </div>

            {errorForm && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errorForm}</div>}

            {/* Botones */}
            <div className="flex gap-2 pt-1">
              <button
                onClick={cerrarFormPresupuesto}
                className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={guardarPresupuesto}
                disabled={procesando}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 active:scale-95"
                style={{ backgroundColor: '#065F46' }}
              >
                {procesando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {procesando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Modal: Reconocer Gasto ── */}
      {gerenciaReco && (
        <ModalShell
          icono={Receipt}
          titulo="Reconocer Gasto"
          subtitulo={`${gerenciaReco} · Vigencia ${vigencia}`}
          onClose={cerrarReconocimiento}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5">
            {gerenciaRecoData && gerenciaRecoData.monto_total > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider mb-1">Disponible actual</p>
                  <p className="text-sm font-black text-slate-700">{fmt.format(Math.max(gerenciaRecoData.disponible, 0))}</p>
                </div>
                <div className="bg-violet-50 rounded-xl p-3">
                  <p className="text-[9px] font-black text-violet-500 uppercase tracking-wider mb-1">Reconocido acumulado</p>
                  <p className="text-sm font-black text-violet-700">{fmt.format(gerenciaRecoData.reconocido_gasto)}</p>
                </div>
              </div>
            )}

            {/* Formulario nuevo reconocimiento */}
            <div className="border border-slate-200 rounded-xl p-4 space-y-3">
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Nuevo gasto reconocido</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Concepto <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formReco.concepto}
                    onChange={(e) => setFormReco((prev) => ({ ...prev, concepto: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  >
                    <option value="">Seleccione...</option>
                    {CONCEPTOS_RECONOCIMIENTO.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                    Fecha del gasto <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={formReco.fecha_gasto}
                    onChange={(e) => setFormReco((prev) => ({ ...prev, fecha_gasto: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Monto (COP) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={formReco.monto}
                    onChange={(e) => setFormReco((prev) => ({ ...prev, monto: formatMilesInput(e.target.value) }))}
                    placeholder="150.000"
                    autoComplete="off"
                    className="w-full pl-7 pr-3 py-2.5 border border-slate-300 rounded-xl text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono"
                  />
                </div>
                {formReco.monto && (
                  <p className="text-[10px] text-slate-400 mt-1">{fmt.format(parseValorMoneda(formReco.monto))}</p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Descripción <span className="text-slate-400 normal-case font-semibold">(opcional)</span>
                </label>
                <textarea
                  value={formReco.descripcion}
                  onChange={(e) => setFormReco((prev) => ({ ...prev, descripcion: e.target.value }))}
                  rows={2}
                  placeholder="Detalle del gasto..."
                  className="w-full px-3 py-2.5 border border-slate-300 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                />
              </div>

              {/* Soporte */}
              <div>
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">
                  Soporte <span className="text-slate-400 normal-case font-semibold">(opcional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => { const file = e.target.files?.[0]; if (file) subirSoporte(file); }}
                />
                {formReco.soporteNombre ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-violet-200 rounded-lg bg-violet-50">
                    <Paperclip size={14} className="text-violet-500 shrink-0" />
                    <a href={formReco.soporteUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-violet-700 truncate flex-1 hover:underline">
                      {formReco.soporteNombre}
                    </a>
                    <button
                      type="button"
                      onClick={() => { setFormReco((prev) => ({ ...prev, soporteNombre: '', soporteUrl: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-violet-400 hover:text-violet-600"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={subiendoSoporte}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-slate-300 rounded-lg text-sm text-slate-500 hover:border-violet-400 hover:text-violet-600 hover:bg-violet-50 transition-all w-full disabled:opacity-60"
                  >
                    {subiendoSoporte ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    {subiendoSoporte ? 'Subiendo soporte...' : 'Adjuntar soporte (PDF/imagen)'}
                  </button>
                )}
              </div>

              {errorReco && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{errorReco}</div>}

              <div className="flex gap-2 pt-1">
                <button
                  onClick={cerrarReconocimiento}
                  className="flex-1 px-4 py-2.5 border border-slate-300 rounded-xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-all"
                >
                  Cerrar
                </button>
                <button
                  onClick={guardarReconocimiento}
                  disabled={guardandoReco || subiendoSoporte}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-60 active:scale-95"
                  style={{ backgroundColor: '#6D28D9' }}
                >
                  {guardandoReco ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {guardandoReco ? 'Registrando...' : 'Registrar gasto'}
                </button>
              </div>
            </div>

            {/* Historial */}
            <div>
              <p className="text-xs font-black text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <History size={13} /> Historial de reconocimientos
              </p>
              {cargandoReco ? (
                <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
              ) : reconocimientos.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4 text-center">Aún no hay gastos reconocidos para esta gerencia.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {reconocimientos.map((r) => (
                    <div
                      key={r.id}
                      className={`rounded-xl border px-3 py-2.5 ${r.estado === 'anulado' ? 'bg-slate-50 border-slate-200 opacity-70' : 'bg-white border-slate-200'}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm font-black ${r.estado === 'anulado' ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                              {fmt.format(r.monto)}
                            </span>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                              {conceptoLabel(r.concepto)}
                            </span>
                            {r.estado === 'anulado' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-500">Anulado</span>
                            )}
                          </div>
                          {r.descripcion && <p className="text-xs text-slate-500 mt-1">{r.descripcion}</p>}
                          <p className="text-[10px] text-slate-400 mt-1">
                            {formatDate(r.fecha_gasto)}
                            {r.registrado_por_nombre || r.registrado_por_email ? ` · registrado por ${r.registrado_por_nombre || r.registrado_por_email}` : ''}
                          </p>
                          {r.soporte_url && (
                            <a href={r.soporte_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[10px] text-violet-600 hover:underline font-semibold mt-1">
                              <Paperclip size={10} /> {r.soporte_nombre || 'Ver soporte'}
                            </a>
                          )}
                          {r.estado === 'anulado' && r.motivo_anulacion && (
                            <p className="text-[10px] text-red-500 mt-1 italic">Motivo de anulación: {r.motivo_anulacion}</p>
                          )}
                        </div>
                        {r.estado === 'activo' && anulandoId !== r.id && (
                          <button
                            onClick={() => { setAnulandoId(r.id); setMotivoAnulacion(''); setErrorReco(null); }}
                            className="shrink-0 p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                            title="Anular reconocimiento"
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>

                      {anulandoId === r.id && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-100 space-y-2">
                          <textarea
                            value={motivoAnulacion}
                            onChange={(e) => setMotivoAnulacion(e.target.value)}
                            rows={2}
                            placeholder="Motivo de la anulación..."
                            className="w-full px-2.5 py-2 border border-red-200 rounded-lg text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setAnulandoId(null); setMotivoAnulacion(''); }}
                              className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-slate-600 font-bold text-[11px] hover:bg-slate-50 transition-all"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => confirmarAnulacion(r.id)}
                              disabled={procesandoAnulacion}
                              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg font-bold text-[11px] hover:bg-red-700 transition-all disabled:opacity-60"
                            >
                              {procesandoAnulacion ? <Loader2 size={12} className="animate-spin" /> : <Ban size={12} />}
                              Confirmar anulación
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </ModalShell>
      )}

    </div>
  );
}
