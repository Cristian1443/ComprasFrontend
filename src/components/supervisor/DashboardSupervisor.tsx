import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import {
  Plus, FileText, Clock, XCircle, CheckCircle2, ArrowRight,
  Receipt, AlertTriangle, Building2, RotateCcw, Layers, ChevronRight, ClipboardCheck,
} from 'lucide-react';

interface DashboardSupervisorProps {
  onNewRequest: () => void;
  onVerDetalle: (id: string) => void;
  onVerContrato?: (id: string) => void;
  onCalificarProponentes?: (id: string) => void;
  userEmail?: string;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA = '#E84922';

function formatCOP(val: any): string | null {
  const n = Number(val);
  if (!val || isNaN(n) || n === 0) return null;
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
}

function formatDate(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado_gerente: 'En gerencia',
  aprobado_gerente: 'Aprobado gerente',
  rechazado_gerente: 'Devuelto gerente',
  en_financiera: 'En financiera',
  aprobado_financiera: 'Aprobado financiera',
  rechazado_financiera: 'Devuelto financiera',
  en_juridica: 'En jurídica',
  enviado_juridica: 'En jurídica',
  aprobado_juridica: 'Aprobado jurídica',
  rechazado_juridica: 'Devuelto jurídica',
  aprobado_comite: 'Aprobado comité',
  rechazado_comite: 'Devuelto comité',
  devuelto_al_solicitante: 'Devuelto',
  finalizado: 'Finalizado',
  contratado: 'Contratado',
};

function EstadoBadge({ estado }: { estado: string }) {
  const label = ESTADO_LABEL[estado] || estado?.replace(/_/g, ' ');
  const isRechazado = estado?.includes('rechazado') || estado === 'devuelto_al_solicitante';
  const isAprobado = estado?.includes('aprobado') || estado === 'finalizado' || estado === 'contratado';
  const isEnProceso = estado?.includes('en_') || estado?.startsWith('enviado');
  const cls = isRechazado
    ? 'bg-red-50 text-red-700 border-red-200'
    : isAprobado ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isEnProceso ? 'bg-blue-50 text-blue-700 border-blue-200'
    : 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

export function DashboardSupervisor({ onNewRequest, onVerDetalle, onVerContrato, onCalificarProponentes, userEmail }: DashboardSupervisorProps) {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [contratos, setContratos] = useState<any[]>([]);
  const [facturasPendientes, setFacturasPendientes] = useState<any[]>([]);
  const [calificacionesPendientes, setCalificacionesPendientes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filtroKpi, setFiltroKpi] = useState<'todas' | 'accion' | 'revision' | 'cerradas'>('todas');

  const email = (userEmail || '').trim().toLowerCase();

  useEffect(() => {
    if (!email) { setCargando(false); return; }
    const q = encodeURIComponent(email);
    Promise.all([
      apiFetch(`${API_URL}/api/solicitudes?email=${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
      apiFetch(`${API_URL}/api/supervisor/contratos?email=${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
      apiFetch(`${API_URL}/api/supervisor/facturas-pendientes?email=${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
      apiFetch(`${API_URL}/api/supervisor/solicitudes-en-calificacion?email=${q}`).then(r => r.ok ? r.json() : []).catch(() => []),
    ]).then(([sols, cons, facts, califs]) => {
      setSolicitudes(Array.isArray(sols) ? sols : []);
      setContratos(Array.isArray(cons) ? cons : []);
      setFacturasPendientes(Array.isArray(facts) ? facts : []);
      setCalificacionesPendientes(Array.isArray(califs) ? califs.filter((c: any) => !c.supervisor_finalizada) : []);
    }).finally(() => setCargando(false));
  }, [email]);

  const estadoRequiereAccion = new Set(['borrador', 'devuelto_al_solicitante', 'rechazado_gerente', 'rechazado_financiera', 'rechazado_comite', 'rechazado_juridica']);
  const estadoRevision = new Set(['enviado_gerente', 'en_financiera', 'aprobado_financiera', 'en_juridica', 'enviado_juridica', 'aprobado_comite']);
  const estadoCerrado = new Set(['aprobado_juridica', 'finalizado', 'contratado', 'cerrado', 'cancelado']);

  const total = solicitudes.length;
  const requierenAccion = solicitudes.filter(s => estadoRequiereAccion.has(String(s.estado || ''))).length;
  const enRevision = solicitudes.filter(s => estadoRevision.has(String(s.estado || ''))).length;
  const cerradas = solicitudes.filter(s => estadoCerrado.has(String(s.estado || ''))).length;

  const listaSolicitudes = solicitudes.filter(s => {
    const e = String(s.estado || '');
    if (filtroKpi === 'accion') return estadoRequiereAccion.has(e);
    if (filtroKpi === 'revision') return estadoRevision.has(e);
    if (filtroKpi === 'cerradas') return estadoCerrado.has(e);
    return true;
  }).slice(0, 6);

  const getValor = (p: any): string | null => {
    const m = String(p?.moneda || 'COP').toUpperCase();
    const txt = m === 'USD' ? p?.valor_moneda_usd_texto : m === 'EUR' ? p?.valor_moneda_eur_texto : p?.valor_moneda_cop_texto;
    if (txt) return `${m} ${txt}`;
    return formatCOP(p.valor_estimado);
  };

  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f7fb' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
          <p className="text-sm font-medium text-gray-500">Cargando panel…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── HEADER ── */}
      <div style={{ background: `linear-gradient(135deg, ${BRAND_DARK} 0%, ${BRAND} 100%)` }}>
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 pt-8 pb-8 flex items-start justify-between gap-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50 mb-2">Compras y Contratación · Supervisor</p>
            <h1 className="text-3xl font-black text-white tracking-tight">Panel de <span style={{ color: '#F08A24' }}>Control</span></h1>
            <p className="text-white/50 text-xs mt-1">{email}</p>
          </div>
          <button
            onClick={onNewRequest}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-white shadow-md hover:opacity-90 active:scale-95 transition-all shrink-0 mt-1"
            style={{ backgroundColor: CTA }}
          >
            <Plus size={16} className="stroke-[2.5]" /> Nueva Solicitud
          </button>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-7 space-y-7">

        {/* Alerta calificación de proponentes pendiente */}
        {calificacionesPendientes.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-xl shadow-sm">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
              <ClipboardCheck size={18} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-blue-900 text-sm">
                {calificacionesPendientes.length === 1
                  ? 'Tiene 1 solicitud pendiente de su calificación como supervisor'
                  : `Tiene ${calificacionesPendientes.length} solicitudes pendientes de su calificación como supervisor`}
              </p>
              <p className="text-blue-700 text-xs truncate mt-0.5">
                Jurídica está evaluando los proponentes — su calificación se registra en paralelo. {calificacionesPendientes.slice(0, 3).map((c: any) => c.codigo).filter(Boolean).join(' · ')}
              </p>
            </div>
            {onCalificarProponentes && (
              <button
                onClick={() => onCalificarProponentes(calificacionesPendientes[0].id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors text-white"
                style={{ background: BRAND }}
              >
                Calificar <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        {/* Alerta facturas */}
        {facturasPendientes.length > 0 && (
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-xl shadow-sm">
            <div className="w-9 h-9 bg-amber-100 rounded-lg flex items-center justify-center shrink-0">
              <AlertTriangle size={18} className="text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900 text-sm">
                {facturasPendientes.length} {facturasPendientes.length === 1 ? 'factura requiere' : 'facturas requieren'} tu certificación
              </p>
              <p className="text-amber-700 text-xs truncate mt-0.5">
                {facturasPendientes.slice(0, 3).map(f => f.contrato_codigo || (f.numero_ap ? `AP ${f.numero_ap}` : f.no_factura_cxc)).filter(Boolean).join(' · ')}
              </p>
            </div>
            {onVerContrato && (
              <button
                onClick={() => onVerContrato(facturasPendientes[0].solicitud_id)}
                className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition-colors"
                style={{ background: '#f08a24', color: 'white' }}
              >
                Certificar <ArrowRight size={12} />
              </button>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

          {/* ── COLUMNA PRINCIPAL ── */}
          <div className="xl:col-span-2 space-y-5">

            {/* KPIs mis solicitudes */}
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Mis solicitudes</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { id: 'accion' as const, label: 'Acción requerida', val: requierenAccion, icon: RotateCcw, activeColor: CTA, activeBg: '#fff5f2' },
                  { id: 'revision' as const, label: 'En revisión', val: enRevision, icon: Clock, activeColor: '#d97706', activeBg: '#fffbeb' },
                  { id: 'cerradas' as const, label: 'Cerradas', val: cerradas, icon: CheckCircle2, activeColor: '#059669', activeBg: '#f0fdf4' },
                  { id: 'todas' as const, label: 'Total', val: total, icon: Layers, activeColor: BRAND, activeBg: '#eff6ff' },
                ].map(card => {
                  const active = filtroKpi === card.id;
                  return (
                    <button key={card.id} onClick={() => setFiltroKpi(card.id)}
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

            {/* Tabla actividad reciente */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <FileText size={15} style={{ color: BRAND }} />
                  <h3 className="font-bold text-gray-800 text-sm">Actividad reciente</h3>
                  {filtroKpi !== 'todas' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-wide">
                      {filtroKpi}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-bold text-gray-400">{listaSolicitudes.length} resultados</span>
              </div>

              {listaSolicitudes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-gray-400">
                  <FileText size={30} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin solicitudes en este filtro</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {listaSolicitudes.map(p => (
                    <div key={p.id}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => onVerDetalle(p.id)}
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: '#eff6ff' }}>
                        <FileText size={14} style={{ color: BRAND }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black" style={{ color: BRAND }}>{p.codigo}</span>
                          <EstadoBadge estado={p.estado} />
                        </div>
                        <p className="text-sm font-semibold text-gray-700 truncate mt-0.5">{p.titulo_contrato || p.objeto || 'Sin objeto'}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400 flex-wrap">
                          <span className="capitalize">{p.modalidad || 'N/A'}</span>
                          {getValor(p) && <><span>·</span><span className="font-semibold text-emerald-700">{getValor(p)}</span></>}
                          <span>·</span>
                          <span>{formatDate(p.creado_en)}</span>
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

            {/* Contratos supervisados */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Building2 size={14} style={{ color: BRAND }} />
                  <h3 className="font-bold text-gray-800 text-sm">Contratos supervisados</h3>
                </div>
                <span className="text-xs font-black px-2 py-0.5 rounded-full"
                  style={{ background: '#eff6ff', color: BRAND }}>{contratos.length}</span>
              </div>

              {contratos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                  <Building2 size={26} className="mb-2 opacity-30" />
                  <p className="text-sm font-medium">Sin contratos asignados</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-50">
                    {contratos.slice(0, 4).map(c => (
                      <button key={c.id} onClick={() => onVerContrato?.(c.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left group">
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#eff6ff' }}>
                          <Building2 size={12} style={{ color: BRAND }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] font-black" style={{ color: BRAND }}>{c.codigo || '—'}</p>
                          <p className="text-xs font-semibold text-gray-700 truncate">{c.titulo_contrato || c.objeto || 'Sin objeto'}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {c.proveedor_nombre && <span className="text-[10px] text-gray-400">{c.proveedor_nombre}</span>}
                            {formatCOP(c.valor_en_cop) && <span className="text-[10px] font-bold text-emerald-700">{formatCOP(c.valor_en_cop)}</span>}
                          </div>
                        </div>
                        <ChevronRight size={13} className="text-gray-300 group-hover:text-gray-500 shrink-0 transition-colors" />
                      </button>
                    ))}
                  </div>
                  {contratos.length > 4 && (
                    <button onClick={() => onVerContrato?.('')}
                      className="w-full py-2.5 text-xs font-bold border-t border-gray-100 hover:bg-gray-50 transition-colors flex items-center justify-center gap-1"
                      style={{ color: BRAND }}>
                      Ver {contratos.length - 4} más <ChevronRight size={11} />
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Facturas por aprobar */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Receipt size={14} className={facturasPendientes.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
                  <h3 className="font-bold text-gray-800 text-sm">Por aprobar</h3>
                </div>
                <span className={`text-xs font-black px-2 py-0.5 rounded-full ${facturasPendientes.length > 0 ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'}`}>
                  {facturasPendientes.length}
                </span>
              </div>

              {facturasPendientes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <CheckCircle2 size={24} className="mb-2 text-emerald-500" />
                  <p className="text-sm font-bold text-emerald-600">Todo al día</p>
                  <p className="text-xs text-gray-400 mt-0.5">No hay facturas pendientes</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {facturasPendientes.slice(0, 4).map(f => (
                    <button key={f.id} onClick={() => onVerContrato?.(f.solicitud_id)}
                      className="w-full flex items-start gap-3 px-4 py-3 hover:bg-amber-50/40 transition-colors text-left group">
                      <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Receipt size={12} className="text-amber-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-amber-700">{f.numero_ap ? `AP ${f.numero_ap}` : (f.no_factura_cxc || '—')}</p>
                        <p className="text-xs font-semibold text-gray-600 truncate">{f.contrato_objeto || f.contrato_codigo}</p>
                        {formatCOP(f.valor) && <p className="text-[10px] font-bold text-emerald-700 mt-0.5">{formatCOP(f.valor)}</p>}
                      </div>
                      <ChevronRight size={13} className="text-gray-300 group-hover:text-amber-400 shrink-0 transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-2">
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest mb-3">Acciones rápidas</p>
              <button onClick={onNewRequest}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-gray-200 hover:border-orange-300 hover:bg-orange-50/30 transition-all text-sm font-semibold text-gray-500 hover:text-orange-600 group">
                <Plus size={16} className="group-hover:scale-110 transition-transform" />
                Nueva solicitud
              </button>
              {onVerContrato && (
                <button onClick={() => onVerContrato('')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:bg-blue-50/50 hover:border-blue-200 transition-all text-sm font-semibold text-gray-500 hover:text-blue-700 group">
                  <Building2 size={16} className="group-hover:scale-110 transition-transform" />
                  Ver todos mis contratos
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
