import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useState } from 'react';
import { ArrowLeft, Printer, FileStack, ChevronRight } from 'lucide-react';
import { FichaComite } from './DetalleSolicitudComite';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface FichasSeleccionadasComiteProps {
  ids: string[];
  onBack: () => void;
}

export function FichasSeleccionadasComite({ ids, onBack }: FichasSeleccionadasComiteProps) {
  const [detalles, setDetalles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [progreso, setProgreso] = useState(0);

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      try {
        setCargando(true);
        setProgreso(0);
        const results: any[] = [];
        for (let i = 0; i < ids.length; i++) {
          const res = await apiFetch(`${API_URL}/api/solicitudes/${ids[i]}`);
          const data = await res.json();
          results.push(data);
          if (mounted) setProgreso(Math.round(((i + 1) / ids.length) * 100));
        }
        if (mounted) setDetalles(results);
      } catch (e) {
        console.error('Error cargando fichas seleccionadas:', e);
        if (mounted) setDetalles([]);
      } finally {
        if (mounted) setCargando(false);
      }
    };
    cargar();
    return () => { mounted = false; };
  }, [ids]);

  if (cargando) {
    return (
      <div style={s.loadingPage}>
        <div style={s.loadingCard}>
          <div style={s.loadingIconBox}>
            <FileStack size={28} color="#3D2B86" />
          </div>
          <p style={s.loadingTitle}>Cargando fichas seleccionadas</p>
          <p style={s.loadingSubtitle}>Preparando {ids.length} ficha{ids.length > 1 ? 's' : ''} para presentación...</p>
          <div style={s.progBarWrap}>
            <div style={{ ...s.progFill, width: `${progreso}%` }} />
          </div>
          <p style={s.progText}>{progreso}% completado</p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* Header top bar */}
      <div style={s.topBar} className="print:hidden" data-print="hide">
        <div style={s.topBarLeft}>
          <button onClick={onBack} style={s.backBtn}>
            <ArrowLeft size={15} />
            Volver a bandeja
          </button>
          <div style={s.separator} />
          <div style={s.breadcrumb}>
            <FileStack size={14} color="#3D2B86" />
            <span style={s.breadcrumbText}>Fichas en lote</span>
            <ChevronRight size={13} color="#d1d5db" />
            <span style={{ ...s.breadcrumbText, color: '#374151', fontWeight: 700 }}>
              {detalles.length} ficha{detalles.length !== 1 ? 's' : ''} seleccionada{detalles.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        <div style={s.topBarRight}>
          <p style={s.topInfo}>
            Usa el botón de impresión para generar un PDF con todas las fichas.
          </p>
          <button
            onClick={() => {
              document.body.classList.add('is-printing-ficha');
              const limpiar = () => {
                document.body.classList.remove('is-printing-ficha');
                window.removeEventListener('afterprint', limpiar);
              };
              window.addEventListener('afterprint', limpiar);
              setTimeout(() => {
                window.print();
                setTimeout(
                  () => document.body.classList.remove('is-printing-ficha'),
                  500
                );
              }, 30);
            }}
            style={s.printBtn}
            id="btn-imprimir-lote"
            data-print="hide"
          >
            <Printer size={15} />
            Imprimir todas ({detalles.length})
          </button>
        </div>
      </div>

      {/* Contenido */}
      <div style={s.content}>
        <div style={s.inner}>
          {/* Índice / resumen */}
          <div style={s.indice} className="print:hidden" data-print="hide">
            <p style={s.indiceTitle}>Índice de fichas</p>
            <div style={s.indiceList}>
              {detalles.map((d, i) => (
                <div key={d.id || i} style={s.indiceItem}>
                  <span style={s.indiceNum}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={s.indiceCodigo}>{d.codigo}</p>
                    <p style={s.indiceObjeto}>{d.objeto?.slice(0, 60)}{(d.objeto?.length > 60) ? '...' : ''}</p>
                  </div>
                  <a href={`#ficha-${d.id || i}`} style={s.indiceLink}>Ver ↓</a>
                </div>
              ))}
            </div>
          </div>

          {/* Fichas */}
          {detalles.map((detalle, idx) => (
            <div
              key={detalle.id || idx}
              id={`ficha-${detalle.id || idx}`}
              style={{ ...s.fichaWrap, pageBreakAfter: idx < detalles.length - 1 ? 'always' : 'auto' }}
            >
              <div style={s.fichaIndex} className="print:hidden" data-print="hide">
                <span style={s.fichaIndexNum}>{idx + 1}</span>
                <span style={s.fichaIndexText}>Ficha de comité</span>
              </div>
              <FichaComite solicitud={detalle} showToolbar={false} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  // Loading
  loadingPage: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '100vh', background: '#F1F5F9',
    fontFamily: "'Gabarito', sans-serif",
  },
  loadingCard: {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    gap: 16, padding: '48px 56px',
    background: '#ffffff', borderRadius: 20,
    border: '1.5px solid #e5e7eb',
    boxShadow: '0 12px 40px rgba(0,0,0,0.08)',
    maxWidth: 400, width: '100%',
  },
  loadingIconBox: {
    width: 64, height: 64, borderRadius: 16,
    background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 4px 16px rgba(61,43,134,0.15)',
  },
  loadingTitle: { fontSize: 18, fontWeight: 900, color: '#111827', margin: 0, textAlign: 'center' },
  loadingSubtitle: { fontSize: 13, color: '#6b7280', margin: 0, textAlign: 'center', fontWeight: 500 },
  progBarWrap: {
    width: '100%', height: 8, background: '#f3f4f6',
    borderRadius: 99, overflow: 'hidden', marginTop: 4,
  },
  progFill: {
    height: '100%', borderRadius: 99,
    background: 'linear-gradient(90deg, #3D2B86, #E84922)',
    transition: 'width 0.3s ease',
  },
  progText: { fontSize: 12, color: '#9ca3af', margin: 0, fontWeight: 600 },
  // Page
  page: {
    display: 'flex', flexDirection: 'column' as const,
    minHeight: '100vh', background: '#F1F5F9',
    fontFamily: "'Gabarito', sans-serif",
  },
  topBar: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 32px',
    background: '#ffffff',
    borderBottom: '1.5px solid #e5e7eb',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    position: 'sticky' as const,
    top: 0,
    zIndex: 20,
    gap: 20,
    flexWrap: 'wrap' as const,
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 16 },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 16 },
  backBtn: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 14px', borderRadius: 10,
    background: '#f8fafc', border: '1.5px solid #e5e7eb',
    color: '#374151', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Gabarito', sans-serif",
    transition: 'all 0.2s',
  },
  separator: { width: 1, height: 24, background: '#e5e7eb' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 8 },
  breadcrumbText: { fontSize: 13, color: '#9ca3af', fontWeight: 600 },
  topInfo: { fontSize: 12, color: '#9ca3af', fontWeight: 500, margin: 0, maxWidth: 280 },
  printBtn: {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '10px 20px', borderRadius: 10,
    background: 'linear-gradient(135deg, #10B981, #059669)',
    color: '#ffffff', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', border: 'none',
    fontFamily: "'Gabarito', sans-serif",
    boxShadow: '0 4px 14px rgba(16,185,129,0.3)',
    whiteSpace: 'nowrap' as const,
  },
  content: { flex: 1, padding: '32px 0 48px' },
  inner: { maxWidth: 900, margin: '0 auto', padding: '0 32px', display: 'flex', flexDirection: 'column' as const, gap: 28 },
  // Índice
  indice: {
    background: '#ffffff', borderRadius: 14,
    border: '1.5px solid #e5e7eb',
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
  },
  indiceTitle: {
    fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.8)',
    textTransform: 'uppercase', letterSpacing: '0.12em',
    margin: 0, padding: '12px 20px',
    background: 'linear-gradient(135deg, #1e1040, #3D2B86)',
  },
  indiceList: { padding: '8px 0' },
  indiceItem: {
    display: 'flex', alignItems: 'center', gap: 14,
    padding: '10px 20px', borderBottom: '1px solid #f9fafb',
  },
  indiceNum: {
    width: 24, height: 24, borderRadius: '50%',
    background: '#ede9fe', color: '#5b21b6',
    fontSize: 11, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  indiceCodigo: { fontSize: 11, fontWeight: 900, color: '#3D2B86', margin: 0 },
  indiceObjeto: { fontSize: 11, color: '#6b7280', margin: '2px 0 0', fontWeight: 500 },
  indiceLink: {
    fontSize: 11, color: '#E84922', fontWeight: 700,
    textDecoration: 'none', flexShrink: 0,
  },
  // Fichas
  fichaWrap: {},
  fichaIndex: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 4px 12px',
  },
  fichaIndexNum: {
    width: 28, height: 28, borderRadius: '50%',
    background: 'linear-gradient(135deg, #E84922, #c73d1c)',
    color: '#fff', fontSize: 13, fontWeight: 900,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, boxShadow: '0 3px 8px rgba(232,73,34,0.35)',
  },
  fichaIndexText: {
    fontSize: 11, fontWeight: 800, color: '#6b7280',
    textTransform: 'uppercase', letterSpacing: '0.08em',
  },
};
