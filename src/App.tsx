import React, { useState, useEffect } from 'react';
import { useMsal, AuthenticatedTemplate, UnauthenticatedTemplate } from "@azure/msal-react";
import { InteractionStatus } from "@azure/msal-browser";
import { loginRequest } from "./authConfig";
import { getUserProfile } from "./lib/graphService";
import { VistasSupervisor } from './components/supervisor/VistasSupervisor';
import { VistasGerente } from './components/gerente/VistasGerente';
import { VistasJuridica } from './components/juridica/VistasJuridica';
import { VistasFinanciera } from './components/financiera/VistasFinanciera';
import { VistasSecretariaComite } from './components/secretaria/VistasSecretariaComite';
import { VistasAdministrador } from './components/administrador/VistasAdministrador';
import { LoginPage } from './components/LoginPage';
import { RespuestaProponente } from './components/publico/RespuestaProponente';
import { PostulacionPublica } from './components/publico/PostulacionPublica';
import { Loader2, ShieldAlert, SlidersHorizontal } from 'lucide-react';
import { Toaster } from 'sonner';

export type RolUsuario = 'Supervisor' | 'Gerente' | 'Juridica' | 'Financiera' | 'Administrador' | 'SecretariaComite';
const API_URL = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
const ALL_ROLE_OPTIONS: { value: RolUsuario; label: string }[] = [
  { value: 'Supervisor', label: 'Solicitante (Supervisor)' },
  { value: 'Gerente', label: 'Gerente de Área' },
  { value: 'Juridica', label: 'Jurídica' },
  { value: 'Financiera', label: 'Financiera' },
  { value: 'Administrador', label: 'Administrador' },
  { value: 'SecretariaComite', label: 'Secretaría de Comité' },
];
const DB_ROLE_TO_VIEW: Record<string, RolUsuario> = {
  supervisor: 'Supervisor',
  gerente_area: 'Gerente',
  juridica: 'Juridica',
  financiera: 'Financiera',
  administrador: 'Administrador',
  secretaria_comite: 'SecretariaComite',
};

export default function App() {
  const { instance, accounts, inProgress } = useMsal();
  const [rolActual, setRolActual] = useState<RolUsuario>('Supervisor');
  const [userProfile, setUserProfile] = useState<any>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [restoreFocusOnClose, setRestoreFocusOnClose] = useState(false);
  const [rolesPermitidos, setRolesPermitidos] = useState<RolUsuario[]>(['Supervisor']);
  const switcherButtonRef = React.useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (accounts.length > 0) {
      const fetchProfile = async () => {
        try {
          const response = await instance.acquireTokenSilent({
            ...loginRequest,
            account: accounts[0]
          });
          const profile = await getUserProfile(response.accessToken);
          setUserProfile(profile);
          console.log("Profile fetched:", profile);
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      };
      fetchProfile();
    }
  }, [accounts, instance]);

  useEffect(() => {
    const account = accounts[0];
    if (!account?.username) {
      setRolesPermitidos(['Supervisor']);
      return;
    }

    fetch(`${API_URL}/api/admin/permisos-pantallas?email=${encodeURIComponent(account.username)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(`Error ${res.status}`);
        return res.json();
      })
      .then((data) => {
        const permisos = Array.isArray(data?.permisos) ? data.permisos : [];
        if (permisos.length > 0) {
          const permitidos = ALL_ROLE_OPTIONS
            .map((r) => r.value)
            .filter((r) => permisos.includes(r));
          setRolesPermitidos(permitidos.length > 0 ? permitidos : ['Supervisor']);
          return;
        }

        // Sin permisos explícitos: usar rol real de BD, no acceso total.
        return fetch(`${API_URL}/api/usuarios/me?email=${encodeURIComponent(account.username)}`)
          .then(async (res) => {
            if (!res.ok) throw new Error(`Error ${res.status}`);
            return res.json();
          })
          .then((profile) => {
            const rolDb = String(profile?.rol || '').toLowerCase();
            const mapped = DB_ROLE_TO_VIEW[rolDb];
            setRolesPermitidos(mapped ? [mapped] : ['Supervisor']);
          })
          .catch(() => {
            setRolesPermitidos(['Supervisor']);
          });
      })
      .catch(() => {
        setRolesPermitidos(['Supervisor']);
      });
  }, [accounts]);

  useEffect(() => {
    if (!rolesPermitidos.includes(rolActual)) {
      setRolActual(rolesPermitidos[0] || 'Supervisor');
    }
  }, [rolesPermitidos, rolActual]);

  useEffect(() => {
    if (rolesPermitidos.length <= 1) setSwitcherOpen(false);
  }, [rolesPermitidos]);

  useEffect(() => {
    if (!switcherOpen) return;

    const onClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest('[data-view-switcher-root="true"]')) return;
      setRestoreFocusOnClose(true);
      setSwitcherOpen(false);
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setRestoreFocusOnClose(true);
        setSwitcherOpen(false);
      }
    };

    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onEscape);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onEscape);
    };
  }, [switcherOpen]);

  useEffect(() => {
    if (!switcherOpen && restoreFocusOnClose) {
      switcherButtonRef.current?.focus();
      setRestoreFocusOnClose(false);
    }
  }, [switcherOpen, restoreFocusOnClose]);

  const handleLogin = () => {
    instance.loginRedirect(loginRequest).catch(e => {
      console.error(e);
    });
  };

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => {
      console.error(e);
    });
  };

  const renderSelectorRol = () => (
    rolesPermitidos.length > 1 ? (
      <div
        className="fixed bottom-4 right-4 z-50 print:hidden"
        data-view-switcher-root="true"
        data-print="hide"
      >
        <button
          ref={switcherButtonRef}
          onClick={() => setSwitcherOpen((v) => !v)}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white/95 shadow-md px-3 py-2 hover:shadow-lg transition-all"
        >
          <div className="w-7 h-7 rounded-lg bg-blue-50 text-[var(--brand-secondary)] flex items-center justify-center">
            <SlidersHorizontal size={15} />
          </div>
          <span className="text-xs font-bold text-slate-600 tracking-wide uppercase">Vista</span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">DEMO</span>
        </button>

        {switcherOpen && (
          <div className="mt-2 w-[280px] rounded-2xl border border-slate-200 bg-white/95 shadow-lg p-3">
            <p className="text-xs font-bold text-slate-600 tracking-wide uppercase mb-2">Cambiar vista</p>
            <select
              value={rolActual}
              onChange={(e) => setRolActual(e.target.value as RolUsuario)}
              className="w-full app-top-select text-sm"
            >
              {ALL_ROLE_OPTIONS
                .filter((opt) => rolesPermitidos.includes(opt.value))
                .map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-2">Las vistas visibles dependen de tus permisos.</p>
          </div>
        )}
      </div>
    ) : null
  );

  const renderVistaActual = () => {
    // Defensa adicional: aunque intenten forzar estado/vista, no se renderiza si no está permitida.
    if (!rolesPermitidos.includes(rolActual)) {
      const fallback = rolesPermitidos[0];
      return (
        <div className="min-h-[60vh] flex items-center justify-center p-8">
          <div className="max-w-xl w-full bg-white border border-slate-200 rounded-3xl shadow-sm p-8 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mb-4">
              <ShieldAlert size={30} />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Acceso restringido</h2>
            <p className="text-slate-500 font-medium mt-2">
              No tienes permiso para acceder a esta pantalla.
            </p>
            {fallback && (
              <button
                onClick={() => setRolActual(fallback)}
                className="mt-6 px-5 py-2.5 rounded-xl text-white font-bold bg-[#E84922] hover:bg-[#C73D1C]"
              >
                Ir a mi vista permitida
              </button>
            )}
          </div>
        </div>
      );
    }

    switch (rolActual) {
      case 'Supervisor':
        return <VistasSupervisor />;
      case 'Gerente':
        return <VistasGerente />;
      case 'Juridica':
        return <VistasJuridica />;
      case 'Financiera':
        return <VistasFinanciera />;
      case 'Administrador':
        return <VistasAdministrador />;
      case 'SecretariaComite':
        return <VistasSecretariaComite />;
      default:
        return <VistasSupervisor />;
    }
  };

  if (inProgress === InteractionStatus.HandleRedirect || inProgress === InteractionStatus.Startup) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, var(--brand-secondary), #244a72)' }}>
        <div className="flex flex-col items-center gap-4 text-white">
          <Loader2 className="animate-spin" size={48} />
          <p className="text-xl font-medium">Validando sesión corporativa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Toaster position="top-right" richColors closeButton />
      {/* Rutas públicas — sin autenticación */}
      {window.location.pathname === '/respuesta-proponente' ? (
        <RespuestaProponente />
      ) : window.location.pathname === '/convocatoria-publica' ? (
        <PostulacionPublica />
      ) : (
        <>
          <AuthenticatedTemplate>
            {renderSelectorRol()}
            <main>
              {renderVistaActual()}
            </main>
          </AuthenticatedTemplate>

          <UnauthenticatedTemplate>
            <LoginPage onLogin={handleLogin} />
          </UnauthenticatedTemplate>
        </>
      )}
    </div>
  );
}