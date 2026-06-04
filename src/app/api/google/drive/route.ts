/**
 * @file /api/google/drive/route.ts
 * @description API proxy segura para Google Drive.
 *
 * GET    → Lista archivos/carpetas en un directorio
 * POST   → Crea una carpeta nueva o sube un archivo/foto (multipart)
 * DELETE → Mueve un archivo a la papelera
 *
 * Diseñado para manejar subida real de fotos de obra y documentos.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getDriveClient } from "@/lib/googleClient";
import { Readable } from "stream";

export const runtime = "nodejs";

/**
 * GET /api/google/drive?folderId=xxx
 * Lista los archivos y carpetas dentro de una carpeta de Drive.
 * Si no se especifica folderId, lista el root.
 */
export async function GET(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || "root";
    const query = searchParams.get("q") || "";

    const drive = getDriveClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Construir query para Drive API
    let q = `'${folderId}' in parents and trashed = false`;
    if (query) {
      q += ` and name contains '${query.replace(/'/g, "\\'")}'`;
    }

    const response = await drive.files.list({
      q,
      fields: "files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, thumbnailLink, parents)",
      orderBy: "folder,name",
      pageSize: 200,
    });

    return NextResponse.json({
      files: response.data.files || [],
      folderId,
    });
  } catch (err: any) {
    console.error("[Drive GET]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/google/drive
 * Crea una carpeta o sube un archivo/foto a Drive.
 *
 * Para CREAR CARPETA: JSON body { action: "create_folder", name, parentId? }
 * Para SUBIR ARCHIVO: FormData con campo "file" (File) y opcionalmente "parentId", "name"
 */
export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  const contentType = request.headers.get("content-type") || "";

  try {
    const drive = getDriveClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // ─── Crear carpeta o archivo ───────────────────────────────────────────────
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { action, name, parentId, mimeType } = body;

      if (action === "create_folder") {
        if (!name) {
          return NextResponse.json({ error: "Se requiere el nombre de la carpeta." }, { status: 400 });
        }

        const folder = await drive.files.create({
          requestBody: {
            name,
            mimeType: "application/vnd.google-apps.folder",
            parents: parentId ? [parentId] : [],
          },
          fields: "id, name, webViewLink",
        });

        return NextResponse.json({
          success: true,
          folderId: folder.data.id,
          name: folder.data.name,
          webViewLink: folder.data.webViewLink,
        });
      }

      if (action === "create_file") {
        if (!name || !mimeType) {
          return NextResponse.json({ error: "Se requiere nombre y mimeType." }, { status: 400 });
        }

        // Determinar el contenido inicial del archivo y su tipo MIME de origen
        let fileContent = "";
        let uploadMimeType = "text/plain";

        if (mimeType === "application/vnd.google-apps.document") {
          // Documento de Google Docs: Inyectar estructura HTML del Contrato
          uploadMimeType = "text/html";
          fileContent = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #1f2937; margin: 40px; }
                h1 { text-align: center; font-size: 16pt; text-transform: uppercase; text-decoration: underline; margin-bottom: 30px; font-weight: bold; }
                h2 { font-size: 11pt; text-transform: uppercase; margin-top: 25px; margin-bottom: 10px; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 4px; }
                p { text-align: justify; text-indent: 30px; font-size: 10pt; margin-bottom: 12px; }
                .bold { font-weight: bold; }
                .signatures { margin-top: 60px; width: 100%; border-collapse: collapse; }
                .signatures td { width: 50%; text-align: center; font-size: 9pt; }
                .signature-line { border-top: 1px solid #9ca3af; width: 220px; margin: 50px auto 8px auto; }
              </style>
            </head>
            <body>
              <h1>CONTRATO DE SUMINISTRO E INSTALACIÓN DE VIDRIO Y ALUMINIO</h1>
              <p>Conste por el presente documento el Contrato de Prestación de Servicios de Fabricación y Colocación que celebran, de una parte, <span class="bold">Grupo Arca S.A. de C.V.</span> en su carácter de Proveedor Certificado (en lo sucesivo "El Contratista"), y de la otra parte, el Cliente cuyos datos se especifican en el Folio Operativo correspondiente de fecha ${new Date().toLocaleDateString("es-MX")}.</p>
              
              <h2>DECLARACIONES:</h2>
              <p>I. DECLARA EL CONTRATISTA: Ser una persona moral legalmente constituida conforme a las leyes mexicanas, con domicilio comercial en Acapulco Matriz, con capacidad técnica y económica para cumplir con los requerimientos de la obra.</p>
              <p>II. DECLARA EL CLIENTE: Que requiere la fabricación e instalación de sistemas de cancelería de vidrio templado, perfiles de aluminio y domos de acuerdo con el desglose técnico y cálculos estructurales previamente validados en el sistema.</p>
              
              <h2>CLÁUSULAS:</h2>
              <p><span class="bold">PRIMERA: OBJETO.</span> El contratista se obliga a ejecutar bajo su entera responsabilidad, utilizando personal especializado y perfiles certificados del proveedor certificado, los trabajos de cancelería descritos en los planos y especificaciones anexas.</p>
              <p><span class="bold">SEGUNDA: PLAZO DE ENTREGA.</span> Las partes convienen en que los trabajos descritos se entregarán conforme al cronograma de obra agendado dinámicamente en el módulo de logística y entregas de la suite.</p>
              
              <table class="signatures">
                <tr>
                  <td>
                    <div class="signature-line"></div>
                    <span class="bold">Por el Contratista</span><br>Grupo Arca Representante
                  </td>
                  <td>
                    <div class="signature-line"></div>
                    <span class="bold">Por el Cliente</span><br>Firma de Aceptación
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;
        } else if (mimeType === "application/vnd.google-apps.spreadsheet") {
          // Hoja de Google Sheets: Inyectar CSV estructurado del reporte de Nesting
          uploadMimeType = "text/csv";
          fileContent = [
            "CÁLCULO E INDUSTRIALIZACIÓN - OPTIMIZACIÓN LINEAL (NESTING)",
            `Reporte de optimización de barras de aluminio para corte en taller. Optimización ejecutada el: ${new Date().toLocaleDateString("es-MX")}`,
            "",
            "Perfil Cód.,Largo Tramo (m),Cortes Requeridos,Tramos a Utilizar,Desperdicio (mm),Eficiencia (%)",
            "ALU-3-NAT,6.10 m,\"8 x [1.20m], 4 x [0.90m]\",3,450 mm (2.4%),97.6%",
            "ALU-BOQ-BR,6.10 m,\"6 x [1.50m], 2 x [1.10m]\",2,300 mm (1.6%),98.4%",
            "Total,5 tramos,,5 tramos,750 mm,98.0% prom.",
            "",
            "Aviso del Taller: Este cálculo de corte es de uso confidencial e interno para el personal habilitador."
          ].join("\n");
        } else if (mimeType === "application/vnd.google-apps.presentation") {
          // Presentación de Google Slides: Inyectar estructura HTML por diapositiva
          uploadMimeType = "text/html";
          fileContent = `
            <!DOCTYPE html>
            <html>
            <body>
              <section>
                <h1>Presentación Corporativa de Obras</h1>
                <h2>Grupo Arca 2.0 Suite</h2>
                <p>Diapositivas comerciales preparadas para el cliente con fotografías de referencias de pérgolas y canceles instalados.</p>
              </section>
              <hr style="page-break-after:always;">
              <section>
                <h1>Nuestros Servicios de Instalación</h1>
                <ul>
                  <li>Cancelería de Aluminio de Alta Gama</li>
                  <li>Vidrio Templado y Sistemas de Fachada Suspendida</li>
                  <li>Domo Estructural y Cancelería Residencial</li>
                </ul>
              </section>
              <hr style="page-break-after:always;">
              <section>
                <h1>Garantía de Calidad</h1>
                <p>Todos nuestros perfiles y accesorios cumplen con las normas nacionales e internacionales más estrictas del mercado.</p>
              </section>
            </body>
            </html>
          `;
        }

        const stream = Readable.from(Buffer.from(fileContent, "utf8"));

        const file = await drive.files.create({
          requestBody: {
            name,
            mimeType,
            parents: parentId ? [parentId] : [],
          },
          media: {
            mimeType: uploadMimeType,
            body: stream,
          },
          fields: "id, name, mimeType, webViewLink, webContentLink, size, thumbnailLink",
        });

        return NextResponse.json({
          success: true,
          fileId: file.data.id,
          name: file.data.name,
          mimeType: file.data.mimeType,
          webViewLink: file.data.webViewLink,
          webContentLink: file.data.webContentLink,
          thumbnailLink: file.data.thumbnailLink,
          size: file.data.size || "0 B",
        });
      }

      return NextResponse.json({ error: "Acción no reconocida." }, { status: 400 });
    }

    // ─── Subir archivo/foto ────────────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const parentId = formData.get("parentId") as string | null;
      const customName = formData.get("name") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No se recibió ningún archivo." }, { status: 400 });
      }

      // Validación de tipo MIME permitido
      const allowedTypes = [
        "image/jpeg", "image/png", "image/webp", "image/gif",
        "application/pdf",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "text/plain",
      ];

      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({
          error: `Tipo de archivo no permitido: ${file.type}. Permitidos: imágenes, PDF, Excel, Word.`
        }, { status: 400 });
      }

      // Convertir File a stream para la API de Drive
      const buffer = Buffer.from(await file.arrayBuffer());
      const stream = Readable.from(buffer);

      const uploadedFile = await drive.files.create({
        requestBody: {
          name: customName || file.name,
          parents: parentId ? [parentId] : [],
        },
        media: {
          mimeType: file.type,
          body: stream,
        },
        fields: "id, name, mimeType, webViewLink, webContentLink, size, thumbnailLink",
      });

      return NextResponse.json({
        success: true,
        fileId: uploadedFile.data.id,
        name: uploadedFile.data.name,
        mimeType: uploadedFile.data.mimeType,
        webViewLink: uploadedFile.data.webViewLink,
        webContentLink: uploadedFile.data.webContentLink,
        thumbnailLink: uploadedFile.data.thumbnailLink,
        size: uploadedFile.data.size,
      });
    }

    return NextResponse.json({ error: "Content-Type no soportado." }, { status: 400 });
  } catch (err: any) {
    console.error("[Drive POST]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * DELETE /api/google/drive?fileId=xxx
 * Mueve un archivo a la papelera de Drive.
 */
export async function DELETE(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get("fileId");

    if (!fileId) {
      return NextResponse.json({ error: "Se requiere fileId." }, { status: 400 });
    }

    const drive = getDriveClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Mover a papelera (no eliminar permanentemente)
    await drive.files.update({
      fileId,
      requestBody: { trashed: true },
    });

    return NextResponse.json({ success: true, deletedFileId: fileId });
  } catch (err: any) {
    console.error("[Drive DELETE]", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
