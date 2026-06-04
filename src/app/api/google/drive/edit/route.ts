/**
 * @file /api/google/drive/edit/route.ts
 * @description API Route para actualizar el contenido real de los archivos guardados en Google Drive.
 * Convierte el nuevo código HTML/CSV entrante al formato nativo correspondiente.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getDriveClient } from "@/lib/googleClient";
import { Readable } from "stream";

export const runtime = "nodejs";

/**
 * POST /api/google/drive/edit
 * Actualiza el contenido de un archivo en Google Drive (HTML a Doc/Slide, CSV a Sheet).
 */
export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { fileId, tipo, content } = body;

    if (!fileId || !tipo || content === undefined) {
      return NextResponse.json({ error: "Faltan parámetros requeridos: fileId, tipo o content." }, { status: 400 });
    }

    const drive = getDriveClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Definir tipo de entrada de subida
    let uploadMimeType = "text/plain";
    if (tipo === "doc") uploadMimeType = "text/html";
    else if (tipo === "sheet") uploadMimeType = "text/csv";
    else if (tipo === "slide") uploadMimeType = "text/html";

    // Crear stream de datos
    const stream = Readable.from(Buffer.from(content, "utf8"));

    console.log(`[Drive Edit API] Escribiendo cambios en el archivo ID: ${fileId}. Formato origen: ${uploadMimeType}`);

    // Google Drive sobrescribe el contenido del archivo y re-ejecuta la conversión nativa
    await drive.files.update({
      fileId,
      media: {
        mimeType: uploadMimeType,
        body: stream,
      },
    });

    return NextResponse.json({
      success: true,
      message: "El archivo ha sido modificado y sincronizado en Google Drive con éxito."
    });

  } catch (err: any) {
    console.error("[Drive Edit API]", err.message);
    return NextResponse.json({ error: `Error al guardar cambios: ${err.message}` }, { status: 500 });
  }
}
