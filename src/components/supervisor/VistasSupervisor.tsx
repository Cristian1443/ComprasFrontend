import React, { useState, useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest } from '../../authConfig';
import { getUserProfile } from '../../lib/graphService';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarSupervisor } from './SidebarSupervisor';
import { DashboardSupervisor } from './DashboardSupervisor';
import { MisSolicitudes } from './MisSolicitudes';
import { FormularioSolicitud } from './FormularioSolicitud';
import { EvaluacionProveedor } from './EvaluacionProveedor';
import { Ayuda } from './Ayuda';
import { ContratosSupervisor } from './ContratosSupervisor';
import { DetalleContratoSupervisor } from './DetalleContratoSupervisor';
import { AceptarSupervision } from './AceptarSupervision';
import { ModalSeleccionModalidad } from './ModalSeleccionModalidad';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type ViewSupervisor = 'dashboard' | 'solicitudes' | 'formulario' | 'evaluacion' | 'contratos' | 'detalleContrato' | 'aceptarSupervision' | 'ayuda';

export function VistasSupervisor() {
  const { instance, accounts } = useMsal();
  const [currentView, setCurrentView] = useState<ViewSupervisor>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<string | null>(null);
  const [contratoSeleccionado, setContratoSeleccionado] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [modalModalidadAbierto, setModalModalidadAbierto] = useState(false);
  const [modalidadSeleccionada, setModalidadSeleccionada] = useState<'Directa' | 'Invitación' | 'TDR'>('Directa');

  // Sincroniza automáticamente el usuario con la BD en cada sesión
  const { usuarioDB } = useAuthSync();

  const account = accounts[0];
  const userName = account?.name;
  const userEmail = account?.username;

  useEffect(() => {
    if (account) {
      instance.acquireTokenSilent({ ...loginRequest, account }).then(res => {
        getUserProfile(res.accessToken).then(profile => setUserProfile(profile));
      }).catch(console.error);
    }
  }, [account]);

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => console.error(e));
  };

  const handleVerDetalle = (solicitudId: string) => {
    setSolicitudSeleccionada(solicitudId);
    setCurrentView('formulario');
  };

  const handleVerDetalleContrato = async (solicitudId: string) => {
    setContratoSeleccionado(solicitudId);
    try {
      const email = accounts[0]?.username;
      const res = await fetch(`${API_BASE}/api/supervisor/contratos/${solicitudId}${email ? `?email=${encodeURIComponent(email)}` : ''}`);
      const data = await res.json();
      if (data.supervision_aceptada === true) {
        setCurrentView('detalleContrato');
      } else {
        setCurrentView('aceptarSupervision');
      }
    } catch {
      setCurrentView('aceptarSupervision');
    }
  };

  const handleBackContratos = () => {
    setContratoSeleccionado(null);
    setCurrentView('contratos');
  };

  // Abre el modal de selección de modalidad
  const handleNuevaSolicitudClick = () => {
    setModalModalidadAbierto(true);
  };

  // Cuando el usuario elige una modalidad en el modal
  const handleModalidadElegida = (modalidad: 'Directa' | 'Invitación' | 'TDR') => {
    setModalidadSeleccionada(modalidad);
    setModalModalidadAbierto(false);
    setSolicitudSeleccionada(null);
    setCurrentView('formulario');
  };

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <DashboardSupervisor onNewRequest={handleNuevaSolicitudClick} onVerDetalle={handleVerDetalle} onVerContrato={(id) => { if (id) handleVerDetalleContrato(id); else setCurrentView('contratos'); }} userEmail={userEmail} />;
      case 'solicitudes':
        return <MisSolicitudes onEdit={handleVerDetalle} onEvaluar={() => setCurrentView('evaluacion')} userEmail={userEmail} />;
      case 'formulario':
        return <FormularioSolicitud
          key={solicitudSeleccionada || `nueva-${modalidadSeleccionada}`}
          onBack={() => setCurrentView('solicitudes')}
          solicitudId={solicitudSeleccionada}
          supervisorNombre={userName}
          gerencia={userProfile?.department}
          userEmail={userEmail}
          modalidadInicial={solicitudSeleccionada ? undefined : modalidadSeleccionada}
        />;
      case 'contratos':
        return (
          <ContratosSupervisor
            userEmail={userEmail}
            onVerDetalle={handleVerDetalleContrato}
          />
        );
      case 'aceptarSupervision':
        return contratoSeleccionado ? (
          <AceptarSupervision
            solicitudId={contratoSeleccionado}
            userEmail={userEmail}
            onAceptar={() => setCurrentView('detalleContrato')}
            onBack={handleBackContratos}
          />
        ) : (
          <ContratosSupervisor userEmail={userEmail} onVerDetalle={handleVerDetalleContrato} />
        );
      case 'detalleContrato':
        return contratoSeleccionado ? (
          <DetalleContratoSupervisor
            solicitudId={contratoSeleccionado}
            userEmail={userEmail}
            onBack={handleBackContratos}
          />
        ) : (
          <ContratosSupervisor userEmail={userEmail} onVerDetalle={handleVerDetalleContrato} onBack={() => setCurrentView('solicitudes')} />
        );
      case 'evaluacion':
        return <EvaluacionProveedor />;
      case 'ayuda':
        return <Ayuda />;
      default:
        return <DashboardSupervisor onNewRequest={handleNuevaSolicitudClick} onVerDetalle={handleVerDetalle} userEmail={userEmail} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarSupervisor
        currentView={currentView}
        onNavigate={setCurrentView}
        onNuevaSolicitud={handleNuevaSolicitudClick}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <main className={`flex-1 min-w-0 overflow-auto transition-all duration-300 ${sidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        {renderView()}
      </main>

      {/* Modal selección de modalidad */}
      {modalModalidadAbierto && (
        <ModalSeleccionModalidad
          onSeleccionar={handleModalidadElegida}
          onCerrar={() => setModalModalidadAbierto(false)}
        />
      )}
    </div>
  );
}
