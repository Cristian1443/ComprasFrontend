import React from 'react';
import { CheckCircle2, Circle, Lock, Loader2 } from 'lucide-react';
import {
  ORDEN_PASOS_FLUJO,
  PASO_META,
  PasoFlujoJuridico,
  EstadoFlujoJuridica,
  pasoCompletado,
  pasoAccesible,
  mensajeBloqueoPaso,
  pasoActual,
} from '../../lib/flujoJuridico';

interface PasosFlujoJuridicaProps {
  estado: EstadoFlujoJuridica;
  procesandoRevision?: boolean;
  onConfirmarRevision?: () => void;
  onInvitacion?: () => void;
  onCalificacion?: () => void;
  onAdjudicacion?: () => void;
  onDocumentos?: () => void;
}

export function PasosFlujoJuridica({
  estado,
  procesandoRevision = false,
  onConfirmarRevision,
  onInvitacion,
  onCalificacion,
  onAdjudicacion,
  onDocumentos,
}: PasosFlujoJuridicaProps) {
  const actual = pasoActual(estado);

  const accionPaso = (paso: PasoFlujoJuridico) => {
    if (!pasoAccesible(paso, estado)) return null;

    const done = pasoCompletado(paso, estado);
    const esActual = actual === paso;

    // Estilo del botón según estado
    const btnVer = 'mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50';

    switch (paso) {
      case 'revision_inicial':
        if (done) return null; // No hay vista de revisión inicial
        return (
          <button
            type="button"
            onClick={onConfirmarRevision}
            disabled={procesandoRevision}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-60"
            style={{ backgroundColor: '#2f6fa3', fontFamily: 'Gabarito, sans-serif' }}
          >
            {procesandoRevision ? <Loader2 size={13} className="animate-spin" /> : null}
            Confirmar revisión inicial
          </button>
        );
      case 'invitacion':
        return (
          <button
            type="button"
            onClick={onInvitacion}
            className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold ${done ? btnVer : 'text-white'}`}
            style={done ? { fontFamily: 'Gabarito, sans-serif' } : { backgroundColor: '#E84922', fontFamily: 'Gabarito, sans-serif' }}
          >
            {done ? 'Ver invitación' : 'Crear / enviar invitación'}
          </button>
        );
      case 'calificacion':
        return (
          <button
            type="button"
            onClick={onCalificacion}
            className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold ${done ? btnVer : 'text-white'}`}
            style={done ? { fontFamily: 'Gabarito, sans-serif' } : { backgroundColor: '#2f6fa3', fontFamily: 'Gabarito, sans-serif' }}
          >
            {done ? 'Ver calificación' : 'Calificar proponentes'}
          </button>
        );
      case 'adjudicacion':
        return (
          <button
            type="button"
            onClick={onAdjudicacion}
            className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold ${done ? btnVer : 'text-white'}`}
            style={done ? { fontFamily: 'Gabarito, sans-serif' } : { backgroundColor: '#10B981', fontFamily: 'Gabarito, sans-serif' }}
          >
            {done ? 'Ver acta de adjudicación' : 'Elaborar acta de adjudicación'}
          </button>
        );
      case 'documentos_finales':
        return (
          <button
            type="button"
            onClick={onDocumentos}
            className={`mt-2 w-full px-3 py-2 rounded-lg text-xs font-bold ${done ? btnVer : 'text-white'}`}
            style={done ? { fontFamily: 'Gabarito, sans-serif' } : { backgroundColor: '#6366F1', fontFamily: 'Gabarito, sans-serif' }}
          >
            {done ? 'Ver documentos finales' : 'Cargar documentos finales'}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <div className="border-t border-slate-100 pt-3 space-y-3">
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          Flujo de trabajo
        </p>
        <p className="text-[11px] text-slate-500 leading-relaxed" style={{ fontFamily: 'Gabarito, sans-serif' }}>
          Complete cada paso en orden. No podrá avanzar al siguiente hasta finalizar el anterior.
        </p>
      </div>

      {ORDEN_PASOS_FLUJO.map((paso) => {
        const meta = PASO_META[paso];
        const done = pasoCompletado(paso, estado);
        const accesible = pasoAccesible(paso, estado);
        const esActual = actual === paso;
        const bloqueo = !accesible ? mensajeBloqueoPaso(paso, estado) : null;

        let detalleExtra: React.ReactNode = null;
        if (paso === 'documentos_finales') {
          detalleExtra = (
            <div className="mt-1.5 space-y-0.5 text-[10px] text-slate-500">
              <p className={estado.tieneContratoOrdenCompra ? 'text-emerald-600 font-semibold' : ''}>
                {estado.tieneContratoOrdenCompra ? '✓' : '○'} Contrato u orden de compra
              </p>
              <p className={estado.tieneActaSupervision ? 'text-emerald-600 font-semibold' : ''}>
                {estado.tieneActaSupervision ? '✓' : '○'} Acta de supervisión
              </p>
            </div>
          );
        }

        return (
          <div
            key={paso}
            className={`rounded-lg border p-3 transition-colors ${
              done
                ? 'border-emerald-200 bg-emerald-50/60'
                : esActual
                ? 'border-blue-200 bg-blue-50/50'
                : accesible
                ? 'border-slate-200 bg-white'
                : 'border-slate-100 bg-slate-50/80 opacity-80'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex-shrink-0">
                {done ? (
                  <CheckCircle2 size={16} className="text-emerald-500" />
                ) : !accesible ? (
                  <Lock size={15} className="text-slate-400" />
                ) : (
                  <Circle size={16} className={esActual ? 'text-blue-500' : 'text-slate-300'} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-slate-800" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                  {meta.numero}. {meta.titulo}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{meta.descripcion}</p>
                {detalleExtra}
                {bloqueo && !done && (
                  <p className="text-[10px] text-amber-700 font-medium mt-1.5">{bloqueo}</p>
                )}
                {accionPaso(paso)}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default PasosFlujoJuridica;
