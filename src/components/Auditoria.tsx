import React, { useState } from 'react';
import { Shield, User, Clock, Edit, FileText, CheckCircle, XCircle, Filter, Download } from 'lucide-react';

interface RegistroAuditoria {
  id: number;
  fecha: string;
  hora: string;
  usuario: string;
  rol: string;
  accion: string;
  modulo: string;
  detalle: string;
  ip: string;
  tipo: 'Creación' | 'Modificación' | 'Eliminación' | 'Aprobación' | 'Rechazo';
}

export function Auditoria() {
  const [filtroModulo, setFiltroModulo] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');

  const [registros] = useState<RegistroAuditoria[]>([
    {
      id: 1,
      fecha: '11/02/2026',
      hora: '10:45:23',
      usuario: 'Juan Díaz',
      rol: 'Solicitante',
      accion: 'Creó nueva solicitud',
      modulo: 'Solicitudes',
      detalle: 'Solicitud SOL-2024-005 - Contratación Servicios de Consultoría',
      ip: '192.168.1.45',
      tipo: 'Creación',
    },
    {
      id: 2,
      fecha: '11/02/2026',
      hora: '09:30:15',
      usuario: 'María González',
      rol: 'Área Jurídica',
      accion: 'Aprobó solicitud',
      modulo: 'Aprobaciones',
      detalle: 'Solicitud SOL-2024-003 aprobada por Área Jurídica',
      ip: '192.168.1.52',
      tipo: 'Aprobación',
    },
    {
      id: 3,
      fecha: '10/02/2026',
      hora: '16:20:48',
      usuario: 'Carlos Rodríguez',
      rol: 'Área Financiera',
      accion: 'Modificó presupuesto',
      modulo: 'Solicitudes',
      detalle: 'Actualización de valor en SOL-2024-002 de $25.000.000 a $28.500.000',
      ip: '192.168.1.63',
      tipo: 'Modificación',
    },
    {
      id: 4,
      fecha: '10/02/2026',
      hora: '14:15:32',
      usuario: 'Ana Martínez',
      rol: 'Administrador',
      accion: 'Cargó documento',
      modulo: 'Documentos',
      detalle: 'RUT cargado para proceso SOL-2024-004',
      ip: '192.168.1.88',
      tipo: 'Creación',
    },
    {
      id: 5,
      fecha: '10/02/2026',
      hora: '11:05:19',
      usuario: 'Pedro López',
      rol: 'Área Jurídica',
      accion: 'Rechazó solicitud',
      modulo: 'Aprobaciones',
      detalle: 'Solicitud SOL-2024-001 rechazada - Documentación incompleta',
      ip: '192.168.1.52',
      tipo: 'Rechazo',
    },
    {
      id: 6,
      fecha: '09/02/2026',
      hora: '15:40:55',
      usuario: 'Juan Díaz',
      rol: 'Solicitante',
      accion: 'Modificó cronograma',
      modulo: 'Solicitudes',
      detalle: 'Actualización de fechas en cronograma SOL-2024-002',
      ip: '192.168.1.45',
      tipo: 'Modificación',
    },
    {
      id: 7,
      fecha: '09/02/2026',
      hora: '10:22:11',
      usuario: 'María González',
      rol: 'Área Jurídica',
      accion: 'Descargó documento',
      modulo: 'Documentos',
      detalle: 'Descarga de Cámara de Comercio - SOL-2024-003',
      ip: '192.168.1.52',
      tipo: 'Modificación',
    },
    {
      id: 8,
      fecha: '08/02/2026',
      hora: '13:55:47',
      usuario: 'Carlos Rodríguez',
      rol: 'Área Financiera',
      accion: 'Aprobó solicitud',
      modulo: 'Aprobaciones',
      detalle: 'Solicitud SOL-2024-002 aprobada por Área Financiera',
      ip: '192.168.1.63',
      tipo: 'Aprobación',
    },
  ]);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Creación':
        return <FileText className="text-blue-600" size={20} />;
      case 'Modificación':
        return <Edit className="text-yellow-600" size={20} />;
      case 'Eliminación':
        return <XCircle className="text-red-600" size={20} />;
      case 'Aprobación':
        return <CheckCircle className="text-green-600" size={20} />;
      case 'Rechazo':
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <Shield className="text-gray-600" size={20} />;
    }
  };

  const getTipoBadgeColor = (tipo: string) => {
    switch (tipo) {
      case 'Creación':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Modificación':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Eliminación':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Aprobación':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Rechazo':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const registrosFiltrados = registros.filter(registro => {
    const moduloMatch = filtroModulo === 'Todos' || registro.modulo === filtroModulo;
    const tipoMatch = filtroTipo === 'Todos' || registro.tipo === filtroTipo;
    return moduloMatch && tipoMatch;
  });

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="text-[var(--brand-secondary)]" size={32} />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Auditoría del Sistema</h1>
        </div>
        <p className="text-gray-600">Registro completo de actividades y modificaciones</p>
      </div>

      {/* Panel de Control */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Filter className="text-gray-600" size={24} />
            <div className="flex flex-col sm:flex-row gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Módulo</label>
                <select
                  value={filtroModulo}
                  onChange={(e) => setFiltroModulo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                >
                  <option>Todos</option>
                  <option>Solicitudes</option>
                  <option>Aprobaciones</option>
                  <option>Documentos</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Acción</label>
                <select
                  value={filtroTipo}
                  onChange={(e) => setFiltroTipo(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
                >
                  <option>Todos</option>
                  <option>Creación</option>
                  <option>Modificación</option>
                  <option>Aprobación</option>
                  <option>Rechazo</option>
                </select>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-[#E84922] text-white rounded-lg hover:bg-[#C73D1C] transition-colors font-medium">
            <Download size={20} />
            Exportar Reporte
          </button>
        </div>
      </div>

      {/* Estadísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Registros</p>
              <p className="text-2xl font-bold text-gray-900">{registros.length}</p>
            </div>
            <Shield className="text-[var(--brand-secondary)]" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aprobaciones</p>
              <p className="text-2xl font-bold text-green-700">
                {registros.filter(r => r.tipo === 'Aprobación').length}
              </p>
            </div>
            <CheckCircle className="text-green-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Modificaciones</p>
              <p className="text-2xl font-bold text-yellow-700">
                {registros.filter(r => r.tipo === 'Modificación').length}
              </p>
            </div>
            <Edit className="text-yellow-600" size={32} />
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-[var(--brand-secondary)]">5</p>
            </div>
            <User className="text-blue-600" size={32} />
          </div>
        </div>
      </div>

      {/* Lista de Registros */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden">
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-bold text-slate-900">
            Registro de Actividades ({registrosFiltrados.length})
          </h2>
        </div>

        <div className="divide-y divide-gray-200">
          {registrosFiltrados.map((registro) => (
            <div
              key={registro.id}
              className="p-6 hover:bg-gray-50 transition-colors"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Icono y Tipo */}
                <div className="flex items-start gap-3 lg:w-48">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getTipoIcon(registro.tipo)}
                  </div>
                  <div>
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getTipoBadgeColor(registro.tipo)}`}>
                      {registro.tipo}
                    </span>
                    <p className="text-xs text-gray-600 mt-1">{registro.modulo}</p>
                  </div>
                </div>

                {/* Información Principal */}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 mb-2">{registro.accion}</h3>
                  <p className="text-sm text-gray-700 mb-3">{registro.detalle}</p>
                  
                  <div className="flex flex-wrap gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <User size={14} />
                      <span><strong>{registro.usuario}</strong> ({registro.rol})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock size={14} />
                      <span>{registro.fecha} - {registro.hora}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Shield size={14} />
                      <span>IP: {registro.ip}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Información de Seguridad */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start gap-3">
          <Shield className="text-blue-600 mt-0.5" size={24} />
          <div>
            <h3 className="font-semibold text-blue-900 mb-2">Información de Seguridad</h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>• Todos los registros son inmutables y están protegidos contra modificación</li>
              <li>• El acceso al módulo de auditoría requiere permisos administrativos</li>
              <li>• Los registros se conservan por un período mínimo de 5 años</li>
              <li>• Cada acción queda asociada al usuario autenticado y su dirección IP</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
