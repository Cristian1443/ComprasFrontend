import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Receipt, CheckCircle2, XCircle, Clock,
  Loader2, ChevronDown, Filter, Plus, X, Paperclip
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { PeoplePicker } from '../ui/PeoplePicker';
import { formatMilesInput } from '../../lib/formatPresupuesto';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';

interface FacturaFinanciera {
  id: string;
  solicitud_id: string;
  nombre_solicitud: string | null;
  aprobador_1: string | null;
  aprobador_2: string | null;
  fecha_factura: string;
  no_contrato_oc: string;
  no_factura_cxc: string;
  numero_ap: string;
  concepto: string;
  certificacion_supervisor: boolean;
  adjunto_url: string | null;
  adjunto_nombre: string | null;
  nombre_proveedor: string | null;
  estado: 'pendiente' | 'aprobada' | 'rechazada';
  comentario_financiera: string | null;
  creado_por_email: string | null;
  creado_en: string;
  contrato_codigo: string;
  contrato_objeto: string;
  contrato_titulo: string | null;
  aprobado_supervisor: boolean | null;
  comentario_supervisor: string | null;
  aprobado_gerente: boolean | null;
  comentario_gerente: string | null;
}

interface Contrato {
  id: string;
  codigo: string;
  objeto: string;
  titulo_contrato: string | null;
  supervisor_nombre: string | null;
  supervisor_email: string | null;
  nombre_proveedor: string | null;
}

type FiltroEstado = 'todos' | 'pendiente' | 'aprobada' | 'rechazada';

function AprobacionChip({ aprobado, label }: { aprobado: boolean | null; label: string }) {
  if (aprobado === true)
    return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold"><CheckCircle2 size={10} />{label}</span>;
  if (aprobado === false)
    return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold"><XCircle size={10} />{label} rechazó</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-semibold"><Clock size={10} />{label} pendiente</span>;
}

function EstadoBadge({ estado }: { estado: FacturaFinanciera['estado'] }) {
  if (estado === 'aprobada')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><CheckCircle2 size={12} /> Aprobada</span>;
  if (estado === 'rechazada')
    return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><XCircle size={12} /> Rechazada</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700" style={{ fontFamily: 'Gabarito, sans-serif' }}><Clock size={12} /> Pendiente</span>;
}

const emptyForm = {
  solicitud_id: '',
  aprobador_1: '',
  aprobador_1_email: '',
  aprobador_2: '',
  aprobador_2_email: '',
  fecha_factura: '',
  no_contrato_oc: '',
  no_factura_cxc: '',
  numero_ap: '',
  nombre_proveedor: '',
  concepto: '',
  valor: '',
  certificacion_supervisor: '' as '' | 'si' | 'no',
  adjunto_nombre: '',
  adjunto_url_real: '',
};

export function FacturasFinanciera() {
  const { accounts } = useMsal();
  const userEmail = accounts[0]?.username || '';

  const [facturas, setFacturas] = useState<FacturaFinanciera[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<FiltroEstado>('todos');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cargarFacturas = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API_BASE}/api/financiera/facturas`);
      const data = r.ok ? await r.json() : [];
      setFacturas(Array.isArray(data) ? data : []);
    } catch {
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarContratos = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/api/financiera/contratos`);
      const data = r.ok ? await r.json() : [];
      setContratos(Array.isArray(data) ? data : []);
    } catch {
      setContratos([]);
    }
  }, []);

  useEffect(() => {
    cargarFacturas();
    cargarContratos();
  }, [cargarFacturas, cargarContratos]);

  const facturasFiltradas = filtro === 'todos' ? facturas : facturas.filter(f => f.estado === filtro);
  const conteos = {
    todos: facturas.length,
    pendiente: facturas.filter(f => f.estado === 'pendiente').length,
    aprobada: facturas.filter(f => f.estado === 'aprobada').length,
    rechazada: facturas.filter(f => f.estado === 'rechazada').length,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => {
      const updated = { ...prev, [name]: name === 'valor' ? formatMilesInput(value) : value };
      // Auto-rellenar campos del contrato seleccionado
      if (name === 'solicitud_id') {
        const c = contratos.find(ct => ct.id === value);
        if (c) {
          updated.no_contrato_oc = c.codigo || '';
          updated.nombre_proveedor = c.nombre_proveedor || '';
          if (c.supervisor_nombre) {
            updated.aprobador_1 = c.supervisor_nombre;
            updated.aprobador_1_email = c.supervisor_email || '';
          }
        } else {
          updated.no_contrato_oc = '';
          updated.nombre_proveedor = '';
        }
      }
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Normaliza formato colombiano: "1.200.000,50" → 1200000.50
    const valorNorm = form.valor.replace(/\./g, '').replace(',', '.');
    const valorNum = Number(valorNorm);
    if (!form.solicitud_id || !form.fecha_factura || !form.no_contrato_oc || !form.no_factura_cxc || !form.numero_ap || !form.concepto) {
      setErrorMsg('Completa todos los campos obligatorios.');
      return;
    }
    if (!form.valor || isNaN(valorNum) || valorNum <= 0) {
      setErrorMsg('Ingresa un valor válido mayor a cero.');
      return;
    }
    setSaving(true);
    setErrorMsg(null);
    try {
      const contrato = contratos.find(c => c.id === form.solicitud_id);
      const r = await fetch(`${API_BASE}/api/financiera/facturas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitud_id: form.solicitud_id,
          nombre_solicitud: contrato ? `${contrato.codigo} - ${contrato.titulo_contrato || contrato.objeto}` : null,
          aprobador_1: form.aprobador_1 || null,
          aprobador_2: form.aprobador_2 || null,
          fecha_factura: form.fecha_factura,
          no_contrato_oc: form.no_contrato_oc,
          no_factura_cxc: form.no_factura_cxc,
          numero_ap: form.numero_ap,
          nombre_proveedor: form.nombre_proveedor || null,
          concepto: form.concepto,
          valor: valorNum,
          certificacion_supervisor: form.certificacion_supervisor === 'si' ? true : form.certificacion_supervisor === 'no' ? false : null,
          adjunto_url: form.adjunto_url_real || null,
          adjunto_nombre: form.adjunto_nombre || null,
          creado_por_email: userEmail || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setErrorMsg(d.error || 'Error al registrar la factura.');
        return;
      }
      setShowForm(false);
      setForm({ ...emptyForm });
      await cargarFacturas();
    } catch {
      setErrorMsg('Error de conexión. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (iso: string) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleDateString('es-CO');
  };

  const toggleExpand = (id: string) => setExpandedId(prev => (prev === id ? null : id));

  const FILTROS: { key: FiltroEstado; label: string }[] = [
    { key: 'todos', label: 'Todos' },
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'aprobada', label: 'Aprobadas' },
    { key: 'rechazada', label: 'Rechazadas' },
  ];

  return (
    <div className="p-4 lg:p-6" style={{ fontFamily: 'Gabarito, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'color-mix(in srgb, var(--brand-secondary) 12%, white)' }}>
            <Receipt size={22} style={{ color: 'var(--brand-secondary)' }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Facturas de contratos</h2>
            <p className="text-sm text-gray-500">Gestión de facturas — el supervisor y el gerente deben aprobar</p>
          </div>
        </div>
        <button
          onClick={() => { setShowForm(true); setErrorMsg(null); setForm({ ...emptyForm }); }}
          className="flex items-center gap-2 px-4 py-2 text-white rounded-xl font-semibold text-sm transition-all hover:opacity-90 shadow-sm"
          style={{ backgroundColor: 'var(--brand-secondary)', fontFamily: 'Gabarito, sans-serif' }}
        >
          <Plus size={16} /> Registrar factura
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: 'Total', count: conteos.todos, color: 'text-gray-700', bg: 'bg-gray-50', border: 'border-gray-200' },
          { label: 'Pendientes', count: conteos.pendiente, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
          { label: 'Aprobadas', count: conteos.aprobada, color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
          { label: 'Rechazadas', count: conteos.rechazada, color: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border ${s.border} rounded-xl p-3 text-center`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.count}</p>
            <p className={`text-xs font-semibold ${s.color} opacity-80`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <Filter size={14} className="text-gray-400" />
        {FILTROS.map(f => (
          <button
            key={f.key}
            onClick={() => setFiltro(f.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtro === f.key ? 'text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            style={filtro === f.key ? { backgroundColor: 'var(--brand-secondary)' } : {}}
          >
            {f.label} ({conteos[f.key]})
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={28} className="animate-spin text-gray-400" /></div>
      ) : facturasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Receipt size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-semibold text-gray-500">No hay facturas</p>
          <p className="text-sm mt-1">{filtro === 'todos' ? 'Registra la primera factura.' : `No hay facturas en estado "${filtro}".`}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {facturasFiltradas.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="flex items-start gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-black px-2 py-0.5 rounded-full border" style={{ color: 'var(--brand-secondary)', backgroundColor: 'color-mix(in srgb, var(--brand-secondary) 8%, white)', borderColor: 'color-mix(in srgb, var(--brand-secondary) 20%, white)' }}>
                      {f.contrato_codigo}
                    </span>
                    <EstadoBadge estado={f.estado} />
                  </div>
                  <p className="text-sm font-semibold text-gray-800 truncate">{f.contrato_titulo || f.contrato_objeto}</p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span className="font-mono font-semibold">AP {f.numero_ap}</span>
                    <span>·</span>
                    <span>{formatDate(f.fecha_factura)}</span>
                  </div>
                  {/* Chips de aprobación */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <AprobacionChip aprobado={f.aprobado_supervisor ?? null} label="Supervisor" />
                    <AprobacionChip aprobado={f.aprobado_gerente ?? null} label="Gerente" />
                  </div>
                </div>
                <button
                  onClick={() => toggleExpand(f.id)}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors shrink-0"
                >
                  <ChevronDown size={16} className={`transition-transform ${expandedId === f.id ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {expandedId === f.id && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50 space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-3">
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">AP</p><p className="text-gray-800 font-semibold">{f.numero_ap}</p></div>
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Contrato/OC</p><p className="text-gray-800">{f.no_contrato_oc}</p></div>
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">No. Factura/CxC</p><p className="text-gray-800">{f.no_factura_cxc}</p></div>
                  </div>
                  {f.nombre_proveedor && (
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Proveedor</p><p className="text-gray-800">{f.nombre_proveedor}</p></div>
                  )}
                  <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Concepto</p><p className="text-gray-800">{f.concepto}</p></div>
                  {(f.aprobador_1 || f.aprobador_2) && (
                    <div className="grid grid-cols-2 gap-3">
                      {f.aprobador_1 && <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Aprobador 1 (Supervisor)</p><p className="text-gray-800">{f.aprobador_1}</p></div>}
                      {f.aprobador_2 && <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Aprobador 2 (Gerente)</p><p className="text-gray-800">{f.aprobador_2}</p></div>}
                    </div>
                  )}
                  {(f.adjunto_url || f.adjunto_nombre) && (
                    <div><p className="text-[11px] font-semibold text-gray-400 uppercase">Adjunto</p>
                      {f.adjunto_url && f.adjunto_url.startsWith('http') ? (
                        <a href={f.adjunto_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium">
                          📎 {f.adjunto_nombre || 'Ver adjunto'}
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">{f.adjunto_nombre || f.adjunto_url}</span>
                      )}
                    </div>
                  )}
                  {/* Comentarios de aprobadores */}
                  {f.comentario_supervisor && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase">Comentario supervisor</p>
                      <p className="text-amber-800 text-sm">{f.comentario_supervisor}</p>
                    </div>
                  )}
                  {f.comentario_gerente && (
                    <div className="p-2 rounded bg-amber-50 border border-amber-200">
                      <p className="text-[11px] font-semibold text-amber-700 uppercase">Comentario gerente</p>
                      <p className="text-amber-800 text-sm">{f.comentario_gerente}</p>
                    </div>
                  )}
                  <p className="text-xs text-gray-400">Registrada el {formatDate(f.creado_en)} {f.creado_por_email ? `por ${f.creado_por_email}` : ''}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal crear factura */}
      {showForm && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 60, backgroundColor: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false); }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100" style={{ backgroundColor: 'var(--brand-secondary)' }}>
              <div className="flex items-center gap-2">
                <Receipt size={18} className="text-white" />
                <h3 className="font-bold text-white">Registrar factura</h3>
              </div>
              <button onClick={() => setShowForm(false)} className="text-white hover:opacity-70 transition-opacity"><X size={20} /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Contrato */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">
                  Contrato <span className="text-red-500">*</span>
                </label>
                <select
                  name="solicitud_id"
                  value={form.solicitud_id}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ fontFamily: 'Gabarito, sans-serif' }}
                >
                  <option value="">Selecciona un contrato…</option>
                  {contratos.map(c => {
                    const titulo = c.titulo_contrato || c.objeto;
                    return (
                      <option key={c.id} value={c.id}>{c.codigo} — {titulo.slice(0, 60)}{titulo.length > 60 ? '…' : ''}</option>
                    );
                  })}
                </select>
              </div>

              {/* AP — identificador de la factura de aquí en adelante */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">AP <span className="text-red-500">*</span></label>
                <input type="text" name="numero_ap" value={form.numero_ap} onChange={handleChange} required
                  placeholder="Ej. AP-2026-001"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ fontFamily: 'Gabarito, sans-serif' }} />
                <p className="text-[11px] text-gray-400 mt-0.5">Con este número se identificará la factura de aquí en adelante.</p>
              </div>

              {/* Proveedor — auto-completado desde el contrato */}
              {form.solicitud_id && (
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                    Proveedor
                    {form.nombre_proveedor && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded normal-case">Auto</span>
                    )}
                  </label>
                  <input type="text" name="nombre_proveedor" value={form.nombre_proveedor}
                    readOnly
                    placeholder="Sin proveedor asociado al contrato"
                    className="w-full px-3 py-2 text-sm border rounded-lg bg-gray-50 text-gray-700"
                    style={{ fontFamily: 'Gabarito, sans-serif', borderColor: form.nombre_proveedor ? '#6ee7b7' : '#d1d5db' }} />
                </div>
              )}

              {/* Aprobadores — Directorio Activo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <PeoplePicker
                  label="Aprobador 1 — Supervisor"
                  value={form.aprobador_1}
                  email={form.aprobador_1_email}
                  onChange={(name, email) => setForm(prev => ({ ...prev, aprobador_1: name, aprobador_1_email: email }))}
                  placeholder="Buscar supervisor..."
                />
                <PeoplePicker
                  label="Aprobador 2 — Gerente"
                  value={form.aprobador_2}
                  email={form.aprobador_2_email}
                  onChange={(name, email) => setForm(prev => ({ ...prev, aprobador_2: name, aprobador_2_email: email }))}
                  placeholder="Buscar gerente..."
                />
              </div>

              {/* Fecha factura */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha de factura <span className="text-red-500">*</span></label>
                <input type="date" name="fecha_factura" value={form.fecha_factura} onChange={handleChange} required
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                  style={{ fontFamily: 'Gabarito, sans-serif' }} />
              </div>

              {/* No. Contrato/OC y No. Factura/CxC */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                    No. Contrato / OC <span className="text-red-500">*</span>
                    {form.no_contrato_oc && form.solicitud_id && (
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded normal-case">Auto</span>
                    )}
                  </label>
                  <input type="text" name="no_contrato_oc" value={form.no_contrato_oc} onChange={handleChange} required
                    placeholder="Ej. OC-2025-001"
                    className="w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2"
                    style={{
                      fontFamily: 'Gabarito, sans-serif',
                      borderColor: form.no_contrato_oc && form.solicitud_id ? '#6ee7b7' : '#d1d5db',
                      backgroundColor: form.no_contrato_oc && form.solicitud_id ? '#f0fdf4' : 'white',
                    }} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">No. Factura / CxC <span className="text-red-500">*</span></label>
                  <input type="text" name="no_factura_cxc" value={form.no_factura_cxc} onChange={handleChange} required
                    placeholder="Ej. FAC-0001"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ fontFamily: 'Gabarito, sans-serif' }} />
                </div>
              </div>

              {/* Concepto */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Concepto factura o cuenta de cobro <span className="text-red-500">*</span></label>
                <textarea name="concepto" value={form.concepto} onChange={handleChange} required rows={3}
                  placeholder="Describe el concepto de la factura..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 resize-none"
                  style={{ fontFamily: 'Gabarito, sans-serif' }} />
              </div>

              {/* Valor de la factura */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Valor de la factura (COP) <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    name="valor"
                    value={form.valor}
                    onChange={handleChange}
                    placeholder="Ej: 1.200.000"
                    autoComplete="off"
                    className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2"
                    style={{ fontFamily: 'Gabarito, sans-serif' }}
                  />
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">Usa punto como separador de miles: 1.200.000</p>
              </div>

              {/* Certificación supervisor */}
              <div className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-2" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  Certificación supervisor
                </label>
                <p className="text-xs text-gray-600 mb-2 leading-relaxed" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  En mi calidad de supervisor del contrato, certifico que al aprobar esta autorización diligencié y cargué en el repositorio documental el Informe de Seguimiento mensual correspondiente a la factura adjunta.
                </p>
                <select
                  name="certificacion_supervisor"
                  value={form.certificacion_supervisor}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 bg-white"
                  style={{ fontFamily: 'Gabarito, sans-serif' }}
                >
                  <option value="">Selecciona tu respuesta</option>
                  <option value="si">Sí</option>
                  <option value="no">No</option>
                </select>
              </div>

              {/* Datos adjuntos */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  Datos adjuntos <span className="text-gray-400 normal-case">(opcional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={async e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setUploadingFile(true);
                    try {
                      const fd = new FormData();
                      fd.append('file', file);
                      const r = await fetch(`${API_BASE}/api/facturas/upload`, { method: 'POST', body: fd });
                      if (r.ok) {
                        const d = await r.json();
                        setForm(prev => ({ ...prev, adjunto_nombre: file.name, adjunto_url_real: `${API_BASE}${d.url}` }));
                      } else {
                        setErrorMsg('Error al subir el archivo. Intenta de nuevo.');
                      }
                    } catch {
                      setErrorMsg('Error de conexión al subir el archivo.');
                    } finally {
                      setUploadingFile(false);
                    }
                  }}
                />
                {form.adjunto_nombre ? (
                  <div className="flex items-center gap-2 px-3 py-2 border border-blue-200 rounded-lg bg-blue-50">
                    <Paperclip size={14} className="text-blue-500 shrink-0" />
                    <a href={form.adjunto_url_real} target="_blank" rel="noopener noreferrer"
                      className="text-sm text-blue-700 truncate flex-1 hover:underline" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                      {form.adjunto_nombre}
                    </a>
                    <button type="button" onClick={() => { setForm(prev => ({ ...prev, adjunto_nombre: '', adjunto_url_real: '' })); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                      className="text-blue-400 hover:text-blue-600"><X size={14} /></button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                    className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all w-full disabled:opacity-60"
                    style={{ fontFamily: 'Gabarito, sans-serif' }}
                  >
                    {uploadingFile ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
                    {uploadingFile ? 'Subiendo archivo...' : 'Agregar datos adjuntos'}
                  </button>
                )}
              </div>

              {errorMsg && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{errorMsg}</div>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  style={{ fontFamily: 'Gabarito, sans-serif' }}>Cancelar</button>
                <button type="submit" disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-lg transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: 'var(--brand-secondary)', fontFamily: 'Gabarito, sans-serif' }}>
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
                  {saving ? 'Enviando...' : 'Registrar y enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
