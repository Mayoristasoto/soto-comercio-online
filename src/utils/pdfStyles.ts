export const PDF_STYLES = {
  colors: {
    primary: '#7e22ce', // Morado corporativo SOTO
    primaryDark: '#581c87',
    secondary: '#e11d48', // Rosa/Rojo del gradiente
    accent: '#f97316', // Naranja del gradiente
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#1e293b',
    textLight: '#64748b',
    background: '#fafafa',
    backgroundLight: '#ffffff',
    border: '#e5e7eb',
    gradient: {
      start: '#7e22ce',
      middle: '#e11d48',
      end: '#f97316',
    },
  },
  fonts: {
    title: 28,
    subtitle: 20,
    heading: 16,
    subheading: 13,
    body: 11,
    small: 9,
  },
  spacing: {
    page: { top: 20, bottom: 20, left: 20, right: 20 },
    section: 18,
    item: 10,
  },
};

export const PDF_CONFIG = {
  format: 'a4' as const,
  orientation: 'portrait' as const,
  unit: 'mm' as const,
};

export const COMPANY_INFO = {
  name: 'SOTO mayorista',
  fullName: 'SOTO mayorista - Sistema de Gestión de RRHH',
  documentTitle: 'Informe Ejecutivo',
  version: '2.0',
  logo: '/logo-soto.jpeg',
};
