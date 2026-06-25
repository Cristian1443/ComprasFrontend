/** Pasos obligatorios para solicitudes Directa, Invitación o TDR en Jurídica. */
export type PasoFlujoJuridico =
  | 'revision_inicial'
  | 'invitacion'
  | 'calificacion'
  | 'adjudicacion'
  | 'documentos_finales';

export const ORDEN_PASOS_FLUJO: PasoFlujoJuridico[] = [
  'revision_inicial',
  'invitacion',
  'calificacion',
  'adjudicacion',
  'documentos_finales',
];

export const PASO_META: Record<PasoFlujoJuridico, { numero: number; titulo: string; descripcion: string }> = {
  revision_inicial: {
    numero: 1,
    titulo: 'Revisión inicial',
    descripcion: 'Revisar toda la solicitud y su documentación.',
  },
  invitacion: {
    numero: 2,
    titulo: 'Invitación',
    descripcion: 'Crear y enviar la invitación a proponentes.',
  },
  calificacion: {
    numero: 3,
    titulo: 'Calificación',
    descripcion: 'Calificar a los proponentes una vez enviada la invitación.',
  },
  adjudicacion: {
    numero: 4,
    titulo: 'Adjudicación',
    descripcion: 'Elaborar el acta de adjudicación.',
  },
  documentos_finales: {
    numero: 5,
    titulo: 'Cargue de documentos finales',
    descripcion: 'Contrato u orden de compra, y acta de supervisión.',
  },
};

export type TipoDocumentoFinal = 'contrato_orden_compra' | 'acta_supervision';

export interface EstadoFlujoJuridica {
  revisionInicialCompletada: boolean;
  invitacionesEnviadas: boolean;
  calificacionGuardada: boolean;
  actaAdjudicacionGenerada: boolean;
  tieneContratoOrdenCompra: boolean;
  tieneActaSupervision: boolean;
}

export function requiereFlujoSecuencial(modalidad: string | null | undefined): boolean {
  const m = String(modalidad || '').toLowerCase();
  return m === 'tdr' || m === 'invitacion';
}

export function pasoCompletado(paso: PasoFlujoJuridico, estado: EstadoFlujoJuridica): boolean {
  switch (paso) {
    case 'revision_inicial':
      return estado.revisionInicialCompletada;
    case 'invitacion':
      return estado.invitacionesEnviadas;
    case 'calificacion':
      return estado.calificacionGuardada;
    case 'adjudicacion':
      return estado.actaAdjudicacionGenerada;
    case 'documentos_finales':
      return estado.tieneContratoOrdenCompra && estado.tieneActaSupervision;
    default:
      return false;
  }
}

export function pasoAnterior(paso: PasoFlujoJuridico): PasoFlujoJuridico | null {
  const idx = ORDEN_PASOS_FLUJO.indexOf(paso);
  return idx > 0 ? ORDEN_PASOS_FLUJO[idx - 1] : null;
}

export function pasoAccesible(paso: PasoFlujoJuridico, estado: EstadoFlujoJuridica): boolean {
  const prev = pasoAnterior(paso);
  if (!prev) return true;
  return pasoCompletado(prev, estado);
}

export function mensajeBloqueoPaso(paso: PasoFlujoJuridico, estado: EstadoFlujoJuridica): string | null {
  if (pasoAccesible(paso, estado)) return null;
  const prev = pasoAnterior(paso);
  if (!prev) return null;
  return `Complete primero el paso ${PASO_META[prev].numero}: ${PASO_META[prev].titulo}.`;
}

export function flujoCompleto(estado: EstadoFlujoJuridica): boolean {
  return ORDEN_PASOS_FLUJO.every((p) => pasoCompletado(p, estado));
}

export function pasoActual(estado: EstadoFlujoJuridica): PasoFlujoJuridico | null {
  for (const paso of ORDEN_PASOS_FLUJO) {
    if (!pasoCompletado(paso, estado)) return paso;
  }
  return null;
}

export function construirEstadoFlujo(input: {
  evaluacion?: Record<string, any> | null;
  documentos?: Array<{ tipo?: string | null }> | null;
  totalInvitaciones?: number;
  invitacionesEnviadas?: boolean;
}): EstadoFlujoJuridica {
  const ev = input.evaluacion || {};
  const flujo = ev.flujo || {};
  const docs = Array.isArray(input.documentos) ? input.documentos : [];
  const calificaciones = Array.isArray(ev.calificaciones) ? ev.calificaciones : [];

  return {
    revisionInicialCompletada: Boolean(flujo.revision_inicial_completada),
    invitacionesEnviadas: input.invitacionesEnviadas === true,
    calificacionGuardada: calificaciones.length > 0,
    actaAdjudicacionGenerada: Boolean(ev.acta_generada),
    tieneContratoOrdenCompra: docs.some((d) => d.tipo === 'contrato_orden_compra'),
    tieneActaSupervision: docs.some((d) => d.tipo === 'acta_supervision'),
  };
}

export function mensajeFlujoIncompleto(estado: EstadoFlujoJuridica): string {
  const actual = pasoActual(estado);
  if (!actual) return 'Complete todos los pasos del flujo jurídico antes de aprobar.';
  return `Complete el paso ${PASO_META[actual].numero} (${PASO_META[actual].titulo}) antes de aprobar legalmente.`;
}
