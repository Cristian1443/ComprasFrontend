import React, { useState } from 'react';
import { Trophy, AlertTriangle, CheckCircle, Star, TrendingUp } from 'lucide-react';

export function ComparacionProponentes() {
  const [criterios] = useState([
    { id: 1, nombre: 'Experiencia', peso: 30, maxPuntos: 30 },
    { id: 2, nombre: 'Propuesta Técnica', peso: 25, maxPuntos: 25 },
    { id: 3, nombre: 'Propuesta Económica', peso: 25, maxPuntos: 25 },
    { id: 4, nombre: 'Capacidad Financiera', peso: 10, maxPuntos: 10 },
    { id: 5, nombre: 'Tiempo de Entrega', peso: 10, maxPuntos: 10 },
  ]);

  const [proponentes] = useState([
    {
      id: 1,
      nombre: 'Tech Solutions SAS',
      nit: '900.123.456-7',
      puntajes: [28, 22, 20, 9, 8],
      total: 87,
      desempeno: 8.5,
      valorPropuesta: '42.500.000',
      ciudad: 'Bogotá',
    },
    {
      id: 2,
      nombre: 'Innovación Digital LTDA',
      nit: '900.234.567-8',
      puntajes: [25, 20, 23, 8, 9],
      total: 85,
      desempeno: 7.8,
      valorPropuesta: '38.900.000',
      ciudad: 'Medellín',
    },
    {
      id: 3,
      nombre: 'Consultoría Empresarial SA',
      nit: '900.345.678-9',
      puntajes: [22, 18, 22, 7, 7],
      total: 76,
      desempeno: 6.5,
      valorPropuesta: '45.200.000',
      ciudad: 'Cali',
    },
  ]);

  const ganador = proponentes.reduce((prev, current) => 
    prev.total > current.total ? prev : current
  );

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Comparación de Proponentes - RF-08</h1>
        <p className="text-slate-500 font-medium">Evaluación y selección de proveedores</p>
      </div>

      {/* Ganador Destacado */}
      <div className="mb-8 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-green-500 rounded-full">
            <Trophy className="text-white" size={32} />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 mb-2">Proponente Ganador</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-lg font-semibold text-green-900">{ganador.nombre}</p>
                <p className="text-sm text-gray-700">NIT: {ganador.nit}</p>
                <p className="text-sm text-gray-700">Ciudad: {ganador.ciudad}</p>
              </div>
              <div className="flex items-center gap-6">
                <div>
                  <p className="text-sm text-gray-700 mb-1">Puntaje Total</p>
                  <p className="text-4xl font-bold text-green-700">{ganador.total}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-700 mb-1">Valor Propuesta</p>
                  <p className="text-xl font-bold text-slate-900">${ganador.valorPropuesta}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla Comparativa */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 overflow-hidden mb-8">
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <h2 className="text-xl font-bold text-slate-900">Tabla de Evaluación Comparativa</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">
                  Criterio
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                  Peso (%)
                </th>
                {proponentes.map((prop) => (
                  <th key={prop.id} className="px-6 py-4 text-center text-sm font-semibold text-gray-900">
                    {prop.nombre}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {criterios.map((criterio, idx) => (
                <tr key={criterio.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {criterio.nombre}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 text-center">
                    {criterio.peso}%
                  </td>
                  {proponentes.map((prop) => (
                    <td key={prop.id} className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-semibold ${
                        prop.puntajes[idx] >= criterio.maxPuntos * 0.8
                          ? 'bg-green-100 text-green-800'
                          : prop.puntajes[idx] >= criterio.maxPuntos * 0.6
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {prop.puntajes[idx]} / {criterio.maxPuntos}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-blue-50 font-semibold">
                <td className="px-6 py-4 text-sm text-gray-900">
                  TOTAL
                </td>
                <td className="px-6 py-4 text-sm text-gray-700 text-center">
                  100%
                </td>
                {proponentes.map((prop) => (
                  <td key={prop.id} className="px-6 py-4 text-center">
                    <span className="text-lg font-bold text-[var(--brand-secondary)]">
                      {prop.total}
                    </span>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Tarjetas de Proponentes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {proponentes.map((prop) => (
          <div
            key={prop.id}
            className={`bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all hover:shadow-lg ${
              prop.id === ganador.id
                ? 'border-green-500'
                : 'border-gray-200'
            }`}
          >
            {prop.id === ganador.id && (
              <div className="bg-green-500 text-white px-4 py-2 flex items-center gap-2">
                <Trophy size={18} />
                <span className="font-semibold text-sm">GANADOR</span>
              </div>
            )}
            
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{prop.nombre}</h3>
              
              <div className="space-y-3 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">NIT:</span>
                  <span className="font-medium text-gray-900">{prop.nit}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ciudad:</span>
                  <span className="font-medium text-gray-900">{prop.ciudad}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Valor Propuesta:</span>
                  <span className="font-medium text-gray-900">${prop.valorPropuesta}</span>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Puntaje Total</span>
                  <span className="text-2xl font-bold text-[var(--brand-secondary)]">{prop.total}</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Desempeño Histórico</span>
                  <div className="flex items-center gap-1">
                    {prop.desempeno >= 7 ? (
                      <>
                        <CheckCircle className="text-green-600" size={18} />
                        <span className="font-semibold text-green-700">{prop.desempeno}</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="text-red-600" size={18} />
                        <span className="font-semibold text-red-700">{prop.desempeno}</span>
                      </>
                    )}
                  </div>
                </div>

                {prop.desempeno < 7 && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="text-red-600 mt-0.5" size={16} />
                      <p className="text-xs text-red-800">
                        <strong>Alerta:</strong> Desempeño inferior a 7.0
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Resumen y Recomendación */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-blue-100 rounded-lg">
            <TrendingUp className="text-[var(--brand-secondary)]" size={28} />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900 mb-3">Recomendación del Sistema</h2>
            <p className="text-gray-700 mb-4">
              Basado en la evaluación técnica, económica y el desempeño histórico, se recomienda 
              la adjudicación a <strong>{ganador.nombre}</strong> con un puntaje total de{' '}
              <strong>{ganador.total} puntos</strong>.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">Factores Destacados:</h3>
              <ul className="space-y-1 text-sm text-blue-800">
                <li className="flex items-center gap-2">
                  <Star className="text-blue-600" size={16} />
                  Mayor puntaje en evaluación técnica
                </li>
                <li className="flex items-center gap-2">
                  <Star className="text-blue-600" size={16} />
                  Desempeño histórico superior a 8.0
                </li>
                <li className="flex items-center gap-2">
                  <Star className="text-blue-600" size={16} />
                  Experiencia demostrada en proyectos similares
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
