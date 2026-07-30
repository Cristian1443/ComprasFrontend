import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Receipt, CheckCircle2, Clock, Loader2, CalendarCheck, AlertCircle, Landmark, CreditCard, ArrowLeftRight, Search } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

type MetodoPago = 'pse' | 'tarjeta' | 'transferencia';

const METODOS_PAGO: { value: MetodoPago; label: string; icon: React.ComponentType<{ size?: number; className?: string }> }[] = [
  { value: 'pse', label: 'PSE', icon: Landmark },
  { value: 'tarjeta', label: 'Tarjeta', icon: CreditCard },
  { value: 'transferencia', label: 'Transferencia', icon: ArrowLeftRight },
];

interface FacturaAprobada {
  id: string;
  no_factura_cxc: string;
  numero_ap: string;
  no_contrato_oc: string;
  concepto: string;
  valor: number | null;
  nombre_proveedor: string | null;
  fecha_factura: string;
  estado: string;
  pagado_financiera: boolean;
  fecha_pago_financiera: string | null;
  confirmado_por_financiera: string | null;
  metodo_pago: MetodoPago | null;
  solicitud_id: string;
  contrato_codigo: string;
  contrato_objeto: string;
  actualizado_en: string;
}

interface ConfirmacionPagosProps {
  userEmail?: string;
}

function formatCOP(val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(Number(val))) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val));
}

function formatDate(iso: string | null) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('es-CO');
}

function metodoPagoLabel(m: string | null) {
  return METODOS_PAGO.find(mp => mp.value === m)?.label || m || '';
}

export function ConfirmacionPagos({ userEmail }: ConfirmacionPagosProps) {
  const [facturas, setFacturas] = useState<FacturaAprobada[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fechaPago, setFechaPago] = useState('');
  const [metodoPago, setMetodoPago] = useState<MetodoPago | ''>('');
  const [procesandoLote, setProcesandoLote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendientes' | 'pagadas' | 'todas'>('pendientes');
  const [busquedaAP, setBusquedaAP] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/financiera/facturas-aprobadas`);
      if (r.ok) setFacturas(await r.json());
    } catch {
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = facturas.filter(f => !f.pagado_financiera);
  const pagadas = facturas.filter(f => f.pagado_financiera);
  const listaBase = filtro === 'pendientes' ? pendientes : filtro === 'pagadas' ? pagadas : facturas;
  const busquedaNorm = busquedaAP.trim().toLowerCase();
  const lista = busquedaNorm
    ? listaBase.filter(f => (f.numero_ap || '').toLowerCase().includes(busquedaNorm))
    : listaBase;

  // Al cambiar de filtro o recargar, descarta selecciones de facturas que ya no estén pendientes
  useEffect(() => {
    setSelectedIds(prev => {
      const validIds = new Set(pendientes.map(f => f.id));
      const next = new Set([...prev].filter(id => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturas]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pendientesVisibles = filtro === 'pendientes' ? lista : pendientes;

  const toggleSelectAllPendientes = () => {
    setSelectedIds(prev => (prev.size === pendientesVisibles.length ? new Set() : new Set(pendientesVisibles.map(f => f.id))));
  };

  const totalSeleccionado = useMemo(
    () => pendientes.filter(f => selectedIds.has(f.id)).reduce((s, f) => s + (Number(f.valor) || 0), 0),
    [pendientes, selectedIds]
  );

  const pagarSeleccionadas = async () => {
    if (selectedIds.size === 0) return;
    if (!fechaPago) { setError('Debes ingresar la fecha de pago'); return; }
    if (!metodoPago) { setError('Selecciona el método de pago'); return; }
    setError(null);
    setProcesandoLote(true);
    try {
      const r = await fetch(`${API_BASE}/api/financiera/facturas/pagar-lote`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ids: Array.from(selectedIds),
          fecha_pago: fechaPago,
          metodo_pago: metodoPago,
          confirmado_por: userEmail || null,
        }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setError(d.error || 'Error al confirmar el pago'); return; }
      setSelectedIds(new Set());
      setFechaPago('');
      setMetodoPago('');
      await cargar();
    } catch {
      setError('Error de conexión');
    } finally {
      setProcesandoLote(false);
    }
  };

  return (
    <div className="p-4 lg:p-6 space-y-4 pb-28" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900">Confirmación de Pagos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Selecciona una o varias facturas aprobadas y regístralas como pagadas por lote, indicando el método de pago</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-amber-600 uppercase">Por pagar</p>
          <p className="text-2xl font-black text-amber-700">{pendientes.length}</p>
          <p className="text-xs text-amber-600">{formatCOP(pendientes.reduce((s, f) => s + (Number(f.valor) || 0), 0))}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[11px] font-semibold text-emerald-600 uppercase">Pagadas</p>
          <p className="text-2xl font-black text-emerald-700">{pagadas.length}</p>
          <p className="text-xs text-emerald-600">{formatCOP(pagadas.reduce((s, f) => s + (Number(f.valor) || 0), 0))}</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 col-span-2 sm:col-span-1">
          <p className="text-[11px] font-semibold text-gray-500 uppercase">Total facturas</p>
          <p className="text-2xl font-black text-gray-700">{facturas.length}</p>
          <p className="text-xs text-gray-500">{formatCOP(facturas.reduce((s, f) => s + (Number(f.valor) || 0), 0))}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {(['pendientes', 'pagadas', 'todas'] as const).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtro === f ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f === 'pendientes' ? `Por pagar (${pendientes.length})` : f === 'pagadas' ? `Pagadas (${pagadas.length})` : `Todas (${facturas.length})`}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={busquedaAP}
            onChange={e => setBusquedaAP(e.target.value)}
            placeholder="Buscar por AP..."
            className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 w-40"
          />
        </div>
        {filtro === 'pendientes' && pendientesVisibles.length > 0 && (
          <button onClick={toggleSelectAllPendientes} className="text-xs font-semibold text-blue-600 hover:underline">
            {selectedIds.size === pendientesVisibles.length ? 'Deseleccionar todas' : 'Seleccionar todas'}
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={15} /> {error}
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Receipt size={15} className="text-gray-400" />
          <span className="font-bold text-gray-700 text-sm uppercase tracking-wide">Facturas aprobadas</span>
        </div>

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
        ) : lista.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <CheckCircle2 size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              {busquedaNorm
                ? `Sin resultados para AP "${busquedaAP.trim()}"`
                : filtro === 'pendientes' ? 'No hay facturas pendientes de pago' : 'Sin resultados'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lista.map(f => (
              <div key={f.id} className={`p-4 space-y-2 flex gap-3 ${!f.pagado_financiera ? 'items-start' : ''}`}>
                {!f.pagado_financiera && (
                  <input
                    type="checkbox"
                    checked={selectedIds.has(f.id)}
                    onChange={() => toggleSelect(f.id)}
                    className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                )}
                <div className="flex-1 space-y-2 min-w-0">
                  {/* Encabezado */}
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-gray-800 text-sm">AP {f.numero_ap}</span>
                        <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{f.contrato_codigo}</span>
                        {f.pagado_financiera
                          ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Pagada</span>
                          : <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Clock size={11} /> Pendiente pago</span>
                        }
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{f.contrato_objeto}</p>
                      {f.nombre_proveedor && <p className="text-xs text-gray-400 mt-0.5">Proveedor: {f.nombre_proveedor}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-gray-800">{formatCOP(f.valor)}</p>
                      <p className="text-xs text-gray-400">{formatDate(f.fecha_factura)}</p>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">{f.concepto}</p>

                  {/* Estado pago */}
                  {f.pagado_financiera && (
                    <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2 flex-wrap">
                      <CalendarCheck size={13} />
                      <span>Pago confirmado el <strong>{formatDate(f.fecha_pago_financiera)}</strong></span>
                      {f.metodo_pago && <span className="font-semibold">· {metodoPagoLabel(f.metodo_pago)}</span>}
                      {f.confirmado_por_financiera && <span className="text-emerald-500">por {f.confirmado_por_financiera}</span>}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acción de pago por lote */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
          <div className="max-w-5xl mx-auto p-3 lg:p-4 flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-800">{selectedIds.size} factura{selectedIds.size > 1 ? 's' : ''} seleccionada{selectedIds.size > 1 ? 's' : ''}</p>
              <p className="text-xs text-gray-500">Total: {formatCOP(totalSeleccionado)}</p>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Fecha de pago</label>
              <input
                type="date"
                value={fechaPago}
                onChange={e => { setFechaPago(e.target.value); setError(null); }}
                max={new Date().toISOString().split('T')[0]}
                className="w-full lg:w-40 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">Método de pago</label>
              <div className="flex gap-1.5">
                {METODOS_PAGO.map(m => {
                  const Icon = m.icon;
                  const active = metodoPago === m.value;
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => { setMetodoPago(m.value); setError(null); }}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg border transition-colors ${active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Icon size={13} /> {m.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-2 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={pagarSeleccionadas}
                disabled={procesandoLote || !fechaPago || !metodoPago}
                className="flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {procesandoLote ? <Loader2 size={13} className="animate-spin" /> : <CalendarCheck size={13} />}
                Pagar {selectedIds.size > 1 ? 'lote' : 'factura'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
