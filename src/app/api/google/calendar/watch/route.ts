/**
 * @file /api/google/calendar/watch/route.ts
 * @description Registra un canal de notificaciones push (watch) en Google Calendar.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getCalendarClient } from "@/lib/googleClient";
import { saveServerTokens, getServerTokens, ServerTokens } from "@/lib/serverTokenStore";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

/**
 * Resuelve el ID del calendario de trabajo o primary.
 */
async function resolveCalendarId(calendar: any): Promise<string> {
  try {
    const listResponse = await calendar.calendarList.list();
    const items = listResponse.data.items || [];
    const targetCalendar = items.find(
      (c: any) => c.summary === "Grupo Arca Agenda" || c.summary === "Grupo Arca"
    );
    if (targetCalendar) {
      return targetCalendar.id;
    }
  } catch (err: any) {
    console.warn("[Calendar Watch Resolve] Falló buscar calendario:", err.message);
  }
  return "primary";
}

/**
 * POST /api/google/calendar/watch
 * Registra o renueva el canal de notificación push para el calendario del usuario.
 */
export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens || !tokens.email) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const isLocalhost = appUrl.includes("localhost") || appUrl.includes("127.0.0.1");

  try {
    // 1. Cargar tokens de servidor si están guardados para actualizar
    const serverTokens: ServerTokens = (await getServerTokens(tokens.email)) || { ...tokens };

    // 2. Comprobar si ya existe un watch activo (y con vida superior a 15 minutos)
    const now = Date.now();
    if (
      serverTokens.channelId &&
      serverTokens.resourceId &&
      serverTokens.expiration &&
      serverTokens.expiration > now + 15 * 60 * 1000
    ) {
      console.log(`[Calendar Watch] Watch activo existente para ${tokens.email} (Vence el ${new Date(serverTokens.expiration).toLocaleString()})`);
      return NextResponse.json({
        success: true,
        alreadyActive: true,
        channelId: serverTokens.channelId,
        expiration: serverTokens.expiration,
        isLocalhost,
      });
    }

    // 3. Crear cliente e inicializar suscripción
    const calendar = getCalendarClient({
      access_token: serverTokens.access_token,
      refresh_token: serverTokens.refresh_token,
      expiry_date: serverTokens.expiry_date,
    });

    const calendarId = await resolveCalendarId(calendar);
    const channelId = randomUUID();
    const webhookUrl = `${appUrl}/api/google/webhook`;

    console.log(`[Calendar Watch] Solicitando watch a Google para ${tokens.email} en ${webhookUrl}`);

    const watchResponse = await calendar.events.watch({
      calendarId,
      requestBody: {
        id: channelId,
        type: "web_hook",
        address: webhookUrl,
        token: `email=${tokens.email}`,
      },
    });

    const result = watchResponse.data;
    const expiration = result.expiration ? parseInt(result.expiration, 10) : now + 7 * 24 * 3600 * 1000;

    // 4. Guardar info del canal en servidor
    await saveServerTokens(tokens.email, {
      ...serverTokens,
      channelId,
      resourceId: result.resourceId || "",
      expiration,
    });

    console.log(`[Calendar Watch] Watch creado exitosamente para ${tokens.email}. ID de canal: ${channelId}`);

    return NextResponse.json({
      success: true,
      channelId,
      resourceId: result.resourceId,
      expiration,
      isLocalhost,
    });
  } catch (err: any) {
    console.error("[Calendar Watch Error]", err.message);

    // Permitimos responder 200 con success: false en caso de error por localhost (URL no válida para Google)
    // Esto previene que se rompa la app y nos permite manejar elegantemente el polling fallback en el cliente.
    return NextResponse.json({
      success: false,
      error: err.message,
      isLocalhost,
      details: "Las notificaciones push requieren una URL HTTPS pública expuesta (ej. ngrok) para que Google envíe alertas."
    });
  }
}
