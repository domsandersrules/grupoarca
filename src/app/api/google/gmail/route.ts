/**
 * @file /api/google/gmail/route.ts
 * @description API proxy segura para envío de correos vía Gmail API.
 *
 * POST → Envía un correo usando la cuenta Google autenticada.
 *
 * El correo se construye como mensaje RFC 2822 en base64url y se envía
 * usando el scope `gmail.send`, que solo permite enviar (no leer correos).
 */

import { NextRequest, NextResponse } from "next/server";
import { getTokens } from "@/lib/tokenStore";
import { getGmailClient } from "@/lib/googleClient";

export const runtime = "nodejs";

/**
 * Construye un mensaje de correo en formato RFC 2822 codificado en base64url.
 * Soporta correo simple y correos con archivos adjuntos usando multipart/mixed.
 */
function buildRfc2822Message({
  from,
  to,
  subject,
  body,
  isHtml = false,
  attachments = [],
}: {
  from: string;
  to: string;
  subject: string;
  body: string;
  isHtml?: boolean;
  attachments?: Array<{ name: string; type: string; content: string }>;
}): string {
  const textContentType = isHtml ? "text/html" : "text/plain";

  const headers = [
    `From: ${from}`,
    `To: ${to}`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString("base64")}?=`,
    `MIME-Version: 1.0`,
  ];

  let rawMessage = "";

  if (!attachments || attachments.length === 0) {
    // Mensaje simple sin adjuntos
    headers.push(`Content-Type: ${textContentType}; charset=UTF-8`);
    headers.push(`Content-Transfer-Encoding: base64`);
    headers.push(``);
    rawMessage = headers.join("\r\n") + "\r\n" + Buffer.from(body, "utf8").toString("base64");
  } else {
    // Mensaje compuesto con adjuntos (multipart/mixed)
    const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    headers.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
    headers.push(``);

    const parts: string[] = [];

    // 1. Cuerpo del mensaje
    parts.push(`--${boundary}`);
    parts.push(`Content-Type: ${textContentType}; charset=UTF-8`);
    parts.push(`Content-Transfer-Encoding: base64`);
    parts.push(``);
    parts.push(Buffer.from(body, "utf8").toString("base64"));

    // 2. Archivos adjuntos
    for (const attach of attachments) {
      parts.push(`--${boundary}`);
      const encodedFilename = `=?UTF-8?B?${Buffer.from(attach.name).toString("base64")}?=`;
      parts.push(`Content-Type: ${attach.type}; name="${encodedFilename}"`);
      parts.push(`Content-Disposition: attachment; filename="${encodedFilename}"`);
      parts.push(`Content-Transfer-Encoding: base64`);
      parts.push(``);
      
      // Limpiar prefijo dataUrl del Base64 si viniera incluido desde el frontend
      const base64Data = attach.content.includes("base64,")
        ? attach.content.split("base64,")[1]
        : attach.content;
      
      parts.push(base64Data);
    }

    parts.push(`--${boundary}--`);
    rawMessage = headers.join("\r\n") + "\r\n" + parts.join("\r\n");
  }

  // Codificar en base64url compatible con la Gmail API
  return Buffer.from(rawMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * POST /api/google/gmail
 * Envía un correo usando la cuenta de Google autenticada con soporte para adjuntos.
 */
export async function POST(request: NextRequest) {
  const tokens = await getTokens();
  if (!tokens) {
    return NextResponse.json({ error: "No autenticado con Google." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, subject, body: messageBody, isHtml, attachments } = body;

    // Validación de campos requeridos
    if (!to || !subject || !messageBody) {
      return NextResponse.json({
        error: "Faltan campos requeridos: to, subject, body."
      }, { status: 400 });
    }

    // Validación básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json({ error: "Email destinatario inválido." }, { status: 400 });
    }

    const gmail = getGmailClient({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });

    // Construir y enviar el mensaje
    const rawMessage = buildRfc2822Message({
      from: tokens.email,
      to,
      subject,
      body: messageBody,
      isHtml: isHtml ?? false,
      attachments: attachments ?? [],
    });

    const sentMessage = await gmail.users.messages.send({
      userId: "me",
      requestBody: {
        raw: rawMessage,
      },
    });

    return NextResponse.json({
      success: true,
      messageId: sentMessage.data.id,
      threadId: sentMessage.data.threadId,
    });
  } catch (err: any) {
    console.error("[Gmail POST]", err.message);

    // Manejo específico del error de Gmail
    if (err.message?.includes("insufficient authentication scopes")) {
      return NextResponse.json({
        error: "Permisos insuficientes. Por favor revoca y vuelve a vincular tu cuenta de Google."
      }, { status: 403 });
    }

    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
