/**
 * Script de prueba para simular una notificación push de Google Calendar en el Webhook.
 * 
 * Uso: node scripts/test-webhook.js [email]
 */

const http = require("http");

const email = process.argv[2] || "brenda.fuentes@grupoarca.mx";

console.log(`\n=== Simulador de Notificación Google Calendar Webhook ===`);
console.log(`Objetivo: Enviar alerta de cambio en agenda para el usuario: ${email}`);

const payload = ""; // Las notificaciones de Google son peticiones POST vacías

const options = {
  hostname: "localhost",
  port: 3000,
  path: "/api/google/webhook",
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-Goog-Channel-ID": `test-channel-${Date.now()}`,
    "X-Goog-Resource-ID": "test-resource-calendar-id",
    "X-Goog-Resource-State": "exists",
    "X-Goog-Channel-Token": `email=${email}`,
    "Content-Length": Buffer.byteLength(payload)
  }
};

const req = http.request(options, (res) => {
  console.log(`Respuesta del servidor: Código ${res.statusCode}`);
  let responseData = "";
  
  res.on("data", (chunk) => {
    responseData += chunk;
  });
  
  res.on("end", () => {
    console.log(`Cuerpo de respuesta: "${responseData}"`);
    console.log(`========================================================`);
    if (res.statusCode === 200) {
      console.log(`✓ ÉXITO: Webhook invocado correctamente.`);
      console.log(`  Si tu navegador está conectado a Google y en la pestaña de`);
      console.log(`  calendario, deberías ver la agenda refrescarse sola.`);
    } else {
      console.log(`❌ ERROR: El servidor devolvió código de error.`);
    }
  });
});

req.on("error", (e) => {
  console.error(`❌ ERROR: No se pudo conectar al servidor local: ${e.message}`);
  console.error(`  ¿Aseguraste que la app Next.js está corriendo en http://localhost:3000?`);
});

req.write(payload);
req.end();
