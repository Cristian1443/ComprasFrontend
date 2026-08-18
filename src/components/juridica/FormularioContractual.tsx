import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import {
  ArrowLeft, ExternalLink, Loader2, FileText, CheckCircle2,
  Clock, XCircle, User, Building2,
  Paperclip, Scale, AlertTriangle, Download, Save
} from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getGraphClient } from '../../lib/graphService';
import { cargarUsuariosDirectorio, CandidatoDirectorio } from '../../lib/directorioUsuarios';
import { nombreGerenciaCompleto } from '../../lib/gerencias';
import { DetallePlaneacionContractualParte1, DetallePlaneacionContractualParte2 } from '../shared/DetallePlaneacionContractual';
import { SeccionPresupuestoLectura } from '../shared/SeccionPresupuestoLectura';

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

  // Reasignar supervisor — candidatos traídos del directorio de Azure AD
  // (todo el grupo, no solo quienes ya iniciaron sesión en el portal)
  const [usuarios, setUsuarios] = useState<CandidatoDirectorio[]>([]);
  const [supervisionIdSel, setSupervisionIdSel] = useState('');
  const [savingSuper, setSavingSuper] = useState(false);
  const [superMsg, setSuperMsg] = useState<{ ok: boolean; text: string } | null>(null);

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
    cargarUsuariosDirectorio(instance, accounts).then(setUsuarios);
  }, [contratoId]);

  const reasignarSupervisor = async () => {
    const candidato = usuarios.find(u => u.id === supervisionIdSel);
    if (!candidato) return;
    const supervisorActual = sol?.supervision_nombre;
    if (supervisorActual && supervisorActual !== candidato.nombre) {
      const confirmado = window.confirm(
        `¿Reasignar la supervisión de este contrato de "${supervisorActual}" a "${candidato.nombre}"?\n\n` +
        `Los entregables, informes, documentos y facturas ya registrados NO se pierden — quedan disponibles tal cual para el nuevo supervisor. Se le notificará por correo.`
      );
      if (!confirmado) return;
    }
    setSavingSuper(true);
    setSuperMsg(null);
    try {
      const resp = await apiFetch(`${API_URL}/api/juridica/solicitudes/${contratoId}/supervisor`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          azure_id: candidato.id,
          email: candidato.email,
          nombre: candidato.nombre,
          cargo: candidato.cargo,
        }),
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data?.error || 'Error al actualizar supervisor');
      setSol((prev: any) => ({ ...prev, supervision_nombre: data.supervisor?.nombre, supervision_cargo: data.supervisor?.cargo }));
      setSupervisionIdSel('');
      setSuperMsg({
        ok: true,
        text: data.reasignado
          ? `Reasignado de "${data.supervisorAnterior?.nombre || 'sin asignar'}" a "${data.supervisor?.nombre}". El nuevo supervisor conserva todo lo ya registrado del contrato y fue notificado por correo.`
          : `Asignado a "${data.supervisor?.nombre}".`,
      });
    } catch (e: any) {
      setSuperMsg({ ok: false, text: e.message || 'Error al guardar supervisor' });
    } finally {
      setSavingSuper(false);
    }
  };

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

  // Mismo cálculo que usa DetalleSolicitudJuridica para el badge de presupuesto aprobado
  const esDirecta = String(sol?.modalidad || '').toLowerCase() === 'directa';
  const montoCOP = Number(sol?.presupuesto_aprobado || sol?.valor_en_cop || sol?.valor_estimado || 0);
  const monedaSol = String(sol?.moneda || 'COP').toUpperCase();
  const valorOriginalMoneda =
    monedaSol === 'USD' ? sol?.valor_moneda_usd_texto :
    monedaSol === 'EUR' ? sol?.valor_moneda_eur_texto :
    sol?.valor_moneda_cop_texto;
  const presupuestoTexto = valorOriginalMoneda
    ? `${monedaSol} ${valorOriginalMoneda}`
    : formatCurrency(montoCOP, monedaSol);

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

        {/* ── INFORMACIÓN GENERAL (resumen; el detalle completo va en el Formato de Planeación Contractual de abajo) ── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="Información General del Contrato" icon={Scale} />
          <Row label="Solicitante" value={sol.solicitante_nombre} />
          <Row label="Fecha aprobación jurídica" value={formatDate(sol.fecha_respuesta_juridica)} />
          <Row label="Fecha estimada de finalización" value={fechaFin ? formatDate(fechaFin) : null} last />
        </div>

        {/* ── FORMATO DE PLANEACIÓN CONTRACTUAL ──────────────────────────
            Mismo componente compartido que usan Gerente, Financiera y
            Secretaría — depende de la modalidad (Directa/Invitación/TDR)
            para mostrar las secciones correctas, en vez de un formato
            genérico distinto al que se diligenció en el resto del flujo. */}
        <div className="space-y-6 mb-6">
          <DetallePlaneacionContractualParte1 solicitud={sol} />
          <SeccionPresupuestoLectura
            solicitud={sol}
            esDirecta={esDirecta}
            rubroFinanciera={sol.rubro}
            presupuestoAprobado={sol.presupuesto_aprobado ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                padding: '4px 12px', borderRadius: 8,
                backgroundColor: '#EFF6FF', color: '#1e3a5f',
                fontWeight: 800, fontSize: '0.95rem', border: '1px solid #BFDBFE',
              }}>
                {presupuestoTexto}
              </span>
            ) : undefined}
          />
          <DetallePlaneacionContractualParte2 solicitud={sol} />
        </div>

        {/* ── REASIGNAR SUPERVISOR ───────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title={sol.supervision_nombre ? 'Reasignar Supervisor' : 'Asignar Supervisor'} icon={Building2} />
          <div style={{ padding: '16px' }}>
            <p className="text-sm text-gray-600 mb-3">
              Supervisor actual:{' '}
              {sol.supervision_nombre
                ? <span className="font-semibold text-gray-900">{sol.supervision_nombre}{sol.supervision_cargo ? ` — ${sol.supervision_cargo}` : ''}</span>
                : <span className="italic text-gray-400">No asignado</span>}
            </p>
            <div className="flex gap-3 flex-wrap items-end">
              <div className="flex-1 min-w-[240px]">
                <select
                  value={supervisionIdSel}
                  onChange={(e) => { setSupervisionIdSel(e.target.value); setSuperMsg(null); }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">— Seleccione un usuario —</option>
                  {usuarios.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre}{u.cargo ? ` · ${u.cargo}` : ''}{u.gerencia_nombre ? ` (${nombreGerenciaCompleto(u.gerencia_nombre)})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={reasignarSupervisor}
                disabled={savingSuper || !supervisionIdSel}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-50"
                style={{ backgroundColor: 'var(--brand-secondary)' }}
              >
                {savingSuper ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                {sol.supervision_nombre ? 'Reasignar supervisor' : 'Asignar supervisor'}
              </button>
            </div>
            {superMsg && (
              <div
                className={`mt-3 flex items-start gap-2 text-sm font-semibold rounded-lg px-3 py-2 border ${
                  superMsg.ok
                    ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                    : 'text-red-700 bg-red-50 border-red-200'
                }`}
              >
                {superMsg.ok ? <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" /> : <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />}
                {superMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* ── CONTRATISTA / PROVEEDOR ────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="Contratista / Proveedor (Ganador)" icon={User} />
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

        {/* ── DOCUMENTOS DEL EXPEDIENTE ──────────────────────────────── */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
          <SectionHeader title="Documentos del Expediente" icon={Paperclip} />

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

        {/* ── EVALUACIÓN DEL PROCESO ─────────────────────────────────── */}
        {calificacion?.evaluacion && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
            <SectionHeader title="Evaluación de Proponentes" icon={Scale} />
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

        {/* ── INFORMACIÓN ADICIONAL ──────────────────────────────────── */}
        {(sol.riesgos || sol.criterios_ambientales || sol.comite_contratacion) && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm mb-6">
            <SectionHeader title="Información Adicional" icon={AlertTriangle} />
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
