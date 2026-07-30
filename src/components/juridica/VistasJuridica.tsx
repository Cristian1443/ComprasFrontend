import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
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

type Crumb = { label: string; onClick?: () => void };

function BreadcrumbBar({ crumbs }: { crumbs: Crumb[] }) {
  return (
    <div
      className="flex items-center gap-1.5 px-6 lg:px-8 py-2.5 border-b border-gray-200 bg-white text-xs"
      style={{ fontFamily: 'Gabarito, sans-serif' }}
    >
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={12} className="text-gray-300 shrink-0" />}
            {c.onClick && !isLast ? (
              <button
                onClick={c.onClick}
                className="font-semibold text-gray-400 hover:text-gray-700 transition-colors"
              >
                {c.label}
              </button>
            ) : (
              <span className={isLast ? 'font-black text-gray-800' : 'font-semibold text-gray-400'}>
                {c.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

export function VistasJuridica() {
  const { instance, accounts } = useMsal();
  useAuthSync(); // Registra ultimo_acceso al ingresar al módulo
  const [currentView, setCurrentView] = useState<ViewJuridica>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [solicitudIdSeleccionada, setSolicitudIdSeleccionada] = useState<string | null>(null);
  const [contratoIdSeleccionado, setContratoIdSeleccionado] = useState<string | null>(null);
  const [convocatoriaSubvista, setConvocatoriaSubvista] = useState<string | null>(null);
  const [convocatoriaResetSignal, setConvocatoriaResetSignal] = useState(0);
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

  const goDashboard = () => { setSolicitudIdSeleccionada(null); setContratoIdSeleccionado(null); setCurrentView('dashboard'); };

  const getBreadcrumb = (): Crumb[] => {
    const crumbs: Crumb[] = [{ label: 'Jurídica', onClick: goDashboard }];

    if (solicitudIdSeleccionada && (currentView === 'bandeja' || currentView === 'historial')) {
      crumbs.push({
        label: currentView === 'bandeja' ? 'Bandeja de Entrada' : 'Historial Jurídica',
        onClick: () => setSolicitudIdSeleccionada(null),
      });
      crumbs.push({ label: 'Detalle de solicitud' });
      return crumbs;
    }

    switch (currentView) {
      case 'dashboard':
        crumbs.push({ label: 'Dashboard Global' });
        break;
      case 'powerbi':
        crumbs.push({ label: 'Dashboard BI' });
        break;
      case 'bandeja':
        crumbs.push({ label: 'Bandeja de Entrada' });
        break;
      case 'historial':
        crumbs.push({ label: 'Historial Jurídica' });
        break;
      case 'proveedores':
        crumbs.push({ label: 'Proveedores' });
        break;
      case 'contratos':
        crumbs.push({ label: 'Contratos' });
        break;
      case 'formulario_contractual':
        crumbs.push({ label: 'Contratos', onClick: () => { setContratoIdSeleccionado(null); setCurrentView('contratos'); } });
        crumbs.push({ label: 'Ficha de contrato' });
        break;
      case 'calificacion':
        if (solicitudIdSeleccionada) crumbs.push({ label: 'Bandeja de Entrada', onClick: () => setCurrentView('bandeja') });
        crumbs.push({ label: 'Calificación de proponentes' });
        break;
      case 'documentos':
        if (solicitudIdSeleccionada) crumbs.push({ label: 'Bandeja de Entrada', onClick: () => setCurrentView('bandeja') });
        crumbs.push({ label: 'Documentos finales' });
        break;
      case 'convocatorias':
        if (solicitudIdSeleccionada) crumbs.push({ label: 'Bandeja de Entrada', onClick: () => setCurrentView('bandeja') });
        crumbs.push({
          label: 'Convocatorias',
          onClick: convocatoriaSubvista ? () => setConvocatoriaResetSignal(n => n + 1) : undefined,
        });
        if (convocatoriaSubvista) crumbs.push({ label: convocatoriaSubvista });
        break;
      case 'acta_adjudicacion':
        if (solicitudIdSeleccionada) crumbs.push({ label: 'Bandeja de Entrada', onClick: () => setCurrentView('bandeja') });
        crumbs.push({ label: 'Acta de adjudicación' });
        break;
      default:
        crumbs.push({ label: 'Dashboard Global' });
    }
    return crumbs;
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
        return (
          <ConvocatoriaProponentes
            solicitudId={solicitudIdSeleccionada}
            onBack={() => { setSolicitudIdSeleccionada(null); setCurrentView('bandeja'); }}
            userEmail={userEmail}
            onSubvistaChange={setConvocatoriaSubvista}
            resetSignal={convocatoriaResetSignal}
          />
        );
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
      <main className={`flex-1 min-h-0 overflow-y-auto transition-all duration-300 flex flex-col ${isSidebarOpen ? 'ml-0 lg:ml-64' : 'ml-0'}`}>
        <BreadcrumbBar crumbs={getBreadcrumb()} />
        <div className="flex-1 min-h-0">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
