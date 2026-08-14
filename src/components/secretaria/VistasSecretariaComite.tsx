import { apiFetch } from '../../lib/apiClient';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ClipboardList, FileText, CheckCircle2, XCircle, Clock,
  Search, ChevronRight, RefreshCw, Filter, AlertCircle,
  Building2, PlayCircle, UserPlus, Trash2, ArrowRight, ArrowLeft,
  CheckCheck, Users2, Timer, Eye, Layers, History, BookOpen, CalendarDays
} from 'lucide-react';
import { useMsal } from "@azure/msal-react";
import { getCompanyUsers, getCompanyUsersFromGroup } from "../../lib/graphService";
import { loginRequest } from "../../authConfig";
import { DetalleSolicitudComite } from './DetalleSolicitudComite';
import { ActaSesionComite } from './ActaSesionComite';
import { SesionComite, DecisionRegistro, DecisionComite } from './SesionComite';
import { parseValorMoneda } from '../../lib/formatPresupuesto';
import { nombreGerenciaCompleto } from '../../lib/gerencias';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

interface SolicitudComite {
  id: string;
  codigo: string;
  version?: string;
  objeto: string;
  valor_estimado: number;
  valor_en_cop?: number;
  moneda?: string;
  valor_moneda_cop_texto?: string;
  valor_moneda_usd_texto?: string;
  valor_moneda_eur_texto?: string;
  lugar_ejecucion?: string;
  solicitante_nombre: string;
  gerencia_nombre: string;
  modalidad?: string;
  creado_en: string;
}

interface VistasSecretariaComiteProps {
  userEmail?: string;
}

interface ParticipanteComite {
  nombre: string;
  cargo: string;
  representaA?: string;
  tipo?: 'asistente' | 'invitado';
}

interface ActaSnapshot {
  ids: string[];
  participantes: ParticipanteComite[];
  actaNumero: string;
  fechaSesionISO: string;
  decisiones: Record<string, DecisionRegistro>;
  actaId?: string;
}

interface ActaHistorial extends ActaSnapshot {
  savedAt: string;
  desarrolloTexto?: string;
  conclusionTexto?: string;
  desarrolloCerrado?: boolean;
  conclusionCerrada?: boolean;
  firmanteDirectoraNombre?: string;
  firmanteDirectoraCargo?: string;
  firmanteSecretariaNombre?: string;
  firmanteSecretariaCargo?: string;
  /** Fecha en la que quedó firmada electrónicamente en Adobe Sign (null = pendiente) */
  cerradaEn?: string | null;
}

type Fase = 'config' | 'seleccion' | 'sesion' | 'acta';

const STORAGE_KEY = 'secretaria_comite_sesion_v2';
const ACTAS_HISTORIAL_KEY = 'secretaria_actas_historial';

// El siguiente número de acta se calcula en el backend (a partir de las actas
// ya guardadas en la BD), no en el navegador de cada persona — así es igual
// para cualquiera que pueda iniciar un comité, sin importar el dispositivo.
async function fetchSiguienteNumeroActa(): Promise<string> {
  const año = new Date().getFullYear();
  try {
    const res = await apiFetch(`${API_URL}/api/secretaria/actas/siguiente-numero?año=${año}`);
    if (res.ok) {
      const data = await res.json();
      if (data?.acta_numero) return data.acta_numero;
    }
  } catch { /* no-op */ }
  return `${año}-001`;
}

/** Clave única por nombre (sin acentos, minúsculas, sin espacios extra). */
function claveNombreParticipante(nombre: string): string {
  return String(nombre || '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function deduplicarParticipantes(lista: ParticipanteComite[]): ParticipanteComite[] {
  const vistos = new Set<string>();
  return lista.filter((p) => {
    const clave = claveNombreParticipante(p.nombre);
    if (!clave || vistos.has(clave)) return false;
    vistos.add(clave);
    return true;
  });
}

export function VistasSecretariaComite(_props: VistasSecretariaComiteProps) {
  // Datos
  const [solicitudes, setSolicitudes] = useState<SolicitudComite[]>([]);
  const [cargando, setCargando] = useState(true);
  const [metrics, setMetrics] = useState<{ pendientes?: number; aprobadas?: number; rechazadas?: number }>({});
  const [refreshing, setRefreshing] = useState(false);
  const [busqueda, setBusqueda] = useState('');
  const [solicitudIdSeleccionada, setSolicitudIdSeleccionada] = useState<string | null>(null);

  const { instance, accounts } = useMsal();
  const [listaEmpleados, setListaEmpleados] = useState<{ id: string; nombre: string; cargo: string; email: string }[]>([]);
  const [errorCargaEmpleados, setErrorCargaEmpleados] = useState<string>('');

  // Wizard
  const [fase, setFase] = useState<Fase>('config');
  const [actaNumero, setActaNumero] = useState('');
  const [comiteIniciadoEn, setComiteIniciadoEn] = useState<string | null>(null);
  const [participantes, setParticipantes] = useState<ParticipanteComite[]>([]);
  const [nuevoParticipante, setNuevoParticipante] = useState<ParticipanteComite>({ nombre: '', cargo: '', representaA: '' });
  const [nuevoInvitado, setNuevoInvitado] = useState<ParticipanteComite>({ nombre: '', cargo: '', representaA: '' });
  const [seleccionadas, setSeleccionadas] = useState<Set<string>>(new Set());
  const [decisiones, setDecisiones] = useState<Record<string, DecisionRegistro>>({});
  const [actaSnapshot, setActaSnapshot] = useState<ActaSnapshot | null>(null);

  // Estimación de duración del comité
  const [minutosPorSolicitud, setMinutosPorSolicitud] = useState<number>(5);
  const [previewExpandido, setPreviewExpandido] = useState<boolean>(true);

  // Navegación lateral
  const [vistaActiva, setVistaActiva] = useState<'sesiones' | 'historial'>('sesiones');
  const [actasHistorial, setActasHistorial] = useState<ActaHistorial[]>([]);
  const [actaHistorialVisualizando, setActaHistorialVisualizando] = useState<ActaHistorial | null>(null);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  // Acta ya cerrada de decisiones pero aún sin firmar en Adobe Sign: mientras
  // exista, no se puede iniciar una sesión de comité nueva.
  const actaPendienteFirma = useMemo(
    () => actasHistorial.find((a) => a.actaId && !a.cerradaEn) || null,
    [actasHistorial]
  );

  // Carga de usuarios AD
  useEffect(() => {
    async function loadUsers() {
      try {
        setErrorCargaEmpleados('');
        if (!accounts.length) {
          setListaEmpleados([]);
          return;
        }

        const supervisionGroupId = ((import.meta as any).env?.VITE_SUPERVISION_GROUP_ID || '').trim();
        let graphUsers: any;
        if (supervisionGroupId) {
          try {
            const groupToken = await instance.acquireTokenSilent({
              scopes: ["User.Read", "User.ReadBasic.All", "GroupMember.Read.All"],
              account: accounts[0]
            });
            graphUsers = await getCompanyUsersFromGroup(groupToken.accessToken, supervisionGroupId);
          } catch (groupError) {
            console.error("No fue posible leer miembros del grupo de supervisión.", groupError);
            setListaEmpleados([]);
            setErrorCargaEmpleados('No fue posible cargar miembros del grupo de supervisión.');
            return;
          }
        } else {
          try {
            const baseToken = await instance.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0]
            });
            graphUsers = await getCompanyUsers(baseToken.accessToken);
          } catch (tokenError) {
            console.error("Error adquiriendo token para Graph:", tokenError);
            return;
          }
        }
        const rawUsers = Array.isArray(graphUsers?.value) ? graphUsers.value : [];

        const mappedUsers = rawUsers
          .filter((u: any) => u?.accountEnabled !== false)
          .map((u: any) => {
            const email = (u.mail || u.userPrincipalName || '').trim();
            return {
              id: String(u.id || ''),
              nombre: String(u.displayName || '').trim(),
              cargo: String(u.jobTitle || '').trim(),
              email
            };
          })
          .filter((u: any) => u.id && u.nombre && u.email);

        const uniqueUsers = mappedUsers
          .filter((v: any, i: number, a: any[]) =>
            a.findIndex((t: any) => t.email.toLowerCase() === v.email.toLowerCase()) === i
          )
          .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre));

        setListaEmpleados(uniqueUsers);
      } catch (err) {
        console.error("Error cargando usuarios del directorio:", err);
        setListaEmpleados([]);
        setErrorCargaEmpleados('Error al conectar con el directorio activo.');
      }
    }
    loadUsers();
  }, [instance, accounts]);

  const solicitudesFiltradas = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    if (!q) return solicitudes;
    return solicitudes.filter((s) =>
      [s.codigo, s.objeto, s.solicitante_nombre, s.gerencia_nombre]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [busqueda, solicitudes]);

  const fetchSolicitudes = async () => {
    setCargando(true);
    try {
      const res = await apiFetch(`${API_URL}/api/secretaria/comite`);
      setSolicitudes(res.ok ? ((await res.json()) as SolicitudComite[]) : []);
    } catch (err) {
      console.error('Error cargando solicitudes de comité:', err);
      setSolicitudes([]);
    } finally {
      setCargando(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await apiFetch(`${API_URL}/api/secretaria/metrics`);
      if (res.ok) setMetrics(await res.json());
    } catch (err) {
      console.error('Error cargando métricas:', err);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchSolicitudes(), fetchMetrics()]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchSolicitudes();
    fetchMetrics();
  }, []);

  // Carga historial de actas: API + localStorage como fallback
  const fetchActasHistorial = async () => {
    setCargandoHistorial(true);
    try {
      const res = await apiFetch(`${API_URL}/api/secretaria/actas/historial`);
      if (res.ok) {
        const apiData: ActaHistorial[] = await res.json();
        // Fusionar con actas locales que aún no están en la API
        const idsEnApi = new Set(apiData.map((a) => a.actaNumero).filter(Boolean));
        let locales: ActaHistorial[] = [];
        try {
          const raw = localStorage.getItem(ACTAS_HISTORIAL_KEY);
          if (raw) locales = JSON.parse(raw) || [];
        } catch { /* no-op */ }
        const soloLocales = locales.filter((a) => a.actaNumero && !idsEnApi.has(a.actaNumero));
        const merged = [...apiData, ...soloLocales].sort(
          (a, b) => new Date(b.fechaSesionISO).getTime() - new Date(a.fechaSesionISO).getTime()
        );
        setActasHistorial(merged);
      } else {
        // Si la API falla, usar solo localStorage
        try {
          const raw = localStorage.getItem(ACTAS_HISTORIAL_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) setActasHistorial(parsed);
          }
        } catch { /* no-op */ }
      }
    } catch {
      // Sin conexión: usar localStorage
      try {
        const raw = localStorage.getItem(ACTAS_HISTORIAL_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) setActasHistorial(parsed);
        }
      } catch { /* no-op */ }
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    fetchActasHistorial();
  }, []);

  // Persistencia sesión comité
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) {
        fetchSiguienteNumeroActa().then(setActaNumero);
        return;
      }
      const p = JSON.parse(saved);
      if (p?.fase) setFase(p.fase);
      if (p?.acta_numero) setActaNumero(p.acta_numero);
      else fetchSiguienteNumeroActa().then(setActaNumero);
      if (p?.iniciado_en) setComiteIniciadoEn(p.iniciado_en);
      if (Array.isArray(p?.participantes)) {
        setParticipantes(deduplicarParticipantes(p.participantes));
      }
      if (Array.isArray(p?.seleccionadas)) setSeleccionadas(new Set<string>(p.seleccionadas));
      if (p?.decisiones && typeof p.decisiones === 'object') setDecisiones(p.decisiones);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          fase,
          acta_numero: actaNumero,
          iniciado_en: comiteIniciadoEn,
          participantes,
          seleccionadas: Array.from(seleccionadas),
          decisiones,
        })
      );
    } catch {
      // no-op
    }
  }, [fase, actaNumero, comiteIniciadoEn, participantes, seleccionadas, decisiones]);

  const formatter = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const formatterUSD = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
  const formatterEUR = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 });

  const formatearDuracion = (minutosTotales: number): string => {
    if (!Number.isFinite(minutosTotales) || minutosTotales <= 0) return '0 min';
    const horas = Math.floor(minutosTotales / 60);
    const min = minutosTotales % 60;
    if (horas === 0) return `${min} min`;
    if (min === 0) return `${horas} h`;
    return `${horas} h ${min} min`;
  };

  const tiempoEstimadoMin = solicitudes.length * Math.max(1, minutosPorSolicitud);
  const tiempoEstimadoTexto = formatearDuracion(tiempoEstimadoMin);

  /** Devuelve el monto en la moneda original (sin convertir). */
  const obtenerMontoOriginal = (sol: SolicitudComite): number => {
    const m = String(sol.moneda || 'COP').toUpperCase();
    if (m === 'USD') {
      return parseValorMoneda(sol.valor_moneda_usd_texto) || Number(sol.valor_estimado || 0);
    }
    if (m === 'EUR') {
      return parseValorMoneda(sol.valor_moneda_eur_texto) || Number(sol.valor_estimado || 0);
    }
    return (
      parseValorMoneda(sol.valor_moneda_cop_texto) ||
      Number(sol.valor_en_cop || 0) ||
      Number(sol.valor_estimado || 0)
    );
  };

  /** Subtotales por moneda — no mezcla monedas distintas. */
  const subtotalesPorMoneda = solicitudes.reduce(
    (acc, s) => {
      const m = String(s.moneda || 'COP').toUpperCase();
      const monto = obtenerMontoOriginal(s);
      if (m === 'USD') acc.usd += monto;
      else if (m === 'EUR') acc.eur += monto;
      else acc.cop += monto;
      return acc;
    },
    { cop: 0, usd: 0, eur: 0 }
  );

  const monedasPresentes: Array<{ moneda: 'COP' | 'USD' | 'EUR'; total: number; texto: string }> = [];
  if (subtotalesPorMoneda.cop > 0) {
    monedasPresentes.push({ moneda: 'COP', total: subtotalesPorMoneda.cop, texto: formatter.format(subtotalesPorMoneda.cop) });
  }
  if (subtotalesPorMoneda.usd > 0) {
    monedasPresentes.push({ moneda: 'USD', total: subtotalesPorMoneda.usd, texto: formatterUSD.format(subtotalesPorMoneda.usd) });
  }
  if (subtotalesPorMoneda.eur > 0) {
    monedasPresentes.push({ moneda: 'EUR', total: subtotalesPorMoneda.eur, texto: formatterEUR.format(subtotalesPorMoneda.eur) });
  }

  const getValorMostrar = (sol: SolicitudComite): string => {
    const m = String(sol.moneda || 'COP').toUpperCase();
    const valorTexto = m === 'USD' ? sol.valor_moneda_usd_texto :
                       m === 'EUR' ? sol.valor_moneda_eur_texto :
                       sol.valor_moneda_cop_texto;
    if (valorTexto) return `${sol.moneda || 'COP'} ${valorTexto}`;
    return formatter.format(Number(sol.valor_en_cop || sol.valor_estimado || 0));
  };

  // Participantes
  const agregarPersona = (
    data: ParticipanteComite,
    setData: React.Dispatch<React.SetStateAction<ParticipanteComite>>,
    tipo: 'asistente' | 'invitado'
  ) => {
    const nombre = String(data.nombre || '')
      .replace(/\s*\([^)]*\)\s*$/, '')
      .trim();
    const cargo = String(data.cargo || '').trim();
    const representaA = String(data.representaA || '').trim();
    if (!nombre || !cargo) {
      alert('Nombre y cargo son obligatorios.');
      return;
    }
    const clave = claveNombreParticipante(nombre);
    const yaExiste = participantes.some((p) => claveNombreParticipante(p.nombre) === clave);
    if (yaExiste) {
      alert(`${nombre} ya está en la lista.`);
      return;
    }
    if (representaA && claveNombreParticipante(representaA) === clave) {
      alert('Una persona no puede reemplazarse a sí misma.');
      return;
    }
    setParticipantes((prev) => [...prev, { nombre, cargo, representaA, tipo }]);
    setData({ nombre: '', cargo: '', representaA: '' });
  };

  const eliminarParticipante = (idx: number) => {
    setParticipantes((prev) => prev.filter((_, i) => i !== idx));
  };

  // Acciones wizard
  const iniciarComite = () => {
    if (!actaNumero.trim()) {
      alert('Registra el número de acta / sesión para iniciar.');
      return;
    }
    const asistentes = participantes.filter(p => !p.tipo || p.tipo === 'asistente');
    if (asistentes.length === 0) {
      alert('Agrega al menos un asistente.');
      return;
    }
    setComiteIniciadoEn(new Date().toISOString());
    setFase('seleccion');
  };

  const toggleSeleccion = (id: string) => {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSeleccionTodas = () => {
    if (seleccionadas.size === solicitudesFiltradas.length) setSeleccionadas(new Set());
    else setSeleccionadas(new Set(solicitudesFiltradas.map((s) => s.id)));
  };

  const continuarASesion = () => {
    if (seleccionadas.size === 0) {
      alert('Selecciona al menos una solicitud para iniciar la sesión.');
      return;
    }
    const ids = Array.from(seleccionadas);
    const base: Record<string, DecisionRegistro> = { ...decisiones };
    ids.forEach((id) => {
      if (!base[id]) base[id] = { discusion: '', decision: null };
    });
    setDecisiones(base);
    setFase('sesion');
  };

  const cancelarComite = () => {
    const ok = window.confirm('¿Cancelar la sesión actual? Se perderá el avance.');
    if (!ok) return;
    resetComite();
  };

  const resetComite = () => {
    setFase('config');
    setActaNumero('');
    setComiteIniciadoEn(null);
    setParticipantes([]);
    setNuevoParticipante({ nombre: '', cargo: '', representaA: '' });
    setNuevoInvitado({ nombre: '', cargo: '', representaA: '' });
    setSeleccionadas(new Set());
    setDecisiones({});
    setActaSnapshot(null);
  };

  const persistirDecisionEnBackend = async (
    id: string,
    decision: DecisionComite,
    discusion?: string
  ): Promise<void> => {
    if (decision !== 'aprobada' && decision !== 'rechazada' && decision !== 'en_revision') return;
    const resultadoApi =
      decision === 'aprobada'
        ? 'aprobado'
        : decision === 'rechazada'
          ? 'rechazado'
          : 'en_revision';
    const res = await apiFetch(`${API_URL}/api/solicitudes/${id}/comite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resultado: resultadoApi,
          comentario: String(discusion || '').trim() || null,
          usuario_email: accounts[0]?.username,
        }),
      });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
  };

  const cerrarComite = async (decisionesFinal: Record<string, DecisionRegistro>) => {
    setDecisiones(decisionesFinal);
    try {
      await Promise.all(
        Object.entries(decisionesFinal).map(([id, d]) =>
          persistirDecisionEnBackend(id, d.decision, d.discusion)
        )
      );
    } catch (err) {
      console.error('Error guardando decisiones de comité:', err);
      alert(`No se pudo cerrar el comité porque falló el guardado de decisiones: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      return;
    }
    const ids = Array.from(seleccionadas);
    const snapshot: ActaSnapshot = {
      ids,
      participantes: [...participantes],
      actaNumero: actaNumero.trim(),
      fechaSesionISO: comiteIniciadoEn || new Date().toISOString(),
      decisiones: decisionesFinal,
    };

    // Persistir en base de datos y capturar el ID generado
    let actaId: string | undefined;
    try {
      const r = await apiFetch(`${API_URL}/api/secretaria/actas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acta_numero: snapshot.actaNumero,
          fecha_sesion: snapshot.fechaSesionISO,
          participantes: snapshot.participantes,
          solicitudes_ids: snapshot.ids,
          decisiones: snapshot.decisiones,
        }),
      });
      if (r.ok) {
        const data = await r.json();
        actaId = data.id;
        if (data.acta_numero) snapshot.actaNumero = data.acta_numero;
      } else if (r.status === 409) {
        // Otra persona ya usó este número (dos comités iniciados casi al mismo tiempo).
        const body = await r.json().catch(() => ({}));
        const numeroSugerido = await fetchSiguienteNumeroActa();
        setActaNumero(numeroSugerido);
        alert(body?.error || `El número de acta "${snapshot.actaNumero}" ya fue usado. Se sugiere el número ${numeroSugerido}; revísalo e intenta cerrar el comité de nuevo.`);
        return;
      } else {
        throw new Error(`HTTP ${r.status}`);
      }
    } catch (e) {
      console.error('No se pudo guardar acta en la BD:', e);
      alert('No se pudo guardar el acta en la base de datos. Intenta cerrar el comité nuevamente antes de continuar.');
      return;
    }

    const snapshotConId: ActaSnapshot = { ...snapshot, actaId };

    // Guardar en historial local (localStorage)
    const nuevaEntrada: ActaHistorial = { ...snapshotConId, savedAt: new Date().toISOString() };
    const historialActualizado = [nuevaEntrada, ...actasHistorial];
    setActasHistorial(historialActualizado);
    try { localStorage.setItem(ACTAS_HISTORIAL_KEY, JSON.stringify(historialActualizado)); } catch { /* no-op */ }

    setActaSnapshot(snapshotConId);
    setFase('acta');
  };

  const volverDeActa = () => {
    fetchSolicitudes();
    fetchMetrics();
    resetComite();
  };

  // Ver acta histórica
  if (actaHistorialVisualizando) {
    const discusionesPorId = Object.fromEntries(
      Object.entries(actaHistorialVisualizando.decisiones).map(([id, d]) => [id, d.discusion])
    );
    return (
      <ActaSesionComite
        ids={actaHistorialVisualizando.ids}
        participantes={actaHistorialVisualizando.participantes}
        actaNumero={actaHistorialVisualizando.actaNumero}
        fechaSesionISO={actaHistorialVisualizando.fechaSesionISO}
        discusionesPorId={discusionesPorId}
        decisionesPorId={actaHistorialVisualizando.decisiones}
        actaId={actaHistorialVisualizando.actaId}
        desarrolloInicial={actaHistorialVisualizando.desarrolloTexto}
        conclusionInicial={actaHistorialVisualizando.conclusionTexto}
        desarrolloCerradoInicial={actaHistorialVisualizando.desarrolloCerrado}
        conclusionCerradaInicial={actaHistorialVisualizando.conclusionCerrada}
        firmanteDirectoraNombreInicial={actaHistorialVisualizando.firmanteDirectoraNombre}
        firmanteDirectoraCargoInicial={actaHistorialVisualizando.firmanteDirectoraCargo}
        firmanteSecretariaNombreInicial={actaHistorialVisualizando.firmanteSecretariaNombre}
        firmanteSecretariaCargoInicial={actaHistorialVisualizando.firmanteSecretariaCargo}
        cerradaEnInicial={actaHistorialVisualizando.cerradaEn}
        soloLectura
        onBack={() => setActaHistorialVisualizando(null)}
      />
    );
  }

  // Rutas de detalle independientes (fuera del flujo)
  if (solicitudIdSeleccionada) {
    return (
      <DetalleSolicitudComite
        solicitudId={solicitudIdSeleccionada}
        soloLectura
        onBack={() => {
          setSolicitudIdSeleccionada(null);
          fetchSolicitudes();
        }}
      />
    );
  }

  if (fase === 'acta' && actaSnapshot) {
    const discusionesPorId = Object.fromEntries(
      Object.entries(actaSnapshot.decisiones).map(([id, d]) => [id, d.discusion])
    );
    return (
      <ActaSesionComite
        ids={actaSnapshot.ids}
        participantes={actaSnapshot.participantes}
        actaNumero={actaSnapshot.actaNumero}
        fechaSesionISO={actaSnapshot.fechaSesionISO}
        discusionesPorId={discusionesPorId}
        decisionesPorId={actaSnapshot.decisiones}
        solicitudPrincipalId={actaSnapshot.ids[0]}
        actaId={actaSnapshot.actaId}
        cerradaEnInicial={actaSnapshot.actaId ? (actasHistorial.find((a) => a.actaId === actaSnapshot.actaId)?.cerradaEn ?? null) : null}
        onBack={volverDeActa}
      />
    );
  }

  // Hay un acta de decisiones ya cerradas pero sin firmar en Adobe Sign:
  // no se puede iniciar una sesión de comité nueva hasta completarla.
  if (actaPendienteFirma) {
    return (
      <div style={{ maxWidth: 640, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 20,
          padding: '32px 28px', color: '#92400E',
        }}>
          <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: 8 }}>
            ⚠ Hay un acta pendiente de firma electrónica
          </p>
          <p style={{ fontSize: '0.9rem', marginBottom: 20, lineHeight: 1.5 }}>
            El acta {actaPendienteFirma.actaNumero || 'de la sesión anterior'} ya tiene las decisiones cerradas,
            pero no puede considerarse finalizada hasta que la Directora y la Secretaria del Comité completen
            la firma en Adobe Sign. No es posible iniciar una nueva sesión de comité hasta entonces.
          </p>
          <button
            onClick={() => { setActaSnapshot(actaPendienteFirma); setFase('acta'); }}
            style={{
              background: '#E84922', color: '#fff', border: 'none', borderRadius: 12,
              padding: '12px 24px', fontWeight: 800, cursor: 'pointer',
            }}
          >
            Ir al acta pendiente
          </button>
        </div>
      </div>
    );
  }

  if (fase === 'sesion') {
    return (
      <SesionComite
        ids={Array.from(seleccionadas)}
        actaNumero={actaNumero}
        participantes={participantes}
        decisionesIniciales={decisiones}
        onBack={() => setFase('seleccion')}
        onCerrarComite={cerrarComite}
      />
    );
  }

  // ══════════════════════════════
  // FASE 'config' y 'seleccion'
  // ══════════════════════════════
  const pasos = [
    { id: 'config', label: 'Configurar sesión' },
    { id: 'seleccion', label: 'Seleccionar solicitudes' },
    { id: 'sesion', label: 'Revisar y decidir' },
    { id: 'acta', label: 'Cerrar y generar acta' },
  ] as const;
  const pasoActualIdx = pasos.findIndex((p) => p.id === fase);

  return (
    <div style={s.page}>
      {/* Sidebar */}
      <aside style={s.sidebar}>
        <div style={s.sidebarBrand}>
          <div style={s.sidebarIcon}>
            <ClipboardList size={22} color="#fff" />
          </div>
          <div>
            <p style={s.sidebarTitle}>Secretaría</p>
            <p style={s.sidebarSubtitle}>Comité de Contratación</p>
          </div>
        </div>

        <nav style={s.sidebarNav}>
          <button
            onClick={() => setVistaActiva('sesiones')}
            style={vistaActiva === 'sesiones' ? s.navItemActive : s.navItem}
          >
            <ClipboardList size={16} />
            <span>Sesiones de comité</span>
          </button>
          <button
            onClick={() => { setVistaActiva('historial'); fetchActasHistorial(); }}
            style={vistaActiva === 'historial' ? s.navItemActive : s.navItem}
          >
            <History size={16} />
            <span>Actas anteriores</span>
            {actasHistorial.length > 0 && (
              <span style={s.navBadge}>{actasHistorial.length}</span>
            )}
          </button>
        </nav>

        <div style={s.sidebarMetrics}>
          <p style={s.sidebarMetricLabel}>RESUMEN</p>
          {[
            { color: '#F59E0B', label: 'Pendientes', value: metrics.pendientes },
            { color: '#10B981', label: 'Aprobadas', value: metrics.aprobadas },
            { color: '#EF4444', label: 'Rechazadas', value: metrics.rechazadas },
          ].map((m) => (
            <div key={m.label} style={s.metricCardSide}>
              <div style={{ ...s.metricDot, background: m.color }} />
              <div>
                <p style={s.metricSideValue}>{m.value ?? '—'}</p>
                <p style={s.metricSideText}>{m.label}</p>
              </div>
            </div>
          ))}
        </div>

        {vistaActiva === 'sesiones' && <div style={s.flujoGuia}>
          <p style={s.flujoTitleTop}>Pasos del comité</p>
          {pasos.map((p, i) => {
            const estado: 'completado' | 'actual' | 'pendiente' =
              i < pasoActualIdx ? 'completado' : i === pasoActualIdx ? 'actual' : 'pendiente';
            return (
              <div key={p.id} style={s.flujoStep}>
                <div
                  style={{
                    ...s.flujoNum,
                    background: estado === 'actual' ? '#E84922' : estado === 'completado' ? '#10B981' : 'rgba(255,255,255,0.1)',
                    color: estado === 'pendiente' ? 'rgba(255,255,255,0.6)' : '#fff',
                    borderColor: estado === 'actual' ? '#E84922' : estado === 'completado' ? '#10B981' : 'rgba(255,255,255,0.15)',
                  }}
                >
                  {estado === 'completado' ? '✓' : i + 1}
                </div>
                <p style={{ ...s.flujoText, color: estado === 'actual' ? '#ffffff' : 'rgba(255,255,255,0.55)', fontWeight: estado === 'actual' ? 800 : 500 }}>
                  {p.label}
                </p>
              </div>
            );
          })}
        </div>}
      </aside>

      {/* Main */}
      <main style={s.main}>

        {/* ══════════════════════════════
            VISTA: ACTAS ANTERIORES
        ══════════════════════════════ */}
        {vistaActiva === 'historial' && (
          <>
            <div style={s.topBar}>
              <div>
                <div style={s.breadcrumb}>
                  <Building2 size={13} color="#9ca3af" />
                  <span style={s.breadcrumbText}>Secretaría de Comité</span>
                  <ChevronRight size={13} color="#d1d5db" />
                  <span style={{ ...s.breadcrumbText, color: 'var(--brand-secondary)', fontWeight: 700 }}>
                    Actas anteriores
                  </span>
                </div>
                <h1 style={s.pageTitle}>
                  Actas <span style={{ color: '#E84922' }}>anteriores</span>
                </h1>
                <p style={s.pageDesc}>
                  Consulta y visualiza las actas de sesiones de comité ya finalizadas.
                </p>
              </div>
            </div>

            {cargandoHistorial ? (
              <div style={s.historialEmpty}>
                <div style={s.loadingSpinner} />
                <p style={s.emptyText}>Cargando historial de actas...</p>
              </div>
            ) : actasHistorial.length === 0 ? (
              <div style={s.historialEmpty}>
                <div style={s.historialEmptyIcon}>
                  <BookOpen size={36} color="#cbd5e1" />
                </div>
                <p style={s.emptyTitle}>Sin actas registradas</p>
                <p style={s.emptyText}>
                  Las actas generadas en sesiones de comité aparecerán aquí automáticamente.
                </p>
              </div>
            ) : (
              <div style={s.historialGrid}>
                {actasHistorial.map((acta, idx) => {
                  const decisiones = Object.values(acta.decisiones);
                  const aprobadas = decisiones.filter((d) => d.decision === 'aprobada').length;
                  const rechazadas = decisiones.filter((d) => d.decision === 'rechazada').length;
                  const enRevision = decisiones.filter((d) => d.decision === 'en_revision').length;
                  const pendientes = decisiones.filter((d) => !d.decision).length;
                  const fecha = new Date(acta.fechaSesionISO);
                  const fechaFormateada = fecha.toLocaleDateString('es-CO', {
                    day: '2-digit', month: 'long', year: 'numeric',
                  });
                  const horaFormateada = fecha.toLocaleTimeString('es-CO', {
                    hour: '2-digit', minute: '2-digit',
                  });
                  const esReconstruida = (acta as any).source === 'reconstruida';
                  return (
                    <div key={idx} style={s.historialCard}>
                      <div style={s.historialCardHeader}>
                        <div style={{ ...s.historialCardIconWrap, background: esReconstruida ? '#F0FDF4' : '#EFF6FF' }}>
                          <FileText size={18} color={esReconstruida ? '#16a34a' : '#245782'} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' as const }}>
                            <p style={s.historialActaNum}>
                              {acta.actaNumero ? `Acta N.° ${acta.actaNumero}` : 'Sesión sin número de acta'}
                            </p>
                            {esReconstruida && (
                              <span style={s.badgeReconstruida}>Histórica</span>
                            )}
                          </div>
                          <div style={s.historialFechaRow}>
                            <CalendarDays size={11} color="#9ca3af" />
                            <span style={s.historialFecha}>{fechaFormateada} · {horaFormateada}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setActaHistorialVisualizando(acta)}
                          style={s.btnVerActa}
                          title="Ver acta completa"
                        >
                          <Eye size={13} /> Ver acta
                        </button>
                      </div>

                      <div style={s.historialStats}>
                        <div style={s.historialStat}>
                          <span style={s.historialStatNum}>{acta.ids.length}</span>
                          <span style={s.historialStatLabel}>Solicitudes</span>
                        </div>
                        <div style={s.historialStat}>
                          <span style={{ ...s.historialStatNum, color: '#10B981' }}>{aprobadas}</span>
                          <span style={s.historialStatLabel}>Aprobadas</span>
                        </div>
                        <div style={s.historialStat}>
                          <span style={{ ...s.historialStatNum, color: '#EF4444' }}>{rechazadas}</span>
                          <span style={s.historialStatLabel}>Rechazadas</span>
                        </div>
                        {enRevision > 0 && (
                          <div style={s.historialStat}>
                            <span style={{ ...s.historialStatNum, color: '#F59E0B' }}>{enRevision}</span>
                            <span style={s.historialStatLabel}>En revisión</span>
                          </div>
                        )}
                        {pendientes > 0 && (
                          <div style={s.historialStat}>
                            <span style={{ ...s.historialStatNum, color: '#9ca3af' }}>{pendientes}</span>
                            <span style={s.historialStatLabel}>Sin decisión</span>
                          </div>
                        )}
                      </div>

                      <div style={s.historialParticipantesRow}>
                        <Users2 size={12} color="#9ca3af" />
                        <span style={s.historialParticipantesText}>
                          {acta.participantes.length} participante{acta.participantes.length !== 1 ? 's' : ''}:&nbsp;
                          {acta.participantes.slice(0, 3).map((p) => p.nombre).join(', ')}
                          {acta.participantes.length > 3 ? ` +${acta.participantes.length - 3} más` : ''}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════════
            VISTA: SESIONES (WIZARD)
        ══════════════════════════════ */}
        {vistaActiva === 'sesiones' && <>
        <div style={s.topBar}>
          <div>
            <div style={s.breadcrumb}>
              <Building2 size={13} color="#9ca3af" />
              <span style={s.breadcrumbText}>Secretaría de Comité</span>
              <ChevronRight size={13} color="#d1d5db" />
              <span style={{ ...s.breadcrumbText, color: 'var(--brand-secondary)', fontWeight: 700 }}>
                {fase === 'config' ? 'Configurar sesión' : 'Seleccionar solicitudes'}
              </span>
            </div>
            <h1 style={s.pageTitle}>
              {fase === 'config' ? (
                <>Preparar <span style={{ color: '#E84922' }}>sesión</span> de comité</>
              ) : (
                <>Seleccionar <span style={{ color: '#E84922' }}>solicitudes</span></>
              )}
            </h1>
            <p style={s.pageDesc}>
              {fase === 'config'
                ? 'Registra el número de acta y los participantes. Cuando estés listo inicia la sesión del comité.'
                : `Comité activo · Acta ${actaNumero} · ${participantes.length} participante(s). Marca las solicitudes que se presentarán en esta sesión.`}
            </p>
          </div>

          <div style={s.topBarActions}>
            {fase !== 'config' && (
              <button onClick={cancelarComite} style={s.btnSecundario} title="Cancelar sesión">
                Cancelar sesión
              </button>
            )}
            <button onClick={handleRefresh} style={s.btnRefresh} title="Actualizar">
              <RefreshCw
                size={15}
                style={{ transition: 'transform 0.4s', transform: refreshing ? 'rotate(360deg)' : 'none' }}
              />
              Actualizar
            </button>
          </div>
        </div>

        {/* Stepper superior */}
        <div style={s.stepper}>
          {pasos.map((p, i) => {
            const active = i === pasoActualIdx;
            const done = i < pasoActualIdx;
            return (
              <React.Fragment key={p.id}>
                <div style={s.stepperItem}>
                  <div
                    style={{
                      ...s.stepperNum,
                      background: active ? '#E84922' : done ? '#10B981' : '#e5e7eb',
                      color: active || done ? '#fff' : '#9ca3af',
                    }}
                  >
                    {done ? <CheckCheck size={12} /> : i + 1}
                  </div>
                  <span style={{ ...s.stepperLabel, color: active ? '#111827' : done ? '#047857' : '#9ca3af', fontWeight: active ? 800 : 600 }}>
                    {p.label}
                  </span>
                </div>
                {i < pasos.length - 1 && <div style={{ ...s.stepperSep, background: done ? '#10B981' : '#e5e7eb' }} />}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── FASE: CONFIG ── */}
        {fase === 'config' && (
          <div style={s.configWrap}>

            {/* Panel de solicitudes pendientes + tiempo estimado del comité */}
            <div style={s.previewCard}>
              <div style={s.previewHeader}>
                <div style={s.previewHeaderLeft}>
                  <div style={s.previewHeaderIcon}>
                    <Layers size={18} color="#E84922" />
                  </div>
                  <div>
                    <p style={s.previewEyebrow}>Antes de iniciar</p>
                    <h3 style={s.previewTitle}>Solicitudes pendientes para este comité</h3>
                    <p style={s.previewSub}>
                      Revisa qué se va a discutir y estima la duración aproximada de la sesión.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewExpandido((v) => !v)}
                  style={s.previewToggle}
                  title={previewExpandido ? 'Ocultar lista' : 'Mostrar lista'}
                >
                  {previewExpandido ? 'Ocultar lista' : 'Mostrar lista'}
                </button>
              </div>

              {/* KPIs */}
              <div style={s.previewKpis}>
                <div style={s.kpiCard}>
                  <div style={{ ...s.kpiIcon, background: '#FEE4DA', color: '#E84922' }}>
                    <ClipboardList size={16} />
                  </div>
                  <div>
                    <p style={s.kpiValue}>{solicitudes.length}</p>
                    <p style={s.kpiLabel}>Solicitudes pendientes</p>
                  </div>
                </div>

                <div style={s.kpiCard}>
                  <div style={{ ...s.kpiIcon, background: '#DBEAFE', color: 'var(--brand-secondary)' }}>
                    <Timer size={16} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={s.kpiValue}>{tiempoEstimadoTexto}</p>
                    <p style={s.kpiLabel}>Duración estimada del comité</p>
                    <div style={s.minRow}>
                      <span style={s.minLabel}>Min. por solicitud</span>
                      <input
                        type="number"
                        min={1}
                        max={60}
                        value={minutosPorSolicitud}
                        onChange={(e) => {
                          const n = parseInt(e.target.value, 10);
                          setMinutosPorSolicitud(Number.isFinite(n) && n > 0 ? Math.min(60, n) : 1);
                        }}
                        style={s.minInput}
                      />
                      <span style={s.minLabel}>min</span>
                    </div>
                  </div>
                </div>

                <div style={s.kpiCard}>
                  <div style={{ ...s.kpiIcon, background: '#DCFCE7', color: '#10B981' }}>
                    <CheckCircle2 size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {monedasPresentes.length === 0 ? (
                      <>
                        <p style={s.kpiValue}>—</p>
                        <p style={s.kpiLabel}>Sin montos registrados</p>
                      </>
                    ) : monedasPresentes.length === 1 ? (
                      <>
                        <p style={s.kpiValue}>{monedasPresentes[0].texto}</p>
                        <p style={s.kpiLabel}>
                          Monto total ({monedasPresentes[0].moneda})
                        </p>
                      </>
                    ) : (
                      <>
                        <div style={s.kpiMultiList}>
                          {monedasPresentes.map((m) => (
                            <div key={m.moneda} style={s.kpiMultiRow}>
                              <span style={s.kpiMultiTag}>{m.moneda}</span>
                              <span style={s.kpiMultiVal}>{m.texto}</span>
                            </div>
                          ))}
                        </div>
                        <p style={s.kpiLabel}>
                          Subtotales por moneda · {monedasPresentes.length} divisas
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Lista preview */}
              {previewExpandido && (
                <div style={s.previewListWrap}>
                  {cargando ? (
                    <div style={s.previewLoading}>
                      <div style={s.loadingSpinner} />
                      <p style={s.emptyText}>Cargando solicitudes pendientes...</p>
                    </div>
                  ) : solicitudes.length === 0 ? (
                    <div style={s.previewEmpty}>
                      <ClipboardList size={28} color="#cbd5e1" />
                      <p style={s.previewEmptyTitle}>No hay solicitudes pendientes</p>
                      <p style={s.previewEmptyText}>Aún puedes configurar la sesión, pero no habrá solicitudes para revisar.</p>
                    </div>
                  ) : (
                    <div style={s.previewList}>
                      {solicitudes.map((sol, idx) => (
                        <div key={sol.id} style={s.previewItem}>
                          <span style={s.previewItemIdx}>{idx + 1}</span>
                          <div style={s.previewItemLeft}>
                            <div style={s.previewItemHead}>
                              <span style={s.previewItemCodigo}>{sol.codigo}</span>
                              {sol.modalidad && (
                                <span style={s.previewModalidad}>{sol.modalidad}</span>
                              )}
                            </div>
                            <p style={s.previewItemObjeto}>{sol.titulo_contrato || sol.objeto}</p>
                            <div style={s.previewItemMeta}>
                              <span style={s.previewItemMetaItem}>
                                <Building2 size={11} color="#94a3b8" />
                                {nombreGerenciaCompleto(sol.gerencia_nombre)}
                              </span>
                              <span style={{ color: '#d1d5db' }}>·</span>
                              <span style={s.previewItemMetaItem}>
                                <Users2 size={11} color="#94a3b8" />
                                {sol.solicitante_nombre}
                              </span>
                            </div>
                          </div>
                          <div style={s.previewItemRight}>
                            <span style={s.previewItemMonto}>{getValorMostrar(sol)}</span>
                            <button
                              type="button"
                              onClick={() => setSolicitudIdSeleccionada(sol.id)}
                              style={s.previewItemBtn}
                              title="Ver formato completo"
                            >
                              <Eye size={12} /> Ver formato
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={s.configCard}>
              <div style={s.configHeader}>
                <div style={s.configHeaderIcon}>
                  <PlayCircle size={20} color="#E84922" />
                </div>
                <div>
                  <p style={s.configEyebrow}>Paso 1</p>
                  <h2 style={s.configTitle}>Configurar sesión de comité</h2>
                  <p style={s.configSub}>Define el número de acta y los participantes antes de iniciar.</p>
                </div>
              </div>

              <div style={s.configBlock}>
                <label style={s.configLabel}>Acta / Número de sesión</label>
                <input
                  value={actaNumero}
                  onChange={(e) => setActaNumero(e.target.value)}
                  placeholder={`${new Date().getFullYear()}-001`}
                  style={s.configInputLarge}
                />
                <p style={s.configHint}>Número generado automáticamente ({new Date().getFullYear()}-consecutivo). Puedes editarlo si es necesario.</p>
              </div>

              {/* ── Asistentes ── */}
              <div style={s.configBlock}>
                <div style={s.seccionPersonasHeader}>
                  <Users2 size={14} color="#245782" />
                  <span style={{ ...s.configLabel, color: '#245782' }}>Asistentes</span>
                  <span style={s.seccionPersonasBadge}>{participantes.filter(p => !p.tipo || p.tipo === 'asistente').length}</span>
                </div>
                <div style={s.participantesFormRow}>
                  <div style={{ position: 'relative' }}>
                    <input
                      list="asistentes-list"
                      value={nuevoParticipante.nombre}
                      onChange={(e) => {
                        const val = e.target.value;
                        const emp = listaEmpleados.find(u => u.nombre === val || `${u.nombre} (${u.email})` === val);
                        if (emp) {
                          setNuevoParticipante({ nombre: emp.nombre, cargo: emp.cargo || '', representaA: nuevoParticipante.representaA });
                        } else {
                          setNuevoParticipante((p) => ({ ...p, nombre: val }));
                        }
                      }}
                      placeholder="Nombre completo"
                      style={{ ...s.configInput, width: '100%' }}
                    />
                    <datalist id="asistentes-list">
                      {listaEmpleados.map((emp, i) => (
                        <option key={i} value={`${emp.nombre} (${emp.email})`} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    value={nuevoParticipante.cargo}
                    onChange={(e) => setNuevoParticipante((p) => ({ ...p, cargo: e.target.value }))}
                    placeholder="Cargo (Gerente, Jefe, etc.)"
                    style={s.configInput}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      list="representa-list-asistente"
                      value={nuevoParticipante.representaA || ''}
                      onChange={(e) => setNuevoParticipante((p) => ({ ...p, representaA: e.target.value }))}
                      placeholder="Reemplaza a (opcional)"
                      style={{ ...s.configInput, width: '100%' }}
                    />
                    <datalist id="representa-list-asistente">
                      {listaEmpleados.map((emp, i) => (
                        <option key={i} value={emp.nombre} />
                      ))}
                    </datalist>
                  </div>
                  <button onClick={() => agregarPersona(nuevoParticipante, setNuevoParticipante, 'asistente')} style={s.btnAgregar}>
                    <UserPlus size={14} /> Agregar
                  </button>
                </div>
                {errorCargaEmpleados && (
                  <p style={{ fontSize: 10, color: '#ef4444', margin: '4px 0 0', fontWeight: 600 }}>
                    ⚠️ {errorCargaEmpleados}
                  </p>
                )}
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', fontStyle: 'italic' }}>
                  * Escriba para buscar en el directorio activo.
                </p>
                <div style={s.participantesGrid}>
                  {participantes.filter(p => !p.tipo || p.tipo === 'asistente').length === 0 ? (
                    <p style={s.participantesEmpty}>Aún no hay asistentes. Agrega al menos uno para continuar.</p>
                  ) : (
                    participantes.map((p, idx) => {
                      if (p.tipo && p.tipo !== 'asistente') return null;
                      return (
                        <div key={`asistente-${p.nombre}-${idx}`} style={s.participanteCard}>
                          <div style={s.participanteAvatar}>{String(p.nombre || '?').charAt(0).toUpperCase()}</div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={s.participanteNombre}>{p.nombre}</p>
                            <p style={s.participanteMeta}>
                              {p.cargo}
                              {p.representaA ? ` · Reemplaza a ${p.representaA}` : ''}
                            </p>
                          </div>
                          <button onClick={() => eliminarParticipante(idx)} style={s.btnRemoveParticipante} title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ── Invitados ── */}
              <div style={s.configBlock}>
                <div style={s.seccionPersonasHeader}>
                  <UserPlus size={14} color="#7c3aed" />
                  <span style={{ ...s.configLabel, color: '#7c3aed' }}>Invitados</span>
                  <span style={{ ...s.seccionPersonasBadge, background: '#f5f3ff', color: '#7c3aed', borderColor: '#ddd6fe' }}>
                    {participantes.filter(p => p.tipo === 'invitado').length}
                  </span>
                  <span style={s.seccionPersonasHint}>opcional</span>
                </div>
                <div style={s.participantesFormRow}>
                  <div style={{ position: 'relative' }}>
                    <input
                      list="invitados-list"
                      value={nuevoInvitado.nombre}
                      onChange={(e) => {
                        const val = e.target.value;
                        const emp = listaEmpleados.find(u => u.nombre === val || `${u.nombre} (${u.email})` === val);
                        if (emp) {
                          setNuevoInvitado({ nombre: emp.nombre, cargo: emp.cargo || '', representaA: nuevoInvitado.representaA });
                        } else {
                          setNuevoInvitado((p) => ({ ...p, nombre: val }));
                        }
                      }}
                      placeholder="Nombre completo"
                      style={{ ...s.configInput, width: '100%' }}
                    />
                    <datalist id="invitados-list">
                      {listaEmpleados.map((emp, i) => (
                        <option key={i} value={`${emp.nombre} (${emp.email})`} />
                      ))}
                    </datalist>
                  </div>
                  <input
                    value={nuevoInvitado.cargo}
                    onChange={(e) => setNuevoInvitado((p) => ({ ...p, cargo: e.target.value }))}
                    placeholder="Cargo (Gerente, Jefe, etc.)"
                    style={s.configInput}
                  />
                  <div style={{ position: 'relative' }}>
                    <input
                      list="representa-list-invitado"
                      value={nuevoInvitado.representaA || ''}
                      onChange={(e) => setNuevoInvitado((p) => ({ ...p, representaA: e.target.value }))}
                      placeholder="Reemplaza a (opcional)"
                      style={{ ...s.configInput, width: '100%' }}
                    />
                    <datalist id="representa-list-invitado">
                      {listaEmpleados.map((emp, i) => (
                        <option key={i} value={emp.nombre} />
                      ))}
                    </datalist>
                  </div>
                  <button
                    onClick={() => agregarPersona(nuevoInvitado, setNuevoInvitado, 'invitado')}
                    style={{ ...s.btnAgregar, background: '#7c3aed' }}
                  >
                    <UserPlus size={14} /> Agregar
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#64748b', margin: '4px 0 0', fontStyle: 'italic' }}>
                  * Escriba para buscar en el directorio activo.
                </p>
                <div style={s.participantesGrid}>
                  {participantes.filter(p => p.tipo === 'invitado').length === 0 ? (
                    <p style={s.participantesEmpty}>Sin invitados aún. Este campo es opcional.</p>
                  ) : (
                    participantes.map((p, idx) => {
                      if (p.tipo !== 'invitado') return null;
                      return (
                        <div key={`invitado-${p.nombre}-${idx}`} style={{ ...s.participanteCard, borderColor: '#ddd6fe' }}>
                          <div style={{ ...s.participanteAvatar, background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
                            {String(p.nombre || '?').charAt(0).toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <p style={s.participanteNombre}>{p.nombre}</p>
                            <p style={s.participanteMeta}>
                              {p.cargo}
                              {p.representaA ? ` · Reemplaza a ${p.representaA}` : ''}
                            </p>
                          </div>
                          <button onClick={() => eliminarParticipante(idx)} style={s.btnRemoveParticipante} title="Eliminar">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div style={s.configFooter}>
                <p style={s.configResumen}>
                  {actaNumero ? <strong style={{ color: '#111827' }}>Acta {actaNumero}</strong> : 'Falta número de acta'}
                  {' · '}{participantes.filter(p => !p.tipo || p.tipo === 'asistente').length} asistente{participantes.filter(p => !p.tipo || p.tipo === 'asistente').length !== 1 ? 's' : ''}
                  {participantes.filter(p => p.tipo === 'invitado').length > 0 && (
                    <> · {participantes.filter(p => p.tipo === 'invitado').length} invitado{participantes.filter(p => p.tipo === 'invitado').length !== 1 ? 's' : ''}</>
                  )}
                </p>
                <button onClick={iniciarComite} style={s.btnPrimary}>
                  Iniciar comité <ArrowRight size={15} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FASE: SELECCION ── */}
        {fase === 'seleccion' && (
          <>
            <div style={s.comiteActivoBanner}>
              <div>
                <p style={s.bannerTitle}>
                  <span style={s.dotActivo} /> Comité activo · Acta {actaNumero}
                </p>
                <p style={s.bannerSub}>
                  Iniciado{' '}
                  {comiteIniciadoEn ? new Date(comiteIniciadoEn).toLocaleString('es-CO') : ''} · {participantes.length} participante
                  {participantes.length !== 1 ? 's' : ''}: {participantes.map((p) => p.nombre).join(', ')}
                </p>
              </div>
            </div>

            {/* Toolbar */}
            <div style={s.toolBar}>
              <div style={s.searchBox}>
                <Search size={16} color="#9ca3af" style={{ flexShrink: 0 }} />
                <input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por código, objeto, solicitante, gerencia..."
                  style={s.searchInput}
                />
                {busqueda && (
                  <button onClick={() => setBusqueda('')} style={s.clearSearch}>
                    <XCircle size={15} color="#9ca3af" />
                  </button>
                )}
              </div>

              <div style={s.resultsCount}>
                <Filter size={13} color="#9ca3af" />
                <span style={s.resultsCountText}>
                  {solicitudesFiltradas.length} resultado{solicitudesFiltradas.length !== 1 ? 's' : ''}
                </span>
              </div>

              {seleccionadas.size > 0 && (
                <div style={s.selectionBanner}>
                  <AlertCircle size={14} color="var(--brand-secondary)" />
                  <span style={{ color: 'var(--brand-secondary)', fontWeight: 700, fontSize: 12 }}>
                    {seleccionadas.size} seleccionada{seleccionadas.size > 1 ? 's' : ''}
                  </span>
                  <button onClick={() => setSeleccionadas(new Set())} style={s.btnClearSel}>
                    Limpiar
                  </button>
                </div>
              )}
            </div>

            {/* Tabla */}
            <div style={s.tableContainer}>
              {cargando ? (
                <div style={s.emptyState}>
                  <div style={s.loadingSpinner} />
                  <p style={s.emptyText}>Cargando solicitudes...</p>
                </div>
              ) : solicitudesFiltradas.length === 0 ? (
                <div style={s.emptyState}>
                  <div style={s.emptyIcon}>
                    <ClipboardList size={32} color="#cbd5e1" />
                  </div>
                  <p style={s.emptyTitle}>Sin resultados</p>
                  <p style={s.emptyText}>
                    {busqueda ? 'No hay coincidencias con la búsqueda actual.' : 'No hay solicitudes pendientes para comité.'}
                  </p>
                </div>
              ) : (
                <table style={s.table}>
                  <thead>
                    <tr style={s.thead}>
                      <th style={{ ...s.th, width: 48, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={solicitudesFiltradas.length > 0 && seleccionadas.size === solicitudesFiltradas.length}
                          onChange={toggleSeleccionTodas}
                          style={s.checkbox}
                          title="Seleccionar todas"
                        />
                      </th>
                      <th style={s.th}>CÓDIGO</th>
                      <th style={{ ...s.th, width: '35%' }}>OBJETO</th>
                      <th style={s.th}>SOLICITANTE</th>
                      <th style={s.th}>MODALIDAD</th>
                      <th style={{ ...s.th, textAlign: 'right' }}>MONTO (COP)</th>
                      <th style={{ ...s.th, textAlign: 'center' }}>VISTA RÁPIDA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {solicitudesFiltradas.map((sol, idx) => {
                      const isSelected = seleccionadas.has(sol.id);
                      return (
                        <tr
                          key={sol.id}
                          style={{
                            ...s.tr,
                            background: isSelected ? '#eff6ff' : idx % 2 === 0 ? '#ffffff' : '#fafafa',
                            borderLeft: isSelected ? '3px solid var(--brand-secondary)' : '3px solid transparent',
                          }}
                        >
                          <td style={{ ...s.td, textAlign: 'center', paddingLeft: 13 }}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSeleccion(sol.id)}
                              style={s.checkbox}
                            />
                          </td>
                          <td style={s.td}>
                            <span style={s.codeBadge}>{sol.codigo}</span>
                            {sol.version && <span style={s.versionTag}>v{sol.version}</span>}
                          </td>
                          <td style={s.td}>
                            <p style={s.objetoText}>{sol.titulo_contrato || sol.objeto}</p>
                            {sol.lugar_ejecucion && <p style={s.metaText}>📍 {sol.lugar_ejecucion}</p>}
                          </td>
                          <td style={s.td}>
                            <div style={s.personCell}>
                              <div style={s.avatar}>{String(sol.solicitante_nombre || 'S').charAt(0).toUpperCase()}</div>
                              <div>
                                <p style={s.personName}>{sol.solicitante_nombre}</p>
                                <p style={s.personGerencia}>{nombreGerenciaCompleto(sol.gerencia_nombre)}</p>
                              </div>
                            </div>
                          </td>
                          <td style={s.td}>
                            {sol.modalidad ? (
                              <span style={s.modalidadBadge}>{sol.modalidad}</span>
                            ) : (
                              <span style={s.noDataTag}>—</span>
                            )}
                          </td>
                          <td style={{ ...s.td, textAlign: 'right' }}>
                            {(() => {
                              const m = String(sol.moneda || 'COP').toUpperCase();
                              const valorTexto = m === 'USD' ? sol.valor_moneda_usd_texto :
                                                 m === 'EUR' ? sol.valor_moneda_eur_texto :
                                                 sol.valor_moneda_cop_texto;
                              return (
                                <p style={s.montoText}>
                                  {valorTexto
                                    ? `${sol.moneda || 'COP'} ${valorTexto}`
                                    : formatter.format(Number(sol.valor_en_cop || sol.valor_estimado))}
                                </p>
                              );
                            })()}
                            {sol.moneda && sol.moneda !== 'COP' && <p style={s.monedaTag}>{sol.moneda}</p>}
                          </td>
                          <td style={{ ...s.td, textAlign: 'center' }}>
                            <button onClick={() => setSolicitudIdSeleccionada(sol.id)} style={s.btnVerDetalle}>
                              <FileText size={13} /> Ver
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Barra inferior continuar */}
            <div style={s.bottomActions}>
              <button onClick={() => setFase('config')} style={s.btnSecundario}>
                <ArrowLeft size={14} /> Atrás
              </button>
              <div style={s.bottomSummary}>
                <Clock size={13} color="#9ca3af" />
                <span>
                  {seleccionadas.size} de {solicitudesFiltradas.length} seleccionadas
                </span>
              </div>
              <button
                onClick={continuarASesion}
                disabled={seleccionadas.size === 0}
                style={{
                  ...s.btnPrimary,
                  ...(seleccionadas.size === 0 ? s.btnPrimaryDisabled : {}),
                }}
              >
                Continuar a sesión ({seleccionadas.size}) <ArrowRight size={15} />
              </button>
            </div>
          </>
        )}
        </>}

      </main>
    </div>
  );
}

/* ─────────────── Estilos ─────────────── */
const s: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Gabarito', sans-serif",
    background: 'var(--ui-bg)',
    margin: 0,
    padding: 0,
  },
  sidebar: {
    width: 248,
    minHeight: '100vh',
    background: 'var(--brand-secondary)',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
    position: 'fixed',
    top: 0,
    left: 0,
    height: '100vh',
    overflowY: 'auto',
    boxShadow: '2px 0 8px rgba(15,23,42,0.12)',
  },
  sidebarBrand: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '22px 18px 16px',
    borderBottom: '1px solid rgba(255,255,255,0.08)',
  },
  sidebarIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'linear-gradient(135deg, var(--brand-secondary), #245782)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 4px rgba(15,23,42,0.14)',
    flexShrink: 0,
  },
  sidebarTitle: { color: '#ffffff', fontWeight: 800, fontSize: 14, margin: 0 },
  sidebarSubtitle: { color: 'rgba(255,255,255,0.5)', fontSize: 10, margin: '2px 0 0', fontWeight: 500 },
  sidebarNav: { padding: '12px 10px' },
  navItemActive: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: '#ffffff',
    fontSize: 12, fontWeight: 700, cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)',
    width: '100%', textAlign: 'left' as const, fontFamily: "'Gabarito', sans-serif",
    marginBottom: 4,
  },
  navItem: {
    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
    borderRadius: 8, background: 'transparent', color: 'rgba(255,255,255,0.6)',
    fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid transparent',
    width: '100%', textAlign: 'left' as const, fontFamily: "'Gabarito', sans-serif",
    marginBottom: 4,
  },
  navBadge: {
    marginLeft: 'auto' as const, background: 'rgba(255,255,255,0.2)',
    color: '#fff', borderRadius: 10, fontSize: 10, fontWeight: 800,
    padding: '2px 7px', minWidth: 18, textAlign: 'center' as const,
  },
  sidebarMetrics: { padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', borderBottom: '1px solid rgba(255,255,255,0.06)' },
  sidebarMetricLabel: { fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.15em', marginBottom: 12 },
  metricCardSide: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 },
  metricDot: { width: 8, height: 8, borderRadius: '50%', flexShrink: 0 },
  metricSideValue: { color: '#ffffff', fontWeight: 800, fontSize: 16, lineHeight: 1, margin: 0 },
  metricSideText: { color: 'rgba(255,255,255,0.45)', fontSize: 11, margin: '2px 0 0' },
  flujoGuia: { padding: '16px 20px', marginTop: 'auto', flexGrow: 1, display: 'flex', flexDirection: 'column' },
  flujoTitleTop: { fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 },
  flujoStep: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  flujoNum: {
    width: 22, height: 22, borderRadius: '50%',
    fontSize: 10, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, border: '1px solid',
  },
  flujoText: { fontSize: 11, lineHeight: 1.3, margin: 0 },

  main: { flex: 1, minWidth: 0, marginLeft: 248, padding: '16px 22px 20px', display: 'flex', flexDirection: 'column', gap: 14, minHeight: '100vh' },
  topBar: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 24 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 },
  breadcrumbText: { fontSize: 12, color: '#9ca3af', fontWeight: 600 },
  pageTitle: { fontSize: 28, fontWeight: 900, color: '#111827', margin: 0, letterSpacing: '-0.4px' },
  pageDesc: { fontSize: 13, color: '#64748b', margin: '4px 0 0', fontWeight: 500, maxWidth: 640 },
  topBarActions: { display: 'flex', gap: 10, alignItems: 'center', flexShrink: 0 },
  btnRefresh: {
    display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px',
    borderRadius: 8, background: '#ffffff', border: '1px solid #e5e7eb',
    color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', fontFamily: "'Gabarito', sans-serif",
  },
  btnSecundario: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 14px', borderRadius: 8,
    background: '#ffffff', border: '1px solid #e5e7eb',
    color: '#374151', fontSize: 12, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
  },

  stepper: {
    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 10,
  },
  stepperItem: { display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 },
  stepperNum: {
    width: 22, height: 22, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 11, fontWeight: 900,
  },
  stepperLabel: { fontSize: 12 },
  stepperSep: { flex: 1, height: 2, borderRadius: 2, margin: '0 4px' },

  // Config
  configWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 16,
    width: '100%',
  },
  configCard: {
    maxWidth: 980, width: '100%',
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14,
    padding: '22px 24px', boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
    display: 'flex', flexDirection: 'column', gap: 18,
  },

  // Preview de solicitudes pendientes
  previewCard: {
    maxWidth: 980, width: '100%',
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14,
    padding: '20px 22px', boxShadow: '0 2px 12px rgba(15,23,42,0.06)',
    display: 'flex', flexDirection: 'column' as const, gap: 16,
  },
  previewHeader: {
    display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
    gap: 16, flexWrap: 'wrap' as const,
  },
  previewHeaderLeft: { display: 'flex', gap: 12, alignItems: 'flex-start', flex: 1, minWidth: 0 },
  previewHeaderIcon: {
    width: 38, height: 38, borderRadius: 10,
    background: '#FEE4DA', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  previewEyebrow: {
    margin: 0, fontSize: 10, fontWeight: 800, color: '#E84922',
    letterSpacing: '0.12em', textTransform: 'uppercase' as const,
  },
  previewTitle: {
    margin: '2px 0 0', fontSize: 16, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px',
  },
  previewSub: {
    margin: '3px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500,
  },
  previewToggle: {
    background: '#f8fafc', border: '1px solid #e5e7eb', color: '#374151',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    padding: '7px 12px', borderRadius: 8,
    fontFamily: "'Gabarito', sans-serif", whiteSpace: 'nowrap' as const,
  },
  previewKpis: {
    display: 'grid', gap: 12,
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  },
  kpiCard: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
    padding: '12px 14px', border: '1px solid #e5e7eb', borderRadius: 10,
    background: '#fafafa',
  },
  kpiIcon: {
    width: 32, height: 32, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  kpiValue: { margin: 0, fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.3px' },
  kpiLabel: { margin: '4px 0 0', fontSize: 11, color: '#64748b', fontWeight: 600 },
  kpiMultiList: { display: 'flex', flexDirection: 'column' as const, gap: 4 },
  kpiMultiRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    padding: '4px 8px',
  },
  kpiMultiTag: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '0.06em',
    padding: '2px 6px',
    borderRadius: 4,
    background: '#1e1040',
    color: '#fff',
  },
  kpiMultiVal: {
    fontSize: 13,
    fontWeight: 800,
    color: '#0f172a',
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    whiteSpace: 'nowrap' as const,
  },
  minRow: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 },
  minLabel: { fontSize: 10, color: '#6b7280', fontWeight: 600 },
  minInput: {
    width: 50, padding: '4px 6px', borderRadius: 6,
    border: '1px solid #e5e7eb', textAlign: 'center' as const,
    fontSize: 12, fontWeight: 800, color: '#111827',
    fontFamily: "'Gabarito', sans-serif", outline: 'none',
  },
  previewListWrap: {
    borderTop: '1px solid #f1f5f9', paddingTop: 14,
  },
  previewList: {
    display: 'flex', flexDirection: 'column' as const, gap: 8,
    maxHeight: 360, overflowY: 'auto' as const, paddingRight: 2,
  },
  previewItem: {
    borderRadius: 10,
    borderTop: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0',
    borderLeft: '4px solid #245782',
    padding: '14px 18px 14px 16px',
    display: 'flex', flexDirection: 'row' as const,
    alignItems: 'center', gap: 14, background: '#ffffff',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'box-shadow 0.2s',
  },
  previewItemLeft: {
    display: 'flex', flexDirection: 'column' as const, gap: 5, flex: 1, minWidth: 0,
  },
  previewItemRight: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'flex-end',
    gap: 8, flexShrink: 0,
  },
  previewItemHead: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const },
  previewItemMeta: { display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' as const },
  previewItemIdx: {
    width: 28, height: 28, borderRadius: '50%',
    background: '#245782', color: '#ffffff',
    fontSize: 12, fontWeight: 900, flexShrink: 0,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(36,87,130,0.25)',
  },
  previewItemCodigo: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 5,
    background: '#EFF6FF', color: '#1D4ED8',
    fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
    border: '1px solid #BFDBFE',
  },
  previewModalidad: {
    display: 'inline-block', padding: '3px 9px', borderRadius: 12,
    background: '#FEF3C7', color: '#92400E',
    fontSize: 9, fontWeight: 800, letterSpacing: '0.05em', textTransform: 'uppercase' as const,
    border: '1px solid #FDE68A',
  },
  previewItemObjeto: {
    margin: 0, fontSize: 14, color: '#0f172a', fontWeight: 700, lineHeight: 1.3,
    display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
  },
  previewItemMetaItem: { display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500, fontSize: 11, color: '#64748b' },
  previewItemMonto: {
    fontSize: 13, fontWeight: 800, color: '#059669',
    background: '#F0FDF4', padding: '5px 12px', borderRadius: 8,
    border: '1px solid #A7F3D0', fontVariantNumeric: 'tabular-nums' as const,
    whiteSpace: 'nowrap' as const, letterSpacing: '-0.01em',
  },
  previewItemBtn: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 14px', borderRadius: 7,
    background: '#245782', color: '#ffffff', border: 'none',
    fontSize: 11, fontWeight: 700, cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif",
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 1px 3px rgba(36,87,130,0.3)',
  },
  previewLoading: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 10,
  },
  previewEmpty: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    padding: 24, gap: 8,
    background: '#f8fafc', borderRadius: 10, border: '1.5px dashed #e2e8f0',
  },
  previewEmptyTitle: { margin: 0, fontSize: 13, fontWeight: 800, color: '#374151' },
  previewEmptyText: { margin: 0, fontSize: 11, color: '#94a3b8', textAlign: 'center' as const, fontWeight: 500 },
  configHeader: { display: 'flex', gap: 14, alignItems: 'flex-start' },
  configHeaderIcon: {
    width: 44, height: 44, borderRadius: 12,
    background: '#FEE4DA', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  configEyebrow: { margin: 0, fontSize: 10, fontWeight: 800, color: '#E84922', letterSpacing: '0.14em', textTransform: 'uppercase' },
  configTitle: { margin: '2px 0 0', fontSize: 20, fontWeight: 900, color: '#0f172a' },
  configSub: { margin: '3px 0 0', fontSize: 12, color: '#64748b', fontWeight: 500 },
  configBlock: { display: 'flex', flexDirection: 'column', gap: 8 },
  configLabel: { fontSize: 11, fontWeight: 800, color: '#374151', letterSpacing: '0.05em', textTransform: 'uppercase' },
  seccionPersonasHeader: {
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '8px 10px', borderRadius: 8,
    background: '#f8fafc', border: '1px solid #e5e7eb',
  },
  seccionPersonasBadge: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    minWidth: 20, height: 20, padding: '0 6px',
    borderRadius: 999, background: '#eff6ff', color: '#245782',
    border: '1px solid #bfdbfe', fontSize: 10, fontWeight: 800,
  },
  seccionPersonasHint: {
    marginLeft: 4, fontSize: 10, color: '#9ca3af', fontWeight: 500, fontStyle: 'italic',
  },
  configInputLarge: {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid #e5e7eb', background: '#ffffff',
    fontSize: 14, fontWeight: 700, color: '#0f172a',
    fontFamily: "'Gabarito', sans-serif", outline: 'none',
    boxSizing: 'border-box',
  },
  configInput: {
    padding: '9px 12px', borderRadius: 8,
    border: '1px solid #e5e7eb', background: '#ffffff',
    fontSize: 12, color: '#374151',
    fontFamily: "'Gabarito', sans-serif", outline: 'none',
  },
  configHint: { margin: 0, fontSize: 11, color: '#6b7280', fontWeight: 500 },
  participantesFormRow: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr auto', gap: 8 },
  btnAgregar: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '9px 14px', borderRadius: 8,
    background: 'var(--brand-secondary)', color: '#fff',
    border: 'none', fontSize: 12, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Gabarito', sans-serif",
  },
  participantesGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 8,
    marginTop: 4,
  },
  participantesEmpty: {
    gridColumn: '1 / -1',
    margin: 0, padding: '12px 14px',
    border: '1.5px dashed #e2e8f0', borderRadius: 10,
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    fontWeight: 600, background: '#f8fafc',
  },
  participanteCard: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: 10, border: '1px solid #e5e7eb', borderRadius: 10,
    background: '#ffffff',
  },
  participanteAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3D2B86, #7c3aed)',
    color: '#fff', fontWeight: 900, fontSize: 13,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  participanteNombre: { margin: 0, fontSize: 12, fontWeight: 800, color: '#111827' },
  participanteMeta: { margin: '2px 0 0', fontSize: 11, color: '#6b7280', fontWeight: 500 },
  btnRemoveParticipante: {
    background: 'none', border: 'none', color: '#ef4444',
    cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  },
  configFooter: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    gap: 10, borderTop: '1px solid #f1f5f9', paddingTop: 14,
  },
  configResumen: { margin: 0, fontSize: 12, color: '#6b7280', fontWeight: 600 },

  // Selección
  comiteActivoBanner: {
    display: 'flex', justifyContent: 'space-between', gap: 12,
    padding: '12px 16px', borderRadius: 10,
    background: '#ECFDF5', border: '1.5px solid #A7F3D0',
  },
  bannerTitle: { margin: 0, fontSize: 12, fontWeight: 800, color: '#065F46', display: 'inline-flex', alignItems: 'center', gap: 8 },
  bannerSub: { margin: '3px 0 0', fontSize: 11, color: '#047857', fontWeight: 600 },
  dotActivo: { width: 9, height: 9, borderRadius: '50%', background: '#10B981', display: 'inline-block', boxShadow: '0 0 0 3px rgba(16,185,129,0.25)' },
  toolBar: { display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  searchBox: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '8px 12px', borderRadius: 10,
    background: '#ffffff', border: '1px solid #e5e7eb',
    flex: 1, minWidth: 260, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  searchInput: {
    flex: 1, border: 'none', outline: 'none', background: 'transparent',
    fontSize: 12, color: '#374151', fontFamily: "'Gabarito', sans-serif", fontWeight: 500,
  },
  clearSearch: { background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' },
  resultsCount: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '7px 12px', borderRadius: 8, background: '#ffffff', border: '1px solid #e5e7eb',
  },
  resultsCountText: { fontSize: 11, color: '#6b7280', fontWeight: 600 },
  selectionBanner: {
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '7px 12px', borderRadius: 8, background: '#eff6ff', border: '1.5px solid #bfdbfe',
  },
  btnClearSel: {
    fontSize: 11, color: 'var(--brand-secondary)', fontWeight: 700,
    background: 'none', border: 'none', cursor: 'pointer',
    fontFamily: "'Gabarito', sans-serif", textDecoration: 'underline',
  },

  tableContainer: {
    background: '#ffffff', borderRadius: 10, border: '1px solid #dde3ea',
    overflow: 'hidden', boxShadow: '0 1px 2px rgba(15,23,42,0.05)', flex: 1,
  },
  table: { width: '100%', borderCollapse: 'collapse' },
  thead: { background: 'linear-gradient(135deg, #245782 0%, var(--brand-secondary) 100%)' },
  th: {
    padding: '11px 12px', textAlign: 'left', fontSize: 9, fontWeight: 800,
    color: 'rgba(255,255,255,0.75)', letterSpacing: '0.1em',
    textTransform: 'uppercase', whiteSpace: 'nowrap',
  },
  tr: { transition: 'background 0.15s, border-left 0.15s', borderBottom: '1px solid #f3f4f6' },
  td: { padding: '11px 12px', verticalAlign: 'middle' },
  checkbox: { width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--brand-secondary)' },
  codeBadge: { display: 'inline-block', padding: '4px 10px', borderRadius: 5, background: '#eff6ff', color: 'var(--brand-secondary)', fontSize: 10, fontWeight: 800, letterSpacing: '0.03em' },
  versionTag: { display: 'inline-block', marginLeft: 6, fontSize: 9, color: '#9ca3af', fontWeight: 600 },
  objetoText: {
    fontSize: 12, fontWeight: 700, color: '#111827', margin: 0,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.4,
  },
  metaText: { fontSize: 10, color: '#9ca3af', margin: '4px 0 0', fontWeight: 500 },
  personCell: { display: 'flex', alignItems: 'center', gap: 10 },
  avatar: {
    width: 30, height: 30, borderRadius: '50%',
    background: 'linear-gradient(135deg, #245782, var(--brand-secondary))',
    color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 12, fontWeight: 800, flexShrink: 0,
  },
  personName: { fontSize: 11, fontWeight: 700, color: '#111827', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 },
  personGerencia: { fontSize: 9, color: '#9ca3af', margin: '2px 0 0', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 130 },
  modalidadBadge: {
    display: 'inline-block', padding: '4px 10px', borderRadius: 16,
    background: '#FEF3C7', color: '#92400E',
    fontSize: 9, fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase',
  },
  noDataTag: { color: '#d1d5db', fontSize: 12 },
  montoText: { fontSize: 12, fontWeight: 800, color: '#111827', fontVariantNumeric: 'tabular-nums', margin: 0 },
  monedaTag: { fontSize: 9, color: '#9ca3af', margin: '2px 0 0', textAlign: 'right' },
  btnVerDetalle: {
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '7px 12px', borderRadius: 6,
    background: '#E84922', color: '#ffffff',
    fontSize: 10, fontWeight: 700, cursor: 'pointer', border: 'none',
    fontFamily: "'Gabarito', sans-serif", letterSpacing: '0.03em',
    boxShadow: '0 1px 4px rgba(232,73,34,0.22)', whiteSpace: 'nowrap',
  },

  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '56px 20px', gap: 12 },
  loadingSpinner: { width: 36, height: 36, borderRadius: '50%', border: '3px solid #e5e7eb', borderTopColor: 'var(--brand-secondary)', animation: 'spin 0.7s linear infinite' },
  emptyIcon: { width: 64, height: 64, borderRadius: '50%', background: '#f8fafc', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 15, fontWeight: 800, color: '#374151', margin: 0 },
  emptyText: { fontSize: 12, color: '#9ca3af', margin: 0, fontWeight: 500, textAlign: 'center' },

  bottomActions: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    gap: 12, padding: '12px 16px',
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 12,
    position: 'sticky', bottom: 12, boxShadow: '0 4px 16px rgba(15,23,42,0.08)',
  },
  bottomSummary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    fontSize: 12, color: '#374151', fontWeight: 700,
  },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 7,
    padding: '10px 16px', borderRadius: 10,
    background: 'linear-gradient(135deg, #E84922, #ea580c)',
    color: '#ffffff', border: 'none',
    fontSize: 13, fontWeight: 800, cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(232,73,34,0.3)',
    fontFamily: "'Gabarito', sans-serif",
  },
  btnPrimaryDisabled: {
    background: '#d1d5db', boxShadow: 'none', cursor: 'not-allowed', color: '#6b7280',
  },

  // Historial de actas
  historialEmpty: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center',
    padding: '72px 20px', gap: 14, flex: 1,
  },
  historialEmptyIcon: {
    width: 80, height: 80, borderRadius: '50%',
    background: '#f8fafc', border: '2px dashed #e2e8f0',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  historialGrid: {
    display: 'grid', gap: 14,
    gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
  },
  historialCard: {
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 14,
    padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.05)',
    display: 'flex', flexDirection: 'column' as const, gap: 14,
  },
  historialCardHeader: {
    display: 'flex', alignItems: 'flex-start', gap: 12,
  },
  historialCardIconWrap: {
    width: 42, height: 42, borderRadius: 10,
    background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  historialActaNum: {
    margin: 0, fontSize: 15, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.2px',
  },
  historialFechaRow: {
    display: 'flex', alignItems: 'center', gap: 5, marginTop: 4,
  },
  historialFecha: {
    fontSize: 11, color: '#6b7280', fontWeight: 500,
  },
  btnVerActa: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '8px 14px', borderRadius: 8,
    background: 'linear-gradient(135deg, #245782, var(--brand-secondary))',
    color: '#fff', border: 'none', fontSize: 11, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Gabarito', sans-serif",
    flexShrink: 0, whiteSpace: 'nowrap' as const,
    boxShadow: '0 2px 8px rgba(36,87,130,0.25)',
  },
  historialStats: {
    display: 'flex', gap: 8, flexWrap: 'wrap' as const,
    padding: '10px 12px', borderRadius: 10,
    background: '#f8fafc', border: '1px solid #f1f5f9',
  },
  historialStat: {
    display: 'flex', flexDirection: 'column' as const, alignItems: 'center',
    gap: 2, flex: 1, minWidth: 50,
  },
  historialStatNum: {
    fontSize: 18, fontWeight: 900, color: '#0f172a', lineHeight: 1, letterSpacing: '-0.3px',
  },
  historialStatLabel: {
    fontSize: 9, color: '#94a3b8', fontWeight: 700, letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  },
  historialParticipantesRow: {
    display: 'flex', alignItems: 'center', gap: 6,
  },
  historialParticipantesText: {
    fontSize: 11, color: '#6b7280', fontWeight: 500,
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const,
  },
  badgeReconstruida: {
    display: 'inline-block', padding: '2px 8px', borderRadius: 12,
    background: '#F0FDF4', color: '#16a34a', border: '1px solid #bbf7d0',
    fontSize: 9, fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
  },
};

// Anim (una sola vez)
if (typeof document !== 'undefined' && !document.head.querySelector('[data-secretaria-anim]')) {
  const _tag = document.createElement('style');
  _tag.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
  _tag.setAttribute('data-secretaria-anim', '1');
  document.head.appendChild(_tag);
}
