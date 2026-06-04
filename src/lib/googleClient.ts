/**
 * @file googleClient.ts
 * @description Utilidades de servidor para construir clientes autenticados de Google APIs.
 *
 * SEGURIDAD:
 * - Este módulo SOLO se ejecuta en el servidor (Next.js API Routes / Server Components).
 * - Los tokens se almacenan en cookies httpOnly y se pasan como parámetro.
 * - Nunca exportes funciones de este módulo en componentes "use client".
 */

import { google } from "googleapis";

/** Scopes que solicita la aplicación */
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
];

/**
 * Crea un cliente OAuth2 base sin tokens.
 * Úsalo para iniciar el flujo de autorización.
 */
export function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    process.env.GOOGLE_REDIRECT_URI!
  );
}

/**
 * Crea un cliente OAuth2 con los tokens ya configurados.
 * Refresca automáticamente el access_token si ha expirado.
 *
 * @param tokens - Objeto con access_token y refresh_token
 */
export function createAuthenticatedClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createOAuth2Client();
  auth.setCredentials(tokens);

  /**
   * Listener de auto-refresh:
   * googleapis llama esto cuando obtiene un nuevo access_token.
   * En un entorno de producción, aquí deberías actualizar la cookie.
   */
  auth.on("tokens", (newTokens) => {
    if (newTokens.refresh_token) {
      tokens.refresh_token = newTokens.refresh_token;
    }
    if (newTokens.access_token) {
      tokens.access_token = newTokens.access_token;
    }
  });

  return auth;
}

/**
 * Genera la URL de autorización de Google con parámetro `state` anti-CSRF.
 *
 * @param state - Token CSRF aleatorio para verificar en el callback
 */
export function getAuthorizationUrl(state: string): string {
  const auth = createOAuth2Client();
  return auth.generateAuthUrl({
    access_type: "offline",   // Necesario para obtener refresh_token
    prompt: "consent",         // Forzar pantalla de consentimiento (para obtener refresh_token siempre)
    scope: GOOGLE_SCOPES,
    state,
  });
}

/**
 * Intercambia el code de autorización por tokens de acceso.
 *
 * @param code - Código recibido en el callback de Google
 * @returns Objeto con access_token, refresh_token y expiry_date
 */
export async function exchangeCodeForTokens(code: string) {
  const auth = createOAuth2Client();
  const { tokens } = await auth.getToken(code);
  return tokens;
}

/**
 * Obtiene información del perfil del usuario autenticado.
 *
 * @param tokens - Tokens del usuario
 */
export async function getUserInfo(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createAuthenticatedClient(tokens);
  const oauth2 = google.oauth2({ version: "v2", auth });
  const { data } = await oauth2.userinfo.get();
  return data;
}

/**
 * Obtiene un cliente autenticado de Google Calendar.
 */
export function getCalendarClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createAuthenticatedClient(tokens);
  return google.calendar({ version: "v3", auth });
}

/**
 * Obtiene un cliente autenticado de Google Drive.
 */
export function getDriveClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createAuthenticatedClient(tokens);
  return google.drive({ version: "v3", auth });
}

/**
 * Obtiene un cliente autenticado de Gmail.
 */
export function getGmailClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createAuthenticatedClient(tokens);
  return google.gmail({ version: "v1", auth });
}

/**
 * Obtiene un cliente autenticado de Google Sheets.
 */
export function getSheetsClient(tokens: {
  access_token: string;
  refresh_token: string;
  expiry_date?: number;
}) {
  const auth = createAuthenticatedClient(tokens);
  return google.sheets({ version: "v4", auth });
}

