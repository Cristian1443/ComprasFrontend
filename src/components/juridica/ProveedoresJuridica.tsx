import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import {
  Users, Search, CheckCircle2, AlertTriangle, ShieldOff,
  Building2, Shield, Calendar, FileText, X, Loader2, User, Phone, Mail, Globe,
  IdCard, MapPin, Percent, Landmark, CreditCard, Download, File as FileIcon,
  FileCheck2, ChevronRight, Clock, XCircle,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const FONT = 'Gabarito, sans-serif';

const BRAND      = '#2f6fa3';
const BRAND_DARK = '#1f4e79';
const CTA        = '#E84922';

type Proveedor = {
  identificador: string;
  nombre: string;
  contacto: string | null;
  correo: string | null;
  num_procesos: number;
  num_seleccionado: number;
  ultima_participacion: string | null;
  ultima_calificacion: number | null;
  fecha_ultima_evaluacion: string | null;
  observaciones_evaluacion: string | null;
  bloqueado: boolean;
  motivo_bloqueo: string | null;
  contratos_activos: number;
  contratos_totales: number;
};

type Contrato = {
  id: string;
  codigo: string;
  objeto: string;
  estado: string;
  moneda: string | null;
  valor_en_cop: number | null;
  valor_estimado: number | null;
  valor_moneda_cop_texto: string | null;
  valor_moneda_usd_texto: string | null;
  valor_moneda_eur_texto: string | null;
  plazo_ejecucion_meses: number | null;
  plazo_ejecucion_dias: number | null;
  creado_en: string;
  fecha_respuesta_juridica: string | null;
  supervisor_nombre: string | null;
};

function calcularEstadoContrato(c: Contrato): 'activo' | 'vencido' | 'finalizado' {
  if (c.estado === 'finalizado') return 'finalizado';
  if (!c.fecha_respuesta_juridica) return 'activo';
  const inicio = new Date(c.fecha_respuesta_juridica);
  const meses = c.plazo_ejecucion_meses ?? 0;
  const dias = c.plazo_ejecucion_dias ?? 0;
  if (meses === 0 && dias === 0) return 'activo';
  const fin = new Date(inicio);
  fin.setMonth(fin.getMonth() + meses);
  fin.setDate(fin.getDate() + dias);
  return fin < new Date() ? 'vencido' : 'activo';
}

function formatValorContrato(c: Contrato): string {
  const m = String(c.moneda || 'COP').toUpperCase();
  if (m === 'USD' && c.valor_moneda_usd_texto) return `USD ${c.valor_moneda_usd_texto}`;
  if (m === 'EUR' && c.valor_moneda_eur_texto) return `EUR ${c.valor_moneda_eur_texto}`;
  if (c.valor_moneda_cop_texto) return `COP ${c.valor_moneda_cop_texto}`;
  const val = c.valor_en_cop ?? c.valor_estimado;
  if (val == null) return '—';
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val));
}

function formatPlazoContrato(c: Contrato): string {
  const meses = c.plazo_ejecucion_meses ?? 0;
  const dias = c.plazo_ejecucion_dias ?? 0;
  if (meses > 0 && dias > 0) return `${meses} meses, ${dias} días`;
  if (meses > 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
  if (dias > 0) return `${dias} días`;
  return '—';
}

function BadgeContrato({ estado }: { estado: 'activo' | 'vencido' | 'finalizado' }) {
  if (estado === 'activo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} /> Activo
      </span>
    );
  }
  if (estado === 'vencido') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-amber-50 text-amber-700 border border-amber-200">
        <Clock size={10} /> Vencido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide bg-gray-50 text-gray-500 border border-gray-200">
      <XCircle size={10} /> Finalizado
    </span>
  );
}

type DocumentoProveedor = {
  tipo: string; nombre: string; url: string; tamano: number; subido_en: string;
};

type FormularioRA14 = {
  proponente_nombre: string;
  proponente_email: string;
  telefono: string | null;
  cedula_nit: string | null;
  tipo_persona: 'empresa' | 'persona' | null;
  tipo_documento: string | null;
  domicilio: string | null;
  pagina_web: string | null;
  representante_legal_nombre: string | null;
  representante_legal_tipo_id: string | null;
  representante_legal_identificacion: string | null;
  representante_legal_direccion: string | null;
  representante_legal_autorizado: string | null;
  ciiu: string | null;
  tarifa: string | null;
  regimen: string | null;
  actividad_economica: string | null;
  municipio_inscripcion: string | null;
  es_gran_contribuyente: boolean | null;
  gran_contribuyente_resolucion: string | null;
  gran_contribuyente_fecha: string | null;
  es_auto_retenedor: boolean | null;
  auto_retenedor_resolucion: string | null;
  auto_retenedor_fecha: string | null;
  es_entidad_estado: boolean | null;
  exento_impuesto_renta: boolean | null;
  banco: string | null;
  banco_sucursal: string | null;
  banco_email_contacto: string | null;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  respondida: boolean;
  documentos_proveedor: DocumentoProveedor[];
};

const DOCUMENTO_PROVEEDOR_LABELS: Record<string, string> = {
  rut: 'RUT',
  cedula_rl: 'Cédula (persona natural / representante legal)',
  camara_comercio: 'Certificado de existencia y representación legal (Cámara de comercio)',
  redam: 'REDAM (Registro de Deudores Alimentarios Morosos)',
  antecedentes_fiscales: 'Antecedentes fiscales',
  antecedentes_disciplinarios: 'Antecedentes disciplinarios',
  antecedentes_judiciales: 'Antecedentes judiciales',
  hoja_vida: 'Hoja de vida',
  titulo_profesional: 'Título profesional',
  certificaciones_laborales: 'Certificaciones laborales',
};

type EstadoFiltro = 'todos' | 'bloqueado' | 'evaluado' | 'sin_evaluar' | 'con_contrato';

function estadoDe(p: Proveedor): EstadoFiltro {
  if (p.bloqueado) return 'bloqueado';
  if (p.ultima_calificacion != null) return 'evaluado';
  return 'sin_evaluar';
}

function initials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_PALETTE = ['#2f6fa3', '#7c3aed', '#0891b2', '#c2410c', '#0f766e', '#be123c'];
function avatarColorDe(identificador: string) {
  let hash = 0;
  for (let i = 0; i < identificador.length; i++) hash = (hash * 31 + identificador.charCodeAt(i)) | 0;
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function fmtFecha(iso: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

function EstadoBadge({ p }: { p: Proveedor }) {
  if (p.bloqueado)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
        <ShieldOff size={10} /> Bloqueado
      </span>
    );
  if (p.ultima_calificacion != null)
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
        <CheckCircle2 size={10} /> Evaluado
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-gray-50 text-gray-500 border border-gray-200">
      <AlertTriangle size={10} /> Sin evaluar
    </span>
  );
}

function RiesgoBadge({ total }: { total: number }) {
  const cfg = total >= 85
    ? { label: 'Bajo', bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' }
    : total >= 70
    ? { label: 'Medio', bg: '#fffbeb', text: '#b45309', border: '#fde68a' }
    : { label: 'Alto', bg: '#fff1f2', text: '#be123c', border: '#fecdd3' };
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full border"
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}>
      <Shield size={9} /> Riesgo {cfg.label}
    </span>
  );
}

/* ── Estilos y bloque reutilizable del modal de formulario RA1-4 ── */
const s: Record<string, React.CSSProperties> = {
  seccion: { fontFamily: FONT, fontSize: 11, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: '0 0 8px' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
};

function Campo({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
      <div style={{ color: '#94a3b8', marginTop: 2, flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <p style={{ fontFamily: FONT, fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' as const, margin: '0 0 2px' }}>{label}</p>
        <p style={{ fontFamily: FONT, fontSize: 13, color: '#1e293b', margin: 0, fontWeight: 600, wordBreak: 'break-word' as const }}>{value?.trim() ? value : '—'}</p>
      </div>
    </div>
  );
}

export function ProveedoresJuridica() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<EstadoFiltro>('todos');

  /* ── Modal de detalle: formulario RA1-4 + contratos del proveedor ── */
  const [proveedorActivo, setProveedorActivo] = useState<Proveedor | null>(null);
  const [pestana, setPestana] = useState<'formulario' | 'contratos'>('formulario');

  const [cargandoFormulario, setCargandoFormulario] = useState(false);
  const [formularioData, setFormularioData] = useState<FormularioRA14 | null>(null);
  const [errorFormulario, setErrorFormulario] = useState('');

  const [cargandoContratos, setCargandoContratos] = useState(false);
  const [contratosData, setContratosData] = useState<Contrato[] | null>(null);
  const [errorContratos, setErrorContratos] = useState('');

  const cargarFormulario = async (prov: Proveedor) => {
    setFormularioData(null);
    setErrorFormulario('');
    setCargandoFormulario(true);
    try {
      const params = new URLSearchParams();
      if (prov.correo) params.set('email', prov.correo);
      params.set('nombre', prov.nombre);
      const resp = await apiFetch(`${API_URL}/api/proveedores/formulario-ra14?${params.toString()}`);
      const d = await resp.json();
      if (!resp.ok) throw new Error(d.error || 'No se pudo cargar el formulario.');
      setFormularioData(d);
    } catch (err: any) {
      setErrorFormulario(err.message || 'No se pudo cargar el formulario.');
    } finally {
      setCargandoFormulario(false);
    }
  };

  const cargarContratos = async (prov: Proveedor) => {
    setCargandoContratos(true);
    setErrorContratos('');
    try {
      const resp = await apiFetch(`${API_URL}/api/juridica/contratos?proveedor=${encodeURIComponent(prov.nombre)}`);
      const d = await resp.json();
      if (!resp.ok) throw new Error((d && d.error) || 'No se pudieron cargar los contratos.');
      setContratosData(Array.isArray(d) ? d : []);
    } catch (err: any) {
      setErrorContratos(err.message || 'No se pudieron cargar los contratos.');
    } finally {
      setCargandoContratos(false);
    }
  };

  const abrirDetalle = (prov: Proveedor) => {
    setProveedorActivo(prov);
    setPestana('formulario');
    setContratosData(null);
    setErrorContratos('');
    cargarFormulario(prov);
  };

  const cambiarPestana = (tab: 'formulario' | 'contratos') => {
    setPestana(tab);
    if (tab === 'contratos' && contratosData === null && !cargandoContratos && proveedorActivo) {
      cargarContratos(proveedorActivo);
    }
  };

  const cargar = () => {
    setLoading(true);
    setError(null);
    apiFetch(`${API_URL}/api/juridica/proveedores`)
      .then(r => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then(d => setProveedores(Array.isArray(d) ? d : []))
      .catch(() => setError('No se pudo cargar el directorio de proveedores. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const bloqueados    = proveedores.filter(p => p.bloqueado).length;
  const evaluados     = proveedores.filter(p => !p.bloqueado && p.ultima_calificacion != null).length;
  const sinEvaluar    = proveedores.filter(p => !p.bloqueado && p.ultima_calificacion == null).length;
  const conContrato   = proveedores.filter(p => p.contratos_activos > 0).length;

  const filtrados = proveedores.filter(p => {
    const matchSearch = !search ||
      p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.contacto || '').toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'todos'
      || (filtroEstado === 'con_contrato' ? p.contratos_activos > 0 : estadoDe(p) === filtroEstado);
    return matchSearch && matchEstado;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f7fb' }}>
      <div className="flex flex-col items-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-100 rounded-full animate-spin" style={{ borderTopColor: BRAND }} />
        <p className="text-sm font-medium text-gray-500">Cargando proveedores…</p>
      </div>
    </div>
  );

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
                Directorio de <span style={{ color: CTA }}>Proveedores</span>
              </h1>
              <p className="text-sm text-gray-400 mt-0.5 flex items-center gap-1.5">
                <Shield size={12} /> Historial de participación y evaluación de proveedores
              </p>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 shrink-0">
              <Users size={14} style={{ color: BRAND }} />
              <span className="font-black text-sm" style={{ color: BRAND }}>{proveedores.length}</span>
              <span className="text-gray-400 text-xs">proveedores</span>
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">
              <AlertTriangle size={16} />
              <span className="flex-1">{error}</span>
              <button onClick={cargar} className="text-xs font-black uppercase underline underline-offset-2 hover:opacity-70">
                Reintentar
              </button>
            </div>
          )}

          {/* KPI chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Con contrato activo', val: conContrato, accent: '#2f6fa3', bg: '#eff6ff', border: '#bfdbfe' },
              { label: 'Evaluados',    val: evaluados,  accent: '#10b981', bg: '#f0fdf4', border: '#bbf7d0' },
              { label: 'Sin Evaluar',  val: sinEvaluar, accent: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
              { label: 'Bloqueados',   val: bloqueados, accent: '#f43f5e', bg: '#fff1f2', border: '#fecdd3' },
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
              placeholder="Buscar por nombre o contacto..."
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all shadow-sm"
              style={{ fontFamily: 'Gabarito, sans-serif' }}
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {([
              { id: 'todos', label: 'Todos' },
              { id: 'con_contrato', label: 'Con contrato activo' },
              { id: 'evaluado', label: 'Evaluados' },
              { id: 'sin_evaluar', label: 'Sin evaluar' },
              { id: 'bloqueado', label: 'Bloqueados' },
            ] as const).map(f => (
              <button key={f.id} onClick={() => setFiltroEstado(f.id)}
                className="px-3 py-2 rounded-xl text-xs font-bold border transition-all whitespace-nowrap"
                style={{
                  background: filtroEstado === f.id ? BRAND : 'white',
                  color: filtroEstado === f.id ? 'white' : '#6b7280',
                  borderColor: filtroEstado === f.id ? BRAND : '#e5e7eb',
                }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Lista de proveedores */}
        {filtrados.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-lg font-black text-gray-700">
              {proveedores.length === 0 ? 'Aún no hay proveedores registrados' : 'Sin resultados'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {proveedores.length === 0
                ? 'Los proveedores aparecen aquí en cuanto participan como proponentes en una convocatoria.'
                : 'No hay proveedores que coincidan con la búsqueda o el filtro seleccionado.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtrados.map((p) => (
              <div
                key={p.identificador}
                onClick={() => abrirDetalle(p)}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') abrirDetalle(p); }}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
              >
                <div className="p-5">
                  <div className="flex items-start gap-4">

                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 text-white font-black text-sm"
                      style={{ background: avatarColorDe(p.identificador) }}>
                      {initials(p.nombre)}
                    </div>

                    {/* Info principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                        <div>
                          <h3 className="text-base font-black text-gray-900 leading-tight">{p.nombre}</h3>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-gray-400">
                            {p.contacto ? (
                              <span>{p.contacto}</span>
                            ) : (
                              <span className="italic">Sin datos de contacto registrados</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {p.contratos_activos > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wide px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                              <FileCheck2 size={10} /> {p.contratos_activos} contrato{p.contratos_activos !== 1 ? 's' : ''} activo{p.contratos_activos !== 1 ? 's' : ''}
                            </span>
                          )}
                          <EstadoBadge p={p} />
                          {p.ultima_calificacion != null && <RiesgoBadge total={p.ultima_calificacion} />}
                        </div>
                      </div>

                      {/* Evaluación */}
                      <div className="flex items-center gap-1.5 mb-3">
                        {p.ultima_calificacion != null ? (
                          <>
                            <span className="text-xs font-black text-gray-700">{Number(p.ultima_calificacion).toFixed(1)}/100</span>
                            <span className="text-[10px] text-gray-400">· Última evaluación: {fmtFecha(p.fecha_ultima_evaluacion)}</span>
                          </>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Aún no tiene evaluaciones de desempeño registradas</span>
                        )}
                      </div>

                      {/* Detalles en grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Procesos participados</p>
                          <div className="flex items-center gap-1">
                            <FileText size={11} style={{ color: BRAND }} />
                            <p className="text-xs font-black" style={{ color: BRAND }}>{p.num_procesos}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Veces seleccionado</p>
                          <div className="flex items-center gap-1">
                            <Building2 size={11} className="text-gray-400" />
                            <p className="text-xs font-bold text-gray-700">{p.num_seleccionado}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Contratos activos</p>
                          <div className="flex items-center gap-1">
                            <FileCheck2 size={11} style={{ color: p.contratos_activos > 0 ? '#2f6fa3' : '#9ca3af' }} />
                            <p className="text-xs font-black" style={{ color: p.contratos_activos > 0 ? '#2f6fa3' : '#6b7280' }}>{p.contratos_activos}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">Última participación</p>
                          <div className="flex items-center gap-1">
                            <Calendar size={10} className="text-gray-400" />
                            <p className="text-xs font-bold text-gray-700">{fmtFecha(p.ultima_participacion) || '—'}</p>
                          </div>
                        </div>
                      </div>

                      {/* CTA de detalle */}
                      <div className="flex justify-end mt-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold" style={{ color: BRAND }}>
                          Ver detalle completo <ChevronRight size={13} />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer de la card: motivo de bloqueo u observación de evaluación */}
                {(p.bloqueado || p.observaciones_evaluacion) && (
                  <div className="px-5 py-3 bg-gray-50 rounded-b-2xl border-t border-gray-100">
                    {p.bloqueado ? (
                      <p className="text-[11px] font-semibold text-red-600 flex items-center gap-1.5">
                        <ShieldOff size={12} /> {p.motivo_bloqueo || 'Bloqueado por evaluación de desempeño inferior a 70 puntos.'}
                      </p>
                    ) : (
                      <p className="text-[11px] font-semibold text-gray-500">{p.observaciones_evaluacion}</p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-center text-xs font-bold text-gray-400 uppercase tracking-widest py-2">
          {filtrados.length} proveedor{filtrados.length !== 1 ? 'es' : ''} en el directorio
        </p>
      </div>

      {/* ── Modal: detalle del proveedor (Formulario RA1-4 / Contratos) ── */}
      {proveedorActivo && (
        <div
          onClick={() => setProveedorActivo(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 16, maxWidth: 640, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '20px 24px 0', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ marginBottom: 14 }}>
                <p style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: '0 0 4px' }}>
                  Detalle del proveedor
                </p>
                <h3 style={{ fontFamily: FONT, fontSize: 17, fontWeight: 900, color: '#1e293b', margin: 0 }}>
                  {proveedorActivo.nombre}
                </h3>
              </div>
              <button onClick={() => setProveedorActivo(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, flexShrink: 0 }}>
                <X size={18} />
              </button>
            </div>

            {/* Pestañas */}
            <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid #f1f5f9' }}>
              {([
                { id: 'formulario' as const, label: 'Formulario RA1-4' },
                { id: 'contratos' as const, label: `Contratos${proveedorActivo.contratos_totales > 0 ? ` (${proveedorActivo.contratos_totales})` : ''}` },
              ]).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => cambiarPestana(tab.id)}
                  style={{
                    padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: FONT, fontSize: 13, fontWeight: 800,
                    color: pestana === tab.id ? BRAND : '#94a3b8',
                    borderBottom: pestana === tab.id ? `2px solid ${BRAND}` : '2px solid transparent',
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div style={{ padding: '20px 24px' }}>
              {pestana === 'formulario' && cargandoFormulario && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 0' }}>
                  <Loader2 size={28} className="animate-spin" color={BRAND} />
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Cargando formulario...</p>
                </div>
              )}

              {pestana === 'formulario' && !cargandoFormulario && errorFormulario && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <AlertTriangle size={16} color="#92400E" />
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#92400E', margin: 0 }}>{errorFormulario}</p>
                </div>
              )}

              {pestana === 'formulario' && !cargandoFormulario && formularioData && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  {!formularioData.respondida && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                      <AlertTriangle size={14} color="#64748b" />
                      <p style={{ fontFamily: FONT, fontSize: 12, color: '#64748b', margin: 0 }}>
                        Aún no ha completado la Fase 2 (tesorería y documentos) para esta convocatoria.
                      </p>
                    </div>
                  )}

                  {/* Identificación */}
                  <div>
                    <p style={s.seccion}>Identificación</p>
                    <div style={s.grid2}>
                      <Campo icon={<Mail size={13} />} label="Correo electrónico" value={formularioData.proponente_email} />
                      <Campo icon={<Phone size={13} />} label="Teléfono" value={formularioData.telefono} />
                      <Campo icon={<IdCard size={13} />} label={formularioData.tipo_documento || 'Documento'} value={formularioData.cedula_nit} />
                      <Campo icon={<Building2 size={13} />} label="Tipo de proponente" value={formularioData.tipo_persona === 'persona' ? 'Persona natural' : 'Empresa'} />
                      <Campo icon={<MapPin size={13} />} label="Domicilio" value={formularioData.domicilio} />
                      <Campo icon={<Globe size={13} />} label="Página web" value={formularioData.pagina_web} />
                    </div>
                  </div>

                  {/* Representación legal */}
                  {formularioData.representante_legal_nombre && (
                    <div>
                      <p style={s.seccion}>Representación legal</p>
                      <div style={s.grid2}>
                        <Campo icon={<User size={13} />} label="Representante legal" value={formularioData.representante_legal_nombre} />
                        <Campo icon={<IdCard size={13} />} label={formularioData.representante_legal_tipo_id || 'Identificación'} value={formularioData.representante_legal_identificacion} />
                        <Campo icon={<MapPin size={13} />} label="Dirección" value={formularioData.representante_legal_direccion} />
                        {formularioData.representante_legal_autorizado && (
                          <Campo icon={<User size={13} />} label="Representante legal autorizado" value={formularioData.representante_legal_autorizado} />
                        )}
                      </div>
                    </div>
                  )}

                  {/* Datos tributarios */}
                  <div>
                    <p style={s.seccion}>Datos tributarios</p>
                    <div style={s.grid2}>
                      <Campo icon={<Percent size={13} />} label="CIIU / Tarifa / Régimen" value={`${formularioData.ciiu || '—'} / ${formularioData.tarifa || '—'} / ${formularioData.regimen || '—'}`} />
                      <Campo icon={<Building2 size={13} />} label="Actividad económica" value={formularioData.actividad_economica} />
                      <Campo icon={<MapPin size={13} />} label="Municipio donde está inscrito" value={formularioData.municipio_inscripcion} />
                      <Campo icon={<Shield size={13} />} label="Gran contribuyente" value={
                        formularioData.es_gran_contribuyente
                          ? `Sí — Res. ${formularioData.gran_contribuyente_resolucion || '—'} (${fmtFecha(formularioData.gran_contribuyente_fecha) || '—'})`
                          : 'No'
                      } />
                      <Campo icon={<Shield size={13} />} label="Auto retenedor" value={
                        formularioData.es_auto_retenedor
                          ? `Sí — Res. ${formularioData.auto_retenedor_resolucion || '—'} (${fmtFecha(formularioData.auto_retenedor_fecha) || '—'})`
                          : 'No'
                      } />
                      <Campo icon={<Building2 size={13} />} label="¿Entidad del estado?" value={formularioData.es_entidad_estado ? 'Sí' : 'No'} />
                      <Campo icon={<Shield size={13} />} label="¿Exento de impuesto a la renta?" value={formularioData.exento_impuesto_renta ? 'Sí' : 'No'} />
                    </div>
                  </div>

                  {/* Tesorería */}
                  {formularioData.respondida && (
                    <div>
                      <p style={s.seccion}>Tesorería</p>
                      <div style={s.grid2}>
                        <Campo icon={<Landmark size={13} />} label="Banco / Sucursal" value={`${formularioData.banco || '—'} — ${formularioData.banco_sucursal || '—'}`} />
                        <Campo icon={<Mail size={13} />} label="Correo tesorería" value={formularioData.banco_email_contacto} />
                        <Campo icon={<CreditCard size={13} />} label="Cuenta bancaria" value={`${formularioData.tipo_cuenta || ''} ${formularioData.numero_cuenta || ''}`.trim()} />
                      </div>
                    </div>
                  )}

                  {/* Documentos */}
                  {formularioData.documentos_proveedor?.length > 0 && (
                    <div>
                      <p style={s.seccion}>Documentos adjuntos</p>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {formularioData.documentos_proveedor.map((doc, di) => (
                          <a
                            key={di}
                            href={`${API_URL}${doc.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, background: '#F8FAFC', border: '1px solid #E2E8F0', textDecoration: 'none' }}
                          >
                            <FileIcon size={14} color={BRAND} />
                            <span style={{ fontFamily: FONT, fontSize: 12, color: '#1e293b', fontWeight: 600, flex: 1 }}>
                              {DOCUMENTO_PROVEEDOR_LABELS[doc.tipo] || doc.tipo}
                            </span>
                            <Download size={13} color="#94a3b8" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {pestana === 'contratos' && cargandoContratos && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '30px 0' }}>
                  <Loader2 size={28} className="animate-spin" color={BRAND} />
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#64748b' }}>Cargando contratos...</p>
                </div>
              )}

              {pestana === 'contratos' && !cargandoContratos && errorContratos && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 10, background: '#FFFBEB', border: '1px solid #FDE68A' }}>
                  <AlertTriangle size={16} color="#92400E" />
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#92400E', margin: 0 }}>{errorContratos}</p>
                </div>
              )}

              {pestana === 'contratos' && !cargandoContratos && !errorContratos && contratosData?.length === 0 && (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>
                  <FileCheck2 size={32} className="mx-auto text-gray-300" style={{ marginBottom: 10 }} />
                  <p style={{ fontFamily: FONT, fontSize: 13, color: '#64748b', margin: 0 }}>
                    Este proveedor aún no tiene contratos formalizados.
                  </p>
                </div>
              )}

              {pestana === 'contratos' && !cargandoContratos && contratosData && contratosData.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {contratosData.map(c => {
                    const estadoContrato = calcularEstadoContrato(c);
                    return (
                      <div key={c.id} style={{ border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 14px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ display: 'inline-block', fontFamily: FONT, fontSize: 10, fontWeight: 800, color: '#fff', background: BRAND, padding: '2px 8px', borderRadius: 6, margin: '0 0 4px' }}>
                              {c.codigo}
                            </p>
                            <p style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: '#1e293b', margin: 0 }}>{c.objeto}</p>
                          </div>
                          <BadgeContrato estado={estadoContrato} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <Campo icon={<CreditCard size={13} />} label="Valor" value={formatValorContrato(c)} />
                          <Campo icon={<Clock size={13} />} label="Plazo de ejecución" value={formatPlazoContrato(c)} />
                          <Campo icon={<User size={13} />} label="Supervisor" value={c.supervisor_nombre} />
                          <Campo icon={<Calendar size={13} />} label="Fecha de inicio" value={fmtFecha(c.fecha_respuesta_juridica)} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
