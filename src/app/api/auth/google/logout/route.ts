/**
 * @file /api/auth/google/logout/route.ts
 * @description Cierra la sesión de Google y revoca los tokens.
 *
 * Elimina la cookie de sesión del servidor.
 * Opcionalmente revoca el token en Google para invalidarlo completamente.
 */

import { NextResponse } from "next/server";
import { getTokens, clearTokens } from "@/lib/tokenStore";
import { createOAuth2Client } from "@/lib/googleClient";
import { removeServerTokens } from "@/lib/serverTokenStore";

export const runtime = "nodejs";

export async function POST() {
  try {
    const tokens = await getTokens();

    if (tokens) {
      // 1. Eliminar tokens del almacén persistente del servidor
      if (tokens.email) {
        await removeServerTokens(tokens.email);
      }

      // 2. Revocar el token en Google para máxima seguridad
      if (tokens.access_token) {
        try {
          const auth = createOAuth2Client();
          await auth.revokeToken(tokens.access_token);
        } catch {
          // Si la revocación falla (token ya expirado), continuamos de todos modos
          console.warn("[Google OAuth] No se pudo revocar el token, puede ya estar expirado.");
        }
      }
    }

    // 3. Eliminar cookie de sesión del cliente
    await clearTokens();

    return NextResponse.json({ success: true, message: "Sesión de Google cerrada exitosamente." });
  } catch (error) {
    console.error("[Google OAuth Logout]", error);
    return NextResponse.json({ success: false, error: "Error al cerrar sesión." }, { status: 500 });
  }
}
