/**
 * @file googleStore.ts
 * @description Store de UI para el ecosistema Google Workspace.
 *
 * Este store maneja EXCLUSIVAMENTE el estado de la interfaz:
 * - Estado de conexión (leído del servidor vía /api/auth/google/status)
 * - Caché local de eventos de Calendar y archivos de Drive
 * - Estado de carga y errores
 *
 * SEGURIDAD: Los tokens OAuth NUNCA se almacenan aquí.
 * Todas las operaciones reales se delegan a las API Routes del servidor.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Tipos ─────────────────────────────────────────────────────────────────────

/** Evento de Google Calendar (espejo del tipo de la API de Google) */
export interface CalendarEvent {
  id: string;
  titulo: string;
  descripcion: string;
  fechaInicio: string; // ISO
  fechaFin: string;    // ISO
  tipo: "visita" | "produccion" | "instalacion";
  refId?: string;
  usuarioNombre?: string;
  /** ID real del evento en Google Calendar (si ya fue sincronizado) */
  googleEventId?: string;
  /** URL del evento en Google Calendar */
  googleHtmlLink?: string;
}

/** Archivo o carpeta de Google Drive */
export interface DriveFile {
  id: string;
  nombre: string;
  tipo: "folder" | "doc" | "sheet" | "slide" | "pdf" | "image" | "other";
  mimeType?: string;
  parentFolderId: string | null;
  fechaCreacion: string;
  tamano?: string;
  url: string;
  /** URL del thumbnail (para imágenes) */
  thumbnailUrl?: string;
  /** Indica si este archivo existe realmente en Drive o es solo local */
  synced: boolean;
}

/** Registro de correo enviado por Gmail */
export interface GmailLog {
  id: string;
  destinatario: string;
  asunto: string;
  cuerpo: string;
  fecha: string;
  estado: "enviado" | "fallido" | "pendiente";
  /** ID real del mensaje en Gmail */
  googleMessageId?: string;
}

/** Tarea encolada para ejecutar cuando haya conexión */
export interface OfflineTask {
  id: string;
  tipo: "calendar" | "drive_folder" | "drive_file" | "gmail";
  payload: Record<string, unknown>;
  fechaCreacion: string;
}

// ─── Estado del Store ──────────────────────────────────────────────────────────

interface GoogleState {
  /** ¿Hay una sesión de Google activa en el servidor? */
  isConnected: boolean;
  /** Email de la cuenta conectada (leído del servidor, no del token) */
  connectedEmail: string | null;
  /** Nombre del usuario conectado */
  connectedName: string | null;
  /** URL del avatar del usuario de Google */
  connectedPicture: string | null;

  // Caché de datos de Google (se sincronizan con la API real)
  eventos: CalendarEvent[];
  archivosDrive: DriveFile[];
  gmailLog: GmailLog[];

  // Estados async
  isSyncing: boolean;
  isLoadingCalendar: boolean;
  isLoadingDrive: boolean;
  errorMessage: string | null;

  // Soporte Offline
  isOffline: boolean;
  offlineQueue: OfflineTask[];
  connectionType: string | null;
  effectiveType: string | null;

  // ─── Acciones de sesión ──────────────────────────────────────────────────────

  /** Verifica el estado de sesión con el servidor y actualiza el store */
  verificarSesion: () => Promise<void>;
  /** Inicia el flujo OAuth redirigiendo a Google (navega a /api/auth/google/login) */
  iniciarConexionGoogle: () => void;
  /** Cierra sesión de Google en el servidor */
  cerrarSesionGoogle: () => Promise<void>;

  // ─── Acciones de Calendar ────────────────────────────────────────────────────

  /** Carga eventos reales desde Google Calendar */
  cargarEventos: () => Promise<void>;
  /** Crea un evento real en Google Calendar (o lo encola si está offline) */
  crearEventoAgenda: (
    titulo: string,
    descripcion: string,
    fechaInicio: string,
    fechaFin: string,
    tipo: CalendarEvent["tipo"],
    refId?: string
  ) => Promise<void>;
  /** Elimina un evento de Google Calendar */
  eliminarEvento: (id: string) => Promise<void>;

  // ─── Acciones de Drive ───────────────────────────────────────────────────────

  /** Carga archivos de una carpeta de Drive */
  cargarArchivosDrive: (folderId: string) => Promise<DriveFile[]>;
  /** Crea una carpeta en Google Drive */
  crearCarpeta: (nombre: string, parentId?: string) => Promise<string | null>;
  /** Sube un archivo o foto a Google Drive */
  subirArchivo: (file: File, parentId?: string, nombre?: string) => Promise<DriveFile | null>;
  /** Elimina un archivo de Drive */
  eliminarArchivoDrive: (fileId: string) => Promise<void>;

  // ─── Acciones de Gmail ───────────────────────────────────────────────────────

  /** Envía un correo real vía Gmail API con soporte opcional de archivos adjuntos y cuerpo legible en historial */
  enviarCorreo: (
    to: string,
    subject: string,
    body: string,
    isHtml?: boolean,
    attachments?: Array<{ name: string; type: string; content: string }>,
    textPlainBody?: string
  ) => Promise<void>;

  // ─── Infraestructura ─────────────────────────────────────────────────────────

  setOfflineStatus: (offline: boolean) => void;
  setConnectionInfo: (type: string | null, effectiveType: string | null) => void;
  procesarColaOffline: () => Promise<void>;
  limpiarError: () => void;

  // ─── Mapeo y compatibilidad real ─────────────────────────────────────────────
  systemFolderIds: Record<string, string | null>;
  resolveFolderId: (folderId: string) => Promise<string>;
  crearCarpetaClienteDrive: (clienteId: string, clienteNombre: string) => Promise<string>;
  crearArchivoDrive: (nombre: string, tipo: string, parentId: string, tamano?: string) => Promise<DriveFile | null>;
  enviarNotificacionGmail: (to: string, subject: string, body: string) => Promise<void>;

  // ─── Tiempo Real (SSE y Webhooks) ────────────────────────────────────────────
  sseConnection: any;
  isRealtimeActive: boolean;
  iniciarSuscripcionTiempoReal: () => Promise<void>;
  detenerSuscripcionTiempoReal: () => void;

  // ─── Edición y Descargas de Archivos ──────────────────────────────────────────
  guardarArchivoEditado: (fileId: string, tipo: string, content: string) => Promise<boolean>;
  descargarArchivo: (fileId: string, tipo: string, nombre: string) => Promise<void>;

  // ─── Google Looker Studio ────────────────────────────────────────────────────
  lookerReportUrl: string | null;
  guardarLookerReportUrl: (url: string | null) => void;
  syncAllDataToSheets: (payload: {
    ventas: any[];
    nesting: any[];
    clientes: any[];
    inventario: any[];
    logistica: any[];
  }) => Promise<{ success: boolean; webViewLink?: string; error?: string }>;
}

// ─── Store ─────────────────────────────────────────────────────────────────────

export const useGoogleStore = create<GoogleState>()(
  persist(
    (set, get) => ({
      // Estado inicial
      isConnected: false,
      connectedEmail: null,
      connectedName: null,
      connectedPicture: null,
      eventos: [],
      archivosDrive: [],
      gmailLog: [],
      isSyncing: false,
      isLoadingCalendar: false,
      isLoadingDrive: false,
      errorMessage: null,
      isOffline: false,
      offlineQueue: [],
      connectionType: null,
      effectiveType: null,
      systemFolderIds: {
        "f-crm": null,
        "f-quotes": null,
        "f-delivery": null,
      },
      sseConnection: null,
      isRealtimeActive: false,
      lookerReportUrl: "https://datastudio.google.com/embed/reporting/1014500e-495d-4ed7-a371-33275d82dea3/page/CBF0F",

      // ─── Verificar sesión con el servidor ─────────────────────────────────────

      verificarSesion: async () => {
        try {
          const res = await fetch("/api/auth/google/status");
          if (!res.ok) return;
          const data = await res.json();
          set({
            isConnected: data.connected,
            connectedEmail: data.email ?? null,
            connectedName: data.name ?? null,
            connectedPicture: data.picture ?? null,
          });
          // Si hay sesión activa, cargar eventos automáticamente
          if (data.connected) {
            get().cargarEventos();
          }
        } catch (err) {
          console.error("[Google Store] Error verificando sesión:", err);
        }
      },

      // ─── Iniciar flujo OAuth (redirige al servidor) ────────────────────────────

      iniciarConexionGoogle: () => {
        // El servidor genera el state anti-CSRF y redirige a Google
        window.location.href = "/api/auth/google/login";
      },

      // ─── Cerrar sesión ─────────────────────────────────────────────────────────
      cerrarSesionGoogle: async () => {
        get().detenerSuscripcionTiempoReal();
        try {
          await fetch("/api/auth/google/logout", { method: "POST" });
          set({
            isConnected: false,
            connectedEmail: null,
            connectedName: null,
            connectedPicture: null,
            eventos: [],
            archivosDrive: [],
          });
        } catch (err) {
          console.error("[Google Store] Error al cerrar sesión:", err);
        }
      },

      // ─── Calendar: Cargar eventos reales ──────────────────────────────────────

      cargarEventos: async () => {
        if (!get().isConnected) return;
        set({ isLoadingCalendar: true });
        try {
          const now = new Date();
          const inicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
          const fin = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

          const res = await fetch(`/api/google/calendar?timeMin=${inicio}&timeMax=${fin}`);
          if (!res.ok) throw new Error("Error al cargar eventos de Calendar");

          const data = await res.json();
          const eventos: CalendarEvent[] = (data.events || []).map((evt: any) => ({
            id: evt.id,
            googleEventId: evt.id,
            titulo: evt.summary || "Sin título",
            descripcion: evt.description || "",
            fechaInicio: evt.start?.dateTime || evt.start?.date || "",
            fechaFin: evt.end?.dateTime || evt.end?.date || "",
            tipo: detectarTipoEvento(evt.summary, evt.description),
            googleHtmlLink: evt.htmlLink,
          }));

          set({ eventos, isLoadingCalendar: false });
        } catch (err: any) {
          set({ errorMessage: err.message, isLoadingCalendar: false });
        }
      },

      // ─── Calendar: Crear evento real ───────────────────────────────────────────

      crearEventoAgenda: async (titulo, descripcion, fechaInicio, fechaFin, tipo, refId) => {
        const { isOffline, isConnected } = get();

        // Crear evento local de inmediato para UI reactiva
        const eventoLocal: CalendarEvent = {
          id: `local-${Date.now()}`,
          titulo,
          descripcion,
          fechaInicio,
          fechaFin,
          tipo,
          refId,
          synced: false,
        } as CalendarEvent;

        set((state) => ({ eventos: [eventoLocal, ...state.eventos] }));

        // Si offline, encolar
        if (isOffline || !isConnected) {
          set((state) => ({
            offlineQueue: [...state.offlineQueue, {
              id: `task-${Date.now()}`,
              tipo: "calendar",
              payload: { titulo, descripcion, fechaInicio, fechaFin, tipo, refId },
              fechaCreacion: new Date().toISOString(),
            }],
          }));
          return;
        }

        // Sincronizar con Google Calendar
        try {
          const res = await fetch("/api/google/calendar", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ titulo, descripcion, fechaInicio, fechaFin, tipo }),
          });

          if (!res.ok) throw new Error("Error al crear evento en Google Calendar");
          const data = await res.json();

          // Actualizar el evento local con los datos reales de Google
          set((state) => ({
            eventos: state.eventos.map((e) =>
              e.id === eventoLocal.id
                ? { ...e, googleEventId: data.eventId, googleHtmlLink: data.htmlLink, id: data.eventId }
                : e
            ),
          }));
        } catch (err: any) {
          set({ errorMessage: `Error Calendar: ${err.message}` });
        }
      },

      // ─── Calendar: Eliminar evento ─────────────────────────────────────────────

      eliminarEvento: async (id) => {
        const evento = get().eventos.find((e) => e.id === id);
        // Eliminar localmente de inmediato
        set((state) => ({ eventos: state.eventos.filter((e) => e.id !== id) }));

        // Si tiene googleEventId, eliminar de Google Calendar
        const googleId = evento?.googleEventId || id;
        if (!googleId.startsWith("local-") && get().isConnected) {
          try {
            await fetch(`/api/google/calendar?eventId=${googleId}`, { method: "DELETE" });
          } catch (err: any) {
            set({ errorMessage: `Error al eliminar evento: ${err.message}` });
          }
        }
      },

      // ─── Drive: Cargar archivos de una carpeta ─────────────────────────────────

      cargarArchivosDrive: async (folderId: string): Promise<DriveFile[]> => {
        if (!get().isConnected) return [];
        set({ isLoadingDrive: true });
        try {
          const realFolderId = await get().resolveFolderId(folderId);
          const res = await fetch(`/api/google/drive?folderId=${realFolderId}`);
          if (!res.ok) throw new Error("Error al cargar archivos de Drive");

          const data = await res.json();
          const archivos: DriveFile[] = (data.files || []).map((f: any) => ({
            id: f.id,
            nombre: f.name,
            tipo: mimeTypeToTipo(f.mimeType),
            mimeType: f.mimeType,
            parentFolderId: folderId,
            fechaCreacion: f.createdTime || new Date().toISOString(),
            tamano: f.size ? formatBytes(parseInt(f.size)) : undefined,
            url: f.webViewLink || "#",
            thumbnailUrl: f.thumbnailLink || undefined,
            synced: true,
          }));

          // Actualizar caché local (fusionar, no reemplazar todo)
          set((state) => {
            const otrosArchivos = state.archivosDrive.filter((a) => a.parentFolderId !== folderId);
            return { archivosDrive: [...otrosArchivos, ...archivos], isLoadingDrive: false };
          });

          return archivos;
        } catch (err: any) {
          set({ errorMessage: err.message, isLoadingDrive: false });
          return [];
        }
      },

      // ─── Drive: Crear carpeta ──────────────────────────────────────────────────

      crearCarpeta: async (nombre, parentId): Promise<string | null> => {
        if (!get().isConnected) return null;
        try {
          const realParentId = parentId ? await get().resolveFolderId(parentId) : undefined;
          const res = await fetch("/api/google/drive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create_folder", name: nombre, parentId: realParentId }),
          });

          if (!res.ok) throw new Error("Error al crear carpeta en Drive");
          const data = await res.json();

          // Agregar al caché local
          const nuevaCarpeta: DriveFile = {
            id: data.folderId,
            nombre,
            tipo: "folder",
            parentFolderId: parentId || null,
            fechaCreacion: new Date().toISOString(),
            url: data.webViewLink || "#",
            synced: true,
          };
          set((state) => ({ archivosDrive: [...state.archivosDrive, nuevaCarpeta] }));

          return data.folderId;
        } catch (err: any) {
          set({ errorMessage: err.message });
          return null;
        }
      },

      // ─── Drive: Subir archivo/foto ─────────────────────────────────────────────

      subirArchivo: async (file, parentId, nombre): Promise<DriveFile | null> => {
        if (!get().isConnected) return null;
        try {
          const realParentId = parentId ? await get().resolveFolderId(parentId) : undefined;
          const formData = new FormData();
          formData.append("file", file);
          if (realParentId) formData.append("parentId", realParentId);
          if (nombre) formData.append("name", nombre);

          const res = await fetch("/api/google/drive", {
            method: "POST",
            body: formData, // Sin Content-Type, el navegador lo pone con el boundary
          });

          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Error al subir archivo");
          }

          const data = await res.json();

          const nuevoArchivo: DriveFile = {
            id: data.fileId,
            nombre: data.name || file.name,
            tipo: mimeTypeToTipo(data.mimeType || file.type),
            mimeType: data.mimeType || file.type,
            parentFolderId: parentId || null,
            fechaCreacion: new Date().toISOString(),
            tamano: data.size ? formatBytes(parseInt(data.size)) : undefined,
            url: data.webViewLink || "#",
            thumbnailUrl: data.thumbnailLink || undefined,
            synced: true,
          };

          set((state) => ({ archivosDrive: [...state.archivosDrive, nuevoArchivo] }));
          return nuevoArchivo;
        } catch (err: any) {
          set({ errorMessage: err.message });
          return null;
        }
      },

      // ─── Drive: Eliminar archivo ───────────────────────────────────────────────

      eliminarArchivoDrive: async (fileId) => {
        // Eliminar del caché local inmediatamente
        set((state) => ({
          archivosDrive: state.archivosDrive.filter((a) => a.id !== fileId),
        }));

        if (!get().isConnected) return;
        try {
          await fetch(`/api/google/drive?fileId=${fileId}`, { method: "DELETE" });
        } catch (err: any) {
          set({ errorMessage: err.message });
        }
      },

      // ─── Gmail: Enviar correo real ─────────────────────────────────────────────

      enviarCorreo: async (to, subject, body, isHtml = false, attachments = [], textPlainBody) => {
        const { isOffline, isConnected } = get();

        // Registro local inmediato
        const logEntry: GmailLog = {
          id: `msg-${Date.now()}`,
          destinatario: to,
          asunto: subject,
          cuerpo: textPlainBody || body,
          fecha: new Date().toISOString(),
          estado: isOffline || !isConnected ? "pendiente" : "enviado",
        };
        set((state) => ({ gmailLog: [logEntry, ...state.gmailLog] }));

        if (isOffline || !isConnected) {
          set((state) => ({
            offlineQueue: [...state.offlineQueue, {
              id: `task-${Date.now()}`,
              tipo: "gmail",
              payload: { to, subject, body, isHtml, attachments, textPlainBody, logId: logEntry.id },
              fechaCreacion: new Date().toISOString(),
            }],
          }));
          return;
        }

        try {
          const res = await fetch("/api/google/gmail", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ to, subject, body, isHtml, attachments }),
          });

          if (!res.ok) {
            const errData = await res.json();
            throw new Error(errData.error || "Error al enviar correo");
          }

          const data = await res.json();
          // Actualizar el log con el ID real de Gmail
          set((state) => ({
            gmailLog: state.gmailLog.map((m) =>
              m.id === logEntry.id
                ? { ...m, estado: "enviado", googleMessageId: data.messageId }
                : m
            ),
          }));
        } catch (err: any) {
          set((state) => ({
            gmailLog: state.gmailLog.map((m) =>
              m.id === logEntry.id ? { ...m, estado: "fallido" } : m
            ),
            errorMessage: err.message,
          }));
        }
      },

      // ─── Procesado de cola offline ─────────────────────────────────────────────

      procesarColaOffline: async () => {
        const { offlineQueue, isOffline } = get();
        if (isOffline || offlineQueue.length === 0) return;

        set({ isSyncing: true });
        const { crearEventoAgenda, enviarCorreo, crearCarpeta } = get();

        for (const task of offlineQueue) {
          try {
            if (task.tipo === "calendar") {
              const p = task.payload as any;
              await crearEventoAgenda(p.titulo, p.descripcion, p.fechaInicio, p.fechaFin, p.tipo, p.refId);
            } else if (task.tipo === "gmail") {
              const p = task.payload as any;
              await enviarCorreo(p.to, p.subject, p.body, p.isHtml, p.attachments, p.textPlainBody);
            } else if (task.tipo === "drive_folder") {
              const p = task.payload as any;
              await crearCarpeta(p.nombre, p.parentId);
            }
          } catch (err) {
            console.warn("[Offline Queue] Error procesando tarea:", task.id, err);
          }
        }

        set({ offlineQueue: [], isSyncing: false });
      },

      // ─── Infraestructura ──────────────────────────────────────────────────────

      setOfflineStatus: (offline) => {
        set({ isOffline: offline });
        if (!offline) get().procesarColaOffline();
      },
      setConnectionInfo: (type, effectiveType) => {
        set({ connectionType: type, effectiveType });
      },
      limpiarError: () => set({ errorMessage: null }),

      // ─── Mapeo y compatibilidad real ─────────────────────────────────────────────

      resolveFolderId: async (folderId: string): Promise<string> => {
        if (folderId === "root" || folderId === "f-root") {
          return "root";
        }

        if (folderId === "f-crm" || folderId === "f-quotes" || folderId === "f-delivery") {
          const state = get();
          const mappedId = state.systemFolderIds[folderId];
          if (mappedId) return mappedId;

          let folderName = "Clientes CRM";
          if (folderId === "f-quotes") folderName = "Cotizaciones & Nesting";
          if (folderId === "f-delivery") folderName = "Entregas & Logistica";

          try {
            // Search in Google Drive root
            const searchRes = await fetch(`/api/google/drive?folderId=root&q=${encodeURIComponent(folderName)}`);
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const found = searchData.files?.find(
                (f: any) => f.mimeType === "application/vnd.google-apps.folder" && f.name === folderName
              );
              if (found) {
                set((s) => ({
                  systemFolderIds: { ...s.systemFolderIds, [folderId]: found.id }
                }));
                return found.id;
              }
            }

            // Create if not found
            const createRes = await fetch("/api/google/drive", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "create_folder", name: folderName, parentId: "root" }),
            });
            if (createRes.ok) {
              const createData = await createRes.json();
              set((s) => ({
                systemFolderIds: { ...s.systemFolderIds, [folderId]: createData.folderId }
              }));
              return createData.folderId;
            }
          } catch (e) {
            console.error(`Error resolving folder ${folderId}:`, e);
          }
        }

        return folderId;
      },

      crearCarpetaClienteDrive: async (clienteId, clienteNombre): Promise<string> => {
        if (!get().isConnected) return `local-folder-${clienteId}`;
        try {
          const parentRealId = await get().resolveFolderId("f-crm");
          const searchRes = await fetch(`/api/google/drive?folderId=${parentRealId}&q=${encodeURIComponent(clienteNombre)}`);
          if (searchRes.ok) {
            const searchData = await searchRes.json();
            const found = searchData.files?.find(
              (f: any) => f.mimeType === "application/vnd.google-apps.folder" && f.name === clienteNombre
            );
            if (found) {
              return found.id;
            }
          }

          const res = await fetch("/api/google/drive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create_folder", name: clienteNombre, parentId: parentRealId }),
          });
          if (!res.ok) throw new Error("Error al crear carpeta de cliente");
          const data = await res.json();

          const nuevaCarpeta: DriveFile = {
            id: data.folderId,
            nombre: clienteNombre,
            tipo: "folder",
            parentFolderId: "f-crm",
            fechaCreacion: new Date().toISOString(),
            url: data.webViewLink || "#",
            synced: true,
          };
          set((state) => ({ archivosDrive: [...state.archivosDrive, nuevaCarpeta] }));

          return data.folderId;
        } catch (err: any) {
          console.error("crearCarpetaClienteDrive error:", err);
          set({ errorMessage: err.message });
          return `local-folder-${clienteId}`;
        }
      },

      crearArchivoDrive: async (nombre, tipo, parentId, tamano): Promise<DriveFile | null> => {
        if (!get().isConnected) return null;
        try {
          const realParentId = await get().resolveFolderId(parentId);
          
          let mimeType = "application/octet-stream";
          if (tipo === "sheet") mimeType = "application/vnd.google-apps.spreadsheet";
          else if (tipo === "doc") mimeType = "application/vnd.google-apps.document";
          else if (tipo === "slide") mimeType = "application/vnd.google-apps.presentation";
          else if (tipo === "pdf") mimeType = "application/pdf";

          const res = await fetch("/api/google/drive", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create_file", name: nombre, parentId: realParentId, mimeType }),
          });

          if (!res.ok) throw new Error("Error al crear archivo en Drive");
          const data = await res.json();

          const nuevoArchivo: DriveFile = {
            id: data.fileId,
            nombre: data.name,
            tipo: tipo as DriveFile["tipo"],
            mimeType: data.mimeType,
            parentFolderId: parentId,
            fechaCreacion: new Date().toISOString(),
            tamano: tamano || "0 B",
            url: data.webViewLink || "#",
            synced: true,
          };

          set((state) => ({ archivosDrive: [...state.archivosDrive, nuevoArchivo] }));
          return nuevoArchivo;
        } catch (err: any) {
          console.error("crearArchivoDrive error:", err);
          set({ errorMessage: err.message });
          return null;
        }
      },

      enviarNotificacionGmail: async (to, subject, body): Promise<void> => {
        return get().enviarCorreo(to, subject, body, false);
      },

      // ─── Tiempo Real (SSE y Webhooks) ────────────────────────────────────────────

      iniciarSuscripcionTiempoReal: async () => {
        if (typeof window === "undefined" || !get().isConnected) return;

        // Evitar duplicaciones de conexiones
        if (get().sseConnection || get().isRealtimeActive) {
          return;
        }

        console.log("[Google Store] Iniciando canal en tiempo real (SSE + Polling Fallback)...");

        try {
          // 1. Intentar registrar el Webhook (Google Watch) en el servidor.
          // Si falla (por ejemplo en localhost sin túnel), el endpoint responderá success: false con detalles.
          const watchRes = await fetch("/api/google/calendar/watch", { method: "POST" });
          const watchData = await watchRes.json().catch(() => ({ success: false }));

          if (watchData.success) {
            console.log("[Google Store] Webhook de Google Calendar registrado de forma activa en el servidor.");
          } else {
            console.warn(
              "[Google Store] Webhook inactivo (desarrollo local o sin URL pública). Fallback a polling activo habilitado.",
              watchData.error || ""
            );
          }

          // 2. Establecer la conexión SSE (Server Sent Events) para actualizaciones en vivo
          const es = new EventSource("/api/google/calendar/stream");
          set({ sseConnection: es, isRealtimeActive: true });

          es.addEventListener("calendar_update", () => {
            console.log("[Google Store] ¡Notificación en tiempo real recibida! Recargando agenda...");
            get().cargarEventos();
          });

          es.addEventListener("connected", () => {
            console.log("[Google Store] Conexión en tiempo real SSE enlazada.");
          });

          es.onerror = () => {
            console.warn("[Google Store] Error en la conexión SSE. Reconectando en 10 segundos...");
            es.close();
            set({ sseConnection: null, isRealtimeActive: false });

            // Intento de reconexión tras 10 segundos
            setTimeout(() => {
              if (get().isConnected && !get().isRealtimeActive) {
                get().iniciarSuscripcionTiempoReal();
              }
            }, 10000);
          };

          // 3. Polling de resguardo (fallback inteligente)
          // Si estamos en localhost o el webhook falla, el polling refresca la UI en segundo plano.
          // Solo opera si el usuario tiene la pestaña activa para evitar llamadas innecesarias.
          if (typeof window !== "undefined") {
            if ((window as any)._googleCalendarPollingInterval) {
              clearInterval((window as any)._googleCalendarPollingInterval);
            }

            (window as any)._googleCalendarPollingInterval = setInterval(() => {
              if (document.visibilityState === "visible" && get().isConnected && !get().isOffline) {
                console.log("[Google Store] Polling de resguardo: Sincronizando eventos...");
                get().cargarEventos();
              }
            }, 45000); // 45 segundos
          }

        } catch (err: any) {
          console.error("[Google Store] Error al configurar la sincronización de tiempo real:", err);
        }
      },

      detenerSuscripcionTiempoReal: () => {
        const { sseConnection } = get();
        if (sseConnection) {
          try {
            sseConnection.close();
          } catch (e) {}
          console.log("[Google Store] Conexión SSE de tiempo real detenida.");
        }

        if (typeof window !== "undefined" && (window as any)._googleCalendarPollingInterval) {
          clearInterval((window as any)._googleCalendarPollingInterval);
          delete (window as any)._googleCalendarPollingInterval;
          console.log("[Google Store] Polling de resguardo detenido.");
        }

        set({ sseConnection: null, isRealtimeActive: false });
      },

      // ─── Edición y Descargas de Archivos ──────────────────────────────────────────

      guardarArchivoEditado: async (fileId, tipo, content) => {
        if (!get().isConnected) return false;
        set({ isSyncing: true });
        try {
          const res = await fetch("/api/google/drive/edit", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ fileId, tipo, content }),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Error al guardar cambios en Google Drive");
          }

          set({ isSyncing: false });
          return true;
        } catch (err: any) {
          console.error("guardarArchivoEditado error:", err);
          set({ errorMessage: err.message, isSyncing: false });
          return false;
        }
      },

      descargarArchivo: async (fileId, tipo, nombre) => {
        if (!get().isConnected) return;
        try {
          // Gatillar descarga nativa en el navegador
          window.location.href = `/api/google/drive/download?fileId=${fileId}`;
        } catch (err: any) {
          console.error("descargarArchivo error:", err);
          set({ errorMessage: err.message });
        }
      },

      guardarLookerReportUrl: (url) => {
        set({ lookerReportUrl: url });
      },

      syncAllDataToSheets: async (payload) => {
        if (!get().isConnected) {
          return { success: false, error: "No conectado a Google Workspace." };
        }
        set({ isSyncing: true });
        try {
          const res = await fetch("/api/google/sheets/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.error || "Fallo al sincronizar con Google Sheets");
          }

          const data = await res.json();
          set({ isSyncing: false });
          return { success: true, webViewLink: data.webViewLink };
        } catch (err: any) {
          console.error("[Google Store] syncAllDataToSheets error:", err);
          set({ errorMessage: err.message, isSyncing: false });
          return { success: false, error: err.message };
        }
      },
    }),
    {
      name: "grupo-arca-google-workspace",
      // Solo persistir el caché de eventos/archivos, logs y mapeos
      partialize: (state) => ({
        eventos: state.eventos,
        gmailLog: state.gmailLog,
        offlineQueue: state.offlineQueue,
        systemFolderIds: state.systemFolderIds,
        lookerReportUrl: state.lookerReportUrl,
      }),
    }
  )
);

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Detecta el tipo de evento basándose en el título y descripción */
function detectarTipoEvento(
  summary?: string,
  description?: string
): CalendarEvent["tipo"] {
  const text = `${summary || ""} ${description || ""}`.toLowerCase();
  if (text.includes("instalaci") || text.includes("entrega") || text.includes("[instalacion]")) {
    return "instalacion";
  }
  if (text.includes("producci") || text.includes("taller") || text.includes("corte") || text.includes("[produccion]")) {
    return "produccion";
  }
  return "visita"; // Default
}

/** Convierte mimeType de Google a tipo local */
function mimeTypeToTipo(mimeType?: string): DriveFile["tipo"] {
  if (!mimeType) return "other";
  if (mimeType === "application/vnd.google-apps.folder") return "folder";
  if (mimeType === "application/vnd.google-apps.document") return "doc";
  if (mimeType === "application/vnd.google-apps.spreadsheet") return "sheet";
  if (mimeType === "application/vnd.google-apps.presentation") return "slide";
  if (mimeType === "application/pdf") return "pdf";
  if (mimeType.startsWith("image/")) return "image";
  return "other";
}

/** Formatea bytes a string legible */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
