import React, { useState, useEffect, useCallback } from 'react';
import { Receipt, CheckCircle2, Clock, Loader2, CalendarCheck, AlertCircle } from 'lucide-react';

const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface FacturaAprobada {
  id: string;
  no_factura_cxc: string;
  no_contrato_oc: string;
  concepto: string;
  valor: number | null;
  fecha_factura: string;
  estado: string;
  pagado_financiera: boolean;
  fecha_pago_financiera: string | null;
  confirmado_por_financiera: string | null;
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

export function ConfirmacionPagos({ userEmail }: ConfirmacionPagosProps) {
  const [facturas, setFacturas] = useState<FacturaAprobada[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);
  const [fechaPago, setFechaPago] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<'pendientes' | 'pagadas' | 'todas'>('pendientes');

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

  const confirmarPago = async (id: string) => {
    if (!fechaPago) { setError('Debes ingresar la fecha de pago'); return; }
    setError(null);
    setProcesandoId(id);
    try {
      const r = await fetch(`${API_BASE}/api/financiera/facturas/${id}/marcar-pago`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pagado: true, fecha_pago: fechaPago, confirmado_por: userEmail || null }),
      });
      if (!r.ok) { const d = await r.json(); setError(d.error || 'Error al confirmar pago'); return; }
      setConfirmandoId(null);
      setFechaPago('');
      await cargar();
    } catch {
      setError('Error de conexión');
    } finally {
      setProcesandoId(null);
    }
  };

  const pendientes = facturas.filter(f => !f.pagado_financiera);
  const pagadas = facturas.filter(f => f.pagado_financiera);
  const lista = filtro === 'pendientes' ? pendientes : filtro === 'pagadas' ? pagadas : facturas;

  return (
    <div className="p-4 lg:p-6 space-y-4" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-900">Confirmación de Pagos</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registra la fecha real de pago de las facturas aprobadas por supervisor y gerente</p>
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
      <div className="flex gap-2 flex-wrap">
        {(['pendientes', 'pagadas', 'todas'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filtro === f ? 'bg-gray-800 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {f === 'pendientes' ? `Por pagar (${pendientes.length})` : f === 'pagadas' ? `Pagadas (${pagadas.length})` : `Todas (${facturas.length})`}
          </button>
        ))}
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
            <p className="text-sm">{filtro === 'pendientes' ? 'No hay facturas pendientes de pago' : 'Sin resultados'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {lista.map(f => (
              <div key={f.id} className="p-4 space-y-2">
                {/* Encabezado */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800 text-sm">{f.no_factura_cxc}</span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">{f.contrato_codigo}</span>
                      {f.pagado_financiera
                        ? <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full"><CheckCircle2 size={11} /> Pagada</span>
                        : <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full"><Clock size={11} /> Pendiente pago</span>
                      }
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 truncate max-w-sm">{f.contrato_objeto}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-gray-800">{formatCOP(f.valor)}</p>
                    <p className="text-xs text-gray-400">{formatDate(f.fecha_factura)}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-600">{f.concepto}</p>

                {/* Estado pago */}
                {f.pagado_financiera ? (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
                    <CalendarCheck size={13} />
                    <span>Pago confirmado el <strong>{formatDate(f.fecha_pago_financiera)}</strong></span>
                    {f.confirmado_por_financiera && <span className="text-emerald-500">por {f.confirmado_por_financiera}</span>}
                  </div>
                ) : confirmandoId === f.id ? (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
                    <p className="text-xs font-semibold text-blue-700">Fecha real de pago</p>
                    <input
                      type="date"
                      value={fechaPago}
                      onChange={e => { setFechaPago(e.target.value); setError(null); }}
                      max={new Date().toISOString().split('T')[0]}
                      className="w-full px-3 py-2 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                    />
                    <div className="flex gap-2">
                      <button onClick={() => { setConfirmandoId(null); setFechaPago(''); setError(null); }}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancelar
                      </button>
                      <button onClick={() => confirmarPago(f.id)} disabled={procesandoId === f.id || !fechaPago}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
                        {procesandoId === f.id ? <Loader2 size={11} className="animate-spin" /> : <CalendarCheck size={11} />}
                        Confirmar pago
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => { setConfirmandoId(f.id); setFechaPago(''); setError(null); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    <CalendarCheck size={11} /> Registrar pago
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
