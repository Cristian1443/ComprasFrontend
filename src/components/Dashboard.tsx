import React from 'react';
import { Plus, Clock, FileCheck, CheckCircle, AlertCircle, TrendingUp } from 'lucide-react';

interface DashboardProps {
  onNewRequest: () => void;
}

export function Dashboard({ onNewRequest }: DashboardProps) {
  const procesosActivos = [
    {
      id: 'SOL-2024-001',
      titulo: 'Contratación Servicios de Consultoría',
      estado: 'Pendiente Jurídica',
      fecha: '05/02/2026',
      valor: '45.000.000',
      modalidad: 'Invitación',
      color: 'yellow',
    },
    {
      id: 'SOL-2024-002',
      titulo: 'Adquisición Equipos de Cómputo',
      estado: 'Pendiente Financiera',
      fecha: '03/02/2026',
      valor: '28.500.000',
      modalidad: 'Directa',
      color: 'blue',
    },
    {
      id: 'SOL-2024-003',
      titulo: 'Servicio de Mantenimiento',
      estado: 'Aprobado',
      fecha: '01/02/2026',
      valor: '15.000.000',
      modalidad: 'Directa',
      color: 'green',
    },
  ];

  const estadisticas = [
    { label: 'Total Procesos', valor: '12', icono: FileCheck, color: 'bg-blue-100 text-[var(--brand-secondary)]' },
    { label: 'En Revisión', valor: '5', icono: Clock, color: 'bg-yellow-100 text-yellow-700' },
    { label: 'Aprobados', valor: '7', icono: CheckCircle, color: 'bg-green-100 text-green-700' },
    { label: 'Alertas', valor: '2', icono: AlertCircle, color: 'bg-red-100 text-red-700' },
  ];

  const getEstadoStyles = (estado: string) => {
    switch (estado) {
      case 'Pendiente Jurídica':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'Pendiente Financiera':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Aprobado':
        return 'bg-green-100 text-green-800 border-green-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Dashboard de Procesos</h1>
        <p className="text-slate-500 font-medium">Bienvenido, Juan Díaz - Solicitante</p>
      </div>

      {/* Botón Nueva Solicitud */}
      <button
        onClick={onNewRequest}
        className="mb-8 w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-4 bg-[#E84922] text-white rounded-lg hover:bg-[#C73D1C] transition-all shadow-lg hover:shadow-xl font-medium text-lg"
      >
        <Plus size={24} />
        Nueva Solicitud
      </button>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {estadisticas.map((stat, index) => {
          const Icon = stat.icono;
          return (
            <div key={index} className="bg-white rounded-lg p-6 shadow-md border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-3xl font-semibold text-gray-900">{stat.valor}</p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <Icon size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Procesos Activos */}
      <div className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="text-[var(--brand-secondary)]" size={24} />
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Procesos Activos</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {procesosActivos.map((proceso) => (
            <div
              key={proceso.id}
              className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm text-gray-600 font-medium">{proceso.id}</p>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1">
                      {proceso.titulo}
                    </h3>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Modalidad:</span>
                    <span className="font-medium text-gray-900">{proceso.modalidad}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Valor:</span>
                    <span className="font-medium text-gray-900">${proceso.valor}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Fecha:</span>
                    <span className="font-medium text-gray-900">{proceso.fecha}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getEstadoStyles(
                      proceso.estado
                    )}`}
                  >
                    {proceso.estado}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Notificaciones Recientes */}
      <div>
        <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-4">Notificaciones Recientes</h2>
        <div className="bg-white rounded-lg shadow-md border border-gray-200 divide-y divide-gray-200">
          <div className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="text-green-700" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Solicitud SOL-2024-003 aprobada</p>
                <p className="text-sm text-gray-600 mt-1">
                  El área financiera ha aprobado tu solicitud. Puede continuar con el proceso.
                </p>
                <p className="text-xs text-gray-500 mt-2">Hace 2 horas</p>
              </div>
            </div>
          </div>
          <div className="p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="text-[var(--brand-secondary)]" size={20} />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Recordatorio: Revisión pendiente</p>
                <p className="text-sm text-gray-600 mt-1">
                  La solicitud SOL-2024-002 está en revisión por el área financiera.
                </p>
                <p className="text-xs text-gray-500 mt-2">Hace 1 día</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
