/**
 * @file /api/google/calendar/stream/route.ts
 * @description Endpoint de Server-Sent Events (SSE) para empujar notificaciones en tiempo real al frontend.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Evitar que el mapa de clientes se reinicie en Hot Reload durante el desarrollo local de Next.js
const globalForSse = global as unknown as {
  sseClients?: Map<string, Set<ReadableStreamDefaultController>>;
};

if (!globalForSse.sseClients) {
  globalForSse.sseClients = new Map();
}

const clients = globalForSse.sseClients;

/**
 * Registra una conexión de cliente en el mapa.
 */
function registerClient(email: string, controller: ReadableStreamDefaultController) {
  const lowerEmail = email.toLowerCase();
  if (!clients.has(lowerEmail)) {
    clients.set(lowerEmail, new Set());
  }
  clients.get(lowerEmail)!.add(controller);
  console.log(`[SSE] Cliente conectado para ${lowerEmail}. Total conexiones activas: ${clients.get(lowerEmail)!.size}`);
}

/**
 * Desregistra una conexión de cliente para evitar fugas de memoria.
 */
function unregisterClient(email: string, controller: ReadableStreamDefaultController) {
  const lowerEmail = email.toLowerCase();
  const userSet = clients.get(lowerEmail);
  if (userSet) {
    userSet.delete(controller);
    console.log(`[SSE] Cliente desconectado para ${lowerEmail}. Restan: ${userSet.size}`);
    if (userSet.size === 0) {
      clients.delete(lowerEmail);
    }
  }
}

/**
 * Envía una señal de actualización (calendar_update) a todos los navegadores abiertos de un usuario.
 * Es llamado asíncronamente desde el Webhook de Google.
 *
 * @param email - Correo del usuario a notificar
 */
export function notifyCalendarUpdate(email: string) {
  const lowerEmail = email.toLowerCase();
  const userSet = clients.get(lowerEmail);
  if (!userSet || userSet.size === 0) {
    console.log(`[SSE] Sin clientes activos para notificar cambios en la agenda de ${lowerEmail}`);
    return;
  }

  console.log(`[SSE] Notificando actualización de calendario a ${userSet.size} clientes de ${lowerEmail}`);
  const encoder = new TextEncoder();
  const msg = encoder.encode("event: calendar_update\ndata: {}\n\n");

  for (const controller of userSet) {
    try {
      controller.enqueue(msg);
    } catch (err) {
      console.warn(`[SSE] Falló envío de mensaje, limpiando conexión inactiva para ${lowerEmail}`);
      userSet.delete(controller);
    }
  }
}

/**
 * GET /api/google/calendar/stream
 * Abre un canal de comunicación persistente (Server-Sent Events) con el navegador.
 */
export async function GET(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens || !tokens.email) {
    return new NextResponse("No autorizado. Sesión de Google inactiva.", { status: 401 });
  }

  const email = tokens.email;
  let controllerRef: ReadableStreamDefaultController | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controllerRef = controller;
      registerClient(email, controller);

      const encoder = new TextEncoder();
      // Enviar confirmación de conexión inicial
      controller.enqueue(encoder.encode("event: connected\ndata: {\"connected\":true}\n\n"));

      // Ping periódico para mantener el socket abierto ante firewalls y balanceadores (ej. Cloudflare/Nginx)
      const interval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode("event: ping\ndata: {}\n\n"));
        } catch (err) {
          // Si da error, el cliente se ha ido. Limpiar recursos.
          clearInterval(interval);
        }
      }, 20000);

      // Almacenar el intervalo para poder limpiarlo al cerrar el stream
      (controller as any)._pingInterval = interval;
    },
    cancel() {
      if (controllerRef) {
        if ((controllerRef as any)._pingInterval) {
          clearInterval((controllerRef as any)._pingInterval);
        }
        unregisterClient(email, controllerRef);
      }
    }
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}
