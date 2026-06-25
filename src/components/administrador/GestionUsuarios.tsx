import React, { useState, useEffect } from 'react';
import { Users, Plus, Edit, Trash2, Search, Loader2, Shield, Mail, Building2, Clock } from 'lucide-react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getCompanyUsers, getCompanyUsersFromGroup, hydrateUsersDepartment } from '../../lib/graphService';
import { toast } from 'sonner';

const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const DEFAULT_SECURITY_GROUP_ID = '1d5f9278-85f5-4f01-a651-e6c1e160cc55';

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  gerencia_nombre: string;
  activo: boolean;
  ultimo_acceso: string;
  permisos_pantallas?: string[];
}

const SCREEN_OPTIONS = [
  { key: 'Supervisor', label: 'Supervisor/Solicitante' },
  { key: 'Gerente', label: 'Gerente' },
  { key: 'Juridica', label: 'Jurídica' },
  { key: 'Financiera', label: 'Financiera' },
  { key: 'Administrador', label: 'Administrador' },
  { key: 'SecretariaComite', label: 'Secretaría de Comité' },
];

const SINGLE_SCREEN_ROLE_MAP: Record<string, string> = {
  Supervisor: 'supervisor',
  Gerente: 'gerente_area',
  Juridica: 'juridica',
  Financiera: 'financiera',
  Administrador: 'administrador',
  SecretariaComite: 'secretaria_comite',
};

const tt = (s: string) => s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

const USUARIOS_MOCK: Usuario[] = [
  { id: 'mock-01', nombre: tt('ABRIL CUERVO ANDREA PATRICIA'),        email: 'andrea.abril@investinbogota.org',      rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-02', nombre: tt('AGUDELO VALENCIA JOHANA MARCELA'),     email: 'johana.agudelo@investinbogota.org',   rol: 'juridica',      gerencia_nombre: 'Área Jurídica',    activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Juridica'] },
  { id: 'mock-03', nombre: tt('BARRAGAN JOSE NICOLAS'),               email: 'jose.barragan@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-04', nombre: tt('CABRERA SILVA JENNY JASMIN'),          email: 'jenny.cabrera@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-05', nombre: tt('CARDENAS PEREZ GABRIELA'),             email: 'gabriela.cardenas@investinbogota.org',rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-06', nombre: tt('CARDENAS PINZON VALERIA'),             email: 'valeria.cardenas@investinbogota.org', rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-07', nombre: tt('CASELLES RINCÓN NADIA KAMILA'),        email: 'nadia.caselles@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-08', nombre: tt('CHACON PINEDA ALIX AYDA'),             email: 'alix.chacon@investinbogota.org',      rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-09', nombre: tt('DIAZ SANCHEZ DEISY'),                  email: 'deisy.diaz@investinbogota.org',       rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-10', nombre: tt('DIAZ TORO FERNADO HUMBERTO'),          email: 'fernado.diaz@investinbogota.org',     rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-11', nombre: tt('DURAN MORENO ISIS YUMALI'),            email: 'isis.duran@investinbogota.org',       rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-12', nombre: tt('ESPINOSA MENESES SAMUEL'),             email: 'samuel.espinosa@investinbogota.org',  rol: 'financiera',    gerencia_nombre: 'Área Financiera',  activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Financiera'] },
  { id: 'mock-13', nombre: tt('FAJARDO GOMEZ LUZ EDIT'),              email: 'luz.fajardo@investinbogota.org',      rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-14', nombre: tt('FIGUEROA RODRIGUEZ ANDREA CATALINA'),  email: 'andrea.figueroa@investinbogota.org',  rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-15', nombre: tt('GARCIA ACEVEDO LINA MARCELA'),         email: 'lina.garcia@investinbogota.org',      rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-16', nombre: tt('GIRALDO VASQUEZ JUAN SEBASTIAN'),      email: 'juan.giraldo@investinbogota.org',     rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-17', nombre: tt('GONZALEZ CASTRO ADRIANA MARCELA'),     email: 'adriana.gonzalez@investinbogota.org', rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-18', nombre: tt('HERNANDEZ HERNANDEZ ANA EMILET'),      email: 'ana.hernandez@investinbogota.org',    rol: 'financiera',    gerencia_nombre: 'Área Financiera',  activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Financiera'] },
  { id: 'mock-19', nombre: tt('INFANTE MARTINEZ MARIA JOSE'),         email: 'maria.infante@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-20', nombre: tt('MARTINEZ QUINTERO VALERIA'),           email: 'valeria.martinez@investinbogota.org', rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-21', nombre: tt('MEJIA PLAZAS ALEJANDRA'),              email: 'alejandra.mejia@investinbogota.org',  rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-22', nombre: tt('MONTAÑA CAMARGO CATALINA'),            email: 'catalina.montana@investinbogota.org', rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-23', nombre: tt('MONTAÑA ORJUELA ANDREA'),              email: 'andrea.montana@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-24', nombre: tt('MONTEREY ARANDA IVANOFF'),             email: 'ivanoff.monterey@investinbogota.org', rol: 'administrador', gerencia_nombre: 'Administración',   activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Administrador'] },
  { id: 'mock-25', nombre: tt('MORALES ARISTIZABAL LUIS FELIPE'),     email: 'luis.morales@investinbogota.org',     rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-26', nombre: tt('OSPINA MOYA DANIELA'),                 email: 'daniela.ospina@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-27', nombre: tt('PEÑA TORRES KAREN JULIANA'),           email: 'karen.pena@investinbogota.org',       rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-28', nombre: tt('PINEDA VARGAS MICHAEL STEVE'),         email: 'michael.pineda@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-29', nombre: tt('PINZON JUAN FELIPE'),                  email: 'juan.pinzon@investinbogota.org',      rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-30', nombre: tt('RINCON AMORTEGUI EDUAR'),              email: 'eduar.rincon@investinbogota.org',     rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-31', nombre: tt('ROJAS JOSE LUIS'),                     email: 'jose.rojas@investinbogota.org',       rol: 'financiera',    gerencia_nombre: 'Área Financiera',  activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Financiera'] },
  { id: 'mock-32', nombre: tt('SANCHEZ CARLOS IGNACIO'),              email: 'carlos.sanchez@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-33', nombre: tt('SANCHEZ CARDONA JULIETH MARCELA'),     email: 'julieth.sanchez@investinbogota.org',  rol: 'administrador', gerencia_nombre: 'Administración',   activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Administrador'] },
  { id: 'mock-34', nombre: tt('SOLANO OLARTE FRANSISCO'),             email: 'fransisco.solano@investinbogota.org', rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-35', nombre: tt('TAMAYO SANDRA CAROLINA'),              email: 'sandra.tamayo@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-36', nombre: tt('TIBADUIZA LEON LUIS ALEJANDRO'),       email: 'luis.tibaduiza@investinbogota.org',   rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-37', nombre: tt('TOBON ARANGO LAURA'),                  email: 'laura.tobon@investinbogota.org',      rol: 'juridica',      gerencia_nombre: 'Área Jurídica',    activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor', 'Juridica'] },
  { id: 'mock-38', nombre: tt('VASQUEZ VERGARA LUISA FERNANDA'),      email: 'luisa.vasquez@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
  { id: 'mock-39', nombre: tt('VERGARA GARCIA MARIA ALEJANDRA'),      email: 'maria.vergara@investinbogota.org',    rol: 'supervisor',    gerencia_nombre: 'Invest in Bogotá', activo: true, ultimo_acceso: '', permisos_pantallas: ['Supervisor'] },
];

export function GestionUsuarios() {
  const { instance, accounts } = useMsal();
  const [busqueda, setBusqueda] = useState('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState('Base de datos');
  const [departamentosFaltantes, setDepartamentosFaltantes] = useState(0);
  const [permisoDirectorioError, setPermisoDirectorioError] = useState<string | null>(null);
  const [usuarioEditando, setUsuarioEditando] = useState<Usuario | null>(null);
  const [permisosEdicion, setPermisosEdicion] = useState<string[]>([]);
  const [guardandoPermisos, setGuardandoPermisos] = useState(false);

  const ALLOWED_P = new Set(['Supervisor','Gerente','Juridica','Financiera','Administrador','SecretariaComite']);
  const sanitizeP = (arr: any[]): string[] =>
    Array.isArray(arr) ? arr.map(String).filter(v => ALLOWED_P.has(v)) : [];

  const fetchUsuarios = async () => {
    setLoading(true);
    try {
      // 1) Datos locales + mapa de permisos guardados en configuracion
      const [res, permRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/usuarios`),
        fetch(`${API_URL}/api/admin/permisos-pantallas`),
      ]);
      const dataLocal: Usuario[] = res.ok ? await res.json() : [];
      const permData = permRes.ok ? await permRes.json() : {};
      const savedPermisosMap: Record<string, string[]> = permData?.permisos ?? {};

      const localByEmail = new Map<string, Usuario>(
        dataLocal
          .filter((u) => !!u.email)
          .map((u) => [u.email.toLowerCase(), u])
      );

      // 2) Si no hay sesión, usar BD o fallback mock.
      const account = accounts[0];
      if (!account) {
        if (dataLocal.length > 0) {
          setUsuarios(dataLocal);
          setSourceLabel('Base de datos');
        } else {
          setUsuarios(USUARIOS_MOCK);
          setSourceLabel('Datos de referencia institucional');
        }
        setPermisoDirectorioError(null);
        return;
      }

      const groupId =
        (import.meta as any).env.VITE_SECURITY_GROUP_ID ||
        (import.meta as any).env.VITE_AAD_SECURITY_GROUP_ID ||
        DEFAULT_SECURITY_GROUP_ID;

      const baseScopes = [...new Set([...(loginRequest.scopes || []), 'GroupMember.Read.All'])];
      const extendedScopes = [...new Set([...baseScopes, 'User.Read.All', 'Directory.Read.All'])];

      let tokenResponse;
      try {
        tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account,
          scopes: extendedScopes,
        });
        setPermisoDirectorioError(null);
      } catch (_silentErr) {
        try {
          tokenResponse = await instance.acquireTokenPopup({
            ...loginRequest,
            account,
            scopes: extendedScopes,
            prompt: 'consent',
          });
          setPermisoDirectorioError(null);
        } catch (_popupErr) {
          tokenResponse = await instance.acquireTokenSilent({
            ...loginRequest,
            account,
            scopes: baseScopes,
          });
          setPermisoDirectorioError(
            'No se otorgaron permisos de directorio (User.Read.All/Directory.Read.All). El departamento puede venir vacío para otros usuarios.'
          );
        }
      }

      if (!tokenResponse) {
        tokenResponse = await instance.acquireTokenSilent({
          ...loginRequest,
          account,
          scopes: baseScopes,
        });
      }

      const graphResponse = groupId
        ? await getCompanyUsersFromGroup(tokenResponse.accessToken, groupId)
        : await getCompanyUsers(tokenResponse.accessToken);

      const rawGraphUsers = Array.isArray(graphResponse?.value) ? graphResponse.value : [];
      const graphUsers = await hydrateUsersDepartment(tokenResponse.accessToken, rawGraphUsers);
      const mergedUsers: Usuario[] = graphUsers.map((g: any) => {
        const email = String(g.mail || g.userPrincipalName || '').toLowerCase();
        const local = localByEmail.get(email);
        const mockRef = USUARIOS_MOCK.find(m => m.email.toLowerCase() === email);
        const gerenciaDesdeGrupo = String(g.department || '').trim();
        // Prioridad: (1) configuracion BD, (2) tabla usuarios BD, (3) referencia mock
        const savedPermisos = savedPermisosMap[email];
        const permisosDB =
          savedPermisos && savedPermisos.length > 0
            ? sanitizeP(savedPermisos)
            : Array.isArray(local?.permisos_pantallas) && local.permisos_pantallas.length > 0
              ? local.permisos_pantallas
              : (mockRef?.permisos_pantallas ?? []);
        const rolEfectivo =
          savedPermisos?.includes('Administrador') ? 'administrador'
          : savedPermisos?.includes('Financiera')   ? 'financiera'
          : savedPermisos?.includes('Juridica')      ? 'juridica'
          : local?.rol || mockRef?.rol || 'supervisor';
        return {
          id: local?.id || g.id || email,
          nombre: g.displayName || local?.nombre || 'Sin nombre',
          email: g.mail || g.userPrincipalName || local?.email || '',
          rol: rolEfectivo,
          gerencia_nombre: gerenciaDesdeGrupo || 'Sin departamento en directorio',
          activo: typeof local?.activo === 'boolean' ? local.activo : true,
          ultimo_acceso: local?.ultimo_acceso || '',
          permisos_pantallas: permisosDB,
        };
      });

      if (mergedUsers.length > 0) {
        setUsuarios(mergedUsers);
        setDepartamentosFaltantes(mergedUsers.filter((u) => u.gerencia_nombre === 'Sin departamento en directorio').length);
        setSourceLabel(groupId ? 'Grupo de seguridad Azure AD' : 'Directorio corporativo Azure AD');
      } else if (dataLocal.length > 0) {
        setUsuarios(dataLocal);
        setSourceLabel('Base de datos');
      } else {
        setUsuarios(USUARIOS_MOCK);
        setSourceLabel('Datos de referencia institucional');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setUsuarios(USUARIOS_MOCK);
      setDepartamentosFaltantes(0);
      setSourceLabel('Datos de referencia institucional');
      setPermisoDirectorioError('Azure AD no disponible. Mostrando datos de referencia.');
    } finally {
      setLoading(false);
    }
  };

  const openPermisosEditor = (usuario: Usuario) => {
    setUsuarioEditando(usuario);
    setPermisosEdicion(Array.isArray(usuario.permisos_pantallas) ? usuario.permisos_pantallas : []);
  };

  const togglePermiso = (key: string) => {
    setPermisosEdicion((prev) =>
      prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]
    );
  };

  const savePermisos = async () => {
    if (!usuarioEditando) return;
    setGuardandoPermisos(true);
    const emailGuardado = usuarioEditando.email.toLowerCase();
    try {
      const res = await fetch(`${API_URL}/api/admin/permisos-pantallas`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailGuardado, permisos: permisosEdicion }),
      });
      const resData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(resData?.error || `Error HTTP ${res.status}`);

      setUsuarioEditando(null);

      // Verify persistence: re-read the full permissions map from DB
      const verifyRes = await fetch(`${API_URL}/api/admin/permisos-pantallas`);
      if (verifyRes.ok) {
        const verifyData = await verifyRes.json();
        const savedMap: Record<string, string[]> = verifyData?.permisos ?? {};
        const confirmed = savedMap[emailGuardado];
        if (confirmed && confirmed.length > 0) {
          // Update local state from server-confirmed data
          setUsuarios((prev) =>
            prev.map((u) =>
              u.email.toLowerCase() === emailGuardado
                ? { ...u, permisos_pantallas: confirmed }
                : u
            )
          );
          toast.success('Permisos guardados y verificados correctamente.');
        } else {
          // Server didn't return the saved data → backend not updated or DB issue
          setUsuarios((prev) =>
            prev.map((u) =>
              u.email.toLowerCase() === emailGuardado
                ? { ...u, permisos_pantallas: permisosEdicion }
                : u
            )
          );
          toast.warning('Permisos guardados en la sesión pero no se confirmaron en base de datos. Reinicia el servidor API.');
        }
      } else {
        // Fallback optimistic update
        setUsuarios((prev) =>
          prev.map((u) =>
            u.email.toLowerCase() === emailGuardado
              ? { ...u, permisos_pantallas: permisosEdicion }
              : u
          )
        );
        toast.warning('Permisos guardados, pero el servidor no confirmó la persistencia. Reinicia el servidor API.');
      }
    } catch (err: any) {
      console.error('Error guardando permisos:', err);
      toast.error(`No se pudieron guardar los permisos: ${err?.message || 'Error desconocido'}`);
    } finally {
      setGuardandoPermisos(false);
    }
  };

  const getRolEfectivo = (usuario: Usuario) => {
    const permisos = Array.isArray(usuario.permisos_pantallas) ? usuario.permisos_pantallas : [];
    if (permisos.length === 0) return usuario.rol || 'sin_asignar';
    if (permisos.includes('Administrador')) return 'administrador';
    if (permisos.length === 1) return SINGLE_SCREEN_ROLE_MAP[permisos[0]] || usuario.rol || 'sin_asignar';
    return 'personalizado';
  };

  const getGrupo = (usuario: Usuario): { label: string; color: string } | null => {
    const permisos = Array.isArray(usuario.permisos_pantallas) ? usuario.permisos_pantallas : [];
    if (permisos.includes('Administrador')) return { label: 'ADMINISTRADOR', color: 'bg-slate-900 text-amber-400 border-slate-700' };
    if (permisos.includes('Juridica'))      return { label: 'JURÍDICA',      color: 'bg-blue-50 text-blue-700 border-blue-200' };
    if (permisos.includes('Financiera'))    return { label: 'FINANCIERO',    color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (permisos.includes('Gerente'))       return { label: 'GERENCIA',      color: 'bg-violet-50 text-violet-700 border-violet-200' };
    return null;
  };

  useEffect(() => {
    fetchUsuarios();
  }, [accounts]);

  const usuariosFiltrados = usuarios.filter(
    (user) =>
      user.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      user.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      getRolEfectivo(user).toLowerCase().includes(busqueda.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--brand-secondary)]" />
        <p className="text-slate-500 font-bold font-gabarito">Consultando directorio de usuarios...</p>
      </div>
    );
  }

  return (
    <div className="ux-page p-8 space-y-8 animate-in fade-in duration-700 min-h-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-blue-50">
              <Users className="text-[var(--brand-secondary)]" size={28} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight" style={{ fontFamily: 'Gabarito, sans-serif' }}>
              Gestión de <span className="text-[#E84922]">Usuarios</span>
            </h1>
          </div>
          <p className="text-slate-500 font-medium italic mt-2">
            Administración central de accesos y perfiles institucionales.
          </p>
          <span className="inline-flex mt-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border bg-blue-50 text-[var(--brand-secondary)] border-blue-100">
            Fuente: {sourceLabel}
          </span>
          {departamentosFaltantes > 0 && (
            <p className="text-xs font-semibold text-amber-700 mt-2">
              {departamentosFaltantes} usuario(s) no traen departamento en Azure AD con los permisos actuales.
            </p>
          )}
          {permisoDirectorioError && (
            <p className="text-xs font-semibold text-rose-700 mt-2">
              {permisoDirectorioError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-[var(--brand-secondary)]" size={20} />
            <input
              type="text"
              placeholder="Buscar por nombre, email o rol..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-12 pr-6 py-3 bg-white border-transparent rounded-2xl text-sm font-medium text-slate-600 w-64 lg:w-80 shadow-sm transition-all font-gabarito"
            />
          </div>

        </div>
      </div>

      {/* Stats Quick Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Total Usuarios</p>
            <p className="text-2xl font-black text-slate-900 leading-none">{usuarios.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Shield size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Usuarios Activos</p>
            <p className="text-2xl font-black text-emerald-600 leading-none">{usuarios.filter(u => u.activo).length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Roles definidos</p>
            <p className="text-2xl font-black text-amber-600 leading-none">{new Set(usuarios.map(u => u.rol)).size}</p>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="ux-card rounded-[2.5rem] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="ux-table text-left">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Colaborador</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Rol del Sistema</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Grupo</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Dependencia</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Estado</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Última Gestión</th>
                <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {usuariosFiltrados.map((usuario) => (
                <tr key={usuario.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-[#003D82] font-black text-sm">
                        {usuario.nombre?.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 font-gabarito">{usuario.nombre}</p>
                        <p className="text-xs text-slate-400 flex items-center gap-1"><Mail size={12} /> {usuario.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <span className="inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border" style={{ backgroundColor: 'rgba(51,132,214,0.1)', color: 'var(--brand-secondary)', borderColor: 'rgba(51,132,214,0.18)' }}>
                      {getRolEfectivo(usuario).replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-5">
                    {(() => {
                      const grupo = getGrupo(usuario);
                      return grupo ? (
                        <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${grupo.color}`}>
                          {grupo.label}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">—</span>
                      );
                    })()}
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-600">
                    <span className="flex items-center gap-1.5"><Building2 size={14} /> {usuario.gerencia_nombre || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-5">
                    <span className={`inline-flex px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${usuario.activo ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'
                      }`}>
                      {usuario.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm text-slate-400 font-medium">
                    <span className="flex items-center gap-1.5"><Clock size={14} /> {usuario.ultimo_acceso ? new Date(usuario.ultimo_acceso).toLocaleDateString('es-CO') : 'Nunca'}</span>
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => openPermisosEditor(usuario)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                        title="Editar permisos de pantallas"
                      >
                        <Edit size={18} />
                      </button>
                      <button className="p-2 text-slate-400 hover:text-[var(--state-danger-text)] hover:bg-[var(--state-danger-bg)] rounded-xl transition-all">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {usuarioEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-900">Permisos de pantallas</h3>
              <p className="text-sm text-slate-500 mt-1">
                {usuarioEditando.nombre} - {usuarioEditando.email}
              </p>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[55vh] overflow-y-auto">
              {SCREEN_OPTIONS.map((screen) => (
                <label
                  key={screen.key}
                  className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-[var(--brand-secondary)] transition-colors cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={permisosEdicion.includes(screen.key)}
                    onChange={() => togglePermiso(screen.key)}
                    className="w-4 h-4 text-[var(--brand-secondary)] rounded"
                  />
                  <span className="text-sm font-semibold text-slate-700">{screen.label}</span>
                </label>
              ))}
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setUsuarioEditando(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={savePermisos}
                disabled={guardandoPermisos}
                className="px-5 py-2 rounded-xl text-white font-bold bg-[#E84922] hover:bg-[#C73D1C] disabled:opacity-60"
              >
                {guardandoPermisos ? 'Guardando...' : 'Guardar permisos'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
