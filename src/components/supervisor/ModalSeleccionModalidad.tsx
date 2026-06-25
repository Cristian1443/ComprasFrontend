import React from 'react';
import { X, FileText, Users, BookOpen, ArrowRight } from 'lucide-react';

interface ModalSeleccionModalidadProps {
    onSeleccionar: (modalidad: 'Directa' | 'Invitación' | 'TDR') => void;
    onCerrar: () => void;
}

const modalidades = [
    {
        id: 'Directa' as const,
        titulo: 'Contratación Directa',
        descripcion: 'Para casos donde existe un único proveedor, urgencia manifiesta u otras causales específicas establecidas en el Manual de Contratación.',
        icon: FileText,
        color: 'var(--brand-primary)',
        bgColor: 'rgba(232, 73, 34, 0.07)',
        borderColor: 'var(--brand-primary)',
        tags: ['1 Proponente', 'Causal específica', 'Comité de Contrataciones'],
    },
    {
        id: 'Invitación' as const,
        titulo: 'Invitación',
        descripcion: 'Proceso de invitación a mínimo 3 proponentes. Aplica para contrataciones menores a 50 SMLV con cronograma definido.',
        icon: Users,
        color: 'var(--brand-secondary)',
        bgColor: 'rgba(51, 132, 214, 0.08)',
        borderColor: 'var(--brand-secondary)',
        tags: ['< 50 SMLV', 'Mín. 3 proponentes', 'Cronograma'],
    },
    {
        id: 'TDR' as const,
        titulo: 'TDR',
        descripcion: 'Proceso con Términos de Referencia completos. Para contrataciones superiores a 50 SMLV que requieren ficha técnica detallada.',
        icon: BookOpen,
        color: 'var(--brand-accent)',
        bgColor: 'rgba(0, 169, 224, 0.07)',
        borderColor: 'var(--brand-accent)',
        tags: ['> 50 SMLV', 'TDR completo', 'Ficha técnica'],
    },
];

export function ModalSeleccionModalidad({ onSeleccionar, onCerrar }: ModalSeleccionModalidadProps) {
    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)' }}
            onClick={(e) => { if (e.target === e.currentTarget) onCerrar(); }}
        >
            <div
                className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden"
                style={{ animation: 'modalEntrada 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
            >
                {/* Header */}
                <div
                    className="px-8 pt-8 pb-6 flex items-start justify-between"
                    style={{ borderBottom: '1px solid #F1F5F9' }}
                >
                    <div>
                        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}>
                            Nueva Solicitud
                        </p>
                        <h2 className="text-2xl font-black text-slate-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                            Selecciona la Modalidad
                        </h2>
                        <p className="text-sm text-slate-500 mt-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                            La modalidad define el proceso de contratación a seguir
                        </p>
                    </div>
                    <button
                        onClick={onCerrar}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-all"
                    >
                        <X size={22} />
                    </button>
                </div>

                {/* Opciones */}
                <div className="p-8 space-y-4">
                    {modalidades.map((m) => {
                        const Icon = m.icon;
                        return (
                            <button
                                key={m.id}
                                onClick={() => onSeleccionar(m.id)}
                                className="w-full text-left rounded-2xl border-2 p-5 transition-all duration-200 group hover:shadow-lg hover:-translate-y-0.5"
                                style={{
                                    borderColor: '#E2E8F0',
                                    fontFamily: 'Gabarito, sans-serif',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = m.borderColor;
                                    e.currentTarget.style.backgroundColor = m.bgColor;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = '#E2E8F0';
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icono */}
                                    <div
                                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:rotate-6"
                                        style={{ backgroundColor: m.bgColor }}
                                    >
                                        <Icon size={24} style={{ color: m.color }} />
                                    </div>

                                    {/* Contenido */}
                                    <div className="flex-1">
                                        <h3 className="font-black text-slate-800 text-lg leading-tight" style={{ color: m.color }}>
                                            {m.titulo}
                                        </h3>
                                        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                                            {m.descripcion}
                                        </p>
                                        <div className="flex flex-wrap gap-2 mt-3">
                                            {m.tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className="px-2.5 py-1 rounded-full text-xs font-bold"
                                                    style={{ backgroundColor: m.bgColor, color: m.color }}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Flecha */}
                                    <ArrowRight
                                        size={20}
                                        className="flex-shrink-0 text-slate-300 group-hover:translate-x-1 transition-all"
                                        style={{ color: m.color, opacity: 0.5 }}
                                    />
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <style>{`
        @keyframes modalEntrada {
          from { transform: scale(0.92) translateY(20px); opacity: 0; }
          to   { transform: scale(1)    translateY(0);    opacity: 1; }
        }
      `}</style>
        </div>
    );
}
