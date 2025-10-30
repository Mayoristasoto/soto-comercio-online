export const PDF_STYLES = {
  colors: {
    primary: '#2563eb',
    secondary: '#64748b',
    accent: '#0ea5e9',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    text: '#1e293b',
    textLight: '#64748b',
    background: '#f8fafc',
    border: '#e2e8f0',
  },
  fonts: {
    title: 24,
    subtitle: 18,
    heading: 14,
    body: 11,
    small: 9,
  },
  spacing: {
    page: { top: 20, bottom: 20, left: 20, right: 20 },
    section: 15,
    item: 8,
  },
};

export const PDF_CONFIG = {
  format: 'a4' as const,
  orientation: 'portrait' as const,
  unit: 'mm' as const,
};

export const COMPANY_INFO = {
  name: 'Sistema de Gestión de Recursos Humanos',
  documentTitle: 'Descripción de Funciones - Rol Empleado',
  version: '1.0',
};
