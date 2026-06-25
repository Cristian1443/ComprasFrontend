import React, { useState } from 'react';
import { Users, Search, Plus, Star, AlertTriangle } from 'lucide-react';

export function GestionProveedores() {
  const [busqueda, setBusqueda] = useState('');

  const proveedores = [
    {
      id: 1,
      nombre: 'Tech Solutions SAS',
      nit: '900.123.456-7',
      categoria: 'Tecnología',
      calificacion: 8.5,
      contratosActivos: 3,
      valorTotal: '$125.000.000',
      ciudad: 'Bogotá',
      telefono: '+57 310 123 4567',
      email: 'contacto@techsolutions.com',
    },
    {
      id: 2,
      nombre: 'Innovación Digital LTDA',
      nit: '900.234.567-8',
      categoria: 'Consultoría',
      calificacion: 7.8,
      contratosActivos: 2,
      valorTotal: '$85.000.000',
      ciudad: 'Medellín',
      telefono: '+57 320 234 5678',
      email: 'info@innovaciondigital.com',
    },
    {
      id: 3,
      nombre: 'Consultoría Empresarial SA',
      nit: '900.345.678-9',
      categoria: 'Servicios Profesionales',
      calificacion: 6.5,
      contratosActivos: 1,
      valorTotal: '$45.000.000',
      ciudad: 'Cali',
      telefono: '+57 315 345 6789',
      email: 'contacto@consultoria.com',
    },
    {
      id: 4,
      nombre: 'Suministros Corporativos',
      nit: '900.456.789-0',
      categoria: 'Suministros',
      calificacion: 9.2,
      contratosActivos: 5,
      valorTotal: '$210.000.000',
      ciudad: 'Bogotá',
      telefono: '+57 301 456 7890',
      email: 'ventas@suministroscorp.com',
    },
  ];

  const proveedoresFiltrados = proveedores.filter(
    (prov) =>
      prov.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      prov.nit.includes(busqueda) ||
      prov.categoria.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-2">
          <Users className="text-[var(--brand-secondary)]" size={32} />
          <h1 className="text-3xl font-black tracking-tight text-slate-900">Gestión de Proveedores</h1>
        </div>
        <p className="text-gray-600">Base de datos de proveedores y su desempeño</p>
      </div>

      {/* Controles */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, NIT o categoría..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[var(--brand-secondary)] focus:border-transparent"
            />
          </div>
          <button className="flex items-center gap-2 px-6 py-2 bg-[#E84922] text-white rounded-lg hover:bg-[#C73D1C] transition-colors font-medium">
            <Plus size={20} />
            Nuevo Proveedor
          </button>
        </div>
      </div>

      {/* Lista de Proveedores */}
      <div className="space-y-4">
        {proveedoresFiltrados.map((proveedor) => (
          <div
            key={proveedor.id}
            className="bg-white rounded-lg shadow-md border-2 border-gray-200 overflow-hidden hover:shadow-lg hover:border-[var(--brand-secondary)] transition-all"
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-slate-900">{proveedor.nombre}</h2>
                    {proveedor.calificacion < 7 && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 rounded-full">
                        <AlertTriangle size={14} />
                        <span className="text-xs font-semibold">Alerta</span>
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">NIT: {proveedor.nit}</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                      {proveedor.categoria}
                    </span>
                    <span className="text-sm text-gray-600">{proveedor.ciudad}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Star className="text-yellow-500" size={24} fill="currentColor" />
                  <div>
                    <p className="text-sm text-gray-600">Calificación</p>
                    <p
                      className={`text-2xl font-bold ${
                        proveedor.calificacion >= 8
                          ? 'text-green-700'
                          : proveedor.calificacion >= 7
                          ? 'text-yellow-700'
                          : 'text-red-700'
                      }`}
                    >
                      {proveedor.calificacion}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 pb-4 border-b border-gray-200">
                <div>
                  <p className="text-xs text-gray-600 mb-1">Contratos Activos</p>
                  <p className="font-semibold text-gray-900">{proveedor.contratosActivos}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Valor Total</p>
                  <p className="font-semibold text-gray-900">{proveedor.valorTotal}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Teléfono</p>
                  <p className="font-semibold text-gray-900">{proveedor.telefono}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 mb-1">Email</p>
                  <p className="font-semibold text-gray-900 text-sm truncate">{proveedor.email}</p>
                </div>
              </div>

              {proveedor.calificacion < 7 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="text-red-600 mt-0.5" size={18} />
                    <div>
                      <p className="text-sm font-semibold text-red-900">
                        Desempeño por debajo del estándar
                      </p>
                      <p className="text-xs text-red-700 mt-1">
                        Este proveedor tiene una calificación inferior a 7.0. Se recomienda evaluación
                        detallada antes de nueva contratación.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Mensaje si no hay resultados */}
      {proveedoresFiltrados.length === 0 && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
          <Users className="mx-auto text-gray-400 mb-3" size={48} />
          <p className="text-gray-600">No se encontraron proveedores con los criterios de búsqueda</p>
        </div>
      )}
    </div>
  );
}
