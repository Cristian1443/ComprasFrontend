import React from 'react';

const rowStyle: React.CSSProperties = {
  display: 'flex', borderBottom: '1px solid #e5e7eb', alignItems: 'stretch',
};
const labelCellStyle: React.CSSProperties = {
  width: 220, minWidth: 180, flexShrink: 0, padding: '16px',
  fontWeight: 600, fontSize: '0.8rem', color: '#1F2937',
  borderRight: '1px solid #e5e7eb', backgroundColor: '#fafafa',
  fontFamily: 'Gabarito, sans-serif', display: 'flex', alignItems: 'flex-start', paddingTop: 18,
};
const valueCellStyle: React.CSSProperties = {
  flex: 1, padding: '16px',
  fontFamily: 'Gabarito, sans-serif',
  fontSize: '0.875rem', color: '#1F2937', backgroundColor: '#fff',
  minHeight: 52, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
};

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 700,
      fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif',
    }}>
      {title}
    </div>
  );
}

function DataRow({ label, value, hint, last = false }: {
  label: string; value: React.ReactNode; hint?: string; last?: boolean;
}) {
  const showEmpty = value === null || value === undefined || (typeof value === 'string' && !value.trim());
  return (
    <div style={{ ...rowStyle, borderBottom: last ? 'none' : '1px solid #e5e7eb' }}>
      <div style={labelCellStyle}>{label}</div>
      <div style={valueCellStyle}>
        {showEmpty
          ? <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>
          : value}
        {hint && (
          <p style={{ marginTop: 6, fontSize: '0.72rem', color: '#6B7280', fontStyle: 'italic' }}>{hint}</p>
        )}
      </div>
    </div>
  );
}

/* Formatea valor monetario con puntos de miles (es-CO). Acepta texto con/sin puntos. */
const fmtCOP = (v: any): string => {
  if (v === null || v === undefined || v === '') return '';
  const cleaned = String(v).replace(/\./g, '').replace(',', '.');
  const num = Number(cleaned);
  if (isNaN(num) || num === 0) return String(v);
  return `$${num.toLocaleString('es-CO')}`;
};

const FORMAS_PAGO: Record<string, string> = {
  anticipo: 'Anticipo',
  pago_unico: 'Pago único',
  mensual: 'Mensual',
};

const getFormaPagoTexto = (codigo: unknown): string => {
  if (!codigo) return '';
  const key = String(codigo).toLowerCase();
  return FORMAS_PAGO[key] || String(codigo);
};

function ContenidoFormaPago({ s }: { s: Record<string, any> }) {
  const monedaSol = String(s.moneda || 'COP').toUpperCase();
  const formaTexto = getFormaPagoTexto(s.forma_pago);
  const mostrarCOP = monedaSol === 'COP' || monedaSol === 'COMBINADA';
  const mostrarUSD = monedaSol === 'USD' || monedaSol === 'COMBINADA';
  const mostrarEUR = monedaSol === 'EUR' || monedaSol === 'COMBINADA';

  const valorBloques: React.ReactNode[] = [];
  const addValor = (label: string, texto?: string) => {
    if (!String(texto || '').trim()) return;
    const display = fmtCOP(texto) || texto;
    valorBloques.push(
      <div key={label} style={{ marginTop: 14 }}>
        <p style={{
          fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, margin: '0 0 6px',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          {label}
        </p>
        <p style={{ margin: 0, fontWeight: 800, color: '#065F46', fontSize: '1rem' }}>{display}</p>
      </div>
    );
  };

  if (mostrarUSD) addValor('Valor en Dólares (USD)', s.valor_moneda_usd_texto);
  if (mostrarCOP) addValor('Valor en Pesos (COP)', s.valor_moneda_cop_texto);
  if (mostrarEUR) addValor('Valor en Euros (EUR)', s.valor_moneda_eur_texto);

  const vacio = !formaTexto && !String(s.moneda || '').trim() && valorBloques.length === 0;

  if (vacio) {
    return <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>No proporcionado</span>;
  }

  return (
    <>
      {formaTexto && (
        <p style={{ margin: '0 0 16px', fontWeight: 600, color: '#1F2937' }}>{formaTexto}</p>
      )}
      <div>
        <p style={{
          fontSize: '0.72rem', color: '#6B7280', fontWeight: 700, margin: '0 0 8px',
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Moneda de pago
        </p>
        <span style={{
          display: 'inline-flex', alignItems: 'center',
          padding: '4px 12px', borderRadius: 9999,
          backgroundColor: '#ECFDF5', color: '#047857',
          fontWeight: 700, fontSize: '0.78rem', border: '1px solid #A7F3D0',
        }}>
          {monedaSol === 'COMBINADA' ? 'Moneda combinada' : monedaSol}
        </span>
      </div>
      {valorBloques}
    </>
  );
}

/** Misma estructura y numeración que FormularioSolicitud — sección IV/V */
export function SeccionPresupuestoLectura({
  solicitud,
  esDirecta,
  rubroFinanciera,
  presupuestoAprobado,
}: {
  solicitud: Record<string, any>;
  esDirecta: boolean;
  rubroFinanciera?: string;
  presupuestoAprobado?: React.ReactNode;
}) {
  const n1 = esDirecta ? '5.1' : '4.1';
  const n2 = esDirecta ? '5.2' : '4.2';
  const n3 = esDirecta ? '5.3' : '4.3';
  const rubroMostrar = rubroFinanciera || solicitud.rubro_presupuestal || solicitud.rubro;

  /* El presupuesto certificado por Financiera se muestra dentro del propio
     campo 5.1 (no como fila aparte), junto con el análisis del solicitante si existe. */
  const efectoTexto = solicitud.efecto_estimar_presupuesto;
  const valorPresupuesto5_1 = (efectoTexto || presupuestoAprobado)
    ? (
      <>
        {efectoTexto && <p style={{ margin: presupuestoAprobado ? '0 0 10px' : 0 }}>{efectoTexto}</p>}
        {presupuestoAprobado}
      </>
    )
    : undefined;

  return (
    <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
      <SectionHeader title={`${esDirecta ? 'V' : 'IV'}. ANÁLISIS DEL VALOR ESTIMADO DEL CONTRATO, PRESUPUESTO Y FORMA DE PAGO.`} />

      <DataRow
        label={`${n1} Presupuesto para la contratación:`}
        value={valorPresupuesto5_1}
      />

      <DataRow
        label={`${n2} Rubro presupuestal:`}
        value={rubroMostrar}
        hint={
          rubroFinanciera && solicitud.rubro_presupuestal && rubroFinanciera !== solicitud.rubro_presupuestal
            ? `Sugerido por solicitante: ${solicitud.rubro_presupuestal}`
            : undefined
        }
      />

      <div style={{ ...rowStyle, borderBottom: solicitud.forma_pago === 'anticipo' && solicitud.justificacion_anticipo ? '1px solid #e5e7eb' : 'none' }}>
        <div style={labelCellStyle}>{`${n3} Forma de pago:`}</div>
        <div style={valueCellStyle}>
          <ContenidoFormaPago s={solicitud} />
        </div>
      </div>
      {solicitud.forma_pago === 'anticipo' && solicitud.justificacion_anticipo && (
        <div style={{ ...rowStyle, borderBottom: 'none' }}>
          <div style={labelCellStyle}>Justificación del anticipo:</div>
          <div style={{ ...valueCellStyle, backgroundColor: '#fffbeb' }}>
            <p style={{ margin: 0, fontStyle: 'italic', color: '#92400e', fontSize: '0.78rem', marginBottom: 4 }}>
              Justificación requerida para pago de anticipo
            </p>
            {solicitud.justificacion_anticipo}
          </div>
        </div>
      )}
    </div>
  );
}

export { SectionHeader, DataRow, getFormaPagoTexto };
