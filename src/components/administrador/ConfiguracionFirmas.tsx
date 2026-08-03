import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import {
  PenLine, Save, Loader2, CheckCircle2, AlertTriangle,
  ShieldCheck, KeyRound, Mail, Cloud,
} from 'lucide-react';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface FirmanteConfig {
  rol_firma: string;
  nombre: string;
  email: string;
  cargo: string;
  activo: boolean;
}

interface AdobeConfig {
  modo: 'mock' | 'sandbox' | 'produccion';
  api_base_url: string;
  tiene_client_id: boolean;
  tiene_client_secret: boolean;
  tiene_refresh_token: boolean;
  tiene_integration_key: boolean;
}

interface GraphConfig {
  modo: 'mock' | 'produccion';
  tenant_id: string | null;
  site_search: string;
  drive_name: string;
  parent_path: string;
  tiene_client_id: boolean;
  tiene_client_secret: boolean;
}

const ROL_LABEL: Record<string, { titulo: string; sub: string }> = {
  director_financiero: {
    titulo: 'Jefe de Financiera',
    sub: 'Firma siempre las aprobaciones de Financiera.',
  },
  directora_comite: {
    titulo: 'Directora del Comité',
    sub: 'Firma el acta del Comité de Contratación (firma 1).',
  },
  secretaria_comite: {
    titulo: 'Secretaria del Comité',
    sub: 'Firma el acta del Comité de Contratación (firma 2).',
  },
};

export function ConfiguracionFirmas() {
  const [firmantes, setFirmantes] = useState<FirmanteConfig[]>([]);
  const [adobe, setAdobe] = useState<AdobeConfig | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [oauthUrls, setOauthUrls] = useState<{ redirect_uri: string; connect_url: string } | null>(null);

  // Adobe form
  const [adobeForm, setAdobeForm] = useState({
    modo: 'mock' as 'mock' | 'sandbox' | 'produccion',
    api_base_url: 'https://api.na1.adobesign.com',
    integration_key: '',
    client_id: '',
    client_secret: '',
    refresh_token: '',
  });

  // Graph (SharePoint) form
  const [graph, setGraph] = useState<GraphConfig | null>(null);
  const [graphForm, setGraphForm] = useState({
    modo: 'mock' as 'mock' | 'produccion',
    tenant_id: '',
    client_id: '',
    client_secret: '',
    site_search: 'Documental',
    drive_name: 'Expedientes',
    parent_path: 'Pruebas tecnicas',
  });

  const cargar = async () => {
    setCargando(true);
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        apiFetch(`${API_URL}/api/configuracion/firmantes`),
        apiFetch(`${API_URL}/api/configuracion/adobe-sign`),
        apiFetch(`${API_URL}/api/adobe-sign/oauth/redirect-uri`),
        apiFetch(`${API_URL}/api/configuracion/graph-app`),
      ]);
      if (r1.ok) {
        const todos = await r1.json();
        setFirmantes(todos.filter((f: FirmanteConfig) =>
          ['directora_comite', 'secretaria_comite'].includes(f.rol_firma)
        ));
      }
      if (r2.ok) {
        const d = await r2.json();
        setAdobe(d);
        setAdobeForm((p) => ({ ...p, modo: d.modo || 'mock', api_base_url: d.api_base_url || p.api_base_url }));
      }
      if (r3.ok) {
        const u = await r3.json();
        setOauthUrls({ redirect_uri: u.redirect_uri, connect_url: u.connect_url });
      }
      if (r4.ok) {
        const d = await r4.json();
        setGraph(d);
        setGraphForm((p) => ({
          ...p,
          modo: d.modo || 'mock',
          tenant_id: d.tenant_id || '',
          site_search: d.site_search || p.site_search,
          drive_name: d.drive_name || p.drive_name,
          parent_path: d.parent_path || p.parent_path,
        }));
      }
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const guardarFirmante = async (rol: string) => {
    const f = firmantes.find((x) => x.rol_firma === rol);
    if (!f) return;
    setGuardando(rol);
    setMensaje(null);
    try {
      const r = await apiFetch(`${API_URL}/api/configuracion/firmantes/${rol}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: f.nombre, email: f.email, cargo: f.cargo, activo: f.activo }),
      });
      if (!r.ok) throw new Error('Error al guardar');
      setMensaje({ tipo: 'ok', texto: `${ROL_LABEL[rol]?.titulo || rol} actualizado.` });
      setTimeout(() => setMensaje(null), 3000);
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'Error al guardar' });
    } finally {
      setGuardando(null);
    }
  };

  const conectarAdobe = async () => {
    setGuardando('conectar');
    setMensaje(null);
    try {
      const r = await apiFetch(`${API_URL}/api/adobe-sign/oauth/auth-url`);
      if (!r.ok) throw new Error('No se pudo obtener la URL de conexión. ¿Está la API corriendo?');
      const d = await r.json();
      const url = d.auth_url || d.connect_url;
      if (!url) throw new Error('Falta Client ID. Guarda las credenciales primero.');
      window.open(url, '_blank', 'noopener,noreferrer');
      setMensaje({ tipo: 'ok', texto: 'Se abrió Adobe Sign en una pestaña nueva. Dale Permitir el acceso.' });
      setTimeout(() => setMensaje(null), 5000);
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'Error al conectar' });
    } finally {
      setGuardando(null);
    }
  };

  const guardarAdobe = async () => {
    setGuardando('adobe');
    setMensaje(null);
    try {
      const body: any = {
        modo: adobeForm.modo,
        api_base_url: adobeForm.api_base_url,
      };
      if (adobeForm.integration_key) body.integration_key = adobeForm.integration_key;
      if (adobeForm.client_id) body.client_id = adobeForm.client_id;
      if (adobeForm.client_secret) body.client_secret = adobeForm.client_secret;
      if (adobeForm.refresh_token) body.refresh_token = adobeForm.refresh_token;

      const r = await apiFetch(`${API_URL}/api/configuracion/adobe-sign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('Error al guardar configuración Adobe Sign');
      setMensaje({
        tipo: 'ok',
        texto: adobeForm.client_secret
          ? 'Credenciales guardadas. El Client Secret se oculta por seguridad, pero quedó almacenado.'
          : 'Configuración Adobe Sign guardada.',
      });
      setAdobeForm((p) => ({ ...p, client_secret: '', refresh_token: '', integration_key: '' }));
      await cargar();
      setTimeout(() => setMensaje(null), 3000);
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'Error' });
    } finally {
      setGuardando(null);
    }
  };

  const guardarGraph = async () => {
    setGuardando('graph');
    setMensaje(null);
    try {
      const body: any = {
        modo: graphForm.modo,
        site_search: graphForm.site_search,
        drive_name: graphForm.drive_name,
        parent_path: graphForm.parent_path,
      };
      if (graphForm.tenant_id) body.tenant_id = graphForm.tenant_id;
      if (graphForm.client_id) body.client_id = graphForm.client_id;
      if (graphForm.client_secret) body.client_secret = graphForm.client_secret;

      const r = await apiFetch(`${API_URL}/api/configuracion/graph-app`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error('Error al guardar configuración de SharePoint');
      setMensaje({
        tipo: 'ok',
        texto: graphForm.client_secret
          ? 'Credenciales guardadas. El Client Secret se oculta por seguridad, pero quedó almacenado.'
          : 'Configuración de SharePoint guardada.',
      });
      setGraphForm((p) => ({ ...p, client_secret: '' }));
      await cargar();
      setTimeout(() => setMensaje(null), 3000);
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message || 'Error' });
    } finally {
      setGuardando(null);
    }
  };

  if (cargando) {
    return (
      <div className="bg-white rounded-3xl p-8 border border-slate-100 flex items-center gap-3">
        <Loader2 className="animate-spin text-slate-400" size={20} />
        <span className="text-sm text-slate-500 font-bold">Cargando configuración de firmas...</span>
      </div>
    );
  }

  const modoMeta = {
    mock: { color: '#92400E', bg: '#FFFBEB', label: 'MODO PRUEBA', desc: 'Las firmas son simuladas. No se envían correos reales.' },
    sandbox: { color: '#1E40AF', bg: '#EFF6FF', label: 'SANDBOX', desc: 'Cuenta de desarrollo de Adobe Sign.' },
    produccion: { color: '#065F46', bg: '#ECFDF5', label: 'PRODUCCIÓN', desc: 'Firmas reales sobre cuenta corporativa.' },
  }[adobe?.modo || 'mock'];

  return (
    <div className="space-y-6">
      {mensaje && (
        <div
          className={`flex items-center gap-2 rounded-2xl px-4 py-3 border ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}
        >
          {mensaje.tipo === 'ok' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span className="text-sm font-bold">{mensaje.texto}</span>
        </div>
      )}

      {/* ───── Firmantes fijos ───── */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-6 mb-6">
          <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
            <PenLine size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">Firmantes del Comité</h3>
            <p className="text-xs text-slate-400 font-medium">
              Gerente, Financiera y Jurídica usan estampa de tiempo. Solo el acta del Comité requiere firma electrónica.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {firmantes.map((f, idx) => {
            const meta = ROL_LABEL[f.rol_firma] || { titulo: f.rol_firma, sub: '' };
            return (
              <div key={f.rol_firma} className="bg-slate-50 rounded-2xl p-5 border border-slate-100">
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 rounded-full bg-orange-100 text-orange-700 text-xs font-black flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <p className="text-sm font-black text-slate-900">{meta.titulo}</p>
                </div>
                <p className="text-[11px] text-slate-500 font-medium italic mb-4 leading-snug">{meta.sub}</p>

                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Nombre</label>
                <input
                  type="text"
                  value={f.nombre}
                  onChange={(e) => setFirmantes(arr => arr.map(x => x.rol_firma === f.rol_firma ? { ...x, nombre: e.target.value } : x))}
                  className="w-full mt-1 mb-3 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                />

                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Email</label>
                <div className="relative mt-1 mb-3">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                  <input
                    type="email"
                    value={f.email}
                    onChange={(e) => setFirmantes(arr => arr.map(x => x.rol_firma === f.rol_firma ? { ...x, email: e.target.value } : x))}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
                  />
                </div>

                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Cargo</label>
                <input
                  type="text"
                  value={f.cargo || ''}
                  onChange={(e) => setFirmantes(arr => arr.map(x => x.rol_firma === f.rol_firma ? { ...x, cargo: e.target.value } : x))}
                  className="w-full mt-1 mb-4 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-600">
                    <input
                      type="checkbox"
                      checked={f.activo}
                      onChange={(e) => setFirmantes(arr => arr.map(x => x.rol_firma === f.rol_firma ? { ...x, activo: e.target.checked } : x))}
                    />
                    Activo
                  </label>
                  <button
                    onClick={() => guardarFirmante(f.rol_firma)}
                    disabled={guardando === f.rol_firma}
                    className="px-4 py-2 bg-[#E84922] text-white rounded-lg text-xs font-black flex items-center gap-2 disabled:opacity-50"
                  >
                    {guardando === f.rol_firma ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                    Guardar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───── Credenciales Adobe Sign ───── */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">Adobe Acrobat Sign</h3>
              <p className="text-xs text-slate-400 font-medium">
                Credenciales del cliente OAuth o Integration Key.
              </p>
            </div>
          </div>
          <div
            className="px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2"
            style={{ background: modoMeta.bg, color: modoMeta.color, borderColor: modoMeta.color + '40' }}
          >
            <ShieldCheck size={13} /> {modoMeta.label}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic mb-5">{modoMeta.desc}</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Modo</label>
            <select
              value={adobeForm.modo}
              onChange={(e) => setAdobeForm({ ...adobeForm, modo: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
            >
              <option value="mock">Mock (pruebas)</option>
              <option value="sandbox">Sandbox (Adobe dev)</option>
              <option value="produccion">Producción</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">API Base URL</label>
            <input
              type="text"
              value={adobeForm.api_base_url}
              onChange={(e) => setAdobeForm({ ...adobeForm, api_base_url: e.target.value })}
              placeholder="https://api.na1.adobesign.com"
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
          </div>

          <div className="md:col-span-2 mt-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider mb-2 flex items-center gap-2">
              <KeyRound size={12} /> Integration Key (más simple)
            </p>
            <input
              type="password"
              value={adobeForm.integration_key}
              onChange={(e) => setAdobeForm({ ...adobeForm, integration_key: e.target.value })}
              placeholder={adobe?.tiene_integration_key ? '••••••••• (ya configurado · escribe para reemplazar)' : 'Pega aquí tu Integration Key'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
          </div>

          <div className="md:col-span-2 mt-1 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <KeyRound size={12} /> OAuth (alternativa)
            </p>
            <input
              type="text"
              value={adobeForm.client_id}
              onChange={(e) => setAdobeForm({ ...adobeForm, client_id: e.target.value })}
              placeholder={adobe?.tiene_client_id ? '••••••••• (configurado)' : 'Client ID'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
            <input
              type="password"
              value={adobeForm.client_secret}
              onChange={(e) => setAdobeForm({ ...adobeForm, client_secret: e.target.value })}
              placeholder={adobe?.tiene_client_secret ? '••••••••• (ya guardado · escribe solo para reemplazar)' : 'Client Secret'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
            {adobe?.tiene_client_secret && !adobeForm.client_secret && (
              <p className="text-[11px] text-emerald-700 font-bold">✓ Client Secret guardado en el servidor</p>
            )}
            <input
              type="password"
              value={adobeForm.refresh_token}
              onChange={(e) => setAdobeForm({ ...adobeForm, refresh_token: e.target.value })}
              placeholder={adobe?.tiene_refresh_token ? '••••••••• (ya guardado · se llena al conectar OAuth)' : 'Refresh Token (opcional si usas Conectar con Adobe Sign)'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
            {adobe?.tiene_refresh_token && !adobeForm.refresh_token && (
              <p className="text-[11px] text-emerald-700 font-bold">✓ Refresh Token guardado — Adobe Sign conectado</p>
            )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
          <p className="font-black uppercase tracking-wider">Conectar OAuth</p>
          <p>1) Guarda <strong>Client ID</strong> y <strong>Client Secret</strong> abajo.</p>
          <p>2) En Adobe Sign → Configurar OAuth → pega este Redirect URI:</p>
          <code className="block bg-white px-3 py-2 rounded-lg font-mono text-[11px] break-all">
            {oauthUrls?.redirect_uri || 'Reinicia la API para cargar la URL de ngrok'}
          </code>
          <p>3) Deja ngrok corriendo y usa el botón azul.</p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3 flex-wrap">
          <button
            type="button"
            onClick={conectarAdobe}
            disabled={guardando === 'conectar'}
            className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm disabled:opacity-50 flex items-center gap-2"
          >
            {guardando === 'conectar' ? <Loader2 size={14} className="animate-spin" /> : null}
            Conectar con Adobe Sign
          </button>
          <button
            onClick={guardarAdobe}
            disabled={guardando === 'adobe'}
            className="px-6 py-3 bg-[#1f4e79] text-white rounded-2xl font-black text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {guardando === 'adobe' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar credenciales
          </button>
        </div>
      </div>

      {/* ───── SharePoint (App Registration / Microsoft Graph) ───── */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-6 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-50 rounded-xl text-sky-600">
              <Cloud size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900">SharePoint (subida automática)</h3>
              <p className="text-xs text-slate-400 font-medium">
                App Registration de Azure AD para guardar el PDF firmado en 03.Postcontractual
                sin depender de que el supervisor tenga el navegador abierto.
              </p>
            </div>
          </div>
          <div
            className="px-4 py-2 rounded-xl border text-xs font-black flex items-center gap-2"
            style={{
              background: graph?.modo === 'produccion' ? '#ECFDF5' : '#FFFBEB',
              color: graph?.modo === 'produccion' ? '#065F46' : '#92400E',
              borderColor: (graph?.modo === 'produccion' ? '#065F46' : '#92400E') + '40',
            }}
          >
            <ShieldCheck size={13} /> {graph?.modo === 'produccion' ? 'PRODUCCIÓN' : 'MODO PRUEBA'}
          </div>
        </div>

        <p className="text-xs text-slate-500 italic mb-5">
          {graph?.modo === 'produccion'
            ? 'Sube archivos reales a SharePoint con permisos de aplicación.'
            : 'Las subidas a SharePoint son simuladas. No se sube nada real hasta configurar credenciales y pasar a producción.'}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Modo</label>
            <select
              value={graphForm.modo}
              onChange={(e) => setGraphForm({ ...graphForm, modo: e.target.value as any })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
            >
              <option value="mock">Mock (pruebas)</option>
              <option value="produccion">Producción</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tenant ID</label>
            <input
              type="text"
              value={graphForm.tenant_id}
              onChange={(e) => setGraphForm({ ...graphForm, tenant_id: e.target.value })}
              placeholder={graph?.tenant_id ? graph.tenant_id : 'ID del directorio de Azure AD'}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
          </div>

          <div className="md:col-span-2 mt-1 p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-3">
            <p className="text-[11px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-2">
              <KeyRound size={12} /> Credenciales de la App Registration
            </p>
            <input
              type="text"
              value={graphForm.client_id}
              onChange={(e) => setGraphForm({ ...graphForm, client_id: e.target.value })}
              placeholder={graph?.tiene_client_id ? '••••••••• (configurado)' : 'Client ID (Application ID)'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
            <input
              type="password"
              value={graphForm.client_secret}
              onChange={(e) => setGraphForm({ ...graphForm, client_secret: e.target.value })}
              placeholder={graph?.tiene_client_secret ? '••••••••• (ya guardado · escribe solo para reemplazar)' : 'Client Secret'}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm font-mono text-slate-700"
            />
            {graph?.tiene_client_secret && !graphForm.client_secret && (
              <p className="text-[11px] text-emerald-700 font-bold">✓ Client Secret guardado en el servidor</p>
            )}
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Sitio SharePoint</label>
            <input
              type="text"
              value={graphForm.site_search}
              onChange={(e) => setGraphForm({ ...graphForm, site_search: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Biblioteca</label>
            <input
              type="text"
              value={graphForm.drive_name}
              onChange={(e) => setGraphForm({ ...graphForm, drive_name: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
            />
          </div>
          <div className="md:col-span-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Carpeta raíz</label>
            <input
              type="text"
              value={graphForm.parent_path}
              onChange={(e) => setGraphForm({ ...graphForm, parent_path: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700"
            />
          </div>
        </div>

        <div className="mt-4 p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-2">
          <p className="font-black uppercase tracking-wider">Cómo obtener las credenciales</p>
          <p>1) En Azure AD → App Registrations → New registration.</p>
          <p>2) API permissions → Microsoft Graph → Application permissions → <code>Sites.ReadWrite.All</code> → conceder consentimiento del administrador.</p>
          <p>3) Certificates &amp; secrets → New client secret → pégalo aquí junto con el Client ID y el Tenant ID.</p>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <button
            onClick={guardarGraph}
            disabled={guardando === 'graph'}
            className="px-6 py-3 bg-[#1f4e79] text-white rounded-2xl font-black text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {guardando === 'graph' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Guardar credenciales
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfiguracionFirmas;
