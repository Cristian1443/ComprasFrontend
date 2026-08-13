import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { Search, Star, ArrowRight, FileText, CheckCircle2, Clock, RotateCcw } from 'lucide-react';

interface MisSolicitudesProps {
  onEdit: (solicitudId: string) => void;
  onEvaluar?: () => void;
  userEmail?: string;
}

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const BRAND = '#2f6fa3';
const CTA = '#E84922';

const ESTADO_LABEL: Record<string, string> = {
  borrador: 'Borrador',
  enviado_gerente: 'En gerencia',
  aprobado_gerente: 'Aprobado gerente',
  rechazado_gerente: 'Devuelto gerente',
  en_financiera: 'En financiera',
  aprobado_financiera: 'Aprobado financiera',
  rechazado_financiera: 'Devuelto financiera',
  en_juridica: 'En juridica',
  enviado_juridica: 'En juridica',
  aprobado_juridica: 'Aprobado juridica',
  rechazado_juridica: 'Devuelto juridica',
  aprobado_comite: 'Aprobado comite',
  rechazado_comite: 'Devuelto comite',
  devuelto_al_solicitante: 'Devuelto gerente',
  finalizado: 'Finalizado',
  contratado: 'Contratado',
};

type Filtro = 'todos' | 'accion' | 'revision' | 'cerradas';

const esAccion   = (e: string) => ['borrador','devuelto_al_solicitante','rechazado_gerente','rechazado_financiera','rechazado_comite','rechazado_juridica'].includes(e);
const esRevision = (e: string) => ['enviado_gerente','en_financiera','aprobado_financiera','en_juridica','enviado_juridica','aprobado_comite'].includes(e);
const esCerrada  = (e: string) => ['aprobado_juridica','finalizado','contratado','cerrado','cancelado'].includes(e);

function EstadoBadge({ estado }: { estado: string }) {
  const label = ESTADO_LABEL[estado] || estado.replace(/_/g, ' ');
  const isRechazado = estado.includes('rechazado') || estado === 'devuelto_al_solicitante';
  const isAprobado  = estado.includes('aprobado') || ['finalizado','contratado'].includes(estado);
  const isEnProceso = estado.includes('en_') || estado.startsWith('enviado');
  const cls = isRechazado  ? 'bg-red-50 text-red-600 border-red-200'
    : isAprobado  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
    : isEnProceso ? 'bg-blue-50 text-blue-600 border-blue-200'
    : 'bg-gray-100 text-gray-500 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wide whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

const TABS: { id: Filtro; label: string; icon: React.ReactNode }[] = [
  { id: 'todos',    label: 'Todas',           icon: <FileText size={12} /> },
  { id: 'accion',   label: 'Accion requerida', icon: <RotateCcw size={12} /> },
  { id: 'revision', label: 'En revision',      icon: <Clock size={12} /> },
  { id: 'cerradas', label: 'Cerradas',         icon: <CheckCircle2 size={12} /> },
];

const fmtNum = (v: any): string | null =>
  v != null && v !== '' && !isNaN(Number(v))
    ? new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(Number(v))
    : null;

export function MisSolicitudes({ onEdit, onEvaluar, userEmail }: MisSolicitudesProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtro, setFiltro]     = useState<Filtro>('todos');
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);

  const emailSupervisor = (userEmail || '').trim().toLowerCase();

  useEffect(() => {
    if (!emailSupervisor) { setSolicitudes([]); setCargando(false); return; }
    apiFetch(`${API_URL}/api/solicitudes?email=${encodeURIComponent(emailSupervisor)}`)
      .then(r => r.ok ? r.json() : [])
      .then(d => setSolicitudes(Array.isArray(d) ? d : []))
      .catch(() => setSolicitudes([]))
      .finally(() => setCargando(false));
  }, [emailSupervisor]);

  const lista = solicitudes.filter(s => {
    const e = String(s.estado || 'borrador');
    const match = filtro === 'accion' ? esAccion(e) : filtro === 'revision' ? esRevision(e) : filtro === 'cerradas' ? esCerrada(e) : true;
    return match && `${s.objeto||''} ${s.codigo||''}`.toLowerCase().includes(busqueda.toLowerCase());
  });

  const conteos = {
    todos:    solicitudes.length,
    accion:   solicitudes.filter(s => esAccion(String(s.estado||''))).length,
    revision: solicitudes.filter(s => esRevision(String(s.estado||''))).length,
    cerradas: solicitudes.filter(s => esCerrada(String(s.estado||''))).length,
  };

  const getValor = (s: any): { moneda: string; valor: string } | null => {
    const m = String(s?.moneda || 'COP').toUpperCase();
    const txt = m === 'USD' ? s?.valor_moneda_usd_texto : m === 'EUR' ? s?.valor_moneda_eur_texto : s?.valor_moneda_cop_texto;
    if (txt) return { moneda: m, valor: txt };
    const numFmt = fmtNum(s.valor_estimado);
    if (numFmt) return { moneda: 'COP', valor: numFmt };
    return null;
  };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* HEADER */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-6 lg:px-8 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Compras y Contratacion</p>
            <h1 className="text-xl font-black text-gray-900">
              Mis <span style={{ color: CTA }}>Solicitudes</span>
            </h1>
          </div>
          <span className="text-sm text-gray-400 shrink-0">
            <span className="font-black text-gray-800">{lista.length}</span>
            <span className="mx-1 text-gray-300">/</span>
            {solicitudes.length} registros
          </span>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="bg-white border-b border-gray-100 px-6 lg:px-8 py-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative sm:w-72">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por objeto o codigo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
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
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
                <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                  filtro === t.id ? 'bg-white/20 text-white' : 'bg-white text-gray-500'
                }`}>
                  {conteos[t.id]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="px-6 lg:px-8 py-5">
        {cargando ? (
          <div className="flex justify-center items-center py-20">
            <div className="w-7 h-7 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-dashed border-gray-200 text-gray-400">
            <FileText size={32} className="mb-2 opacity-30" />
            <p className="font-semibold">Sin resultados</p>
            <p className="text-sm mt-0.5">Cambia el filtro o la busqueda</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">

            {/* Cabecera — solo desktop lg+ */}
            <div
              className="hidden lg:grid border-b border-gray-100 bg-gray-50 px-5 py-2.5"
              style={{ gridTemplateColumns: '140px 1fr 110px 150px 160px 110px' }}
            >
              {['Codigo', 'Solicitud', 'Modalidad', 'Estado', 'Presupuesto', 'Accion'].map(h => (
                <p key={h} className="text-[10px] font-black uppercase tracking-widest text-gray-400">{h}</p>
              ))}
            </div>

            {lista.map((sol, idx) => {
              const estado       = String(sol.estado || 'borrador');
              const accion       = esAccion(estado);
              const contratado   = estado === 'contratado';
              const valor        = getValor(sol);
              const aprobadoFmt  = fmtNum(sol.presupuesto_aprobado);
              const monedaLabel  = aprobadoFmt ? 'COP' : valor?.moneda ?? 'COP';
              const presupuesto  = aprobadoFmt ?? valor?.valor ?? null;
              const accentColor  = accion ? CTA : esRevision(estado) ? BRAND : esCerrada(estado) ? '#059669' : '#e5e7eb';

              return (
                <div key={sol.id} className={idx !== 0 ? 'border-t border-gray-100' : ''}>

                  {/* DESKTOP: grid de 6 columnas */}
                  <div
                    className="hidden lg:grid items-center px-5 py-3 hover:bg-gray-50/70 transition-colors cursor-pointer"
                    style={{ gridTemplateColumns: '140px 1fr 110px 150px 160px 110px' }}
                    onClick={() => onEdit(sol.id)}
                  >
                    {/* Codigo + fecha */}
                    <div className="flex items-center gap-2">
                      <div className="w-0.5 h-7 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                      <div>
                        <p className="text-[11px] font-black" style={{ color: BRAND }}>{sol.codigo || '-'}</p>
                        <p className="text-[10px] text-gray-400">
                          {sol.creado_en
                            ? new Date(sol.creado_en).toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'2-digit' })
                            : '-'}
                        </p>
                      </div>
                    </div>

                    {/* Objeto */}
                    <p className="text-sm font-semibold text-gray-800 truncate pr-4">{sol.titulo_contrato || sol.objeto || 'Sin objeto'}</p>

                    {/* Modalidad */}
                    <span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit">
                      {sol.modalidad || 'Directa'}
                    </span>

                    {/* Estado */}
                    <div><EstadoBadge estado={estado} /></div>

                    {/* Presupuesto: una sola linea */}
                    <div className="min-w-0">
                      {presupuesto ? (
                        <p className="text-sm font-bold text-gray-800 truncate">
                          <span className="text-[10px] font-semibold text-gray-400 mr-1">{monedaLabel}</span>
                          {presupuesto}
                        </p>
                      ) : (
                        <span className="text-gray-300 text-xs">-</span>
                      )}
                    </div>

                    {/* Accion */}
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      {contratado && onEvaluar && (
                        <button
                          onClick={onEvaluar}
                          className="p-1.5 rounded-lg border border-gray-200 text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-colors"
                          title="Evaluar proveedor"
                        >
                          <Star size={13} />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(sol.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                        style={{ backgroundColor: accion ? CTA : BRAND }}
                      >
                        {accion ? 'Corregir' : 'Ver'}
                        <ArrowRight size={11} />
                      </button>
                    </div>
                  </div>

                  {/* MOVIL / TABLET: fila compacta */}
                  <div
                    className="flex lg:hidden items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => onEdit(sol.id)}
                  >
                    <div className="w-0.5 h-10 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                        <span className="text-[10px] font-black" style={{ color: BRAND }}>{sol.codigo}</span>
                        <EstadoBadge estado={estado} />
                      </div>
                      <p className="text-sm font-semibold text-gray-800 truncate">{sol.titulo_contrato || sol.objeto || 'Sin objeto'}</p>
                      {presupuesto && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          <span className="font-semibold text-gray-700">{monedaLabel} {presupuesto}</span>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); onEdit(sol.id); }}
                      className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ backgroundColor: accion ? CTA : BRAND }}
                    >
                      {accion ? 'Corregir' : 'Ver'} <ArrowRight size={11} />
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
