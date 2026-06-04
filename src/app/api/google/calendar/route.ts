/**
 * @file /api/google/calendar/route.ts
 * @description API proxy segura para Google Calendar.
 *
 * GET  → Lista eventos del calendario en un rango de fechas
 * POST → Crea un nuevo evento en Google Calendar
 * DELETE → Elimina un evento por ID
 *
 * Todos los endpoints verifican la sesión activa antes de operar.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getCalendarClient } from "@/lib/googleClient";

export const runtime = "nodejs";

/**
 * Busca y retorna el ID del calendario "Grupo Arca Agenda" o "Grupo Arca".
 * Si no existe, retorna "primary" como fallback.
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
    console.warn("[Calendar API] No se pudo listar los calendarios de la cuenta:", err.message);
  }
  return "primary";
}

/**
 * GET /api/google/calendar
 * Lista los próximos eventos del calendario del usuario.
 * Query params:
 *   - timeMin: ISO string (por defecto: inicio del día actual)
 *   - timeMax: ISO string (por defecto: 90 días después)
 *   - maxResults: número máximo de eventos (por defecto: 100)
 */
export async function GET(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const timeMin = searchParams.get("timeMin") || new Date().toISOString();
    const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const maxResults = parseInt(searchParams.get("maxResults") || "100", 10);

    const calendar = getCalendarClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const calendarId = await resolveCalendarId(calendar);

    const response = await calendar.events.list({
      calendarId,
      timeMin,
      timeMax,
      maxResults,
      singleEvents: true,
      orderBy: "startTime",
    });

    return NextResponse.json({
      events: response.data.items || [],
      nextPageToken: response.data.nextPageToken,
    });
  } catch (err: any) {
    console.error("[Calendar GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/google/calendar
 * Crea un nuevo evento en Google Calendar.
 * Body JSON:
 *   - titulo: string
 *   - descripcion: string
 *   - fechaInicio: ISO string
 *   - fechaFin: ISO string
 *   - tipo: "visita" | "produccion" | "instalacion"
 *   - colorId?: string (ID de color de Google Calendar)
 *   - attendees?: string[] (emails de asistentes)
 */
export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { titulo, descripcion, fechaInicio, fechaFin, tipo, attendees } = body;

    if (!titulo || !fechaInicio || !fechaFin) {
      return NextResponse.json({ error: "Faltan campos requeridos: titulo, fechaInicio, fechaFin." }, { status: 400 });
    }

    // Color por tipo de evento (IDs de color de Google Calendar)
    const colorMap: Record<string, string> = {
      visita: "9",        // Azul
      produccion: "5",    // Amarillo/Plátano
      instalacion: "2",   // Verde salvia
    };

    const calendar = getCalendarClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const calendarId = await resolveCalendarId(calendar);

    const event = await calendar.events.insert({
      calendarId,
      sendUpdates: "all", // Notificar automáticamente a todos los asistentes por correo electrónico
      requestBody: {
        summary: titulo,
        description: `[${tipo?.toUpperCase() || "EVENTO"}] ${descripcion || ""}`,
        start: {
          dateTime: fechaInicio,
          timeZone: "America/Mexico_City",
        },
        end: {
          dateTime: fechaFin,
          timeZone: "America/Mexico_City",
        },
        colorId: colorMap[tipo] || "1",
        source: {
          title: "Grupo Arca 2.0 Suite",
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        },
        attendees: attendees?.map((email: string) => ({ email })) || [],
      },
    });

    return NextResponse.json({
      success: true,
      eventId: event.data.id,
      htmlLink: event.data.htmlLink,
      event: event.data,
    });
  } catch (err: any) {
    console.error("[Calendar POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/google/calendar?eventId=xxx
 * Elimina un evento del calendario.
 */
export async function DELETE(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get("eventId");

    if (!eventId) {
      return NextResponse.json({ error: "Se requiere eventId." }, { status: 400 });
    }

    const calendar = getCalendarClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    const calendarId = await resolveCalendarId(calendar);

    await calendar.events.delete({
      calendarId,
      eventId,
    });

    return NextResponse.json({ success: true, deletedEventId: eventId });
  } catch (err: any) {
    console.error("[Calendar DELETE]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
