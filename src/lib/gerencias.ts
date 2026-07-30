/** Mapa de siglas de gerencia (tal como vienen del campo "department" de Office 365/Graph, o del
 *  código registrado en la tabla `gerencias`) a su nombre completo. Debe mantenerse sincronizado
 *  con las gerencias sembradas en la base de datos (ver 05_seed_data.sql). */
const NOMBRES_GERENCIA: Record<string, string> = {
  DE: 'Dirección Ejecutiva',
  GPI: 'Gerencia de Promoción de Inversión',
  GMC: 'Gerencia de Mercadeo y Comunicaciones',
  GAF: 'Gerencia Administrativa y Financiera',
  GAE: 'Gerencia de Apoyo Estratégico',
  GBC: 'Gerencia Bureau de Convenciones',
  GJU: 'Gerencia Jurídica',
};

/** Devuelve el nombre completo de la gerencia si la sigla es conocida; si no, devuelve el valor original. */
export function nombreGerenciaCompleto(valor: string | null | undefined): string {
  const sigla = String(valor || '').trim().toUpperCase();
  if (!sigla) return '';
  return NOMBRES_GERENCIA[sigla] || String(valor).trim();
}
