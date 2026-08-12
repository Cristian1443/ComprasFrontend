/* ─── Garantías (amparos) — Manual de Procedimientos de Compras y Contratación, num. 6.1.1 ───
   El campo "garantias" de la solicitud sigue siendo una sola columna de texto en la BD: los
   amparos marcados se serializan en un encabezado [GARANTIAS:clave1,clave2] seguido de los
   detalles adicionales en texto libre, así el backend no necesita cambios. Un valor previo
   escrito completamente a mano (sin el encabezado) se conserva íntegro como "detalles
   adicionales", sin perder nada. */

export const GARANTIA_TAG_PREFIX = '[GARANTIAS:';

export const AMPAROS_GARANTIA: { key: string; label: string; hint: string }[] = [
  {
    key: 'pago_anticipado', label: 'Pago anticipado',
    hint: 'Exigible siempre que se haya pactado pago anticipado. Garantía del 100% del valor entregado (incluido IVA); vigencia mínima: Contrato + 4 meses adicionales.',
  },
  {
    key: 'cumplimiento', label: 'Cumplimiento del contrato',
    hint: 'Garantía mínima del 10% del valor total del contrato (incluido IVA); vigencia mínima: Contrato + 2 meses adicionales.',
  },
  {
    key: 'calidad', label: 'Calidad del bien o del servicio',
    hint: 'Garantía mínima del 10% del valor total del contrato (incluido IVA); vigencia mínima: Contrato + 2 meses adicionales.',
  },
  {
    key: 'salarios', label: 'Pago de salarios y prestaciones sociales',
    hint: 'Garantía mínima del 5% del valor total del contrato (incluido IVA); vigencia mínima: Contrato + 3 años adicionales.',
  },
  {
    key: 'estabilidad_obra', label: 'Estabilidad de la obra',
    hint: 'Obligatoria cuando se contrate la ejecución de una obra civil. Cuantía mínima del 20% del valor de la obra; vigencia mínima: 5 años a partir de la entrega.',
  },
  {
    key: 'rc_extracontractual', label: 'Responsabilidad civil extracontractual y daños a terceros',
    hint: 'Exigible en contratos de obra o cuando la actividad del contratista pueda causar daño a terceros. Cuantía mínima del 20% del valor total (incluido IVA); vigencia mínima: Contrato + 4 meses adicionales.',
  },
];

export function serializarGarantias(seleccionadas: string[], detalles: string): string {
  const encabezado = `${GARANTIA_TAG_PREFIX}${seleccionadas.join(',')}]`;
  return detalles.trim() ? `${encabezado}\n${detalles.trim()}` : encabezado;
}

export function parsearGarantias(valor: string | null | undefined): { seleccionadas: string[]; detalles: string } {
  const texto = valor || '';
  if (texto.startsWith(GARANTIA_TAG_PREFIX)) {
    const fin = texto.indexOf(']');
    const claves = texto.slice(GARANTIA_TAG_PREFIX.length, fin).split(',').map(s => s.trim()).filter(Boolean);
    const resto = texto.slice(fin + 1).replace(/^\n/, '');
    return { seleccionadas: claves, detalles: resto };
  }
  // Texto libre escrito antes de este cambio: se conserva como "detalles adicionales".
  return { seleccionadas: [], detalles: texto };
}

/** Convierte el valor guardado (con o sin el encabezado [GARANTIAS:...]) en texto legible
 *  para vistas de solo lectura (detalle, PDF, comité). */
export function formatearGarantiasLegible(valor: string | null | undefined): string {
  const { seleccionadas, detalles } = parsearGarantias(valor);
  const etiquetas = seleccionadas
    .map(key => AMPAROS_GARANTIA.find(a => a.key === key)?.label)
    .filter(Boolean) as string[];
  const partes: string[] = [];
  if (etiquetas.length) partes.push(etiquetas.join('; ') + '.');
  if (detalles.trim()) partes.push(detalles.trim());
  return partes.join(' ');
}
