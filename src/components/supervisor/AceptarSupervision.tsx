import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, Plus, Trash2, Loader2, CheckCircle2, XCircle, Package, ClipboardList,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const BRAND = '#2f6fa3';
const CTA   = '#E84922';

interface Props {
  solicitudId: string;
  userEmail?: string;
  onAceptar: () => void;
  onBack: () => void;
}

const fmtCOP = (v: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);

export function AceptarSupervision({ solicitudId, userEmail, onAceptar, onBack }: Props) {
  const [contrato, setContrato] = useState<any | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Entregables: lista de ítems individuales
  const [entregables, setEntregables] = useState<string[]>(['']);

  // Informes de supervisión
  const [tieneInformes, setTieneInformes] = useState(false);
  const [numeroInformes, setNumeroInformes] = useState<number | ''>('');

  const [confirmRechazar, setConfirmRechazar] = useState(false);

  useEffect(() => {
    const url = `${API_BASE}/api/supervisor/contratos/${solicitudId}${userEmail ? `?email=${encodeURIComponent(userEmail)}` : ''}`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        setContrato(d);
        // Convertir texto existente a lista (una línea = un ítem)
        if (d.entregables) {
          const items = d.entregables.split('\n').map((s: string) => s.trim()).filter(Boolean);
          setEntregables(items.length ? items : ['']);
        }
        setTieneInformes(!!d.informes_supervision);
        setNumeroInformes(d.numero_informes || '');
      })
      .catch(() => setError('No se pudo cargar el contrato'))
      .finally(() => setCargando(false));
  }, [solicitudId, userEmail]);

  const getValorTexto = () => {
    if (!contrato) return '-';
    if (contrato.valor_moneda_cop_texto) return `COP ${contrato.valor_moneda_cop_texto}`;
    const n = contrato.valor_en_cop ?? contrato.valor_estimado;
    return n ? fmtCOP(Number(n)) : '-';
  };

  const getPlazoTexto = () => {
    if (!contrato) return '-';
    const m = contrato.plazo_ejecucion_meses ?? 0;
    const d = contrato.plazo_ejecucion_dias  ?? 0;
    if (m > 0 && d > 0) return `${m} meses y ${d} días`;
    if (m > 0) return `${m} ${m === 1 ? 'mes' : 'meses'}`;
    if (d > 0) return `${d} días`;
    return '-';
  };

  const addEntregable    = () => setEntregables(prev => [...prev, '']);
  const removeEntregable = (i: number) => setEntregables(prev => prev.filter((_, j) => j !== i));
  const updateEntregable = (i: number, val: string) =>
    setEntregables(prev => prev.map((x, j) => (j === i ? val : x)));

  const handleAceptar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const entregablesTexto = entregables.map(e => e.trim()).filter(Boolean).join('\n');
      const res = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          aceptada: true,
          entregables: entregablesTexto,
          informes_supervision: tieneInformes,
          numero_informes: tieneInformes ? (Number(numeroInformes) || 0) : 0,
        }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      onAceptar();
    } catch (e: any) {
      setError(e.message || 'No se pudo registrar la aceptación');
    } finally {
      setGuardando(false);
    }
  };

  const handleRechazar = async () => {
    setGuardando(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/aceptar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aceptada: false, entregables: '', documentos: [] }),
      });
      if (!res.ok) throw new Error('Error al guardar');
      onBack();
    } catch (e: any) {
      setError(e.message || 'No se pudo registrar el rechazo');
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 size={36} className="animate-spin" style={{ color: BRAND }} />
      </div>
    );
  }

  if (!contrato || contrato.error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-600 font-semibold">No se pudo cargar el contrato.</p>
        <button onClick={onBack} className="px-4 py-2 rounded-lg text-white font-bold" style={{ backgroundColor: BRAND }}>
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8" style={{ fontFamily: 'Gabarito, sans-serif' }}>

      {/* Header */}
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-gray-900 shrink-0"
        >
          <ArrowLeft size={18} /> Volver a contratos
        </button>
      </div>

      {/* Título de la solicitud */}
      <div
        className="rounded-xl p-5 mb-5 text-white"
        style={{ background: `linear-gradient(135deg, ${BRAND} 0%, #1f4e79 100%)` }}
      >
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-white/20 tracking-wider">
            {contrato.codigo}
          </span>
          <span className="text-xs opacity-75 uppercase tracking-wider">Aceptación de supervisión requerida</span>
        </div>
        <p className="text-sm opacity-80 mt-1">
          Revise los entregables, defina los documentos requeridos por carpeta y acepte formalmente
          la supervisión para iniciar la ejecución del contrato.
        </p>
      </div>

      {/* Datos del contrato */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6 shadow-sm">
        <div className="mb-4 pb-4 border-b border-gray-100">
          <span className="text-gray-500 block text-xs mb-0.5">Título de la solicitud</span>
          <span className="font-semibold text-gray-900 text-sm">{contrato.titulo_contrato || contrato.objeto || '-'}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Proveedor</span>
            <span className="font-semibold text-gray-800">
              {contrato.proveedor?.nombre_proveedor || contrato.proveedor?.datos_contacto || '-'}
            </span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Valor</span>
            <span className="font-semibold text-gray-800">{getValorTexto()}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Plazo</span>
            <span className="font-semibold text-gray-800">{getPlazoTexto()}</span>
          </div>
          <div>
            <span className="text-gray-500 block text-xs mb-0.5">Solicitante</span>
            <span className="font-semibold text-gray-800">{contrato.solicitante_nombre || '-'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

        {/* Entregables */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Package size={18} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>
              Entregables del contrato
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Agregue cada entregable que debe cumplir el proveedor.
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {entregables.map((e, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 w-5 shrink-0">{i + 1}.</span>
                <input
                  type="text"
                  value={e}
                  onChange={ev => updateEntregable(i, ev.target.value)}
                  placeholder={`Entregable ${i + 1}`}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2"
                  style={{ fontFamily: 'Gabarito, sans-serif' }}
                />
                {entregables.length > 1 && (
                  <button onClick={() => removeEntregable(i)} className="text-red-400 hover:text-red-600 shrink-0">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addEntregable}
            className="mt-3 flex items-center gap-1 text-sm font-semibold hover:underline"
            style={{ color: BRAND }}
          >
            <Plus size={15} /> Agregar entregable
          </button>
        </div>

        {/* Informes de supervisión */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <ClipboardList size={18} style={{ color: BRAND }} />
            <h2 className="font-bold text-sm uppercase tracking-wider" style={{ color: BRAND }}>
              Informes de supervisión
            </h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Indique si este contrato requiere informes de supervisión periódicos.
          </p>

          {/* Sí / No */}
          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setTieneInformes(true)}
              className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                tieneInformes
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <CheckCircle2 size={18} className="mx-auto mb-1" />
              Sí
            </button>
            <button
              onClick={() => { setTieneInformes(false); setNumeroInformes(''); }}
              className={`flex-1 py-3 rounded-xl border-2 font-bold text-sm transition-all ${
                !tieneInformes
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <XCircle size={18} className="mx-auto mb-1" />
              No
            </button>
          </div>

          {/* Cuántos informes */}
          {tieneInformes && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">¿Cuántos informes de supervisión?</label>
              <input
                type="number"
                min={1}
                value={numeroInformes}
                onChange={e => setNumeroInformes(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="Ej: 6"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-2xl font-bold text-center outline-none focus:ring-2"
                style={{ color: BRAND, fontFamily: 'Gabarito, sans-serif' }}
              />
              <p className="text-xs text-gray-400 text-center mt-1">
                {numeroInformes ? `${numeroInformes} informe${Number(numeroInformes) !== 1 ? 's' : ''} durante la ejecución` : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-col sm:flex-row items-center justify-end gap-3">
        {confirmRechazar ? (
          <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl p-3 flex-wrap">
            <span className="text-sm text-red-700 font-semibold">¿Confirmar rechazo de supervisión?</span>
            <button
              onClick={handleRechazar}
              disabled={guardando}
              className="px-4 py-2 rounded-lg text-white font-bold text-sm flex items-center gap-2"
              style={{ backgroundColor: CTA }}
            >
              {guardando ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              Sí, rechazar
            </button>
            <button
              onClick={() => setConfirmRechazar(false)}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 font-semibold text-sm"
            >
              Cancelar
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmRechazar(true)}
            disabled={guardando}
            className="px-5 py-2.5 rounded-lg border-2 font-bold text-sm flex items-center gap-2"
            style={{ borderColor: CTA, color: CTA }}
          >
            <XCircle size={16} /> Rechazar supervisión
          </button>
        )}

        <button
          onClick={handleAceptar}
          disabled={guardando}
          className="px-6 py-2.5 rounded-lg text-white font-bold text-sm flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
          style={{ backgroundColor: '#10B981' }}
        >
          {guardando
            ? <Loader2 size={16} className="animate-spin" />
            : <CheckCircle2 size={16} />}
          Aceptar supervisión e iniciar contrato
        </button>
      </div>
    </div>
  );
}
