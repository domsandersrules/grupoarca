import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useDeliveriesStore, OrdenEntrega } from "../deliveriesStore";
import { useAuthStore } from "../../auth/authStore";
import { useConfigStore } from "@/features/config/configStore";
import { 
  Truck, MapPin, CheckCircle2, AlertTriangle, 
  Map, UserCheck, Image, Signature, Camera, Info, Navigation,
  X, Plus, Link as LinkIcon, Upload, Route, Warehouse, Clock, ArrowRight,
  Trash2
} from "lucide-react";

// Lista de fotos simuladas premium de alta resolución (consistentes con ventas)
const FOTOS_INSTALACION = [
  { id: "img-1", label: "Cancel de Baño Templado", url: "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80" },
  { id: "img-2", label: "Ventanal Corredizo Minimalista", url: "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80" },
  { id: "img-3", label: "Ventana de Aluminio Cocina", url: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=600&q=80" },
  { id: "img-4", label: "Domo de Cristal Templado", url: "https://images.unsplash.com/photo-1527359353496-40e86b242856?auto=format&fit=crop&w=600&q=80" },
  { id: "img-5", label: "Pérgola de Aluminio", url: "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80" },
  { id: "img-6", label: "Cancelería Negro Mate", url: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=600&q=80" }
];

// Interceptor global para evitar que errores asíncronos de Google Maps tiren la app en Dev (Next.js console error overlay)
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    const msg = args.map(arg => typeof arg === 'object' ? JSON.stringify(arg) : String(arg)).join(" ");
    if (
      msg.includes("Google Maps") ||
      msg.includes("Geocoding Service") ||
      msg.includes("Directions Service") ||
      msg.includes("Distance Matrix Service") ||
      msg.includes("Places Service") ||
      msg.includes("ApiProjectMapError") ||
      msg.includes("maps-no-account") ||
      msg.includes("googleapis.com")
    ) {
      // Usamos console.warn para que el aviso aparezca en consola en amarillo
      // sin activar el overlay rojo de desarrollo de Next.js (el cual intercepta console.error)
      console.warn("⚠️ [Google Maps Suppressed to prevent Dev Overlay Crash]:", ...args);
      return;
    }
    originalConsoleError(...args);
  };

  (window as any).gm_authFailure = () => {
    console.warn("Google Maps authentication failure detected (gm_authFailure).");
  };
}

// ─── Utilidades de Google Maps ────────────────────────────────────────────────

const loadGoogleMapsScript = (callback: () => void) => {
  if (typeof window === "undefined") return;
  if ((window as any).google && (window as any).google.maps) {
    callback();
    return;
  }
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const existingScript = document.getElementById("google-maps-script");
  if (!existingScript) {
    const script = document.createElement("script");
    script.id = "google-maps-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (callback) callback();
    };
    script.onerror = () => {
      console.error("Failed to load Google Maps script tag.");
    };
    document.head.appendChild(script);
  } else {
    const interval = setInterval(() => {
      if ((window as any).google && (window as any).google.maps) {
        clearInterval(interval);
        callback();
      }
    }, 100);
  }
};

/**
 * Obtiene las coordenadas de la bodega/sucursal de origen.
 * Usa coordenadas hardcodeadas de respaldo si no hay API key o no está geocodificada.
 */
const resolveOriginCoords = (sucursalId: string) => {
  if (sucursalId === "suc-2") {
    // Sucursal GDL: Av. Patria 1024, Jardines de la Patria, Zapopan, Jalisco
    return { lat: 20.693158, lng: -103.417387 };
  }
  // Matriz Central Acapulco: Calle Nicolás Bravo Número 36 Local 1 y 2, Colonia Llano Largo, Acapulco
  return { lat: 16.820257, lng: -99.824286 };
};

/**
 * Construye la dirección textual completa de la bodega a partir de la configuración de sucursal.
 */
const buildWarehouseAddress = (sucursalId: string, sucursales: any[]) => {
  const suc = sucursales.find((s) => s.id === sucursalId);
  if (!suc) {
    return "Calle Nicolás Bravo Número 36 Local 1 y 2, Col. Llano Largo, Acapulco de Juárez, Guerrero";
  }
  return `${suc.calle} ${suc.numero}, ${suc.colonia}, ${suc.municipio}, ${suc.estado}, C.P. ${suc.codigoPostal}`;
};

const geocodeAddress = (address: string): Promise<{ lat: number; lng: number }> => {
  return new Promise((resolve, reject) => {
    if (!(window as any).google || !(window as any).google.maps) {
      reject("Google Maps SDK not loaded");
      return;
    }
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address }, (results: any, status: any) => {
      if (status === "OK" && results && results[0]) {
        const loc = results[0].geometry.location;
        resolve({ lat: loc.lat(), lng: loc.lng() });
      } else {
        reject("Geocoding failed with status: " + status);
      }
    });
  });
};

// ─── Componente Principal ─────────────────────────────────────────────────────

export default function DeliveryPlanner() {
  const { ordenesEntrega, actualizarEstatusEntrega } = useDeliveriesStore();
  const { usuarioActivo } = useAuthStore();
  const { sucursalActivaId, sucursales } = useConfigStore();

  const filteredDeliveries = useMemo(() => {
    return ordenesEntrega.filter((d) => 
      sucursalActivaId === "todos" || d.sucursalId === sucursalActivaId
    );
  }, [ordenesEntrega, sucursalActivaId]);

  const [activeDeliveryId, setActiveDeliveryId] = useState<string | null>(null);
  const [mapsLoaded, setMapsLoaded] = useState(false);

  // Información calculada de la ruta activa en el panel del mapa
  const [routeInfo, setRouteInfo] = useState<{
    distance: string;
    duration: string;
    originName: string;
    originAddress: string;
    destAddress: string;
  } | null>(null);

  // Estado de cálculo de ruta: "idle" | "calculating" | "done" | "error"
  const [routeStatus, setRouteStatus] = useState<"idle" | "calculating" | "done" | "error">("idle");

  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);

  // Referencias para los marcadores de origen (bodega) y destino (cliente)
  const originMarkerRef = useRef<any>(null);
  const destMarkerRef = useRef<any>(null);

  /**
   * Limpia los marcadores individuales y el renderer de dirección del mapa.
   * Se llama antes de trazar una nueva ruta para evitar marcadores duplicados.
   */
  const clearMapOverlays = useCallback(() => {
    if (directionsRendererRef.current) {
      directionsRendererRef.current.setMap(null);
      directionsRendererRef.current = null;
    }
    if (originMarkerRef.current) {
      originMarkerRef.current.setMap(null);
      originMarkerRef.current = null;
    }
    if (destMarkerRef.current) {
      destMarkerRef.current.setMap(null);
      destMarkerRef.current = null;
    }
  }, []);

  const activeDelivery = useMemo(() => {
    if (activeDeliveryId) {
      return filteredDeliveries.find((d) => d.id === activeDeliveryId) || filteredDeliveries[0];
    }
    return filteredDeliveries[0];
  }, [filteredDeliveries, activeDeliveryId]);

  useEffect(() => {
    loadGoogleMapsScript(() => {
      setMapsLoaded(true);
    });
  }, []);

  // ─── Inicialización del mapa al cargar/cambiar entrega activa ─────────────

  useEffect(() => {
    if (!mapsLoaded || !activeDelivery) return;

    const timer = setTimeout(() => {
      if (!mapRef.current) return;

      const originCoords = resolveOriginCoords(activeDelivery.sucursalId);
      const centerLatLng = new (window as any).google.maps.LatLng(originCoords.lat, originCoords.lng);

      // Crear la instancia del mapa si no existe aún
      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
          zoom: 12,
          center: centerLatLng,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: true,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        });
      } else {
        // Si ya existe, solo re-centrar en la bodega
        mapInstanceRef.current.setCenter(centerLatLng);
        mapInstanceRef.current.setZoom(12);
      }

      // Limpiar overlays anteriores al cambiar de entrega
      clearMapOverlays();

      // Reiniciar info de ruta al cambiar de entrega
      setRouteInfo(null);
      setRouteStatus("idle");
    }, 200);

    return () => clearTimeout(timer);
  }, [mapsLoaded, activeDelivery, clearMapOverlays]);

  // ─── Función de cálculo de ruta (se dispara con el botón "Gestionar Ruta") ──

  /**
   * Calcula la ruta más eficiente usando Google Directions API.
   * Origen: Bodega/Sucursal configurada.
   * Destino: Coordenadas del pin de la cotización (coordenadasEntrega) o geocodificación de la dirección.
   */
  const handleGestionarRuta = useCallback(async (delivery: OrdenEntrega) => {
    // Asegurar que esta entrega quede activa en el panel
    setActiveDeliveryId(delivery.id);

    if (!mapsLoaded) {
      alert("Google Maps aún se está cargando. Por favor espera unos segundos.");
      return;
    }

    setRouteStatus("calculating");
    setRouteInfo(null);

    // Construir datos de origen (bodega)
    const originCoords = resolveOriginCoords(delivery.sucursalId);
    const originAddress = buildWarehouseAddress(delivery.sucursalId, sucursales);
    const sucursal = sucursales.find((s) => s.id === delivery.sucursalId);
    const originName = sucursal ? sucursal.nombre : "Bodega Grupo Arca";

    // Obtener coordenadas destino:
    // Prioridad 1 → pin exacto colocado en el mapa durante la cotización (coordenadasEntrega)
    // Prioridad 2 → geocodificar la dirección textual
    let destCoords: { lat: number; lng: number };
    try {
      if (
        delivery.coordenadasEntrega &&
        (delivery.coordenadasEntrega.lat !== 0 || delivery.coordenadasEntrega.lng !== 0)
      ) {
        destCoords = delivery.coordenadasEntrega;
      } else {
        destCoords = await geocodeAddress(delivery.direccion);
      }
    } catch (err) {
      console.error("Error obteniendo coordenadas de destino:", err);
      destCoords = originCoords;
    }

    // ── Abrir Google Maps (app en móvil / web en escritorio) con la ruta calculada ──
    // Usa coordenadas para máxima precisión. El parámetro travelmode=driving
    // activa automáticamente la navegación giro a giro en el teléfono del conductor.
    const gmapsUrl =
      `https://www.google.com/maps/dir/?api=1` +
      `&origin=${originCoords.lat},${originCoords.lng}` +
      `&destination=${destCoords.lat},${destCoords.lng}` +
      `&travelmode=driving`;

    window.open(gmapsUrl, "_blank", "noopener,noreferrer");

    if (!mapRef.current) {
      setRouteStatus("error");
      return;
    }

    const originLatLng = new (window as any).google.maps.LatLng(originCoords.lat, originCoords.lng);
    const destLatLng = new (window as any).google.maps.LatLng(destCoords.lat, destCoords.lng);

    // Crear el mapa si aún no existe
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, {
        zoom: 12,
        center: originLatLng,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        styles: [
          {
            featureType: "poi",
            elementType: "labels",
            stylers: [{ visibility: "off" }]
          }
        ]
      });
    }

    // Limpiar overlays anteriores (renderer + marcadores previos)
    clearMapOverlays();

    // ── Marcador AZUL: Bodega / Taller de Origen ──────────────────────────────
    originMarkerRef.current = new (window as any).google.maps.Marker({
      position: originLatLng,
      map: mapInstanceRef.current,
      title: `🏭 ${originName} (Bodega/Origen)`,
      animation: (window as any).google.maps.Animation.DROP,
      icon: {
        // Pin azul personalizado con tamaño aumentado para visibilidad
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new (window as any).google.maps.Size(44, 44),
        anchor: new (window as any).google.maps.Point(22, 44)
      },
      zIndex: 10
    });

    // Ventana de información al hacer clic en la bodega
    const infoWindowOrigin = new (window as any).google.maps.InfoWindow({
      content: `
        <div style="font-family: system-ui, sans-serif; padding: 4px 2px; max-width: 220px;">
          <p style="font-weight: 800; color: #1d4ed8; font-size: 12px; margin: 0 0 4px;">🏭 Bodega / Taller de Origen</p>
          <p style="font-size: 11px; color: #374151; margin: 0; line-height: 1.4;">${originName}</p>
          <p style="font-size: 10px; color: #6b7280; margin: 2px 0 0; line-height: 1.3;">${originAddress}</p>
        </div>
      `
    });
    originMarkerRef.current.addListener("click", () => {
      infoWindowOrigin.open(mapInstanceRef.current, originMarkerRef.current);
    });

    // ── Marcador ROJO: Domicilio del Cliente / Destino ────────────────────────
    destMarkerRef.current = new (window as any).google.maps.Marker({
      position: destLatLng,
      map: mapInstanceRef.current,
      title: `📦 ${delivery.clienteNombre} (Destino)`,
      animation: (window as any).google.maps.Animation.DROP,
      icon: {
        // Pin rojo personalizado con tamaño aumentado para visibilidad
        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        scaledSize: new (window as any).google.maps.Size(44, 44),
        anchor: new (window as any).google.maps.Point(22, 44)
      },
      zIndex: 10
    });

    // Ventana de información al hacer clic en el destino
    const pinLabel = delivery.coordenadasEntrega ? "📍 Pin exacto del mapa de cotización" : "📍 Dirección geocodificada";
    const infoWindowDest = new (window as any).google.maps.InfoWindow({
      content: `
        <div style="font-family: system-ui, sans-serif; padding: 4px 2px; max-width: 220px;">
          <p style="font-weight: 800; color: #dc2626; font-size: 12px; margin: 0 0 4px;">📦 Destino de Entrega</p>
          <p style="font-size: 11px; color: #374151; margin: 0; line-height: 1.4;">${delivery.clienteNombre}</p>
          <p style="font-size: 10px; color: #6b7280; margin: 2px 0 0; line-height: 1.3;">${delivery.direccion}</p>
          <p style="font-size: 9px; color: #059669; margin: 4px 0 0; font-weight: 600;">${pinLabel}</p>
        </div>
      `
    });
    destMarkerRef.current.addListener("click", () => {
      infoWindowDest.open(mapInstanceRef.current, destMarkerRef.current);
    });

    // ── Ajustar el mapa para que ambos pines queden visibles (fitBounds) ──────
    const bounds = new (window as any).google.maps.LatLngBounds();
    bounds.extend(originLatLng);
    bounds.extend(destLatLng);
    mapInstanceRef.current.fitBounds(bounds, { top: 50, right: 30, bottom: 30, left: 30 });

    // ── Intentar trazar la ruta con DirectionsService (requiere API key) ───────
    // Si falla, los marcadores independientes ya están visibles con Haversine como fallback.
    const directionsService = new (window as any).google.maps.DirectionsService();

    // El renderer usará suppressMarkers=true porque ya colocamos los pines manualmente
    directionsRendererRef.current = new (window as any).google.maps.DirectionsRenderer({
      map: mapInstanceRef.current,
      suppressMarkers: true,   // No superponer los marcadores default encima de los nuestros
      polylineOptions: {
        strokeColor: "#059669",  // Verde esmeralda para la línea de ruta
        strokeOpacity: 0.85,
        strokeWeight: 6
      }
    });

    directionsService.route(
      {
        origin: originLatLng,
        destination: destLatLng,
        travelMode: (window as any).google.maps.TravelMode.DRIVING,
        provideRouteAlternatives: false
      },
      (result: any, status: any) => {
        if (status === "OK" && directionsRendererRef.current) {
          // Trazar la polilínea de ruta (los marcadores ya están puestos manualmente)
          directionsRendererRef.current.setDirections(result);

          const leg = result.routes[0].legs[0];
          setRouteInfo({
            distance: leg.distance.text,
            duration: leg.duration.text,
            originName,
            originAddress,
            destAddress: delivery.direccion
          });
          setRouteStatus("done");
        } else {
          // Sin API key o sin conexión: los pines ya están. Solo calcular Haversine.
          console.warn("DirectionsService no disponible:", status, "— mostrando pines y distancia estimada.");

          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
            directionsRendererRef.current = null;
          }

          const R = 6371;
          const dLat = (destCoords.lat - originCoords.lat) * Math.PI / 180;
          const dLon = (destCoords.lng - originCoords.lng) * Math.PI / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(originCoords.lat * Math.PI / 180) *
            Math.cos(destCoords.lat * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const distKm = (R * c).toFixed(1);
          const timeMin = Math.round(parseFloat(distKm) * 2);

          setRouteInfo({
            distance: `~${distKm} km (lineal est.)`,
            duration: `~${timeMin} min (est.)`,
            originName,
            originAddress,
            destAddress: delivery.direccion
          });
          setRouteStatus("error");
        }
      }
    );
  }, [mapsLoaded, sucursales, clearMapOverlays]);

  // ─── Estado del Modal de Entrega ──────────────────────────────────────────

  const [selectedEntrega, setSelectedEntrega] = useState<OrdenEntrega | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState<OrdenEntrega["estado"]>("programado");
  const [notas, setNotas] = useState("");
  const [fotosSeleccionadas, setFotosSeleccionadas] = useState<string[]>([]);
  const [firmaConfirmada, setFirmaConfirmada] = useState(false);
  const [customFotoUrl, setCustomFotoUrl] = useState("");

  const [fechaProg, setFechaProg] = useState("");
  const [horaProg, setHoraProg] = useState("");
  const [choferAsig, setChoferAsig] = useState("");
  const [rutaAsig, setRutaAsig] = useState("");
  const [vehiculoAsig, setVehiculoAsig] = useState("");

  const agregarFotoPorUrl = () => {
    if (!customFotoUrl.trim()) return;
    if (!customFotoUrl.startsWith("http://") && !customFotoUrl.startsWith("https://")) {
      alert("Por favor ingresa una dirección URL válida que empiece con http:// o https://");
      return;
    }
    if (fotosSeleccionadas.includes(customFotoUrl)) {
      alert("Esta foto ya ha sido agregada.");
      return;
    }
    setFotosSeleccionadas([...fotosSeleccionadas, customFotoUrl]);
    setCustomFotoUrl("");
  };

  const eliminarFoto = (url: string) => {
    setFotosSeleccionadas(fotosSeleccionadas.filter((f) => f !== url));
  };

  const handleLocalFilesUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    Array.from(files).forEach((file) => {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Url = reader.result as string;
          setFotosSeleccionadas((prev) => {
            if (prev.includes(base64Url)) return prev;
            return [...prev, base64Url];
          });
        };
        reader.readAsDataURL(file);
      }
    });
  };

  // Canvas Ref para dibujo de firma
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const esLogisticaOAdmin = usuarioActivo.rol === "logistica" || usuarioActivo.rol === "admin";
  const esLectura = !esLogisticaOAdmin;

  useEffect(() => {
    if (selectedEntrega) {
      setNuevoEstado(selectedEntrega.estado);
      setNotas(selectedEntrega.notas || "");
      setFotosSeleccionadas(selectedEntrega.evidenciaFotos || []);
      setFirmaConfirmada(!!selectedEntrega.firmaCliente);

      setFechaProg(selectedEntrega.fechaProgramada ? selectedEntrega.fechaProgramada.split("T")[0] : "");
      setHoraProg(selectedEntrega.horaProgramada || "09:30 AM");
      setChoferAsig(selectedEntrega.choferAsignado || "");
      setRutaAsig(selectedEntrega.rutaAsignada || "");
      setVehiculoAsig(selectedEntrega.vehiculoAsignado || "");
    }
  }, [selectedEntrega]);

  // Callback Ref para inicializar y redimensionar el canvas tan pronto se monta en el DOM
  const canvasRefCallback = useCallback((canvas: HTMLCanvasElement | null) => {
    if (canvas) {
      canvasRef.current = canvas;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (w && h) {
        const dpr = window.devicePixelRatio || 1;
        const targetW = w * dpr;
        const targetH = h * dpr;
        
        // Evitamos reiniciar/limpiar si ya tiene las dimensiones correctas
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
          
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 3 * dpr;
            ctx.strokeStyle = "#09090b";
            
            // Cargar firma preexistente si la hay
            if (selectedEntrega?.firmaCliente) {
              const img = new window.Image();
              img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              };
              img.src = selectedEntrega.firmaCliente;
            }
          }
        }
      }
    } else {
      canvasRef.current = null;
    }
  }, [selectedEntrega]);

  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const w = canvas.clientWidth;
        const h = canvas.clientHeight;
        if (w && h) {
          const dpr = window.devicePixelRatio || 1;
          const targetW = w * dpr;
          const targetH = h * dpr;
          if (canvas.width !== targetW || canvas.height !== targetH) {
            const tempCanvas = document.createElement("canvas");
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext("2d");
            if (tempCtx) {
              tempCtx.drawImage(canvas, 0, 0);
            }
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.lineCap = "round";
              ctx.lineJoin = "round";
              ctx.lineWidth = 3 * dpr;
              ctx.strokeStyle = "#09090b";
              ctx.drawImage(tempCanvas, 0, 0, tempCanvas.width, tempCanvas.height, 0, 0, targetW, targetH);
            }
          }
        }
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Mapear coordenadas de la pantalla (CSS) a coordenadas físicas del lienzo (Canvas Buffer)
  const getMousePos = (canvas: HTMLCanvasElement, e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const getTouchPos = (canvas: HTMLCanvasElement, touchEvent: React.TouchEvent<HTMLCanvasElement>) => {
    const rect = canvas.getBoundingClientRect();
    const touch = touchEvent.touches[0] || touchEvent.changedTouches[0];
    return {
      x: (touch.clientX - rect.left) * (canvas.width / rect.width),
      y: (touch.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (esLectura) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    const dpr = window.devicePixelRatio || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = "#09090b";
    
    ctx.beginPath();
    const pos = getMousePos(canvas, e);
    ctx.moveTo(pos.x, pos.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || esLectura) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getMousePos(canvas, e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    setFirmaConfirmada(true);
  };

  const startDrawingTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (esLectura) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    
    const dpr = window.devicePixelRatio || 1;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 3 * dpr;
    ctx.strokeStyle = "#09090b";
    
    ctx.beginPath();
    const touchPos = getTouchPos(canvas, e);
    ctx.moveTo(touchPos.x, touchPos.y);
    setIsDrawing(true);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || esLectura) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    e.preventDefault();
    const touchPos = getTouchPos(canvas, e);
    ctx.lineTo(touchPos.x, touchPos.y);
    ctx.stroke();
    setFirmaConfirmada(true);
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFirmaConfirmada(false);
  };

  const handleSaveEntrega = () => {
    if (!selectedEntrega) return;

    if (nuevoEstado === "entregado" && fotosSeleccionadas.length === 0) {
      alert("Error operacional: Para finalizar el proceso e instalar el trabajo, debes seleccionar/capturar al menos una fotografía de la evidencia de instalación terminada para redes sociales.");
      return;
    }

    let firmaDataUrl = selectedEntrega.firmaCliente;
    let fotosAGuardar = fotosSeleccionadas;

    if (nuevoEstado === "programado" || nuevoEstado === "en_ruta") {
      firmaDataUrl = undefined;
      fotosAGuardar = [];
    } else {
      if (canvasRef.current && firmaConfirmada && nuevoEstado === "entregado") {
        firmaDataUrl = canvasRef.current.toDataURL();
      }
      if (nuevoEstado === "incidencia") {
        firmaDataUrl = undefined;
      }
    }

    actualizarEstatusEntrega(
      selectedEntrega.id, 
      nuevoEstado, 
      notas, 
      firmaDataUrl, 
      fotosAGuardar, 
      fechaProg, 
      horaProg, 
      choferAsig, 
      rutaAsig, 
      vehiculoAsig
    );
    setSelectedEntrega(null);
  };

  const toggleFoto = (url: string) => {
    if (fotosSeleccionadas.includes(url)) {
      setFotosSeleccionadas(fotosSeleccionadas.filter((f) => f !== url));
    } else {
      setFotosSeleccionadas([...fotosSeleccionadas, url]);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 px-4 md:px-8 max-w-[95vw] 2xl:max-w-[1500px] mx-auto">
      
      {/* HEADER DE ENTREGAS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-200 dark:border-zinc-800 pb-5">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-zinc-950 dark:text-white flex items-center gap-2">
            <Truck className="w-8 h-8 text-emerald-600" />
            Control de Rutas & Instalación
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Planificación de entregas a domicilio, evidencias de instalación y captación de firmas del cliente.
          </p>
        </div>

        {esLectura && (
          <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900 p-3 rounded-xl max-w-md">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
            <p className="text-xs text-blue-700 dark:text-blue-300 font-medium">
              Vista de lectura: Solo los perfiles de <strong>Logística</strong> o <strong>Administradores</strong> pueden actualizar rutas, firmas y evidencias.
            </p>
          </div>
        )}
      </div>

      {/* DASHBOARD DE ENTREGAS: LISTA + MAPA DE RUTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LISTADO DE ENTREGAS */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest">
            Órdenes de Entrega Activas
          </h2>

          <div className="space-y-4">
            {filteredDeliveries.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 text-center text-zinc-400 dark:text-zinc-600 text-sm">
                No hay rutas ni entregas activas registradas en el sistema.
              </div>
            ) : (
              filteredDeliveries.map((del) => {
                const isActive = activeDelivery && activeDelivery.id === del.id;

                // Dirección de bodega de origen (basada en sucursal configurada)
                const warehouseAddress = buildWarehouseAddress(del.sucursalId, sucursales);
                const sucursal = sucursales.find((s) => s.id === del.sucursalId);
                const warehouseName = sucursal ? sucursal.nombre : "Bodega Grupo Arca";

                // Verificar si tiene pin de coordenadas exacto desde cotización
                const hasPinCoords = del.coordenadasEntrega &&
                  (del.coordenadasEntrega.lat !== 0 || del.coordenadasEntrega.lng !== 0);

                return (
                  <div 
                    key={del.id}
                    onClick={() => setActiveDeliveryId(del.id)}
                    className={`cursor-pointer bg-white dark:bg-zinc-900 border p-5 rounded-2xl shadow-sm hover:shadow-md transition-all space-y-4 ${
                      isActive 
                        ? "border-emerald-500 ring-2 ring-emerald-500/10 dark:border-emerald-500" 
                        : "border-zinc-200 dark:border-zinc-800"
                    }`}
                  >
                    {/* Encabezado Orden */}
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 font-black text-xs px-2.5 py-1 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                          {del.folioTaller}
                        </span>
                        <h3 className="font-bold text-zinc-800 dark:text-white">
                          {del.clienteNombre}
                        </h3>
                      </div>

                      {/* Badge de Estado */}
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full border ${
                        del.estado === "entregado" ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40" :
                        del.estado === "en_ruta" ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40" :
                        del.estado === "incidencia" ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/40" :
                        "bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                      }`}>
                        {del.estado.replace("_", " ")}
                      </span>
                    </div>

                    {/* Bloque de Ruta: Origen → Destino */}
                    <div className="space-y-2">
                      
                      {/* Dirección Origen: Bodega */}
                      <div className="flex items-start gap-2 text-xs bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 p-3 rounded-xl">
                        <Warehouse className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-black text-blue-700 dark:text-blue-400 text-[10px] uppercase tracking-wider block mb-0.5">
                            Origen · Bodega / Taller
                          </span>
                          <p className="font-semibold text-blue-800 dark:text-blue-300 text-[11px]">
                            {warehouseName}
                          </p>
                          <p className="text-blue-700 dark:text-blue-400 mt-0.5 leading-snug">
                            {warehouseAddress}
                          </p>
                        </div>
                      </div>

                      {/* Flecha de ruta */}
                      <div className="flex items-center justify-center gap-2 text-zinc-400">
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                        <ArrowRight className="w-4 h-4 text-emerald-500" />
                        <div className="flex-1 h-px bg-zinc-200 dark:bg-zinc-800" />
                      </div>

                      {/* Dirección Destino: Pin del mapa de cotización */}
                      <div className="flex items-start gap-2 text-xs bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 p-3 rounded-xl">
                        <MapPin className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <span className="font-black text-red-700 dark:text-red-400 text-[10px] uppercase tracking-wider">
                              Destino · Domicilio del Cliente
                            </span>
                            {hasPinCoords && (
                              <span className="bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[9px] font-black px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-900/40 flex items-center gap-1 shrink-0">
                                📍 PIN GPS
                              </span>
                            )}
                          </div>
                          <p className="text-red-700 dark:text-red-300 font-semibold leading-snug text-[11px]">
                            {del.direccion}
                          </p>
                          {hasPinCoords && (
                            <p className="text-red-500 dark:text-red-500 mt-0.5 font-mono text-[9px]">
                              LAT {del.coordenadasEntrega!.lat.toFixed(6)} · LNG {del.coordenadasEntrega!.lng.toFixed(6)}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Programación de Logística */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-zinc-50/50 dark:bg-zinc-950/40 p-3.5 rounded-xl border border-zinc-200/40 dark:border-zinc-800 text-[11px] leading-tight">
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5 uppercase text-[9px] tracking-wider">Fecha / Hora:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">
                          {del.fechaProgramada ? new Date(del.fechaProgramada + "T00:00:00").toLocaleDateString("es-MX", { day: '2-digit', month: 'short', year: 'numeric' }) : "Pendiente"} · <span className="text-emerald-600 dark:text-emerald-400 font-bold">{del.horaProgramada || "09:30 AM"}</span>
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5 uppercase text-[9px] tracking-wider">Chofer Asignado:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">{del.choferAsignado || "No asignado"}</p>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5 uppercase text-[9px] tracking-wider">Ruta Programada:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">{del.rutaAsignada || "No asignada"}</p>
                      </div>
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 block mb-0.5 uppercase text-[9px] tracking-wider">Vehículo / Placas:</span>
                        <p className="font-semibold text-zinc-800 dark:text-zinc-200">{del.vehiculoAsignado || "No asignado"}</p>
                      </div>
                    </div>

                    {/* Detalles Extras (Notas, Firma y Fotos) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-zinc-400 dark:text-zinc-500 block mb-1">Instrucciones / Notas:</span>
                        <p className="text-zinc-700 dark:text-zinc-300 italic">
                          {del.notas || "Sin instrucciones añadidas."}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {del.firmaCliente && (
                          <div className="border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <Signature className="w-3 h-3 text-emerald-600" />
                              Firma Cliente
                            </span>
                            <img src={del.firmaCliente} className="h-10 w-28 object-contain filter dark:invert dark:contrast-200" alt="Firma Cliente" />
                          </div>
                        )}

                        {del.evidenciaFotos && del.evidenciaFotos.length > 0 && (
                          <div className="border border-zinc-200 dark:border-zinc-800 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-950 flex flex-col items-center">
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                              <Image className="w-3 h-3 text-emerald-600" />
                              Evidencias ({del.evidenciaFotos.length})
                            </span>
                            <div className="flex gap-1">
                              {del.evidenciaFotos.map((f, i) => (
                                <img key={i} src={f} className="w-7 h-7 object-cover rounded-md" alt="Evidencia" />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Acciones */}
                    <div className="flex justify-end gap-2 border-t border-zinc-200 dark:border-zinc-800 pt-3">
                      
                      {/* Botón: Gestionar Ruta → Calcula la ruta eficiente en el mapa */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGestionarRuta(del);
                        }}
                        disabled={routeStatus === "calculating" && activeDelivery?.id === del.id}
                        className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors shadow-sm"
                        title="Calcular la ruta más eficiente desde la bodega hasta el domicilio del cliente"
                      >
                        {routeStatus === "calculating" && activeDelivery?.id === del.id ? (
                          <>
                            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Calculando...
                          </>
                        ) : (
                          <>
                            <Route className="w-3.5 h-3.5" />
                            Gestionar Ruta
                          </>
                        )}
                      </button>

                      {/* Botón: Actualizar Entrega → Abre modal de firma, fotos, estatus */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEntrega(del);
                        }}
                        className="flex items-center gap-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-3.5 py-1.5 rounded-xl text-xs transition-colors"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        {esLectura ? "Ver Detalles" : "Actualizar Entrega"}
                      </button>
                    </div>

                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* VISUALIZADOR DE RUTA DE GOOGLE MAPS */}
        <div className="space-y-4">
          <h2 className="text-sm font-black text-zinc-400 uppercase tracking-widest">
            Visualizador de Ruta en Tiempo Real
          </h2>
          
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 shadow-sm flex flex-col space-y-4 min-h-[450px] relative overflow-hidden">
            
            {/* Tarjeta de Información de Ruta */}
            {activeDelivery && (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 text-xs space-y-2.5 shadow-sm z-10">
                
                {/* Encabezado de estado */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black">
                    <Route className="w-3.5 h-3.5" />
                    <span>
                      {routeStatus === "idle" && "Haz clic en «Gestionar Ruta»"}
                      {routeStatus === "calculating" && "Calculando ruta óptima..."}
                      {routeStatus === "done" && "Ruta calculada ✓"}
                      {routeStatus === "error" && "Ruta estimada (sin tráfico)"}
                    </span>
                  </div>
                  {routeStatus === "done" && (
                    <span className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-extrabold text-[10px] px-2 py-0.5 rounded-md border border-emerald-100 dark:border-emerald-900/40">
                      En Línea
                    </span>
                  )}
                  {routeStatus === "calculating" && (
                    <div className="w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                {/* Ruta Origen → Destino */}
                <div className="space-y-1.5">
                  
                  {/* Origen: Bodega */}
                  <div className="flex items-start gap-1.5">
                    <Warehouse className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Origen · Bodega</span>
                      <p className="text-zinc-700 dark:text-zinc-300 font-semibold text-[10px] leading-snug">
                        {routeInfo?.originName || (sucursales.find(s => s.id === activeDelivery.sucursalId)?.nombre || "Bodega Grupo Arca")}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-500 text-[9px] leading-snug mt-0.5">
                        {routeInfo?.originAddress || buildWarehouseAddress(activeDelivery.sucursalId, sucursales)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 pl-1.5">
                    <div className="w-px h-3 bg-zinc-300 dark:bg-zinc-700 ml-0.5" />
                    <ArrowRight className="w-2.5 h-2.5 text-emerald-500" />
                  </div>

                  {/* Destino: Cliente */}
                  <div className="flex items-start gap-1.5">
                    <MapPin className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block">Destino · Cliente</span>
                      <p className="text-zinc-700 dark:text-zinc-300 font-semibold text-[10px] leading-snug">
                        {activeDelivery.clienteNombre}
                      </p>
                      <p className="text-zinc-500 dark:text-zinc-500 text-[9px] leading-snug mt-0.5">
                        {activeDelivery.direccion}
                      </p>
                      {activeDelivery.coordenadasEntrega && (
                        <p className="text-emerald-600 dark:text-emerald-500 font-mono text-[9px] mt-0.5">
                          📍 {activeDelivery.coordenadasEntrega.lat.toFixed(5)}, {activeDelivery.coordenadasEntrega.lng.toFixed(5)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Métricas de ruta calculada */}
                {routeInfo && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800 mt-1">
                    <div className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-2 rounded-lg text-center">
                      <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest block mb-0.5">Distancia</span>
                      <span className="text-zinc-900 dark:text-white text-xs font-bold">{routeInfo.distance}</span>
                    </div>
                    <div className="flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800 p-2 rounded-lg text-center">
                      <span className="text-[9px] text-zinc-400 uppercase font-black tracking-widest block mb-0.5 flex items-center justify-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        Tiempo Est.
                      </span>
                      <span className="text-zinc-900 dark:text-white text-xs font-bold">{routeInfo.duration}</span>
                    </div>
                  </div>
                )}

                {/* Instrucción inicial si no hay ruta calculada */}
                {routeStatus === "idle" && (
                  <p className="text-[10px] text-zinc-400 italic border-t border-zinc-200 dark:border-zinc-800 pt-2">
                    Presiona <strong className="text-emerald-600">Gestionar Ruta</strong> en una entrega para calcular la ruta más eficiente con tráfico en tiempo real.
                  </p>
                )}
              </div>
            )}

            {/* Canvas del Mapa de Google */}
            <div 
              ref={mapRef} 
              className="flex-1 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 min-h-[300px] bg-zinc-100 dark:bg-zinc-950" 
            />

            {!mapsLoaded && (
              <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs flex items-center justify-center text-white">
                <div className="text-center space-y-2">
                  <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-xs font-semibold">Cargando Google Maps API...</p>
                </div>
              </div>
            )}

          </div>
        </div>

      </div>

      {/* MODAL DE ACTUALIZACIÓN DE ENTREGA */}
      {selectedEntrega && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[95vw] 2xl:max-w-[1100px] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            
            {/* Cabecera */}
            <div className="flex justify-between items-start border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <div>
                <h3 className="text-lg font-black text-zinc-950 dark:text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-emerald-600" />
                  Actualización de Entrega e Instalación
                </h3>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Orden {selectedEntrega.folioTaller} - {selectedEntrega.clienteNombre}
                </p>
              </div>
              <button 
                onClick={() => setSelectedEntrega(null)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Controles Formulario */}
            <div className="space-y-4">
              
              {/* Estatus */}
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  Estatus de la Entrega
                </label>
                <select
                  disabled={esLectura}
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value as OrdenEntrega["estado"])}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-semibold focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100 disabled:opacity-55"
                >
                  <option value="programado">Programado</option>
                  <option value="en_ruta">En Ruta</option>
                  <option value="entregado">Entregado / Instalado</option>
                  <option value="incidencia">Incidencia</option>
                </select>
              </div>

              {/* Notas de Operación */}
              <div>
                <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block mb-1">
                  Notas de Entrega / Reporte de Incidencias
                </label>
                <textarea
                  disabled={esLectura}
                  rows={2}
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Escribe aquí novedades del trayecto o incidencias (ej: 'El cliente no se encontraba en el domicilio' o 'Vidrio colocado con éxito')"
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100 disabled:opacity-55"
                />
              </div>

              {/* Programación de Logística */}
              <div className="bg-zinc-50/50 dark:bg-zinc-950/40 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block border-b border-zinc-200/50 dark:border-zinc-800 pb-1">
                  📅 Programación de Envío e Instalación (Asignación Automática / Editable)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 text-xs">
                  {/* Día Programado */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Día:</label>
                    <input
                      type="date"
                      disabled={esLectura}
                      value={fechaProg}
                      onChange={(e) => setFechaProg(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-emerald-600 text-zinc-800 dark:text-zinc-200 disabled:opacity-55"
                    />
                  </div>

                  {/* Hora Programada */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Hora:</label>
                    <input
                      type="text"
                      disabled={esLectura}
                      placeholder="09:30 AM"
                      value={horaProg}
                      onChange={(e) => setHoraProg(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-emerald-600 text-zinc-800 dark:text-zinc-200 disabled:opacity-55"
                    />
                  </div>

                  {/* Chofer Asignado */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Chofer:</label>
                    <select
                      disabled={esLectura}
                      value={choferAsig}
                      onChange={(e) => setChoferAsig(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-emerald-600 text-zinc-800 dark:text-zinc-200 disabled:opacity-55"
                    >
                      <option value="">-- Sin chofer --</option>
                      <option value="Marcos Pineda (Logística)">Marcos Pineda (Logística)</option>
                      <option value="Alejandro Ruiz (Chofer)">Alejandro Ruiz (Chofer)</option>
                      <option value="Felipe Domínguez (Chofer)">Felipe Domínguez (Chofer)</option>
                    </select>
                  </div>

                  {/* Ruta Asignada */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Ruta:</label>
                    <input
                      type="text"
                      disabled={esLectura}
                      placeholder="Ruta Centro"
                      value={rutaAsig}
                      onChange={(e) => setRutaAsig(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-emerald-600 text-zinc-800 dark:text-zinc-200 disabled:opacity-55"
                    />
                  </div>

                  {/* Vehículo Asignado */}
                  <div>
                    <label className="block text-[10px] text-zinc-400 font-bold uppercase tracking-wider mb-1">Vehículo:</label>
                    <select
                      disabled={esLectura}
                      value={vehiculoAsig}
                      onChange={(e) => setVehiculoAsig(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 font-semibold focus:outline-none focus:border-emerald-600 text-zinc-800 dark:text-zinc-200 disabled:opacity-55"
                    >
                      <option value="">-- Sin vehículo --</option>
                      <option value="Camioneta Nissan NP300 (Placas GX-4455-C)">Camioneta Nissan NP300</option>
                      <option value="Camión Ford F-350 (Placas GY-9911-B)">Camión Ford F-350</option>
                      <option value="Vehículo Ram 4000 (Placas GY-8822-A)">Vehículo Ram 4000</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Grid: Canvas Firma + Subida Evidencias condicionado al Estado */}
              {(nuevoEstado === "entregado" || nuevoEstado === "incidencia") ? (
                <div className={`grid grid-cols-1 ${nuevoEstado === "entregado" ? "md:grid-cols-2" : ""} gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                  
                  {/* Canvas Firma */}
                  {nuevoEstado === "entregado" && (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                        <Signature className="w-3.5 h-3.5 text-emerald-600" />
                        Firma de Conformidad del Cliente
                      </span>
                      
                      <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50 dark:bg-zinc-950 flex flex-col justify-between h-[260px] flex-1">
                        <div className="relative flex-1 bg-white dark:bg-zinc-900 shadow-inner">
                          {!firmaConfirmada && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-30 select-none">
                              <span className="text-zinc-400 dark:text-zinc-600 text-xs font-black uppercase tracking-wider">Firme aquí por favor</span>
                              <span className="text-zinc-300 dark:text-zinc-700 text-[9px] font-bold mt-1">Use su dedo o lápiz óptico</span>
                            </div>
                          )}
                          <canvas
                            ref={canvasRefCallback}
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawingTouch}
                            onTouchMove={drawTouch}
                            onTouchEnd={stopDrawing}
                            className="absolute inset-0 w-full h-full cursor-crosshair"
                          />
                        </div>
                        {!esLectura && (
                          <div className="py-2.5 bg-zinc-50 dark:bg-zinc-950/80 border-t border-zinc-200 dark:border-zinc-800 flex justify-center shrink-0">
                            <button
                              type="button"
                              onClick={clearCanvas}
                              className="flex items-center gap-1.5 text-[10px] font-bold text-red-500 hover:text-red-600 dark:hover:text-red-400 uppercase tracking-wider px-3.5 py-1.5 rounded-lg hover:bg-red-500/5 transition-colors border border-red-500/10 hover:border-red-500/20"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Limpiar Firma</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Evidencia de Fotos */}
                  <div className="flex flex-col space-y-3">
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                      <Camera className={`w-3.5 h-3.5 ${nuevoEstado === "incidencia" ? "text-amber-600" : "text-emerald-600"}`} />
                      {nuevoEstado === "incidencia" 
                        ? "Cargar Evidencias de la Incidencia (Múltiple)" 
                        : "Cargar Evidencia Fotográfica (Múltiple)"}
                    </span>
                    
                    <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950 p-4 space-y-4 flex-1 flex flex-col justify-between min-h-[260px]">
                      
                      {/* Previsualización e Icono X de Eliminación */}
                      <div>
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 text-left">
                          Fotos Seleccionadas ({fotosSeleccionadas.length})
                        </span>
                        
                        {fotosSeleccionadas.length === 0 ? (
                          <label 
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              if (esLectura) return;
                              const files = e.dataTransfer.files;
                              if (files) {
                                Array.from(files).forEach((file) => {
                                  if (file.type.startsWith("image/")) {
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      const base64Url = reader.result as string;
                                      setFotosSeleccionadas((prev) => {
                                        if (prev.includes(base64Url)) return prev;
                                        return [...prev, base64Url];
                                      });
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                });
                              }
                            }}
                            className="border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 rounded-xl p-6 text-center text-zinc-400 dark:text-zinc-500 text-[10px] flex flex-col items-center justify-center space-y-1 bg-white dark:bg-zinc-900/40 cursor-pointer transition-all"
                          >
                            <Upload className="w-6 h-6 text-zinc-300 mb-1" />
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">Haz clic aquí para cargar fotos</span>
                            <span>o arrastra los archivos desde tu computadora</span>
                            {nuevoEstado === "entregado" && (
                              <span className="text-red-500 font-bold mt-1">
                                * Requerido al menos 1 foto para marcar como Entregado
                              </span>
                            )}
                            <input
                              type="file"
                              multiple
                              accept="image/*"
                              className="hidden"
                              onChange={handleLocalFilesUpload}
                              disabled={esLectura}
                            />
                          </label>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-[140px] overflow-y-auto p-0.5">
                            {fotosSeleccionadas.map((foto, idx) => (
                              <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900">
                                <img src={foto} alt={`Entrega Evidencia ${idx}`} className="w-full h-full object-cover" />
                                {!esLectura && (
                                  <button
                                    type="button"
                                    onClick={() => eliminarFoto(foto)}
                                    className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform"
                                    title="Eliminar Foto"
                                  >
                                    <X className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Cargar desde computadora */}
                      {!esLectura && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block text-left">
                            Cargar fotos desde Computadora
                          </span>
                          <div className="flex gap-2">
                            <label className="flex-1 flex items-center justify-center gap-2 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-[10px] font-bold text-zinc-700 dark:text-zinc-300 cursor-pointer transition-all">
                              <Upload className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Seleccionar archivos locales</span>
                              <input
                                type="file"
                                multiple
                                accept="image/*"
                                className="hidden"
                                onChange={handleLocalFilesUpload}
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Cargar por URL de Imagen */}
                      {!esLectura && (
                        <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                          <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block text-left">
                            Agregar por URL de Imagen
                          </span>
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="https://servidor.com/evidencia.jpg"
                              value={customFotoUrl}
                              onChange={(e) => setCustomFotoUrl(e.target.value)}
                              className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-[10px] focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                            />
                            <button
                              type="button"
                              onClick={agregarFotoPorUrl}
                              className="bg-zinc-800 hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Agregar
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Selección desde Catálogo / Galería de Referencia */}
                      <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-800">
                        <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest block mb-2 text-left">
                          Galería de Referencia Rápida
                        </span>
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-zinc-800">
                          {FOTOS_INSTALACION.map((foto) => {
                            const isSelected = fotosSeleccionadas.includes(foto.url);
                            return (
                              <button
                                type="button"
                                disabled={esLectura}
                                key={foto.id}
                                onClick={() => toggleFoto(foto.url)}
                                className={`flex-shrink-0 w-12 relative aspect-square rounded-lg overflow-hidden border transition-all ${
                                  isSelected 
                                    ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                                    : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 bg-white dark:bg-zinc-900"
                                }`}
                                title={foto.label}
                              >
                                <img src={foto.url} className="w-full h-full object-cover" alt={foto.label} />
                                {isSelected && (
                                  <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center text-white">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 filter drop-shadow" />
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                    </div>
                  </div>

                </div>
              ) : (
                <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center gap-3 text-xs text-zinc-500">
                  <Info className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p>
                    La firma de conformidad del cliente y la carga de fotos de evidencia se habilitarán automáticamente cuando cambies el estatus de la entrega a <strong>"Entregado / Instalado"</strong> o <strong>"Incidencia"</strong>.
                  </p>
                </div>
              )}

            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
              <button
                onClick={() => setSelectedEntrega(null)}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl text-xs transition-colors"
              >
                Cerrar
              </button>
              {!esLectura && (
                <button
                  onClick={handleSaveEntrega}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl text-xs transition-colors shadow-sm"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Guardar Cambios
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
