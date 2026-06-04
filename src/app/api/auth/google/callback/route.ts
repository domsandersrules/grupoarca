/**
 * @file /api/auth/google/callback/route.ts
 * @description Callback de Google OAuth 2.0.
 *
 * Google redirige aquí tras el consentimiento del usuario con:
 * - `code`: Código de autorización para intercambiar por tokens
 * - `state`: Token anti-CSRF que debe coincidir con el de la cookie temporal
 *
 * Proceso:
 * 1. Validar el `state` anti-CSRF
 * 2. Intercambiar `code` por `access_token` + `refresh_token`
 * 3. Obtener perfil del usuario
 * 4. Cifrar y almacenar tokens en cookie httpOnly
 * 5. Redirigir al usuario de vuelta a la app
 */

import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo } from "@/lib/googleClient";
import { saveTokens } from "@/lib/tokenStore";
import { saveServerTokens } from "@/lib/serverTokenStore";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // ─── Error devuelto por Google (usuario canceló, etc.) ──────────────────────
  if (error) {
    console.warn("[Google OAuth Callback] Error:", error);
    return NextResponse.redirect(
      `${appUrl}?google_error=${encodeURIComponent(error)}`
    );
  }

  // ─── Validar que vengan los parámetros requeridos ────────────────────────────
  if (!code || !state) {
    return NextResponse.redirect(`${appUrl}?google_error=missing_params`);
  }

  // ─── Validar state anti-CSRF ─────────────────────────────────────────────────
  const cookieStore = await cookies();
  const savedState = cookieStore.get("ga_oauth_state")?.value;

  if (!savedState || savedState !== state) {
    console.error("[Google OAuth Callback] State CSRF mismatch:", { savedState, state });
    return NextResponse.redirect(`${appUrl}?google_error=invalid_state`);
  }

  // Limpiar la cookie temporal del state
  cookieStore.delete("ga_oauth_state");

  try {
    // ─── Intercambiar el code por tokens ───────────────────────────────────────
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.access_token) {
      throw new Error("No se recibió access_token de Google");
    }

    // ─── Obtener perfil del usuario ────────────────────────────────────────────
    const userInfo = await getUserInfo({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
    });

    // ─── Cifrar y guardar tokens en cookie httpOnly ────────────────────────────
    const storedSession = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || "",
      expiry_date: tokens.expiry_date || Date.now() + 3600 * 1000,
      email: userInfo.email || "",
      name: userInfo.name || "",
      picture: userInfo.picture || undefined,
    };

    await saveTokens(storedSession);

    // ─── Guardar copia persistente en el servidor para Webhooks y tareas de fondo ───
    await saveServerTokens(userInfo.email || "", storedSession);

    // ─── Redirigir de vuelta a la app con éxito ────────────────────────────────
    return NextResponse.redirect(`${appUrl}?google_connected=true`);
  } catch (err) {
    console.error("[Google OAuth Callback] Error al intercambiar tokens:", err);
    return NextResponse.redirect(`${appUrl}?google_error=token_exchange_failed`);
  }
}
