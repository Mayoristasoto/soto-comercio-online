export const PDF_STYLES = {
  colors: {
    primary: '#4b0d6d', // Púrpura oscuro SOTO (C:82.5, M:100, Y:30.3)
    primaryDark: '#27192c',
    secondary: '#95198d', // Magenta SOTO (C:50.91, M:94.38, Y:0)
    accent: '#e04403', // Naranja SOTO (C:7.82, M:83.13, Y:100)
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#272c4d', // Negro azulado SOTO (C:80.52, M:71.39, Y:66.75, K:49.55)
    textLight: '#616e75', // Gris oscuro SOTO (C:65.81, M:51.39, Y:48.25)
    background: '#fafafa',
    backgroundLight: '#ffffff',
    border: '#9ca6aa', // Gris claro SOTO (C:44.14, M:28.77, Y:28.47)
    gradient: {
      start: '#4b0d6d', // Púrpura oscuro
      middle: '#95198d', // Magenta
      end: '#e04403', // Naranja
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
