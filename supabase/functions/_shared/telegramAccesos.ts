// Lógica pura de accesos al bot de Telegram.
// Sin dependencias: la usa la Edge Function y la app, para que ambos
// acuerden exactamente qué puede hacer cada persona autorizada.

export type PermisosTelegram = {
  puede_notas: boolean;
  puede_fichero: boolean;
  puede_vacaciones: boolean;
  puede_agenda: boolean;
  puede_administrar: boolean;
};

export type ComandoTelegram =
  | 'nota'
  | 'fichero'
  | 'noficharon'
  | 'vacaciones'
  | 'agenda'
  | 'recordar'
  | 'permitir'
  | 'quitar'
  | 'autorizados'
  | 'ayuda'
  | 'texto_libre';

export const PERMISOS_POR_DEFECTO: PermisosTelegram = {
  puede_notas: true,
  puede_fichero: true,
  puede_vacaciones: true,
  puede_agenda: true,
  puede_administrar: false,
};

export const PERMISOS_TELEGRAM: {
  clave: keyof PermisosTelegram;
  etiqueta: string;
  descripcion: string;
}[] = [
  { clave: 'puede_notas', etiqueta: 'Cargar notas', descripcion: 'Anotaciones al legajo con /nota' },
  { clave: 'puede_fichero', etiqueta: 'Ver fichajes', descripcion: '/fichero y /noficharon' },
  { clave: 'puede_vacaciones', etiqueta: 'Ver vacaciones', descripcion: '/vacaciones' },
  { clave: 'puede_agenda', etiqueta: 'Su agenda', descripcion: 'Recordatorios propios y /agenda' },
  { clave: 'puede_administrar', etiqueta: 'Administrar accesos', descripcion: 'Autorizar y quitar personas' },
];

const REQUIERE: Record<ComandoTelegram, keyof PermisosTelegram | null> = {
  nota: 'puede_notas',
  fichero: 'puede_fichero',
  noficharon: 'puede_fichero',
  vacaciones: 'puede_vacaciones',
  agenda: 'puede_agenda',
  recordar: 'puede_agenda',
  texto_libre: 'puede_agenda',
  permitir: 'puede_administrar',
  quitar: 'puede_administrar',
  autorizados: 'puede_administrar',
  ayuda: null,
};

const COMANDOS: Record<string, ComandoTelegram> = {
  nota: 'nota',
  fichero: 'fichero',
  noficharon: 'noficharon',
  vacaciones: 'vacaciones',
  agenda: 'agenda',
  recordar: 'recordar',
  permitir: 'permitir',
  quitar: 'quitar',
  autorizados: 'autorizados',
  ayuda: 'ayuda',
  help: 'ayuda',
  start: 'ayuda',
};

/** Separa el comando del resto del mensaje. "/nota@MiBot Conforti texto" => nota + "Conforti texto". */
export function detectarComando(texto: string): { comando: ComandoTelegram; resto: string } {
  const t = (texto ?? '').trim();
  if (!t.startsWith('/')) return { comando: 'texto_libre', resto: t };
  const [primero, ...resto] = t.slice(1).split(/\s+/);
  const sinMencion = (primero ?? '').split('@')[0].toLowerCase();
  const comando = COMANDOS[sinMencion];
  if (!comando) return { comando: 'texto_libre', resto: t };
  return { comando, resto: resto.join(' ').trim() };
}

/** ¿Puede esta persona usar ese comando? */
export function puedeUsar(permisos: PermisosTelegram, comando: ComandoTelegram): boolean {
  const requerido = REQUIERE[comando];
  return requerido ? permisos[requerido] === true : true;
}

/** Qué permiso falta para ese comando (null si no necesita ninguno). */
export function permisoFaltante(comando: ComandoTelegram): keyof PermisosTelegram | null {
  return REQUIERE[comando] ?? null;
}

/** El código de Telegram es el chat_id: solo dígitos, largo razonable. */
export function esCodigoValido(codigo: string): boolean {
  return /^\d{5,20}$/.test((codigo ?? '').trim());
}

/** "/permitir 123456789 Conforti" => { codigo, busqueda }. Null si falta algo. */
export function parsearPermitir(texto: string): { codigo: string; busqueda: string } | null {
  const partes = (texto ?? '').trim().split(/\s+/).filter(Boolean);
  const codigo = partes[0] ?? '';
  const busqueda = partes.slice(1).join(' ').trim();
  if (!esCodigoValido(codigo) || !busqueda) return null;
  return { codigo: codigo.trim(), busqueda };
}

/** "/quitar 123456789" => "123456789". Null si el código no está o no es válido. */
export function parsearQuitar(texto: string): string | null {
  const codigo = (texto ?? '').trim().split(/\s+/)[0] ?? '';
  return esCodigoValido(codigo) ? codigo.trim() : null;
}

/** Resumen corto de permisos, para listas y confirmaciones. */
export function resumenPermisos(permisos: PermisosTelegram): string {
  const activos = PERMISOS_TELEGRAM.filter((p) => permisos[p.clave] === true).map((p) => p.etiqueta.toLowerCase());
  return activos.length ? activos.join(' · ') : 'sin permisos';
}

/** Texto de ayuda adaptado a lo que esa persona puede hacer. */
export function ayudaPara(permisos: PermisosTelegram): string[] {
  const lineas: string[] = [];
  if (permisos.puede_notas) lineas.push('📝 <b>Notas</b>: <code>/nota Apellido texto #etiqueta</code> o <code>/nota 108 texto #celular</code>');
  if (permisos.puede_fichero) lineas.push('📋 <b>Fichero</b>: <code>/fichero</code>, <code>/fichero Conforti</code>, <code>/fichero 108 ayer</code> · <code>/noficharon</code>');
  if (permisos.puede_vacaciones) lineas.push('🏖️ <b>Vacaciones</b>: <code>/vacaciones</code>');
  if (permisos.puede_agenda) lineas.push('🗓️ <b>Agenda</b>: escribí normal, ej. "mañana a las 10 llamar a Conforti" · <code>/agenda</code> muestra lo próximo');
  if (permisos.puede_administrar) lineas.push('🔑 <b>Accesos</b>: <code>/permitir codigo Apellido</code>, <code>/quitar codigo</code>, <code>/autorizados</code>');
  lineas.push('Para que te autoricen, pasale tu código a RRHH.');
  return lineas;
}
