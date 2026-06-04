import React, { useState, useMemo, useRef, useEffect } from "react";
import { useGoogleStore, CalendarEvent, DriveFile, GmailLog } from "../googleStore";
import { useAuthStore } from "../../auth/authStore";
import { useConfigStore } from "@/features/config/configStore";
import { useCRMStore } from "@/features/crm/crmStore";
import { useQuotesStore } from "@/features/quotes/quotesStore";
import { useWorkshopStore } from "@/features/workshop/workshopStore";
import { useDeliveriesStore } from "@/features/deliveries/deliveriesStore";
import { 
  Cloud, Calendar as CalendarIcon, Folder, FileText, 
  Mail, Settings, RefreshCw, Check, AlertCircle, Plus, 
  Trash2, Clock, User, ShieldCheck, Link2, LayoutGrid, 
  ChevronRight, ArrowLeft, Send, Sparkles, FileSpreadsheet, 
  Presentation, FileImage, FileDown, Search, FolderPlus,
  Wifi, WifiOff, Eye, Upload, ExternalLink, LogOut, Paperclip
} from "lucide-react";

export default function GoogleWorkspaceHub() {
  const {
    isConnected, connectedEmail, connectedName, connectedPicture,
    eventos, archivosDrive, gmailLog, isSyncing, isLoadingCalendar, isLoadingDrive, errorMessage,
    isOffline, offlineQueue, connectionType, effectiveType, procesarColaOffline,
    verificarSesion, iniciarConexionGoogle, cerrarSesionGoogle,
    cargarEventos, crearEventoAgenda, eliminarEvento,
    cargarArchivosDrive, crearCarpeta, subirArchivo, eliminarArchivoDrive,
    enviarCorreo, limpiarError, crearArchivoDrive,
    iniciarSuscripcionTiempoReal, detenerSuscripcionTiempoReal, isRealtimeActive,
    guardarArchivoEditado, descargarArchivo, lookerReportUrl, guardarLookerReportUrl,
    syncAllDataToSheets
  } = useGoogleStore();

  // Verificar sesión al montar el componente y cuando la URL tiene ?google_connected=true
  useEffect(() => {
    verificarSesion();
    const params = new URLSearchParams(window.location.search);
    if (params.get('google_connected') === 'true') {
      // Limpiar el parámetro de la URL sin recargar
      window.history.replaceState({}, '', window.location.pathname);
    }
    const googleError = params.get('google_error');
    if (googleError) {
      window.history.replaceState({}, '', window.location.pathname);
      console.warn('[Google OAuth Error]', googleError);
    }
  }, []);
  // Control de conexión en tiempo real del ecosistema Google
  useEffect(() => {
    if (isConnected) {
      iniciarSuscripcionTiempoReal();
    } else {
      detenerSuscripcionTiempoReal();
    }
  }, [isConnected, iniciarSuscripcionTiempoReal, detenerSuscripcionTiempoReal]);
  // Estado local para subida de archivos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  // Carpeta raíz de Drive actual
  const [driveFolderId, setDriveFolderId] = useState<string | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);

  const { usuarioActivo } = useAuthStore();

  // Gestión de Pestañas
  const [activeTab, setActiveTab] = useState<"oauth" | "calendar" | "drive" | "gmail" | "looker">("oauth");

  // Estados Calendario
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [evtTitle, setEvtTitle] = useState("");
  const [evtDesc, setEvtDesc] = useState("");
  const [evtDate, setEvtDate] = useState(new Date().toISOString().split("T")[0]);
  const [evtStartHour, setEvtStartHour] = useState("09:00");
  const [evtEndHour, setEvtEndHour] = useState("10:00");
  const [evtType, setEvtType] = useState<CalendarEvent["tipo"]>("visita");

  // Estados Drive
  const [currentFolderId, setCurrentFolderId] = useState<string | null>("f-root");
  const [driveSearch, setDriveSearch] = useState("");
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Estados Gmail
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [mailTo, setMailTo] = useState("");
  const [mailSubject, setMailSubject] = useState("");
  const [mailBody, setMailBody] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderRole, setSenderRole] = useState("Asesor Comercial & Cotizaciones");
  const [selectedAttachments, setSelectedAttachments] = useState<Array<{ name: string; type: string; content: string; size: number }>>([]);
  
  const [inputLookerUrl, setInputLookerUrl] = useState(lookerReportUrl || "");
  const [activeStep, setActiveStep] = useState<number | null>(0);
  
  // Sincronizar input cuando cambia la URL persistida
  useEffect(() => {
    setInputLookerUrl(lookerReportUrl || "");
  }, [lookerReportUrl]);

  // Inicializar nombre del remitente del correo
  useEffect(() => {
    if (connectedName) {
      setSenderName(connectedName);
    } else if (usuarioActivo?.nombre) {
      setSenderName(usuarioActivo.nombre);
    }
  }, [connectedName, usuarioActivo]);

  // Visor de archivos en Drive
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null);

  // Estados para la Edición de Archivos en el Visor
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState("");
  const [nestingRows, setNestingRows] = useState<{ cod: string, largo: string, cortes: string, tramos: string, desperdicio: string, eficiencia: string }[]>([]);

  const { empresa } = useConfigStore();

  // Inicializar contenido del editor cuando se selecciona un archivo para previsualizar
  useEffect(() => {
    if (previewFile) {
      setIsEditing(false);
      if (previewFile.tipo === "doc") {
        setEditedText(`CONTRATO DE SUMINISTRO E INSTALACIÓN DE VIDRIO Y ALUMINIO

Conste por el presente documento el Contrato de Prestación de Servicios de Fabricación y Colocación que celebran, de una parte, ${empresa.razonSocial} en su carácter de Proveedor Certificado (en lo sucesivo "El Contratista"), y de la otra parte, el Cliente cuyos datos se especifican en el Folio Operativo correspondiente de fecha ${new Date(previewFile.fechaCreacion).toLocaleDateString("es-MX")}.

DECLARACIONES:
I. DECLARA EL CONTRATISTA: Ser una persona moral legalmente constituida conforme a las leyes mexicanas, con domicilio comercial en ${empresa.calle} ${empresa.numero}, ${empresa.colonia}, con capacidad técnica y económica para cumplir con los requerimientos de la obra.

II. DECLARA EL CLIENTE: Que requiere la fabricación e instalación de sistemas de cancelería de vidrio templado, perfiles de aluminio y domos de acuerdo con el desglose técnico y cálculos estructurales previamente validados en el sistema.

CLÁUSULAS:
PRIMERA: OBJETO. El contratista se obliga a ejecutar bajo su entera responsabilidad, utilizando personal especializado y perfiles certificados del proveedor ${empresa.proveedorCertificado}, los trabajos de cancelería descritos en los planos y especificaciones anexas.

SEGUNDA: PLAZO DE ENTREGA. Las partes convienen en que los trabajos descritos se entregarán conforme al cronograma de obra agendado dinámicamente en el módulo de logística y entregas de la suite.

---------------------------------------------------------
Por el Contratista                     Por el Cliente`);
      } else if (previewFile.tipo === "sheet") {
        setNestingRows([
          { cod: "ALU-3-NAT", largo: "6.10 m", cortes: "8 x [1.20m], 4 x [0.90m]", tramos: "3", desperdicio: "450 mm (2.4%)", eficiencia: "97.6%" },
          { cod: "ALU-BOQ-BR", largo: "6.10 m", cortes: "6 x [1.50m], 2 x [1.10m]", tramos: "2", desperdicio: "300 mm (1.6%)", eficiencia: "98.4%" }
        ]);
      } else if (previewFile.tipo === "slide") {
        setEditedText(`Presentación Corporativa de Obras
Grupo Arca 2.0 Suite
Diapositivas comerciales preparadas para el cliente con fotografías de referencias de pérgolas y canceles instalados por ${empresa.nombreComercial}.

Servicios de Instalación:
- Cancelería de Aluminio de Alta Gama
- Vidrio Templado y Sistemas de Fachada Suspendida
- Domo Estructural y Cancelería Residencial

Garantía de Calidad:
Todos nuestros perfiles y accesorios cumplen con las normas nacionales e internacionales más estrictas del mercado.`);
      }
    }
  }, [previewFile, empresa]);
  const esAdmin = usuarioActivo.rol === "admin";
  const clientes = useCRMStore(state => state.clientes);
  const cotizaciones = useQuotesStore(state => state.cotizaciones);

  /**
   * Recopila todos los datos relevantes del negocio (Ventas, Nesting, CRM, Inventario, Logística)
   * desde los stores de Zustand del cliente y los sincroniza en la hoja de cálculo
   * unificada de Google Drive.
   *
   * @param {boolean} [silencioso=false] Si es verdadero, evita lanzar alertas en la UI
   * y se ejecuta de forma transparente en segundo plano.
   * @returns {Promise<void>}
   */
  const handleSyncAllData = async (silencioso: boolean = false) => {
    if (!isConnected) return;
    try {
      // 1. Obtener estados de los stores
      const sucursales = useConfigStore.getState().sucursales || [];
      
      /** Helper para obtener el nombre de una sucursal por su ID */
      const getSucursalNombre = (id: string): string => {
        const suc = sucursales.find((s) => s.id === id);
        return suc ? suc.nombre : "Matriz Central";
      };

      // CRM Clientes
      const crmClientes = useCRMStore.getState().clientes || [];
      const clientesMapped = crmClientes.map((c) => ({
        id: c.id,
        nombre: c.nombre,
        email: c.email || "",
        estado: c.estatus || "activo",
        sucursal: getSucursalNombre(c.sucursalId)
      }));

      // Cotizaciones (Ventas) e Inventario
      const quotesStore = useQuotesStore.getState();
      const cotizacionesData = quotesStore.cotizaciones || [];
      const materiales = quotesStore.materiales || [];

      // Ventas Mapped
      const ventasMapped = cotizacionesData.map((q) => {
        const clienteAsociado = crmClientes.find((c) => c.id === q.clienteId);
        const tipoCliente = clienteAsociado 
          ? (clienteAsociado.estatus === "activo" ? "Cliente Recurrente" : "Prospecto") 
          : "Particular";

        // Calcular eficiencia de nesting promedio para esta cotización
        let eficienciaAcumulada = 0;
        let conceptosConEficiencia = 0;
        q.conceptos?.forEach((c) => {
          if (c.nestingLinear?.porcentajeEficienciaGlobal !== undefined) {
            eficienciaAcumulada += c.nestingLinear.porcentajeEficienciaGlobal;
            conceptosConEficiencia++;
          }
          if (c.nestingGlass?.porcentajeEficienciaGlobal !== undefined) {
            eficienciaAcumulada += c.nestingGlass.porcentajeEficienciaGlobal;
            conceptosConEficiencia++;
          }
        });
        const eficienciaPromedio = conceptosConEficiencia > 0 
          ? `${(eficienciaAcumulada / conceptosConEficiencia).toFixed(1)}%` 
          : "N/A";

        return {
          fecha: q.createdAt ? q.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
          folio: q.folio,
          cliente: q.clienteNombre,
          tipoCliente,
          sucursal: getSucursalNombre(q.sucursalId),
          vendedor: q.vendedorNombre || "Vendedor General",
          subtotal: q.subtotal || 0,
          total: q.total || 0,
          estado: q.estatus || "borrador",
          eficiencia: eficienciaPromedio
        };
      });

      // Inventario Mapped
      const inventarioMapped = materiales.map((m) => ({
        codigo: m.codigo,
        nombre: m.descripcion,
        stockActual: m.stockActual || 0,
        stockMinimo: m.stockMinimo || 0,
        costo: m.costoBase || 0,
        valorTotal: (m.stockActual || 0) * (m.costoBase || 0)
      }));

      // Nesting Mapped (de Taller y sus cotizaciones asociadas)
      const workshopStore = useWorkshopStore.getState();
      const ordenesTaller = workshopStore.ordenesTaller || [];
      const nestingMapped: any[] = [];

      ordenesTaller.forEach((ot) => {
        const q = cotizacionesData.find((x) => x.id === ot.cotizacionId);
        if (!q) return;

        q.conceptos?.forEach((c) => {
          if (c.nestingLinear) {
            const mat = materiales.find((m) => m.id === c.materialId);
            nestingMapped.push({
              fecha: ot.createdAt ? ot.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
              ordenId: ot.folio,
              sucursal: getSucursalNombre(ot.sucursalId),
              materialTipo: "Aluminio",
              codigoMaterial: mat ? mat.codigo : (c.materialId || "N/A"),
              medidaStock: mat ? `${(mat.dimensionX / 1000).toFixed(2)} m` : "6.10 m",
              metodo: "Lineal (1D)",
              piezasCargadas: c.nestingLinear.barrasProcesadas?.reduce((acc: number, b: any) => acc + (b.cortes?.length || 0), 0) || c.cantidad,
              fancyNesting: true,
              cantidadStockUsado: c.nestingLinear.barrasTotalesRequeridas || 1,
              eficienciaGlobal: c.nestingLinear.porcentajeEficienciaGlobal ? `${c.nestingLinear.porcentajeEficienciaGlobal}%` : "100%"
            });
          }
          if (c.nestingGlass) {
            const mat = materiales.find((m) => m.id === c.vidrioMaterialId);
            const planchas = c.nestingGlass.planchasTotalesRequeridas || 1;
            
            // Estimar la eficiencia basándose en área de cortes vs área de planchas usadas
            const areaCorte = c.nestingGlass.areaTotalCorte || 0;
            const areaTotalPlanchas = planchas * (mat ? mat.dimensionX * (mat.dimensionY || 2000) : 6000000);
            const pctGlassEficiencia = areaTotalPlanchas > 0 ? (areaCorte / areaTotalPlanchas) * 100 : 100;

            nestingMapped.push({
              fecha: ot.createdAt ? ot.createdAt.split("T")[0] : new Date().toISOString().split("T")[0],
              ordenId: ot.folio,
              sucursal: getSucursalNombre(ot.sucursalId),
              materialTipo: "Vidrio",
              codigoMaterial: mat ? mat.codigo : (c.vidrioMaterialId || "N/A"),
              medidaStock: mat ? `${(mat.dimensionX / 1000).toFixed(2)} x ${(mat.dimensionY ? mat.dimensionY / 1000 : 2.0).toFixed(2)} m` : "3.00 x 2.00 m",
              metodo: "Guillotina (2D)",
              piezasCargadas: c.cantidad,
              cantidadStockUsado: planchas,
              eficienciaGlobal: `${pctGlassEficiencia.toFixed(1)}%`
            });
          }
        });
      });

      // Logística Mapped
      const deliveriesStore = useDeliveriesStore.getState();
      const ordenesEntrega = deliveriesStore.ordenesEntrega || [];
      const logisticaMapped = ordenesEntrega.map((l) => ({
        ordenId: l.folioTaller,
        sucursal: getSucursalNombre(l.sucursalId),
        estado: l.estado || "programado",
        conductor: l.choferAsignado || "No Asignado",
        fechaProgramada: l.fechaProgramada || ""
      }));

      // 2. Ejecutar la sincronización
      const result = await syncAllDataToSheets({
        ventas: ventasMapped,
        nesting: nestingMapped,
        clientes: clientesMapped,
        inventario: inventarioMapped,
        logistica: logisticaMapped
      });

      if (result.success) {
        if (!silencioso) {
          alert("Sincronización completada con éxito. Los reportes de Data Studio están al día.");
        }
        console.log("[Google Sync] Sincronización automática de datos completada:", result.webViewLink);
      } else {
        if (!silencioso) {
          alert(`Error al sincronizar con Google Sheets: ${result.error}`);
        }
        console.error("[Google Sync] Error en sincronización de datos:", result.error);
      }
    } catch (error: any) {
      if (!silencioso) {
        alert(`Error general al recopilar y sincronizar datos: ${error.message}`);
      }
      console.error("[Google Sync] Excepción en sincronización de datos:", error);
    }
  };

  // Disparar sincronización automática en segundo plano al montar si está conectado a Google
  const syncAttemptedRef = useRef(false);
  useEffect(() => {
    if (isConnected && !syncAttemptedRef.current) {
      syncAttemptedRef.current = true;
      const timer = setTimeout(() => {
        console.log("[Google Hub] Lanzando sincronización automática de reportes en segundo plano...");
        handleSyncAllData(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  // Cargar archivos de Drive de la carpeta actual automáticamente al cambiar de pestaña o directorio
  useEffect(() => {
    if (isConnected && activeTab === "drive" && currentFolderId) {
      cargarArchivosDrive(currentFolderId);
    }
  }, [isConnected, activeTab, currentFolderId, cargarArchivosDrive]);

  // Filtro de Eventos de Calendario por Rol y Sucursal Activa
  const eventosFiltrados = useMemo(() => {
    const sucursalActivaId = useConfigStore.getState().sucursalActivaId;

    return eventos.filter((evt) => {
      // 1. Filtro por Rol
      let cumpleRol = false;
      if (esAdmin) cumpleRol = true;
      else if (usuarioActivo.rol === "ventas" && evt.tipo === "visita") cumpleRol = true;
      else if (usuarioActivo.rol === "taller" && evt.tipo === "produccion") cumpleRol = true;
      else if (usuarioActivo.rol === "logistica" && evt.tipo === "instalacion") cumpleRol = true;
      
      if (!cumpleRol) return false;

      // 2. Filtro por Sucursal Activa
      if (sucursalActivaId === "todos") return true;

      // Si tiene refId, buscamos si corresponde a un cliente o cotización de esta sucursal
      if (evt.refId) {
        const clienteAsociado = clientes.find(c => c.id === evt.refId);
        if (clienteAsociado) {
          return clienteAsociado.sucursalId === sucursalActivaId;
        }

        const cotizacionAsociada = cotizaciones.find(q => q.id === evt.refId || q.folio === evt.refId);
        if (cotizacionAsociada) {
          return cotizacionAsociada.sucursalId === sucursalActivaId;
        }
      }

      return true;
    });
  }, [eventos, usuarioActivo.rol, esAdmin, clientes, cotizaciones, useConfigStore.getState().sucursalActivaId]);

  // Navegación jerárquica de Drive
  const currentFolder = useMemo(() => {
    return archivosDrive.find(f => f.id === currentFolderId) || null;
  }, [archivosDrive, currentFolderId]);

  const breadcrumbs = useMemo(() => {
    const crumbs: DriveFile[] = [];
    let current = currentFolder;
    while (current) {
      crumbs.unshift(current);
      const parentId = current.parentFolderId;
      current = parentId ? (archivosDrive.find(f => f.id === parentId) || null) : null;
    }
    return crumbs;
  }, [archivosDrive, currentFolder]);

  const archivosFiltrados = useMemo(() => {
    const sucursalActivaId = useConfigStore.getState().sucursalActivaId;

    // Obtener listas de clientes y cotizaciones visibles para esta sucursal
    const clientesVisiblesIds = new Set(
      clientes
        .filter(c => sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId)
        .map(c => c.id)
    );

    const clientesVisiblesNombres = new Set(
      clientes
        .filter(c => sucursalActivaId === "todos" || c.sucursalId === sucursalActivaId)
        .map(c => c.nombre.toLowerCase())
    );

    const cotizacionesVisiblesFolios = new Set(
      cotizaciones
        .filter(q => sucursalActivaId === "todos" || q.sucursalId === sucursalActivaId)
        .map(q => q.folio.toLowerCase())
    );

    const esVisibleDriveFile = (file: DriveFile): boolean => {
      // Carpetas del sistema siempre visibles en la raíz
      if (["f-root", "f-crm", "f-quotes", "f-delivery"].includes(file.id)) {
        return true;
      }
      if (file.parentFolderId === null || file.parentFolderId === "f-root") {
        return true;
      }

      // Si está en Clientes CRM, filtramos la carpeta del cliente
      if (file.parentFolderId === "f-crm") {
        const matchId = Array.from(clientesVisiblesIds).some(id => file.id.includes(id));
        const matchNombre = clientesVisiblesNombres.has(file.nombre.toLowerCase());
        return matchId || matchNombre;
      }

      // Si está en Cotizaciones & Nesting, filtramos por folio
      if (file.parentFolderId === "f-quotes") {
        return Array.from(cotizacionesVisiblesFolios).some(folio => file.nombre.toLowerCase().includes(folio));
      }

      // Si está en subcarpetas de clientes, heredamos el filtro del padre
      if (file.parentFolderId) {
        const parent = archivosDrive.find(f => f.id === file.parentFolderId);
        if (parent) {
          return esVisibleDriveFile(parent);
        }
      }

      return true;
    };

    return archivosDrive.filter(file => {
      const matchFolder = file.parentFolderId === currentFolderId;
      const matchSearch = file.nombre.toLowerCase().includes(driveSearch.toLowerCase());
      const matchSucursal = esVisibleDriveFile(file);
      return matchFolder && (driveSearch ? matchSearch : true) && matchSucursal;
    });
  }, [archivosDrive, currentFolderId, driveSearch, clientes, cotizaciones, useConfigStore.getState().sucursalActivaId]);

  // Filtro de Gmail (Outbox) por Sucursal Activa
  const gmailLogFiltrado = useMemo(() => {
    const sucursalActivaId = useConfigStore.getState().sucursalActivaId;
    if (sucursalActivaId === "todos") {
      return gmailLog;
    }

    const clientesSucursal = clientes.filter(c => c.sucursalId === sucursalActivaId);
    const emailsClientes = new Set(
      clientesSucursal
        .map(c => c.email ? c.email.toLowerCase() : "")
        .filter(email => email !== "")
    );

    const cotizacionesSucursal = cotizaciones.filter(q => q.sucursalId === sucursalActivaId);
    const foliosCotizaciones = cotizacionesSucursal.map(q => q.folio.toLowerCase());

    return gmailLog.filter(log => {
      // Coincidencia por destinatario
      if (log.destinatario && emailsClientes.has(log.destinatario.toLowerCase())) {
        return true;
      }
      // Coincidencia por folio en asunto o cuerpo
      const textToSearch = `${log.asunto} ${log.cuerpo}`.toLowerCase();
      const contieneFolio = foliosCotizaciones.some(folio => textToSearch.includes(folio));
      if (contieneFolio) {
        return true;
      }
      return false;
    });
  }, [gmailLog, clientes, cotizaciones, useConfigStore.getState().sucursalActivaId]);

  // Generador de grilla de calendario de Junio 2026 (mes del local time metadata)
  const celdasDias = useMemo(() => {
    const celdas = [];
    const diasEnMes = 30;
    const primerDiaAjustado = 0; // 1 de Junio es Lunes -> index 0

    for (let i = 0; i < primerDiaAjustado; i++) {
      celdas.push(null);
    }
    for (let dia = 1; dia <= diasEnMes; dia++) {
      celdas.push(dia);
    }
    return celdas;
  }, []);

  /** Crea un evento real en Google Calendar */
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evtTitle) return;

    const fechaInicio = new Date(`${evtDate}T${evtStartHour}:00`).toISOString();
    const fechaFin = new Date(`${evtDate}T${evtEndHour}:00`).toISOString();

    const tipoFinal = esAdmin ? evtType : (
      usuarioActivo.rol === "ventas" ? "visita" :
      usuarioActivo.rol === "taller" ? "produccion" : "instalacion"
    );

    await crearEventoAgenda(evtTitle, evtDesc, fechaInicio, fechaFin, tipoFinal);
    setEvtTitle("");
    setEvtDesc("");
    setIsCreateEventOpen(false);
  };

  /** Crea una carpeta real en Google Drive */
  const handleCreateNewFolder = async () => {
    if (!newFolderName) return;
    const folderId = await crearCarpeta(newFolderName, currentFolderId || undefined);
    if (folderId) {
      setNewFolderName("");
      setIsNewFolderOpen(false);
      // Recargar archivos de la carpeta actual
      if (currentFolderId) {
        const files = await cargarArchivosDrive(currentFolderId);
        setDriveFiles(files);
      }
    }
  };

  /** Crea un archivo real en Google Drive */
  const handleCreateMockFile = async (tipo: "doc" | "sheet" | "slide") => {
    let name = "Nuevo Documento.docx";
    if (tipo === "sheet") name = "Nueva Hoja de Cálculo.xlsx";
    else if (tipo === "slide") name = "Nueva Presentación.pptx";

    const file = await crearArchivoDrive(name, tipo, currentFolderId || "root");
    if (file && currentFolderId) {
      const files = await cargarArchivosDrive(currentFolderId);
      setDriveFiles(files);
    }
  };

  /** Sube un archivo/foto real a Google Drive */
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFile(true);
    await subirArchivo(file, currentFolderId || undefined);
    setUploadingFile(false);
    // Recargar archivos
    if (currentFolderId) {
      const files = await cargarArchivosDrive(currentFolderId);
      setDriveFiles(files);
    }
    // Limpiar el input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Limitar adjuntos a 5MB por archivo
      if (file.size > 5 * 1024 * 1024) {
        alert(`El archivo "${file.name}" supera el límite permitido de 5 MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSelectedAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            type: file.type || "application/octet-stream",
            content: base64String,
            size: file.size,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    // Limpiar input uploader
    e.target.value = "";
  };

  const removeAttachment = (index: number) => {
    setSelectedAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  /** Envía un correo real por Gmail con plantilla formal y adjuntos */
  const handleComposeMail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mailTo || !mailSubject || !mailBody) return;

    // Convertir saltos de línea de texto plano a párrafos HTML
    const paragraphHtml = mailBody
      .split("\n")
      .map(p => p.trim() ? `<p style="margin: 0 0 12px 0; font-family: sans-serif; font-size: 13.5px; color: #27272a; line-height: 1.6;">${p}</p>` : "<br>")
      .join("");

    // Construir la plantilla HTML formal para el correo
    const mailHtmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #27272a; margin: 0; padding: 20px; background-color: #f4f4f5; }
          .card { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
          .header { background-color: #064e3b; padding: 24px; color: #ffffff; }
          .content { padding: 32px 24px; line-height: 1.6; font-size: 13.5px; text-align: left; }
          .footer { border-top: 1px solid #f4f4f5; padding: 20px 24px; background-color: #fafafa; font-size: 10px; color: #a1a1aa; text-align: left; line-height: 1.4; }
          .signature-table { border-collapse: collapse; margin-top: 24px; width: 100%; border-top: 1px solid #f4f4f5; padding-top: 16px; }
          .signature-info { vertical-align: top; padding-left: 12px; text-align: left; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="header">
            <div style="font-weight: 900; font-size: 16px; text-transform: uppercase; letter-spacing: 1.5px; line-height: 1; color: #ffffff; font-family: sans-serif;">
              ${empresa.nombreComercial}
            </div>
            <div style="font-size: 9px; opacity: 0.8; font-weight: bold; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; font-family: sans-serif;">
              Comunicación Oficial · Ventas y Cotizaciones
            </div>
          </div>
          <div class="content">
            <div style="color: #3f3f46; margin-bottom: 24px; font-family: sans-serif;">
              ${paragraphHtml}
            </div>
            
            <table class="signature-table" style="margin-top: 24px; border-top: 1px solid #f4f4f5; padding-top: 16px; width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 52px; vertical-align: middle; padding: 0;">
                  ${empresa.logoUrl ? `
                    <img src="${empresa.logoUrl}" alt="Logo" style="width: 48px; height: 48px; object-fit: contain; border-radius: 8px; border: 1px solid #e4e4e7; background: #ffffff; padding: 2px;" />
                  ` : `
                    <div style="width: 48px; height: 48px; border-radius: 8px; background: #f4f4f5; display: flex; align-items: center; justify-content: center; font-weight: bold; color: #a1a1aa; font-size: 14px; font-family: sans-serif;">GA</div>
                  `}
                </td>
                <td class="signature-info" style="vertical-align: top; padding-left: 12px; text-align: left; font-family: sans-serif;">
                  <div style="font-weight: 800; color: #18181b; font-size: 13px; margin: 0 0 2px 0;">${senderName}</div>
                  <div style="color: #71717a; font-size: 10px; margin-bottom: 4px; font-weight: bold;">${senderRole} · ${empresa.nombreComercial}</div>
                  <div style="color: #a1a1aa; font-size: 9.5px; line-height: 1.4;">
                    <span>Tel: ${empresa.telefono}</span> | <span>WhatsApp: ${empresa.whatsapp}</span> <br>
                    <span>Sucursal: ${empresa.calle} ${empresa.numero}, Col. ${empresa.colonia}</span>
                  </div>
                </td>
              </tr>
            </table>
          </div>
          <div class="footer" style="border-top: 1px solid #f4f4f5; padding: 20px 24px; background-color: #fafafa; font-size: 10px; color: #a1a1aa; text-align: left; line-height: 1.4; font-family: sans-serif;">
            <strong>Aviso de Confidencialidad:</strong> Este mensaje y sus archivos adjuntos son privados y confidenciales y están dirigidos exclusivamente a su destinatario. Si por error ha recibido este correo, le solicitamos que lo elimine de inmediato y nos lo informe. Queda prohibida su reproducción o distribución.
          </div>
        </div>
      </body>
      </html>
    `;

    // Preparar attachments en formato Base64 simple
    const attachmentsToSend = selectedAttachments.map(a => ({
      name: a.name,
      type: a.type,
      content: a.content
    }));

    // Enviar correo con HTML y los adjuntos, y pasar el mailBody original en texto plano como 6to parámetro para el log de Zustand
    await enviarCorreo(mailTo, mailSubject, mailHtmlBody, true, attachmentsToSend, mailBody);

    // Limpiar formulario
    setMailTo("");
    setMailSubject("");
    setMailBody("");
    setSelectedAttachments([]);
    setIsComposeOpen(false);
  };

  const handleTabChange = async (tab: "oauth" | "calendar" | "drive" | "gmail" | "looker") => {
    setActiveTab(tab);
    if (tab === "calendar" && isConnected) {
      await cargarEventos();
    }
    if (tab === "drive" && isConnected && !currentFolderId) {
      // Cargar raíz de Drive
      const files = await cargarArchivosDrive("root");
      setDriveFiles(files);
      setCurrentFolderId("root");
    }
    if (tab === "looker" && isConnected) {
      handleSyncAllData(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!previewFile) return;

    let contentToSend = "";

    if (previewFile.tipo === "doc") {
      // Convertir saltos de línea de texto plano a párrafos HTML
      const paragraphs = editedText
        .split("\n")
        .map(p => p.trim() ? `<p>${p}</p>` : "<br>")
        .join("");
      contentToSend = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${paragraphs}</body></html>`;
    } else if (previewFile.tipo === "sheet") {
      // Generar la cadena CSV a partir del estado de celdas editadas
      contentToSend = [
        "CÁLCULO E INDUSTRIALIZACIÓN - OPTIMIZACIÓN LINEAL (NESTING)",
        `Reporte de optimización de barras de aluminio para corte en taller. Optimización ejecutada el: ${new Date(previewFile.fechaCreacion).toLocaleDateString("es-MX")}`,
        "",
        "Perfil Cód.,Largo Tramo (m),Cortes Requeridos,Tramos a Utilizar,Desperdicio (mm),Eficiencia (%)",
        ...nestingRows.map(row => `${row.cod},${row.largo},"${row.cortes}",${row.tramos},${row.desperdicio},${row.eficiencia}`),
        `Total,5 tramos,,5 tramos,750 mm,98.0% prom.`,
        "",
        `Aviso del Taller: Este cálculo de corte es de uso confidencial e interno para el personal habilitador de ${empresa.nombreComercial}.`
      ].join("\n");
    } else if (previewFile.tipo === "slide") {
      // Convertir bloques de texto separados por doble línea a secciones de diapositiva HTML
      const slides = editedText
        .split("\n\n")
        .map(slideText => {
          const lines = slideText.split("\n");
          const title = lines[0] || "Diapositiva";
          const bulletPoints = lines.slice(1).map(l => l.trim() ? `<li>${l}</li>` : "").join("");
          return `<section><h1>${title}</h1><ul>${bulletPoints}</ul></section>`;
        })
        .join('<hr style="page-break-after:always;">');
      contentToSend = `<!DOCTYPE html><html><body>${slides}</body></html>`;
    }

    const success = await guardarArchivoEditado(previewFile.id, previewFile.tipo, contentToSend);
    if (success) {
      alert("Los cambios se han guardado con éxito y se han sincronizado en tu cuenta de Google.");
      setIsEditing(false);
      
      // Recargar la lista de archivos para ver cambios en la UI
      if (currentFolderId) {
        const files = await cargarArchivosDrive(currentFolderId);
        setDriveFiles(files);
      }
    } else {
      alert("No se pudieron guardar los cambios. Por favor revisa tu conexión a Google.");
    }
  };

  const getFileIcon = (tipo: DriveFile["tipo"]) => {
    switch (tipo) {
      case "folder": return <Folder className="w-5 h-5 text-amber-500 fill-current" />;
      case "doc": return <FileText className="w-5 h-5 text-blue-600" />;
      case "sheet": return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
      case "slide": return <Presentation className="w-5 h-5 text-orange-500" />;
      case "pdf": return <FileText className="w-5 h-5 text-red-500" />;
      default: return <FileImage className="w-5 h-5 text-zinc-500" />;
    }
  };

  return (
    <div className="space-y-6 px-4 md:px-8 max-w-[95vw] 2xl:max-w-[1500px] mx-auto font-sans">
      
      {/* HEADER PRINCIPAL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <Cloud className="w-8 h-8 text-emerald-600" />
            Centro de Control: Google Workspace
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Gestión unificada de Calendar (Agenda), Drive (Expedientes de obra), Gmail (Notificaciones) y Hojas de Cálculo.
          </p>
        </div>

        {/* Acceso por Roles */}
        <div className="flex items-center gap-2.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2.5 rounded-2xl">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <span className="text-zinc-400 font-semibold block uppercase tracking-wider text-[9px]">Permiso de Perfil:</span>
            <span className="font-bold text-zinc-700 dark:text-zinc-300">
              {esAdmin ? "Acceso Completo (Administrador)" : `Perfil: ${usuarioActivo.rol.toUpperCase()}`}
            </span>
          </div>
        </div>
      </div>

      {/* PESTAÑAS DE NAVEGACIÓN */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <button
          onClick={() => handleTabChange("oauth")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "oauth" 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          Google Connect
        </button>
        <button
          onClick={() => handleTabChange("calendar")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "calendar" 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          Calendar (Agenda)
        </button>
        <button
          onClick={() => handleTabChange("drive")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "drive" 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          Drive (Archivos)
        </button>
        <button
          onClick={() => handleTabChange("gmail")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "gmail" 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          Gmail (Correos)
        </button>
        <button
          onClick={() => handleTabChange("looker")}
          className={`px-4 py-2 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === "looker" 
              ? "border-emerald-600 text-emerald-600" 
              : "border-transparent text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          }`}
        >
          Data Studio (Reportes)
        </button>
      </div>

      {/* CONTENIDO PESTAÑAS */}
      
      {/* 1. OAUTH & SETTINGS */}
      {activeTab === "oauth" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* TARJETA 1: CONEXIÓN REAL GOOGLE */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isConnected
                    ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border-emerald-100 dark:border-emerald-900/30"
                    : "bg-blue-50 dark:bg-blue-950/30 text-blue-600 border-blue-100 dark:border-blue-900/30"
                }`}>
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider">
                    Google Workspace Real
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${
                    isConnected ? "text-emerald-600" : "text-zinc-400"
                  }`}>
                    {isConnected ? "✓ Conectado" : "Sin conexión"}
                  </span>
                </div>
              </div>

              {isConnected ? (
                /* Perfil conectado */
                <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-3">
                  <div className="flex items-center gap-3">
                    {connectedPicture ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={connectedPicture} alt="Avatar" className="w-10 h-10 rounded-xl object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">
                        {connectedName?.[0] ?? "G"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-black text-zinc-900 dark:text-white truncate">{connectedName}</p>
                      <p className="text-[10px] text-zinc-400 font-medium truncate">{connectedEmail}</p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Permisos activos</span>
                    {[
                      { label: "Google Calendar", ok: true },
                      { label: "Google Drive", ok: true },
                      { label: "Gmail (Enviar)", ok: true },
                    ].map(s => (
                      <div key={s.label} className="flex items-center justify-between text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        <span>{s.label}</span>
                        <span className="text-emerald-600">✓ Habilitado</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  Conecta tu cuenta de Google para sincronizar la agenda de obra, subir fotos y contratos a Drive, y enviar correos desde Gmail en nombre de Grupo Arca.
                </p>
              )}
            </div>

            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800/80 space-y-3">
              {isConnected ? (
                <div className="space-y-2">
                  <button
                    onClick={() => cargarEventos()}
                    disabled={isSyncing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                    Sincronizar Calendar
                  </button>
                  <button
                    onClick={async () => { await cerrarSesionGoogle(); }}
                    className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-900/50 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 font-bold py-2 rounded-xl text-xs transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Desvincular Google
                  </button>
                </div>
              ) : (
                <button
                  onClick={iniciarConexionGoogle}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                    <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Vincular con Google
                </button>
              )}
            </div>
          </div>

          {/* TARJETA 2: COLA OFFLINE (SIMULACIÓN Y RESILIENCIA) */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl border ${
                  isOffline 
                    ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30" 
                    : connectionType === "cellular"
                      ? "bg-sky-50 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-900/30"
                      : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30"
                }`}>
                  {isOffline ? (
                    <WifiOff className="w-5 h-5 text-red-500 animate-pulse" />
                  ) : connectionType === "cellular" ? (
                    <Wifi className="w-5 h-5 text-sky-500" />
                  ) : (
                    <Wifi className="w-5 h-5 text-emerald-500" />
                  )}
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-sm text-zinc-800 dark:text-white uppercase tracking-wider leading-none">
                    Cola Offline
                  </h3>
                  <span className={`text-[10px] font-black uppercase tracking-widest block mt-1 ${
                    isOffline 
                      ? "text-red-500" 
                      : connectionType === "cellular"
                        ? "text-sky-500"
                        : "text-emerald-500"
                  }`}>
                    {isOffline 
                      ? "Modo Offline Activo" 
                      : connectionType === "cellular" 
                        ? `Datos Celulares (${effectiveType?.toUpperCase() || "Móvil"})` 
                        : `WiFi / Red Local`}
                  </span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed text-left">
                Cuando trabajas sin conexión en obra o ruta, tus acciones (creación de carpetas, agendas y correos) se guardan localmente y se subirán a Google automáticamente al recuperar red.
              </p>

              {!isOffline && connectionType === "cellular" && (
                <div className="bg-sky-50/50 dark:bg-sky-950/10 border border-sky-100 dark:border-sky-900/20 p-2.5 rounded-xl text-[10.5px] text-sky-700 dark:text-sky-400 font-semibold leading-normal text-left">
                  💡 Estás usando datos celulares. Para evitar altos consumos, las imágenes y archivos pesados se subirán de forma optimizada en segundo plano.
                </div>
              )}

              <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 bg-zinc-50 dark:bg-zinc-950/35 space-y-2.5 max-h-[180px] overflow-y-auto">
                <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  Tareas Pendientes ({offlineQueue.length})
                </span>

                {offlineQueue.length === 0 ? (
                  <p className="text-[11px] text-zinc-400 italic">
                    Sin tareas pendientes. El sistema está sincronizado al 100%.
                  </p>
                ) : (
                  <div className="space-y-2 text-left">
                    {offlineQueue.map((task) => (
                      <div key={task.id} className="flex items-start gap-2 border-b border-zinc-100 dark:border-zinc-800/80 pb-2 last:border-b-0 text-[10px]">
                        <div className="mt-0.5 shrink-0">
                          {task.tipo === "calendar" && <CalendarIcon className="w-3.5 h-3.5 text-blue-500" />}
                          {task.tipo === "drive_folder" && <Folder className="w-3.5 h-3.5 text-amber-500 fill-current" />}
                          {task.tipo === "drive_file" && <FileText className="w-3.5 h-3.5 text-emerald-500" />}
                          {task.tipo === "gmail" && <Mail className="w-3.5 h-3.5 text-red-500" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-zinc-700 dark:text-zinc-300 block truncate">
                            {task.tipo === "calendar" && `Agenda: ${task.payload.titulo}`}
                            {task.tipo === "drive_folder" && `Carpeta CRM: ${task.payload.clienteNombre}`}
                            {task.tipo === "drive_file" && `Archivo Drive: ${task.payload.nombre}`}
                            {task.tipo === "gmail" && `Mail: ${task.payload.asunto}`}
                          </span>
                          <span className="text-[8px] text-zinc-400 block font-semibold">
                            Encolado: {new Date(task.fechaCreacion).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {offlineQueue.length > 0 && (
              <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800/80">
                <button
                  onClick={() => procesarColaOffline()}
                  disabled={isOffline || isSyncing}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Subiendo a Google..." : "Sincronizar Cola Ahora"}
                </button>
                {isOffline && (
                  <span className="text-[9px] text-red-500 text-center font-bold block mt-1">
                    Conéctate a la red para poder sincronizar.
                  </span>
                )}
              </div>
            )}
          </div>

          {/* TARJETA 3: SERVICIOS CONECTADOS */}
          <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
            <h3 className="font-black text-sm text-zinc-800 dark:text-white uppercase tracking-wider text-left">
              Servicios Conectados
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 text-left">
              Al enlazar la aplicación, los módulos operativos se conectan de la siguiente manera:
            </p>

            <div className="grid grid-cols-1 gap-3">
              <div className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Google Calendar</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Agendar visitas de cotizaciones al CRM y fechas compromiso de taller automáticamente.
                </p>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Google Drive</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Crear carpetas de clientes, guardar hojas de nesting y contratos de servicios firmados.
                </p>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Gmail API</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Envío automatizado de cotizaciones a clientes, alertas de mermas de taller y reportes de entrega.
                </p>
              </div>

              <div className="border border-zinc-200 dark:border-zinc-800 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 space-y-1.5 text-left">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Sheets, Docs & Slides</span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Generación de plantillas de cálculo de corte y contratos desde el sistema de cotizaciones.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. CALENDAR (AGENDA) */}
      {activeTab === "calendar" && (
        <div className="space-y-4">
          {!isConnected && (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                La sincronización con Google Calendar está inactiva. Los eventos creados solo se guardarán de forma local. Activa el permiso en la pestaña <strong>OAuth & Enlaces</strong>.
              </p>
            </div>
          )}

          <div className="flex justify-between items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-sm">
            <div className="flex items-center gap-3">
              <div className="text-xs font-bold text-zinc-500">
                Junio 2026 • Visión de {usuarioActivo.nombre} ({usuarioActivo.rol.toUpperCase()})
              </div>
              {isRealtimeActive && (
                <span className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/40 shadow-sm shadow-emerald-500/5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping absolute" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 relative" />
                  En Vivo
                </span>
              )}
            </div>
            <button
              onClick={() => setIsCreateEventOpen(true)}
              className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1.5 px-3 rounded-xl text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar Pendiente
            </button>
          </div>

          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 md:p-6 shadow-sm space-y-4">
            <div className="grid grid-cols-7 text-center font-black text-[10px] text-zinc-400 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2">
              <span>Lun</span>
              <span>Mar</span>
              <span>Mié</span>
              <span>Jue</span>
              <span>Vie</span>
              <span>Sáb</span>
              <span>Dom</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {celdasDias.map((dia, index) => {
                if (dia === null) {
                  return <div key={`empty-${index}`} className="h-28 bg-zinc-50/20 dark:bg-zinc-950/10 rounded-xl" />;
                }

                const fechaDiaStr = `2026-06-${dia.toString().padStart(2, "0")}`;
                const eventosDelDia = eventosFiltrados.filter(e => {
                  if (!e.fechaInicio) return false;
                  if (e.fechaInicio.includes("T")) {
                    const localDate = new Date(e.fechaInicio);
                    return localDate.getFullYear() === 2026 &&
                           localDate.getMonth() === 5 && // Junio
                           localDate.getDate() === dia;
                  }
                  return e.fechaInicio === fechaDiaStr;
                });

                return (
                  <div 
                    key={`dia-${dia}`}
                    className="h-28 bg-zinc-50 dark:bg-zinc-950/45 border border-zinc-200 dark:border-zinc-800 p-2 rounded-xl flex flex-col justify-between hover:border-emerald-500/50 transition-colors group"
                  >
                    <span className="text-xs font-bold text-zinc-700 dark:text-zinc-400">
                      {dia}
                    </span>

                    <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-0.5 max-h-[70px]">
                      {eventosDelDia.map(evt => {
                        const bgBadge = 
                          evt.tipo === "visita" ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" :
                          evt.tipo === "produccion" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" :
                          "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400";
                        const dotColor = 
                          evt.tipo === "visita" ? "bg-blue-500" :
                          evt.tipo === "produccion" ? "bg-amber-500" : "bg-emerald-500";
                        
                        return (
                          <button
                            key={evt.id}
                            onClick={() => setSelectedEvent(evt)}
                            className={`w-full text-left text-[9px] font-bold p-1 rounded border leading-tight flex items-center gap-1 ${bgBadge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                            <span className="truncate">{evt.titulo}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. GOOGLE DRIVE (ARCHIVOS DE OBRA) */}
      {activeTab === "drive" && (
        <div className="space-y-4">
          {!isConnected ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                Acceso a Google Drive no vinculado. Por favor activa los permisos de almacenamiento en la pestaña <strong>OAuth & Enlaces</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              
              {/* ACCIONES DE DRIVE */}
              <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4 shadow-sm h-fit">
                <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                  Acciones Rápidas
                </h3>
                
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setIsNewFolderOpen(true)}
                    className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold text-left transition-colors"
                  >
                    <FolderPlus className="w-4 h-4 text-amber-500 fill-current" />
                    Nueva Carpeta
                  </button>

                  <button
                    onClick={() => handleCreateMockFile("doc")}
                    className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold text-left transition-colors"
                  >
                    <FileText className="w-4 h-4 text-blue-500" />
                    Crear Contrato (Google Doc)
                  </button>

                  <button
                    onClick={() => handleCreateMockFile("sheet")}
                    className="flex items-center gap-2 bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-800 p-2.5 rounded-xl text-xs font-bold text-left transition-colors"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                    Crear Nesting (Google Sheet)
                  </button>
                </div>
              </div>

              {/* EXPLORADOR DE DRIVE */}
              <div className="lg:col-span-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                
                {/* Cabecera / Buscador */}
                <div className="flex flex-col sm:flex-row gap-3 justify-between items-center pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  
                  {/* Miga de Pan (Breadcrumbs) */}
                  <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-bold overflow-x-auto w-full sm:w-auto">
                    <button 
                      onClick={() => setCurrentFolderId("f-root")}
                      className="text-emerald-600 hover:underline shrink-0"
                    >
                      Google Drive
                    </button>
                    
                    {breadcrumbs.map((crumb) => {
                      if (crumb.id === "f-root") return null;
                      return (
                        <React.Fragment key={crumb.id}>
                          <ChevronRight className="w-3.5 h-3.5 shrink-0" />
                          <button
                            onClick={() => setCurrentFolderId(crumb.id)}
                            className="text-emerald-600 hover:underline shrink-0 max-w-[120px] truncate"
                          >
                            {crumb.nombre}
                          </button>
                        </React.Fragment>
                      );
                    })}
                  </div>

                  {/* Buscador */}
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 w-4 h-4 text-zinc-400" />
                    <input
                      type="text"
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      placeholder="Buscar archivos en Drive..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 pl-9 pr-4 py-2 rounded-xl text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                </div>

                {/* Subir a directorio superior */}
                {currentFolderId !== "f-root" && (
                  <button
                    onClick={() => {
                      if (currentFolder) {
                        setCurrentFolderId(currentFolder.parentFolderId);
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 pb-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Regresar al directorio anterior
                  </button>
                )}

                {/* Grilla de Archivos */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {archivosFiltrados.length === 0 ? (
                    <div className="col-span-full h-44 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-center text-zinc-400 p-4 text-xs">
                      Carpeta vacía
                    </div>
                  ) : (
                    archivosFiltrados.map((file) => (
                      <div
                        key={file.id}
                        onDoubleClick={() => {
                          if (file.tipo === "folder") {
                            setCurrentFolderId(file.id);
                          } else {
                            setPreviewFile(file);
                          }
                        }}
                        className="border border-zinc-200 dark:border-zinc-800/80 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/30 hover:border-emerald-500/50 hover:bg-white dark:hover:bg-zinc-900 transition-all flex items-center justify-between group cursor-pointer"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {getFileIcon(file.tipo)}
                          <div className="text-left min-w-0">
                            <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 block truncate leading-snug">
                              {file.nombre}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-semibold block">
                              {file.tipo === "folder" ? "Carpeta" : file.tamano} • {new Date(file.fechaCreacion).toLocaleDateString("es-MX", { day: '2-digit', month: 'short' })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {file.tipo !== "folder" && (
                            <>
                              {/* Botón Previsualizar */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewFile(file);
                                }}
                                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-emerald-500 transition-colors focus:outline-none"
                                title="Previsualizar e Industrializar en la App"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              {/* Botón Descargar Físico */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  descargarArchivo(file.id, file.tipo, file.nombre);
                                }}
                                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors focus:outline-none"
                                title="Descargar como archivo de oficina"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                              </button>
                              {/* Botón Abrir Editor Oficial Google */}
                              <a
                                href={file.url}
                                onClick={(e) => e.stopPropagation()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                                title="Abrir y Editar en Google Workspace"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            </>
                          )}
                          {/* Botón Eliminar Archivo/Carpeta */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`¿Estás seguro de que deseas enviar "${file.nombre}" a la papelera de Google Drive?`)) {
                                eliminarArchivoDrive(file.id);
                              }
                            }}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 text-zinc-400 hover:text-red-500 transition-colors focus:outline-none"
                            title="Mover a la Papelera"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>

            </div>
          )}
        </div>
      )}

      {/* 4. GMAIL (CORREOS ENVIADOS) */}
      {activeTab === "gmail" && (
        <div className="space-y-4">
          {!isConnected ? (
            <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 p-4 rounded-2xl">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
              <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">
                La conexión con Gmail no está configurada o carece de permisos. Para registrar envíos de correos, activa Gmail en la pestaña <strong>OAuth & Enlaces</strong>.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* SIMULADOR DE ENVÍO */}
              <div className="lg:col-span-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm h-fit space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                    Redactar Correo
                  </h3>
                  <Mail className="w-4 h-4 text-emerald-600" />
                </div>

                <form onSubmit={handleComposeMail} className="space-y-3.5 text-xs">
                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Para (Destinatario)
                    </label>
                    <input
                      type="email"
                      required
                      value={mailTo}
                      onChange={(e) => setMailTo(e.target.value)}
                      placeholder="cliente@correo.com"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Asunto
                    </label>
                    <input
                      type="text"
                      required
                      value={mailSubject}
                      onChange={(e) => setMailSubject(e.target.value)}
                      placeholder="Cotización Domos y Pérgolas"
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                      Cuerpo del Mensaje
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={mailBody}
                      onChange={(e) => setMailBody(e.target.value)}
                      placeholder="Estimado cliente, enviamos adjuntos..."
                      className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                    />
                  </div>

                  {/* Firma Dinámica */}
                  <div className="grid grid-cols-2 gap-2 border-t border-zinc-100 dark:border-zinc-800/80 pt-3">
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                        Nombre del Emisor
                      </label>
                      <input
                        type="text"
                        required
                        value={senderName}
                        onChange={(e) => setSenderName(e.target.value)}
                        placeholder="Nombre del Vendedor"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                        Puesto / Cargo
                      </label>
                      <input
                        type="text"
                        required
                        value={senderRole}
                        onChange={(e) => setSenderRole(e.target.value)}
                        placeholder="Cargo en la empresa"
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2.5 py-1.5 text-[11px] focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>

                  {/* Selector y visualizador de Archivos Adjuntos */}
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">
                        Archivos Adjuntos
                      </span>
                      <label 
                        htmlFor="email-attachments-uploader" 
                        className="flex items-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[10px] font-bold text-zinc-600 dark:text-zinc-300 rounded-lg cursor-pointer transition-colors"
                      >
                        <Paperclip className="w-3 h-3" />
                        Adjuntar
                      </label>
                      <input
                        type="file"
                        multiple
                        id="email-attachments-uploader"
                        onChange={handleAttachmentChange}
                        className="hidden"
                      />
                    </div>

                    {selectedAttachments.length > 0 && (
                      <div className="space-y-1.5 max-h-32 overflow-y-auto bg-zinc-50 dark:bg-zinc-950/40 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/50">
                        {selectedAttachments.map((attach, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center gap-2 p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10.5px]"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Paperclip className="w-3 h-3 text-zinc-400 shrink-0" />
                              <span className="text-zinc-700 dark:text-zinc-300 truncate font-semibold">
                                {attach.name}
                              </span>
                              <span className="text-[9px] text-zinc-400 font-mono">
                                ({(attach.size / 1024).toFixed(1)} KB)
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeAttachment(index)}
                              className="text-red-500 hover:text-red-700 font-bold px-1 focus:outline-none"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition-colors shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Enviar por Gmail
                  </button>
                </form>
              </div>

              {/* BANDEJA DE ENVIADOS */}
              <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                  Bandeja de Salida (Outbox Gmail API)
                </h3>

                <div className="space-y-3.5 max-h-[500px] overflow-y-auto pr-1">
                  {gmailLogFiltrado.length === 0 ? (
                    <div className="h-44 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-400 text-xs">
                      Sin correos enviados
                    </div>
                  ) : (
                    gmailLogFiltrado.map((log) => (
                      <div
                        key={log.id}
                        className="border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-950/20 space-y-3.5 text-xs text-left"
                      >
                        <div className="flex justify-between items-start gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <div>
                            <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-widest leading-none mb-1">Destinatario</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">{log.destinatario}</span>
                          </div>
                          
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.estado === "enviado" 
                              ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600" 
                              : "bg-red-50 dark:bg-red-950/30 text-red-600"
                          }`}>
                            {log.estado.toUpperCase()}
                          </span>
                        </div>

                        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-2">
                          <span className="text-zinc-400 block text-[9px] font-black uppercase tracking-widest leading-none mb-1">Asunto</span>
                          <span className="font-bold text-zinc-800 dark:text-zinc-200">{log.asunto}</span>
                        </div>

                        {/* Plantilla formal de correo */}
                        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
                          {/* Encabezado del correo con Logo */}
                          <div className="bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200/60 dark:border-zinc-800 p-3.5 flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              {empresa.logoUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={empresa.logoUrl} alt="Logo" className="w-8 h-8 object-contain rounded bg-white p-0.5" />
                              ) : (
                                <div className="w-8 h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-[10px] text-zinc-500">
                                  GA
                                </div>
                              )}
                              <div className="text-left">
                                <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200 block uppercase tracking-wider leading-none">
                                  {empresa.nombreComercial}
                                </span>
                                <span className="text-[8px] text-zinc-400 font-semibold block mt-0.5">Comunicación Oficial</span>
                              </div>
                            </div>
                            <span className="text-[8px] text-zinc-400 font-bold font-mono">Gmail API</span>
                          </div>
                          
                          {/* Cuerpo */}
                          <div className="p-4 space-y-4 text-left">
                            <p className="text-zinc-700 dark:text-zinc-400 text-xs leading-relaxed whitespace-pre-wrap font-sans">
                              {log.cuerpo}
                            </p>
                            
                            {/* Firma */}
                            <div className="border-t border-zinc-100 dark:border-zinc-800/80 pt-3 flex flex-col gap-0.5 text-[9px] text-zinc-400 font-semibold font-sans">
                              <span className="text-zinc-700 dark:text-zinc-300 font-black">{usuarioActivo.nombre}</span>
                              <span>Operaciones y Habilitación · {empresa.nombreComercial}</span>
                              <span>Tel: {empresa.telefono} | Whatsapp: {empresa.whatsapp}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-[9px] text-zinc-400 text-right font-semibold">
                          Enviado: {new Date(log.fecha).toLocaleString("es-MX")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          )}
        </div>
      )}

      {/* 5. GOOGLE DATA STUDIO (ANALÍTICA & REPORTES) */}
      {activeTab === "looker" && (
        <div className="space-y-6">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-4 text-left">
            <div>
              <h2 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
                <LayoutGrid className="w-6 h-6 text-emerald-600 animate-pulse" />
                Data Studio · Inteligencia de Negocios
              </h2>
              <p className="text-xs text-zinc-400 font-semibold block mt-1 leading-normal">
                Visualiza eficiencias de Nesting, desperdicio de aluminio en taller y rendimiento comercial de ventas en vivo.
              </p>
            </div>

            {/* BOTÓN PREMIUM DE SINCRONIZACIÓN Y ESTADO AUTOMÁTICO */}
            {isConnected && (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider block">Sincronización Automática</span>
                  <span className="text-xs font-black text-emerald-600 flex items-center gap-1 justify-end">
                    <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full animate-ping" />
                    Segundo plano activo
                  </span>
                </div>
                <button
                  onClick={() => handleSyncAllData(false)}
                  disabled={isSyncing}
                  className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:from-zinc-500 disabled:to-zinc-500 text-white font-black px-4.5 py-2.5 rounded-2xl text-xs transition-all shadow-md hover:shadow-lg disabled:opacity-50 shrink-0 transform hover:-translate-y-0.5 active:translate-y-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                  {isSyncing ? "Sincronizando..." : "Sincronizar Métricas"}
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* PANEL IZQUIERDO: VISUALIZADOR DEL REPORTE */}
            <div className="lg:col-span-8 space-y-4">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                    {lookerReportUrl ? "Tu Reporte de Data Studio" : "Reporte Demostrativo de Data Studio"}
                  </h3>
                  
                  {/* Formulario rápido para configurar URL personalizada */}
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="text"
                      value={inputLookerUrl}
                      onChange={(e) => setInputLookerUrl(e.target.value)}
                      placeholder="Pega la URL de inserción (src) de Data Studio aquí..."
                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-[11px] focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 w-full sm:w-72"
                    />
                    <button
                      onClick={() => {
                        guardarLookerReportUrl(inputLookerUrl.trim() || null);
                        alert("URL de reporte de Data Studio guardada con éxito y persistida.");
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl text-[11px] transition-colors shadow-sm shrink-0"
                    >
                      Enlazar
                    </button>
                  </div>
                </div>

                {/* Contenedor del Iframe del Reporte */}
                <div className="relative w-full aspect-[16/9] md:h-[500px] bg-zinc-50 dark:bg-zinc-950 border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden shadow-inner flex items-center justify-center">
                  <iframe
                    src={lookerReportUrl || "https://datastudio.google.com/embed/reporting/1014500e-495d-4ed7-a371-33275d82dea3/page/CBF0F"}
                    className="w-full h-full border-0 rounded-xl"
                    allowFullScreen
                    sandbox="allow-storage-access-by-user-activation allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                  />
                </div>
              </div>
            </div>

            {/* PANEL DERECHO: TUTORIAL INTERACTIVO PARA NOVATOS */}
            <div className="lg:col-span-4 space-y-4 text-left">
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl shadow-sm space-y-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-xs text-zinc-400 uppercase tracking-widest">
                    Guía de Uso para Principiantes
                  </h3>
                </div>

                <div className="space-y-2.5">
                  {/* PASO 1 */}
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveStep(activeStep === 0 ? null : 0)}
                      className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-[10px] font-black">1</span>
                        Entender los Datos de la App
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeStep === 0 ? "rotate-90" : ""}`} />
                    </button>
                    {activeStep === 0 && (
                      <div className="p-3 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 space-y-2 font-semibold">
                        <p>La aplicación ya realiza la parte más difícil por ti: cada vez que generas una cotización o ejecutas un cálculo de Nesting, la app crea y actualiza automáticamente archivos de hojas de cálculo de <strong>Google Sheets</strong> en la carpeta raíz de tu Google Drive.</p>
                        <p>Los archivos clave son:</p>
                        <ul className="list-disc list-inside pl-1 space-y-1 font-bold text-zinc-700 dark:text-zinc-300">
                          <li>Clientes CRM (Hojas de Cálculo)</li>
                          <li>Cotizaciones & Nesting (Hojas de Cálculo)</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* PASO 2 */}
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveStep(activeStep === 1 ? null : 1)}
                      className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-[10px] font-black">2</span>
                        Iniciar Sesión en Data Studio
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeStep === 1 ? "rotate-90" : ""}`} />
                    </button>
                    {activeStep === 1 && (
                      <div className="p-3 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 space-y-2 font-semibold">
                        <p>Ve al sitio web oficial de la herramienta: <a href="https://datastudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:underline inline-flex items-center gap-0.5">datastudio.google.com <ExternalLink className="w-3 h-3" /></a></p>
                        <p>Inicia sesión con la <strong>misma cuenta de Google</strong> que vinculaste en la sección de "Google Connect" de esta aplicación. Así Data Studio tendrá acceso de lectura directo a los reportes en tu Google Drive.</p>
                      </div>
                    )}
                  </div>

                  {/* PASO 3 */}
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveStep(activeStep === 2 ? null : 2)}
                      className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-[10px] font-black">3</span>
                        Conectar la Hoja de Nesting
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeStep === 2 ? "rotate-90" : ""}`} />
                    </button>
                    {activeStep === 2 && (
                      <div className="p-3 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 space-y-2 font-semibold">
                        <p>Una vez dentro de Data Studio, sigue este flujo de clics:</p>
                        <ol className="list-decimal list-inside pl-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                          <li>Haz clic en el botón superior izquierdo <strong className="text-zinc-800 dark:text-zinc-200">+ Crear</strong> y selecciona <strong>Informe</strong>.</li>
                          <li>Se abrirá un menú de conectores. Elige la opción <strong>Hojas de cálculo de Google</strong>.</li>
                          <li>Busca y selecciona el archivo de la app llamado <strong>Cotizaciones & Nesting</strong> y haz clic en <strong>Añadir</strong>.</li>
                        </ol>
                      </div>
                    )}
                  </div>

                  {/* PASO 4 */}
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveStep(activeStep === 3 ? null : 3)}
                      className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-[10px] font-black">4</span>
                        Crear Gráficos de Mermas
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeStep === 3 ? "rotate-90" : ""}`} />
                    </button>
                    {activeStep === 3 && (
                      <div className="p-3 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 space-y-2 font-semibold">
                        <p>Data Studio te dará un lienzo en blanco para arrastrar gráficos interactivos:</p>
                        <ul className="list-disc list-inside pl-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                          <li><strong>Para la merma de perfiles:</strong> Agrega un "Gráfico circular" o "Gráfico de barras", y arrastra la columna <strong>Eficiencia (%)</strong> como Métrica y el <strong>Perfil Cód.</strong> como Dimensión.</li>
                          <li><strong>Para ventas:</strong> Agrega un indicador de "Tarjeta de resultados" arrastrando el importe total para sumar tus ingresos en tiempo real.</li>
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* PASO 5 */}
                  <div className="border border-zinc-100 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setActiveStep(activeStep === 4 ? null : 4)}
                      className="w-full flex justify-between items-center p-3 text-xs font-bold text-zinc-800 dark:text-zinc-200 bg-zinc-50/50 dark:bg-zinc-950/40 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-5 h-5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full flex items-center justify-center text-[10px] font-black">5</span>
                        Incrustar tu Reporte en la App
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${activeStep === 4 ? "rotate-90" : ""}`} />
                    </button>
                    {activeStep === 4 && (
                      <div className="p-3 text-[11px] text-zinc-500 leading-relaxed border-t border-zinc-100 dark:border-zinc-800 space-y-2 font-semibold">
                        <p>Una vez que termines de diseñar tu reporte a tu gusto:</p>
                        <ol className="list-decimal list-inside pl-1 space-y-1 text-zinc-600 dark:text-zinc-400">
                          <li>Ve al menú superior, haz clic en <strong>Compartir</strong> (botón con flecha) y selecciona <strong>Insertar informe</strong>.</li>
                          <li>Marca la casilla "Habilitar inserción" y copia el enlace de origen que se encuentra dentro del `src="..."` de la etiqueta iframe (por ejemplo: `https://datastudio.google.com/embed/reporting/xxxx...`).</li>
                          <li>Pega ese enlace en el input de arriba "Pega la URL de inserción (src)..." y haz clic en <strong>Enlazar</strong>. Tu reporte personalizado se cargará permanentemente para toda la empresa en esta pestaña.</li>
                        </ol>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}


      {/* MODAL DETALLES DEL EVENTO CALENDARIO */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start border-b border-zinc-100 dark:border-zinc-800 pb-2.5">
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                selectedEvent.tipo === "visita" ? "bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400" :
                selectedEvent.tipo === "produccion" ? "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400" :
                "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
              }`}>
                {selectedEvent.tipo}
              </span>
              <button onClick={() => setSelectedEvent(null)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <h3 className="text-md font-black text-zinc-900 dark:text-white leading-snug">{selectedEvent.titulo}</h3>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>{new Date(selectedEvent.fechaInicio).toLocaleDateString("es-MX", { weekday: 'long', day: '2-digit', month: 'long' })}</span>
                <span>•</span>
                <span>{new Date(selectedEvent.fechaInicio).toLocaleTimeString("es-MX", { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <User className="w-3.5 h-3.5 text-emerald-600" />
                <span>Asignado:</span>
                <span className="font-bold text-zinc-700 dark:text-zinc-300">{selectedEvent.usuarioNombre}</span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200/50 dark:border-zinc-800 italic">{selectedEvent.descripcion}</p>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={() => {
                  eliminarEvento(selectedEvent.id);
                  setSelectedEvent(null);
                }}
                className="flex items-center gap-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/40 text-red-600 font-bold px-3 py-1.5 rounded-xl text-[10px] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </button>
              <button onClick={() => setSelectedEvent(null)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-1.5 rounded-xl text-xs transition-colors">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR EVENTO */}
      {isCreateEventOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateEvent}
            className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-2.5">
              <h3 className="text-md font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
                <Plus className="w-5 h-5 text-emerald-600" />
                Agendar Evento
              </h3>
              <button type="button" onClick={() => setIsCreateEventOpen(false)} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold">✕</button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Título</label>
                <input
                  type="text"
                  required
                  value={evtTitle}
                  onChange={(e) => setEvtTitle(e.target.value)}
                  placeholder="Visita técnica a la obra"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Descripción</label>
                <textarea
                  rows={2}
                  value={evtDesc}
                  onChange={(e) => setEvtDesc(e.target.value)}
                  placeholder="Detalles sobre el pendiente..."
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              {esAdmin && (
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Tipo de Evento</label>
                  <select
                    value={evtType}
                    onChange={(e) => setEvtType(e.target.value as CalendarEvent["tipo"])}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="visita">Ventas (Mediciones)</option>
                    <option value="produccion">Taller (Fabricación)</option>
                    <option value="instalacion">Logística (Entregas)</option>
                  </select>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Fecha</label>
                  <input
                    type="date"
                    required
                    value={evtDate}
                    onChange={(e) => setEvtDate(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Inicio</label>
                  <input
                    type="time"
                    required
                    value={evtStartHour}
                    onChange={(e) => setEvtStartHour(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Fin</label>
                  <input
                    type="time"
                    required
                    value={evtEndHour}
                    onChange={(e) => setEvtEndHour(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-2 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button type="button" onClick={() => setIsCreateEventOpen(false)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl text-xs">Cancelar</button>
              <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs shadow-sm">Agendar</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL CREAR CARPETA EN DRIVE */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-md font-black text-zinc-950 dark:text-white flex items-center gap-1.5">
              <FolderPlus className="w-5 h-5 text-amber-500 fill-current" />
              Crear Nueva Carpeta en Drive
            </h3>
            
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">Nombre de la Carpeta</label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Ej: Planos de Cancelería"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs">
              <button onClick={() => setIsNewFolderOpen(false)} className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl">Cancelar</button>
              <button onClick={handleCreateNewFolder} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-sm">Crear Carpeta</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISOR PREMIUM DE DOCUMENTOS DE DRIVE (PDF/DOC/SHEET) */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-4xl rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 md:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Header del visor */}
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3 text-left">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-zinc-50 dark:bg-zinc-950 rounded-xl border border-zinc-200/50 dark:border-zinc-800">
                  {getFileIcon(previewFile.tipo)}
                </div>
                <div>
                  <h3 className="text-sm font-black text-zinc-900 dark:text-white truncate max-w-[280px] md:max-w-md">{previewFile.nombre}</h3>
                  <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider">{previewFile.tipo} · {previewFile.tamano}</span>
                </div>
                {(previewFile.tipo === "doc" || previewFile.tipo === "sheet" || previewFile.tipo === "slide") && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(!isEditing)}
                    className={`ml-2 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                      isEditing 
                        ? "bg-amber-500 border-amber-600 text-white shadow-sm shadow-amber-500/10" 
                        : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
                    }`}
                  >
                    {isEditing ? "✓ Vista Previa" : "✏ Editar Texto"}
                  </button>
                )}
              </div>
              <button 
                onClick={() => setPreviewFile(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold p-1 focus:outline-none text-sm"
              >
                ✕
              </button>
            </div>

              {/* Contenido del Documento (Editable o Previsualización) */}
              <div className="bg-zinc-50 dark:bg-zinc-950 p-6 md:p-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-inner max-h-[60vh] overflow-y-auto space-y-6">
                
                {/* Membrete Oficial */}
                <div className="border-b-2 border-double border-zinc-200 dark:border-zinc-800 pb-5 flex flex-col md:flex-row items-center md:items-start justify-between gap-4 text-left">
                  <div className="flex items-center gap-4">
                    {empresa.logoUrl ? (
                      <img src={empresa.logoUrl} alt="Logo" className="w-16 h-16 object-contain rounded-xl bg-white p-1 border border-zinc-200 dark:border-zinc-800 shadow-sm shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center font-bold text-zinc-400 text-xs shrink-0">
                        GA
                      </div>
                    )}
                    <div>
                      <h2 className="text-sm font-black text-zinc-900 dark:text-white uppercase leading-none">{empresa.nombreComercial}</h2>
                      <span className="text-[9px] text-zinc-400 font-bold block mt-1">RFC: {empresa.rfc}</span>
                      <span className="text-[9px] text-zinc-400 font-semibold block leading-tight">{empresa.razonSocial}</span>
                    </div>
                  </div>

                  <div className="text-right text-[9px] text-zinc-400 space-y-0.5 font-semibold">
                    <p>{empresa.calle} {empresa.numero}, Col. {empresa.colonia}</p>
                    <p>{empresa.municipio}, {empresa.estado}, C.P. {empresa.codigoPostal}</p>
                    <p>Tel: {empresa.telefono} | Correo: {empresa.correo}</p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-4 font-sans text-xs text-left">
                    {(previewFile.tipo === "doc" || previewFile.tipo === "slide") && (
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                          Editor de Contenido ({previewFile.tipo === "doc" ? "Contrato" : "Diapositivas"})
                        </label>
                        <textarea
                          value={editedText}
                          onChange={(e) => setEditedText(e.target.value)}
                          className="w-full h-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 font-mono text-[11px] leading-relaxed text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-emerald-600 shadow-sm"
                          placeholder="Modifica el contenido del archivo..."
                        />
                        <span className="text-[9px] text-zinc-400 font-bold block">
                          * Nota: Los saltos de línea se interpretarán automáticamente como párrafos/diapositivas en Google Drive.
                        </span>
                      </div>
                    )}

                    {previewFile.tipo === "sheet" && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">
                          Editar Celdas del Reporte de Nesting
                        </label>
                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm bg-white dark:bg-zinc-900">
                          <table className="w-full text-left border-collapse text-[10.5px]">
                            <thead>
                              <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold uppercase">
                                <th className="p-2">Perfil Cód.</th>
                                <th className="p-2">Largo Tramo</th>
                                <th className="p-2 text-center">Cortes Requeridos</th>
                                <th className="p-2 text-right">Tramos a Utilizar</th>
                                <th className="p-2 text-right">Desperdicio (mm)</th>
                                <th className="p-2 text-right">Eficiencia (%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 font-mono">
                              {nestingRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                  <td className="p-2 font-bold">{row.cod}</td>
                                  <td className="p-2">{row.largo}</td>
                                  <td className="p-2 text-center">
                                    <input
                                      type="text"
                                      value={row.cortes}
                                      onChange={(e) => {
                                        const newRows = [...nestingRows];
                                        newRows[idx].cortes = e.target.value;
                                        setNestingRows(newRows);
                                      }}
                                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-center text-[10px] w-full focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
                                    />
                                  </td>
                                  <td className="p-2 text-right">
                                    <input
                                      type="text"
                                      value={row.tramos}
                                      onChange={(e) => {
                                        const newRows = [...nestingRows];
                                        newRows[idx].tramos = e.target.value;
                                        setNestingRows(newRows);
                                      }}
                                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-right text-[10px] w-12 ml-auto focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
                                    />
                                  </td>
                                  <td className="p-2 text-right">
                                    <input
                                      type="text"
                                      value={row.desperdicio}
                                      onChange={(e) => {
                                        const newRows = [...nestingRows];
                                        newRows[idx].desperdicio = e.target.value;
                                        setNestingRows(newRows);
                                      }}
                                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-right text-[10px] w-24 ml-auto focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
                                    />
                                  </td>
                                  <td className="p-2 text-right font-bold">
                                    <input
                                      type="text"
                                      value={row.eficiencia}
                                      onChange={(e) => {
                                        const newRows = [...nestingRows];
                                        newRows[idx].eficiencia = e.target.value;
                                        setNestingRows(newRows);
                                      }}
                                      className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded px-1.5 py-0.5 text-right text-[10px] w-20 ml-auto focus:outline-none focus:border-emerald-500 text-zinc-800 dark:text-zinc-200"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6 font-serif text-zinc-800 dark:text-zinc-300 text-xs text-left leading-relaxed">
                    {/* 1. DOCUMENTO DE TEXTO / CONTRATO (doc o pdf) */}
                    {(previewFile.tipo === "doc" || previewFile.tipo === "pdf") && (
                      <div className="space-y-4 font-serif">
                        <h3 className="text-center font-black text-sm uppercase tracking-wider text-zinc-900 dark:text-white underline">
                          {previewFile.nombre.includes("Contrato") 
                            ? "CONTRATO DE SUMINISTRO E INSTALACIÓN DE VIDRIO Y ALUMINIO" 
                            : "EXPEDIENTE DIGITAL DE OBRA Y ESPECIFICACIÓN"}
                        </h3>
                        
                        <p className="indent-8 text-justify">
                          Conste por el presente documento el Contrato de Prestación de Servicios de Fabricación y Colocación que celebran, de una parte, <strong>{empresa.razonSocial}</strong> en su carácter de Proveedor Certificado, y de la otra parte, el Cliente cuyos datos se especifican en el Folio Operativo correspondiente de fecha <strong>{new Date(previewFile.fechaCreacion).toLocaleDateString("es-MX")}</strong>.
                        </p>

                        <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-sans text-[10px]">DECLARACIONES:</h4>
                        <p className="text-justify">
                          I. DECLARA EL CONTRATISTA: Ser una persona moral legalmente constituida conforme a las leyes mexicanas, con domicilio comercial en <strong>{empresa.calle} {empresa.numero}, {empresa.colonia}</strong>, con capacidad técnica y económica para cumplir con los requerimientos de la obra.
                        </p>
                        <p className="text-justify">
                          II. DECLARA EL CLIENTE: Que requiere la fabricación e instalación de sistemas de cancelería de vidrio templado, perfiles de aluminio y domos de acuerdo con el desglose técnico y cálculos estructurales previamente validados en el sistema.
                        </p>

                        <h4 className="font-bold text-zinc-900 dark:text-white uppercase tracking-wider font-sans text-[10px]">CLÁUSULAS:</h4>
                        <p className="text-justify">
                          <strong>PRIMERA: OBJETO.</strong> El contratista se obliga a ejecutar bajo su entera responsabilidad, utilizando personal especializado y perfiles certificados del proveedor <strong>{empresa.proveedorCertificado}</strong>, los trabajos de cancelería descritos en los planos y especificaciones anexas.
                        </p>
                        <p className="text-justify">
                          <strong>SEGUNDA: PLAZO DE ENTREGA.</strong> Las partes convienen en que los trabajos descritos se entregarán conforme al cronograma de obra agendado dinámicamente en el módulo de logística y entregas de la suite.
                        </p>

                        <div className="grid grid-cols-2 gap-4 pt-10 text-center font-sans text-[10px] font-bold text-zinc-400">
                          <div>
                            <div className="border-b border-zinc-300 dark:border-zinc-800 h-10 w-44 mx-auto" />
                            <span className="block mt-1">Por el Contratista</span>
                          </div>
                          <div>
                            <div className="border-b border-zinc-300 dark:border-zinc-800 h-10 w-44 mx-auto" />
                            <span className="block mt-1">Por el Cliente</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* 2. HOJA DE CÁLCULO / NESTING (sheet) */}
                    {previewFile.tipo === "sheet" && (
                      <div className="space-y-4 font-sans text-xs">
                        <h3 className="text-center font-black text-sm uppercase tracking-wider text-zinc-900 dark:text-white">
                          CÁLCULO E INDUSTRIALIZACIÓN - OPTIMIZACIÓN LINEAL (NESTING)
                        </h3>
                        <p className="text-zinc-500 dark:text-zinc-400">
                          Reporte de optimización de barras de aluminio para corte en taller. Este documento contiene los cálculos del optimizador 1D ejecutado el <strong>{new Date(previewFile.fechaCreacion).toLocaleDateString("es-MX")}</strong>.
                        </p>

                        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                          <table className="w-full text-left border-collapse text-[10.5px]">
                            <thead>
                              <tr className="bg-zinc-100 dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold uppercase">
                                <th className="p-2">Perfil Cód.</th>
                                <th className="p-2">Largo Tramo (m)</th>
                                <th className="p-2 text-center">Cortes Requeridos</th>
                                <th className="p-2 text-right">Tramos a Utilizar</th>
                                <th className="p-2 text-right">Desperdicio (mm)</th>
                                <th className="p-2 text-right">Eficiencia (%)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-zinc-800 dark:text-zinc-200 font-mono">
                              {nestingRows.map((row, idx) => (
                                <tr key={idx} className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40">
                                  <td className="p-2 font-bold">{row.cod}</td>
                                  <td className="p-2">{row.largo}</td>
                                  <td className="p-2 text-center">{row.cortes}</td>
                                  <td className="p-2 text-right">{row.tramos}</td>
                                  <td className="p-2 text-right text-emerald-600 font-bold">{row.desperdicio}</td>
                                  <td className="p-2 text-right text-emerald-600 font-bold">{row.eficiencia}</td>
                                </tr>
                              ))}
                              <tr className="hover:bg-zinc-50 dark:hover:bg-zinc-900/40 border-t-2 border-zinc-200 dark:border-zinc-800 font-bold">
                                <td className="p-2 font-sans" colSpan={3}>Totales de Optimización</td>
                                <td className="p-2 text-right">5 tramos</td>
                                <td className="p-2 text-right text-emerald-600">750 mm</td>
                                <td className="p-2 text-right text-emerald-600">98.0% prom.</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="bg-zinc-100 dark:bg-zinc-900/50 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 leading-normal text-zinc-500 font-sans">
                          💡 <strong>Aviso del Taller:</strong> Este cálculo de corte es de uso confidencial e interno para el personal habilitador de <strong>{empresa.nombreComercial}</strong>.
                        </div>
                      </div>
                    )}

                    {/* 3. PRESENTACIONES / DIAPOSITIVAS (slide) */}
                    {previewFile.tipo === "slide" && (
                      <div className="space-y-4 text-center py-6 font-sans">
                        <div className="w-16 h-16 bg-orange-100 dark:bg-orange-950/20 text-orange-600 rounded-full flex items-center justify-center mx-auto border border-orange-200">
                          <Presentation className="w-8 h-8" />
                        </div>
                        <h3 className="font-black text-sm uppercase tracking-wider text-zinc-900 dark:text-white">
                          Presentación Corporativa de Obras
                        </h3>
                        <p className="text-zinc-500 max-w-md mx-auto text-[11px] leading-relaxed">
                          Diapositivas comerciales preparadas para el cliente con fotografías de referencias de pérgolas y canceles instalados por <strong>{empresa.nombreComercial}</strong>.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

            {/* Acciones del Visor */}
            <div className="flex justify-between items-center border-t border-zinc-200 dark:border-zinc-800 pt-4 text-xs font-bold">
              <span className="text-zinc-400 font-semibold">Integración y Sincronización Google Workspace activa</span>
              <div className="flex gap-2">
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl transition-colors focus:outline-none"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveChanges}
                      disabled={isSyncing}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer transition-colors focus:outline-none flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {isSyncing ? "Guardando..." : "Guardar Cambios"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setPreviewFile(null)}
                      className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 px-4 py-2 rounded-xl transition-colors focus:outline-none"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      onClick={() => descargarArchivo(previewFile.id, previewFile.tipo, previewFile.nombre)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl shadow-md shadow-emerald-500/10 cursor-pointer transition-colors focus:outline-none"
                    >
                      Descargar Archivo
                    </button>
                  </>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
