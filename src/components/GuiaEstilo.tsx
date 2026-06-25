import React from 'react';
import { Check, X, AlertTriangle, Info, Eye, Save, Send, Plus, FileText } from 'lucide-react';
import { COLORES, ESTADOS_COLORES } from '../styles/colores-corporativos';

export function GuiaEstilo() {
  return (
    <div className="p-6 lg:p-10" style={{ backgroundColor: COLORES.fondoApp, fontFamily: 'Gabarito, sans-serif' }}>
      <div className="max-w-7xl mx-auto space-y-10">
        
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-black tracking-tight mb-2" style={{ color: COLORES.sidebar }}>
            Guía de Estilo Corporativo
          </h1>
          <p className="text-lg text-slate-500 font-medium">Invest in Bogotá - Sistema de Diseño unificado</p>
        </div>

        {/* Paleta de Colores Principal */}
        <section className="bg-white rounded-xl shadow-sm p-8 border" style={{ borderColor: 'var(--ui-border)' }}>
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            🎨 Paleta de Colores Principal
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Rojo Ladrillo */}
            <div>
              <div 
                className="h-32 rounded-lg mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: COLORES.primario }}
              >
                Principal
              </div>
              <p className="font-semibold text-gray-900">🔴 Rojo Ladrillo</p>
              <p className="text-sm text-gray-600 font-mono">#E84922</p>
              <p className="text-xs text-gray-500 mt-2">Acciones principales, CTAs, navegación activa</p>
            </div>

            {/* Violeta Noche */}
            <div>
              <div 
                className="h-32 rounded-lg mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: COLORES.sidebar }}
              >
                Sidebar
              </div>
              <p className="font-semibold text-gray-900">🔵 Azul Corporativo</p>
              <p className="text-sm text-gray-600 font-mono">{COLORES.sidebar}</p>
              <p className="text-xs text-gray-500 mt-2">Sidebar, navegación, estructura</p>
            </div>

            {/* Azul Cielo */}
            <div>
              <div 
                className="h-32 rounded-lg mb-3 flex items-center justify-center text-white text-2xl font-bold shadow-lg"
                style={{ backgroundColor: COLORES.acento }}
              >
                Acento
              </div>
              <p className="font-semibold text-gray-900">🟠 Acento Institucional</p>
              <p className="text-sm text-gray-600 font-mono">{COLORES.acento}</p>
              <p className="text-xs text-gray-500 mt-2">Resaltes moderados e información secundaria</p>
            </div>
          </div>
        </section>

        {/* Botones */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            🔘 Componentes de Botones
          </h2>
          
          <div className="space-y-6">
            {/* Botones Primarios */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Botones Primarios (Acción Principal)</h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  style={{ backgroundColor: COLORES.primario }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.primarioHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORES.primario}
                >
                  <Plus size={20} />
                  Nueva Solicitud
                </button>
                
                <button 
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  style={{ backgroundColor: COLORES.primario }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.primarioHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORES.primario}
                >
                  <Send size={20} />
                  Enviar Solicitud
                </button>
                
                <button 
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                  style={{ backgroundColor: COLORES.primario }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.primarioHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORES.primario}
                >
                  <Eye size={20} />
                  Ver Detalle
                </button>
              </div>
            </div>

            {/* Botones Secundarios */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Botones Secundarios</h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:shadow-md transition-all font-semibold border-2"
                  style={{ borderColor: COLORES.primario, color: COLORES.primario }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.primarioClaro}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Save size={20} />
                  Guardar Borrador
                </button>
                
                <button 
                  className="flex items-center gap-2 px-6 py-3 rounded-lg hover:bg-gray-100 transition-all font-semibold border-2 border-gray-300 text-gray-700"
                >
                  <X size={20} />
                  Cancelar
                </button>
              </div>
            </div>

            {/* Botones Informativos */}
            <div>
              <h3 className="text-lg font-semibold mb-3 text-gray-700">Botones Informativos</h3>
              <div className="flex flex-wrap gap-4">
                <button 
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-md transition-all font-semibold"
                  style={{ backgroundColor: COLORES.acento }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.acentoHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORES.acento}
                >
                  <Info size={20} />
                  Más Información
                </button>
                
                <button 
                  className="flex items-center gap-2 px-6 py-3 text-white rounded-lg hover:shadow-md transition-all font-semibold"
                  style={{ backgroundColor: COLORES.sidebar }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = COLORES.sidebarHover}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = COLORES.sidebar}
                >
                  <FileText size={20} />
                  Documentos
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Badges de Estados */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            🏷️ Badges de Estados
          </h2>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(ESTADOS_COLORES).map(([estado, colores]) => (
              <div 
                key={estado}
                className="px-4 py-3 rounded-lg border-2 font-semibold text-center"
                style={{ 
                  backgroundColor: colores.bg,
                  color: colores.text,
                  borderColor: colores.border
                }}
              >
                {estado}
              </div>
            ))}
          </div>
        </section>

        {/* Badges Especiales */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            ✨ Badges Especiales
          </h2>
          
          <div className="flex flex-wrap gap-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-full font-semibold border border-green-300">
              <Check size={18} />
              Aprobado
            </span>
            
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold border border-red-300">
              <X size={18} />
              Rechazado
            </span>
            
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-800 rounded-full font-semibold border border-yellow-300">
              <AlertTriangle size={18} />
              Atención
            </span>
            
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 rounded-full font-semibold border border-blue-300">
              <Info size={18} />
              Información
            </span>
            
            <span className="px-4 py-2 bg-red-100 text-red-800 rounded-full font-semibold border border-red-300">
              📋 Solo Lectura
            </span>
          </div>
        </section>

        {/* Inputs y Formularios */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            📝 Campos de Formulario
          </h2>
          
          <div className="space-y-4 max-w-2xl">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campo de Texto (Focus en Rojo)
              </label>
              <input 
                type="text"
                placeholder="Escribe algo..."
                className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none"
                style={{ borderColor: COLORES.gris300 }}
                onFocus={(e) => e.target.style.borderColor = COLORES.primario}
                onBlur={(e) => e.target.style.borderColor = COLORES.gris300}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Campo de Texto Solo Lectura
              </label>
              <input 
                type="text"
                value="Este campo está bloqueado"
                readOnly
                className="w-full px-4 py-3 border-2 rounded-lg"
                style={{ 
                  borderColor: COLORES.gris300,
                  backgroundColor: COLORES.gris100,
                  cursor: 'not-allowed'
                }}
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Área de Texto
              </label>
              <textarea 
                placeholder="Descripción..."
                rows={4}
                className="w-full px-4 py-3 border-2 rounded-lg resize-none focus:outline-none"
                style={{ borderColor: COLORES.gris300 }}
                onFocus={(e) => e.target.style.borderColor = COLORES.primario}
                onBlur={(e) => e.target.style.borderColor = COLORES.gris300}
              />
            </div>
          </div>
        </section>

        {/* Cards */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            📋 Tarjetas (Cards)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-md border-2 p-6" style={{ borderColor: COLORES.primario }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: COLORES.primario }}>
                Tarjeta con Borde Rojo
              </h3>
              <p className="text-gray-600">
                Usada para elementos principales o acciones importantes
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border-l-4 p-6" style={{ borderColor: COLORES.primario }}>
              <h3 className="text-lg font-bold mb-2 text-gray-900">
                Tarjeta con Borde Izquierdo
              </h3>
              <p className="text-gray-600">
                Usada para secciones del formulario F30
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md border-2 border-gray-200 p-6 hover:border-[var(--brand-secondary)] hover:shadow-lg transition-all">
              <h3 className="text-lg font-bold mb-2 text-gray-900">
                Tarjeta Interactiva
              </h3>
              <p className="text-gray-600">
                Con efecto hover para elementos clickeables
              </p>
            </div>
            
            <div className="rounded-lg shadow-md p-6" style={{ backgroundColor: COLORES.primarioClaro }}>
              <h3 className="text-lg font-bold mb-2" style={{ color: COLORES.primarioTexto }}>
                Tarjeta con Fondo Suave
              </h3>
              <p className="text-gray-700">
                Para destacar información importante sin ser intrusivo
              </p>
            </div>
          </div>
        </section>

        {/* Alertas */}
        <section className="bg-white rounded-xl shadow-sm p-8 border border-[var(--ui-border)]">
          <h2 className="text-2xl font-bold mb-6" style={{ color: COLORES.gris900 }}>
            ⚠️ Alertas y Notificaciones
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ 
              backgroundColor: '#D1FAE5',
              borderColor: '#10B981'
            }}>
              <Check className="text-green-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-green-800">Éxito</p>
                <p className="text-green-700">La solicitud se envió correctamente</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ 
              backgroundColor: '#FEE2E2',
              borderColor: '#EF4444'
            }}>
              <X className="text-red-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-700">Hubo un problema al procesar la solicitud</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ 
              backgroundColor: '#FEF3C7',
              borderColor: '#F59E0B'
            }}>
              <AlertTriangle className="text-yellow-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-yellow-800">Advertencia</p>
                <p className="text-yellow-700">Revisa los campos antes de continuar</p>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-l-4 flex items-start gap-3" style={{ 
              backgroundColor: '#DBEAFE',
              borderColor: '#3B82F6'
            }}>
              <Info className="text-blue-600 mt-1" size={20} />
              <div>
                <p className="font-semibold text-blue-800">Información</p>
                <p className="text-blue-700">El área jurídica revisará tu solicitud</p>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm pt-8 border-t border-gray-200">
          <p>Sistema de Diseño Invest in Bogotá - Power Apps</p>
          <p className="mt-1">Versión 1.0 - Febrero 2026</p>
        </div>
      </div>
    </div>
  );
}
