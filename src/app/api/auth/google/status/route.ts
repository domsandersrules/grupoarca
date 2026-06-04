/**
 * @file /api/auth/google/status/route.ts
 * @description Verifica el estado de la sesión de Google del usuario.
 *
 * Lee la cookie httpOnly del servidor y retorna si hay una sesión activa,
 * sin exponer los tokens al cliente.
 */

import { NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";

export const runtime = "nodejs";

export async function GET() {
  try {
    const tokens = await getTokens();

    if (!tokens) {
      return NextResponse.json({
        connected: false,
        email: null,
        name: null,
        picture: null,
      });
    }

    // Retornar solo información de perfil (nunca los tokens)
    return NextResponse.json({
      connected: true,
      email: tokens.email,
      name: tokens.name,
      picture: tokens.picture ?? null,
      expiryDate: tokens.expiry_date,
    });
  } catch (error) {
    console.error("[Google Status]", error);
    return NextResponse.json({ connected: false, email: null }, { status: 500 });
  }
}
