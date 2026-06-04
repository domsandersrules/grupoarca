/**
 * @file /api/google/sheets/sync/route.ts
 * @description API Route para consolidar todos los datos de la app y escribirlos
 * automáticamente en un archivo Spreadsheet multipestaña de Google Sheets para su consumo en Data Studio.
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getDriveClient, getSheetsClient } from "@/lib/googleClient";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { ventas = [], nesting = [], clientes = [], inventario = [], logistica = [] } = body;

    const drive = getDriveClient(tokens);
    const sheets = getSheetsClient(tokens);

    const spreadsheetName = "Dashboard Grupo Arca (Datos)";
    let spreadsheetId = "";

    // 1. Buscar si el archivo de hoja de cálculo ya existe en Google Drive
    const searchResponse = await drive.files.list({
      q: `name = '${spreadsheetName}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`,
      fields: "files(id, name, webViewLink)",
      pageSize: 1,
    });

    const fileList = searchResponse.data.files || [];

    if (fileList.length > 0) {
      spreadsheetId = fileList[0].id!;
      console.log(`[Sheets Sync] Archivo existente encontrado: ${spreadsheetId}`);
    } else {
      // Si no existe, crear la hoja de cálculo
      const newSpreadsheet = await drive.files.create({
        requestBody: {
          name: spreadsheetName,
          mimeType: "application/vnd.google-apps.spreadsheet",
        },
        fields: "id, webViewLink",
      });
      spreadsheetId = newSpreadsheet.data.id!;
      console.log(`[Sheets Sync] Nuevo archivo Spreadsheet creado: ${spreadsheetId}`);
    }

    // 2. Obtener las pestañas actuales del documento para verificar cuáles existen
    const spreadsheetMetadata = await sheets.spreadsheets.get({
      spreadsheetId,
    });
    const existingSheetTitles = (spreadsheetMetadata.data.sheets || []).map(
      (s) => s.properties?.title || ""
    );

    const requiredSheets = ["Ventas", "Nesting", "Clientes", "Inventario", "Logistica"];
    const addSheetRequests: any[] = [];

    // Validar si falta alguna pestaña requerida
    for (const title of requiredSheets) {
      if (!existingSheetTitles.includes(title)) {
        addSheetRequests.push({
          addSheet: {
            properties: {
              title,
            },
          },
        });
      }
    }

    // Si faltan pestañas, crearlas en un lote único
    if (addSheetRequests.length > 0) {
      console.log(`[Sheets Sync] Creando pestañas faltantes: ${addSheetRequests.map(r => r.addSheet.properties.title).join(", ")}`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: addSheetRequests,
        },
      });
    }

    // 3. Estructurar los datos en formato de matrices de filas para cargarlos
    const syncData = [
      {
        sheetTitle: "Ventas",
        rows: [
          ["Fecha", "Folio", "Cliente", "TipoCliente", "Sucursal", "Vendedor", "Subtotal", "Total", "Estado", "EficienciaNesting"],
          ...ventas.map((v: any) => [
            v.fecha, v.folio, v.cliente, v.tipoCliente, v.sucursal, v.vendedor, v.subtotal, v.total, v.estado, v.eficiencia
          ])
        ]
      },
      {
        sheetTitle: "Nesting",
        rows: [
          ["Fecha", "OrdenId", "Sucursal", "MaterialTipo", "CodigoMaterial", "MedidaStock", "Metodo", "PiezasCargadas", "CantidadStockUsado", "EficienciaGlobal"],
          ...nesting.map((n: any) => [
            n.fecha, n.ordenId, n.sucursal, n.materialTipo, n.codigoMaterial, n.medidaStock, n.metodo, n.piezasCargadas, n.cantidadStockUsado, n.eficienciaGlobal
          ])
        ]
      },
      {
        sheetTitle: "Clientes",
        rows: [
          ["ID", "Nombre", "Email", "Estado", "Sucursal"],
          ...clientes.map((c: any) => [
            c.id, c.nombre, c.email, c.estado, c.sucursal
          ])
        ]
      },
      {
        sheetTitle: "Inventario",
        rows: [
          ["Codigo", "Nombre", "StockActual", "StockMinimo", "Costo", "ValorTotal"],
          ...inventario.map((i: any) => [
            i.codigo, i.nombre, i.stockActual, i.stockMinimo, i.costo, i.valorTotal
          ])
        ]
      },
      {
        sheetTitle: "Logistica",
        rows: [
          ["OrdenID", "Sucursal", "Estado", "Conductor", "FechaProgramada"],
          ...logistica.map((l: any) => [
            l.ordenId, l.sucursal, l.estado, l.conductor, l.fechaProgramada
          ])
        ]
      }
    ];

    // 4. Limpiar y actualizar los datos en cada pestaña en lote o de forma secuencial
    for (const dataset of syncData) {
      const range = `${dataset.sheetTitle}!A1:Z10000`;
      
      // Limpiar contenido anterior
      await sheets.spreadsheets.values.clear({
        spreadsheetId,
        range,
      });

      // Escribir nuevos datos estructurados
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${dataset.sheetTitle}!A1`,
        valueInputOption: "RAW",
        requestBody: {
          values: dataset.rows,
        },
      });
    }

    // 5. Devolver enlace del archivo para que el usuario pueda abrirlo en Google Drive
    const fileInfo = await drive.files.get({
      fileId: spreadsheetId,
      fields: "webViewLink",
    });

    return NextResponse.json({
      success: true,
      spreadsheetId,
      webViewLink: fileInfo.data.webViewLink,
      message: "Todas las métricas se han consolidado y sincronizado en Google Sheets con éxito."
    });

  } catch (err: any) {
    console.error("[Sheets Sync API Error]", err.message);
    return NextResponse.json({ error: `Fallo al sincronizar datos en Google Sheets: ${err.message}` }, { status: 500 });
  }
}
