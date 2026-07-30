/** Convierte texto monetario colombiano/internacional a número */
export function parseValorMoneda(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined) return 0;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  const txt = String(raw).trim();
  if (!txt) return 0;

  const limpio = txt.replace(/[^\d.,-]/g, '');
  if (!limpio) return 0;

  const lastComma = limpio.lastIndexOf(',');
  const lastDot = limpio.lastIndexOf('.');
  let normalizado = limpio;

  if (lastComma > -1 && lastDot > -1) {
    normalizado = lastComma > lastDot
      ? limpio.replace(/\./g, '').replace(',', '.')
      : limpio.replace(/,/g, '');
  } else if (lastComma > -1) {
    const despuesComa = limpio.slice(lastComma + 1);
    const esMilesConComa = despuesComa.length === 3 && !limpio.includes('.');
    normalizado = esMilesConComa
      ? limpio.replace(/,/g, '')
      : limpio.replace(/\./g, '').replace(',', '.');
  } else if (lastDot > -1) {
    const partes = limpio.split('.');
    const ultima = partes[partes.length - 1];
    const esSeparadorMiles = partes.length > 2 || (partes.length === 2 && ultima.length === 3);
    normalizado = esSeparadorMiles ? limpio.replace(/\./g, '') : limpio;
  }

  const n = Number(normalizado);
  return Number.isFinite(n) ? n : 0;
}

/** Formatea en vivo mientras el usuario escribe: "3000000" -> "3.000.000" (admite decimales con coma) */
export function formatMilesInput(raw: string): string {
  const limpio = raw.replace(/[^\d,]/g, '');
  const idx = limpio.indexOf(',');
  const entero = idx === -1 ? limpio : limpio.slice(0, idx);
  const decimal = idx === -1 ? '' : limpio.slice(idx + 1).replace(/,/g, '');
  const enteroFormateado = entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return idx === -1 ? enteroFormateado : `${enteroFormateado},${decimal}`;
}

export function getValorMonedaTexto(s: {
  moneda?: string;
  valor_moneda_usd_texto?: string;
  valor_moneda_eur_texto?: string;
  valor_moneda_cop_texto?: string;
}): string {
  const m = String(s.moneda || 'COP').toUpperCase();
  if (m === 'USD') return s.valor_moneda_usd_texto || '';
  if (m === 'EUR') return s.valor_moneda_eur_texto || '';
  return s.valor_moneda_cop_texto || '';
}

const formatterCOP = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

/** Mismo valor que muestra el formulario (texto digitado por moneda) */
export function getPresupuestoDisplayText(s: Record<string, any>): string {
  const monedaSol = String(s.moneda || 'COP').toUpperCase();
  const texto = getValorMonedaTexto(s);
  if (texto) return `${monedaSol} ${texto}`;

  const monto = Number(s.valor_en_cop || s.valor_estimado || 0);
  const currency = monedaSol === 'COMBINADA' ? 'COP' : monedaSol;
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(monto);
  } catch {
    return formatterCOP.format(monto);
  }
}

/** Presupuesto certificado — muestra presupuesto_aprobado si está disponible, si no el valor original */
export function getPresupuestoCertificadoDisplay(s: Record<string, any>): string {
  const aprobado = Number(s.presupuesto_aprobado);
  if (s.presupuesto_aprobado != null && !isNaN(aprobado) && aprobado > 0) {
    return formatterCOP.format(aprobado);
  }
  return getPresupuestoDisplayText(s);
}
