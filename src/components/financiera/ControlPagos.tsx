import React, { useState, useEffect } from 'react';
import { CreditCard, Receipt, TrendingUp, CheckCircle2, Clock, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { FacturasFinanciera } from './FacturasFinanciera';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

type TabControlPagos = 'facturas' | 'pagos';

interface Kpis {
  total_contratos: number;
  valor_total_contratos: number;
  total_facturado: number;
  total_pendiente: number;
}

interface ContratoEjecucion {
  id: string;
  codigo: string;
  objeto: string;
  valor_contrato: number;
  total_facturado: number;
  facturas_aprobadas: number;
  facturas_pendientes: number;
  facturas_rechazadas: number;
  total_facturas: number;
  supervisor_nombre: string | null;
}

function formatCOP(val: number | null | undefined) {
  if (val === null || val === undefined || isNaN(Number(val))) return '$0';
  return new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP',
    minimumFractionDigits: 0, maximumFractionDigits: 0,
  }).format(Number(val));
}

function BarraEjecucion({ porcentaje }: { porcentaje: number }) {
  const color = porcentaje >= 90 ? '#ef4444' : porcentaje >= 70 ? '#f59e0b' : '#10b981';
  return (
    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700"
        style={{ width: `${Math.min(100, porcentaje)}%`, backgroundColor: color }}
      />
    </div>
  );
}

function ResumenEjecucion() {
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [contratos, setContratos] = useState<ContratoEjecucion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API_BASE}/api/financiera/resumen-ejecucion`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(data => {
        setKpis(data.kpis);
        setContratos(data.contratos || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 size={28} className="animate-spin text-gray-400" />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <AlertCircle size={32} className="mb-2 opacity-50" />
      <p className="text-sm">No se pudo cargar el resumen de ejecución.</p>
    </div>
  );

  const saldoGlobal = Number(kpis?.valor_total_contratos || 0) - Number(kpis?.total_facturado || 0);
  const pctGlobal = kpis && Number(kpis.valor_total_contratos) > 0
    ? Math.round((Number(kpis.total_facturado) / Number(kpis.valor_total_contratos)) * 100)
    : 0;

  return (
    <div className="space-y-6" style={{ fontFamily: 'Gabarito, sans-serif' }}>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Contratos activos</p>
          <p className="text-3xl font-bold text-gray-800">{kpis?.total_contratos ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Valor total contratos</p>
          <p className="text-xl font-bold text-gray-800">{formatCOP(kpis?.valor_total_contratos)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Total facturado</p>
          <p className="text-xl font-bold" style={{ color: 'var(--brand-secondary)' }}>{formatCOP(kpis?.total_facturado)}</p>
          <p className="text-xs text-gray-400 mt-0.5">{pctGlobal}% del presupuesto</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-[11px] font-semibold text-gray-400 uppercase mb-1">Saldo disponible</p>
          <p className={`text-xl font-bold ${saldoGlobal < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCOP(saldoGlobal)}</p>
          {Number(kpis?.total_pendiente) > 0 && (
            <p className="text-xs text-amber-500 mt-0.5">{formatCOP(kpis?.total_pendiente)} en revisión</p>
          )}
        </div>
      </div>

      {/* Barra global */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span className="font-semibold">Ejecución presupuestal global</span>
          <span className="font-bold">{pctGlobal}%</span>
        </div>
        <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${Math.min(100, pctGlobal)}%`,
              backgroundColor: pctGlobal >= 90 ? '#ef4444' : pctGlobal >= 70 ? '#f59e0b' : 'var(--brand-secondary)',
            }}
          />
        </div>
        <div className="flex gap-6 mt-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" /> Facturado: {formatCOP(kpis?.total_facturado)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> En revisión: {formatCOP(kpis?.total_pendiente)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-200 inline-block" /> Saldo: {formatCOP(saldoGlobal)}</span>
        </div>
      </div>

      {/* Tabla por contrato */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <TrendingUp size={16} className="text-gray-500" />
          <h3 className="font-bold text-gray-700 text-sm uppercase tracking-wide">Ejecución por contrato</h3>
        </div>

        {contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <Receipt size={28} className="mb-2 opacity-40" />
            <p className="text-sm">No hay contratos con facturas registradas.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-5 py-3 text-[11px] font-semibold text-gray-400 uppercase">Contrato</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Valor</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Facturado</th>
                  <th className="text-right px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Saldo</th>
                  <th className="px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase w-36">Avance</th>
                  <th className="text-center px-4 py-3 text-[11px] font-semibold text-gray-400 uppercase">Facturas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratos.map(c => {
                  const pct = Number(c.valor_contrato) > 0
                    ? Math.round((Number(c.total_facturado) / Number(c.valor_contrato)) * 100)
                    : 0;
                  const saldo = Number(c.valor_contrato) - Number(c.total_facturado);
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <p className="font-semibold text-gray-800">{c.codigo || '—'}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[260px]">{c.objeto}</p>
                        {c.supervisor_nombre && (
                          <p className="text-[11px] text-gray-300 mt-0.5">Supervisor: {c.supervisor_nombre}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-700">{formatCOP(c.valor_contrato)}</td>
                      <td className="px-4 py-3 text-right font-semibold" style={{ color: 'var(--brand-secondary)' }}>{formatCOP(c.total_facturado)}</td>
                      <td className={`px-4 py-3 text-right font-semibold ${saldo < 0 ? 'text-red-600' : 'text-emerald-600'}`}>{formatCOP(saldo)}</td>
                      <td className="px-4 py-3 w-36">
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <BarraEjecucion porcentaje={pct} />
                          </div>
                          <span className="text-xs text-gray-500 w-9 text-right shrink-0">{pct}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-2 flex-wrap">
                          {c.facturas_aprobadas > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                              <CheckCircle2 size={11} /> {c.facturas_aprobadas}
                            </span>
                          )}
                          {c.facturas_pendientes > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-amber-600 font-semibold">
                              <Clock size={11} /> {c.facturas_pendientes}
                            </span>
                          )}
                          {c.facturas_rechazadas > 0 && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-red-500 font-semibold">
                              <XCircle size={11} /> {c.facturas_rechazadas}
                            </span>
                          )}
                          {c.total_facturas === 0 && (
                            <span className="text-[11px] text-gray-300">Sin facturas</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export function ControlPagos() {
  const [activeTab, setActiveTab] = useState<TabControlPagos>('facturas');

  const TABS: { key: TabControlPagos; label: string; icon: React.ReactNode }[] = [
    { key: 'facturas', label: 'Facturas de contratos', icon: <Receipt size={16} /> },
    { key: 'pagos', label: 'Pagos y presupuesto', icon: <CreditCard size={16} /> },
  ];

  return (
    <div className="p-4 lg:p-8" style={{ backgroundColor: '#F8F9FA', fontFamily: 'Gabarito, sans-serif' }}>
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <CreditCard style={{ color: '#3D2B86' }} size={32} />
          <h1 className="text-3xl font-semibold text-gray-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            Control de Pagos
          </h1>
        </div>
        <p className="text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          Seguimiento de pagos a proveedores y gestión de facturas de contratos
        </p>
      </div>

      <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === tab.key ? 'text-white shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
            style={{
              fontFamily: 'Gabarito, sans-serif',
              ...(activeTab === tab.key ? { backgroundColor: 'var(--brand-secondary)' } : {}),
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'facturas' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <FacturasFinanciera />
        </div>
      )}

      {activeTab === 'pagos' && <ResumenEjecucion />}
    </div>
  );
}
