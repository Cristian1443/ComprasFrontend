import React, { useState } from 'react';
import { useMsal } from '@azure/msal-react';
import { useAuthSync } from '../../lib/useAuthSync';
import { SidebarJuridica } from './SidebarJuridica';
import { ViewJuridica } from './VistaJuridica';
import { DashboardJuridica } from './DashboardJuridica';
import { BandejaEntrada } from './BandejaEntrada';
import { HistorialJuridica } from './HistorialJuridica';
import { CalificacionProponentes } from './CalificacionProponentes';
import { GestionDocumentos } from './GestionDocumentos';
import { ProveedoresJuridica } from './ProveedoresJuridica';
import { DetalleSolicitudJuridica } from './DetalleSolicitudJuridica';
import { ConvocatoriaProponentes } from './ConvocatoriaProponentes';
import { ActaAdjudicacion } from './ActaAdjudicacion';
import { ContratosJuridica } from './ContratosJuridica';
import { FormularioContractual } from './FormularioContractual';

export function VistasJuridica() {
  const { instance, accounts } = useMsal();
  useAuthSync(); // Registra ultimo_acceso al ingresar al módulo
  const [currentView, setCurrentView] = useState<ViewJuridica>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [solicitudIdSeleccionada, setSolicitudIdSeleccionada] = useState<string | null>(null);
  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState<string | null>(null);
  const account = accounts[0];
  const userName = account?.name || 'Área Jurídica';
  const userEmail = account?.username || 'juridica';

  const handleLogout = () => {
    instance.logoutRedirect().catch(e => console.error(e));
  };

  const abrirCalificacion = (id: string) => {
    setSolicitudIdSeleccionada(id);
    setCurrentView('calificacion');
  };

  const abrirDocumentos = (id: string) => {
    setSolicitudIdSeleccionada(id);
    setCurrentView('documentos');
  };

  const abrirConvocatorias = (id: string) => {
    setSolicitudIdSeleccionada(id);
    setCurrentView('convocatorias');
  };

  const abrirActa = (id: string) => {
    setSolicitudIdSeleccionada(id);
    setCurrentView('acta_adjudicacion');
  };

  const renderContent = () => {
    if (solicitudIdSeleccionada && (currentView === 'bandeja' || currentView === 'historial')) {
      return (
        <DetalleSolicitudJuridica 
          solicitudId={solicitudIdSeleccionada} 
          onBack={() => setSolicitudIdSeleccionada(null)}
          onOpenCalificacion={abrirCalificacion}
          onOpenDocumentos={abrirDocumentos}
          onOpenConvocatorias={abrirConvocatorias}
          onOpenActa={abrirActa}
        />
      );
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardJuridica
          onGoBandeja={() => setCurrentView('bandeja')}
          onGoHistorial={() => setCurrentView('historial')}
          onGoContratos={() => setCurrentView('contratos')}
          onGoProveedores={() => setCurrentView('proveedores')}
          onVerSolicitud={(id) => { setSolicitudIdSeleccionada(id); setCurrentView('bandeja'); }}
        />;
      case 'powerbi':
        return (
          <div className="w-full h-full flex flex-col">
            <div className="p-6 pb-3">
              <h1 className="text-2xl font-bold" style={{ fontFamily: 'Gabarito, sans-serif' }}>Dashboard BI</h1>
              <p className="text-sm text-gray-500 mt-1">Reporte de indicadores jurídicos en Power BI</p>
            </div>
            <div className="flex-1 px-6 pb-6">
              <iframe
                title="Dashboard Power BI Jurídica"
                src="https://app.powerbi.com/view?r=eyJrIjoiYjJjZjg3ZWUtMzA2ZS00NTAxLWEwZjItNDBjNjk2OGE5MWQ2IiwidCI6ImQ2ZDVmZWMzLTk5MWItNDYyYS1hZjBkLTRiMjRjYTZhNGMxMSIsImMiOjR9"
                className="w-full h-full rounded-xl border border-gray-200 shadow-sm"
                style={{ minHeight: '600px' }}
                allowFullScreen
              />
            </div>
          </div>
        );
      case 'bandeja':
        return <BandejaEntrada onSelect={(id) => setSolicitudIdSeleccionada(id)} />;
      case 'historial':
        return <HistorialJuridica onSelect={(id) => setSolicitudIdSeleccionada(id)} />;
      case 'calificacion':
        return <CalificacionProponentes solicitudId={solicitudIdSeleccionada} onBack={() => setCurrentView('bandeja')} onOpenDocumentos={abrirDocumentos} onOpenActa={abrirActa} userEmail={userEmail} />;
      case 'documentos':
        return <GestionDocumentos solicitudId={solicitudIdSeleccionada} onBack={() => setCurrentView('bandeja')} />;
      case 'convocatorias':
        return <ConvocatoriaProponentes solicitudId={solicitudIdSeleccionada} onBack={() => { setSolicitudIdSeleccionada(null); setCurrentView('bandeja'); }} userEmail={userEmail} />;
      case 'acta_adjudicacion':
        return <ActaAdjudicacion solicitudId={solicitudIdSeleccionada} onBack={() => setCurrentView('bandeja')} />;
      case 'contratos':
        return <ContratosJuridica onSelect={(id) => { setContratoIdSeleccionado(id); setCurrentView('formulario_contractual'); }} />;
      case 'formulario_contractual':
        return contratoIdSeleccionado
          ? <FormularioContractual contratoId={contratoIdSeleccionado} onBack={() => { setCurrentView('contratos'); setContratoIdSeleccionado(null); }} />
          : <ContratosJuridica onSelect={(id) => { setContratoIdSeleccionado(id); setCurrentView('formulario_contractual'); }} />;
      case 'proveedores':
        return <ProveedoresJuridica />;
      default:
        return <DashboardJuridica />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: 'var(--ui-bg)' }}>
      <SidebarJuridica
        currentView={currentView}
        onNavigate={(view) => {
          setSolicitudIdSeleccionada(null);
          setContratoIdSeleccionado(null);
          setCurrentView(view);
        }}
        isOpen={isSidebarOpen}
        onToggle={() => setIsSidebarOpen(!isSidebarOpen)}
        userName={userName}
        userEmail={userEmail}
        onLogout={handleLogout}
      />
      <main className={`flex-1 min-h-0 overflow-y-auto transition-all duration-300 ${isSidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        {renderContent()}
      </main>
    </div>
  );
}
