/**
 * @file tokenStore.ts
 * @description Manejo seguro de tokens OAuth2 de Google en cookies httpOnly.
 *
 * SEGURIDAD:
 * - Los tokens se cifran con AES-256-CBC antes de ser almacenados en la cookie.
 * - La cookie es httpOnly (no accesible desde JavaScript del navegador).
 * - La cookie es SameSite=Lax para protección CSRF.
 * - Los tokens NUNCA se exponen al cliente.
 */

import { cookies } from "next/headers";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/** Nombre de la cookie donde se almacenan los tokens cifrados */
const COOKIE_NAME = "ga_google_session";

/** Clave de cifrado (32 bytes para AES-256) */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY || "";
  // Asegurar exactamente 32 bytes (padding o truncado)
  const keyBuffer = Buffer.alloc(32, 0);
  Buffer.from(key, "utf8").copy(keyBuffer);
  return keyBuffer;
}

/**
 * Estructura de datos del token almacenado en la cookie.
 */
export interface StoredTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  email: string;
  name: string;
  picture?: string;
}

/**
 * Cifra un string con AES-256-CBC.
 * Genera un IV aleatorio por cada cifrado para mayor seguridad.
 *
 * @param text - Texto plano a cifrar
 * @returns String en formato "iv:encrypted" en base64
 */
function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("base64")}`;
}

/**
 * Descifra un string en formato "iv:encrypted" con AES-256-CBC.
 *
 * @param encryptedText - Texto cifrado en formato "iv:encrypted"
 * @returns Texto plano descifrado, o null si falla
 */
function decrypt(encryptedText: string): string | null {
  try {
    const [ivHex, encryptedBase64] = encryptedText.split(":");
    if (!ivHex || !encryptedBase64) return null;
    const iv = Buffer.from(ivHex, "hex");
    const key = getEncryptionKey();
    const decipher = createDecipheriv("aes-256-cbc", key, iv);
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedBase64, "base64")),
      decipher.final(),
    ]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Guarda los tokens de Google cifrados en una cookie httpOnly.
 *
 * @param tokens - Objeto con access_token, refresh_token, email y nombre
 */
export async function saveTokens(tokens: StoredTokens): Promise<void> {
  const cookieStore = await cookies();
  const encrypted = encrypt(JSON.stringify(tokens));

  cookieStore.set(COOKIE_NAME, encrypted, {
    httpOnly: true,           // No accesible desde JavaScript del cliente
    secure: process.env.NODE_ENV === "production", // Solo HTTPS en producción
    sameSite: "lax",          // Protección CSRF
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
}

/**
 * Lee y descifra los tokens de Google desde la cookie httpOnly.
 *
 * @returns Tokens descifrados, o null si no hay sesión activa
 */
export async function getTokens(): Promise<StoredTokens | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);

  if (!cookie?.value) return null;

  const decrypted = decrypt(cookie.value);
  if (!decrypted) return null;

  try {
    return JSON.parse(decrypted) as StoredTokens;
  } catch {
    return null;
  }
}

/**
 * Elimina la cookie de sesión de Google.
 */
export async function clearTokens(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Verifica si el access_token está próximo a vencer (dentro de los próximos 5 minutos).
 * Si es así, se debe refrescar antes de hacer llamadas a la API.
 *
 * @param expiryDate - Timestamp en ms de cuando vence el token
 */
export function isTokenExpiringSoon(expiryDate: number): boolean {
  const fiveMinutesFromNow = Date.now() + 5 * 60 * 1000;
  return expiryDate < fiveMinutesFromNow;
}
