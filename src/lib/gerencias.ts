/** Mapa de siglas de gerencia (tal como vienen del campo "department" de Office 365/Graph) a su nombre completo. */
const NOMBRES_GERENCIA: Record<string, string> = {
  GAF: 'Gerencia Administrativa y Financiera',
};

/** Devuelve el nombre completo de la gerencia si la sigla es conocida; si no, devuelve el valor original. */
export function nombreGerenciaCompleto(valor: string | null | undefined): string {
  const sigla = String(valor || '').trim().toUpperCase();
  if (!sigla) return '';
  return NOMBRES_GERENCIA[sigla] || String(valor).trim();
}
