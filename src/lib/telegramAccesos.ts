// Acceso a la lógica de permisos del bot de Telegram.
// La fuente única vive en supabase/functions/_shared para que el bot y la
// app nunca se contradigan sobre qué puede hacer cada persona.
export * from '../../supabase/functions/_shared/telegramAccesos';
