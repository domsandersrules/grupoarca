/**
 * @file serverTokenStore.ts
 * @description Almacenamiento persistente cifrado de tokens de Google Workspace en el servidor.
 * Permite que los webhooks asíncronos (sin cookies del cliente) carguen las credenciales
 * necesarias para operar contra Google Calendar y Gmail.
 */

import fs from "fs/promises";
import path from "path";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

const TOKENS_DIR = path.join(process.cwd(), ".tokens");

/**
 * Obtiene la clave de cifrado de 32 bytes para AES-256.
 */
function getEncryptionKey(): Buffer {
  const key = process.env.TOKEN_ENCRYPTION_KEY || "";
  const keyBuffer = Buffer.alloc(32, 0);
  Buffer.from(key, "utf8").copy(keyBuffer);
  return keyBuffer;
}

/**
 * Cifra un texto utilizando AES-256-CBC con un IV aleatorio.
 */
function encrypt(text: string): string {
  const iv = randomBytes(16);
  const key = getEncryptionKey();
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  return `${iv.toString("hex")}:${encrypted.toString("base64")}`;
}

/**
 * Descifra un texto previamente cifrado.
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
  } catch (err) {
    return null;
  }
}

export interface ServerTokens {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
  email: string;
  name: string;
  picture?: string;
  channelId?: string;
  resourceId?: string;
  expiration?: number;
}

/**
 * Asegura que el directorio de tokens en el servidor exista.
 */
async function ensureDir() {
  try {
    await fs.mkdir(TOKENS_DIR, { recursive: true });
  } catch (err) {
    // Ya existe o no requiere acción
  }
}

/**
 * Genera una ruta de archivo segura basada en el email del usuario.
 */
function getFilePath(email: string): string {
  const safeName = email.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
  return path.join(TOKENS_DIR, `${safeName}.json`);
}

/**
 * Guarda los tokens cifrados del usuario en disco.
 */
export async function saveServerTokens(email: string, tokens: ServerTokens): Promise<void> {
  if (!email) return;
  await ensureDir();
  const filePath = getFilePath(email);
  const dataStr = JSON.stringify(tokens);
  const encrypted = encrypt(dataStr);
  await fs.writeFile(filePath, encrypted, "utf8");
}

/**
 * Recupera y descifra los tokens del usuario en el servidor.
 */
export async function getServerTokens(email: string): Promise<ServerTokens | null> {
  if (!email) return null;
  const filePath = getFilePath(email);
  try {
    const encrypted = await fs.readFile(filePath, "utf8");
    const decrypted = decrypt(encrypted);
    if (!decrypted) return null;
    return JSON.parse(decrypted) as ServerTokens;
  } catch (err) {
    return null;
  }
}

/**
 * Elimina las credenciales del servidor al cerrar sesión.
 */
export async function removeServerTokens(email: string): Promise<void> {
  if (!email) return;
  const filePath = getFilePath(email);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // Ignorar si no existe
  }
}
