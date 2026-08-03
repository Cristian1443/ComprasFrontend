import { apiFetch } from '../../lib/apiClient';
import React, { useState, useEffect } from 'react';
import { Settings, Save, CheckCircle, Loader2, DollarSign, FileText, Bell, Globe, ShieldCheck, Activity, Cpu } from 'lucide-react';
import { ConfiguracionFirmas } from './ConfiguracionFirmas';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export function Parametros() {
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState(false);

  const [parametros, setParametros] = useState({
    SMLV_2025: '1.423.500',
    UMBRAL_TDR_SMLV: '50',
    EMAIL_GERENTE_DEFAULT: 'pasantedesarrollo@investinbogota.org',
    DIAS_ALERTA: '5',
    VERSION_SCHEMA: '1.0'
  });

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/configuracion`);
      if (res.ok) {
        const data = await res.json();
        setParametros(prev => ({ ...prev, ...data }));
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, []);

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/admin/configuracion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parametros)
      });
      if (res.ok) {
        setGuardadoExitoso(true);
        setTimeout(() => setGuardadoExitoso(false), 3000);
      }
    } catch (err) {
      console.error('Error saving config:', err);
    } finally {
      setGuardando(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 text-[var(--brand-secondary)] animate-spin" />
        <p className="text-slate-500 font-bold font-gabarito">Extrayendo configuración global...</p>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 bg-gray-50/50 min-h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Settings className="text-[var(--brand-secondary)]" size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Configuración Central
            </h1>
          </div>
          <p className="text-slate-500 font-medium italic mt-2">
            Gestión de variables de entorno y reglas de negocio transversales.
          </p>
        </div>

        <div className="flex items-center gap-4">
          {guardadoExitoso && (
            <div className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-4 py-2 rounded-2xl border border-emerald-100 animate-in slide-in-from-right-8 fade-in">
              <CheckCircle size={18} />
              <span className="text-sm font-bold">Cambios sincronizados</span>
            </div>
          )}
          <button
            onClick={handleGuardar}
            disabled={guardando}
            className="flex items-center gap-2 px-8 py-3 bg-[#E84922] text-white rounded-2xl hover:bg-[#C73D1C] transition-all font-bold shadow-lg shadow-red-100 disabled:opacity-50"
          >
            {guardando ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            Guardar Cambios
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Parámetros de Operación */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
            <div className="p-2 bg-blue-50 rounded-xl text-blue-600"><DollarSign size={20} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-gabarito">Variables Financieras</h3>
              <p className="text-xs text-slate-400 font-medium">Cálculos automáticos de umbrales y modalidades.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SMLV Vigente (COP)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={parametros.SMLV_2025}
                  onChange={(e) => setParametros({ ...parametros, SMLV_2025: e.target.value })}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-transparent rounded-[1.2rem] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-[var(--brand-secondary)]/10 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Umbral TDR (Múltiplos SMLV)</label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={parametros.UMBRAL_TDR_SMLV}
                  onChange={(e) => setParametros({ ...parametros, UMBRAL_TDR_SMLV: e.target.value })}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-transparent rounded-[1.2rem] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-[var(--brand-secondary)]/10 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Notificaciones y Workflow */}
        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-100 space-y-8">
          <div className="flex items-center gap-3 border-b border-slate-50 pb-6">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600"><Bell size={20} /></div>
            <div>
              <h3 className="text-lg font-black text-slate-900 font-gabarito">Comunicaciones y Flujo</h3>
              <p className="text-xs text-slate-400 font-medium">Alertas automáticas y destinatarios clave.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Gerente Default (Pruebas)</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="email"
                  value={parametros.EMAIL_GERENTE_DEFAULT}
                  onChange={(e) => setParametros({ ...parametros, EMAIL_GERENTE_DEFAULT: e.target.value })}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-transparent rounded-[1.2rem] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-[var(--brand-secondary)]/10 transition-all font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Días para Alerta de Inactividad</label>
              <div className="relative">
                <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input
                  type="text"
                  value={parametros.DIAS_ALERTA}
                  onChange={(e) => setParametros({ ...parametros, DIAS_ALERTA: e.target.value })}
                  className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border-transparent rounded-[1.2rem] text-sm font-bold text-slate-700 focus:ring-4 focus:ring-[var(--brand-secondary)]/10 transition-all font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Sistema y Engine */}
        <div className="xl:col-span-2 bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2"></div>
          <div className="relative flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex gap-4 items-start">
              <div className="p-4 bg-white/5 rounded-2xl text-blue-400 border border-white/10 group-hover:scale-110 transition-transform">
                <Cpu size={32} />
              </div>
              <div>
                <h3 className="text-xl font-black text-white font-gabarito">Motor del Sistema</h3>
                <p className="text-sm text-slate-400 max-w-md mt-1 italic">
                  Versión del Esquema: <span className="text-blue-400 font-bold font-mono">v{parametros.VERSION_SCHEMA}</span>.
                  Configuración crítica. Los cambios impactan directamente el comportamiento lógico de la plataforma.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest text-center mb-1">Status Base de Datos</p>
                <p className="text-emerald-400 font-black text-center flex items-center justify-center gap-2">
                  <ShieldCheck size={16} /> ONLINE
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ───── Firmas electrónicas (Adobe Sign) ───── */}
      <ConfiguracionFirmas />
    </div>
  );
}
