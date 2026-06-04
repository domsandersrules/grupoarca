/**
 * @file /api/auth/google/login/route.ts
 * @description Inicia el flujo OAuth 2.0 de Google.
 *
 * Genera un `state` aleatorio anti-CSRF, lo almacena en una cookie temporal,
 * y redirige al usuario a la pantalla de consentimiento de Google.
 */

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthorizationUrl } from "@/lib/googleClient";
import { randomBytes } from "crypto";

export const runtime = "nodejs";

export async function GET() {
  // 1. Generar state anti-CSRF único por sesión
  const state = randomBytes(32).toString("hex");

  // 2. Guardar el state en una cookie temporal (httpOnly, expira en 10 min)
  const cookieStore = await cookies();
  cookieStore.set("ga_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutos
  });

  // 3. Generar URL de autorización de Google con el state
  const authUrl = getAuthorizationUrl(state);

  // 4. Redirigir al usuario a Google
  return NextResponse.redirect(authUrl);
}
