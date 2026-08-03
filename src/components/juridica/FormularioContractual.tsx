import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ExternalLink, Loader2, FileText, CheckCircle2,
  Clock, XCircle, User, Calendar, Building2, DollarSign,
  Paperclip, Scale, AlertTriangle, Download
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getGraphClient } from '../../lib/graphService';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

const rowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #e5e7eb', alignItems: 'stretch',
};
const labelCell: React.CSSProperties = {
  width: 220, minWidth: 160, flexShrink: 0, padding: '14px 16px',
  fontWeight: 600, fontSize: '0.78rem', color: '#1F2937',
  borderRight: '1px solid #e5e7eb', backgroundColor: '#fafafa',
  fontFamily: 'Gabarito, sans-serif', display: 'flex', alignItems: 'flex-start', paddingTop: 16,
};
const valueCell: React.CSSProperties = {
  flex: 1, padding: '14px 16px',
  fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem',
  color: '#1F2937', backgroundColor: '#fff',
  minHeight: 48, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

function SectionHeader({ title, icon: Icon }: { title: string; icon?: any }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e3a5f 0%, #2f6fa3 100%)',
      color: '#fff', fontWeight: 700, fontSize: '0.8rem',
      textAlign: 'center', padding: '10px 24px',
      letterSpacing: '0.06em', textTransform: 'uppercase',
      fontFamily: 'Gabarito, sans-serif',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    }}>
      {Icon && <Icon size={15} />}
      {title}
    </div>
  );
}

function Row({ label, value, last = false }: { label: string; value: React.ReactNode; last?: boolean }) {
  const empty = value === null || value === undefined || (typeof value === 'string' && !value.trim());
  return (
    <div style={{ ...rowStyle, borderBottom: last ? 'none' : '1px solid #e5e7eb' }}>
      <div style={labelCell}>{label}</div>
      <div style={valueCell}>
        {empty
          ? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>
          : value}
      </div>
    </div>
  );
}

function BadgeEstado({ estado }: { estado: string }) {
  const s = estado?.toLowerCase() || '';
  if (s.includes('activo') || s === 'aprobado_juridica' || s === 'en_ejecucion')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700"><CheckCircle2 size={11} /> Activo</span>;
  if (s.includes('vencido'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700"><Clock size={11} /> Vencido</span>;
  if (s.includes('finalizado'))
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"><XCircle size={11} /> Finalizado</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">{estado}</span>;
}

interface Props {
  contratoId: string;
  onBack: () => void;
}

export function FormularioContractual({ contratoId, onBack }: Props) {
  const { instance, accounts } = useMsal();
  const [sol, setSol] = useState<any>(null);
  const [docs, setDocs] = useState<any[]>([]);
  const [calificacion, setCalificacion] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [spLoading, setSpLoading] = useState(false);
  const [spError, setSpError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [rSol, rDocs, rCal] = await Promise.allSettled([
          apiFetch(`${API_URL}/api/solicitudes/${contratoId}`).then(r => r.json()),
          apiFetch(`${API_URL}/api/juridica/solicitudes/${contratoId}/documentos`).then(r => r.json()),
          apiFetch(`${API_URL}/api/juridica/solicitudes/${contratoId}/calificacion`).then(r => r.json()),
        ]);
        if (rSol.status === 'fulfilled') setSol(rSol.value);
        if (rDocs.status === 'fulfilled') setDocs(Array.isArray(rDocs.value) ? rDocs.value : []);
        if (rCal.status === 'fulfilled') setCalificacion(rCal.value);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [contratoId]);

  const abrirSharePoint = async (carpeta?: string) => {
    setSpError(null);
    setSpLoading(true);
    try {
      const account = accounts[0];
      if (!account) throw new Error('No hay sesión activa');
      const tokenRes = await instance.acquireTokenSilent({ ...loginRequest, account });
      const client = await getGraphClient(tokenRes.accessToken);
      const sitesRes = await client.api('/sites?search=Documental').get();
      const site = sitesRes?.value?.[0];
      if (!site) throw new Error('No se encontró el sitio Documental');
      const drivesRes = await client.api(`/sites/${site.id}/drives`).get();
      const drives: any[] = drivesRes?.value || [];
      const expDrive = drives.find((d) => d.name === 'Expedientes') ?? drives[0];
      if (!expDrive) throw new Error('No se encontró la biblioteca Expedientes');

      const folderName = sol?.codigo || contratoId;
      const parentPath = carpeta
        ? `Pruebas tecnicas/${folderName}/${carpeta}`
        : `Pruebas tecnicas/${folderName}`;

      let folder: any;
      try {
        folder = await client.api(`/drives/${expDrive.id}/root:/${parentPath}`).get();
      } catch {
        // Crear carpeta si no existe
        const parts = parentPath.split('/');
        const name = parts.pop()!;
        const parent = parts.join('/');
        folder = await client.api(`/drives/${expDrive.id}/root:/${parent}:/children`).post({
          name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail',
        });
      }
      window.open(folder?.webUrl ?? site.webUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setSpError(err?.message || 'Error al conectar con SharePoint');
    } finally {
      setSpLoading(false);
    }
  };

  const formatCurrency = (val: any, moneda = 'COP') => {
    const n = Number(val);
    if (val == null || val === '' || isNaN(n)) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda === 'USD' ? 'USD' : moneda === 'EUR' ? 'EUR' : 'COP',
      maximumFractionDigits: 0
    }).format(n);
  };

  const formatDate = (d: any) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  const calcFechaFin = () => {
    if (!sol?.fecha_respuesta_juridica) return null;
    const inicio = new Date(sol.fecha_respuesta_juridica);
    const m = sol.plazo_ejecucion_meses ?? 0;
    const d = sol.plazo_ejecucion_dias ?? 0;
    if (!m && !d) return null;
    const fin = new Date(inicio);
    fin.setMonth(fin.getMonth() + m);
    fin.setDate(fin.getDate() + d);
    return fin;
  };

  const fechaFin = calcFechaFin();

  // Ganador: primero desde la evaluación (fuente de verdad), luego campo seleccionado
  const ev = calificacion?.evaluacion;
  const ganadorEmail = ev?.ganador_email;
  const ganadorNombre = ev?.ganador_nombre;
  const ganadorNumero = ev?.proponente_recomendado_numero;
  const proveedorGanador = sol?.proponentes?.find((p: any) =>
    (ganadorEmail && p.email === ganadorEmail) ||
    (ganadorNumero != null && Number(p.numero) === Number(ganadorNumero))
  ) ?? sol?.proponentes?.find((p: any) => p.seleccionado);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-blue-600" size={36} />
      </div>
    );
  }

  if (!sol) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="mx-auto text-red-400 mb-4" size={40} />
        <p className="text-gray-600 font-medium">No se encontraron datos para este contrato.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-slate-700 text-white rounded font-semibold">Volver</button>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-8" style={{ backgroundColor: 'var(--ui-bg)', fontFamily: 'Gabarito, sans-serif' }}>
      <div className="mx-auto" style={{ maxWidth: 1000 }}>

        {/* ENCABEZADO */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <button onClick={onBack} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800 mb-2 font-medium">
              <ArrowLeft size={16} /> Volver a Contratos
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-gray-900">Formulario Contractual</h1>
              <span className="text-sm font-bold px-3 py-1 rounded text-white" style={{ backgroundColor: 'var(--brand-secondary)' }}>
                {sol.codigo}
              </span>
              <BadgeEstado estado={sol.estado} />
            </div>
            <p className="text-gray-500 text-sm mt-1">{sol.modalidad?.toUpperCase()} — Aprobado el {formatDate(sol.fecha_respuesta_juridica)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => abrirSharePoint()}
              disabled={spLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: 'var(--brand-secondary)' }}
            >
              {spLoading ? <Loader2 size={15} className="animate-spin" /> : <ExternalLink size={15} />}
              Carpeta SharePoint
            </button>
          </div>
        </div>

        {spError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{spError}</div>
        )}

        {/* ── I. INFORMACIÓN GENERAL ─────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="I. Información General del Contrato" icon={Scale} />
          <Row label="Código de solicitud" value={sol.codigo} />
          <Row label="Modalidad" value={sol.modalidad?.toUpperCase()} />
          <Row label="Estado" value={<BadgeEstado estado={sol.estado} />} />
          <Row label="Gerencia solicitante" value={nombreGerenciaCompleto(sol.gerencia_nombre)} />
          <Row label="Solicitante" value={sol.solicitante_nombre} />
          <Row label="Fecha aprobación jurídica" value={formatDate(sol.fecha_respuesta_juridica)} last />
        </div>

        {/* ── II. OBJETO Y DESCRIPCIÓN ───────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="II. Objeto y Descripción" icon={FileText} />
          <Row label="Objeto del contrato" value={sol.objeto} />
          <Row label="Justificación" value={sol.justificacion} />
          <Row label="Descripción técnica" value={sol.descripcion} last />
        </div>

        {/* ── III. CONTRATISTA / PROVEEDOR ──────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="III. Contratista / Proveedor (Ganador)" icon={User} />
          <Row label="Nombre del proveedor" value={
            proveedorGanador?.nombre_proveedor || ganadorNombre
              ? <span className="font-semibold text-green-700">★ {proveedorGanador?.nombre_proveedor || ganadorNombre}</span>
              : null
          } />
          <Row label="Datos de contacto" value={proveedorGanador?.datos_contacto || ganadorEmail} />
          <Row label="Valor ofertado" value={
            (() => {
              const v = proveedorGanador?.valor_con_impuestos;
              const n = Number(v);
              if (v == null || v === '' || isNaN(n)) return null;
              return formatCurrency(n, sol.moneda);
            })()
          } last />
        </div>

        {/* ── IV. VALOR Y CONDICIONES ECONÓMICAS ────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="IV. Valor y Condiciones Económicas" icon={DollarSign} />
          <Row label="Moneda" value={sol.moneda || 'COP'} />
          <Row label="Valor estimado" value={
            sol.valor_estimado ? formatCurrency(sol.valor_estimado, sol.moneda) : null
          } />
          {sol.moneda === 'USD' && sol.valor_moneda_usd_texto && (
            <Row label="Valor en USD (texto)" value={`USD ${sol.valor_moneda_usd_texto}`} />
          )}
          {sol.moneda === 'EUR' && sol.valor_moneda_eur_texto && (
            <Row label="Valor en EUR (texto)" value={`EUR ${sol.valor_moneda_eur_texto}`} />
          )}
          <Row label="Valor en COP" value={
            sol.valor_en_cop ? formatCurrency(sol.valor_en_cop, 'COP') : (sol.valor_moneda_cop_texto ? `COP ${sol.valor_moneda_cop_texto}` : null)
          } />
          <Row label="Forma de pago" value={sol.forma_pago} />
          <Row label="Fuente de financiación" value={sol.fuente_financiacion} last />
        </div>

        {/* ── V. PLAZO DE EJECUCIÓN ─────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="V. Plazo de Ejecución" icon={Calendar} />
          <Row label="Fecha de inicio (aprobación)" value={formatDate(sol.fecha_respuesta_juridica)} />
          <Row label="Plazo" value={
            [sol.plazo_ejecucion_meses ? `${sol.plazo_ejecucion_meses} meses` : null,
             sol.plazo_ejecucion_dias ? `${sol.plazo_ejecucion_dias} días` : null]
              .filter(Boolean).join(', ') || null
          } />
          <Row label="Fecha estimada de finalización" value={fechaFin ? formatDate(fechaFin) : null} />
          <Row label="Lugar de ejecución" value={sol.lugar_ejecucion} last />
        </div>

        {/* ── VI. SUPERVISIÓN ───────────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="VI. Supervisión y Responsables" icon={Building2} />
          <Row label="Supervisor asignado" value={sol.supervision_nombre || sol.solicitante_nombre} />
          <Row label="Cargo supervisor" value={sol.supervision_cargo} />
          <Row label="Entregables principales" value={sol.entregables} last />
        </div>

        {/* ── VII. DOCUMENTOS JURÍDICOS ─────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="VII. Documentos del Expediente" icon={Paperclip} />

          {/* Carpetas SharePoint */}
          <div style={{ padding: '16px', borderBottom: '1px solid #e5e7eb' }}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wide">Carpetas del Expediente en SharePoint</p>
            <div className="flex flex-wrap gap-2">
              {['01.Precontractual', '02.Contractual', '03.Postcontractual'].map(carpeta => (
                <button
                  key={carpeta}
                  onClick={() => abrirSharePoint(carpeta)}
                  disabled={spLoading}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                >
                  <ExternalLink size={14} />
                  {carpeta}
                </button>
              ))}
            </div>
          </div>

          {/* Docs subidos en el sistema */}
          <div style={{ padding: '16px' }}>
            <p className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wide">Documentos cargados en el sistema</p>
            {docs.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No hay documentos cargados en el sistema.</p>
            ) : (
              <div className="space-y-2">
                {docs.map((d: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-gray-50 border border-gray-100">
                    <FileText size={16} className="text-blue-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-800 truncate">{d.nombre_original || d.nombre}</p>
                      <p className="text-xs text-gray-400">{d.tipo || 'Documento'} · {formatDate(d.creado_en)}</p>
                    </div>
                    {d.url && (
                      <a href={`${API_URL}${d.url}`} target="_blank" rel="noreferrer"
                        className="shrink-0 text-blue-600 hover:text-blue-800">
                        <Download size={15} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── VIII. EVALUACIÓN DEL PROCESO ──────────────────────────── */}
        {calificacion?.evaluacion && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
            <SectionHeader title="VIII. Evaluación de Proponentes" icon={Scale} />
            <Row label="Proponente recomendado" value={
              (proveedorGanador?.nombre_proveedor || calificacion.evaluacion.ganador_nombre)
                ? <span className="font-semibold text-green-700">★ {proveedorGanador?.nombre_proveedor || calificacion.evaluacion.ganador_nombre}</span>
                : null
            } />
            <Row label="Estado de evaluación" value={
              calificacion.evaluacion.finalizada
                ? <span className="text-green-700 font-semibold flex items-center gap-1"><CheckCircle2 size={14} /> Finalizada</span>
                : <span className="text-amber-600 font-semibold flex items-center gap-1"><Clock size={14} /> En proceso</span>
            } last />
          </div>
        )}

        {/* ── IX. INFORMACIÓN ADICIONAL ─────────────────────────────── */}
        {(sol.riesgos || sol.criterios_ambientales || sol.comite_contratacion) && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
            <SectionHeader title="IX. Información Adicional" icon={AlertTriangle} />
            {sol.riesgos && <Row label="Riesgos identificados" value={sol.riesgos} />}
            {sol.criterios_ambientales && <Row label="Criterios ambientales / SST" value={sol.criterios_ambientales} />}
            {sol.comite_contratacion && <Row label="Requiere comité de contratación" value={sol.comite_contratacion ? 'Sí' : 'No'} />}
            <Row label="Comentario jurídico" value={sol.comentario_juridica} last />
          </div>
        )}

        {/* Pie de página */}
        <div className="text-center text-xs text-gray-400 mt-8 mb-4">
          Formulario contractual — Sistema de Compras y Contratación · Invest in Bogotá
        </div>
      </div>
    </div>
  );
}
