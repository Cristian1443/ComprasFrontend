import React, { useState, useEffect, useCallback } from 'react';
import {
  Receipt, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, ThumbsUp, ThumbsDown, TrendingUp
} from 'lucide-react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface Factura {
  id: string;
  solicitud_id: string;
  nombre_solicitud: string | null;
  aprobador_1: string | null;
  aprobador_2: string | null;
  fecha_factura: string;
  no_contrato_oc: string;
  no_factura_cxc: string;
  concepto: string;
  valor: number | null;
  certificacion_supervisor: boolean;
  adjunto_url: string | null;
  adjunto_nombre: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  comentario_financiera: string | null;
  creado_por_email: string | null;
  creado_en: string;
  aprobado_supervisor: boolean | null;
  comentario_supervisor: string | null;
  aprobado_gerente: boolean | null;
  pagado_financiera: boolean | null;
  fecha_pago_financiera: string | null;
}

interface FacturasContratoProps {
  solicitudId: string;
  userEmail?: string;
  contratoData?: { codigo: string; objeto: string };
}

function EstadoBadge({ estado }: { estado: Factura['estado'] }) {
  if (estado === 'aprobada')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><CheckCircle2 size={12} /> Aprobada</span>;
  if (estado === 'rechazada')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><XCircle size={12} /> Rechazada</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><Clock size={12} /> Pendiente</span>;
}

function formatCOP(val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(Number(val))) return '$0';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(val));
}

export function FacturasContrato({ solicitudId, userEmail }: FacturasContratoProps) {
  const [facturas, setFacturas] = useState<Factura[]>([]);
  const [valorContrato, setValorContrato] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [rechazandoId, setRechazandoId] = useState<string | null>(null);
  const [comentario, setComentario] = useState('');

  const cargarFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}/facturas`);
      if (r.ok) {
        const data = await r.json();
        // API returns { facturas: [...], valor_contrato: number }
        setFacturas(Array.isArray(data.facturas) ? data.facturas : []);
        setValorContrato(Number(data.valor_contrato) || 0);
      } else {
        setFacturas([]);
        setValorContrato(0);
      }
    } catch {
      setFacturas([]);
      setValorContrato(0);
    } finally {
      setLoading(false);
    }
  }, [solicitudId]);

  useEffect(() => { cargarFacturas(); }, [cargarFacturas]);

  const certificar = async (id: string, aprobado: boolean, comentarioTexto?: string) => {
    setProcesandoId(id);
    try {
      await fetch(`${API_BASE}/api/supervisor/facturas/${id}/certificar`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aprobado, comentario: comentarioTexto || null }),
      });
      setRechazandoId(null);
      setComentario('');
      await cargarFacturas();
    } finally {
      setProcesandoId(null);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO');
  };

  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  // Cálculos para el resumen de ejecución — solo se descuenta cuando financiera confirma el pago
  const totalFacturado = facturas.filter(f => f.pagado_financiera === true).reduce((sum, f) => sum + (Number(f.valor) || 0), 0);
  const saldo = valorContrato - totalFacturado;
  const porcentaje = valorContrato > 0 ? Math.min(100, Math.round((totalFacturado / valorContrato) * 100)) : 0;
  const aprobadas = facturas.filter(f => f.estado === 'aprobada' && f.pagado_financiera === true).length;
  const pendientes = facturas.filter(f => f.estado === 'pendiente').length;
  const rechazadas = facturas.filter(f => f.estado === 'rechazada').length;

  console.log('FacturasContrato - userEmail:', userEmail);

  return (
    <div className="space-y-3" style={{ fontFamily: 'Gabarito, sans-serif' }}>

      {/* Tarjeta resumen de ejecución */}
      {!loading && (valorContrato > 0 || facturas.length > 0) && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
            <TrendingUp size={16} className="text-gray-500" />
            <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Resumen de ejecución</h2>
          </div>
          <div className="p-4">
            {/* Cifras principales */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
              <div className="flex sm:block items-center justify-between sm:text-center px-1">
                <p className="text-[11px] font-semibold text-gray-400 uppercase">Valor contrato</p>
                <p className="text-sm font-bold text-gray-800">{formatCOP(valorContrato)}</p>
              </div>
              <div className="flex sm:block items-center justify-between sm:text-center px-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase">Total pagado</p>
                <p className="text-sm font-bold" style={{ color: 'var(--brand-secondary)' }}>{formatCOP(totalFacturado)}</p>
              </div>
              <div className="flex sm:block items-center justify-between sm:text-center px-1 border-t sm:border-t-0 pt-2 sm:pt-0">
                <p className="text-[11px] font-semibold text-gray-400 uppercase">Saldo disponible</p>
                <p className={`text-sm font-bold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCOP(saldo)}</p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="mb-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>Ejecución presupuestal (pagos confirmados por financiera)</span>
                <span className="font-semibold">{porcentaje}% ejecutado</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${porcentaje}%`,
                    backgroundColor: porcentaje >= 90 ? '#ef4444' : porcentaje >= 70 ? '#f59e0b' : 'var(--brand-secondary)',
                  }}
                />
              </div>
            </div>

            {/* Conteo facturas */}
            <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
              {aprobadas > 0 && (
                <span className="inline-flex items-center gap-1 text-green-700 font-medium">
                  <CheckCircle2 size={11} /> {aprobadas} aprobada{aprobadas !== 1 ? 's' : ''}
                </span>
              )}
              {pendientes > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <Clock size={11} /> {pendientes} pendiente{pendientes !== 1 ? 's' : ''}
                </span>
              )}
              {rechazadas > 0 && (
                <span className="inline-flex items-center gap-1 text-red-500 font-medium">
                  <XCircle size={11} /> {rechazadas} rechazada{rechazadas !== 1 ? 's' : ''}
                </span>
              )}
              {facturas.length === 0 && <span>Sin facturas registradas</span>}
            </div>
          </div>
        </div>
      )}

      {/* Lista de facturas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <Receipt size={16} className="text-gray-500" />
          <h2 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Facturas de pago</h2>
          <span className="ml-auto text-xs text-gray-400">Registradas por financiera</span>
        </div>

        <div className="p-3 space-y-2">
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 size={22} className="animate-spin text-gray-400" /></div>
          ) : facturas.length === 0 ? (
            <div className="text-center py-6 text-gray-400">
              <Receipt size={30} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">No hay facturas registradas para este contrato.</p>
              <p className="text-xs mt-1 text-gray-300">El área financiera registra las facturas aquí.</p>
            </div>
          ) : (
            facturas.map(f => (
              <div key={f.id} className="rounded-lg border border-gray-100 bg-gray-50 overflow-hidden">
                {/* Fila principal */}
                <div className="px-3 py-2.5">
                  {/* Línea 1: número + chevron + estado */}
                  <div className="flex items-start gap-2">
                    <button onClick={() => toggleExpand(f.id)} className="mt-0.5 shrink-0">
                      <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedId === f.id ? 'rotate-180' : ''}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{f.no_factura_cxc}</span>
                        <EstadoBadge estado={f.estado} />
                      </div>
                      <span className="text-xs text-gray-400 block mt-0.5">
                        {formatDate(f.fecha_factura)}{f.valor ? ` · ${formatCOP(f.valor)}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Línea 2: botones de acción (solo si pendiente) */}
                  {f.aprobado_supervisor === null && f.estado === 'pendiente' && (
                    <div className="flex gap-2 mt-2 ml-5">
                      <button
                        onClick={() => certificar(f.id, true)}
                        disabled={procesandoId === f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {procesandoId === f.id ? <Loader2 size={11} className="animate-spin" /> : <ThumbsUp size={11} />}
                        Aprobar
                      </button>
                      <button
                        onClick={() => { setRechazandoId(f.id); setComentario(''); }}
                        disabled={procesandoId === f.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        <ThumbsDown size={11} /> Rechazar
                      </button>
                    </div>
                  )}
                  {f.aprobado_supervisor === true && (
                    <div className="ml-5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold"><CheckCircle2 size={12} /> Aprobada por ti</span>
                    </div>
                  )}
                  {f.aprobado_supervisor === false && (
                    <div className="ml-5 mt-1">
                      <span className="inline-flex items-center gap-1 text-[11px] text-red-600 font-semibold"><XCircle size={12} /> Rechazada por ti</span>
                    </div>
                  )}
                </div>

                {/* Panel de rechazo */}
                {rechazandoId === f.id && (
                  <div className="border-t border-red-100 px-3 py-3 bg-red-50">
                    <p className="text-xs font-semibold text-red-700 mb-2">Motivo del rechazo (opcional)</p>
                    <textarea
                      value={comentario}
                      onChange={e => setComentario(e.target.value)}
                      rows={2}
                      placeholder="Indica el motivo..."
                      className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300 resize-none bg-white"
                      style={{ fontFamily: 'Gabarito, sans-serif' }}
                    />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => setRechazandoId(null)}
                        className="flex-1 px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        style={{ fontFamily: 'Gabarito, sans-serif' }}>Cancelar</button>
                      <button onClick={() => certificar(f.id, false, comentario)} disabled={procesandoId === f.id}
                        className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                        style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        {procesandoId === f.id ? <Loader2 size={11} className="animate-spin" /> : <XCircle size={11} />}
                        Confirmar rechazo
                      </button>
                    </div>
                  </div>
                )}

                {/* Detalle expandido */}
                {expandedId === f.id && (
                  <div className="px-4 pb-3 pt-2 border-t border-gray-100 space-y-2 text-sm text-gray-700">
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Contrato/OC</p><p>{f.no_contrato_oc}</p></div>
                      <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Factura/CxC</p><p>{f.no_factura_cxc}</p></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Concepto</p><p>{f.concepto}</p></div>
                      {f.valor !== null && f.valor !== undefined && (
                        <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Valor</p><p className="font-semibold">{formatCOP(f.valor)}</p></div>
                      )}
                    </div>
                    {/* Aprobación gerente */}
                    <div className="flex items-center gap-2">
                      {f.aprobado_gerente === true && <><CheckCircle2 size={13} className="text-green-500" /><span className="text-xs text-gray-500">Gerente aprobó</span></>}
                      {f.aprobado_gerente === false && <><XCircle size={13} className="text-red-400" /><span className="text-xs text-gray-500">Gerente rechazó</span></>}
                      {f.aprobado_gerente === null && <><Clock size={13} className="text-amber-400" /><span className="text-xs text-gray-500">Gerente pendiente</span></>}
                    </div>
                    {/* Confirmación de pago por financiera */}
                    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${f.pagado_financiera ? 'bg-emerald-50 border border-emerald-200' : 'bg-amber-50 border border-amber-200'}`}>
                      {f.pagado_financiera
                        ? <><CheckCircle2 size={13} className="text-emerald-600" /><span className="text-xs font-semibold text-emerald-700">Pago confirmado por financiera{f.fecha_pago_financiera ? ` — ${new Date(f.fecha_pago_financiera).toLocaleDateString('es-CO')}` : ''}</span></>
                        : <><Clock size={13} className="text-amber-500" /><span className="text-xs font-semibold text-amber-700">Pendiente de confirmación de pago por financiera</span></>
                      }
                    </div>
                    {(f.adjunto_url || f.adjunto_nombre) && (
                      <div>
                        <p className="text-[11px] font-semibold text-gray-400 uppercase">Adjunto</p>
                        {f.adjunto_url && f.adjunto_url.startsWith('http') ? (
                          <a href={f.adjunto_url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                            📎 {f.adjunto_nombre || 'Ver adjunto'}
                          </a>
                        ) : (
                          <span className="text-xs text-gray-500">{f.adjunto_nombre || f.adjunto_url}</span>
                        )}
                      </div>
                    )}
                    {f.comentario_supervisor && (
                      <div className="p-2 rounded bg-amber-50 border border-amber-200">
                        <p className="text-[11px] font-semibold text-amber-700 uppercase">Tu comentario</p>
                        <p className="text-amber-800 text-xs">{f.comentario_supervisor}</p>
                      </div>
                    )}
                    {f.creado_por_email && <p className="text-xs text-gray-400">Registrada por financiera: {f.creado_por_email}</p>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
