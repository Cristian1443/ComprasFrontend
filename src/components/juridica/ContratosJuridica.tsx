import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { Search, FileCheck2, ExternalLink, Loader2, CheckCircle2, Clock, XCircle, ChevronRight } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getGraphClient } from '../../lib/graphService';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Contrato {
  id: string;
  codigo: string;
  titulo_contrato: string | null;
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
  modalidad: string | null;
  creado_en: string;
  fecha_respuesta_juridica: string | null;
  solicitante_nombre: string;
  supervisor_nombre: string | null;
  nombre_proveedor: string | null;
  valor_con_impuestos: number | null;
  sharepoint_creado: boolean;
}

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

function BadgeEstado({ estado }: { estado: 'activo' | 'vencido' | 'finalizado' }) {
  if (estado === 'activo') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircle2 size={12} /> Activo
      </span>
    );
  }
  if (estado === 'vencido') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
        <Clock size={12} /> Vencido
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
      <XCircle size={12} /> Finalizado
    </span>
  );
}

interface ContratosJuridicaProps {
  onSelect?: (id: string) => void;
}

export function ContratosJuridica({ onSelect }: ContratosJuridicaProps = {}) {
  const { instance, accounts } = useMsal();
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openingSharePoint, setOpeningSharePoint] = useState<string | null>(null);
  const [spError, setSpError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargarContratos = () => {
    setLoading(true);
    setError(null);
    apiFetch(`${API_BASE}/api/juridica/contratos`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(data => setContratos(Array.isArray(data) ? data : []))
      .catch(() => setError('No se pudieron cargar los contratos. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargarContratos(); }, []);

  const filtered = contratos.filter(c =>
    !search ||
    (c.codigo || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.titulo_contrato || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.objeto || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.nombre_proveedor || '').toLowerCase().includes(search.toLowerCase())
  );

  const formatValor = (c: Contrato): string => {
    const m = String(c.moneda || 'COP').toUpperCase();
    if (m === 'USD' && c.valor_moneda_usd_texto) return `USD ${c.valor_moneda_usd_texto}`;
    if (m === 'EUR' && c.valor_moneda_eur_texto) return `EUR ${c.valor_moneda_eur_texto}`;
    if (c.valor_moneda_cop_texto) return `COP ${c.valor_moneda_cop_texto}`;
    const val = c.valor_en_cop ?? c.valor_estimado;
    if (val == null) return '-';
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(val));
  };

  const formatPlazo = (c: Contrato): string => {
    const meses = c.plazo_ejecucion_meses ?? 0;
    const dias = c.plazo_ejecucion_dias ?? 0;
    if (meses > 0 && dias > 0) return `${meses} meses, ${dias} días`;
    if (meses > 0) return `${meses} ${meses === 1 ? 'mes' : 'meses'}`;
    if (dias > 0) return `${dias} días`;
    return '-';
  };

  const abrirSharePoint = async (c: Contrato) => {
    setSpError(null);
    setOpeningSharePoint(c.id);
    try {
      const account = accounts[0];
      if (!account) throw new Error('No hay sesión activa');
      const tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account });
      const token = tokenRes.accessToken;
      const client = await getGraphClient(token);

      // 1. Buscar sitio "Documental"
      const sitesRes = await client.api('/sites?search=Documental').get();
      const site = sitesRes?.value?.[0];
      if (!site) throw new Error('No se encontró el sitio Documental en SharePoint');

      // 2. Encontrar biblioteca "Expedientes"
      const drivesRes = await client.api(`/sites/${site.id}/drives`).get();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const drives: any[] = drivesRes?.value || [];
      const expDrive = drives.find((d) => d.name === 'Expedientes') ?? drives[0];
      if (!expDrive) throw new Error('No se encontró la biblioteca Expedientes');

      // 3. Navegar a la carpeta del contrato (sin crear nada)
      const folderName = c.codigo || c.id;
      const parentPath = 'Pruebas tecnicas';
      let url = site.webUrl;
      try {
        const folder = await client.api(`/drives/${expDrive.id}/root:/${parentPath}/${folderName}`).get();
        url = folder?.webUrl ?? url;
      } catch {
        // carpeta no existe aún — navegar a la raíz del sitio
      }
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al conectar con SharePoint';
      setSpError(msg);
    } finally {
      setOpeningSharePoint(null);
    }
  };

  return (
    <div className="p-4 lg:p-8" style={{ backgroundColor: 'var(--ui-bg)' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          Contratos aprobados
        </h1>
        <p className="text-gray-600 mt-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          Solicitudes que han superado el proceso jurídico
        </p>
      </div>

      {spError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          {spError}
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          <span className="flex-1">{error}</span>
          <button onClick={cargarContratos} className="text-xs font-black uppercase underline underline-offset-2 hover:opacity-70">
            Reintentar
          </button>
        </div>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por código, objeto o proveedor..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-1"
          style={{ fontFamily: 'Gabarito, sans-serif' }}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2" style={{ borderColor: 'var(--brand-secondary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileCheck2 className="mx-auto text-gray-400 mb-4" size={48} />
          <p className="text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>
            {contratos.length === 0 ? 'No hay contratos aprobados aún.' : 'Sin resultados para la búsqueda.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map(c => {
            const estadoContrato = calcularEstadoContrato(c);
            const isOpening = openingSharePoint === c.id;
            return (
              <div
                key={c.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:border-blue-300 hover:shadow-md transition-all"
              >
                <div
                  className="p-4 cursor-pointer"
                  onClick={() => onSelect?.(c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => e.key === 'Enter' && onSelect?.(c.id)}
                >
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: 'var(--brand-secondary)', color: '#fff', fontFamily: 'Gabarito, sans-serif' }}>
                          {c.codigo || c.id.slice(0, 8)}
                        </span>
                        <BadgeEstado estado={estadoContrato} />
                        {c.modalidad && (
                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                            {c.modalidad}
                          </span>
                        )}
                      </div>

                      <p className="font-semibold text-gray-900 truncate" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        {c.titulo_contrato || c.objeto || 'Sin objeto'}
                      </p>

                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-sm text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        {c.nombre_proveedor && <span>Proveedor: <strong>{c.nombre_proveedor}</strong></span>}
                        <span>Valor: {formatValor(c)}</span>
                        <span>Plazo: {formatPlazo(c)}</span>
                        {c.supervisor_nombre && <span>Supervisor: {c.supervisor_nombre}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); abrirSharePoint(c); }}
                        disabled={isOpening}
                        title="Abrir carpeta en SharePoint"
                        className="flex items-center gap-1.5 px-3 py-2 text-sm text-white rounded-lg disabled:opacity-60 transition-opacity"
                        style={{ backgroundColor: 'var(--brand-secondary)', fontFamily: 'Gabarito, sans-serif' }}
                      >
                        {isOpening
                          ? <Loader2 size={16} className="animate-spin" />
                          : <ExternalLink size={16} />}
                        SharePoint
                      </button>
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
