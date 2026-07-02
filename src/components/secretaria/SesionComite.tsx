import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft, ArrowRight, CheckCircle2, XCircle, PauseCircle,
  FileText, Loader2, MessageSquare, Clock, Flag, FileCheck2, Presentation,
  Maximize2, Minimize2, Keyboard, Sparkles, ChevronDown, ChevronUp,
  PanelRightClose, PanelRightOpen
} from 'lucide-react';
import { FichaComite } from './DetalleSolicitudComite';
import { TrazabilidadFlujo } from '../shared/TrazabilidadFlujo';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

export type DecisionComite = 'aprobada' | 'rechazada' | 'en_revision' | null;

export interface DecisionRegistro {
  discusion: string;
  decision: DecisionComite;
}

interface ParticipanteComite {
  nombre: string;
  cargo: string;
  representaA?: string;
}

interface SesionComiteProps {
  ids: string[];
  actaNumero: string;
  participantes: ParticipanteComite[];
  decisionesIniciales: Record<string, DecisionRegistro>;
  onBack: () => void;
  onCerrarComite: (decisiones: Record<string, DecisionRegistro>) => void;
}

const decisionMeta: Record<
  Exclude<DecisionComite, null>,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  aprobada: { label: 'Aprobada', color: '#065F46', bg: '#ECFDF5', border: '#A7F3D0', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', color: '#991B1B', bg: '#FEF2F2', border: '#FECACA', icon: XCircle },
  en_revision: { label: 'En revisión', color: '#92400E', bg: '#FFFBEB', border: '#FDE68A', icon: PauseCircle },
};

export function SesionComite({
  ids,
  actaNumero,
  participantes,
  decisionesIniciales,
  onBack,
  onCerrarComite,
}: SesionComiteProps) {
  const [detalles, setDetalles] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [decisiones, setDecisiones] = useState<Record<string, DecisionRegistro>>({});
  const [modoPresentacion, setModoPresentacion] = useState(false);
  const [autoAvanzar, setAutoAvanzar] = useState<boolean>(true);
  const [mostrarAtajos, setMostrarAtajos] = useState(false);
  const [mostrarDiscusion, setMostrarDiscusion] = useState(false);
  const [panelVisible, setPanelVisible] = useState(true);
  const [feedbackFlash, setFeedbackFlash] = useState<DecisionComite>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const inicial: Record<string, DecisionRegistro> = {};
    ids.forEach((id) => {
      inicial[id] = decisionesIniciales[id] || { discusion: '', decision: null };
    });
    setDecisiones(inicial);
  }, [ids, decisionesIniciales]);

  useEffect(() => {
    let mounted = true;
    const cargar = async () => {
      setCargando(true);
      try {
        const results = await Promise.all(
          ids.map(async (id) => {
            try {
              const res = await fetch(`${API_URL}/api/solicitudes/${id}`);
              if (!res.ok) return { id };
              return await res.json();
            } catch {
              return { id };
            }
          })
        );
        if (mounted) setDetalles(results);
      } finally {
        if (mounted) setCargando(false);
      }
    };
    cargar();
    return () => {
      mounted = false;
    };
  }, [ids]);

  const formatterCOP = useMemo(
    () =>
      new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        maximumFractionDigits: 0,
      }),
    []
  );

  const totales = useMemo(() => {
    const total = ids.length;
    let decididas = 0;
    let aprobadas = 0;
    let rechazadas = 0;
    let revision = 0;
    ids.forEach((id) => {
      const d = decisiones[id]?.decision;
      if (d) {
        decididas += 1;
        if (d === 'aprobada') aprobadas += 1;
        else if (d === 'rechazada') rechazadas += 1;
        else if (d === 'en_revision') revision += 1;
      }
    });
    return { total, decididas, aprobadas, rechazadas, revision, pct: total ? Math.round((decididas / total) * 100) : 0 };
  }, [decisiones, ids]);

  const todasDecididas = ids.length > 0 && ids.every((id) => !!decisiones[id]?.decision);
  const currentId = ids[currentIdx];
  const currentSol = detalles[currentIdx] || {};
  const currentDec = decisiones[currentId] || { discusion: '', decision: null };

  const actualizarDiscusion = (valor: string) => {
    setDecisiones((prev) => ({
      ...prev,
      [currentId]: { ...(prev[currentId] || { discusion: '', decision: null }), discusion: valor },
    }));
  };

  const marcarDecision = (valor: Exclude<DecisionComite, null>) => {
    setDecisiones((prev) => ({
      ...prev,
      [currentId]: { ...(prev[currentId] || { discusion: '', decision: null }), decision: valor },
    }));
    setFeedbackFlash(valor);
    window.setTimeout(() => setFeedbackFlash(null), 700);
    if (autoAvanzar) {
      window.setTimeout(() => {
        irASiguienteSinDecision();
      }, 350);
    }
  };

  const irAnterior = () => setCurrentIdx((i) => Math.max(0, i - 1));
  const irSiguiente = () => setCurrentIdx((i) => Math.min(ids.length - 1, i + 1));

  /** Próxima solicitud sin decisión (avanza inteligentemente). */
  const irASiguienteSinDecision = () => {
    const idxSinDec = ids.findIndex((id, i) => i > currentIdx && !decisiones[id]?.decision);
    if (idxSinDec >= 0) {
      setCurrentIdx(idxSinDec);
      return true;
    }
    const idxSinDecGlobal = ids.findIndex((id) => !decisiones[id]?.decision);
    if (idxSinDecGlobal >= 0 && idxSinDecGlobal !== currentIdx) {
      setCurrentIdx(idxSinDecGlobal);
      return true;
    }
    return false;
  };

  const cerrarComite = () => {
    if (!todasDecididas) {
      alert('Aún hay solicitudes sin decisión registrada.');
      return;
    }
    const pendientesDiscusion = ids.filter((id) => !String(decisiones[id]?.discusion || '').trim());
    if (pendientesDiscusion.length > 0) {
      const ok = window.confirm('Hay solicitudes sin texto de discusión. ¿Deseas cerrar el comité de todas formas?');
      if (!ok) return;
    }
    onCerrarComite(decisiones);
  };

  // Atajos de teclado: ← → para navegar, A/V/R para decidir
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const enInput = target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
      if (enInput) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        irAnterior();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        irSiguiente();
      } else if (e.key.toLowerCase() === 'a') {
        e.preventDefault();
        marcarDecision('aprobada');
      } else if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        marcarDecision('rechazada');
      } else if (e.key.toLowerCase() === 'v') {
        e.preventDefault();
        marcarDecision('en_revision');
      } else if (e.key.toLowerCase() === 'd') {
        e.preventDefault();
        setMostrarDiscusion(true);
        window.setTimeout(() => textareaRef.current?.focus(), 50);
      } else if (e.key === 'Escape' && modoPresentacion) {
        setModoPresentacion(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, ids, decisiones, autoAvanzar, modoPresentacion]);

  const fichaSolicitud = useMemo(() => {
    if (!currentSol) return null;
    const anexos = Array.isArray(currentSol.anexos_solicitante)
      ? currentSol.anexos_solicitante
      : (() => {
          try {
            const parsed = JSON.parse(currentSol.anexos_solicitante || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })();
    return { ...currentSol, anexos_solicitante: anexos };
  }, [currentSol]);

  if (cargando) {
    return (
      <div style={sx.loadingWrap}>
        <Loader2 className="animate-spin" size={36} color="#3D2B86" />
        <p style={sx.loadingText}>Preparando sesión de comité...</p>
      </div>
    );
  }

  return (
    <div style={sx.page}>
      {/* ───── Top bar (compacto) ───── */}
      <div style={sx.topBar}>
        <div style={sx.topBarLeft}>
          <button onClick={onBack} style={sx.btnBack} title="Volver a selección">
            <ArrowLeft size={14} />
          </button>
          <div style={sx.topBarTitleWrap}>
            <p style={sx.topBarEyebrow}>Sesión en curso · Acta {actaNumero}</p>
            <h1 style={sx.topBarTitle}>Comité de Contratación</h1>
          </div>
        </div>

        <div style={sx.topBarCenter}>
          <div style={sx.progressInline}>
            <span style={sx.progressInlineLabel}>Avance</span>
            <div style={sx.progressBar}>
              <div style={{ ...sx.progressFill, width: `${totales.pct}%` }} />
            </div>
            <span style={sx.progressInlinePct}>
              {totales.decididas}/{totales.total}
            </span>
          </div>
          <div style={sx.counterPills}>
            <span style={{ ...sx.counterPill, ...sx.counterPillAprobada }}>
              <CheckCircle2 size={11} /> {totales.aprobadas}
            </span>
            <span style={{ ...sx.counterPill, ...sx.counterPillRevision }}>
              <PauseCircle size={11} /> {totales.revision}
            </span>
            <span style={{ ...sx.counterPill, ...sx.counterPillRechazada }}>
              <XCircle size={11} /> {totales.rechazadas}
            </span>
          </div>
        </div>

        <div style={sx.topBarRight}>
          <button
            type="button"
            onClick={() => setMostrarAtajos((v) => !v)}
            style={sx.btnAtajos}
            title="Atajos de teclado"
          >
            <Keyboard size={13} /> Atajos
          </button>
          <button
            type="button"
            onClick={() => setModoPresentacion((v) => !v)}
            style={sx.btnPresentacion}
            title={modoPresentacion ? 'Salir' : 'Modo presentación'}
          >
            {modoPresentacion ? <Minimize2 size={13} /> : <Presentation size={13} />}
            {modoPresentacion ? 'Salir' : 'Presentar'}
          </button>
          <button
            onClick={cerrarComite}
            disabled={!todasDecididas}
            style={{
              ...sx.btnCerrar,
              ...(todasDecididas ? {} : sx.btnCerrarDisabled),
            }}
          >
            <FileCheck2 size={14} />
            {todasDecididas ? 'Cerrar y generar acta' : `Faltan ${totales.total - totales.decididas}`}
          </button>
        </div>
      </div>

      {mostrarAtajos && (
        <div style={sx.atajosBar}>
          <span style={sx.atajoTag}><kbd style={sx.kbd}>←</kbd> <kbd style={sx.kbd}>→</kbd> Navegar</span>
          <span style={sx.atajoTag}><kbd style={sx.kbd}>A</kbd> Aprobar</span>
          <span style={sx.atajoTag}><kbd style={sx.kbd}>V</kbd> En revisión</span>
          <span style={sx.atajoTag}><kbd style={sx.kbd}>R</kbd> Rechazar</span>
          <span style={sx.atajoTag}><kbd style={sx.kbd}>D</kbd> Discusión</span>
          <button onClick={() => setMostrarAtajos(false)} style={sx.atajoClose}>
            Ocultar
          </button>
        </div>
      )}

      {/* ───── Cuerpo: 2 columnas (lista | ficha + dock) ───── */}
      <div style={sx.body}>
        {/* Columna 1 — Lista de solicitudes */}
        <aside style={sx.sidebar}>
          <div style={sx.sidebarHead}>
            <Flag size={13} color="#6366F1" />
            <span style={sx.sidebarHeadText}>Solicitudes ({ids.length})</span>
          </div>
          <div style={sx.sideList}>
            {ids.map((id, idx) => {
              const sol = detalles[idx] || {};
              const dec = decisiones[id]?.decision || null;
              const isActive = idx === currentIdx;
              const meta = dec ? decisionMeta[dec] : null;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setCurrentIdx(idx)}
                  style={{
                    ...sx.sideItem,
                    borderColor: isActive ? '#3D2B86' : meta ? meta.border : '#e5e7eb',
                    background: isActive ? '#f5f3ff' : '#ffffff',
                    boxShadow: isActive ? '0 2px 8px rgba(61,43,134,0.18)' : 'none',
                  }}
                >
                  <div style={sx.sideItemHead}>
                    <span
                      style={{
                        ...sx.sideItemNum,
                        background: isActive ? '#3D2B86' : meta ? meta.bg : '#eef2ff',
                        color: isActive ? '#fff' : meta ? meta.color : '#4338ca',
                      }}
                    >
                      {meta ? <meta.icon size={11} /> : idx + 1}
                    </span>
                    <span style={sx.sideItemCodigo}>{sol.codigo || 'Solicitud'}</span>
                  </div>
                  <p style={sx.sideItemObjeto}>{sol.titulo_contrato || sol.objeto || 'Sin objeto'}</p>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Columna 2 — Ficha + Decision Dock */}
        <main style={sx.main}>
          {/* Header de la ficha */}
          <div style={sx.fichaHolderBar}>
            <div style={sx.fichaHolderBarLeft}>
              <span style={sx.fichaHolderCodigo}>{currentSol?.codigo || '—'}</span>
              <span style={sx.fichaHolderTitle}>{currentSol?.titulo_contrato || currentSol?.objeto || 'Sin objeto'}</span>
            </div>
            <span style={sx.fichaPos}>
              {currentIdx + 1} / {ids.length}
            </span>
          </div>

          {/* Ficha scrollable — ocupa todo el espacio disponible */}
          {fichaSolicitud ? (
            <div style={sx.fichaScroll}>
              <FichaComite solicitud={fichaSolicitud} showToolbar={false} />
            </div>
          ) : (
            <div style={sx.fichaEmpty}>
              <FileText size={28} color="#cbd5e1" />
              <p style={sx.fichaEmptyText}>No se pudo cargar la ficha técnica de esta solicitud.</p>
            </div>
          )}

          {/* Panel de discusión colapsable (se expande sobre el dock) */}
          {mostrarDiscusion && (
            <div style={sx.dockDiscusion}>
              <div style={sx.dockDiscusionHeader}>
                <label style={sx.dockDiscusionLabel}>
                  <MessageSquare size={13} color="#6366F1" />
                  Discusión
                  <span style={sx.dockDiscusionHint}>(queda en el acta)</span>
                </label>
                <label style={sx.dockAutoAvanzar}>
                  <input
                    type="checkbox"
                    checked={autoAvanzar}
                    onChange={(e) => setAutoAvanzar(e.target.checked)}
                  />
                  <span>Avanzar automáticamente</span>
                </label>
              </div>
              <textarea
                ref={textareaRef}
                value={currentDec.discusion}
                onChange={(e) => actualizarDiscusion(e.target.value)}
                placeholder="Registra lo expuesto y discutido por el comité..."
                style={sx.dockTextarea}
                autoFocus
              />
            </div>
          )}

          {/* ─── Decision Dock (siempre visible) ─── */}
          <div style={sx.dock}>
            {/* Botón discusión con indicador de contenido */}
            <button
              type="button"
              onClick={() => setMostrarDiscusion((v) => !v)}
              style={{
                ...sx.dockToggleBtn,
                background: mostrarDiscusion ? '#eef2ff' : '#f8fafc',
                color: mostrarDiscusion ? '#4338ca' : '#64748b',
                borderColor: mostrarDiscusion ? '#c7d2fe' : '#e2e8f0',
              }}
              title="Registrar discusión (D)"
            >
              <MessageSquare size={14} />
              <span>Discusión</span>
              {currentDec.discusion.trim() && (
                <span style={sx.dockDiscDot} />
              )}
              {mostrarDiscusion ? <ChevronDown size={13} /> : <ChevronUp size={13} />}
            </button>

            <span style={sx.dockDivider} />

            {/* Botones de decisión */}
            <div style={sx.dockDecBtns}>
              {(['aprobada', 'en_revision', 'rechazada'] as const).map((op) => {
                const meta = decisionMeta[op];
                const Icon = meta.icon;
                const selected = currentDec.decision === op;
                const flashing = feedbackFlash === op;
                const tecla = op === 'aprobada' ? 'A' : op === 'en_revision' ? 'V' : 'R';
                return (
                  <button
                    key={op}
                    type="button"
                    onClick={() => marcarDecision(op)}
                    style={{
                      ...sx.dockDecBtn,
                      background: selected ? meta.bg : '#ffffff',
                      color: selected ? meta.color : '#4b5563',
                      borderColor: selected ? meta.border : '#e2e8f0',
                      fontWeight: selected ? 800 : 600,
                      boxShadow: flashing
                        ? `0 0 0 3px ${meta.border}`
                        : selected
                        ? `inset 0 0 0 1px ${meta.border}`
                        : 'none',
                      transform: flashing ? 'scale(1.04)' : 'scale(1)',
                    }}
                    title={`${meta.label} (${tecla})`}
                  >
                    <Icon size={15} />
                    <span>{meta.label}</span>
                    <kbd style={{ ...sx.kbd, opacity: selected ? 1 : 0.45 }}>{tecla}</kbd>
                  </button>
                );
              })}
            </div>

            <span style={sx.dockDivider} />

            {/* Estado actual + navegación */}
            <div style={sx.dockRight}>
              {currentDec.decision ? (
                <span
                  style={{
                    ...sx.dockStatusPill,
                    background: decisionMeta[currentDec.decision].bg,
                    color: decisionMeta[currentDec.decision].color,
                    borderColor: decisionMeta[currentDec.decision].border,
                  }}
                >
                  <CheckCircle2 size={12} />
                  {decisionMeta[currentDec.decision].label}
                </span>
              ) : (
                <span style={sx.dockStatusPending}>
                  <Clock size={12} />
                  Sin decisión
                </span>
              )}
              <button
                onClick={irAnterior}
                disabled={currentIdx === 0}
                style={{ ...sx.dockNavBtn, ...(currentIdx === 0 ? sx.dockNavBtnDisabled : {}) }}
                title="Anterior (←)"
              >
                <ArrowLeft size={14} />
              </button>
              <span style={sx.dockNavCount}>{currentIdx + 1} / {ids.length}</span>
              <button
                onClick={irSiguiente}
                disabled={currentIdx === ids.length - 1}
                style={{ ...sx.dockNavBtn, ...(currentIdx === ids.length - 1 ? sx.dockNavBtnDisabled : {}) }}
                title="Siguiente (→)"
              >
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* Overlay modo presentación */}
      {modoPresentacion && fichaSolicitud && (
        <div style={sx.presentOverlay}>
          {/* Barra superior */}
          <header style={sx.presentBar}>
            <div style={sx.presentBarLeft}>
              <span style={sx.presentBadge}>
                <Presentation size={15} />
                Presentación
              </span>
              <span style={sx.presentDivider} aria-hidden />
              <span style={sx.presentCodigo}>{currentSol?.codigo || '—'}</span>
              <span style={sx.presentObjeto}>
                {currentSol?.titulo_contrato || currentSol?.objeto || ''}
              </span>
            </div>

            <div style={sx.presentNav}>
              <button
                type="button"
                onClick={irAnterior}
                disabled={currentIdx === 0}
                style={{
                  ...sx.btnPresentNav,
                  ...(currentIdx === 0 ? sx.btnPresentNavDisabled : {}),
                }}
              >
                <ArrowLeft size={15} />
                Anterior
              </button>
              <span style={sx.presentCounter}>
                {currentIdx + 1} / {ids.length}
              </span>
              <button
                type="button"
                onClick={irSiguiente}
                disabled={currentIdx === ids.length - 1}
                style={{
                  ...sx.btnPresentNav,
                  ...(currentIdx === ids.length - 1 ? sx.btnPresentNavDisabled : {}),
                }}
              >
                Siguiente
                <ArrowRight size={15} />
              </button>

              <span style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />

              {/* Toggle panel de registro */}
              <button
                type="button"
                onClick={() => setPanelVisible((v) => !v)}
                style={{
                  ...sx.btnPresentNav,
                  background: panelVisible ? 'rgba(255,255,255,0.12)' : 'rgba(99,102,241,0.25)',
                  borderColor: panelVisible ? 'rgba(255,255,255,0.18)' : 'rgba(99,102,241,0.6)',
                  color: panelVisible ? '#cbd5e1' : '#a5b4fc',
                }}
                title={panelVisible ? 'Ocultar panel de registro' : 'Mostrar panel de registro'}
              >
                {panelVisible ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
                {panelVisible ? 'Ocultar panel' : 'Panel'}
              </button>

              <button
                type="button"
                onClick={() => setModoPresentacion(false)}
                style={sx.btnPresentSalir}
              >
                <Minimize2 size={15} />
                Salir
              </button>
            </div>
          </header>

          {/* Cuerpo dividido: ficha (izquierda) + panel decisión (derecha) */}
          <div style={{
            ...sx.presentSplit,
            gridTemplateColumns: panelVisible ? 'minmax(0, 1fr) 320px' : 'minmax(0, 1fr)',
          }}>
            {/* Panel izquierdo — contenido presentado */}
            <div style={sx.presentBody}>
              <div style={sx.presentBodyInner}>
                <FichaComite solicitud={fichaSolicitud} showToolbar={false} />
                <TrazabilidadFlujo
                  solicitud={currentSol}
                  variant="card"
                  titulo="Flujo de aprobación"
                  subtitulo="Estado actual de cada etapa de aprobación de esta solicitud."
                />
              </div>

              {/* Botón flotante para revelar el panel cuando está oculto */}
              {!panelVisible && (
                <button
                  type="button"
                  onClick={() => setPanelVisible(true)}
                  style={sx.presentRevealBtn}
                  title="Mostrar panel de registro"
                >
                  <PanelRightOpen size={16} />
                  <span>Registro</span>
                  {currentDec.decision && (
                    <span style={{
                      ...sx.presentRevealPill,
                      background: decisionMeta[currentDec.decision].bg,
                      color: decisionMeta[currentDec.decision].color,
                      borderColor: decisionMeta[currentDec.decision].border,
                    }}>
                      {decisionMeta[currentDec.decision].label}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* Panel derecho — registro del comité (vista del operador) */}
            {panelVisible && <aside style={sx.presentDecisionPanel}>
              <div style={sx.presentDecisionHead}>
                <Sparkles size={15} color="#fb923c" />
                <span style={sx.presentDecisionTitle}>Registro del Comité</span>
                <span style={sx.presentDecisionHint}>Solo visible para el secretario</span>
              </div>

              <div style={sx.presentDecisionBody}>
                {/* Discusión */}
                <div style={sx.presentPanelBlock}>
                  <label style={sx.presentPanelLabel}>
                    <MessageSquare size={13} color="#94a3b8" />
                    Discusión
                    <span style={sx.presentPanelLabelHint}>(queda en el acta)</span>
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={currentDec.discusion}
                    onChange={(e) => actualizarDiscusion(e.target.value)}
                    placeholder="Registra lo expuesto y discutido por el comité..."
                    style={sx.presentTextarea}
                  />
                </div>

                {/* Decisión */}
                <div style={sx.presentPanelBlock}>
                  <p style={sx.presentPanelLabel}>
                    Decisión del Comité
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 8 }}>
                    {(['aprobada', 'en_revision', 'rechazada'] as const).map((op) => {
                      const meta = decisionMeta[op];
                      const Icon = meta.icon;
                      const selected = currentDec.decision === op;
                      const flashing = feedbackFlash === op;
                      const tecla = op === 'aprobada' ? 'A' : op === 'en_revision' ? 'V' : 'R';
                      return (
                        <button
                          key={op}
                          type="button"
                          onClick={() => marcarDecision(op)}
                          style={{
                            ...sx.presentDecisionBtn,
                            background: selected ? meta.bg : 'rgba(255,255,255,0.05)',
                            color: selected ? meta.color : '#cbd5e1',
                            borderColor: selected ? meta.border : 'rgba(255,255,255,0.12)',
                            boxShadow: flashing
                              ? `0 0 0 3px ${meta.border}`
                              : selected
                              ? `0 2px 12px rgba(0,0,0,0.3)`
                              : 'none',
                            transform: flashing ? 'scale(1.02)' : 'scale(1)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <Icon size={20} />
                            <span style={{ fontSize: 14, fontWeight: selected ? 800 : 700 }}>
                              {meta.label}
                            </span>
                          </div>
                          <kbd style={{
                            ...sx.kbd,
                            background: selected ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.15)',
                            color: selected ? meta.color : '#94a3b8',
                            opacity: 1,
                          }}>
                            {tecla}
                          </kbd>
                        </button>
                      );
                    })}
                  </div>

                  <label style={sx.presentAutoAvanzar}>
                    <input
                      type="checkbox"
                      checked={autoAvanzar}
                      onChange={(e) => setAutoAvanzar(e.target.checked)}
                    />
                    <span>Avanzar automáticamente a la siguiente sin decisión</span>
                  </label>
                </div>

                {/* Estado registrado */}
                {currentDec.decision && (
                  <div style={{
                    ...sx.presentDecisionConfirma,
                    background: decisionMeta[currentDec.decision].bg,
                    borderColor: decisionMeta[currentDec.decision].border,
                  }}>
                    <CheckCircle2 size={16} color={decisionMeta[currentDec.decision].color} />
                    <span style={{ color: decisionMeta[currentDec.decision].color, fontWeight: 700, fontSize: 13 }}>
                      Registrado como{' '}
                      <strong>{decisionMeta[currentDec.decision].label}</strong>
                    </span>
                  </div>
                )}

                {/* Progreso de sesión */}
                <div style={sx.presentProgressBlock}>
                  <div style={sx.presentProgressRow}>
                    <span style={sx.presentProgressLabel}>Avance de sesión</span>
                    <span style={sx.presentProgressVal}>{totales.decididas}/{totales.total}</span>
                  </div>
                  <div style={sx.presentProgressBarWrap}>
                    <div style={{ ...sx.presentProgressFill, width: `${totales.pct}%` }} />
                  </div>
                  <div style={sx.presentProgressPills}>
                    <span style={{ ...sx.presentPill, background: '#ECFDF5', color: '#065F46', border: '1px solid #A7F3D0' }}>
                      <CheckCircle2 size={10} /> {totales.aprobadas}
                    </span>
                    <span style={{ ...sx.presentPill, background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A' }}>
                      <PauseCircle size={10} /> {totales.revision}
                    </span>
                    <span style={{ ...sx.presentPill, background: '#FEF2F2', color: '#991B1B', border: '1px solid #FECACA' }}>
                      <XCircle size={10} /> {totales.rechazadas}
                    </span>
                  </div>
                </div>
              </div>
            </aside>}
          </div>
        </div>
      )}
    </div>
  );
}

const sx: Record<string, React.CSSProperties> = {
  page: {
    height: '100vh',
    background: '#F1F5F9',
    fontFamily: "'Gabarito', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '10px 18px',
    background: '#ffffff',
    borderBottom: '1px solid #e5e7eb',
    flexWrap: 'wrap' as const,
    flexShrink: 0,
  },
  topBarLeft: { display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 },
  btnBack: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8,
    background: '#fff', border: '1px solid #e5e7eb',
    color: '#374151', cursor: 'pointer', fontFamily: "'Gabarito', sans-serif",
    flexShrink: 0,
  },
  topBarTitleWrap: { minWidth: 0 },
  topBarEyebrow: { margin: 0, fontSize: 10, fontWeight: 800, color: '#6366F1', letterSpacing: '0.08em', textTransform: 'uppercase' as const },
  topBarTitle: { margin: '1px 0 0', fontSize: 15, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px' },
  topBarCenter: {
    display: 'flex', alignItems: 'center', gap: 14,
    flex: 1, justifyContent: 'center', minWidth: 0,
    flexWrap: 'wrap' as const,
  },
  topBarRight: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const },

  progressInline: {
    display: 'flex', alignItems: 'center', gap: 10,
    background: '#F8FAFC', border: '1px solid #E2E8F0',
    borderRadius: 999, padding: '6px 14px', minWidth: 260,
  },
  progressInlineLabel: { fontSize: 11, fontWeight: 800, color: '#475569', letterSpacing: '0.06em', textTransform: 'uppercase' as const },
  progressInlinePct: { fontSize: 12, fontWeight: 900, color: '#3D2B86', whiteSpace: 'nowrap' as const },
  progressBar: { flex: 1, height: 6, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', minWidth: 80 },
  progressFill: { height: '100%', background: 'linear-gradient(90deg, #3D2B86, #7c3aed)', transition: 'width 0.3s ease' },

  counterPills: { display: 'flex', alignItems: 'center', gap: 6 },
  counterPill: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '4px 9px', borderRadius: 999,
    border: '1px solid', fontSize: 11, fontWeight: 800,
  },
  counterPillAprobada: { background: '#ECFDF5', color: '#065F46', borderColor: '#A7F3D0' },
  counterPillRevision: { background: '#FFFBEB', color: '#92400E', borderColor: '#FDE68A' },
  counterPillRechazada: { background: '#FEF2F2', color: '#991B1B', borderColor: '#FECACA' },

  btnAtajos: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 11px', borderRadius: 8,
    background: '#ffffff', color: '#475569', border: '1px solid #e5e7eb',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
  },
  btnCerrar: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 13px', borderRadius: 8,
    background: '#10B981', border: '1px solid #10B981',
    color: '#ffffff', fontSize: 12, fontWeight: 800,
    cursor: 'pointer', fontFamily: "'Gabarito', sans-serif",
    boxShadow: '0 2px 8px rgba(16,185,129,0.28)',
    whiteSpace: 'nowrap' as const,
  },
  btnCerrarDisabled: {
    background: '#fee2e2', borderColor: '#fecaca', boxShadow: 'none', cursor: 'not-allowed', color: '#991b1b',
  },

  atajosBar: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 18px', background: '#0F172A', color: '#fff',
    fontSize: 11, flexWrap: 'wrap' as const, flexShrink: 0,
  },
  atajoTag: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    color: '#cbd5e1', fontWeight: 600,
  },
  kbd: {
    display: 'inline-block',
    padding: '2px 7px',
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: 5,
    fontFamily: 'monospace',
    fontSize: 10,
    fontWeight: 800,
    color: '#f1f5f9',
    minWidth: 14,
    textAlign: 'center' as const,
  },
  atajoClose: {
    marginLeft: 'auto',
    background: 'transparent', border: '1px solid #475569',
    color: '#cbd5e1', borderRadius: 6,
    padding: '3px 9px', fontSize: 10, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
  },

  body: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: '220px minmax(0, 1fr)',
    gap: 12,
    padding: 12,
    minHeight: 0,
    overflow: 'hidden',
  },

  sidebar: {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    padding: 10,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
    overflow: 'hidden',
    minHeight: 0,
  },
  sidebarHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 2px 6px',
    borderBottom: '1px solid #f1f5f9',
    flexShrink: 0,
  },
  sidebarHeadText: { fontSize: 10, fontWeight: 800, color: '#374151', letterSpacing: '0.1em', textTransform: 'uppercase' as const },
  sideList: { display: 'flex', flexDirection: 'column' as const, gap: 6, overflowY: 'auto' as const, flex: 1, paddingRight: 2 },
  sideItem: {
    textAlign: 'left' as const,
    border: '1.5px solid',
    borderRadius: 8,
    padding: '8px 10px',
    cursor: 'pointer',
    background: '#ffffff',
    fontFamily: "'Gabarito', sans-serif",
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 5,
    transition: 'all 0.15s',
    flexShrink: 0,
  },
  sideItemHead: { display: 'flex', alignItems: 'center', gap: 8 },
  sideItemNum: {
    width: 22, height: 22, borderRadius: '50%',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 10, fontWeight: 900,
    flexShrink: 0,
  },
  sideItemCodigo: { fontSize: 11, fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em' },
  sideItemObjeto: {
    margin: 0,
    fontSize: 11,
    color: '#475569',
    lineHeight: 1.3,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical' as const,
    overflow: 'hidden',
  },

  main: {
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 0,
    minWidth: 0,
  },
  fichaHolderBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '10px 14px',
    background: '#FFF7ED',
    borderBottom: '1.5px solid #FDBA74',
    flexWrap: 'wrap' as const,
    flexShrink: 0,
  },
  fichaHolderBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1,
  },
  fichaHolderTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: '#9A3412',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  fichaHolderCodigo: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 6,
    background: '#ffffff', color: '#9A3412',
    border: '1px solid #FDBA74',
    fontSize: 11, fontWeight: 800, letterSpacing: '0.03em',
    flexShrink: 0,
  },
  fichaPos: {
    fontSize: 12, fontWeight: 800, color: '#3D2B86',
    padding: '4px 10px', borderRadius: 8,
    background: '#f5f3ff', border: '1px solid #ddd6fe',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  btnPresentacion: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 8,
    background: '#E84922', color: '#ffffff', border: 'none',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    boxShadow: '0 2px 6px rgba(232,73,34,0.25)',
  },
  btnPresentacionExit: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 8,
    background: '#ffffff', color: '#111827', border: '1px solid #e5e7eb',
    fontSize: 11, fontWeight: 800, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
  },
  fichaScroll: {
    flex: 1,
    overflowY: 'auto' as const,
    background: '#F8FAFC',
    minHeight: 0,
  },
  fichaEmpty: {
    flex: 1,
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    gap: 8, padding: 40, background: '#f8fafc',
  },
  fichaEmptyText: { margin: 0, fontSize: 12, color: '#94a3b8', fontWeight: 600 },

  presentOverlay: {
    position: 'fixed' as const,
    inset: 0,
    background: '#0f172a',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  presentBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
    padding: '12px 20px',
    minHeight: 56,
    flexShrink: 0,
    background: '#0f172a',
    color: '#ffffff',
    borderBottom: '1px solid rgba(255,255,255,0.10)',
    boxSizing: 'border-box' as const,
    flexWrap: 'wrap' as const,
  },
  presentBarLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    minWidth: 0,
    flex: '1 1 200px',
    overflow: 'hidden',
  },
  presentBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 7,
    fontSize: 10,
    fontWeight: 800,
    color: '#fb923c',
    letterSpacing: '0.12em',
    textTransform: 'uppercase' as const,
    flexShrink: 0,
    background: 'rgba(251,146,60,0.12)',
    padding: '5px 10px',
    borderRadius: 6,
    border: '1px solid rgba(251,146,60,0.25)',
  },
  presentDivider: {
    width: 1,
    height: 22,
    background: 'rgba(255,255,255,0.15)',
    flexShrink: 0,
  },
  presentCodigo: {
    fontSize: 12,
    fontWeight: 800,
    color: '#f8fafc',
    letterSpacing: '0.04em',
    flexShrink: 0,
    background: 'rgba(255,255,255,0.08)',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid rgba(255,255,255,0.1)',
  },
  presentObjeto: {
    fontSize: 13,
    fontWeight: 600,
    color: '#94a3b8',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
    minWidth: 0,
  },
  presentCounter: {
    fontSize: 12,
    fontWeight: 800,
    color: '#e2e8f0',
    padding: '6px 12px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.08)',
    border: '1px solid rgba(255,255,255,0.12)',
    whiteSpace: 'nowrap' as const,
  },
  presentNav: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  btnPresentNav: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    padding: '0 14px',
    borderRadius: 8,
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.18)',
    color: '#f1f5f9',
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    boxSizing: 'border-box' as const,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    transform: 'none',
    transition: 'background 0.15s',
  },
  btnPresentNavDisabled: {
    opacity: 0.3,
    cursor: 'not-allowed',
  },
  btnPresentSalir: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    padding: '0 16px',
    borderRadius: 8,
    background: '#E84922',
    border: '1px solid #C73D1C',
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 800,
    cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    boxSizing: 'border-box' as const,
    lineHeight: 1,
    whiteSpace: 'nowrap' as const,
    transform: 'none',
    boxShadow: '0 2px 8px rgba(232,73,34,0.4)',
  },

  /* Layout dividido: ficha | panel decisión */
  presentSplit: {
    flex: 1,
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) 340px',
    minHeight: 0,
    overflow: 'hidden',
  },
  presentBody: {
    overflowY: 'auto' as const,
    overflowX: 'hidden' as const,
    background: '#e2e8f0',
    minHeight: 0,
    position: 'relative' as const,
  },
  presentBodyInner: {
    maxWidth: 900,
    margin: '0 auto',
    padding: '24px 28px 36px',
  },

  /* Botón flotante para revelar panel cuando está oculto */
  presentRevealBtn: {
    position: 'fixed' as const,
    right: 0,
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 6,
    padding: '14px 10px',
    background: '#1e293b',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRight: 'none',
    borderRadius: '12px 0 0 12px',
    color: '#94a3b8',
    cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase' as const,
    writingMode: 'vertical-rl' as const,
    textOrientation: 'mixed' as const,
    gap: 8,
    boxShadow: '-4px 0 20px rgba(0,0,0,0.4)',
    zIndex: 10,
    transition: 'background 0.2s',
  },
  presentRevealPill: {
    fontSize: 9,
    fontWeight: 800,
    padding: '3px 7px',
    borderRadius: 999,
    border: '1px solid',
    writingMode: 'horizontal-tb' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap' as const,
  },

  /* Panel derecho de decisión en modo presentación */
  presentDecisionPanel: {
    background: '#1e293b',
    borderLeft: '1px solid rgba(255,255,255,0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
    minHeight: 0,
  },
  presentDecisionHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '14px 16px',
    background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
    flexShrink: 0,
  },
  presentDecisionTitle: {
    fontSize: 11,
    fontWeight: 800,
    color: '#f1f5f9',
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
    flex: 1,
  },
  presentDecisionHint: {
    fontSize: 9,
    fontWeight: 600,
    color: '#475569',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  presentDecisionBody: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: 16,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 16,
    minHeight: 0,
  },
  presentPanelBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  presentPanelLabel: {
    margin: 0,
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 10,
    fontWeight: 800,
    color: '#64748b',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.08em',
  },
  presentPanelLabelHint: {
    fontSize: 9,
    color: '#475569',
    fontWeight: 600,
    textTransform: 'none' as const,
    letterSpacing: 0,
  },
  presentTextarea: {
    width: '100%',
    minHeight: 90,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 10,
    padding: '10px 12px',
    fontSize: 12,
    color: '#e2e8f0',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: "'Gabarito', sans-serif",
    boxSizing: 'border-box' as const,
    lineHeight: 1.5,
    '::placeholder': { color: '#475569' },
  },
  presentDecisionBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '13px 14px',
    borderRadius: 10,
    border: '1.5px solid',
    cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    transition: 'all 0.18s ease',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  presentAutoAvanzar: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    padding: '8px 10px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: 10,
    color: '#64748b',
    fontWeight: 600,
    cursor: 'pointer',
  },
  presentDecisionConfirma: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid',
    fontSize: 12,
    fontWeight: 600,
  },
  presentProgressBlock: {
    marginTop: 'auto' as const,
    background: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.07)',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  presentProgressRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  presentProgressLabel: {
    fontSize: 10,
    fontWeight: 700,
    color: '#475569',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.07em',
  },
  presentProgressVal: {
    fontSize: 12,
    fontWeight: 800,
    color: '#94a3b8',
  },
  presentProgressBarWrap: {
    height: 5,
    background: 'rgba(255,255,255,0.08)',
    borderRadius: 99,
    overflow: 'hidden',
  },
  presentProgressFill: {
    height: '100%',
    background: 'linear-gradient(90deg, #6366f1, #a78bfa)',
    transition: 'width 0.4s ease',
  },
  presentProgressPills: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  presentPill: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '3px 8px',
    borderRadius: 999,
    fontSize: 10,
    fontWeight: 800,
  },

  /* ─── Decision Dock ─── */
  dock: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 14px',
    background: '#ffffff',
    borderTop: '1.5px solid #e5e7eb',
    flexShrink: 0,
    flexWrap: 'wrap' as const,
  },
  dockToggleBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 11px', borderRadius: 8,
    border: '1px solid', cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    fontSize: 12, fontWeight: 700,
    transition: 'all 0.15s',
    flexShrink: 0,
    position: 'relative' as const,
  },
  dockDiscDot: {
    width: 6, height: 6, borderRadius: '50%',
    background: '#6366F1',
    display: 'inline-block',
  },
  dockDivider: {
    width: 1, height: 26,
    background: '#e5e7eb',
    flexShrink: 0,
  },
  dockDecBtns: {
    display: 'flex', alignItems: 'center', gap: 6,
    flex: 1, flexWrap: 'wrap' as const,
  },
  dockDecBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '7px 12px', borderRadius: 8,
    border: '1.5px solid', cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    fontSize: 12,
    transition: 'all 0.16s ease',
    whiteSpace: 'nowrap' as const,
    flexShrink: 0,
  },
  dockRight: {
    display: 'flex', alignItems: 'center', gap: 6,
    marginLeft: 'auto' as const, flexShrink: 0,
  },
  dockStatusPill: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 999,
    border: '1px solid', fontSize: 11, fontWeight: 800,
    whiteSpace: 'nowrap' as const,
  },
  dockStatusPending: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '5px 10px', borderRadius: 999,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    fontSize: 11, fontWeight: 600, color: '#94a3b8',
    whiteSpace: 'nowrap' as const,
  },
  dockNavBtn: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, borderRadius: 8,
    background: '#ffffff', border: '1px solid #e2e8f0',
    color: '#374151', cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    transition: 'all 0.12s',
  },
  dockNavBtnDisabled: { opacity: 0.35, cursor: 'not-allowed' },
  dockNavCount: { fontSize: 11, fontWeight: 800, color: '#475569', whiteSpace: 'nowrap' as const },

  /* Panel de discusión colapsable */
  dockDiscusion: {
    padding: '12px 14px',
    borderTop: '1px solid #e5e7eb',
    background: '#fafbff',
    flexShrink: 0,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 8,
  },
  dockDiscusionHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 10, flexWrap: 'wrap' as const,
  },
  dockDiscusionLabel: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 11, fontWeight: 800, color: '#374151',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
  },
  dockDiscusionHint: {
    fontSize: 10, color: '#9ca3af', fontWeight: 600,
    textTransform: 'none' as const, letterSpacing: 0,
  },
  dockAutoAvanzar: {
    display: 'flex', alignItems: 'center', gap: 6,
    fontSize: 11, color: '#64748b', fontWeight: 600,
    cursor: 'pointer',
  },
  dockTextarea: {
    width: '100%',
    height: 72,
    border: '1.5px solid #c7d2fe',
    borderRadius: 10,
    padding: '9px 12px',
    fontSize: 13,
    color: '#1f2937',
    resize: 'vertical' as const,
    outline: 'none',
    fontFamily: "'Gabarito', sans-serif",
    background: '#fff',
    boxSizing: 'border-box' as const,
    lineHeight: 1.5,
  },

  loadingWrap: {
    minHeight: '100vh', display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center', gap: 10, background: '#f8fafc',
  },
  loadingText: { fontSize: 14, color: '#6b7280', margin: 0, fontWeight: 600 },
};
