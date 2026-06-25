import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollText, Filter, Download, ArrowRight, Loader2, Clock,
  ShieldAlert, Monitor, Search, ChevronLeft, ChevronRight,
  ShieldCheck, Database, Settings, Key, Globe, Activity
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface Log {
  id: string;
  tipo_log: string;
  modulo: string;
  tabla: string;
  registro_id: string;
  accion: string;
  campo: string;
  valor_anterior: string;
  valor_nuevo: string;
  descripcion: string;
  rol_usuario: string;
  resultado: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_email: string;
  ip_address: string;
  creado_en: string;
}

interface LogsResponse {
  logs: Log[];
  total: number;
  limit: number;
  offset: number;
}

const TIPOS_LOG = [
  { value: 'Todos', label: 'Todos los tipos' },
  { value: 'negocio', label: 'Negocio' },
  { value: 'cambio_datos', label: 'Cambio de datos' },
  { value: 'acceso', label: 'Acceso / Auth' },
  { value: 'configuracion', label: 'Configuración' },
  { value: 'seguridad', label: 'Seguridad' },
  { value: 'tecnico', label: 'Técnico' },
];

const MODULOS = [
  { value: 'Todos', label: 'Todos los módulos' },
  { value: 'solicitudes', label: 'Solicitudes' },
  { value: 'convocatorias', label: 'Convocatorias' },
  { value: 'juridica', label: 'Jurídica' },
  { value: 'autenticacion', label: 'Autenticación' },
  { value: 'administracion', label: 'Administración' },
];

const ACCIONES = [
  { value: 'Todos', label: 'Todas las acciones' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'INSERT', label: 'Creación' },
  { value: 'UPDATE', label: 'Modificación' },
  { value: 'DELETE', label: 'Eliminación' },
  { value: 'APROBACION', label: 'Aprobación' },
  { value: 'RECHAZO', label: 'Rechazo' },
  { value: 'INVITACION_FASE1', label: 'Invitación Fase 1' },
  { value: 'INVITACION_MASIVA', label: 'Invitación Masiva' },
  { value: 'INVITACION_LINK', label: 'Envío de Link' },
  { value: 'DEVOLUCION', label: 'Devolución' },
];

const PAGE_SIZE = 50;

type StatsMap = Record<string, number>;

function tipoLogConfig(tipo: string) {
  switch (tipo) {
    case 'negocio':      return { label: 'Negocio',       bg: 'bg-blue-50',    text: 'text-blue-700',   border: 'border-blue-200',   Icon: Activity };
    case 'cambio_datos': return { label: 'Cambio datos',  bg: 'bg-amber-50',   text: 'text-amber-700',  border: 'border-amber-200',  Icon: Database };
    case 'acceso':       return { label: 'Acceso',        bg: 'bg-emerald-50', text: 'text-emerald-700',border: 'border-emerald-200',Icon: Key };
    case 'configuracion':return { label: 'Config',        bg: 'bg-purple-50',  text: 'text-purple-700', border: 'border-purple-200', Icon: Settings };
    case 'seguridad':    return { label: 'Seguridad',     bg: 'bg-rose-50',    text: 'text-rose-700',   border: 'border-rose-200',   Icon: ShieldCheck };
    case 'tecnico':      return { label: 'Técnico',       bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200',  Icon: Globe };
    default:             return { label: tipo || '—',     bg: 'bg-slate-50',   text: 'text-slate-600',  border: 'border-slate-200',  Icon: ScrollText };
  }
}

function accionConfig(accion: string) {
  switch (accion) {
    case 'INSERT':         case 'LOGIN':    return { label: 'Creación/Login',  cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    case 'UPDATE':         return { label: 'Modificación',  cls: 'bg-amber-50 text-amber-700 border-amber-200' };
    case 'DELETE':         return { label: 'Eliminación',   cls: 'bg-rose-50 text-rose-700 border-rose-200' };
    case 'APROBACION':     return { label: 'Aprobación',    cls: 'bg-green-50 text-green-700 border-green-200' };
    case 'RECHAZO':        return { label: 'Rechazo',       cls: 'bg-red-50 text-red-700 border-red-200' };
    case 'INVITACION_FASE1': case 'INVITACION_MASIVA': case 'INVITACION_LINK':
                           return { label: 'Invitación',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    case 'DEVOLUCION':     return { label: 'Devolución',    cls: 'bg-orange-50 text-orange-700 border-orange-200' };
    default:               return { label: accion || '—',  cls: 'bg-slate-50 text-slate-600 border-slate-200' };
  }
}

export function LogsAuditoria() {
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroModulo, setFiltroModulo] = useState('Todos');
  const [filtroAccion, setFiltroAccion] = useState('Todos');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState('');
  const [filtroFechaHasta, setFiltroFechaHasta] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [page, setPage] = useState(0);

  const [data, setData] = useState<LogsResponse>({ logs: [], total: 0, limit: PAGE_SIZE, offset: 0 });
  const [stats, setStats] = useState<StatsMap>({});
  const [loading, setLoading] = useState(true);

  const buildParams = useCallback((currentPage: number) => {
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(currentPage * PAGE_SIZE),
    });
    if (filtroTipo !== 'Todos') params.set('tipo_log', filtroTipo);
    if (filtroModulo !== 'Todos') params.set('modulo', filtroModulo);
    if (filtroAccion !== 'Todos') params.set('accion', filtroAccion);
    if (filtroFechaDesde) params.set('fecha_inicio', filtroFechaDesde);
    if (filtroFechaHasta) params.set('fecha_fin', filtroFechaHasta);
    if (busqueda.trim()) params.set('busqueda', busqueda.trim());
    return params;
  }, [filtroTipo, filtroModulo, filtroAccion, filtroFechaDesde, filtroFechaHasta, busqueda]);

  const fetchLogs = useCallback(async (currentPage: number) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/logs?${buildParams(currentPage)}`);
      if (res.ok) {
        const json = await res.json();
        setData(Array.isArray(json)
          ? { logs: json, total: json.length, limit: PAGE_SIZE, offset: 0 }
          : json);
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetch(`${API_URL}/api/admin/logs/stats`)
      .then(r => r.ok ? r.json() : {})
      .then(setStats)
      .catch(() => {});
  }, []);

  // Cuando cambian los filtros, resetear a página 0
  useEffect(() => {
    setPage(0);
    fetchLogs(0);
  }, [buildParams]);

  // Cuando cambia la página (sin cambio de filtros)
  useEffect(() => {
    fetchLogs(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const totalPages = Math.ceil(data.total / PAGE_SIZE);

  const exportarReporte = () => {
    if (data.logs.length === 0) {
      alert('No hay registros para exportar con los filtros actuales.');
      return;
    }
    const styles = `<style>
      table{border-collapse:collapse;font-family:Calibri,sans-serif;}
      th{background:#E84922;color:#fff;border:1px solid #c73d1c;padding:10px;text-align:left;}
      td{border:1px solid #e2e8f0;padding:8px;font-size:11px;}
    </style>`;
    let html = `<html><head><meta charset="UTF-8">${styles}</head><body>
      <div style="font-size:18px;font-weight:bold;color:#3D2B86;margin-bottom:8px;">BITÁCORA DE AUDITORÍA — INVEST IN BOGOTÁ</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:4px;">Generado: ${new Date().toLocaleString('es-CO')}</div>
      <div style="font-size:10px;color:#64748b;margin-bottom:16px;">Total registros: ${data.total}</div>
      <table><thead><tr>
        <th>FECHA</th><th>HORA</th><th>TIPO</th><th>MÓDULO</th><th>RESPONSABLE</th>
        <th>ROL</th><th>ACCIÓN</th><th>DESCRIPCIÓN</th><th>CAMPO</th>
        <th>VALOR ANTERIOR</th><th>VALOR NUEVO</th><th>RESULTADO</th><th>IP ORIGEN</th>
      </tr></thead><tbody>`;

    data.logs.forEach(log => {
      const f = new Date(log.creado_en);
      html += `<tr>
        <td>${f.toLocaleDateString('es-CO')}</td>
        <td>${f.toLocaleTimeString('es-CO')}</td>
        <td>${(log.tipo_log || '').toUpperCase()}</td>
        <td>${(log.modulo || '').toUpperCase()}</td>
        <td>${(log.usuario_nombre || 'N/A').toUpperCase()}</td>
        <td>${log.rol_usuario || 'N/A'}</td>
        <td>${log.accion || ''}</td>
        <td>${log.descripcion || ''}</td>
        <td style="font-weight:bold;">${log.campo || log.tabla || ''}</td>
        <td style="color:#94a3b8;text-decoration:line-through;">${log.valor_anterior || '—'}</td>
        <td style="background:#f0fdf4;font-weight:bold;color:#166534;">${log.valor_nuevo || '—'}</td>
        <td style="color:${log.resultado === 'fallido' ? '#dc2626' : '#059669'};font-weight:bold;">${(log.resultado || 'exitoso').toUpperCase()}</td>
        <td style="font-family:monospace;">${log.ip_address || '0.0.0.0'}</td>
      </tr>`;
    });

    html += `</tbody></table></body></html>`;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Auditoria_${Date.now()}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && data.logs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-[var(--brand-secondary)] animate-spin" />
        <p className="text-slate-500 font-bold font-gabarito">Consultando traza forense de auditoría...</p>
      </div>
    );
  }

  const statsCards = [
    { tipo: 'negocio',       label: 'Negocio',      color: 'blue'    },
    { tipo: 'cambio_datos',  label: 'Cambio datos', color: 'amber'   },
    { tipo: 'acceso',        label: 'Acceso',       color: 'emerald' },
    { tipo: 'seguridad',     label: 'Seguridad',    color: 'rose'    },
    { tipo: 'configuracion', label: 'Config',       color: 'purple'  },
  ];

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-700 bg-gray-50/50 min-h-full">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-100 rounded-2xl">
              <ShieldAlert className="text-red-600" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                Bitácora de Auditoría
              </h1>
              <p className="text-slate-500 text-sm font-medium">
                {data.total.toLocaleString('es-CO')} evento{data.total !== 1 ? 's' : ''} registrado{data.total !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchLogs(page);
              fetch(`${API_URL}/api/admin/logs/stats`).then(r => r.ok ? r.json() : {}).then(setStats).catch(() => {});
            }}
            title="Actualizar"
            className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-500 hover:text-[var(--brand-secondary)] transition-colors"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Activity size={18} />}
          </button>
          <button
            onClick={exportarReporte}
            className="flex items-center gap-2 px-6 py-3 bg-[#E84922] text-white rounded-2xl hover:bg-[#C73D1C] transition-all font-bold shadow-lg shadow-red-100"
          >
            <Download size={16} /> Exportar Excel
          </button>
        </div>
      </div>

      {/* Stats cards — datos de los últimos 30 días */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {statsCards.map(({ tipo, label }) => {
          const count = stats[tipo] ?? 0;
          const cfg = tipoLogConfig(tipo);
          const CardIcon = cfg.Icon;
          const active = filtroTipo === tipo;
          return (
            <button
              key={tipo}
              onClick={() => setFiltroTipo(active ? 'Todos' : tipo)}
              className={`p-4 rounded-2xl border text-left transition-all group ${
                active
                  ? `${cfg.bg} ${cfg.border}`
                  : 'bg-white border-slate-100 hover:border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <CardIcon size={14} className={active ? cfg.text : 'text-slate-400'} />
                {active && <span className="text-[9px] font-black text-slate-400 uppercase">activo</span>}
              </div>
              <p className="text-2xl font-black text-slate-900">{count.toLocaleString('es-CO')}</p>
              <p className={`text-[10px] font-black uppercase tracking-wide ${active ? cfg.text : 'text-slate-400'}`}>{label}</p>
              <p className="text-[9px] text-slate-300 mt-0.5">últimos 30 días</p>
            </button>
          );
        })}
      </div>

      {/* Filtros */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Filter size={10} /> Tipo de log
            </p>
            <select
              value={filtroTipo}
              onChange={e => setFiltroTipo(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--brand-secondary)]/20 appearance-none"
            >
              {TIPOS_LOG.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Globe size={10} /> Módulo
            </p>
            <select
              value={filtroModulo}
              onChange={e => setFiltroModulo(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--brand-secondary)]/20 appearance-none"
            >
              {MODULOS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Activity size={10} /> Acción
            </p>
            <select
              value={filtroAccion}
              onChange={e => setFiltroAccion(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--brand-secondary)]/20 appearance-none"
            >
              {ACCIONES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Desde</p>
            <input
              type="date"
              value={filtroFechaDesde}
              onChange={e => setFiltroFechaDesde(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--brand-secondary)]/20"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hasta</p>
            <input
              type="date"
              value={filtroFechaHasta}
              onChange={e => setFiltroFechaHasta(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-bold text-slate-700 focus:ring-2 focus:ring-[var(--brand-secondary)]/20"
            />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Search size={10} /> Buscar
            </p>
            <input
              type="text"
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              placeholder="Descripción, usuario, campo..."
              className="w-full px-4 py-3 bg-slate-50 border-transparent rounded-xl text-sm font-medium text-slate-700 placeholder:text-slate-400 focus:ring-2 focus:ring-[var(--brand-secondary)]/20"
            />
          </div>
        </div>
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading && (
          <div className="flex items-center justify-center py-4 gap-2 border-b border-slate-50">
            <Loader2 size={14} className="animate-spin text-slate-400" />
            <span className="text-xs text-slate-400 font-medium">Actualizando...</span>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Fecha / Hora</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">De → A</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Resultado</th>
                <th className="px-5 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {data.logs.length > 0 ? data.logs.map(log => {
                const tipo = tipoLogConfig(log.tipo_log);
                const acc = accionConfig(log.accion);
                const fecha = new Date(log.creado_en);
                const TipoIcon = tipo.Icon;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap">
                      <p className="text-sm font-black text-slate-800 font-gabarito">
                        {fecha.toLocaleDateString('es-CO')}
                      </p>
                      <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                        <Clock size={9} />
                        {fecha.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${tipo.bg} ${tipo.text} ${tipo.border}`}>
                        <TipoIcon size={9} /> {tipo.label}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {log.modulo || log.tabla || '—'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-bold text-slate-800">{log.usuario_nombre || 'Sistema'}</p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{log.usuario_email || log.rol_usuario || '—'}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${acc.cls}`}>
                        {acc.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 max-w-[240px]">
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {log.descripcion || log.campo || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-4 max-w-[180px]">
                      {log.valor_anterior || log.valor_nuevo ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          {log.valor_anterior && (
                            <span className="text-slate-400 line-through truncate max-w-[70px]">{log.valor_anterior}</span>
                          )}
                          {log.valor_anterior && log.valor_nuevo && (
                            <ArrowRight size={10} className="text-slate-300 flex-shrink-0" />
                          )}
                          {log.valor_nuevo && (
                            <span className="font-bold text-[var(--brand-secondary)] truncate max-w-[70px]">{log.valor_nuevo}</span>
                          )}
                        </div>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                        log.resultado === 'fallido'
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      }`}>
                        {log.resultado || 'exitoso'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 font-mono uppercase">
                        <Monitor size={9} /> {log.ip_address || '—'}
                      </p>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={9} className="px-6 py-20 text-center text-slate-400 italic font-medium">
                    No se encontraron registros con los criterios seleccionados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {data.total > PAGE_SIZE && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-50">
            <p className="text-xs text-slate-400 font-medium">
              Mostrando {data.offset + 1}–{Math.min(data.offset + PAGE_SIZE, data.total)} de {data.total.toLocaleString('es-CO')}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-bold text-slate-600 px-2">
                {page + 1} / {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl border border-slate-100 text-slate-500 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
