/** Mapeo de causales de contratación directa (numeral 5.2.1 del MA-GAF-01). */
const CAUSALES_DIRECTA: Record<string, string> = {
  i: 'I. Cuando no existen otros proveedores para el suministro del bien y/o servicio por ser titular de derechos de propiedad intelectual o por ser proveedor exclusivo en el territorio nacional.',
  ii: 'II. Cuando por razones técnicas sólo se pueda contratar con un proveedor.',
  iii_a: 'III. Cuando se declare desierta la convocatoria para la adquisición del bien y/o servicio por dos (2) veces consecutivas, por falta de proponentes.',
  iv: 'IV. Cuando el suministro de los bienes y servicios, por su especialidad, sólo puede ser ejecutado y/o suministrado por una determinada persona natural o jurídica (Intuito Personae).',
  v: 'V. Cuando se deba asegurar disponibilidad de manera continua en servicios de alojamiento o transporte.',
  vi: 'VI. En los servicios bajo la modalidad de suscripción, afiliación o inscripción a publicaciones físicas o digitales que sean de interés de La Corporación.',
  vii: 'VII. Contratos de arrendamiento de bienes inmuebles.',
  viii: 'VIII. Contratación de productos financieros y seguros.',
  ix: 'IX. Contratación de bienes y servicios relacionados con capacitaciones y Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).',
  x: 'X. Cuando sea requerido por urgencia manifiesta de contar con el bien y/o servicio de manera inmediata.',
};

/** Texto legible de la causal a partir del código corto guardado en `solicitudes.modalidad_seleccion` (ej. "ii"). */
export function getCausalTexto(codigo: any): string {
  if (!codigo) return '';
  const key = String(codigo).toLowerCase().trim();
  return CAUSALES_DIRECTA[key] || String(codigo);
}

/** Texto legible de causal para ficha/acta (código MA-GAF, justificación o modalidad). */
export function getCausalComiteDisplay(solicitud: Record<string, any>): string {
  const modalidad = String(solicitud?.modalidad || '').trim().toLowerCase();
  if (modalidad === 'invitacion') return 'Por invitación';
  if (modalidad === 'tdr') return 'Por términos de referencia';
  const desdeCodigo = getCausalTexto(solicitud?.modalidad_seleccion);
  if (desdeCodigo) return desdeCodigo;
  const justificacion = String(solicitud?.justificacion_cd || '').trim();
  if (justificacion) return justificacion;
  const criterios = String(solicitud?.criterios_contratacion || '').trim();
  if (criterios) return criterios;
  if (modalidad && modalidad !== 'directa') {
    return `Contratación ${solicitud?.modalidad}`;
  }
  return '';
}