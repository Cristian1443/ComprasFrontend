import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Save, Send, FileText, FolderOpen, User, Building2, Shield, ChevronDown, ChevronUp, Lock, Plus, Trash2, Calendar, Download } from 'lucide-react';
import { datosExistentes } from './datosSolicitudes';
import { TrazabilidadFlujo } from '../shared/TrazabilidadFlujo';
import { FormatoPlaneacionImprimible } from '../secretaria/FormatoPlaneacionImprimible';
import { useMsal } from "@azure/msal-react";
import { getCompanyUsers, getCompanyUsersFromGroup } from "../../lib/graphService";
import { loginRequest } from "../../authConfig";

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';

/* ─────────────────── InstructionHint ─────────────────── */
function InstructionHint({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: 6 }}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(o => !o); }}
        title={open ? 'Ocultar instrucción' : 'Ver instrucción'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--brand-primary)', fontSize: 15, lineHeight: 1,
          display: 'inline-flex', alignItems: 'center', gap: 2, padding: '0 2px'
        }}
      >
        ⓘ {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {open && (
        <span style={{
          display: 'block', position: 'absolute', zIndex: 100, top: '100%', left: 0, marginTop: 6,
          width: 'max-content', maxWidth: 420, backgroundColor: 'rgba(232,73,34,0.08)', border: '1px solid rgba(232,73,34,0.22)',
          borderLeft: '3px solid var(--brand-primary)', borderRadius: 6,
          padding: '8px 12px', fontSize: '0.78rem', color: '#374151',
          lineHeight: 1.5, boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
          pointerEvents: 'none'
        }}>
          {text}
        </span>
      )}
    </span>
  );
}

/* ─────────────── FieldLabel (label + hint) ─────────────── */
function FieldLabel({ label, hint, required: req }: { label: string; hint?: string; required?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 4, position: 'relative' }}>
      <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>
        {label}{req && <span style={{ color: '#DC2626', marginLeft: 2 }}>*</span>}
      </span>
      {hint && <InstructionHint text={hint} />}
    </div>
  );
}

/* ──────────── SectionHeader (banda roja tipo Excel) ──────────── */
function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{
      backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 700,
      fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px',
      letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif'
    }}>
      {title}
    </div>
  );
}

/* ──────────── InfoTip — ícono ⓘ con tooltip fixed (escapa overflow) ──────────── */
function InfoTip({ hint }: { hint: string }) {
  const [coords, setCoords] = React.useState<{ left: number; top: number } | null>(null);
  const btnRef = React.useRef<HTMLButtonElement>(null);
  if (!hint) return null;

  const open = () => {
    if (!btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    const tipW = 280;
    const left = Math.max(8, Math.min(r.left + r.width / 2 - tipW / 2, window.innerWidth - tipW - 8));
    setCoords({ left, top: r.top - 10 });
  };
  const close = () => setCoords(null);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onMouseEnter={open}
        onMouseLeave={close}
        onFocus={open}
        onBlur={close}
        style={{
          width: 18, height: 18, borderRadius: '50%', border: '1.5px solid var(--brand-primary)',
          backgroundColor: 'transparent', color: 'var(--brand-primary)', fontSize: '0.68rem',
          fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
          justifyContent: 'center', fontFamily: 'Gabarito, sans-serif', lineHeight: 1,
          padding: 0, outline: 'none', flexShrink: 0, verticalAlign: 'middle', marginLeft: 4,
        }}
        aria-label="Ver indicación"
      >
        i
      </button>
      {coords && (
        <div style={{
          position: 'fixed',
          left: coords.left,
          top: coords.top,
          transform: 'translateY(-100%)',
          backgroundColor: '#1F2937', color: '#fff',
          padding: '10px 14px', borderRadius: 8,
          fontSize: '0.72rem', lineHeight: 1.6, width: 280, zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.22)', fontStyle: 'italic',
          fontFamily: 'Gabarito, sans-serif', pointerEvents: 'none',
        }}>
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            width: 0, height: 0,
            borderLeft: '7px solid transparent', borderRight: '7px solid transparent',
            borderTop: '7px solid #1F2937',
          }} />
          {hint}
        </div>
      )}
    </>
  );
}

/* ──────────── FinancieraField (readonly para solicitante) ──────────── */
function FinancieraField({
  label, hint, value, onChange, placeholder, rows, esFinanciera
}: {
  label: string; hint?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; rows?: number; esFinanciera: boolean;
}) {
  const locked = !esFinanciera;
  return (
    <div style={{ flex: 1, padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>{label}</span>
        {hint && !locked && <InstructionHint text={hint} />}
        {locked && (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            backgroundColor: '#F3F4F6', border: '1px solid #D1D5DB',
            borderRadius: 9999, padding: '2px 8px', fontSize: '0.7rem',
            color: '#6B7280', fontFamily: 'Gabarito, sans-serif'
          }}>
            <Lock size={10} /> Diligenciado por Financiera
          </span>
        )}
      </div>
      {rows ? (
        <textarea
          value={value}
          onChange={e => !locked && onChange(e.target.value)}
          readOnly={locked}
          rows={rows}
          placeholder={locked ? 'Este campo será completado por el equipo de Financiera' : placeholder}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
            borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem',
            resize: 'none', outline: 'none', minHeight: 80, boxSizing: 'border-box',
            backgroundColor: locked ? '#F3F4F6' : '#fff',
            cursor: locked ? 'not-allowed' : 'text',
            opacity: locked ? 0.75 : 1
          }}
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={e => !locked && onChange(e.target.value)}
          readOnly={locked}
          placeholder={locked ? 'Este campo será completado por el equipo de Financiera' : placeholder}
          style={{
            width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
            borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem',
            outline: 'none', boxSizing: 'border-box',
            backgroundColor: locked ? '#F3F4F6' : '#fff',
            cursor: locked ? 'not-allowed' : 'text',
            opacity: locked ? 0.75 : 1
          }}
        />
      )}
    </div>
  );
}

/* ─────────── TIPOS ─────────── */
interface FormularioSolicitudProps {
  onBack: () => void;
  solicitudId?: string | null;
  supervisorNombre?: string;
  gerencia?: string;
  userEmail?: string;
  modalidadInicial?: 'Directa' | 'Invitación' | 'TDR';
  rol?: 'Solicitante' | 'Financiera' | 'Administrador' | 'Gerente' | 'Juridica';
}

type Tab = 'planeacion' | 'documentos' | 'avanzado';

interface Proponente {
  nombreProveedor: string;
  correo: string;
  datosContacto: string;
  requisitosTecnicos: string;
  experiencia: string;
  criteriosHabilitantes: string;
  valorImpuestos: string;
  valorAgregado: string;
  observaciones: string;
  valorCotizacion: string;
  plazoMeses: string;
  plazoDias: string;
}

interface AnalisisMercado {
  serviciosOfertados: string;
  valorPromedio: string;
  plazoPromedioMeses: string;
  plazoPromedioDias: string;
  presupuestoOficial: string;
}

interface Anexo {
  nombre: string;
  tipo: string;
  fecha: string;
}

function normalizarModalidad(valor: string | null | undefined): 'directa' | 'invitacion' | 'tdr' {
  const limpio = String(valor || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();

  if (limpio.includes('tdr')) return 'tdr';
  if (limpio.includes('invit')) return 'invitacion';
  return 'directa';
}

/* ─────────────────── COMPONENTE PRINCIPAL ─────────────────── */
export function FormularioSolicitud({
  onBack, solicitudId, supervisorNombre, gerencia, userEmail, modalidadInicial, rol = 'Solicitante'
}: FormularioSolicitudProps) {
  const formRef = useRef<HTMLFormElement | null>(null);
  const { instance, accounts } = useMsal();
  const [listaEmpleados, setListaEmpleados] = useState<{ id: string; nombre: string; cargo: string; email: string }[]>([]);
  const [errorCargaEmpleados, setErrorCargaEmpleados] = useState<string>('');
  const [tabActual, setTabActual] = useState<Tab>('planeacion');
  const [cargandoDetalle, setCargandoDetalle] = useState(false);
  const [estadoActualSolicitud, setEstadoActualSolicitud] = useState<string>('borrador');
  const [resultadoComiteActual, setResultadoComiteActual] = useState<string | null>(null);
  const [comentarioGerenteActual, setComentarioGerenteActual] = useState<string>('');
  const [comentarioJuridicaActual, setComentarioJuridicaActual] = useState<string>('');
  const [solicitudDetalle, setSolicitudDetalle] = useState<any | null>(null);
  const [mostrarFormato, setMostrarFormato] = useState(false);
  // ID interno: se inicializa con la prop pero se actualiza al crear un borrador nuevo
  const [currentSolicitudId, setCurrentSolicitudId] = useState<string | null>(solicitudId ?? null);

  const datosIniciales = (solicitudId && datosExistentes[solicitudId]) ? datosExistentes[solicitudId] : {};
  // Si viene desde "Mis Solicitudes" (tiene id), por defecto es solo lectura;
  // PERO si regresó a borrador (ej. devuelta por comité), sí permite corrección.
  const esVistaExistente = !!(currentSolicitudId && solicitudId);
  const estadosPermitenEdicion = ['borrador', 'devuelto_al_solicitante', 'rechazado_gerente', 'rechazado_financiera', 'rechazado_juridica', 'rechazado_comite'];
  const puedeEditarCorreccion = esVistaExistente && estadosPermitenEdicion.includes(estadoActualSolicitud);
  const modoSoloLectura = esVistaExistente ? !puedeEditarCorreccion : false;
  const esFinanciera = rol === 'Financiera' || rol === 'Administrador';

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
            // Token específico para leer miembros de grupo (no se solicita en login global).
            const groupToken = await instance.acquireTokenSilent({
              scopes: ["User.Read", "User.ReadBasic.All", "GroupMember.Read.All"],
              account: accounts[0]
            });
            graphUsers = await getCompanyUsersFromGroup(groupToken.accessToken, supervisionGroupId);
          } catch (groupError) {
            console.error("No fue posible leer miembros del grupo de supervisión.", groupError);
            // Modo estricto: si hay grupo configurado, NO se hace fallback al directorio completo.
            setListaEmpleados([]);
            setErrorCargaEmpleados('No fue posible cargar miembros del grupo de supervisión. Verifique permisos en Microsoft Graph.');
            return;
          }
        } else {
          const baseToken = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
          });
          graphUsers = await getCompanyUsers(baseToken.accessToken);
        }
        const rawUsers = Array.isArray(graphUsers?.value) ? graphUsers.value : [];

        const mappedUsers = rawUsers
          // Si accountEnabled no viene por permisos, no se descarta el usuario.
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
        console.error("Error general al cargar usuarios activos del directorio:", err);
        setListaEmpleados([]);
        setErrorCargaEmpleados('No fue posible cargar usuarios del directorio. Intente cerrar sesión y volver a ingresar.');
      }
    }
    loadUsers();
  }, [instance, accounts]);

  // Cargar detalle real desde la API cuando entramos desde "Mis Solicitudes"
  useEffect(() => {
    if (!solicitudId) return;

    let cancelado = false;
    const cargarDetalle = async () => {
      try {
        setCargandoDetalle(true);
        const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001';
        const res = await fetch(`${API_URL}/api/solicitudes/${solicitudId}`);
        if (!res.ok) return;
        const det = await res.json();
        if (cancelado) return;
        setEstadoActualSolicitud(String(det.estado || 'borrador'));
        setResultadoComiteActual(det.resultado_comite || null);
        setComentarioGerenteActual(String(det.comentario_gerente || ''));
        setComentarioJuridicaActual(String(det.comentario_juridica || ''));
        setSolicitudDetalle(det);

        setDatosPlaneacion(prev => ({
          ...prev,
          descripcionNecesidad: det.justificacion || prev.descripcionNecesidad,
          descripcionNecesidadDetalle: det.descripcion_necesidad_detalle || prev.descripcionNecesidadDetalle,
          tituloContrato: det.titulo_contrato || prev.tituloContrato,
          objeto: det.objeto || prev.objeto,
          valorEstimado: det.valor_estimado != null ? String(det.valor_estimado) : prev.valorEstimado,
          lugarEjecucion: det.lugar_ejecucion || prev.lugarEjecucion,
          plazoEjecucionMeses: det.plazo_ejecucion_meses != null ? String(det.plazo_ejecucion_meses) : prev.plazoEjecucionMeses,
          plazoEjecucionDias: det.plazo_ejecucion_dias != null ? String(det.plazo_ejecucion_dias) : prev.plazoEjecucionDias,
          modalidad: det.modalidad || prev.modalidad,
          efectoEstimarPresupuesto:
            det.efecto_estimar_presupuesto ||
            prev.efectoEstimarPresupuesto ||
            (det.presupuesto_aprobado
              ? `La Financiera aprobó un presupuesto de ${new Intl.NumberFormat('es-CO', {
                style: 'currency',
                currency: 'COP',
                maximumFractionDigits: 0
              }).format(det.presupuesto_aprobado)}.`
              : prev.efectoEstimarPresupuesto),
          formaPago: det.forma_pago || prev.formaPago,
          justificacionAnticipo: det.justificacion_anticipo || prev.justificacionAnticipo,
          // Mostrar el rubro definitivo asignado por Financiera; si no existe, usar el sugerido por el solicitante.
          rubroPresupuestal: det.rubro || det.rubro_presupuestal || prev.rubroPresupuestal,
          fechaComite: det.fecha_comite
            ? String(det.fecha_comite).slice(0, 10)
            : prev.fechaComite,
          modalidadSeleccion: det.modalidad_seleccion || prev.modalidadSeleccion,
          justificacionCD: det.justificacion_cd || prev.justificacionCD,
          fechaEstimadaSolicitud: det.fecha_estimada_solicitud ? String(det.fecha_estimada_solicitud).slice(0, 10) : prev.fechaEstimadaSolicitud,
          fechaEstimadaRecepcion: det.fecha_estimada_recepcion ? String(det.fecha_estimada_recepcion).slice(0, 10) : prev.fechaEstimadaRecepcion,
          moneda: det.moneda || prev.moneda,
          valorMonedaCOP: det.valor_moneda_cop_texto || (det.valor_moneda_cop != null ? String(det.valor_moneda_cop) : prev.valorMonedaCOP),
          valorMonedaUSD: det.valor_moneda_usd_texto || (det.valor_moneda_usd != null ? String(det.valor_moneda_usd) : prev.valorMonedaUSD),
          valorMonedaEUR: det.valor_moneda_eur_texto || (det.valor_moneda_eur != null ? String(det.valor_moneda_eur) : prev.valorMonedaEUR),
        }));

        setSupervisionEntregables(prev => ({
          ...prev,
          supervision: det.supervision_nombre || prev.supervision,
          supervisionId: det.supervision_id || prev.supervisionId,
          entregables: det.entregables || prev.entregables,
          entregable1: det.entregable1 || prev.entregable1,
          entregable2: det.entregable2 || prev.entregable2,
          entregable3: det.entregable3 || prev.entregable3,
        }));
        if (det.obligaciones_especificas?.length) setObligaciones(det.obligaciones_especificas);
        if (det.entregables_detalle?.length) setEntregablesDetalle(det.entregables_detalle);

        setAnalisisMercado(prev => ({
          serviciosOfertados:  det.analisis_servicios_ofertados   || prev.serviciosOfertados,
          valorPromedio:       det.analisis_valor_promedio        || prev.valorPromedio,
          plazoPromedioMeses:  det.analisis_plazo_promedio_meses  || prev.plazoPromedioMeses,
          plazoPromedioDias:   det.analisis_plazo_promedio_dias   || prev.plazoPromedioDias,
          presupuestoOficial:  det.analisis_presupuesto_oficial   || prev.presupuestoOficial,
        }));

        setRiesgosCriterios(prev => ({
          ...prev,
          riesgos: det.riesgos || prev.riesgos,
          criteriosSST: det.criterios_ambientales_sst || prev.criteriosSST,
        }));

        setAnexosTexto(det.anexos_texto || anexosTexto);
        setArchivosSolicitante(det.anexos_solicitante || []);
        setConclusions(det.conclusiones_comite || conclusiones);

        if (Array.isArray(det.anexosDocs) && det.anexosDocs.length > 0) {
          setAnexosDocs(
            det.anexosDocs.map((a: any) => ({
              nombre: a.nombre || a.nombre_documento || '',
              tipo: a.tipo || '',
              fecha: a.fecha || a.fecha_documento || '',
            }))
          );
        }

        if (Array.isArray(det.proponentes) && det.proponentes.length > 0) {
          setProponentes(
            det.proponentes.map((p: any) => ({
              nombreProveedor: p.nombre_proveedor || '',
              correo: p.correo || '',
              datosContacto: p.datos_contacto || '',
              requisitosTecnicos: p.requisitos_tecnicos || '',
              experiencia: p.experiencia || '',
              criteriosHabilitantes: p.criterios_habilitantes || '',
              valorImpuestos: p.valor_con_impuestos != null ? String(p.valor_con_impuestos) : '',
              valorAgregado: p.valor_agregado || '',
              observaciones: p.observaciones || '',
              valorCotizacion: p.valor_cotizacion != null ? String(p.valor_cotizacion) : '',
              plazoMeses: p.plazo_meses != null ? String(p.plazo_meses) : '',
              plazoDias: p.plazo_dias != null ? String(p.plazo_dias) : '',
            }))
          );
        }
      } catch (e) {
        console.error('Error cargando detalle de solicitud (supervisor):', e);
      } finally {
        if (!cancelado) setCargandoDetalle(false);
      }
    };

    cargarDetalle();
    return () => { cancelado = true; };
  }, [solicitudId]);

  const [datosEncabezado] = useState({
    codigo: solicitudId || 'F30-MA-GAF-02',
    version: 'V3',
    gerencia: gerencia || 'Gerencia no asignada',
    solicitante: supervisorNombre || 'Usuario',
    fechaSolicitud: new Date().toLocaleDateString('es-CO'),
  });

  const scrollAlInicio = () => {
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      const scrollableParent = formRef.current?.closest('.overflow-y-auto') as HTMLElement | null;
      if (scrollableParent) scrollableParent.scrollTop = 0;
      window.scrollTo({ top: 0, behavior: 'smooth' });
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    });
  };

  useEffect(() => {
    scrollAlInicio();
  }, [tabActual]);

  const irASiguiente = () => {
    if (tabActual === 'planeacion') setTabActual('avanzado');
    else if (tabActual === 'avanzado') setTabActual('documentos');
    scrollAlInicio();
  };

  const irAAnterior = () => {
    if (tabActual === 'documentos') setTabActual('avanzado');
    else if (tabActual === 'avanzado') setTabActual('planeacion');
    scrollAlInicio();
  };

  const [datosPlaneacion, setDatosPlaneacion] = useState({
    descripcionNecesidad: datosIniciales.descripcionNecesidad || '',
    descripcionNecesidadDetalle: datosIniciales.descripcionNecesidadDetalle || '',
    tituloContrato: datosIniciales.tituloContrato || '',
    objeto: datosIniciales.objeto || '',
    valorEstimado: datosIniciales.valorEstimado || '',
    modalidad: modalidadInicial || datosIniciales.modalidad || 'directa',
    justificacionCD: datosIniciales.justificacionCD || '',
    fechaComite: datosIniciales.fechaComite || '',
    modalidadSeleccion: datosIniciales.modalidadSeleccion || '',
    fechaEstimadaSolicitud: datosIniciales.fechaEstimadaSolicitud || '',
    fechaEstimadaRecepcion: datosIniciales.fechaEstimadaRecepcion || '',
    lugarEjecucion: datosIniciales.lugarEjecucion || '',
    efectoEstimarPresupuesto: datosIniciales.efectoEstimarPresupuesto || '',
    rubroPresupuestal: datosIniciales.rubroPresupuestal || '',
    formaPago: datosIniciales.formaPago || '',
    justificacionAnticipo: datosIniciales.justificacionAnticipo || '',
    moneda: datosIniciales.moneda || 'COP',
    valorMonedaCOP: datosIniciales.valorMonedaCOP || '',
    valorMonedaUSD: datosIniciales.valorMonedaUSD || '',
    valorMonedaEUR: datosIniciales.valorMonedaEUR || '',
    monedasSeleccionadas: datosIniciales.monedasSeleccionadas || [] as string[],
    plazoEjecucionMeses: datosIniciales.plazoEjecucionMeses || '',
    plazoEjecucionDias: datosIniciales.plazoEjecucionDias || '',
  });

  // Convierte texto monetario a número para validaciones sin imponer formato en UI.
  const parseValorMoneda = (raw: string | number | null | undefined): number => {
    if (raw === null || raw === undefined) return 0;
    if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
    const txt = String(raw).trim();
    if (!txt) return 0;
    const limpio = txt.replace(/[^\d.,-]/g, '');
    const lastComma = limpio.lastIndexOf(',');
    const lastDot = limpio.lastIndexOf('.');
    const dotCount = (limpio.match(/\./g) || []).length;
    const commaCount = (limpio.match(/,/g) || []).length;
    let normalizado = limpio;
    if (lastComma > -1 && lastDot > -1) {
      // Ambos presentes: el último determina cuál es decimal
      if (lastComma > lastDot) {
        // Formato colombiano/europeo: 62.000,50 → coma es decimal
        normalizado = limpio.replace(/\./g, '').replace(',', '.');
      } else {
        // Formato US: 62,000.50 → punto es decimal
        normalizado = limpio.replace(/,/g, '');
      }
    } else if (lastComma > -1) {
      if (commaCount > 1) {
        // Múltiples comas = separadores de miles: 62,000,000
        normalizado = limpio.replace(/,/g, '');
      } else {
        // Una sola coma = decimal: 62,50
        normalizado = limpio.replace(',', '.');
      }
    } else if (lastDot > -1) {
      if (dotCount > 1) {
        // Múltiples puntos = separadores de miles (formato colombiano): 62.000.000
        normalizado = limpio.replace(/\./g, '');
      } else {
        // Un solo punto: si hay exactamente 3 dígitos después → miles, si no → decimal
        const afterDot = limpio.slice(lastDot + 1);
        normalizado = afterDot.length === 3 ? limpio.replace(/\./g, '') : limpio;
      }
    }
    const n = Number(normalizado);
    return Number.isFinite(n) ? n : 0;
  };

  // Total de referencia para validaciones (sin conversión automática COP/USD/EUR)
  const getValorTotalReferencia = () => {
    let total = 0;
    if (datosPlaneacion.moneda === 'COP' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('COP'))) {
      total += parseValorMoneda(datosPlaneacion.valorMonedaCOP);
    }
    if (datosPlaneacion.moneda === 'USD' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('USD'))) {
      total += parseValorMoneda(datosPlaneacion.valorMonedaUSD);
    }
    if (datosPlaneacion.moneda === 'EUR' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('EUR'))) {
      total += parseValorMoneda(datosPlaneacion.valorMonedaEUR);
    }
    return total || parseValorMoneda(datosPlaneacion.valorEstimado);
  };

  const valorValidacion = getValorTotalReferencia();

  const getValorVisual = () => {
    if (datosPlaneacion.moneda === 'USD') return parseValorMoneda(datosPlaneacion.valorMonedaUSD);
    if (datosPlaneacion.moneda === 'EUR') return parseValorMoneda(datosPlaneacion.valorMonedaEUR);
    if (datosPlaneacion.moneda === 'COP') return parseValorMoneda(datosPlaneacion.valorMonedaCOP);
    return valorValidacion; // Fallback para combinada
  };

  const modalidadNormalizada = normalizarModalidad(datosPlaneacion.modalidad);
  const esDirecta = modalidadNormalizada === 'directa';
  const esInvitacion = modalidadNormalizada === 'invitacion';
  const esTDR = modalidadNormalizada === 'tdr';
  const esInvitacionOTdr = esInvitacion || esTDR;

  const numProponentes = esDirecta ? 4 : 3;

  const proponenteVacio = (): Proponente => ({
    nombreProveedor: '', correo: '', datosContacto: '', requisitosTecnicos: '',
    experiencia: '', criteriosHabilitantes: '', valorImpuestos: '', valorAgregado: '', observaciones: '',
    valorCotizacion: '', plazoMeses: '', plazoDias: ''
  });

  const [proponentes, setProponentes] = useState<Proponente[]>(
    datosIniciales.proponentes || Array.from({ length: numProponentes }, proponenteVacio)
  );

  // Sync proponentes cuando cambia modalidad
  const handleModalidadChange = (nuevaModalidad: string) => {
    const esModDirecta = normalizarModalidad(nuevaModalidad) === 'directa';
    const nuevasCantidad = esModDirecta ? 4 : 3;
    setProponentes(prev => {
      if (prev.length < nuevasCantidad) {
        return [...prev, ...Array.from({ length: nuevasCantidad - prev.length }, proponenteVacio)];
      }
      return prev;
    });
    setDatosPlaneacion(prev => ({ ...prev, modalidad: nuevaModalidad }));
  };


  // Sección VI
  const [supervisionEntregables, setSupervisionEntregables] = useState({
    supervision: datosIniciales.supervision_nombre || datosIniciales.supervision || '',
    supervisionId: datosIniciales.supervision_id || '',
    entregables: datosIniciales.entregables || '',
    entregable1: (datosIniciales as any).entregable1 || '',
    entregable2: (datosIniciales as any).entregable2 || '',
    entregable3: (datosIniciales as any).entregable3 || '',
  });

  const [obligaciones, setObligaciones] = useState<{ descripcion: string }[]>(
    (datosIniciales as any).obligaciones_especificas?.length
      ? (datosIniciales as any).obligaciones_especificas
      : [{ descripcion: '' }]
  );
  const [entregablesDetalle, setEntregablesDetalle] = useState<{ descripcion: string; porcentaje: string; sinPorcentaje: boolean }[]>(
    (datosIniciales as any).entregables_detalle?.length
      ? (datosIniciales as any).entregables_detalle
      : [{ descripcion: '', porcentaje: '', sinPorcentaje: false }]
  );

  // Análisis del Mercado (sólo Invitación / TDR)
  const [analisisMercado, setAnalisisMercado] = useState<AnalisisMercado>({
    serviciosOfertados: (datosIniciales as any).analisis_servicios_ofertados  || '',
    valorPromedio:      (datosIniciales as any).analisis_valor_promedio       || '',
    plazoPromedioMeses: (datosIniciales as any).analisis_plazo_promedio_meses || '',
    plazoPromedioDias:  (datosIniciales as any).analisis_plazo_promedio_dias  || '',
    presupuestoOficial: (datosIniciales as any).analisis_presupuesto_oficial  || '',
  });

  // Sección VII — Anexos (dinámicos)
  const [anexosDocs, setAnexosDocs] = useState<Anexo[]>(
    datosIniciales.anexosDocs || [{ nombre: '', tipo: '', fecha: '' }]
  );

  // Sección VIII — Riesgos y SST
  const [riesgosCriterios, setRiesgosCriterios] = useState({
    riesgos: datosIniciales.riesgos || datosIniciales.riesgos_texto || '',
    criteriosSST: datosIniciales.criterios_ambientales_sst || datosIniciales.criteriosSST || '',
  });

  const [anexosTexto, setAnexosTexto] = useState(datosIniciales.anexos_texto || '');

  // Anexos cargados por el solicitante
  const [archivosSolicitante, setArchivosSolicitante] = useState<any[]>(datosIniciales.anexos_solicitante || []);
  const [subiendoArchivosSolicitante, setSubiendoArchivosSolicitante] = useState(false);

  const abrirDocumentoSolicitante = (file: any) => {
    const rawCandidates = [
      file?.url,
      file?.path,
      file?.ruta,
      file?.nombre_almacenado ? `/api/uploads/solicitudes/${file.nombre_almacenado}` : null,
      file?.nombre_almacenado ? `/api/uploads/convocatorias/${file.nombre_almacenado}` : null,
      file?.nombre ? `/api/uploads/solicitudes/${encodeURIComponent(file.nombre)}` : null,
      file?.nombre ? `/api/uploads/convocatorias/${encodeURIComponent(file.nombre)}` : null,
    ].filter(Boolean) as string[];

    const candidates = Array.from(new Set(rawCandidates)).map((u) =>
      u.startsWith('http') ? u : `${API_URL}${u}`
    );

    if (candidates.length > 0) {
      window.open(candidates[0], '_blank', 'noopener,noreferrer');
      return;
    }

    alert('No se encontró el archivo en el servidor para abrirlo. Este adjunto parece haber sido registrado sin carga física. Debes volver a cargar ese documento para habilitar "Ver".');
  };

  const subirArchivosSolicitante = async (files: File[], replaceIndex?: number) => {
    if (!files.length) return;

    try {
      setSubiendoArchivosSolicitante(true);
      const formData = new FormData();
      files.forEach((f) => formData.append('archivos', f));

      const res = await fetch(`${API_URL}/api/solicitudes/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }

      const uploaded = Array.isArray(data?.archivos) ? data.archivos : [];
      if (uploaded.length === 0) {
        throw new Error('La subida no devolvió archivos.');
      }

      const siguientesArchivos = typeof replaceIndex === 'number'
        ? (() => {
          const base = [...archivosSolicitante];
          base.splice(replaceIndex, 1, ...uploaded);
          return base;
        })()
        : [...archivosSolicitante, ...uploaded];

      setArchivosSolicitante(siguientesArchivos);

      // En solicitudes existentes (vista detalle), persistir inmediatamente el nuevo adjunto.
      if (currentSolicitudId) {
        const payloadActualizado = getPayload({ anexos_solicitante: siguientesArchivos });
        const guardado = await guardarBorrador(false, payloadActualizado);
        if (!guardado) {
          throw new Error('Se subió el archivo pero no se pudo guardar en la solicitud.');
        }
      }

      if (typeof replaceIndex === 'number') {
        alert('Documento reemplazado y guardado correctamente.');
      }
    } catch (err) {
      console.error('Error subiendo archivos del solicitante:', err);
      alert(`No fue posible subir los archivos: ${err instanceof Error ? err.message : 'Error desconocido'}`);
    } finally {
      setSubiendoArchivosSolicitante(false);
    }
  };


  // Sección IX — Conclusiones
  const [conclusiones, setConclusions] = useState(datosIniciales.conclusiones || 'Aprobada por unanimidad de los miembros del comité.');

  const tabs = [
    { id: 'planeacion' as Tab, label: 'I-IV. Planeación', icon: FileText },
    { id: 'avanzado' as Tab, label: 'V-VIII. Avanzado', icon: Shield },
    { id: 'documentos' as Tab, label: 'Documentos', icon: FolderOpen },
  ];

  const handleProponenteChange = (index: number, field: keyof Proponente, value: string) => {
    const n = [...proponentes];
    n[index][field] = value;
    setProponentes(n);
  };

  const agregarProponente = () => {
    setProponentes(prev => [...prev, proponenteVacio()]);
  };

  const eliminarProponente = (i: number) => {
    if (proponentes.length > (esDirecta ? 4 : 3)) {
      setProponentes(prev => prev.filter((_, idx) => idx !== i));
    }
  };

  const agregarAnexo = () => setAnexosDocs(prev => [...prev, { nombre: '', tipo: '', fecha: '' }]);
  const eliminarAnexo = (i: number) => {
    if (anexosDocs.length > 1) setAnexosDocs(prev => prev.filter((_, idx) => idx !== i));
  };
  const handleAnexoChange = (i: number, field: keyof Anexo, value: string) => {
    const n = [...anexosDocs];
    n[i][field] = value;
    setAnexosDocs(n);
  };

  const getPayload = (overrides?: { anexos_solicitante?: any[] }) => ({
    email: userEmail,
    justificacion: datosPlaneacion.descripcionNecesidad,
    descripcion_necesidad_detalle: datosPlaneacion.descripcionNecesidadDetalle,
    titulo_contrato: datosPlaneacion.tituloContrato,
    objeto: datosPlaneacion.objeto,
    lugar_ejecucion: datosPlaneacion.lugarEjecucion,
    plazo_ejecucion_meses: parseInt(datosPlaneacion.plazoEjecucionMeses || '0'),
    plazo_ejecucion_dias: parseInt(datosPlaneacion.plazoEjecucionDias || '0'),
    modalidad: normalizarModalidad(datosPlaneacion.modalidad),
    valor_estimado: getValorVisual(),
    valor_en_cop: valorValidacion,
    moneda: datosPlaneacion.moneda,
    valor_moneda_cop: parseValorMoneda(datosPlaneacion.valorMonedaCOP),
    valor_moneda_usd: parseValorMoneda(datosPlaneacion.valorMonedaUSD),
    valor_moneda_eur: parseValorMoneda(datosPlaneacion.valorMonedaEUR),
    valor_moneda_cop_texto: datosPlaneacion.valorMonedaCOP,
    valor_moneda_usd_texto: datosPlaneacion.valorMonedaUSD,
    valor_moneda_eur_texto: datosPlaneacion.valorMonedaEUR,
    efecto_estimar_presupuesto: datosPlaneacion.efectoEstimarPresupuesto,
    forma_pago: datosPlaneacion.formaPago,
    justificacion_anticipo: datosPlaneacion.justificacionAnticipo || null,
    rubro_presupuestal: datosPlaneacion.rubroPresupuestal,
    criterios_contratacion: datosPlaneacion.descripcionNecesidad,
    fecha_comite: datosPlaneacion.fechaComite,
    fecha_estimada_solicitud: datosPlaneacion.fechaEstimadaSolicitud || null,
    fecha_estimada_recepcion: datosPlaneacion.fechaEstimadaRecepcion || null,
    modalidad_seleccion: datosPlaneacion.modalidadSeleccion,
    justificacion_cd: datosPlaneacion.justificacionCD,
    supervision_id: supervisionEntregables.supervisionId,
    supervisor: listaEmpleados.find(e => e.id === supervisionEntregables.supervisionId),
    entregables: supervisionEntregables.entregables,
    entregable1: supervisionEntregables.entregable1,
    entregable2: supervisionEntregables.entregable2,
    entregable3: supervisionEntregables.entregable3,
    obligaciones_especificas: esDirecta ? [] : obligaciones.filter(o => o.descripcion.trim()),
    entregables_detalle: entregablesDetalle.filter(e => e.descripcion.trim()),
    analisis_servicios_ofertados:  analisisMercado.serviciosOfertados,
    analisis_valor_promedio:       analisisMercado.valorPromedio,
    analisis_plazo_promedio_meses: analisisMercado.plazoPromedioMeses,
    analisis_plazo_promedio_dias:  analisisMercado.plazoPromedioDias,
    analisis_presupuesto_oficial:  analisisMercado.presupuestoOficial,
    riesgos: riesgosCriterios.riesgos,
    criterios_ambientales_sst: riesgosCriterios.criteriosSST,
    riesgos_texto: riesgosCriterios.riesgos,
    conclusiones_comite: conclusiones,
    anexos_texto: anexosTexto,
    anexos_solicitante: overrides?.anexos_solicitante ?? archivosSolicitante,
    proponentes: proponentes,
    anexos: anexosDocs
  });

  const guardarBorrador = async (mostrarAlerta = true, payloadOverride?: ReturnType<typeof getPayload>) => {
    try {
      const payload = payloadOverride || getPayload();
      if (currentSolicitudId) {
        const res = await fetch(`${API_URL}/api/solicitudes/${currentSolicitudId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detalle = body?.error || `HTTP ${res.status}`;
          throw new Error(`Error actualizando borrador: ${detalle}`);
        }
        if (mostrarAlerta) alert('Borrador actualizado correctamente.');
        return currentSolicitudId;
      } else {
        const res = await fetch(`${API_URL}/api/solicitudes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const detalle = data?.error || `HTTP ${res.status}`;
          throw new Error(`Error creando borrador: ${detalle}`);
        }
        if (!data?.id) {
          throw new Error('La API respondió sin ID de solicitud.');
        }
        setCurrentSolicitudId(data.id);
        if (mostrarAlerta) alert('Borrador creado correctamente.');
        return data.id;
      }
    } catch (error) {
      console.error("Error al guardar borrador:", error);
      if (mostrarAlerta) alert(`Error al guardar el borrador: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const proponentesValidos = proponentes.filter(p => (p.nombreProveedor || '').trim().length > 0);

    // 1. Validar SMLV
    const smlv = 1300000;
    const valor = valorValidacion;
    if (esInvitacion && valor >= (50 * smlv)) {
      alert(`Error: La modalidad Invitación solo permite valores menores a 50 SMLV ($65.000.000). El valor actual es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valor)}. Por favor cambie la modalidad a TDR o ajuste el presupuesto.`);
      return;
    }
    if (esTDR && valor < (50 * smlv)) {
      alert(`Error: La modalidad TDR solo permite valores iguales o superiores a 50 SMLV ($65.000.000). El valor actual es ${new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(valor)}. Por favor cambie la modalidad a Invitación o ajuste el presupuesto.`);
      return;
    }

    // 1.1 Validaciones de campos obligatorios (Nivel I - Planeación)
    if (!datosPlaneacion.tituloContrato) { alert("El campo 'Título del contrato' es obligatorio."); return; }
    if (!datosPlaneacion.objeto) { alert("El campo 'Objeto de la contratación' es obligatorio."); return; }
    if (!datosPlaneacion.descripcionNecesidad) { alert("El campo 'Justificación y descripción de la necesidad' es obligatorio."); return; }
    if (!datosPlaneacion.lugarEjecucion) { alert("El campo 'Lugar de ejecución' es obligatorio."); return; }
    if (!datosPlaneacion.plazoEjecucionMeses && !datosPlaneacion.plazoEjecucionDias) {
      alert("Debe indicar el plazo de ejecución (meses o días)."); return;
    }
    if (!supervisionEntregables.supervisionId && !supervisionEntregables.supervision) {
      alert("Debe seleccionar un Supervisor válido de la lista de empleados."); return;
    }
    const hayPctEntregables = entregablesDetalle.some(e => !e.sinPorcentaje && e.porcentaje !== '');
    if (hayPctEntregables) {
      const suma = entregablesDetalle.reduce((s, e) => s + (!e.sinPorcentaje && e.porcentaje !== '' ? parseFloat(e.porcentaje) || 0 : 0), 0);
      if (suma !== 100) {
        alert(`La suma de los porcentajes de los entregables debe ser 100%. Actualmente es ${suma}%.`); return;
      }
    }
    if (proponentesValidos.length === 0) {
      alert("Debe registrar al menos un proponente con nombre del proveedor.");
      return;
    }
    if (!esDirecta && proponentesValidos.length < 3) {
      alert("Para modalidad Invitación o TDR debe registrar mínimo 3 proponentes con nombre del proveedor.");
      return;
    }
    try {
      // 2. Primero guardamos el borrador (sin mostrar alerta individual)
      const idActual = await guardarBorrador(false);
      if (!idActual) throw new Error("No se pudo guardar la solicitud antes de enviar.");

      // 3. Enviar al Gerente
      const resEnvio = await fetch(`${API_URL}/api/solicitudes/${idActual}/enviar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });

      if (resEnvio.ok) {
        alert('¡Solicitud enviada exitosamente al Gerente de Área!');
        onBack();
      } else {
        throw new Error('No se pudo cambiar el estado a enviado_gerente');
      }

    } catch (error) {
      console.error("Error al procesar la solicitud:", error);
      alert('Hubo un error al conectar con el servidor. Se guardó el borrador pero no se pudo enviar.');
    }
  };

  /* ── estilos helpers ── */
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB',
    borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem',
    outline: 'none', boxSizing: 'border-box', backgroundColor: '#fff', minHeight: 38
  };
  const textareaStyle: React.CSSProperties = {
    ...inputStyle, resize: 'none', minHeight: 80
  };
  const rowStyle: React.CSSProperties = {
    display: 'flex', borderBottom: '1px solid #e5e7eb'
  };
  const labelCellStyle: React.CSSProperties = {
    width: 200, minWidth: 160, flexShrink: 0, padding: '16px',
    fontWeight: 600, fontSize: '0.8rem', color: '#1F2937',
    borderRight: '1px solid #e5e7eb', backgroundColor: '#fafafa',
    fontFamily: 'Gabarito, sans-serif', display: 'flex', alignItems: 'flex-start', paddingTop: 20
  };
  const selectStyle: React.CSSProperties = {
    ...inputStyle
  };

  return (
    <div className="ux-page p-4 lg:p-8">
      {mostrarFormato && solicitudDetalle && (
        <FormatoPlaneacionImprimible
          solicitud={solicitudDetalle}
          onClose={() => setMostrarFormato(false)}
        />
      )}
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              <ArrowLeft size={20} /> Volver a Mis Solicitudes
            </button>
            {solicitudDetalle && (
              <button
                type="button"
                onClick={() => setMostrarFormato(true)}
                className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-semibold text-sm transition-colors"
                style={{ backgroundColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}
              >
                <Download size={16} /> Descargar PDF
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Formato de Planeación Contractual
            </h1>
            {modoSoloLectura && (
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold border border-red-300" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                📋 Solo Lectura
              </span>
            )}
            {!modoSoloLectura && esVistaExistente && (
              <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-semibold border border-amber-300" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                ✏️ Modo Corrección
              </span>
            )}
          </div>
          <p className="text-gray-600" style={{ fontFamily: 'Gabarito, sans-serif' }}>{datosEncabezado.codigo} - {datosEncabezado.version}</p>
        </div>
        {!modoSoloLectura && esVistaExistente && resultadoComiteActual === 'en_revision' && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-amber-900 font-semibold" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Solicitud devuelta por Comité para corrección.
            </p>
            <p className="text-xs text-amber-800 mt-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Ajusta la información observada, guarda borrador y vuelve a enviar al gerente para reiniciar el flujo.
            </p>
          </div>
        )}
        {!modoSoloLectura && esVistaExistente && (estadoActualSolicitud === 'rechazado_gerente' || estadoActualSolicitud === 'devuelto_al_solicitante') && comentarioGerenteActual && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-rose-900 font-semibold" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Motivo de devolución del Gerente:
            </p>
            <p className="text-xs text-rose-800 mt-1 whitespace-pre-wrap" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {comentarioGerenteActual}
            </p>
          </div>
        )}
        {!modoSoloLectura && esVistaExistente && estadoActualSolicitud === 'rechazado_juridica' && comentarioJuridicaActual && (
          <div className="bg-rose-50 border-2 border-rose-300 rounded-lg p-4 mb-6">
            <p className="text-sm text-rose-900 font-semibold" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Motivo de rechazo de Jurídica:
            </p>
            <p className="text-xs text-rose-800 mt-1 whitespace-pre-wrap" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              {comentarioJuridicaActual}
            </p>
          </div>
        )}


        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              const active = tabActual === tab.id;
              return (
                <button
                  key={tab.id} type="button"
                  onClick={() => setTabActual(tab.id)}
                  className="flex items-center gap-2 px-5 py-4 font-semibold text-sm whitespace-nowrap transition-all"
                  style={{
                    fontFamily: 'Gabarito, sans-serif',
                    borderBottom: active ? '3px solid var(--brand-primary)' : '3px solid transparent',
                    color: active ? 'var(--brand-primary)' : '#6B7280',
                    backgroundColor: active ? 'rgba(232,73,34,0.08)' : 'transparent',
                  }}
                >
                  <Icon size={18} />{tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <form ref={formRef} onSubmit={handleSubmit}>
          <div style={{ pointerEvents: (modoSoloLectura && tabActual !== 'documentos') ? 'none' : 'auto', opacity: modoSoloLectura ? 0.85 : 1 }}>

            {/* ══════════════ TAB: PLANEACIÓN ══════════════ */}
            {tabActual === 'planeacion' && (
              <div className="space-y-6" style={{ fontFamily: 'Gabarito, sans-serif' }}>

                {/* ── CABECERA + SECCIÓN I — condicional por modalidad ── */}
                {esInvitacionOTdr ? (
                  <>
                    {/* ═══════════════════════════════════════════════════════
                        ENCABEZADO + SECCIÓN I — fiel al PDF F30-MA-GAF-02
                        Una sola tarjeta: label-cell | content-cell por fila
                    ════════════════════════════════════════════════════════ */}
                    {(() => {
                      const pdfLabel: React.CSSProperties = {
                        width: 170, minWidth: 170, padding: '12px 14px',
                        fontWeight: 700, fontSize: '0.8rem', color: '#1F2937',
                        borderRight: '1px solid #d1d5db', display: 'flex',
                        alignItems: 'center', lineHeight: 1.4, flexShrink: 0,
                        fontFamily: 'Gabarito, sans-serif',
                      };
                      const pdfHint: React.CSSProperties = {
                        fontSize: '0.72rem', color: 'var(--brand-primary)', fontStyle: 'italic',
                        marginBottom: 8, lineHeight: 1.5, fontFamily: 'Gabarito, sans-serif',
                      };
                      const pdfCell: React.CSSProperties = { flex: 1, padding: '10px 14px' };
                      const autoVal: React.CSSProperties = {
                        ...inputStyle, backgroundColor: '#f9fafb', color: '#374151',
                        cursor: 'default', borderColor: '#e5e7eb',
                      };
                      return (
                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={{ fontFamily: 'Gabarito, sans-serif' }}>

                          {/* ── Barra título ── */}
                          <div style={{ padding: '11px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              FORMATO PLANEACIÓN CONTRACTUAL
                            </span>
                          </div>

                          {/* ── Nombre del proceso ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={pdfLabel}>Nombre del proceso:</div>
                            <div style={pdfCell}>
                              <input
                                type="text"
                                value={datosPlaneacion.tituloContrato}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, tituloContrato: e.target.value })}
                                required placeholder="Nombre del proceso de contratación..."
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* ── Fecha de solicitud | Modalidad ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={pdfLabel}>Fecha de solicitud:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Indicar fecha de solicitud al Gerente del Área Solicitante.</p>
                                <div style={autoVal}>{datosEncabezado.fechaSolicitud}</div>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                              <div style={pdfLabel}>Modalidad de contratación:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Seleccione en la lista desplegable la modalidad de contratación para el bien o servicio.</p>
                                <div style={autoVal}>{esInvitacion ? 'Invitación' : 'TDR'}</div>
                              </div>
                            </div>
                          </div>

                          {/* ── Gerencia solicitante | Supervisor del contrato ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={pdfLabel}>Gerencia solicitante:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Seleccione en la lista desplegable la Gerencia Solicitante.</p>
                                <div style={autoVal}>{datosEncabezado.gerencia}</div>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                              <div style={pdfLabel}>Supervisor del contrato:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Indicar nombre del empleado que ejercerá la supervisión y seguimiento del contrato descrito en este documento.</p>
                                <input
                                  list="empleados-list-header"
                                  value={supervisionEntregables.supervision}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const emp = listaEmpleados.find(em => {
                                      const cs = em.cargo ? ` - ${em.cargo}` : '';
                                      return `${em.nombre}${cs} (${em.email})` === val || em.nombre === val || em.email === val;
                                    });
                                    setSupervisionEntregables({ ...supervisionEntregables, supervision: val, supervisionId: emp ? emp.id : '' });
                                  }}
                                  style={inputStyle} placeholder="Escriba para buscar..."
                                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                />
                                <datalist id="empleados-list-header">
                                  {listaEmpleados.map((emp, i) => {
                                    const cs = emp.cargo ? ` - ${emp.cargo}` : '';
                                    return <option key={i} value={`${emp.nombre}${cs} (${emp.email})`} />;
                                  })}
                                </datalist>
                              </div>
                            </div>
                          </div>

                          {/* ── Fecha estimada (izquierda) | vacío (derecha) ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={{ ...pdfLabel, lineHeight: 1.35 }}>Fecha estimada en la que se requiere el contrato</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Incluya la fecha en la que se requiere iniciar el contrato</p>
                                <input
                                  type="date"
                                  value={datosPlaneacion.fechaEstimadaSolicitud}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, fechaEstimadaSolicitud: e.target.value })}
                                  style={inputStyle}
                                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                />
                              </div>
                            </div>
                            <div style={{ flex: 1 }} />
                          </div>

                          {/* ── Objeto (ancho completo) ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>Indicar el objeto de la contratación requerida.</p>
                              <textarea
                                value={datosPlaneacion.objeto}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, objeto: e.target.value })}
                                rows={4} style={textareaStyle} required
                                placeholder="Objeto del contrato..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* ── Sección I — barra roja ── */}
                          <div style={{ padding: '10px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              I. Justificación y Descripción de la Necesidad
                            </span>
                          </div>

                          {/* ── Descripción de la necesidad ── */}
                          <div style={{ display: 'flex' }}>
                            <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Descripción de la necesidad:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>Responde estas preguntas ¿qué necesitan?, ¿por qué lo necesitan?, y ¿cómo se relaciona con las actividades de Invest y del área?</p>
                              <textarea
                                value={datosPlaneacion.descripcionNecesidad}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, descripcionNecesidad: e.target.value })}
                                rows={5} style={textareaStyle} required
                                placeholder="Describa la necesidad..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </>
                ) : (
                  /* SECCIÓN I — Directa: PDF-style (igual al PDF F30-MA-GAF-02) */
                  <>
                    {(() => {
                      const pdfLabel: React.CSSProperties = {
                        width: 170, minWidth: 170, padding: '12px 14px',
                        fontWeight: 700, fontSize: '0.8rem', color: '#1F2937',
                        borderRight: '1px solid #d1d5db', display: 'flex',
                        alignItems: 'center', lineHeight: 1.4, flexShrink: 0,
                        fontFamily: 'Gabarito, sans-serif',
                      };
                      const pdfHint: React.CSSProperties = {
                        fontSize: '0.72rem', color: 'var(--brand-primary)', fontStyle: 'italic',
                        marginBottom: 8, lineHeight: 1.5, fontFamily: 'Gabarito, sans-serif',
                      };
                      const pdfCell: React.CSSProperties = { flex: 1, padding: '10px 14px' };
                      const autoVal: React.CSSProperties = {
                        ...inputStyle, backgroundColor: '#f9fafb', color: '#374151',
                        cursor: 'default', borderColor: '#e5e7eb',
                      };
                      return (
                        <div className="rounded-xl overflow-hidden shadow-md border border-gray-200" style={{ fontFamily: 'Gabarito, sans-serif' }}>

                          {/* ── Barra título ── */}
                          <div style={{ padding: '11px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                              FORMATO PLANEACIÓN CONTRACTUAL
                            </span>
                          </div>

                          {/* ── Nombre del proceso ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={pdfLabel}>Nombre del proceso:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>Escriba el nombre o título con el que se identificará este contrato.</p>
                              <input
                                type="text"
                                value={datosPlaneacion.tituloContrato}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, tituloContrato: e.target.value })}
                                required placeholder="Nombre del proceso de contratación..."
                                style={inputStyle}
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* ── Fecha de solicitud | Fecha del Comité ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={pdfLabel}>Fecha de solicitud:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Indicar fecha de solicitud al Gerente del Área Solicitante.</p>
                                <div style={autoVal}>{datosEncabezado.fechaSolicitud}</div>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                              <div style={pdfLabel}>Fecha del Comité de contrataciones:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Indicar fecha de aprobación del documento por parte del Comité de contrataciones.</p>
                                {esFinanciera ? (
                                  <input type="date" value={datosPlaneacion.fechaComite}
                                    onChange={e => setDatosPlaneacion({ ...datosPlaneacion, fechaComite: e.target.value })}
                                    style={inputStyle}
                                    onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                  />
                                ) : datosPlaneacion.fechaComite ? (
                                  <div style={autoVal}>{new Date(`${datosPlaneacion.fechaComite}T00:00:00`).toLocaleDateString('es-CO')}</div>
                                ) : (
                                  <div style={{ ...autoVal, color: '#9CA3AF', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: 6 }}>
                                    <Lock size={13} /> Asignado por el Comité
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* ── Gerencia solicitante | Supervisor del contrato ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={pdfLabel}>Gerencia solicitante:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Seleccione en la lista desplegable la Gerencia Solicitante.</p>
                                <div style={autoVal}>{datosEncabezado.gerencia}</div>
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                              <div style={pdfLabel}>Supervisor del contrato:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Indicar nombre del empleado que ejercerá la supervisión y seguimiento del contrato descrito en este documento.</p>
                                <input
                                  list="empleados-list-header-directa"
                                  value={supervisionEntregables.supervision}
                                  onChange={e => {
                                    const val = e.target.value;
                                    const emp = listaEmpleados.find(em => {
                                      const cs = em.cargo ? ` - ${em.cargo}` : '';
                                      return `${em.nombre}${cs} (${em.email})` === val || em.nombre === val || em.email === val;
                                    });
                                    setSupervisionEntregables({ ...supervisionEntregables, supervision: val, supervisionId: emp ? emp.id : '' });
                                  }}
                                  style={inputStyle} placeholder="Escriba para buscar..."
                                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                />
                                <datalist id="empleados-list-header-directa">
                                  {listaEmpleados.map((emp, i) => {
                                    const cs = emp.cargo ? ` - ${emp.cargo}` : '';
                                    return <option key={i} value={`${emp.nombre}${cs} (${emp.email})`} />;
                                  })}
                                </datalist>
                              </div>
                            </div>
                          </div>

                          {/* ── Fecha estimada solicitud | Fecha estimada recepción ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ flex: 1, display: 'flex', borderRight: '1px solid #d1d5db' }}>
                              <div style={pdfLabel}>Fecha estimada solicitud de propuestas:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>Enviar la información a GAF mínimo con dos (2) días de anticipación.</p>
                                <input type="date" value={datosPlaneacion.fechaEstimadaSolicitud}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, fechaEstimadaSolicitud: e.target.value })}
                                  style={inputStyle}
                                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                />
                              </div>
                            </div>
                            <div style={{ flex: 1, display: 'flex' }}>
                              <div style={pdfLabel}>Fecha estimada recepción de propuestas:</div>
                              <div style={pdfCell}>
                                <p style={pdfHint}>A los proponentes se le otorgará mínimo dos (2) días para el envío de sus propuestas.</p>
                                <input type="date" value={datosPlaneacion.fechaEstimadaRecepcion}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, fechaEstimadaRecepcion: e.target.value })}
                                  style={inputStyle}
                                  onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                  onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                />
                              </div>
                            </div>
                          </div>

                          {/* ── Objeto ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>Objeto:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>Indicar el objeto de la contratación requerida.</p>
                              <textarea
                                value={datosPlaneacion.objeto}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, objeto: e.target.value })}
                                rows={3} style={textareaStyle} required
                                placeholder="Objeto del contrato..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* ── Sección I — barra roja ── */}
                          <div style={{ padding: '10px 20px', backgroundColor: 'var(--brand-primary)', textAlign: 'center' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                              I. Justificación y Descripción de la Necesidad
                            </span>
                          </div>

                          {/* ── 1.1 Justificación ── */}
                          <div style={{ display: 'flex', borderBottom: '1px solid #d1d5db' }}>
                            <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.1 Justificación:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>En este apartado se redactará la justificación por la cual se requiere el objeto a contratar, indicando la necesidad a satisfacer de conformidad con el propósito superior de La Corporación, objetivos y metas de los cual se deriva la contratación, así como las funciones del área solicitante.</p>
                              <textarea
                                value={datosPlaneacion.descripcionNecesidad}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, descripcionNecesidad: e.target.value })}
                                rows={5} style={textareaStyle} required
                                placeholder="Redacte aquí la justificación..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* ── 1.2 Descripción de la necesidad ── */}
                          <div style={{ display: 'flex' }}>
                            <div style={{ ...pdfLabel, alignItems: 'flex-start', paddingTop: 14 }}>1.2 Descripción de la necesidad:</div>
                            <div style={pdfCell}>
                              <p style={pdfHint}>Describa de forma clara y concisa la necesidad específica que da origen a esta contratación.</p>
                              <textarea
                                value={datosPlaneacion.descripcionNecesidadDetalle}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, descripcionNecesidadDetalle: e.target.value })}
                                rows={4} style={textareaStyle} required
                                placeholder="Describa la necesidad específica que origina esta contratación..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                        </div>
                      );
                    })()}
                  </>
                )}

                {/* ── SECCIÓN II ── */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                  <SectionHeader title="II. DESCRIPCIÓN DEL PLAZO Y LUGAR DE EJECUCIÓN" />

                  {/* 2.1 Plazo */}
                  <div style={rowStyle}>
                    <div style={labelCellStyle}>2.1 Plazo de ejecución:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" required={true} hint="Indique el plazo de ejecución del contrato expresado en meses y/o días calendario." />
                      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="number" min="0"
                            value={datosPlaneacion.plazoEjecucionMeses}
                            onChange={e => setDatosPlaneacion({ ...datosPlaneacion, plazoEjecucionMeses: e.target.value })}
                            style={{ ...inputStyle, width: 80, textAlign: 'center', fontWeight: 700 }}
                            placeholder="0"
                            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                          />
                          <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>meses</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <input
                            type="number" min="0"
                            value={datosPlaneacion.plazoEjecucionDias}
                            onChange={e => setDatosPlaneacion({ ...datosPlaneacion, plazoEjecucionDias: e.target.value })}
                            style={{ ...inputStyle, width: 80, textAlign: 'center', fontWeight: 700 }}
                            placeholder="0"
                            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                          />
                          <span style={{ fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>días calendario</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2.2 Lugar */}
                  <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    <div style={labelCellStyle}>2.2 Lugar de ejecución:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" required={true} hint="Indique la ciudad o municipio donde se ejecutará el contrato." />
                      <input
                        type="text" value={datosPlaneacion.lugarEjecucion}
                        onChange={e => setDatosPlaneacion({ ...datosPlaneacion, lugarEjecucion: e.target.value })}
                        style={inputStyle} placeholder="Ej: Bogotá D.C."
                        onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                      />
                      {datosPlaneacion.lugarEjecucion && (
                        <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 6 }}>
                          <strong>PARÁGRAFO:</strong> Para todos los efectos contractuales se tendrán como domicilio la ciudad de {datosPlaneacion.lugarEjecucion}.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SECCIÓN III ── Investigación de Mercado / Datos del Contacto */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">

                  {/* Header — naranja para Inv/TDR como el PDF, azul (SectionHeader) para Directa */}
                  {esInvitacionOTdr ? (
                    <div style={{ backgroundColor: 'var(--brand-primary)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: 'Gabarito, sans-serif' }}>
                      DATOS DEL CONTACTO / ESTUDIO DE MERCADO
                    </div>
                  ) : (
                    <SectionHeader title="III. INVESTIGACIÓN DE MERCADO." />
                  )}

                  <div style={{ padding: '8px 20px', backgroundColor: '#fff', borderBottom: '1px solid #e5e7eb' }}>
                    <p style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic' }}>
                      Ingresar la siguiente información de los posibles proponentes que puedan suplir la contratación.
                      {esDirecta && <strong style={{ color: 'var(--brand-primary)', marginLeft: 4 }}>Contratación Directa: mínimo 4 proponentes.</strong>}
                    </p>
                  </div>

                  {/* ── INVITADOS (tabla separada, ancho completo) ── */}
                  {esInvitacionOTdr ? (() => {
                    const tdIn = (val: string, onChange: (v: string) => void, placeholder?: string) => (
                      <input type="text" value={val} onChange={e => onChange(e.target.value)}
                        placeholder={placeholder}
                        style={{ width: '100%', padding: '5px 7px', border: '1px solid transparent', borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.78rem', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' as const }}
                        onFocus={e => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.backgroundColor = '#fff'; }}
                        onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'transparent'; }}
                      />
                    );
                    return (
                      <>
                        {/* Tabla INVITADOS */}
                        <div style={{ overflowX: 'auto' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'Gabarito, sans-serif', tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '4%' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '27%' }} />
                              <col style={{ width: '22%' }} />
                              <col style={{ width: '20%' }} />
                            </colgroup>
                            <thead>
                              <tr>
                                <th colSpan={5} style={{ border: '1px solid #d1d5db', padding: '7px 10px', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', color: '#374151', backgroundColor: '#fff' }}>
                                  INVITADOS
                                </th>
                              </tr>
                              <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                                <th style={{ border: '1px solid #d97458', padding: '6px 4px', color: '#fff', textAlign: 'center', fontWeight: 700 }}>No.</th>
                                <th style={{ border: '1px solid #d97458', padding: '6px 8px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Nombre del proveedor</th>
                                <th style={{ border: '1px solid #d97458', padding: '6px 8px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Datos de contacto</th>
                                <th style={{ border: '1px solid #d97458', padding: '6px 8px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Valor de cotización</th>
                                <th style={{ border: '1px solid #d97458', padding: '6px 8px', color: '#fff', textAlign: 'left', fontWeight: 700 }}>Plazo</th>
                              </tr>
                            </thead>
                            <tbody>
                              {proponentes.map((p, i) => (
                                <tr key={i} style={{ backgroundColor: '#fff' }}>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center', fontWeight: 700, color: '#374151', verticalAlign: 'middle' }}>
                                    {i + 1}
                                  </td>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '2px 4px', verticalAlign: 'top' }}>
                                    {tdIn(p.nombreProveedor, v => handleProponenteChange(i, 'nombreProveedor', v), 'Nombre del proveedor')}
                                  </td>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '2px 4px', verticalAlign: 'top' }}>
                                    {tdIn(p.datosContacto, v => handleProponenteChange(i, 'datosContacto', v), 'Email / Tel')}
                                  </td>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '2px 4px', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', alignItems: 'center' }}>
                                      <span style={{ padding: '5px 4px 5px 7px', fontSize: '0.78rem', color: '#6B7280', fontFamily: 'Gabarito, sans-serif', flexShrink: 0 }}>$</span>
                                      <input type="text" value={p.valorCotizacion}
                                        onChange={e => handleProponenteChange(i, 'valorCotizacion', e.target.value)}
                                        placeholder="0"
                                        style={{ flex: 1, padding: '5px 7px 5px 2px', border: '1px solid transparent', borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.78rem', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' as const, minWidth: 0 }}
                                        onFocus={e => { (e.target.parentElement as HTMLElement).style.border = '1px solid var(--brand-primary)'; (e.target.parentElement as HTMLElement).style.borderRadius = '4px'; e.target.style.backgroundColor = '#fff'; (e.target.parentElement as HTMLElement).style.backgroundColor = '#fff'; }}
                                        onBlur={e => { (e.target.parentElement as HTMLElement).style.border = '1px solid transparent'; e.target.style.backgroundColor = 'transparent'; (e.target.parentElement as HTMLElement).style.backgroundColor = 'transparent'; }}
                                      />
                                    </div>
                                  </td>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '2px 4px', verticalAlign: 'middle' }}>
                                    <div style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                      <input type="number" value={p.plazoMeses}
                                        onChange={e => handleProponenteChange(i, 'plazoMeses', e.target.value)}
                                        placeholder="0" min="0"
                                        style={{ width: '36%', padding: '5px 4px', border: '1px solid transparent', borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.72rem', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' as const, textAlign: 'center' }}
                                        onFocus={e => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                      />
                                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', flexShrink: 0 }}>m</span>
                                      <input type="number" value={p.plazoDias}
                                        onChange={e => handleProponenteChange(i, 'plazoDias', e.target.value)}
                                        placeholder="0" min="0"
                                        style={{ width: '36%', padding: '5px 4px', border: '1px solid transparent', borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.72rem', outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box' as const, textAlign: 'center' }}
                                        onFocus={e => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.backgroundColor = '#fff'; }}
                                        onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                      />
                                      <span style={{ fontSize: '0.65rem', color: '#9CA3AF', flexShrink: 0 }}>d</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Botón agregar proponente */}
                        <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                          <button type="button" onClick={agregarProponente}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid var(--brand-primary)', borderRadius: 6, color: 'var(--brand-primary)', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Gabarito, sans-serif', fontWeight: 600 }}>
                            <Plus size={14} /> Agregar proponente
                          </button>
                        </div>

                        {/* Sección ANÁLISIS DEL MERCADO */}
                        <div style={{ borderTop: '2px solid #e5e7eb' }}>
                          {/* Header */}
                          <div style={{ backgroundColor: '#1a3a5c', color: '#fff', fontWeight: 700, fontSize: '0.82rem', textAlign: 'center', padding: '10px 24px', letterSpacing: '0.06em', textTransform: 'uppercase' as const, fontFamily: 'Gabarito, sans-serif' }}>
                            ANÁLISIS DEL MERCADO
                          </div>

                          {/* Servicios ofertados */}
                          <div style={{ borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                              <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>SERVICIOS OFERTADOS</span>
                              <InfoTip hint="Definir si el oferente presta la totalidad de servicios solicitados y si encontró algún valor agregado en el estudio de mercado" />
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                              <textarea
                                value={analisisMercado.serviciosOfertados}
                                onChange={e => setAnalisisMercado({ ...analisisMercado, serviciosOfertados: e.target.value })}
                                rows={5}
                                placeholder="Definir si el oferente presta la totalidad de servicios solicitados y si encontró algún valor agregado."
                                style={{ width: '100%', padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', resize: 'none', outline: 'none', boxSizing: 'border-box' as const, backgroundColor: '#fff' }}
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          </div>

                          {/* Valor promedio | Plazo promedio */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #e5e7eb' }}>
                            <div style={{ borderRight: '1px solid #e5e7eb' }}>
                              <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>VALOR PROMEDIO</span>
                                <InfoTip hint="Registre el promedio de los valores obtenidos en la investigación de mercado, o el valor más alto si se quiere asegurar cobertura presupuestal." />
                              </div>
                              <div style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
                                  <span style={{ padding: '8px 10px', backgroundColor: '#f9fafb', borderRight: '1px solid #D1D5DB', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gabarito, sans-serif', fontWeight: 600 }}>$</span>
                                  <input type="text" value={analisisMercado.valorPromedio}
                                    onChange={e => setAnalisisMercado({ ...analisisMercado, valorPromedio: e.target.value })}
                                    placeholder="0"
                                    style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', backgroundColor: '#fff' }}
                                  />
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'Gabarito, sans-serif' }}>Promedio de los valores obtenidos en el estudio de mercado.</p>
                              </div>
                            </div>
                            <div>
                              <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PLAZO PROMEDIO</span>
                                <InfoTip hint="Registre el promedio de los plazos de la satisfacción de la necesidad obtenidos en la investigación de mercado." />
                              </div>
                              <div style={{ padding: '10px 14px' }}>
                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                  <input type="number" value={analisisMercado.plazoPromedioMeses}
                                    onChange={e => setAnalisisMercado({ ...analisisMercado, plazoPromedioMeses: e.target.value })}
                                    placeholder="0" min="0" step="1"
                                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', outline: 'none', backgroundColor: '#fff' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gabarito, sans-serif', whiteSpace: 'nowrap' }}>meses</span>
                                  <input type="number" value={analisisMercado.plazoPromedioDias}
                                    onChange={e => setAnalisisMercado({ ...analisisMercado, plazoPromedioDias: e.target.value })}
                                    placeholder="0" min="0" step="1"
                                    style={{ flex: 1, padding: '8px 12px', border: '1px solid #D1D5DB', borderRadius: 6, fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', outline: 'none', backgroundColor: '#fff' }}
                                    onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                    onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                  />
                                  <span style={{ fontSize: '0.8rem', color: '#6B7280', fontFamily: 'Gabarito, sans-serif', whiteSpace: 'nowrap' }}>días</span>
                                </div>
                                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4, fontFamily: 'Gabarito, sans-serif' }}>Promedio de los plazos obtenidos en la investigación.</p>
                              </div>
                            </div>
                          </div>

                          {/* Presupuesto oficial */}
                          <div>
                            <div style={{ backgroundColor: '#fafafa', padding: '8px 14px', borderBottom: '1px solid #e5e7eb' }}>
                              <span style={{ fontWeight: 700, fontSize: '0.78rem', color: '#1F2937', fontFamily: 'Gabarito, sans-serif' }}>PRESUPUESTO OFICIAL</span>
                            </div>
                            <div style={{ padding: '10px 14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #D1D5DB', borderRadius: 6, overflow: 'hidden' }}>
                                <span style={{ padding: '8px 10px', backgroundColor: '#f9fafb', borderRight: '1px solid #D1D5DB', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'Gabarito, sans-serif', fontWeight: 600 }}>$</span>
                                <input type="text" value={analisisMercado.presupuestoOficial}
                                  onChange={e => setAnalisisMercado({ ...analisisMercado, presupuestoOficial: e.target.value })}
                                  placeholder="0"
                                  style={{ flex: 1, padding: '8px 12px', border: 'none', outline: 'none', fontFamily: 'Gabarito, sans-serif', fontSize: '0.875rem', backgroundColor: '#fff' }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    );
                  })() : (
                    /* ── Tabla detallada original (Directa) ── */
                    <div style={{ overflow: 'hidden' }}>
                      {(() => {
                        const columnasProponente: { field: keyof Proponente; label: string; width: string; multilinea: boolean }[] = [
                          { field: 'nombreProveedor',       label: 'Nombre del proveedor',                    width: '18%', multilinea: false },
                          { field: 'datosContacto',         label: 'Datos de contacto',                       width: '18%', multilinea: true  },
                          { field: 'requisitosTecnicos',    label: 'Requisitos técnicos',                     width: '14%', multilinea: true  },
                          { field: 'experiencia',           label: 'Experiencia',                             width: '14%', multilinea: true  },
                          { field: 'criteriosHabilitantes', label: 'Criterios habilitantes',                  width: '14%', multilinea: true  },
                          { field: 'valorImpuestos',        label: 'Valor + Impuestos',                       width: '12%', multilinea: false },
                          { field: 'observaciones',         label: 'Anexo / Observaciones (Valor agregado)',  width: '14%', multilinea: true  },
                        ];
                        return (
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'Gabarito, sans-serif', tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '6%' }} />
                              {columnasProponente.map(c => <col key={c.field} style={{ width: c.width }} />)}
                            </colgroup>
                            <thead>
                              <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                                <th style={{ border: '1px solid #d97458', padding: '8px 6px', color: '#fff', textAlign: 'center', fontWeight: 700 }}>No.</th>
                                {columnasProponente.map(c => (
                                  <th key={c.field} style={{ border: '1px solid #d97458', padding: '8px 8px', color: '#fff', textAlign: 'center', whiteSpace: 'normal', lineHeight: 1.3, fontWeight: 700 }}>{c.label}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {proponentes.map((p, i) => (
                                <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                  <td style={{ border: '1px solid #e5e7eb', padding: '6px', textAlign: 'center', fontWeight: 700, color: '#374151', verticalAlign: 'top' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                      <span>{i + 1}</span>
                                      {proponentes.length > 4 && (
                                        <button type="button" onClick={() => eliminarProponente(i)}
                                          title="Eliminar proponente"
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '0.9rem', lineHeight: 1, padding: 0 }}>✕</button>
                                      )}
                                    </div>
                                  </td>
                                  {columnasProponente.map(({ field, multilinea }) => (
                                    <td key={field} style={{ border: '1px solid #e5e7eb', padding: '2px 4px', verticalAlign: 'top' }}>
                                      {multilinea ? (
                                        <textarea
                                          value={p[field] as string}
                                          onChange={e => handleProponenteChange(i, field, e.target.value)}
                                          rows={2}
                                          style={{
                                            width: '100%', padding: '6px 8px', border: '1px solid transparent',
                                            borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.78rem',
                                            outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box',
                                            minHeight: 44, resize: 'none'
                                          }}
                                          onFocus={e => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.backgroundColor = '#fff'; }}
                                          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                        />
                                      ) : (
                                        <input
                                          type="text" value={p[field] as string}
                                          onChange={e => handleProponenteChange(i, field, e.target.value)}
                                          style={{
                                            width: '100%', padding: '6px 8px', border: '1px solid transparent',
                                            borderRadius: 4, fontFamily: 'Gabarito, sans-serif', fontSize: '0.78rem',
                                            outline: 'none', backgroundColor: 'transparent', boxSizing: 'border-box'
                                          }}
                                          onFocus={e => { e.target.style.borderColor = 'var(--brand-primary)'; e.target.style.backgroundColor = '#fff'; }}
                                          onBlur={e => { e.target.style.borderColor = 'transparent'; e.target.style.backgroundColor = 'transparent'; }}
                                        />
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        );
                      })()}
                      {/* Botón agregar proponente — Directa */}
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #e5e7eb', display: 'flex', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={agregarProponente}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 14px', border: '1px solid var(--brand-primary)', borderRadius: 6, color: 'var(--brand-primary)', backgroundColor: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontFamily: 'Gabarito, sans-serif', fontWeight: 600 }}>
                          <Plus size={14} /> Agregar proponente
                        </button>
                      </div>
                    </div>
                  )}

                </div>

                {/* ── SECCIÓN IV — Solo Directa ── */}
                {esDirecta && (
                  <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                    <SectionHeader title="IV. IDENTIFICACIÓN DEL CONTRATO A CELEBRAR Y MODALIDAD DE SELECCIÓN." />

                    {/* 4.1 Modalidad selección */}
                    <div style={rowStyle}>
                      <div style={labelCellStyle}>4.1 Modalidad de selección:</div>
                      <div style={{ flex: 1, padding: 16 }}>
                        <FieldLabel
                          label=""
                          hint="Conforme con los resultados del apartado anterior 'III. Investigación de mercado', la contratación se debe realizar de manera directa, seleccione la causal que justifica la modalidad de contratación, de acuerdo con lo indicado en el ítem a) del numeral 5.2.1 del MA-GAF-01 Manual de Procedimientos de Compras y Contratación."
                        />
                        <select
                          value={datosPlaneacion.modalidadSeleccion}
                          onChange={e => setDatosPlaneacion({ ...datosPlaneacion, modalidadSeleccion: e.target.value })}
                          style={selectStyle} required
                          onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                          onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                        >
                          <option value="">-- Seleccione la causal --</option>
                          <option value="i">I. Cuando no existen otros proveedores para el suministro del bien y/o servicio por ser titular de derechos de propiedad intelectual o por ser proveedor exclusivo en el territorio nacional.</option>
                          <option value="ii">II. Cuando por razones técnicas sólo se pueda contratar con un proveedor.</option>
                          <option value="iii_a">III. Cuando se declare desierta la convocatoria para la adquisición del bien y/o servicio por dos (2) veces consecutivas, por falta de proponentes.</option>
                          <option value="iv">IV. Cuando el suministro de los bienes y servicios, por su especialidad, sólo puede ser ejecutado y/o suministrado por una determinada persona natural o jurídica (Intuito Personae).</option>
                          <option value="v">V. Cuando se deba asegurar disponibilidad de manera continua en servicios de alojamiento o transporte.</option>
                          <option value="vi">VI. En los servicios bajo la modalidad de suscripción, afiliación o inscripción a publicaciones físicas o digitales que sean de interés de La Corporación.</option>
                          <option value="vii">VII. Contratos de arrendamiento de bienes inmuebles.</option>
                          <option value="viii">VIII. Contratación de productos financieros y seguros.</option>
                          <option value="ix">IX. Contratación de bienes y servicios relacionados con capacitaciones y Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST).</option>
                          <option value="x">X. Cuando sea requerido por urgencia manifiesta de contar con el bien y/o servicio de manera inmediata.</option>
                        </select>
                      </div>
                    </div>

                  </div>
                )}
              </div>
            )}


            {/* ══════════════ TAB: AVANZADO (V – IX) ══════════════ */}
            {tabActual === 'avanzado' && (
              <div className="space-y-6" style={{ fontFamily: 'Gabarito, sans-serif' }}>

                {/* ── SECCIÓN IV/V — Presupuesto y Forma de Pago ── */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                  <SectionHeader title={`${esDirecta ? 'V' : 'IV'}. ANÁLISIS DEL VALOR ESTIMADO DEL CONTRATO, PRESUPUESTO Y FORMA DE PAGO.`} />

                  {/* 5.1/4.1 Presupuesto — readonly para Solicitante */}
                  <div style={rowStyle}>
                    <div style={{ ...labelCellStyle, width: 210 }}>{esDirecta ? '5.1' : '4.1'} Presupuesto para la contratación</div>
                    <FinancieraField
                      label=""
                      hint="A efectos de estimar el presupuesto del presente proceso de selección, se adelantó un estudio de mercado, en donde se estimó que el valor para contratar (transcribir el objeto a contratar) es hasta la suma de xxxxxxx M/CTE ($ xxx)."
                      value={datosPlaneacion.efectoEstimarPresupuesto}
                      onChange={v => setDatosPlaneacion({ ...datosPlaneacion, efectoEstimarPresupuesto: v })}
                      placeholder="Describa el análisis del valor estimado..."
                      rows={3}
                      esFinanciera={esFinanciera}
                    />
                  </div>

                  {/* 5.2/4.2 Rubro — readonly para Solicitante */}
                  <div style={rowStyle}>
                    <div style={{ ...labelCellStyle, width: 210 }}>{esDirecta ? '5.2' : '4.2'} Rubro presupuestal:</div>
                    <FinancieraField
                      label=""
                      hint="Indique el rubro presupuestal el cual será la fuente de los recursos. El valor del contrato se encuentra respaldado por la disponibilidad presupuestal y/o vigencia futura."
                      value={datosPlaneacion.rubroPresupuestal}
                      onChange={v => setDatosPlaneacion({ ...datosPlaneacion, rubroPresupuestal: v })}
                      placeholder="Ej: GAF-2024-001"
                      esFinanciera={esFinanciera}
                    />
                  </div>

                  {/* 5.3/4.3 Forma de pago */}
                  <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    <div style={{ ...labelCellStyle, width: 210 }}>{esDirecta ? '5.3' : '4.3'} Forma de pago:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" hint="Indicar la forma de pago de acuerdo con la modalidad de contratación y la ejecución esperada del contrato, en caso de haber anticipo o pago anticipado, realizar la debida justificación." />

                      {(
                        <>
                          <select value={datosPlaneacion.formaPago}
                            onChange={e => setDatosPlaneacion({ ...datosPlaneacion, formaPago: e.target.value })}
                            style={selectStyle} required
                            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                          >
                            <option value="">-- Seleccione la forma de pago --</option>
                            <option value="anticipo">Anticipo</option>
                            <option value="pago_unico">Pago único</option>
                            <option value="mensual">Mensual</option>
                          </select>

                          {datosPlaneacion.formaPago === 'anticipo' && (
                            <div style={{ marginTop: 12 }}>
                              <FieldLabel label="Justificación del anticipo" hint="Explique la razón por la que se requiere anticipo para este contrato." />
                              <textarea
                                value={datosPlaneacion.justificacionAnticipo}
                                onChange={e => setDatosPlaneacion({ ...datosPlaneacion, justificacionAnticipo: e.target.value })}
                                rows={4} style={textareaStyle} required
                                placeholder="Indique la justificación del anticipo..."
                                onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                              />
                            </div>
                          )}

                          <div style={{ marginTop: 20 }}>
                            <FieldLabel label="Moneda de pago" hint="Seleccione el tipo de moneda para el contrato o si es combinada." />
                            <select value={datosPlaneacion.moneda}
                              onChange={e => setDatosPlaneacion({ ...datosPlaneacion, moneda: e.target.value })}
                              style={selectStyle}
                              onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                              onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                            >
                              <option value="COP">Peso Colombiano (COP)</option>
                              <option value="USD">Dólar Estadounidense (USD)</option>
                              <option value="EUR">Euro (EUR)</option>
                              <option value="COMBINADA">Moneda Combinada (Múltiples divisas)</option>
                            </select>

                            {datosPlaneacion.moneda === 'COMBINADA' && (
                              <div style={{ marginTop: 12, padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px border-gray-200' }}>
                                <p style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 8 }}>
                                  Seleccione las monedas a combinar:
                                </p>
                                <div style={{ display: 'flex', gap: 16 }}>
                                  {['COP', 'USD', 'EUR'].map(m => (
                                    <label key={m} style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.85rem' }}>
                                      <input
                                        type="checkbox"
                                        checked={datosPlaneacion.monedasSeleccionadas.includes(m)}
                                        onChange={e => {
                                          const current = [...datosPlaneacion.monedasSeleccionadas];
                                          if (e.target.checked) current.push(m);
                                          else {
                                            const idx = current.indexOf(m);
                                            if (idx > -1) current.splice(idx, 1);
                                          }
                                          setDatosPlaneacion({ ...datosPlaneacion, monedasSeleccionadas: current });
                                        }}
                                        style={{ accentColor: 'var(--brand-primary)' }}
                                      />
                                      {m === 'COP' ? 'Pesos (COP)' : m === 'USD' ? 'Dólares (USD)' : 'Euros (EUR)'}
                                    </label>
                                  ))}
                                </div>
                              </div>
                            )}

                            {(datosPlaneacion.moneda === 'USD' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('USD'))) && (
                              <div style={{ marginTop: 16 }}>
                                <FieldLabel label="Valor en Dólares (USD)" />
                                <input type="text" inputMode="decimal"
                                  value={datosPlaneacion.valorMonedaUSD}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, valorMonedaUSD: e.target.value })}
                                  style={inputStyle} placeholder="0.00"
                                />
                              </div>
                            )}

                            {(datosPlaneacion.moneda === 'COP' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('COP'))) && (
                              <div style={{ marginTop: 16 }}>
                                <FieldLabel label="Valor en Pesos (COP)" />
                                <input type="text" inputMode="decimal"
                                  value={datosPlaneacion.valorMonedaCOP}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, valorMonedaCOP: e.target.value })}
                                  style={inputStyle} placeholder="0.00"
                                />
                              </div>
                            )}

                            {(datosPlaneacion.moneda === 'EUR' || (datosPlaneacion.moneda === 'COMBINADA' && datosPlaneacion.monedasSeleccionadas.includes('EUR'))) && (
                              <div style={{ marginTop: 16 }}>
                                <FieldLabel label="Valor en Euros (EUR)" />
                                <input type="text" inputMode="decimal"
                                  value={datosPlaneacion.valorMonedaEUR}
                                  onChange={e => setDatosPlaneacion({ ...datosPlaneacion, valorMonedaEUR: e.target.value })}
                                  style={inputStyle} placeholder="0.00"
                                />
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* ── SECCIÓN V/VI — Supervisión y Entregables ── */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                  <SectionHeader title={`${esDirecta ? 'VI' : 'V'}. SUPERVISIÓN Y ENTREGABLES DEL CONTRATO.`} />

                  <div style={rowStyle}>
                    <div style={labelCellStyle}>{esDirecta ? '6.1' : '5.1'} Posibilidad de Supervisión:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" required={true} hint="La supervisión del contrato estará a cargo del [cargo], según lo indicado por el Gerente de Área Solicitante o su delegado, y de conformidad con el Manual de Supervisión e Interventoría de la entidad." />
                      <input
                        list="empleados-list"
                        value={supervisionEntregables.supervision}
                        onChange={e => {
                          const val = e.target.value;
                          // Buscamos el empleado exacto ya sea por el valor mostrado o por el nombre
                          const emp = listaEmpleados.find(emp => {
                            const cargoStr = emp.cargo ? ` - ${emp.cargo}` : '';
                            const label = `${emp.nombre}${cargoStr} (${emp.email})`;
                            return label === val || emp.nombre === val || emp.email === val;
                          });
                          setSupervisionEntregables({
                            ...supervisionEntregables,
                            supervision: val,
                            supervisionId: emp ? emp.id : '' // Si el usuario borra o escribe algo no válido, se limpia
                          });
                        }}
                        style={inputStyle}
                        placeholder="Empiece a escribir para buscar en el listado de empleados..."
                        onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                      />
                      <datalist id="empleados-list">
                        {listaEmpleados.map((emp, i) => {
                          const cargoStr = emp.cargo ? ` - ${emp.cargo}` : '';
                          return <option key={i} value={`${emp.nombre}${cargoStr} (${emp.email})`} />;
                        })}
                      </datalist>
                      <p style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 6, fontStyle: 'italic' }}>
                        * Desplegable automático: Escriba el nombre o cargo para buscar personal disponible en la empresa.
                      </p>
                      {errorCargaEmpleados ? (
                        <p style={{ fontSize: '0.75rem', color: '#DC2626', marginTop: 6 }}>
                          {errorCargaEmpleados}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* Obligaciones Específicas — solo Invitación / TDR */}
                  {!esDirecta && (
                  <div style={rowStyle}>
                    <div style={labelCellStyle}>5.2 Obligaciones Específicas:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" hint="Liste las obligaciones específicas que debe cumplir el contratista durante la ejecución del contrato." />
                      {obligaciones.map((ob, i) => (
                        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
                          <span style={{ minWidth: 22, fontWeight: 700, paddingTop: 9, color: '#6B7280', fontSize: '0.82rem', textAlign: 'right' }}>{i + 1}.</span>
                          <textarea
                            value={ob.descripcion}
                            onChange={e => {
                              const next = [...obligaciones];
                              next[i] = { descripcion: e.target.value };
                              setObligaciones(next);
                            }}
                            rows={2}
                            style={{ ...textareaStyle, flex: 1, margin: 0 }}
                            placeholder={`Obligación específica ${i + 1}...`}
                            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                          />
                          {obligaciones.length > 1 && (
                            <button type="button"
                              onClick={() => setObligaciones(obligaciones.filter((_, idx) => idx !== i))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1.1rem', paddingTop: 6, lineHeight: 1 }}
                            >✕</button>
                          )}
                        </div>
                      ))}
                      <button type="button"
                        onClick={() => setObligaciones([...obligaciones, { descripcion: '' }])}
                        style={{ marginTop: 4, fontSize: '0.82rem', color: 'var(--brand-secondary)', background: 'none', border: '1px dashed var(--brand-secondary)', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontFamily: 'Gabarito, sans-serif' }}
                      >+ Agregar obligación</button>
                    </div>
                  </div>
                  )}

                  {/* Entregables dinámicos con porcentaje */}
                  <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    <div style={labelCellStyle}>{esDirecta ? '6.2' : '5.3'} Entregables:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" hint="Describa cada entregable. Si el pago está ligado al entregable, indique el porcentaje. La suma de los porcentajes con valor debe ser 100%." />
                      {(() => {
                        const sumaTotal = entregablesDetalle.reduce((s, e) => s + (!e.sinPorcentaje && e.porcentaje !== '' ? parseFloat(e.porcentaje) || 0 : 0), 0);
                        const hayPorcentajes = entregablesDetalle.some(e => !e.sinPorcentaje && e.porcentaje !== '');
                        const sumaOk = !hayPorcentajes || sumaTotal === 100;
                        return (
                          <>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif', marginBottom: 8 }}>
                              <thead>
                                <tr style={{ backgroundColor: '#fde8e2' }}>
                                  <th style={{ border: '1px solid #e5e7eb', padding: '8px 6px', fontWeight: 700, color: '#374151', textAlign: 'center', width: 32 }}>#</th>
                                  <th style={{ border: '1px solid #e5e7eb', padding: '8px 10px', fontWeight: 700, color: '#374151', textAlign: 'left' }}>Descripción del entregable</th>
                                  <th style={{ border: '1px solid #e5e7eb', padding: '8px 10px', fontWeight: 700, color: '#374151', textAlign: 'center', width: 130 }}>% Pago</th>
                                  <th style={{ border: '1px solid #e5e7eb', padding: '8px 6px', width: 32 }}></th>
                                </tr>
                              </thead>
                              <tbody>
                                {entregablesDetalle.map((ent, i) => (
                                  <tr key={i}>
                                    <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'center', color: '#6B7280', fontWeight: 600 }}>{i + 1}</td>
                                    <td style={{ border: '1px solid #e5e7eb', padding: 6 }}>
                                      <textarea
                                        value={ent.descripcion}
                                        onChange={e => {
                                          const next = [...entregablesDetalle];
                                          next[i] = { ...next[i], descripcion: e.target.value };
                                          setEntregablesDetalle(next);
                                        }}
                                        rows={3}
                                        placeholder="Describir el entregable..."
                                        style={{ ...textareaStyle, margin: 0, minHeight: 64 }}
                                        onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                      />
                                    </td>
                                    <td style={{ border: '1px solid #e5e7eb', padding: 8 }}>
                                      {ent.sinPorcentaje ? (
                                        <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '0.78rem', fontStyle: 'italic' }}>Sin %</div>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                                          <input
                                            type="number" min="0" max="100" step="1"
                                            value={ent.porcentaje}
                                            onChange={e => {
                                              const next = [...entregablesDetalle];
                                              next[i] = { ...next[i], porcentaje: e.target.value };
                                              setEntregablesDetalle(next);
                                            }}
                                            placeholder="0"
                                            style={{ ...inputStyle, width: 60, textAlign: 'center', padding: '6px 4px' }}
                                            onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                            onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                                          />
                                          <span style={{ color: '#6B7280', fontSize: '0.85rem' }}>%</span>
                                        </div>
                                      )}
                                      <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 6, cursor: 'pointer', fontSize: '0.72rem', color: '#6B7280' }}>
                                        <input
                                          type="checkbox"
                                          checked={ent.sinPorcentaje}
                                          onChange={e => {
                                            const next = [...entregablesDetalle];
                                            next[i] = { ...next[i], sinPorcentaje: e.target.checked, porcentaje: e.target.checked ? '' : next[i].porcentaje };
                                            setEntregablesDetalle(next);
                                          }}
                                          style={{ accentColor: 'var(--brand-secondary)', width: 13, height: 13 }}
                                        />
                                        Sin porcentaje
                                      </label>
                                    </td>
                                    <td style={{ border: '1px solid #e5e7eb', padding: 8, textAlign: 'center' }}>
                                      {entregablesDetalle.length > 1 && (
                                        <button type="button"
                                          onClick={() => setEntregablesDetalle(entregablesDetalle.filter((_, idx) => idx !== i))}
                                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#DC2626', fontSize: '1.1rem', lineHeight: 1 }}
                                        >✕</button>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              {hayPorcentajes && (
                                <tfoot>
                                  <tr style={{ backgroundColor: sumaOk ? '#f0fdf4' : '#fef2f2' }}>
                                    <td colSpan={2} style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'right', fontWeight: 600, fontSize: '0.82rem', color: sumaOk ? '#15803d' : '#DC2626' }}>
                                      Total porcentajes:
                                    </td>
                                    <td style={{ border: '1px solid #e5e7eb', padding: '8px 10px', textAlign: 'center', fontWeight: 700, fontSize: '0.9rem', color: sumaOk ? '#15803d' : '#DC2626' }}>
                                      {sumaTotal}%
                                      {sumaOk ? ' ✓' : ` (falta ${100 - sumaTotal}%)`}
                                    </td>
                                    <td style={{ border: '1px solid #e5e7eb' }}></td>
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                            <button type="button"
                              onClick={() => setEntregablesDetalle([...entregablesDetalle, { descripcion: '', porcentaje: '', sinPorcentaje: false }])}
                              style={{ fontSize: '0.82rem', color: 'var(--brand-secondary)', background: 'none', border: '1px dashed var(--brand-secondary)', borderRadius: 6, padding: '4px 14px', cursor: 'pointer', fontFamily: 'Gabarito, sans-serif' }}
                            >+ Agregar entregable</button>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>

                {/* ── SECCIÓN VI/VII — Anexos ── */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                  <SectionHeader title={`${esDirecta ? 'VII' : 'VI'}. ANEXOS.`} />

                  {esInvitacionOTdr ? (
                    /* Inv/TDR — campo de texto libre */
                    <div style={{ ...rowStyle, borderBottom: 'none' }}>
                      <div style={labelCellStyle}>6.1 Anexos:</div>
                      <div style={{ flex: 1, padding: 16 }}>
                        <textarea
                          value={anexosTexto}
                          onChange={e => setAnexosTexto(e.target.value)}
                          rows={5} style={textareaStyle}
                          placeholder="Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo..."
                          onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                          onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                        />
                      </div>
                    </div>
                  ) : (
                    /* Directa — tabla dinámica original */
                    <>
                      <div style={{ padding: '10px 20px', backgroundColor: '#fff8f7', borderBottom: '1px solid #fdd5c9' }}>
                        <p style={{ fontSize: '0.78rem', color: '#6B7280', fontStyle: 'italic' }}>
                          Relacionar todos los documentos que se hayan generado o tenido en cuenta para la elaboración del presente estudio previo.
                        </p>
                      </div>
                      <div style={{ overflowX: 'auto', padding: '12px 16px' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'Gabarito, sans-serif' }}>
                          <thead>
                            <tr style={{ backgroundColor: 'var(--brand-primary)' }}>
                              <th style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', width: 38, textAlign: 'center' }}>#</th>
                              <th style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', textAlign: 'left' }}>Nombre del documento</th>
                              <th style={{ border: '1px solid #d97458', padding: '8px', color: '#fff', width: 40 }}></th>
                            </tr>
                          </thead>
                          <tbody>
                            {anexosDocs.map((a, i) => (
                              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? '#fff' : '#fdf9f8' }}>
                                <td style={{ border: '1px solid #e5e7eb', padding: 6, textAlign: 'center', fontWeight: 700, color: '#374151' }}>{i + 1}</td>
                                <td style={{ border: '1px solid #e5e7eb', padding: 4 }}>
                                  <input type="text" value={a.nombre} onChange={e => handleAnexoChange(i, 'nombre', e.target.value)}
                                    style={{ ...inputStyle, border: '1px solid transparent' }}
                                    placeholder="Nombre del documento"
                                    onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                                    onBlur={e => e.target.style.borderColor = 'transparent'}
                                  />
                                </td>
                                <td style={{ border: '1px solid #e5e7eb', padding: 4, textAlign: 'center' }}>
                                  <button type="button" onClick={() => eliminarAnexo(i)}
                                    style={{ color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <button type="button" onClick={agregarAnexo}
                          style={{
                            marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 6,
                            padding: '6px 14px', border: '1px solid var(--brand-primary)', borderRadius: 6,
                            color: 'var(--brand-primary)', backgroundColor: '#fff', cursor: 'pointer',
                            fontSize: '0.8rem', fontFamily: 'Gabarito, sans-serif', fontWeight: 600
                          }}
                        >
                          <Plus size={14} /> Agregar documento
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* ── SECCIÓN VII/VIII — Riesgos y SST ── */}
                <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                  <SectionHeader title={`${esDirecta ? 'VIII' : 'VII'}. RIESGOS Y CRITERIOS AMBIENTALES O DE SST.`} />

                  <div style={rowStyle}>
                    <div style={labelCellStyle}>{esDirecta ? '8.1' : '7.1'} Riesgos:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" hint='El riesgo es un evento que puede generar efectos adversos y de distinta magnitud en el logro de los objetivos del Proceso de Contratación o en la ejecución de un Contrato. Por lo anterior, describa los posibles riesgos que se podrían presentar en la etapa precontractual, contractual y de ejecución del proceso de contratación descrito en el presente documento.' />
                      <textarea value={riesgosCriterios.riesgos}
                        onChange={e => setRiesgosCriterios({ ...riesgosCriterios, riesgos: e.target.value })}
                        rows={4} style={textareaStyle}
                        placeholder="El proyecto se ha identificado con el nivel de riesgo..."
                        onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                      />
                    </div>
                  </div>

                  <div style={{ ...rowStyle, borderBottom: 'none' }}>
                    <div style={labelCellStyle}>{esDirecta ? '8.2/8.3' : '7.2'} Criterios ambientales o de SST:</div>
                    <div style={{ flex: 1, padding: 16 }}>
                      <FieldLabel label="" hint="Teniendo en cuenta las características de la contratación a solicitar, describa los requerimientos ambientales o de seguridad y salud en el trabajo que se deban exigir al contratista o proveedor (si aplica)." />
                      <textarea value={riesgosCriterios.criteriosSST}
                        onChange={e => setRiesgosCriterios({ ...riesgosCriterios, criteriosSST: e.target.value })}
                        rows={3} style={textareaStyle}
                        placeholder="Relacionar los requisitos del proveedor respecto a la seguridad y salud en el trabajo..."
                        onFocus={e => e.target.style.borderColor = 'var(--brand-primary)'}
                        onBlur={e => e.target.style.borderColor = '#D1D5DB'}
                      />
                    </div>
                  </div>
                </div>

                {/* Conclusiones — solo Directa (no existe en PDF Inv/TDR) */}
                {esDirecta && (
                  <div className="rounded-xl overflow-hidden shadow-md border border-gray-200">
                    <SectionHeader title="CONCLUSIONES POR PARTE DEL COMITÉ DE CONTRATACIONES." />

                    <div style={{ ...rowStyle, borderBottom: 'none' }}>
                      <div style={labelCellStyle}>Conclusiones del Comité:</div>
                      <div style={{ flex: 1, padding: 16 }}>
                        <FieldLabel label="" hint="Indicar las conclusiones y si la contratación fue aprobada por el Comité de contrataciones." />
                        <textarea
                          value={conclusiones}
                          onChange={e => { if (rol === 'Administrador') setConclusions(e.target.value); }}
                          rows={5}
                          readOnly={rol !== 'Administrador'}
                          style={{
                            ...textareaStyle,
                            ...(rol !== 'Administrador' ? { backgroundColor: '#F9FAFB', color: '#6B7280', cursor: 'not-allowed', borderColor: '#E5E7EB' } : {})
                          }}
                          placeholder="Indicar las conclusiones y la viabilidad del presente documento..."
                          onFocus={e => { if (rol === 'Administrador') e.target.style.borderColor = 'var(--brand-primary)'; }}
                          onBlur={e => { if (rol === 'Administrador') e.target.style.borderColor = '#D1D5DB'; }}
                        />
                        {rol !== 'Administrador' && (
                          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
                            Este campo es diligenciado por el Comité de Contrataciones.
                          </p>
                        )}
                        {rol === 'Administrador' && (
                          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 4, fontStyle: 'italic' }}>
                            Sugerencia: "Aprobada por unanimidad de los miembros del comité."
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}


              </div>
            )}

            {/* ══════════════ TAB: DOCUMENTOS ══════════════ */}
            {tabActual === 'documentos' && (
              <div className="space-y-6">
                {!modoSoloLectura ? (
                  <div className="bg-white rounded-xl shadow-lg border-2 border-dashed border-gray-300 p-8">
                    <div className="text-center mb-6">
                      <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FolderOpen style={{ color: '#3D2B86' }} size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-gray-900" style={{ fontFamily: 'Gabarito, sans-serif' }}>Cargar Documentos de Soporte</h3>
                      <p className="text-sm text-gray-500 max-w-md mx-auto" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        Cargue archivos que sirvan de sustento para su solicitud (PDF, Excel, Word). Este campo es opcional.
                      </p>
                    </div>

                    <div className="flex justify-center mb-8">
                      <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition-all flex items-center gap-2 shadow-md">
                        <Plus size={20} />
                        Seleccionar Archivos
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          onChange={async (e) => {
                            if (e.target.files) {
                              await subirArchivosSolicitante(Array.from(e.target.files));
                              e.target.value = '';
                            }
                          }}
                        />
                      </label>
                    </div>

                    {archivosSolicitante.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2">Archivos seleccionados ({archivosSolicitante.length})</p>
                        {archivosSolicitante.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100 group hover:border-indigo-200 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-white rounded-lg border border-gray-200 text-indigo-600">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900 leading-none mb-1">{file.nombre}</p>
                                <p className="text-[10px] text-gray-500 font-medium">{file.tamanio} • {new Date(file.fecha).toLocaleDateString()}</p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setArchivosSolicitante(prev => prev.filter((_, i) => i !== idx))}
                              className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 mb-6">
                      <p className="text-sm text-blue-900 font-medium" style={{ fontFamily: 'Gabarito, sans-serif' }}>Documentos de la Solicitud</p>
                      <p className="text-xs text-blue-700 mt-1" style={{ fontFamily: 'Gabarito, sans-serif' }}>
                        Estos documentos fueron cargados por el solicitante como soporte inicial.
                      </p>
                    </div>
                    {archivosSolicitante.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {archivosSolicitante.map((file, idx) => (
                          <div key={idx} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-200">
                            <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
                              <FileText size={24} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-900 truncate">{file.nombre}</p>
                              <p className="text-[10px] text-gray-500">{file.tamanio} • Soporte Solicitante</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => abrirDocumentoSolicitante(file)}
                              className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg font-bold text-xs"
                            >
                              Ver
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
                        <FolderOpen className="mx-auto text-gray-300 mb-3" size={48} />
                        <p className="text-gray-500" style={{ fontFamily: 'Gabarito, sans-serif' }}>No se cargaron soportes iniciales</p>
                        <div className="mt-4">
                          <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs border ${subiendoArchivosSolicitante ? 'text-gray-400 border-gray-200 cursor-not-allowed' : 'text-orange-600 border-orange-200 hover:bg-orange-50 cursor-pointer'}`}>
                            <Plus size={14} /> Cargar soporte
                            <input
                              type="file"
                              className="hidden"
                              disabled={subiendoArchivosSolicitante}
                              onChange={async (e) => {
                                if (e.target.files?.length) {
                                  await subirArchivosSolicitante(Array.from(e.target.files));
                                  e.target.value = '';
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {esVistaExistente && solicitudDetalle && (
            <TrazabilidadFlujo solicitud={solicitudDetalle} />
          )}

          {/* Botones */}
          <div
            className="border-t border-gray-200 pt-8 mt-12 flex flex-col sm:flex-row items-center justify-between gap-4"
            style={{
              position: 'sticky',
              bottom: 0,
              background: '#f8fafc',
              paddingBottom: 10,
              zIndex: 15
            }}
          >
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              {!modoSoloLectura && tabActual !== 'planeacion' && (
                <button
                  type="button"
                  onClick={irAAnterior}
                  className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  style={{ fontFamily: 'Gabarito, sans-serif' }}
                >
                  <ChevronDown className="rotate-90" size={18} /> Anterior
                </button>
              )}
              <button
                type="button"
                onClick={onBack}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                style={{ fontFamily: 'Gabarito, sans-serif' }}
              >
                {modoSoloLectura ? <ArrowLeft size={18} /> : null} {modoSoloLectura ? 'Volver a Mis Solicitudes' : 'Cancelar'}
              </button>
            </div>

            {!modoSoloLectura && (
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => guardarBorrador()}
                  className="px-6 py-3 border-2 text-gray-700 rounded-lg hover:shadow-md transition-all font-medium flex items-center justify-center gap-2"
                  style={{ borderColor: '#00A9E0', fontFamily: 'Gabarito, sans-serif', color: '#007AA3' }}
                >
                  <Save size={20} /> Guardar Borrador
                </button>

                {tabActual === 'planeacion' ? (
                  <button
                    type="button"
                    onClick={irASiguiente}
                    className="px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                    style={{ backgroundColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C73D1C'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--brand-primary)'}
                  >
                    Siguiente <ChevronDown className="-rotate-90" size={18} />
                  </button>
                ) : tabActual === 'avanzado' ? (
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(232,73,34,0.39)]"
                      style={{ backgroundColor: '#10B981', fontFamily: 'Gabarito, sans-serif' }}
                    >
                      <Send size={20} /> Enviar a Gerente
                    </button>
                    <button
                      type="button"
                      onClick={irASiguiente}
                      className="px-6 py-3 border-2 text-gray-700 rounded-lg hover:shadow-md transition-all font-medium flex items-center justify-center gap-2"
                      style={{ borderColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif', color: 'var(--brand-primary)' }}
                    >
                      Ver Documentos <ChevronDown className="-rotate-90" size={18} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="submit"
                    className="px-8 py-3 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2 shadow-[0_4px_14px_0_rgba(232,73,34,0.39)]"
                    style={{ backgroundColor: 'var(--brand-primary)', fontFamily: 'Gabarito, sans-serif' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#C73D1C'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--brand-primary)'}
                  >
                    <Send size={20} /> Enviar Solicitud
                  </button>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
