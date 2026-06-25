import React from 'react';
import { Shield, CheckCircle2, XCircle, Users, Gavel, DollarSign, Crown } from 'lucide-react';

export function MatrizRoles() {
  const permisos = [
    { modulo: 'Crear Solicitudes de Compras', supervisor: true, juridica: true, financiera: true, admin: true },
    { modulo: 'Modificar Solicitudes de Compras', supervisor: false, juridica: true, financiera: true, admin: false },
    { modulo: 'Ver Solicitudes Propias', supervisor: true, juridica: true, financiera: true, admin: true },
    { modulo: 'Visibilidad Global de Solicitudes', supervisor: false, juridica: true, financiera: true, admin: true },
    { modulo: 'Aprobación / Rechazo Jurídico', supervisor: false, juridica: true, financiera: false, admin: true },
    { modulo: 'Aprobación / Rechazo Financiero', supervisor: false, juridica: false, financiera: true, admin: true },
    { modulo: 'Gestión Documental', supervisor: false, juridica: true, financiera: true, admin: true },
    { modulo: 'Gestión de Proveedores', supervisor: false, juridica: true, financiera: false, admin: true },
    { modulo: 'Auditoría Forense y Logs', supervisor: false, juridica: false, financiera: false, admin: true },
    { modulo: 'Administración de Usuarios', supervisor: false, juridica: false, financiera: false, admin: true },
    { modulo: 'Configuración de Parámetros', supervisor: false, juridica: false, financiera: false, admin: true },
  ];

  const renderCheckIcon = (tiene: boolean) => {
    return tiene ? (
      <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center mx-auto shadow-sm shadow-emerald-200">
        <CheckCircle2 className="text-emerald-600" size={16} />
      </div>
    ) : (
      <XCircle className="text-slate-300 mx-auto" size={20} />
    );
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-700 bg-gray-50/50 min-h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-2xl">
              <Shield className="text-[var(--brand-secondary)]" size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Control de Acceso (Matriz)
            </h1>
          </div>
          <p className="text-slate-500 font-medium italic mt-2">
            Visión unificada de permisos y capacidades por perfil institucional.
          </p>
        </div>
      </div>

      {/* Matriz de Permisos */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden mb-6">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-8 py-6 text-xs font-black uppercase tracking-widest text-[var(--brand-secondary)] border-b border-slate-100 w-1/3">Módulo / Capacidad</th>
                <th className="px-6 py-6 border-b border-slate-100 text-center group cursor-default">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-100 text-slate-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Users size={20} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">Supervisor</span>
                  </div>
                </th>
                <th className="px-6 py-6 border-b border-slate-100 text-center group cursor-default">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><Gavel size={20} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-blue-800">Jurídica</span>
                  </div>
                </th>
                <th className="px-6 py-6 border-b border-slate-100 text-center group cursor-default">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"><DollarSign size={20} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700">Financiera</span>
                  </div>
                </th>
                <th className="px-6 py-6 border-b border-slate-100 text-center group cursor-default">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-10 h-10 bg-slate-900 text-amber-400 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform"><Crown size={20} /></div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">Administrador</span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {permisos.map((permiso, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5 text-sm font-bold text-slate-800 font-gabarito flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#E84922] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    {permiso.modulo}
                  </td>
                  <td className="px-6 py-5 text-center">{renderCheckIcon(permiso.supervisor)}</td>
                  <td className="px-6 py-5 text-center">{renderCheckIcon(permiso.juridica)}</td>
                  <td className="px-6 py-5 text-center">{renderCheckIcon(permiso.financiera)}</td>
                  <td className="px-6 py-5 text-center bg-slate-50/30">{renderCheckIcon(permiso.admin)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Descripción de Roles */}
      <h3 className="text-xl font-black text-slate-900 font-gabarito mb-2 px-2">Definición de Perfiles</h3>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-4 hover:shadow-xl transition-all group">
          <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform border border-slate-100"><Users size={24} /></div>
          <h2 className="text-xl font-black text-slate-900 font-gabarito">Supervisor (Solicitante)</h2>
          <ul className="space-y-3 text-sm text-slate-500 font-medium italic">
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Crear y gestionar sus propias solicitudes de compra.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Ver el estado de sus solicitudes en tiempo real.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Completar formularios con información de planeación y cronograma.</li>
          </ul>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-4 hover:shadow-xl transition-all group border-t-4 border-t-blue-500">
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform border border-blue-100"><Gavel size={24} /></div>
          <h2 className="text-xl font-black text-slate-900 font-gabarito">Área Jurídica</h2>
          <ul className="space-y-3 text-sm text-slate-500 font-medium italic">
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Ver todas las solicitudes de la organización.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Aprobar, rechazar o solicitar ajustes en etapas clave.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Cargar actas de comité y gestionar proveedores.</li>
          </ul>
        </div>

        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-8 space-y-4 hover:shadow-xl transition-all group border-t-4 border-t-emerald-500">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform border border-emerald-100"><DollarSign size={24} /></div>
          <h2 className="text-xl font-black text-slate-900 font-gabarito">Área Financiera</h2>
          <ul className="space-y-3 text-sm text-slate-500 font-medium italic">
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Auditar solicitudes aprobadas por jurídica.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Aprobar presupuestos y asignar rubros contables.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Visualizar la ejecución global corporativa.</li>
          </ul>
        </div>

        <div className="bg-white rounded-[2rem] shadow-md border border-slate-200 p-8 space-y-4 hover:shadow-2xl transition-all group border-t-4 border-t-[var(--brand-secondary)]">
          <div className="w-12 h-12 bg-[var(--brand-secondary)] text-amber-400 rounded-2xl flex items-center justify-center group-hover:-translate-y-1 transition-transform shadow-lg"><Crown size={24} /></div>
          <h2 className="text-xl font-black text-slate-900 font-gabarito">Administrador</h2>
          <ul className="space-y-3 text-sm text-slate-500 font-medium italic">
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Acceso ilimitado a todos los módulos orgánicos.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Gestión de colabores, habilitaciones y asignación de dependencias.</li>
            <li className="flex items-start gap-3"><CheckCircle2 className="text-emerald-500 mt-0.5 flex-shrink-0" size={16} />Auditoría forense inmutable y afinación del motor (Parametrización).</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
