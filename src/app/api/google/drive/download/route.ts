/**
 * @file /api/google/drive/download/route.ts
 * @description API Route para descargar y exportar de forma física archivos de Google Drive.
 * Convierte dinámicamente Google Docs/Sheets/Slides a formatos de Microsoft Office (DOCX, XLSX, PPTX).
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getDriveClient } from "@/lib/googleClient";

export const runtime = "nodejs";

/**
 * GET /api/google/drive/download?fileId=xxx
 * Descarga un archivo binario o exporta un documento nativo de Google a formatos de Microsoft Office.
 */
export async function GET(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Se requiere el parámetro fileId." }, { status: 400 });
    }

    const drive = getDriveClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // 1. Obtener los metadatos esenciales para determinar el tipo de archivo
    const metadata = await drive.files.get({
      fileId,
      fields: "name, mimeType",
    });

    const { name: originalName, mimeType } = metadata.data;
    if (!mimeType) {
      throw new Error("No se pudo resolver el tipo MIME del archivo.");
    }

    let downloadBuffer: ArrayBuffer;
    let contentType = mimeType;
    let filename = originalName || "archivo";

    // 2. Ejecutar exportación de Google Workspace o descarga binaria directa
    if (mimeType === "application/vnd.google-apps.document") {
      // Google Doc -> Microsoft Word
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const cleanName = filename.replace(/\.(docx|doc|pdf|txt)$/i, "");
      filename = `${cleanName}.docx`;

      const exportResponse = await drive.files.export(
        { fileId, mimeType: contentType },
        { responseType: "arraybuffer" }
      );
      downloadBuffer = exportResponse.data as ArrayBuffer;

    } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
      // Google Sheet -> Microsoft Excel
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const cleanName = filename.replace(/\.(xlsx|xls|csv)$/i, "");
      filename = `${cleanName}.xlsx`;

      const exportResponse = await drive.files.export(
        { fileId, mimeType: contentType },
        { responseType: "arraybuffer" }
      );
      downloadBuffer = exportResponse.data as ArrayBuffer;

    } else if (mimeType === "application/vnd.google-apps.presentation") {
      // Google Slides -> Microsoft PowerPoint
      contentType = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      const cleanName = filename.replace(/\.(pptx|ppt)$/i, "");
      filename = `${cleanName}.pptx`;

      const exportResponse = await drive.files.export(
        { fileId, mimeType: contentType },
        { responseType: "arraybuffer" }
      );
      downloadBuffer = exportResponse.data as ArrayBuffer;

    } else {
      // Archivo binario directo (PDF, Imágenes, etc.)
      const downloadResponse = await drive.files.get(
        { fileId, alt: "media" },
        { responseType: "arraybuffer" }
      );
      downloadBuffer = downloadResponse.data as ArrayBuffer;
    }

    // Convertir a Buffer compatible con NextResponse
    const buffer = Buffer.from(downloadBuffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
        "Content-Length": buffer.length.toString(),
      },
    });

  } catch (err: any) {
    console.error("[Drive Download API]", err.message);
    return NextResponse.json({ error: `Error en descarga: ${err.message}` }, { status: 500 });
  }
}
