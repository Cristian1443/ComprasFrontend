/**
 * Paleta de Colores Corporativos - Invest in Bogotá
 * Power Apps Design System
 */

export const COLORES = {
  // Color Principal - Rojo Ladrillo (Acciones principales, CTAs, elementos destacados)
  primario: '#E84922',
  primarioHover: '#C73D1C',
  primarioClaro: '#FEF2F0',
  primarioTexto: '#7A2311',
  
  // Color Sidebar - Azul institucional (Navegación, estructura)
  sidebar: '#2F6FA3',
  sidebarHover: '#245782',
  sidebarBorder: '#BFDBFE',
  
  // Color Acento - Naranja institucional (Resaltes moderados)
  acento: '#F08A24',
  acentoHover: '#D97706',
  acentoClaro: '#FFF7ED',
  
  // Estados
  exito: '#10B981',
  exitoClaro: '#D1FAE5',
  advertencia: '#F59E0B',
  advertenciaClaro: '#FEF3C7',
  error: '#EF4444',
  errorClaro: '#FEE2E2',
  info: '#2F6FA3',
  infoClaro: '#EFF6FF',
  
  // Grises
  gris900: '#111827',
  gris800: '#1F2937',
  gris700: '#374151',
  gris600: '#4B5563',
  gris500: '#6B7280',
  gris400: '#9CA3AF',
  gris300: '#D1D5DB',
  gris200: '#E5E7EB',
  gris100: '#F3F4F6',
  gris50: '#F9FAFB',
  
  // Blanco y negro
  blanco: '#FFFFFF',
  negro: '#000000',
  
  // Fondo de aplicación
  fondoApp: '#F4F7FB',
} as const;

// Estados específicos de solicitudes
export const ESTADOS_COLORES = {
  'Pendiente Jurídica': {
    bg: '#FFFBEB',
    text: '#92400E',
    border: '#FCD34D'
  },
  'Pendiente Financiera': {
    bg: '#EFF6FF',
    text: '#1E40AF',
    border: '#BFDBFE'
  },
  'Finalizado': {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0'
  },
  'Aprobado': {
    bg: '#ECFDF5',
    text: '#065F46',
    border: '#A7F3D0'
  },
  'Rechazado': {
    bg: '#FEF2F2',
    text: '#991B1B',
    border: '#FECACA'
  },
  'En Revisión': {
    bg: '#FFFBEB',
    text: '#9A3412',
    border: '#FCD34D'
  }
} as const;

export type EstadoSolicitud = keyof typeof ESTADOS_COLORES;
