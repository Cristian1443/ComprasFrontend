import React, { useState } from 'react';
import {
  Users, Search, CheckCircle2, AlertTriangle, Clock,
  FileText, Building2, MapPin, Phone, Mail, Shield,
  TrendingUp, Star,
} from 'lucide-react';

const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';

const proveedores = [
  {
    id: 1,
    nombre: 'Consultores ABC S.A.S.',
    nit: '900.123.456-7',
    categoria: 'Consultoría',
    ciudad: 'Bogotá',
    telefono: '+57 310 123 4567',
    email: 'contacto@consultoresabc.com',
    estado: 'Habilitado',
    documentos: 'Completos',
    riesgo: 'Bajo',
    contratosActivos: 2,
    calificacion: 4.7,
    ultimaEvaluacion: '2026-05-20',
    representante: 'Carlos Moreno',
  },
  {
    id: 2,
    nombre: 'Inversión Global Ltda.',
    nit: '900.234.567-8',
    categoria: 'Servicios Financieros',
    ciudad: 'Medellín',
    telefono: '+57 320 234 5678',
    email: 'info@inversionglobal.com',
    estado: 'Habilitado',
    documentos: 'Completos',
    riesgo: 'Medio',
    contratosActivos: 1,
    calificacion: 3.9,
    ultimaEvaluacion: '2026-04-10',
    representante: 'Laura Jiménez',
  },
  {
    id: 3,
    nombre: 'Asesores Estratégicos S.A.',
    nit: '900.345.678-9',
    categoria: 'Asesoría Empresarial',
    ciudad: 'Cali',
    telefono: '+57 315 345 6789',
    email: 'contacto@asesores-estrategicos.com',
    estado: 'En Revisión',
    documentos: 'Pendientes',
    riesgo: 'Alto',
    contratosActivos: 0,
    calificacion: 2.5,
    ultimaEvaluacion: '2026-03-01',
    representante: 'Jorge Ramírez',
  },
];

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

function EstadoBadge({ estado }: { estado: string }) {
  if (estado === 'Habilitado')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} /> Habilitado
      </span>
    );
  if (estado === 'En Revisión')
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={10} /> En Revisión
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
      <AlertTriangle size={10} /> {estado}
    </span>
  );
}

function RiesgoBadge({ riesgo }: { riesgo: string }) {
  const cfg: Record<string, { bg: string; text: string; border: string }> = {
    Bajo:   { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    Medio:  { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
    Alto:   { bg: '#fff1f2', text: '#be123c', border: '#fecdd3' },
  };
  const c = cfg[riesgo] || cfg['Medio'];
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full border"
      style={{ background: c.bg, color: c.text, borderColor: c.border }}>
      <Shield size={9} /> Riesgo {riesgo}
    </span>
  );
}

function DocsBadge({ docs }: { docs: string }) {
  if (docs === 'Completos')
    return (
      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
        Docs completos
      </span>
    );
  return (
    <span className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-2 py-0.5 rounded-full">
      Docs pendientes
    </span>
  );
}

function Stars({ val }: { val: number }) {
  const full = Math.floor(val);
  const half = val - full >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={11}
          fill={i < full ? '#f59e0b' : i === full && half ? '#fde68a' : 'none'}
          stroke={i < full || (i === full && half) ? '#f59e0b' : '#d1d5db'}
          strokeWidth={1.5} />
      ))}
      <span className="ml-1 text-xs font-bold text-gray-700">{val.toFixed(1)}</span>
    </div>
  );
}

export function ProveedoresJuridica() {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');

  const habilitados = proveedores.filter(p => p.estado === 'Habilitado').length;
  const enRevision  = proveedores.filter(p => p.estado === 'En Revisión').length;
  const altoRiesgo  = proveedores.filter(p => p.riesgo === 'Alto').length;

  const filtrados = proveedores.filter(p => {
    const matchSearch = !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      p.nit.includes(search) ||
      p.categoria.toLowerCase().includes(search.toLowerCase()) ||
      p.ciudad.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos' || p.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  const avatarColor = (i: number) => {
    const palette = [BRAND, '#7c3aed', '#0891b2'];
    return palette[i % palette.length];
  };

  return (
    <div className="min-h-screen" style={{ background: '#f4f7fb', fontFamily: 'Gabarito, sans-serif' }}>

      {/* ── HEADER ── */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-6">
          <div className="flex items-start justify-between gap-6 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} style={{ color: CTA }} />
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Área Jurídica</span>
              </div>
              <h1 className="text-2xl font-black text-gray-900">
                Gestión de <span style={{ color: CTA }}>Proveedores</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Shield size={12} /> Validación legal y seguimiento de proveedores
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 shrink-0">
              <Users size={14} style={{ color: BRAND }} />
              <span className="font-black text-sm" style={{ color: BRAND }}>{proveedores.length}</span>
              <span className="text-gray-400 text-xs">proveedores</span>
            </div>
          </div>

          {/* KPI chips */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Habilitados',  val: habilitados, accent: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'En Revisión',  val: enRevision,  accent: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
              { label: 'Alto Riesgo',  val: altoRiesgo,  accent: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
            ].map((s, i) => (
              <div key={i} className="rounded-xl px-4 py-3 border"
                style={{ background: s.bg, borderColor: s.border }}>
                <p className="text-2xl font-black" style={{ color: s.accent }}>{s.val}</p>
                <p className="text-[11px] font-semibold uppercase tracking-wide mt-0.5 text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div className="max-w-[1100px] mx-auto px-6 lg:px-10 py-6 space-y-5">

        {/* Barra de búsqueda + filtros */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, NIT, categoría o ciudad..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            />
          </div>
          <div className="flex gap-2">
            {(['todos', 'Habilitado', 'En Revisión'] as const).map(est => (
              <button key={est} onClick={() => setFiltroEstado(est)}
                className="px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap"
                style={{
                  background: filtroEstado === est ? BRAND : 'white',
                  color: filtroEstado === est ? 'white' : '#6b7280',
                  borderColor: filtroEstado === est ? BRAND : '#e5e7eb',
                }}>
                {est === 'todos' ? 'Todos' : est}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de proveedores */}
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-black text-gray-700">Sin resultados</p>
            <p className="text-sm text-gray-400 mt-1">No hay proveedores que coincidan con la búsqueda.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtrados.map((p, idx) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all">
                <div className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-sm"
                      style={{ background: avatarColor(idx) }}>
                      {initials(p.nombre)}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-black text-gray-900 leading-tight">{p.nombre}</h3>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                            <span className="font-mono font-bold">{p.nit}</span>
                            <span className="flex items-center gap-1">
                              <Building2 size={10} /> {p.categoria}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {p.ciudad}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 shrink-0">
                          <EstadoBadge estado={p.estado} />
                          <RiesgoBadge riesgo={p.riesgo} />
                          <DocsBadge docs={p.documentos} />
                        </div>
                      </div>

                      {/* Calificación */}
                      <div className="flex items-center gap-1.5 mb-3">
                        <Stars val={p.calificacion} />
                        <span className="text-[10px] text-gray-400">· Última evaluación: {new Date(p.ultimaEvaluacion).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      </div>

                      {/* Detalles en grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Representante</p>
                          <p className="text-xs font-bold text-gray-700">{p.representante}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Contratos activos</p>
                          <div className="flex items-center gap-1">
                            <FileText size={11} style={{ color: BRAND }} />
                            <p className="text-xs font-black" style={{ color: BRAND }}>{p.contratosActivos}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Teléfono</p>
                          <div className="flex items-center gap-1">
                            <Phone size={10} className="text-gray-400" />
                            <p className="text-xs font-bold text-gray-700">{p.telefono}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Correo</p>
                          <div className="flex items-center gap-1 min-w-0">
                            <Mail size={10} className="text-gray-400 shrink-0" />
                            <p className="text-xs font-bold text-gray-700 truncate">{p.email}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer de la card */}
                <div className="px-5 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <TrendingUp size={12} className="text-gray-400" />
                    <span className="text-[11px] font-semibold text-gray-500">
                      {p.estado === 'Habilitado' ? 'Apto para nuevos procesos de contratación' : 'Revisión documental en proceso'}
                    </span>
                  </div>
                  <button
                    className="text-xs font-black px-3 py-1.5 rounded-lg transition-all hover:opacity-80"
                    style={{ color: BRAND_DARK, background: '#eff6ff', border: `1px solid #bfdbfe` }}>
                    Ver expediente
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
          {filtrados.length} proveedor{filtrados.length !== 1 ? 'es' : ''} registrado{filtrados.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  );
}
