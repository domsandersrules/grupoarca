/**
 * @file /api/google/webhook/route.ts
 * @description Webhook público expuesto a Google Calendar para recibir notificaciones push en tiempo real.
 */

import { NextRequest, NextResponse } from "next/server";
import { notifyCalendarUpdate } from "../calendar/stream/route";

export const runtime = "nodejs";

/**
 * POST /api/google/webhook
 * Recibe eventos de sincronización y cambios de Google Calendar.
 * NOTA: Google requiere que este endpoint devuelva rápidamente un estado 2xx.
 */
export async function POST(request: NextRequest) {
  try {
    const headers = request.headers;
    const channelId = headers.get("x-goog-channel-id");
    const resourceId = headers.get("x-goog-resource-id");
    const resourceState = headers.get("x-goog-resource-state");
    const channelToken = headers.get("x-goog-channel-token") || "";

    console.log(`[Google Calendar Webhook] Recibida alerta push:`, {
      channelId,
      resourceId,
      resourceState,
      channelToken,
    });

    // 1. Validar el estado de sincronización (Watch Confirmación)
    if (resourceState === "sync") {
      console.log(`[Google Calendar Webhook] Confirmación de canal (sync) para el canal ID: ${channelId}`);
      return new NextResponse("Sync ok", { status: 200 });
    }

    // 2. Extraer el correo del usuario del token
    // Se espera el formato: "email=usuario@ejemplo.com"
    let email = "";
    if (channelToken && channelToken.startsWith("email=")) {
      email = channelToken.split("email=")[1]?.trim();
    }

    if (!email) {
      console.warn("[Google Calendar Webhook] Alerta recibida sin un canal de email asociado. Ignorando...");
      return new NextResponse("Sin email asociado", { status: 200 });
    }

    // 3. Procesar el cambio del calendario
    // "exists" indica creación, modificación o eliminación de un evento
    if (resourceState === "exists") {
      console.log(`[Google Calendar Webhook] Cambio detectado para ${email}. Disparando actualización SSE.`);
      
      // Empujar la alerta en tiempo real a las pestañas abiertas de este usuario
      notifyCalendarUpdate(email);
    }

    return new NextResponse("Procesado con éxito", { status: 200 });
  } catch (err: any) {
    console.error("[Google Calendar Webhook] Error al procesar webhook:", err.message);
    // Respondemos 500 pero loggeamos el error
    return new NextResponse("Error interno del servidor", { status: 500 });
  }
}
