import React, { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, FileText, Trash2, Download, Eye } from 'lucide-react';

interface Documento {
  id: number;
  nombre: string;
  tipo: string;
  estado: 'Cargado' | 'Pendiente' | 'Rechazado';
  obligatorio: boolean;
  fechaCarga?: string;
  tamano?: string;
}

export function GestorDocumental() {
  const [documentos, setDocumentos] = useState<Documento[]>([
    {
      id: 1,
      nombre: 'RUT (Registro Único Tributario)',
      tipo: 'RUT',
      estado: 'Cargado',
      obligatorio: true,
      fechaCarga: '10/02/2026',
      tamano: '245 KB',
    },
    {
      id: 2,
      nombre: 'Cámara de Comercio',
      tipo: 'CAMARA',
      estado: 'Cargado',
      obligatorio: true,
      fechaCarga: '10/02/2026',
      tamano: '1.2 MB',
    },
    {
      id: 3,
      nombre: 'Certificado Bancario',
      tipo: 'BANCARIO',
      estado: 'Pendiente',
      obligatorio: true,
    },
    {
      id: 4,
      nombre: 'Estados Financieros',
      tipo: 'FINANCIERO',
      estado: 'Pendiente',
      obligatorio: true,
    },
    {
      id: 5,
      nombre: 'Certificado de Experiencia',
      tipo: 'EXPERIENCIA',
      estado: 'Cargado',
      obligatorio: false,
      fechaCarga: '09/02/2026',
      tamano: '580 KB',
    },
    {
      id: 6,
      nombre: 'Póliza de Responsabilidad',
      tipo: 'POLIZA',
      estado: 'Pendiente',
      obligatorio: false,
    },
  ]);

  const handleFileUpload = (docId: number) => {
    setDocumentos(documentos.map(doc => 
      doc.id === docId 
        ? { ...doc, estado: 'Cargado' as const, fechaCarga: '11/02/2026', tamano: '1.5 MB' }
        : doc
    ));
  };

  const handleFileDelete = (docId: number) => {
    setDocumentos(documentos.map(doc => 
      doc.id === docId 
        ? { ...doc, estado: 'Pendiente' as const, fechaCarga: undefined, tamano: undefined }
        : doc
    ));
  };

  const documentosCargados = documentos.filter(d => d.estado === 'Cargado').length;
  const documentosPendientes = documentos.filter(d => d.estado === 'Pendiente').length;
  const documentosObligatoriosPendientes = documentos.filter(
    d => d.obligatorio && d.estado === 'Pendiente'
  ).length;

  const progreso = Math.round((documentosCargados / documentos.length) * 100);

  return (
    <div className="p-4 lg:p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 mb-2">Gestor Documental</h1>
        <p className="text-slate-500 font-medium">Administra los documentos requeridos para el proceso</p>
      </div>

      {/* Panel de Progreso */}
      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="text-green-700" size={28} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Documentos Cargados</p>
              <p className="text-2xl font-bold text-gray-900">{documentosCargados}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertCircle className="text-yellow-700" size={28} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Documentos Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{documentosPendientes}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-red-100 rounded-lg">
              <FileText className="text-red-700" size={28} />
            </div>
            <div>
              <p className="text-sm text-gray-600">Obligatorios Pendientes</p>
              <p className="text-2xl font-bold text-gray-900">{documentosObligatoriosPendientes}</p>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progreso General</span>
            <span className="text-sm font-semibold text-[var(--brand-secondary)]">{progreso}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-[var(--brand-secondary)] h-3 rounded-full transition-all duration-500"
              style={{ width: `${progreso}%` }}
            />
          </div>
        </div>

        {documentosObligatoriosPendientes > 0 && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-red-600 mt-0.5" size={20} />
              <div>
                <p className="font-semibold text-red-900">Atención Requerida</p>
                <p className="text-sm text-red-700 mt-1">
                  Hay {documentosObligatoriosPendientes} documento(s) obligatorio(s) pendiente(s) de carga.
                  Complete la documentación para continuar con el proceso.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de Documentos */}
      <div className="space-y-4">
        {documentos.map((doc) => (
          <div
            key={doc.id}
            className={`bg-white rounded-lg shadow-md border-2 overflow-hidden transition-all hover:shadow-lg ${
              doc.estado === 'Cargado'
                ? 'border-green-300'
                : doc.obligatorio
                ? 'border-red-300'
                : 'border-gray-200'
            }`}
          >
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <FileText className="text-gray-600" size={24} />
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">{doc.nombre}</h3>
                      {doc.obligatorio && (
                        <span className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded mt-1">
                          OBLIGATORIO
                        </span>
                      )}
                    </div>
                  </div>

                  {doc.estado === 'Cargado' && doc.fechaCarga && (
                    <div className="ml-9 text-sm text-gray-600 space-y-1">
                      <p>Fecha de carga: {doc.fechaCarga}</p>
                      <p>Tamaño: {doc.tamano}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {/* Estado */}
                  <div>
                    {doc.estado === 'Cargado' ? (
                      <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                        <CheckCircle size={20} />
                        Cargado
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-lg font-semibold">
                        <AlertCircle size={20} />
                        Pendiente
                      </div>
                    )}
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    {doc.estado === 'Cargado' ? (
                      <>
                        <button
                        className="p-2 text-[var(--brand-secondary)] hover:bg-blue-50 rounded-lg transition-colors"
                          title="Ver documento"
                        >
                          <Eye size={20} />
                        </button>
                        <button
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Descargar"
                        >
                          <Download size={20} />
                        </button>
                        <button
                          onClick={() => handleFileDelete(doc.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={20} />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => handleFileUpload(doc.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--brand-secondary)] text-white rounded-lg hover:bg-[#245782] transition-colors font-medium"
                      >
                        <Upload size={18} />
                        Cargar Archivo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Área de Carga Masiva */}
      <div className="mt-8 bg-white rounded-lg shadow-md border border-gray-200 p-8">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Carga Masiva de Documentos</h2>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-[var(--brand-secondary)] transition-colors">
          <Upload className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Arrastra archivos aquí o haz clic para seleccionar
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Formatos permitidos: PDF, Word, Excel. Tamaño máximo: 10MB por archivo
          </p>
          <button className="px-6 py-3 bg-[var(--brand-secondary)] text-white rounded-lg hover:bg-[#245782] transition-colors font-medium">
            Seleccionar Archivos
          </button>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Requisitos de los Documentos</h3>
        <ul className="space-y-2 text-sm text-blue-800">
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <span>El RUT debe tener vigencia no mayor a 30 días</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <span>La Cámara de Comercio debe estar vigente (expedición máximo 30 días)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <span>Los certificados bancarios deben tener fecha de expedición reciente (máximo 60 días)</span>
          </li>
          <li className="flex items-start gap-2">
            <CheckCircle className="text-blue-600 mt-0.5 flex-shrink-0" size={16} />
            <span>Todos los documentos deben estar en formato PDF y ser legibles</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
