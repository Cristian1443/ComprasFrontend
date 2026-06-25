import React from 'react';
import { Book, Video, MessageCircle, Mail, Phone } from 'lucide-react';

export function Ayuda() {
  const recursosAyuda = [
    {
      titulo: 'Guía de Usuario',
      descripcion: 'Manual completo sobre cómo usar la aplicación de Compras y Contratación',
      icono: Book,
      color: 'bg-blue-100 text-blue-700',
      enlace: '#',
    },
    {
      titulo: 'Tutoriales en Video',
      descripcion: 'Videos paso a paso para crear y gestionar solicitudes',
      icono: Video,
      color: 'bg-slate-100 text-slate-700',
      enlace: '#',
    },
    {
      titulo: 'Preguntas Frecuentes',
      descripcion: 'Respuestas a las dudas más comunes sobre el proceso',
      icono: MessageCircle,
      color: 'bg-red-50 text-red-700',
      enlace: '#',
    },
  ];

  const preguntasFrecuentes = [
    {
      pregunta: '¿Cómo creo una nueva solicitud?',
      respuesta: 'Desde el Dashboard, haz clic en el botón "Nueva Solicitud" y completa el formulario en las tres secciones: Planeación, Cronograma y Documentos.',
    },
    {
      pregunta: '¿Qué modalidades de contratación existen?',
      respuesta: 'Existen tres modalidades: Directa (sin proceso de selección), Invitación (<50 SMLV) y TDR (>50 SMLV con términos de referencia completos).',
    },
    {
      pregunta: '¿Puedo editar una solicitud después de enviarla?',
      respuesta: 'No, una vez enviada la solicitud pasa al Área Jurídica. Si necesitas modificaciones, el área puede solicitar ajustes que te permitirán editar nuevamente.',
    },
    {
      pregunta: '¿Cómo sé el estado de mi solicitud?',
      respuesta: 'Puedes ver el estado actual en "Mis Solicitudes" o en el Dashboard. Recibirás notificaciones por email cuando cambie el estado.',
    },
  ];

  return (
    <div className="p-6 pt-20 lg:p-12 bg-[#F1F5F9] min-h-screen">
      <div className="max-w-[1400px] mx-auto space-y-12">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-md border border-slate-200 shadow-sm">
              <div className="w-2 h-2 rounded-full bg-[#E84922]"></div>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#E84922]">Ecosistema Operativo</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Centro de <span className="text-[#E84922]">Ayuda</span>
            </h1>
            <p className="text-slate-500 font-medium max-w-lg leading-relaxed">
              Recursos y soporte para usar la aplicación corporativa de Compras y Contratación.
            </p>
          </div>
        </div>

        {/* Recursos de Ayuda */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {recursosAyuda.map((recurso, idx) => {
            const Icon = recurso.icono;
            return (
              <a
                key={idx}
                href={recurso.enlace}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-[var(--brand-secondary)]/40 transition-all"
              >
                <div className={`inline-flex p-3 rounded-lg ${recurso.color} mb-4`}>
                  <Icon size={28} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{recurso.titulo}</h3>
                <p className="text-sm text-gray-600">{recurso.descripcion}</p>
              </a>
            );
          })}
        </div>

        {/* Preguntas Frecuentes */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Preguntas Frecuentes</h2>
          <div className="space-y-4">
            {preguntasFrecuentes.map((faq, idx) => (
              <div key={idx} className="border-b border-gray-200 pb-4 last:border-0 last:pb-0">
                <h3 className="font-semibold text-gray-900 mb-2">{faq.pregunta}</h3>
                <p className="text-sm text-gray-700">{faq.respuesta}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Contacto de Soporte */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">¿Necesitas más ayuda?</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Mail className="text-blue-700" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Correo Electrónico</h3>
                <p className="text-sm text-gray-600 mb-2">Envíanos un email con tu consulta</p>
                <a href="mailto:soporte@investinbogota.org" className="text-sm font-semibold hover:underline" style={{ color: 'var(--brand-primary)' }}>
                  soporte@investinbogota.org
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 bg-red-50 rounded-lg">
                <Phone className="text-red-700" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Teléfono</h3>
                <p className="text-sm text-gray-600 mb-2">Llámanos de lunes a viernes 8am-5pm</p>
                <a href="tel:+576013813000" className="text-sm font-semibold hover:underline" style={{ color: 'var(--brand-primary)' }}>
                  +57 (601) 381 3000
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
