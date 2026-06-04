"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuotesStore } from "../quotesStore";
import { useCRMStore } from "../../crm/crmStore";
import { useConfigStore } from "@/features/config/configStore";
import { useAuthStore } from "../../auth/authStore";
import { useWorkshopStore } from "../../workshop/workshopStore";
import { useDeliveriesStore } from "../../deliveries/deliveriesStore";
import { useGoogleStore } from "../../google/googleStore";
import { Quote, QuoteConcept } from "../types";
import { 
  FileText, Plus, Search, Trash2, Calendar, 
  DollarSign, Check, X, ShieldAlert, Sliders, 
  ArrowRight, Users, Hammer, Layers, AlertCircle, Percent,
  Camera, Image as ImageIcon, UploadCloud, Download, MapPin,
  Sparkles, Info, Pencil, AlertTriangle
} from "lucide-react";

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

const GALERIA_FOTOS_EVIDENCIA = [
  { id: "e-1", url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80", label: "Patio Vacío" },
  { id: "e-2", url: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80", label: "Pared en Obra" },
  { id: "e-3", url: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=600&q=80", label: "Vano de Ventanal" },
  { id: "e-4", url: "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=600&q=80", label: "Baño en Construcción" },
  { id: "e-5", url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=600&q=80", label: "Claro de Escalera" },
  { id: "e-6", url: "https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=600&q=80", label: "Fachada en Obra Negra" }
];

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

export default function QuotesDashboard() {
  const { 
    cotizaciones, 
    materiales, 
    agregarCotizacion, 
    editarCotizacion,
    actualizarEstatusCotizacion, 
    eliminarCotizacion,
    calcularConceptoNesting,
    agregarFotoEvidenciaArea,
    preselectedClienteId,
    setPreselectedClienteId
  } = useQuotesStore();

  const { clientes } = useCRMStore();
  const { empresa, sucursalActivaId } = useConfigStore();
  const { usuarioActivo, registrarActividad } = useAuthStore();
  const { ordenesTaller } = useWorkshopStore();
  const { ordenesEntrega } = useDeliveriesStore();

  // Filtrado de materiales por tipo
  const materialesAluminio = useMemo(() => materiales.filter((m) => m.tipo === "aluminio"), [materiales]);
  const materialesVidrio = useMemo(() => materiales.filter((m) => m.tipo === "vidrio"), [materiales]);

  // Estados de navegación interna
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null);
  const selectedQuote = useMemo(() => 
    cotizaciones.find((q) => q.id === selectedQuoteId) || null,
    [cotizaciones, selectedQuoteId]
  );

  // Obtener orden de taller y entrega asociadas a la cotización seleccionada (para seguimiento de ventas)
  const trackingInfo = useMemo(() => {
    if (!selectedQuote) return null;
    const taller = ordenesTaller.find((o) => o.cotizacionId === selectedQuote.id);
    const entrega = taller ? ordenesEntrega.find((d) => d.ordenTallerId === taller.id) : null;
    return { taller, entrega };
  }, [selectedQuote, ordenesTaller, ordenesEntrega]);

  // Estado para controlar el diálogo premium de confirmación (aprobar/eliminar)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    tipo: "aprobar" | "eliminar";
    quote: Quote | null;
  }>({
    isOpen: false,
    tipo: "aprobar",
    quote: null
  });

  // Estados de Subida Múltiple de Fotos
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadModalType] = useState<"evidencia">("evidencia");
  const [selectedUploadQuoteId, setSelectedUploadQuoteId] = useState<string | null>(null);
  const [uploadUrlsSelected, setUploadUrlsSelected] = useState<string[]>([]);
  const [customImageUrl, setCustomImageUrl] = useState("");

  const toggleUploadFotoSelection = (url: string) => {
    if (uploadUrlsSelected.includes(url)) {
      setUploadUrlsSelected(uploadUrlsSelected.filter((u) => u !== url));
    } else {
      setUploadUrlsSelected([...uploadUrlsSelected, url]);
    }
  };

  const handleAddCustomImageUrl = () => {
    if (!customImageUrl.trim()) return;
    setUploadUrlsSelected([...uploadUrlsSelected, customImageUrl.trim()]);
    setCustomImageUrl("");
  };

  const handleConfirmPhotosUpload = () => {
    if (uploadUrlsSelected.length === 0) return;

    if (selectedUploadQuoteId) {
      // Editar en cotización guardada
      uploadUrlsSelected.forEach((url) => {
        agregarFotoEvidenciaArea(selectedUploadQuoteId, url);
      });
      

    } else {
      // Agregar en el formulario de creación/edición temporal
      setFotosEvidenciaTemp([...fotosEvidenciaTemp, ...uploadUrlsSelected]);
    }

    setIsUploadModalOpen(false);
    setUploadUrlsSelected([]);
  };

  const handleRemovePhoto = (quoteId: string, fotoUrl: string, tipo: "evidencia" | "instalado") => {
    const confirm = window.confirm("¿Estás seguro de que deseas eliminar esta fotografía del expediente?");
    if (!confirm) return;

    const quote = cotizaciones.find(q => q.id === quoteId);
    if (!quote) return;

    const updatedEvidencias = tipo === "evidencia"
      ? (quote.fotosEvidenciaArea || []).filter(url => url !== fotoUrl)
      : quote.fotosEvidenciaArea;

    const updatedInstaladas = tipo === "instalado"
      ? (quote.fotosInstalado || []).filter(url => url !== fotoUrl)
      : quote.fotosInstalado;

    editarCotizacion(quoteId, {
      ...quote,
      fotosEvidenciaArea: updatedEvidencias,
      fotosInstalado: updatedInstaladas
    });


  };

  // Estados del Formulario de Cotización
  const [clienteId, setClienteId] = useState("");
  const [fechaVigencia, setFechaVigencia] = useState(
    new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] // +15 días
  );
  const [conceptosTemp, setConceptosTemp] = useState<QuoteConcept[]>([]);
  const [margenUtilidadPct, setMargenUtilidadPct] = useState<number>(0.35); // 35% de margen por defecto
  const [fotosEvidenciaTemp, setFotosEvidenciaTemp] = useState<string[]>([]);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [prioridad, setPrioridad] = useState<"baja" | "media" | "alta">("media");

  // Estados de Ubicación (Google Maps)
  const [direccionEntrega, setDireccionEntrega] = useState("");
  const [latEntrega, setLatEntrega] = useState<number | null>(null);
  const [lngEntrega, setLngEntrega] = useState<number | null>(null);


  // Estados de Flete y Logística
  const [distanciaFlete, setDistanciaFlete] = useState<number | null>(null);
  const [tiempoFlete, setTiempoFlete] = useState<number | null>(null);
  const [costoFlete, setCostoFlete] = useState<number | null>(null);

  // Referencias para los mapas y servicios de Directions
  const mapRef = useRef<HTMLDivElement>(null);
  const detailsMapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const detailsMapInstanceRef = useRef<any>(null);
  const detailsMarkerRef = useRef<any>(null);
  const directionsRendererRef = useRef<any>(null);
  const detailsDirectionsRendererRef = useRef<any>(null);

  // Función para obtener la dirección a partir de coordenadas usando Geocoding de Google
  const geocodeLatLng = (lat: number, lng: number) => {
    if (!(window as any).google || !(window as any).google.maps) return;
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results: any, status: any) => {
      if (status === "OK") {
        if (results[0]) {
          setDireccionEntrega(results[0].formatted_address);
        }
      }
    });
  };

  // Obtener ubicación GPS actual y centrar el mapa
  const handleGPSClick = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLatEntrega(lat);
        setLngEntrega(lng);
        geocodeLatLng(lat, lng);

        // Si ya hay mapa, moverlo y posicionar marcador
        if (mapInstanceRef.current) {
          const latlng = new (window as any).google.maps.LatLng(lat, lng);
          mapInstanceRef.current.setCenter(latlng);
          mapInstanceRef.current.setZoom(16);

          if (markerRef.current) {
            markerRef.current.setPosition(latlng);
          } else {
            markerRef.current = new (window as any).google.maps.Marker({
              position: latlng,
              map: mapInstanceRef.current,
              draggable: true,
              title: "Ubicación de entrega",
              animation: (window as any).google.maps.Animation.DROP
            });

            markerRef.current.addListener("dragend", () => {
              const pos = markerRef.current.getPosition();
              const latVal = pos.lat();
              const lngVal = pos.lng();
              setLatEntrega(latVal);
              setLngEntrega(lngVal);
              geocodeLatLng(latVal, lngVal);
            });
          }
        }
      },
      (error) => {
        console.error(error);
        alert(`Error al obtener geolocalización: ${error.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Calcular la ruta y la distancia por carretera entre la sucursal de origen y el cliente
  const calcularRutaYFlete = () => {
    if (!(window as any).google || !(window as any).google.maps) {
      alert("La API de Google Maps no se ha cargado correctamente.");
      return;
    }

    if (latEntrega === null || lngEntrega === null) {
      alert("Por favor, selecciona primero la ubicación de entrega en el mapa o haz clic en GPS.");
      return;
    }

    // Obtener la sucursal activa o configurada
    const currentBranchId = sucursalActivaId === "todos" ? "suc-1" : sucursalActivaId;
    const sucursal = useConfigStore.getState().sucursales.find((s) => s.id === currentBranchId) || useConfigStore.getState().sucursales[0];

    if (!sucursal) {
      alert("No se encontró la configuración de la sucursal de origen.");
      return;
    }

    // Dirección de la sucursal de origen
    const sucursalDireccion = `${sucursal.calle} ${sucursal.numero}, ${sucursal.colonia}, ${sucursal.municipio}, ${sucursal.estado}, CP ${sucursal.codigoPostal}`;

    // Geocodificar la sucursal de origen para obtener sus coordenadas
    const geocoder = new (window as any).google.maps.Geocoder();
    geocoder.geocode({ address: sucursalDireccion }, (results: any, status: any) => {
      if (status !== "OK" || !results || !results[0]) {
        console.warn("No se pudo geocodificar la dirección de la sucursal. Usando coordenadas por defecto.");
        const fallbackCoords = currentBranchId === "suc-2" 
          ? { lat: 20.693158, lng: -103.417387 } // GDL
          : { lat: 16.820257, lng: -99.824286 }; // Acapulco
        ejecutarDirectionsYDistance(fallbackCoords, { lat: latEntrega, lng: lngEntrega });
        return;
      }

      const location = results[0].geometry.location;
      const originCoords = { lat: location.lat(), lng: location.lng() };
      ejecutarDirectionsYDistance(originCoords, { lat: latEntrega, lng: lngEntrega });
    });
  };

  const ejecutarDirectionsYDistance = (origin: { lat: number; lng: number }, destination: { lat: number; lng: number }) => {
    const directionsService = new (window as any).google.maps.DirectionsService();

    // Inicializar o re-usar el DirectionsRenderer
    if (!directionsRendererRef.current && mapInstanceRef.current) {
      directionsRendererRef.current = new (window as any).google.maps.DirectionsRenderer({
        map: mapInstanceRef.current,
        suppressMarkers: false,
        polylineOptions: {
          strokeColor: "#059669", // Color esmeralda premium
          strokeOpacity: 0.8,
          strokeWeight: 6
        }
      });
    }

    const request = {
      origin: new (window as any).google.maps.LatLng(origin.lat, origin.lng),
      destination: new (window as any).google.maps.LatLng(destination.lat, destination.lng),
      travelMode: (window as any).google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result: any, status: any) => {
      if (status === "OK") {
        if (directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result);
        }

        // Obtener distancia y duración de la ruta calculada
        const route = result.routes[0];
        if (route && route.legs && route.legs[0]) {
          const leg = route.legs[0];
          const distKm = leg.distance.value / 1000; // Metros a kilómetros
          const durationMin = Math.round(leg.duration.value / 60); // Segundos a minutos

          setDistanciaFlete(distKm);
          setTiempoFlete(durationMin);

          // Tarifa de $15.00 MXN por kilómetro
          const costoSugerido = Math.round(distKm * 15);
          setCostoFlete(costoSugerido);
        }
      } else {
        console.error("Directions query failed due to: " + status);
        
        // Calcular distancia Haversine como fallback
        const R = 6371; // Radio de la tierra en km
        const dLat = (destination.lat - origin.lat) * Math.PI / 180;
        const dLon = (destination.lng - origin.lng) * Math.PI / 180;
        const a = 
          Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
          Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const d = R * c; // Distancia en km

        const fallbackKm = parseFloat(d.toFixed(1));
        const fallbackMin = Math.round(fallbackKm * 2); // Estimado 2 minutos por km
        
        setDistanciaFlete(fallbackKm);
        setTiempoFlete(fallbackMin);
        setCostoFlete(Math.round(fallbackKm * 15));

        alert("Se realizó una estimación de distancia lineal (fórmula Haversine) ya que la API de Directions no retornó ruta: " + status);
      }
    });
  };

  // Efecto para preseleccionar y auto-abrir el formulario de cotización cuando se redirige desde el CRM
  useEffect(() => {
    if (preselectedClienteId) {
      setClienteId(preselectedClienteId);
      setConceptosTemp([]);
      setDireccionEntrega("");
      setLatEntrega(null);
      setLngEntrega(null);
      setDistanciaFlete(null);
      setTiempoFlete(null);
      setCostoFlete(null);
      setPrioridad("media");
      setIsFormOpen(true);
      
      // Limpiar para evitar que se abra al volver a ingresar al módulo
      setPreselectedClienteId(null);
    }
  }, [preselectedClienteId, setPreselectedClienteId]);

  // Limpiar campos y estado de edición al cerrar el formulario
  useEffect(() => {
    if (!isFormOpen) {
      setEditingConceptIdx(null);
      setConDescripcion("");
      setConAncho("");
      setConAlto("");
      setConCantidad("1");
      setConManoObra("300");
      setConMaterialId("");
      setConVidrioMaterialId("");
      setSelectTipoTrabajo("cancel");
      setCustomTipoTrabajo("");
    }
  }, [isFormOpen]);

  // Efecto para inicializar/actualizar el mapa interactivo en el Formulario
  useEffect(() => {
    if (!isFormOpen) {
      // Limpiar referencias cuando se cierra el formulario
      mapInstanceRef.current = null;
      markerRef.current = null;
      return;
    }

    // Retrasar inicialización para asegurar que el contenedor DOM de mapRef está montado y renderizado
    const timer = setTimeout(() => {
      loadGoogleMapsScript(() => {
        if (!mapRef.current) return;

        const defaultLat = latEntrega || 19.432608;
        const defaultLng = lngEntrega || -99.133208;
        const defaultZoom = latEntrega && lngEntrega ? 16 : 12;

        const myLatlng = new (window as any).google.maps.LatLng(defaultLat, defaultLng);

        // Si el mapa ya existe, re-centrarlo y colocar/mover el marcador
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setCenter(myLatlng);
          mapInstanceRef.current.setZoom(defaultZoom);
          
          if (latEntrega !== null && lngEntrega !== null) {
            if (markerRef.current) {
              markerRef.current.setPosition(myLatlng);
              markerRef.current.setMap(mapInstanceRef.current);
            } else {
              markerRef.current = new (window as any).google.maps.Marker({
                position: myLatlng,
                map: mapInstanceRef.current,
                draggable: true,
                title: "Ubicación de entrega",
                animation: (window as any).google.maps.Animation.DROP
              });
              
              markerRef.current.addListener("dragend", () => {
                const pos = markerRef.current.getPosition();
                const lat = pos.lat();
                const lng = pos.lng();
                setLatEntrega(lat);
                setLngEntrega(lng);
                geocodeLatLng(lat, lng);
              });
            }
          } else if (markerRef.current) {
            markerRef.current.setMap(null);
            markerRef.current = null;
          }
          return;
        }

        // Crear instancia nueva del mapa
        const mapOptions = {
          zoom: defaultZoom,
          center: myLatlng,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }]
            }
          ]
        };

        mapInstanceRef.current = new (window as any).google.maps.Map(mapRef.current, mapOptions);

        // Si ya hay una ubicación guardada, creamos el marcador
        if (latEntrega !== null && lngEntrega !== null) {
          markerRef.current = new (window as any).google.maps.Marker({
            position: myLatlng,
            map: mapInstanceRef.current,
            draggable: true,
            title: "Ubicación de entrega"
          });

          markerRef.current.addListener("dragend", () => {
            const pos = markerRef.current.getPosition();
            const lat = pos.lat();
            const lng = pos.lng();
            setLatEntrega(lat);
            setLngEntrega(lng);
            geocodeLatLng(lat, lng);
          });
        }

        // Evento de clic en el mapa para colocar el pin por primera vez
        mapInstanceRef.current.addListener("click", (e: any) => {
          const clickedLatLng = e.latLng;
          const lat = clickedLatLng.lat();
          const lng = clickedLatLng.lng();
          setLatEntrega(lat);
          setLngEntrega(lng);
          geocodeLatLng(lat, lng);

          if (markerRef.current) {
            markerRef.current.setPosition(clickedLatLng);
          } else {
            markerRef.current = new (window as any).google.maps.Marker({
              position: clickedLatLng,
              map: mapInstanceRef.current,
              draggable: true,
              title: "Ubicación de entrega",
              animation: (window as any).google.maps.Animation.DROP
            });

            markerRef.current.addListener("dragend", () => {
              const pos = markerRef.current.getPosition();
              const lat = pos.lat();
              const lng = pos.lng();
              setLatEntrega(lat);
              setLngEntrega(lng);
              geocodeLatLng(lat, lng);
            });
          }
        });
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [isFormOpen]);

  // Efecto para inicializar el mapa de solo lectura en el panel de detalles y trazar la ruta
  useEffect(() => {
    if (!selectedQuote) {
      detailsMapInstanceRef.current = null;
      detailsMarkerRef.current = null;
      detailsDirectionsRendererRef.current = null;
      return;
    }

    const coordenadas = selectedQuote.coordenadasEntrega;
    if (!coordenadas || !coordenadas.lat || !coordenadas.lng) {
      detailsMapInstanceRef.current = null;
      detailsMarkerRef.current = null;
      detailsDirectionsRendererRef.current = null;
      return;
    }

    loadGoogleMapsScript(() => {
      // Esperar brevemente a que el DOM se renderice por completo
      setTimeout(() => {
        if (!detailsMapRef.current) return;

        const myLatlng = new (window as any).google.maps.LatLng(coordenadas.lat, coordenadas.lng);

        // Crear la instancia del mapa si no existe
        if (!detailsMapInstanceRef.current) {
          const mapOptions = {
            zoom: 14,
            center: myLatlng,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
            zoomControl: true,
            draggable: true, // Permitir mover en detalles
            disableDoubleClickZoom: false,
            scrollwheel: true,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]
          };
          detailsMapInstanceRef.current = new (window as any).google.maps.Map(detailsMapRef.current, mapOptions);
        } else {
          detailsMapInstanceRef.current.setCenter(myLatlng);
        }

        // Configurar o limpiar el DirectionsRenderer de detalles
        if (!detailsDirectionsRendererRef.current) {
          detailsDirectionsRendererRef.current = new (window as any).google.maps.DirectionsRenderer({
            map: detailsMapInstanceRef.current,
            suppressMarkers: false,
            polylineOptions: {
              strokeColor: "#059669", // Color esmeralda premium
              strokeOpacity: 0.8,
              strokeWeight: 6
            }
          });
        }

        // Trazar ruta desde la sucursal de origen
        const currentBranchId = selectedQuote.sucursalId || "suc-1";
        const sucursal = useConfigStore.getState().sucursales.find((s) => s.id === currentBranchId) || useConfigStore.getState().sucursales[0];

        if (sucursal) {
          const sucursalDireccion = `${sucursal.calle} ${sucursal.numero}, ${sucursal.colonia}, ${sucursal.municipio}, ${sucursal.estado}, CP ${sucursal.codigoPostal}`;
          const geocoder = new (window as any).google.maps.Geocoder();
          
          geocoder.geocode({ address: sucursalDireccion }, (results: any, status: any) => {
            let originCoords = { lat: 16.820257, lng: -99.824286 }; // Default Acapulco
            if (status === "OK" && results && results[0]) {
              const location = results[0].geometry.location;
              originCoords = { lat: location.lat(), lng: location.lng() };
            } else if (currentBranchId === "suc-2") {
              originCoords = { lat: 20.693158, lng: -103.417387 }; // Default GDL
            }

            const directionsService = new (window as any).google.maps.DirectionsService();
            const request = {
              origin: new (window as any).google.maps.LatLng(originCoords.lat, originCoords.lng),
              destination: myLatlng,
              travelMode: (window as any).google.maps.TravelMode.DRIVING
            };

            directionsService.route(request, (routeResult: any, routeStatus: any) => {
              if (routeStatus === "OK" && detailsDirectionsRendererRef.current) {
                // Quitar marcador manual previo si la ruta se trazó correctamente
                if (detailsMarkerRef.current) {
                  detailsMarkerRef.current.setMap(null);
                  detailsMarkerRef.current = null;
                }
                detailsDirectionsRendererRef.current.setDirections(routeResult);
              } else {
                console.warn("Falla de trazado de ruta de detalles. Colocando marcador simple.");
                if (detailsDirectionsRendererRef.current) {
                  detailsDirectionsRendererRef.current.setDirections({ routes: [] }); // Limpiar ruta
                }
                
                if (!detailsMarkerRef.current) {
                  detailsMarkerRef.current = new (window as any).google.maps.Marker({
                    position: myLatlng,
                    map: detailsMapInstanceRef.current,
                    title: "Ubicación de Instalación",
                    animation: (window as any).google.maps.Animation.DROP
                  });
                } else {
                  detailsMarkerRef.current.setPosition(myLatlng);
                  detailsMarkerRef.current.setMap(detailsMapInstanceRef.current);
                }
              }
            });
          });
        }
      }, 250);
    });
  }, [selectedQuote]);

  // Carga los datos de una cotización existente en el formulario para edición
  const handleEditClick = (quote: Quote) => {
    setClienteId(quote.clienteId);
    setFechaVigencia(quote.fechaVigencia);
    setConceptosTemp(quote.conceptos);
    setMargenUtilidadPct(quote.margenUtilidadPct);
    setFotosEvidenciaTemp(quote.fotosEvidenciaArea || []);
    setEditingQuoteId(quote.id);
    setPrioridad(quote.prioridad || "media");
    
    // Carga de ubicación registrada
    setDireccionEntrega(quote.direccionEntrega || "");
    setLatEntrega(quote.coordenadasEntrega?.lat ?? null);
    setLngEntrega(quote.coordenadasEntrega?.lng ?? null);

    // Carga de flete y logística
    setDistanciaFlete(quote.distanciaEntregaKm ?? null);
    setTiempoFlete(quote.tiempoEntregaMin ?? null);
    setCostoFlete(quote.costoFlete ?? null);
    
    setIsFormOpen(true);
  };

  /**
   * Abre la cotización en el editor e inicia la edición de un concepto específico.
   * Esto permite corregir errores de captura de forma inmediata desde la visualización de detalles.
   * 
   * @param quote La cotización a la que pertenece el concepto
   * @param conceptIdx El índice del concepto dentro del arreglo de partidas
   */
  const handleEditConceptDirect = (quote: Quote, conceptIdx: number) => {
    // 1. Cargar la cotización en el formulario
    handleEditClick(quote);
    // 2. Esperar a que se actualicen los estados de react y cargar la partida para edición
    setTimeout(() => {
      startEditConcepto(conceptIdx);
    }, 150);
  };

  const handleAddFotoEvidencia = (quoteId: string) => {
    const urls = [
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=600&q=80",
      "https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?auto=format&fit=crop&w=600&q=80"
    ];
    const num = Math.floor(Math.random() * urls.length);
    agregarFotoEvidenciaArea(quoteId, urls[num]);

  };



  // Estados del Concepto a Agregar
  const [conDescripcion, setConDescripcion] = useState("");
  const [selectTipoTrabajo, setSelectTipoTrabajo] = useState<string>("cancel");
  const [customTipoTrabajo, setCustomTipoTrabajo] = useState("");
  const [conMaterialId, setConMaterialId] = useState(""); // Perfil de aluminio
  const [conVidrioMaterialId, setConVidrioMaterialId] = useState(""); // Vidrio templado
  const [conAncho, setConAncho] = useState("");
  const [conAlto, setConAlto] = useState("");
  const [conCantidad, setConCantidad] = useState("1");
  const [conManoObra, setConManoObra] = useState("300"); // $300 pesos mano de obra inicial
  const [editingConceptIdx, setEditingConceptIdx] = useState<number | null>(null);

  const conTipoTrabajo = useMemo(() => {
    return selectTipoTrabajo === "otro" ? customTipoTrabajo : selectTipoTrabajo;
  }, [selectTipoTrabajo, customTipoTrabajo]);

  // Cálculo en vivo del nesting para el concepto actual (mientras se captura)
  const liveNesting = useMemo(() => {
    const w = Math.round(parseFloat(conAncho) * 1000);
    const h = Math.round(parseFloat(conAlto) * 1000);
    const qty = parseInt(conCantidad);
    const mo = parseFloat(conManoObra);
    
    const esTipoFijo = ["cancel", "ventana_anticiclonica", "domo", "barandal", "pergola", "porton", "cortina"].includes(conTipoTrabajo);
    const tieneMaterialValido = esTipoFijo
      ? (((conTipoTrabajo === "cancel" || conTipoTrabajo === "ventana_anticiclonica" || conTipoTrabajo === "domo") && (conMaterialId || conVidrioMaterialId)) ||
         (conTipoTrabajo === "barandal" && conVidrioMaterialId) ||
         ((conTipoTrabajo === "pergola" || conTipoTrabajo === "porton" || conTipoTrabajo === "cortina") && conMaterialId))
      : (conMaterialId || conVidrioMaterialId);

    if (!tieneMaterialValido || !conTipoTrabajo.trim() || isNaN(w) || w <= 0 || isNaN(h) || h <= 0 || isNaN(qty) || qty <= 0 || isNaN(mo)) {
      return { calculation: null, error: null };
    }

    try {
      const calculation = calcularConceptoNesting(
        conDescripcion || `Cotización de ${conTipoTrabajo}`,
        conTipoTrabajo,
        conMaterialId || null,
        conVidrioMaterialId || null,
        w,
        h,
        qty,
        mo,
        margenUtilidadPct
      );
      return { calculation, error: null };
    } catch (e: any) {
      return { calculation: null, error: e.message || "Error al calcular el nesting" };
    }
  }, [conDescripcion, conTipoTrabajo, conMaterialId, conVidrioMaterialId, conAncho, conAlto, conCantidad, conManoObra, margenUtilidadPct, calcularConceptoNesting]);

  const liveNestingCalculation = liveNesting.calculation;
  const liveNestingError = liveNesting.error;

  // Lógica reactiva para promoción de cortinas/ventanas anticiclónicas
  const esAnticiclonicaActiva = useMemo(() => {
    const desc = conDescripcion.toLowerCase();
    return (
      conTipoTrabajo === "cortina" || 
      conTipoTrabajo === "ventana_anticiclonica" || 
      desc.includes("anticicl") || 
      desc.includes("anticil") || 
      desc.includes("ciclonic") || 
      desc.includes("cilonic")
    );
  }, [conTipoTrabajo, conDescripcion]);

  const areaM2Calculada = useMemo(() => {
    const w = parseFloat(conAncho) || 0;
    const h = parseFloat(conAlto) || 0;
    return w * h;
  }, [conAncho, conAlto]);

  // Precio fijo por m² para cortinas/ventanas anticiclónicas: $4,950 MXN/m²
  const precioM2Vigente = 4950;
  const precioSugeridoAnticiclonicaConIva = useMemo(() => {
    const qty = parseInt(conCantidad) || 1;
    const precioM2AjustadoConIva = precioM2Vigente * (1 + margenUtilidadPct);
    return Math.round(areaM2Calculada * precioM2AjustadoConIva * qty * 100) / 100;
  }, [areaM2Calculada, precioM2Vigente, conCantidad, margenUtilidadPct]);

  const precioSugeridoAnticiclonica = useMemo(() => {
    return Math.round((precioSugeridoAnticiclonicaConIva / 1.16) * 100) / 100;
  }, [precioSugeridoAnticiclonicaConIva]);

  // Agregar o editar concepto temporalmente
  const addConcepto = () => {
    if (!liveNestingCalculation) return;

    if (editingConceptIdx !== null) {
      const updated = [...conceptosTemp];
      updated[editingConceptIdx] = { ...liveNestingCalculation, id: conceptosTemp[editingConceptIdx].id };
      setConceptosTemp(updated);
      setEditingConceptIdx(null);
    } else {
      setConceptosTemp([...conceptosTemp, { ...liveNestingCalculation, id: `concept-${Date.now()}` }]);
    }
    
    // Limpiar campos de concepto
    setConDescripcion("");
    setConAncho("");
    setConAlto("");
    setConCantidad("1");
    setConManoObra("300");
    setConMaterialId("");
    setConVidrioMaterialId("");
    setSelectTipoTrabajo("cancel");
    setCustomTipoTrabajo("");
  };

  // Iniciar la edición de un concepto temporal
  const startEditConcepto = (idx: number) => {
    const c = conceptosTemp[idx];
    setEditingConceptIdx(idx);
    setConDescripcion(c.descripcion);
    
    const esTipoFijo = ["cancel", "ventana_anticiclonica", "domo", "barandal", "pergola", "porton", "cortina"].includes(c.tipoTrabajo);
    if (esTipoFijo) {
      setSelectTipoTrabajo(c.tipoTrabajo);
      setCustomTipoTrabajo("");
    } else {
      setSelectTipoTrabajo("otro");
      setCustomTipoTrabajo(c.tipoTrabajo);
    }
    
    setConMaterialId(c.materialId || "");
    setConVidrioMaterialId(c.vidrioMaterialId || "");
    setConAncho((c.ancho / 1000).toString());
    setConAlto((c.alto / 1000).toString());
    setConCantidad(c.cantidad.toString());
    setConManoObra(c.costoManoObra.toString());
  };

  // Cancelar la edición de un concepto
  const cancelEditConcepto = () => {
    setEditingConceptIdx(null);
    setConDescripcion("");
    setConAncho("");
    setConAlto("");
    setConCantidad("1");
    setConManoObra("300");
    setConMaterialId("");
    setConVidrioMaterialId("");
    setSelectTipoTrabajo("cancel");
    setCustomTipoTrabajo("");
  };

  // Quitar concepto temporal
  const removeConcepto = (idx: number) => {
    setConceptosTemp(conceptosTemp.filter((_, i) => i !== idx));
    if (editingConceptIdx === idx) {
      cancelEditConcepto();
    } else if (editingConceptIdx !== null && editingConceptIdx > idx) {
      setEditingConceptIdx(editingConceptIdx - 1);
    }
  };

  // Totales de la nueva cotización acumulada
  const quoteSummary = useMemo(() => {
    let costoMaterial = 0;
    let costoDesperdicio = 0;
    let costoManoObra = 0;
    let precioSugerido = 0;
    let totalConIvaAcumulado = 0;

    conceptosTemp.forEach((c) => {
      costoMaterial += c.costoMateriales;
      costoDesperdicio += c.costoDesperdicio;
      costoManoObra += c.costoManoObra;

      const esAnticiclonica = 
        c.tipoTrabajo === "cortina" || 
        c.tipoTrabajo === "ventana_anticiclonica" || 
        c.descripcion.toLowerCase().includes("anticicl") || 
        c.descripcion.toLowerCase().includes("anticil") || 
        c.descripcion.toLowerCase().includes("ciclonic") || 
        c.descripcion.toLowerCase().includes("cilonic");

      if (esAnticiclonica) {
        // Ajustar reactivamente el precio sugerido de la cortina al margen del slider vs base del 0%
        const PRECIO_M2_ANTICICLONICA = 4950;
        const precioM2Base = PRECIO_M2_ANTICICLONICA;
        const areaM2 = (c.ancho * c.alto) / 1000000;
        const totalPartidaConIva = Math.round(areaM2 * (precioM2Base * (1 + margenUtilidadPct)) * c.cantidad * 100) / 100;
        const subtotalPartidaSinIva = Math.round((totalPartidaConIva / 1.16) * 100) / 100;
        
        precioSugerido += subtotalPartidaSinIva;
        totalConIvaAcumulado += totalPartidaConIva;
      } else {
        const sub = c.costoMateriales + c.costoDesperdicio + c.costoManoObra;
        const subtotalPartidaSinIva = Math.round(sub * (1 + margenUtilidadPct) * 100) / 100;
        
        precioSugerido += subtotalPartidaSinIva;
        totalConIvaAcumulado += Math.round(subtotalPartidaSinIva * 1.16 * 100) / 100;
      }
    });

    const subtotal = costoMaterial + costoDesperdicio + costoManoObra;
    const flete = costoFlete ?? 0;
    const total = totalConIvaAcumulado + Math.round(flete * 1.16 * 100) / 100;
    const iva = Math.round((total - (precioSugerido + flete)) * 100) / 100;

    return {
      costoMaterial,
      costoDesperdicio,
      costoManoObra,
      subtotal,
      precioSugerido,
      flete,
      iva,
      total
    };
  }, [conceptosTemp, margenUtilidadPct, costoFlete]);

  // Guardar Cotización completa (Crear o Editar)
  const handleSaveQuote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clienteId || conceptosTemp.length === 0) return;

    const clienteObj = clientes.find((c) => c.id === clienteId);
    if (!clienteObj) return;

    // Recalcular conceptos con el margen de utilidad definitivo
    const conceptosDefinitive = conceptosTemp.map((c) => {
      return calcularConceptoNesting(
        c.descripcion,
        c.tipoTrabajo,
        c.materialId || null,
        c.vidrioMaterialId || null,
        c.ancho,
        c.alto,
        c.cantidad,
        c.costoManoObra,
        margenUtilidadPct
      );
    });

    const quotePayload = {
      sucursalId: sucursalActivaId === "todos" ? "suc-1" : sucursalActivaId,
      clienteId,
      clienteNombre: clienteObj.nombre,
      vendedorId: usuarioActivo.id,
      vendedorNombre: usuarioActivo.nombre,
      estatus: (editingQuoteId ? (cotizaciones.find(q => q.id === editingQuoteId)?.estatus || "borrador") : "borrador") as Quote["estatus"],
      conceptos: conceptosDefinitive,
      costoMaterial: quoteSummary.costoMaterial,
      costoDesperdicio: quoteSummary.costoDesperdicio,
      costoManoObra: quoteSummary.costoManoObra,
      subtotal: quoteSummary.precioSugerido, // En el tipo, subtotal ya es precio sugerido antes de IVA
      margenUtilidadPct,
      iva: quoteSummary.iva,
      total: quoteSummary.total,
      fechaVigencia,
      fotosEvidenciaArea: fotosEvidenciaTemp,
      fotosInstalado: editingQuoteId ? (cotizaciones.find(q => q.id === editingQuoteId)?.fotosInstalado || []) : [],
      direccionEntrega: direccionEntrega.trim() 
        ? direccionEntrega 
        : (latEntrega !== null && lngEntrega !== null ? "Ubicación fijada en mapa" : undefined),
      coordenadasEntrega: (latEntrega !== null && lngEntrega !== null) ? { lat: latEntrega, lng: lngEntrega } : undefined,
      distanciaEntregaKm: distanciaFlete ?? undefined,
      tiempoEntregaMin: tiempoFlete ?? undefined,
      costoFlete: costoFlete ?? undefined,
      prioridad
    };

    if (editingQuoteId) {
      editarCotizacion(editingQuoteId, quotePayload);

      setEditingQuoteId(null);
    } else {
      agregarCotizacion(quotePayload);
      registrarActividad(
        "quotes",
        "crear",
        `Creó cotización borrador para el cliente: ${clienteObj.nombre} por un total de $${quoteSummary.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN`
      );
    }

    setIsFormOpen(false);
    setConceptosTemp([]);
    setClienteId("");
    setFotosEvidenciaTemp([]);
    setDireccionEntrega("");
    setLatEntrega(null);
    setLngEntrega(null);
    setDistanciaFlete(null);
    setTiempoFlete(null);
    setCostoFlete(null);
    setPrioridad("media");
  };

  const handleAprobarCotizacion = async (quote: Quote) => {
    actualizarEstatusCotizacion(quote.id, "aprobada");
    registrarActividad(
      "quotes",
      "estatus",
      `Aprobó la cotización ${quote.folio} para el cliente: ${quote.clienteNombre}`
    );
    // Generar orden de taller automática
    useWorkshopStore.getState().crearOrdenTallerDesdeCotizacion(quote.id);

    // Agendar fabricación en calendario (Google Calendar)
    const fechaCompromiso = new Date(Date.now() + 5 * 86400000);
    useGoogleStore.getState().crearEventoAgenda(
      `Fabricación: ${quote.clienteNombre} (${quote.folio})`,
      `Corte de perfiles de aluminio y habilitación de hojas de vidrio para los canceles/domos del folio ${quote.folio}.`,
      new Date(Date.now() + 86400000).toISOString().split("T")[0] + "T09:00:00.000Z",
      fechaCompromiso.toISOString().split("T")[0] + "T18:00:00.000Z",
      "produccion",
      quote.id
    );

    // Ecosistema Google: Buscar o crear carpeta de cliente en Google Drive
    const driveFiles = useGoogleStore.getState().archivosDrive;
    const clientFolder = driveFiles.find(
      (f) => f.nombre === quote.clienteNombre && f.parentFolderId === "f-crm"
    );
    const folderId = clientFolder ? clientFolder.id : await useGoogleStore.getState().crearCarpetaClienteDrive(quote.clienteId, quote.clienteNombre);

    // Guardar hojas de nesting y contratos en Google Drive
    useGoogleStore.getState().crearArchivoDrive(`Nesting_Calculos_${quote.folio}.xlsx`, "sheet", folderId, "42 KB");
    useGoogleStore.getState().crearArchivoDrive(`Contrato_Servicios_${quote.folio}.docx`, "doc", folderId, "115 KB");

    // Enviar correo de notificación a taller por Gmail
    useGoogleStore.getState().enviarNotificacionGmail(
      "sofia.ramirez@grupoarca.mx",
      `Nueva Orden de Trabajo Generada para ${quote.clienteNombre}`,
      `Hola Sofía,\n\nSe ha aprobado la cotización ${quote.folio} del cliente ${quote.clienteNombre}.\nLa orden de trabajo correspondiente ya se encuentra en estado PENDIENTE en el Kanban de taller.\n\nPor favor, ingresa a verificar los materiales requeridos para iniciar producción.\n\nSaludos,\nSistema Arca 2.0`
    );
  };

  const handleEliminarCotizacion = (quote: Quote) => {
    if (usuarioActivo.rol !== "admin") {
      alert("Acceso denegado: Solo el Administrador puede eliminar cotizaciones.");
      return;
    }
    eliminarCotizacion(quote.id);
    registrarActividad(
      "quotes",
      "eliminar",
      `Eliminó la cotización ${quote.folio} del cliente: ${quote.clienteNombre}`
    );
    if (selectedQuoteId === quote.id) {
      setSelectedQuoteId(null);
    }
  };

  // Filtrado de cotizaciones
  const filteredQuotes = useMemo(() => {
    return cotizaciones.filter((q) => {
      const matchesSucursal = sucursalActivaId === "todos" || q.sucursalId === sucursalActivaId;
      const matchesStatus = statusFilter === "todos" || q.estatus === statusFilter;
      const text = searchTerm.toLowerCase().trim();
      const matchesSearch = !text ||
        q.folio.toLowerCase().includes(text) ||
        q.clienteNombre.toLowerCase().includes(text);

      return matchesSucursal && matchesStatus && matchesSearch;
    });
  }, [cotizaciones, sucursalActivaId, statusFilter, searchTerm]);

  // KPIs Financieros Consolidados
  const kpiFinancieros = useMemo(() => {
    let ventasTotales = 0;
    let mermaEconomica = 0;
    let cotizacionesAprobadas = 0;

    cotizaciones.forEach((q) => {
      if (q.sucursalId === sucursalActivaId || sucursalActivaId === "todos") {
        ventasTotales += q.total;
        mermaEconomica += q.costoDesperdicio * (1 + q.margenUtilidadPct); // Merma a valor comercial
        if (q.estatus === "aprobada") {
          cotizacionesAprobadas++;
        }
      }
    });

    return {
      ventasTotales,
      mermaEconomica,
      cotizacionesAprobadas
    };
  }, [cotizaciones, sucursalActivaId]);

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto p-4 md:p-8 space-y-6">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            Cotizaciones & Presupuestos
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Calculadora inteligente de presupuestos comerciales aplicando nesting de materiales y mano de obra.
          </p>
        </div>

        {(usuarioActivo.rol === "admin" || usuarioActivo.rol === "ventas") && (
          <button
            onClick={() => {
              // Inicializar formulario con un cliente si existe Brenda
              const brenda = clientes.find(c => c.nombre.toUpperCase().includes("BRENDA"));
              if (brenda) setClienteId(brenda.id);
              setConceptosTemp([]);
              setDireccionEntrega("");
              setLatEntrega(null);
              setLngEntrega(null);
              setDistanciaFlete(null);
              setTiempoFlete(null);
              setCostoFlete(null);
              setPrioridad("media");
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm shadow-emerald-500/20 text-sm align-self-start"
          >
            <Plus className="w-4 h-4" />
            Nueva Cotización
          </button>
        )}
      </div>

      {/* TARJETAS KPI COMERCIALES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Ventas Proyectadas (Cartera)</p>
          <p className="text-3xl font-black text-zinc-900 dark:text-white mt-1">
            ${kpiFinancieros.ventasTotales.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Merma de Material (Recuperada)</p>
          <p className="text-3xl font-black text-amber-600 dark:text-amber-500 mt-1">
            ${kpiFinancieros.mermaEconomica.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
          </p>
        </div>
        <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-5 rounded-3xl shadow-sm">
          <p className="text-xs text-zinc-400 font-bold uppercase tracking-wider">Cotizaciones Aprobadas</p>
          <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 mt-1">
            {kpiFinancieros.cotizacionesAprobadas} órdenes
          </p>
        </div>
      </div>

      {/* BUSCADOR Y FILTRO ESTATUS */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        <div className="md:col-span-7 relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar cotizaciones por folio o nombre de cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent focus:outline-none"
          />
        </div>

        <div className="md:col-span-5 flex bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
          {["todos", "borrador", "enviada", "aprobada", "rechazada"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`flex-1 text-xs font-bold py-2 capitalize rounded-lg transition-all ${
                statusFilter === status
                  ? "bg-white dark:bg-zinc-800 text-zinc-950 dark:text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* CORE CONTENIDO: LISTADO Y DETALLES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* TABLA DE COTIZACIONES */}
        <div className={`${selectedQuote ? "lg:col-span-7" : "lg:col-span-12"} bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden shadow-sm transition-all duration-300`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800 text-xs font-extrabold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider bg-zinc-50/50 dark:bg-zinc-950">
                  <th className="px-6 py-4">Folio</th>
                  <th className="px-6 py-4">Cliente</th>
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Total</th>
                  <th className="px-6 py-4">Estatus</th>
                  <th className="px-6 py-4 text-right">Estatus Fáctico</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {filteredQuotes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-sm text-zinc-400 font-medium">
                      No se encontraron cotizaciones.
                    </td>
                  </tr>
                ) : (
                  filteredQuotes.map((quote) => (
                    <tr
                      key={quote.id}
                      onClick={() => setSelectedQuoteId(selectedQuoteId === quote.id ? null : quote.id)}
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 transition-colors cursor-pointer ${
                        selectedQuoteId === quote.id ? "bg-emerald-50/30 dark:bg-emerald-950/10" : ""
                      }`}
                    >
                      <td className="px-6 py-4 font-black text-sm text-zinc-800 dark:text-zinc-100">
                        <div className="flex flex-col gap-1 items-start">
                          <span>{quote.folio}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider ${
                            quote.prioridad === "alta"
                              ? "bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400 border border-red-200/40"
                              : quote.prioridad === "baja"
                              ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-200/40"
                              : "bg-blue-50 text-blue-600 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200/40"
                          }`}>
                            {quote.prioridad || "media"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-zinc-800 dark:text-zinc-200">
                        {quote.clienteNombre}
                      </td>
                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(quote.createdAt).toLocaleDateString("es-MX")}
                      </td>
                      <td className="px-6 py-4 font-black text-sm text-zinc-800 dark:text-zinc-100">
                        ${quote.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-black capitalize border ${
                          quote.estatus === "aprobada"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-400 dark:border-emerald-800"
                            : quote.estatus === "enviada"
                            ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950 dark:text-sky-400 dark:border-sky-800"
                            : "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                        }`}>
                          {quote.estatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleEditClick(quote)}
                            className="px-2 py-1 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
                            title="Editar cotización"
                          >
                            Editar
                          </button>
                          {quote.estatus !== "aprobada" && (
                            <button
                              onClick={() => setConfirmDialog({ isOpen: true, tipo: "aprobar", quote })}
                              className="px-2 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded transition-colors"
                              title="Marcar como Aprobada (Genera Orden)"
                            >
                              Aprobar
                            </button>
                          )}
                          {usuarioActivo.rol === "admin" && (
                            <button
                              onClick={() => setConfirmDialog({ isOpen: true, tipo: "eliminar", quote })}
                              className="px-2 py-1 text-xs font-bold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded transition-colors"
                              title="Eliminar cotización permanentemente"
                            >
                              Eliminar
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================================================================
            PANEL LATERAL: PRESUPUESTO COMERCIAL DETALLADO
            ========================================================================= */}
        {selectedQuote && (
          <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-6 shadow-md">
            
            {/* Membrete Oficial de la Matriz */}
            <div className="border-b border-zinc-100 dark:border-zinc-800 pb-4 flex flex-col md:flex-row items-center md:items-start gap-4">
              {empresa.logoUrl && (
                <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/50 flex items-center justify-center p-2 shrink-0 shadow-inner">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={empresa.logoUrl} alt="Logo Empresa" className="max-w-full max-h-full object-contain rounded-lg" />
                </div>
              )}
              <div className="text-center md:text-left space-y-0.5 min-w-0 flex-1">
                <p className="text-sm font-black text-zinc-800 dark:text-zinc-100 truncate">{empresa.nombreComercial}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">Dirección: {empresa.calle} {empresa.numero}, Col. {empresa.colonia}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">{empresa.municipio}, {empresa.estado}, C.P. {empresa.codigoPostal}</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold">Contacto: {empresa.telefono} | Cel: {empresa.whatsapp}</p>
              </div>
            </div>

            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-4">
              <div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">
                  Presupuesto Comercial
                </span>
                <h3 className="text-xl font-bold text-zinc-900 dark:text-white mt-0.5">
                  {selectedQuote.folio}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedQuoteId(null)}
                className="text-xs font-bold text-zinc-400 hover:text-zinc-600 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-2.5 py-1"
              >
                Cerrar
              </button>
            </div>

            {/* Datos Ficha */}
            <div className="text-xs space-y-1.5 bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50">
              <p className="text-zinc-400 font-semibold"><span className="text-zinc-800 dark:text-zinc-200 font-bold">Cliente:</span> {selectedQuote.clienteNombre}</p>
              <p className="text-zinc-400 font-semibold"><span className="text-zinc-800 dark:text-zinc-200 font-bold">Vendedor:</span> {selectedQuote.vendedorNombre}</p>
              <p className="text-zinc-400 font-semibold"><span className="text-zinc-800 dark:text-zinc-200 font-bold">Vigencia:</span> {selectedQuote.fechaVigencia}</p>
              <p className="text-zinc-400 font-semibold flex items-center gap-1.5">
                <span className="text-zinc-800 dark:text-zinc-200 font-bold">Prioridad:</span> 
                <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${
                  selectedQuote.prioridad === "alta"
                    ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-400 dark:border-red-800"
                    : selectedQuote.prioridad === "baja"
                    ? "bg-zinc-50 text-zinc-600 border-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800"
                    : "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800"
                }`}>
                  {selectedQuote.prioridad || "media"}
                </span>
              </p>
            </div>

            {/* Ubicación de Entrega e Instalación (Uso Interno) */}
            <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/50 text-xs space-y-3">
              <div className="flex justify-between items-center border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2">
                <span className="font-black text-emerald-600 dark:text-emerald-400 uppercase text-[9px] tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  Ubicación de Entrega e Instalación
                </span>
                <span className="text-[8px] bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                  Interno
                </span>
              </div>

              {(selectedQuote.direccionEntrega || selectedQuote.coordenadasEntrega) ? (
                <div className="space-y-3">
                  {selectedQuote.direccionEntrega && (
                    <div>
                      <span className="text-zinc-800 dark:text-zinc-200 font-bold block mb-0.5">Dirección:</span>
                      <span className="text-zinc-500 font-semibold leading-relaxed block text-[11px]">{selectedQuote.direccionEntrega}</span>
                    </div>
                  )}

                  {selectedQuote.coordenadasEntrega ? (
                    <div className="space-y-2">
                      <div className="relative w-full h-36 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950">
                        <div ref={detailsMapRef} className="w-full h-full" />
                      </div>
                      
                      {selectedQuote.distanciaEntregaKm !== undefined && (
                        <div className="grid grid-cols-3 gap-2 text-center bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/50 p-2 rounded-xl">
                          <div>
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Distancia</span>
                            <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">{selectedQuote.distanciaEntregaKm.toFixed(1)} km</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Tiempo Est.</span>
                            <span className="text-[10px] font-black text-zinc-800 dark:text-zinc-200">{selectedQuote.tiempoEntregaMin} mins</span>
                          </div>
                          <div>
                            <span className="block text-[8px] font-bold text-zinc-400 uppercase">Costo Flete</span>
                            <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400">${selectedQuote.costoFlete?.toLocaleString("es-MX")}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                        <span>LAT: {selectedQuote.coordenadasEntrega.lat.toFixed(6)}</span>
                        <span>LNG: {selectedQuote.coordenadasEntrega.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[10px] text-amber-600 dark:text-amber-500 font-bold italic">
                      ⚠️ No se registraron coordenadas geográficas.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  <p className="text-zinc-400 font-semibold italic text-[11px]">No se ha registrado ubicación para la entrega.</p>
                  <button
                    onClick={() => handleEditClick(selectedQuote)}
                    className="text-emerald-600 hover:text-emerald-700 font-bold hover:underline text-[10px] flex items-center gap-1"
                  >
                    ✏️ Editar para agregar ubicación
                  </button>
                </div>
              )}
            </div>

            {/* Listado Partidas */}
            <div className="space-y-4">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Partidas del Presupuesto</p>
              
              {selectedQuote.conceptos.map((c, idx) => (
                <div key={c.id} className="border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 bg-zinc-50/50 dark:bg-zinc-950/20 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100">{c.descripcion}</h4>
                        <button
                          type="button"
                          onClick={() => handleEditConceptDirect(selectedQuote, idx)}
                          title="Editar esta partida"
                          className="text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 p-1 rounded transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[10px] text-zinc-400 font-medium">
                        Medidas: {(c.ancho / 1000).toFixed(2)} × {(c.alto / 1000).toFixed(2)} m · Cantidad: {c.cantidad} pza(s)
                      </p>
                    </div>
                    <span className="text-sm font-black text-zinc-800 dark:text-zinc-200">
                      ${c.precioSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  {/* Detalle de nesting del concepto */}
                  <div className="bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 space-y-2 shadow-inner">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold border-b border-zinc-100 dark:border-zinc-900 pb-1">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Optimización por Especialidad ({c.tipoTrabajo.toUpperCase()}):</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <p>• Costo Neto: <span className="font-bold text-zinc-700 dark:text-zinc-300">${c.costoMateriales} MXN</span></p>
                      <p>• Merma Cobrada: <span className="font-bold text-amber-600">${c.costoDesperdicio} MXN</span></p>
                    </div>

                    {c.nestingLinear && (
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10px] space-y-1">
                        <p className="font-bold text-zinc-700 dark:text-zinc-300 flex justify-between">
                          <span>Nesting Aluminio (1D):</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{c.nestingLinear.porcentajeEficienciaGlobal}% ef.</span>
                        </p>
                        <p>· Barras Requeridas: <span className="font-bold text-zinc-800 dark:text-zinc-200">{c.nestingLinear.barrasTotalesRequeridas} tramos de 6.10m</span></p>
                      </div>
                    )}

                    {c.nestingGlass && (
                      <div className="bg-zinc-50 dark:bg-zinc-900/50 p-2 rounded-lg border border-zinc-100 dark:border-zinc-800 text-[10px] space-y-1">
                        <p className="font-bold text-zinc-700 dark:text-zinc-300 flex justify-between">
                          <span>Nesting Vidrio (2D):</span>
                          <span className="text-emerald-600 dark:text-emerald-400">{c.nestingGlass.porcentajeEficienciaGlobal}% ef.</span>
                        </p>
                        <p>· Planchas Requeridas: <span className="font-bold text-zinc-800 dark:text-zinc-200">{c.nestingGlass.planchasTotalesRequeridas} unids (3x2m)</span></p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <hr className="border-zinc-200 dark:border-zinc-800" />

            {/* Desglose general */}
            <div className="text-sm space-y-2 bg-zinc-50 dark:bg-zinc-950 p-5 rounded-3xl border border-zinc-200/50">
              <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                <span>Material Neto Consumido:</span>
                <span>${selectedQuote.costoMaterial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-amber-600 font-semibold">
                <span>Costo Desperdicio (Merma Nesting):</span>
                <span>${selectedQuote.costoDesperdicio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                <span>Mano de Obra Instalación:</span>
                <span>${selectedQuote.costoManoObra.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 font-bold border-t border-dashed border-zinc-200 pt-2">
                <span>Costo Total Directo (Fábrica):</span>
                <span>${(selectedQuote.costoMaterial + selectedQuote.costoDesperdicio + selectedQuote.costoManoObra).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                <span>Precio Venta Sugerido (antes de IVA):</span>
                <span>${selectedQuote.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              {selectedQuote.costoFlete !== undefined && selectedQuote.costoFlete > 0 && (
                <div className="flex justify-between text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                  <span>Costo Flete (Logística):</span>
                  <span>${selectedQuote.costoFlete.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-zinc-400 font-semibold">
                <span>IVA Trasladado (16%):</span>
                <span>${selectedQuote.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-base font-black text-zinc-800 dark:text-white border-t border-zinc-200 pt-2">
                <span>Total de Presupuesto:</span>
                <span className="text-emerald-600">${selectedQuote.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</span>
              </div>
            </div>

            {/* Evidencias del Área a Cotizar */}
            <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-zinc-400" />
                  Evidencias del Área a Cotizar
                </span>
                <button
                  onClick={() => {
                    setSelectedUploadQuoteId(selectedQuote.id);
                    setUploadUrlsSelected([]);
                    setCustomImageUrl("");
                    setIsUploadModalOpen(true);
                  }}
                  className="text-[10px] text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Agregar Fotos
                </button>
              </div>

              {(!selectedQuote.fotosEvidenciaArea || selectedQuote.fotosEvidenciaArea.length === 0) ? (
                <p className="text-[11px] text-zinc-400 italic bg-zinc-50 dark:bg-zinc-950/30 p-3 rounded-xl text-center">
                  Sin fotos de evidencia de área registradas.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {selectedQuote.fotosEvidenciaArea.map((foto, idx) => (
                    <div
                      key={idx}
                      className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm"
                    >
                      <img src={foto} alt={`Evidencia ${idx}`} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <a
                          href={foto}
                          download={`Evidencia_${idx}.jpg`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-white hover:bg-zinc-100 text-zinc-900 text-[10px] font-bold py-1.5 px-2.5 rounded-lg flex items-center gap-1 shadow-md hover:scale-105 transition-transform"
                        >
                          <Download className="w-3 h-3 text-emerald-600" />
                          Bajar
                        </a>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(selectedQuote.id, foto, "evidencia")}
                          className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 shadow-md hover:scale-110 transition-transform flex items-center justify-center w-5 h-5"
                          title="Eliminar evidencia de obra"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>



            {/* Acciones del presupuesto */}
            <div className="space-y-3">
              <button
                onClick={() => handleEditClick(selectedQuote)}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
              >
                <Sliders className="w-4 h-4" />
                Editar Cotización (Cambiar Conceptos / Margen)
              </button>

              {selectedQuote.estatus !== "aprobada" && (
                <button
                  onClick={() => setConfirmDialog({ isOpen: true, tipo: "aprobar", quote: selectedQuote })}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                  Autorizar y Aprobar Cotización
                </button>
              )}

              {usuarioActivo.rol === "admin" && (
                <button
                  onClick={() => setConfirmDialog({ isOpen: true, tipo: "eliminar", quote: selectedQuote })}
                  className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-bold py-2.5 rounded-xl text-xs transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Eliminar Cotización Permanentemente
                </button>
              )}

              {selectedQuote.estatus === "aprobada" && (
                <div className="bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-200 dark:border-zinc-800/80 p-4 rounded-2xl space-y-4 mt-2 animate-in fade-in duration-200 text-xs text-left">
                  <div className="flex items-center gap-2 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h4 className="font-black text-[10px] text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      Seguimiento de Producción y Entrega
                    </h4>
                  </div>
                  
                  {/* Fabricación en Taller */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 font-bold block">1. Fabricación (Taller)</span>
                      <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                        {trackingInfo?.taller ? `Folio Taller: ${trackingInfo.taller.folio}` : "Generando orden de producción..."}
                      </span>
                    </div>
                    {trackingInfo?.taller ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black capitalize ${
                        trackingInfo.taller.estado === "pendiente"
                          ? "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          : trackingInfo.taller.estado === "en_produccion"
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-400"
                          : trackingInfo.taller.estado === "terminado"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          trackingInfo.taller.estado === "pendiente"
                            ? "bg-zinc-400"
                            : trackingInfo.taller.estado === "en_produccion"
                            ? "bg-orange-500 animate-pulse"
                            : trackingInfo.taller.estado === "terminado"
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`} />
                        {trackingInfo.taller.estado === "en_produccion" ? "En Producción" : trackingInfo.taller.estado}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-semibold italic">Pendiente</span>
                    )}
                  </div>

                  {/* Logística y Entrega */}
                  <div className="flex items-start justify-between gap-3 border-t border-zinc-100 dark:border-zinc-800/40 pt-3">
                    <div>
                      <span className="text-zinc-500 dark:text-zinc-400 font-bold block">2. Entrega (Logística)</span>
                      {trackingInfo?.entrega ? (
                        <div className="text-[10px] text-zinc-400 font-semibold space-y-0.5 mt-0.5">
                          {trackingInfo.entrega.choferAsignado && (
                            <p>Chofer: <span className="text-zinc-600 dark:text-zinc-300 font-bold">{trackingInfo.entrega.choferAsignado}</span></p>
                          )}
                          {trackingInfo.entrega.fechaProgramada && (
                            <p>Programado: <span className="text-zinc-600 dark:text-zinc-300 font-bold">{new Date(trackingInfo.entrega.fechaProgramada).toLocaleDateString("es-MX")}</span></p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[10px] text-zinc-400 font-semibold block mt-0.5">
                          {trackingInfo?.taller?.estado === "terminado" 
                            ? "En espera de programación de envío..." 
                            : "En espera de que taller finalice fabricación..."}
                        </span>
                      )}
                    </div>
                    {trackingInfo?.entrega ? (
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-black capitalize ${
                        trackingInfo.entrega.estado === "programado"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/50 dark:text-purple-400"
                          : trackingInfo.entrega.estado === "en_ruta"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-400"
                          : trackingInfo.entrega.estado === "entregado"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400"
                          : "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          trackingInfo.entrega.estado === "programado"
                            ? "bg-purple-500"
                            : trackingInfo.entrega.estado === "en_ruta"
                            ? "bg-sky-500 animate-pulse"
                            : trackingInfo.entrega.estado === "entregado"
                            ? "bg-emerald-500"
                            : "bg-red-500"
                        }`} />
                        {trackingInfo.entrega.estado === "en_ruta" ? "En Ruta" : trackingInfo.entrega.estado === "entregado" ? "Entregado" : trackingInfo.entrega.estado}
                      </span>
                    ) : (
                      <span className="text-[10px] text-zinc-400 font-semibold italic">Sin Programar</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODAL: NUEVA COTIZACIÓN INTELIGENTE (FORMULARIO)
          ========================================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-[95vw] max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <h3 className="text-lg font-black text-zinc-900 dark:text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                {editingQuoteId ? "Editar Cotización con Nesting de Materiales" : "Nueva Cotización con Nesting de Materiales"}
              </h3>
              <button 
                onClick={() => {
                  setIsFormOpen(false);
                  setEditingQuoteId(null);
                  setDireccionEntrega("");
                  setLatEntrega(null);
                  setLngEntrega(null);
                  setDistanciaFlete(null);
                  setTiempoFlete(null);
                  setCostoFlete(null);
                }}
                className="text-zinc-400 hover:text-zinc-600 text-sm font-bold"
              >
                Cerrar
              </button>
            </div>

            <form onSubmit={handleSaveQuote} className="space-y-6 max-w-4xl mx-auto">
              
              {/* PANEL PRINCIPAL: CLIENTE Y CONCEPTOS */}
              <div className="space-y-6">
                
                {/* Selección Cliente, Vigencia y Prioridad */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Seleccionar Cliente (CRM):</label>
                    <select
                      required
                      value={clienteId}
                      onChange={(e) => setClienteId(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">-- Elige un cliente --</option>
                      {clientes.map((c) => (
                        <option key={c.id} value={c.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                          {c.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Vigencia del Presupuesto:</label>
                    <input
                      type="date"
                      required
                      value={fechaVigencia}
                      onChange={(e) => setFechaVigencia(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-1.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 mb-1">Prioridad del Pedido:</label>
                    <select
                      value={prioridad}
                      onChange={(e) => setPrioridad(e.target.value as "baja" | "media" | "alta")}
                      className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="baja" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Baja</option>
                      <option value="media" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Media</option>
                      <option value="alta" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Alta</option>
                    </select>
                  </div>
                </div>

                {/* EVIDENCIAS DE OBRA (CAPTURA EN SITIO) */}
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      1. Evidencias de la Obra (Captura en Sitio)
                    </h4>
                    <span className="text-[10px] bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold px-2 py-0.5 rounded-md">
                      {fotosEvidenciaTemp.length} fotos tomadas
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Si estás elaborando la cotización directamente en la obra, utiliza la cámara de tu tablet o móvil para capturar el estado actual del espacio (claros, fachadas, barandales).
                  </p>

                  <div className="space-y-3">
                    {/* Grid de previsualizaciones */}
                    {fotosEvidenciaTemp.length > 0 && (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {fotosEvidenciaTemp.map((foto, idx) => (
                          <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-sm">
                            <img src={foto} alt={`Evidencia ${idx + 1}`} className="w-full h-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setFotosEvidenciaTemp(fotosEvidenciaTemp.filter((_, i) => i !== idx))}
                              className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar foto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[9px] font-bold text-center py-0.5">
                              Foto {idx + 1}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Zona de carga: cámara (móvil/tablet) + galería (escritorio) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">

                      {/* CÁMARA: abre directamente la cámara trasera en móvil/tablet */}
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 border border-dashed border-emerald-400 dark:border-emerald-700 hover:border-emerald-600 hover:bg-emerald-50/60 dark:hover:bg-emerald-950/20 py-4 rounded-xl text-xs font-bold text-emerald-600 dark:text-emerald-400 transition-colors bg-white dark:bg-zinc-950">
                        <Camera className="w-5 h-5" />
                        <span>📸 Abrir Cámara</span>
                        <span className="text-[9px] text-zinc-400 font-normal">Tablet / Móvil</span>
                        {/*
                          capture="environment" → cámara trasera del dispositivo.
                          En escritorio el navegador muestra el explorador de archivos como fallback.
                        */}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            Array.from(e.target.files || []).forEach((file) => {
                              const reader = new FileReader();
                              reader.onloadend = () =>
                                setFotosEvidenciaTemp((prev) => [...prev, reader.result as string]);
                              reader.readAsDataURL(file);
                            });
                            e.target.value = ""; // reset para poder volver a seleccionar
                          }}
                        />
                      </label>

                      {/* GALERÍA / ARCHIVO: selección múltiple desde el explorador */}
                      <label className="cursor-pointer flex flex-col items-center justify-center gap-1.5 border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-zinc-500 dark:hover:border-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 py-4 rounded-xl text-xs font-bold text-zinc-500 dark:text-zinc-400 transition-colors bg-white dark:bg-zinc-950">
                        <UploadCloud className="w-5 h-5" />
                        <span>🖼️ Elegir de Galería</span>
                        <span className="text-[9px] text-zinc-400 font-normal">Múltiples archivos</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          className="hidden"
                          onChange={(e) => {
                            Array.from(e.target.files || []).forEach((file) => {
                              const reader = new FileReader();
                              reader.onloadend = () =>
                                setFotosEvidenciaTemp((prev) => [...prev, reader.result as string]);
                              reader.readAsDataURL(file);
                            });
                            e.target.value = "";
                          }}
                        />
                      </label>
                    </div>

                    {fotosEvidenciaTemp.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFotosEvidenciaTemp([])}
                        className="text-[10px] text-red-500 hover:text-red-600 font-bold w-full text-right"
                      >
                        ✕ Eliminar todas las fotos
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. UBICACIÓN DE ENTREGA E INSTALACIÓN (USO INTERNO) */}
                <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-5 rounded-2xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-emerald-600" />
                      2. Ubicación de Entrega e Instalación (Uso Interno)
                    </h4>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                      Logística Confidencial
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal">
                    Registra la dirección física y coordenadas exactas para la entrega de materiales e instalación en obra. Esta información es de uso exclusivo del negocio.
                  </p>

                  <div className="space-y-4">
                    {/* Campo de dirección y GPS */}
                    <div className="flex flex-col md:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase mb-1">Dirección de Entrega / Obra:</label>
                        <input
                          type="text"
                          placeholder="Calle, Número, Colonia, Municipio..."
                          value={direccionEntrega}
                          onChange={(e) => setDireccionEntrega(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="md:self-end">
                        <button
                          type="button"
                          onClick={handleGPSClick}
                          className="w-full md:w-auto flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors shadow-sm"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Obtener por GPS</span>
                        </button>
                      </div>
                    </div>

                    {/* Canvas de Google Maps */}
                    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950 shadow-inner">
                      <div ref={mapRef} className="w-full h-full" />
                      {!latEntrega && (
                        <div className="absolute inset-0 bg-black/5 dark:bg-black/20 flex flex-col items-center justify-center pointer-events-none p-4 text-center">
                          <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl shadow-lg max-w-xs space-y-1">
                            <p className="text-[10px] font-black text-zinc-800 dark:text-zinc-100">¿No ves el pin?</p>
                            <p className="text-[9px] text-zinc-500 dark:text-zinc-400">Haz clic en cualquier punto del mapa o arrastra el marcador para fijar la ubicación exacta de entrega.</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Coordenadas informativas */}
                    {latEntrega !== null && lngEntrega !== null && (
                      <div className="flex justify-between items-center text-[10px] text-zinc-400 font-bold bg-zinc-100 dark:bg-zinc-950/40 p-2.5 rounded-xl border border-zinc-200/50">
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-500 uppercase">Lat:</span> 
                          <span className="text-zinc-700 dark:text-zinc-300">{latEntrega.toFixed(6)}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="text-zinc-500 uppercase">Lng:</span> 
                          <span className="text-zinc-700 dark:text-zinc-300">{lngEntrega.toFixed(6)}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setLatEntrega(null);
                            setLngEntrega(null);
                            setDistanciaFlete(null);
                            setTiempoFlete(null);
                            setCostoFlete(null);
                          }}
                          className="text-red-500 hover:text-red-600 transition-colors uppercase tracking-wider text-[9px]"
                        >
                          Quitar Ubicación
                        </button>
                      </div>
                    )}

                    {/* Botón de calcular flete avanzado y resumen */}
                    {latEntrega !== null && lngEntrega !== null && (
                      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-xl space-y-3 shadow-sm text-xs">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-bold text-zinc-400 uppercase">Estadísticas de Entrega y Flete</span>
                          <button
                            type="button"
                            onClick={calcularRutaYFlete}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-1 px-3 rounded-lg text-[10px] uppercase tracking-wider transition-colors"
                          >
                            ⚡ Calcular Flete y Ruta
                          </button>
                        </div>

                        {distanciaFlete !== null && (
                          <div className="grid grid-cols-3 gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-3 text-center">
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase">Distancia</span>
                              <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{distanciaFlete.toFixed(1)} km</span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase">Tiempo Est.</span>
                              <span className="text-xs font-black text-zinc-800 dark:text-zinc-200">{tiempoFlete} mins</span>
                            </div>
                            <div className="bg-zinc-50 dark:bg-zinc-900/60 p-2 rounded-lg">
                              <span className="block text-[9px] font-bold text-zinc-400 uppercase">Flete Sugerido</span>
                              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">${Math.round(distanciaFlete * 15).toLocaleString("es-MX")}</span>
                            </div>
                          </div>
                        )}

                        {distanciaFlete !== null && (
                          <div className="space-y-1.5 pt-1">
                            <label className="block text-[9px] font-bold text-zinc-500 dark:text-zinc-400 uppercase">Flete Definitivo a Cobrar ($):</label>
                            <input
                              type="number"
                              value={costoFlete || ""}
                              onChange={(e) => setCostoFlete(e.target.value ? parseInt(e.target.value) : null)}
                              className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <p className="text-[9px] text-zinc-400 italic">
                              * Tarifa base de $15.00 MXN por kilómetro de trayecto por carretera (Directions API / Matrix).
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Formulario de Concepto Individual */}
                <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-8 rounded-3xl space-y-8 shadow-sm">
                  <h4 className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest flex items-center gap-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                    <Hammer className="w-4 h-4" /> Agregar Partida a Presupuestar
                  </h4>

                  {/* Sección 1: Información General */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">1</span>
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        Información General
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Descripción de la Partida:</label>
                        <input
                          type="text"
                          placeholder="Ej: Cancel de baño, Domo principal..."
                          value={conDescripcion}
                          onChange={(e) => setConDescripcion(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Tipo de Trabajo (Especialidad):</label>
                        <select
                          value={selectTipoTrabajo}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSelectTipoTrabajo(val);
                            // Resetear materiales no aplicables si es un tipo fijo
                            if (val === "barandal") {
                              setConMaterialId("");
                            } else if (val === "pergola" || val === "porton" || val === "cortina") {
                              setConVidrioMaterialId("");
                            } else if (val === "otro") {
                              setCustomTipoTrabajo("");
                            }
                          }}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <option value="cancel" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Cancel de Vidrio/Aluminio</option>
                          <option value="ventana_anticiclonica" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Ventana Anticiclónica Huracán</option>
                          <option value="domo" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Domo Templado/Estructura</option>
                          <option value="barandal" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Barandal Templado</option>
                          <option value="pergola" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Pérgola de Aluminio</option>
                          <option value="porton" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Portón de Aluminio</option>
                          <option value="cortina" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Cortina Anticiclónica Huracán</option>
                          <option value="otro" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Otro / Trabajo Personalizado...</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Sección 2: Configuración de Componentes */}
                  <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">2</span>
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        Componentes e Instalación
                      </span>
                    </div>

                    {selectTipoTrabajo === "otro" && (
                      <div className="bg-zinc-50 dark:bg-zinc-950 p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 space-y-2 mb-4">
                        <label className="block text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Escribe la Especialidad/Trabajo Personalizado:</label>
                        <input
                          type="text"
                          required
                          placeholder="Ej: Fachada Integral, Ventana Proyectable, Espejo Biselado..."
                          value={customTipoTrabajo}
                          onChange={(e) => setCustomTipoTrabajo(e.target.value)}
                          className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                        <p className="text-[10px] text-zinc-400">Al seleccionar un trabajo personalizado, puedes agregar perfil de aluminio, vidrio o ambos de manera libre.</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Aluminio - Mostrar si aplica */}
                      {(selectTipoTrabajo === "cancel" || selectTipoTrabajo === "ventana_anticiclonica" || selectTipoTrabajo === "domo" || selectTipoTrabajo === "pergola" || selectTipoTrabajo === "porton" || selectTipoTrabajo === "cortina" || selectTipoTrabajo === "otro") && (
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Perfil de Estructura (Aluminio):</label>
                          <select
                            value={conMaterialId}
                            onChange={(e) => setConMaterialId(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="" className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">-- Ninguno / Elegir perfil --</option>
                            {materialesAluminio.map((m) => (
                              <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                                {m.descripcion} (${m.costoBase} MXN / {m.dimensionX}mm)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {/* Vidrio - Mostrar si aplica */}
                      {(selectTipoTrabajo === "cancel" || selectTipoTrabajo === "ventana_anticiclonica" || selectTipoTrabajo === "domo" || selectTipoTrabajo === "barandal" || selectTipoTrabajo === "otro") && (
                        <div className="md:col-span-1">
                          <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Hojas de Vidrio:</label>
                          <select
                            value={conVidrioMaterialId}
                            onChange={(e) => setConVidrioMaterialId(e.target.value)}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="" className="bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">-- Ninguno / Elegir vidrio --</option>
                            {materialesVidrio.map((m) => (
                              <option key={m.id} value={m.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                                {m.descripcion} (${m.costoBase} MXN/m² · {m.dimensionX}x{m.dimensionY}mm)
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div className={(selectTipoTrabajo === "cancel" || selectTipoTrabajo === "ventana_anticiclonica" || selectTipoTrabajo === "domo" || selectTipoTrabajo === "otro") ? "md:col-span-1" : "md:col-span-2"}>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Mano de Obra Directa ($ MXN):</label>
                        <input
                          type="number"
                          placeholder="Ej: 300"
                          value={conManoObra}
                          onChange={(e) => setConManoObra(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Sección 3: Dimensiones y Cantidad */}
                  <div className="space-y-4 pt-2 border-t border-zinc-100 dark:border-zinc-800/60">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">3</span>
                      <span className="text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest">
                        Dimensiones y Cantidad
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-6">
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Ancho X (m):</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Ancho en metros (ej: 2.55)"
                          value={conAncho}
                          onChange={(e) => setConAncho(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Alto Y (m):</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="Alto en metros (ej: 1.80)"
                          value={conAlto}
                          onChange={(e) => setConAlto(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1.5">Cantidad:</label>
                        <input
                          type="number"
                          min="1"
                          value={conCantidad}
                          onChange={(e) => setConCantidad(e.target.value)}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm font-bold text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* ALERTA DE PROMOCIÓN ANTICICLÓNICA INTERACTIVA */}
                  {esAnticiclonicaActiva && areaM2Calculada > 0 && (
                    <div className="bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20 p-4 rounded-xl space-y-2.5 text-xs">
                      <div className="flex items-center justify-between text-violet-700 dark:text-violet-300 font-bold border-b border-violet-500/20 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-violet-500 animate-pulse" />
                          <span>Cálculo Especial: Ventana/Cortina Anticiclónica</span>
                        </div>
                        <span className="bg-violet-600 text-white text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold animate-bounce">
                          Precio de Promoción
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <p>• Precio Unitario por m²: <span className="font-bold text-zinc-800 dark:text-zinc-200">${precioM2Vigente.toLocaleString("es-MX")} MXN</span></p>
                        <p>• Margen de Utilidad: <span className="font-bold text-emerald-600">{(margenUtilidadPct * 100).toFixed(0)}%</span></p>
                        <p>• Área de la ventana: <span className="font-bold text-zinc-800 dark:text-zinc-200">{areaM2Calculada.toFixed(2)} m²</span></p>
                        <p>• Cantidad solicitada: <span className="font-bold text-zinc-800 dark:text-zinc-200">{conCantidad || 1} pza(s)</span></p>
                      </div>
                      <div className="bg-white/40 dark:bg-zinc-950/40 p-2.5 rounded-lg border border-violet-500/10 text-[11px] space-y-1.5 shadow-sm">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-500 font-medium">Precio Venta (Subtotal sin IVA):</span>
                          <span className="font-bold text-violet-600 dark:text-violet-400">
                            ${precioSugeridoAnticiclonica.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </span>
                        </div>
                        <div className="flex justify-between items-center border-t border-violet-500/10 pt-1.5">
                          <span className="text-zinc-500 font-bold">Total Sugerido (con IVA):</span>
                          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                            ${precioSugeridoAnticiclonicaConIva.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* REPORT DE NESTING EN CALIENTE (REACTIVO) */}
                  {liveNestingCalculation && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-600/20 p-4 rounded-xl space-y-2.5 text-xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold border-b border-emerald-600/20 pb-1.5">
                        <Check className="w-4 h-4" />
                        <span>Nesting Calculado de Insumos</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px] text-zinc-600 dark:text-zinc-400">
                        <p>• Costo Material Neto: <span className="font-bold text-zinc-800 dark:text-zinc-200">${liveNestingCalculation.costoMateriales} MXN</span></p>
                        <p>• Merma de Nesting: <span className="font-bold text-amber-600">${liveNestingCalculation.costoDesperdicio} MXN</span></p>
                      </div>

                      {liveNestingCalculation.nestingLinear && (
                        <div className="bg-white/60 dark:bg-zinc-950/40 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] space-y-0.5">
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">Optimización de Aluminio (1D):</p>
                          <p>· Tramos requeridos: <span className="font-bold text-zinc-800 dark:text-zinc-200">{liveNestingCalculation.nestingLinear.barrasTotalesRequeridas} barras de 6.10m</span></p>
                          <p>· Eficiencia Global: <span className="font-bold text-emerald-600 dark:text-emerald-400">{liveNestingCalculation.nestingLinear.porcentajeEficienciaGlobal}%</span></p>
                        </div>
                      )}

                      {liveNestingCalculation.nestingGlass && (
                        <div className="bg-white/60 dark:bg-zinc-950/40 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 text-[10px] space-y-0.5">
                          <p className="font-bold text-zinc-700 dark:text-zinc-300">Optimización de Vidrio (2D):</p>
                          <p>· Planchas requeridas: <span className="font-bold text-zinc-800 dark:text-zinc-200">{liveNestingCalculation.nestingGlass.planchasTotalesRequeridas} planchas (3x2m)</span></p>
                          <p>· Eficiencia Global: <span className="font-bold text-emerald-600 dark:text-emerald-400">{liveNestingCalculation.nestingGlass.porcentajeEficienciaGlobal}%</span></p>
                        </div>
                      )}
                    </div>
                  )}

                  {liveNestingError && (
                    <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                      <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Error de Cálculo / Nesting:</p>
                        <p className="mt-0.5 leading-relaxed">{liveNestingError}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!liveNestingCalculation}
                      onClick={addConcepto}
                      className={`flex-1 flex items-center justify-center gap-2 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl transition-all text-sm ${
                        editingConceptIdx !== null
                          ? "bg-violet-600 hover:bg-violet-700 shadow-sm shadow-violet-500/20"
                          : "bg-zinc-800 hover:bg-zinc-900"
                      }`}
                    >
                      {editingConceptIdx !== null ? (
                        <>
                          <Check className="w-4 h-4" />
                          Guardar Cambios
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Confirmar e Insertar Partida
                        </>
                      )}
                    </button>
                    
                    {editingConceptIdx !== null && (
                      <button
                        type="button"
                        onClick={cancelEditConcepto}
                        className="bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold py-2.5 px-4 rounded-xl text-sm transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </div>

                {/* Listado Partidas Temporales */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Conceptos en esta Cotización</p>
                  {conceptosTemp.length === 0 ? (
                    <p className="text-xs text-zinc-400 text-center py-4 italic">No has agregado conceptos a la cotización.</p>
                  ) : (
                    conceptosTemp.map((c, idx) => {
                      const esAnticiclonica = 
                        c.tipoTrabajo === "cortina" || 
                        c.tipoTrabajo === "ventana_anticiclonica" || 
                        c.descripcion.toLowerCase().includes("anticicl") || 
                        c.descripcion.toLowerCase().includes("anticil") || 
                        c.descripcion.toLowerCase().includes("ciclonic") || 
                        c.descripcion.toLowerCase().includes("cilonic");
                      let precioDynamic = 0;
                      if (esAnticiclonica) {
                        const PRECIO_M2_ANTICICLONICA = 4950;
                        const precioM2Base = PRECIO_M2_ANTICICLONICA;
                        const areaM2 = (c.ancho * c.alto) / 1000000;
                        const totalPartidaConIva = Math.round(areaM2 * (precioM2Base * (1 + margenUtilidadPct)) * c.cantidad * 100) / 100;
                        precioDynamic = Math.round((totalPartidaConIva / 1.16) * 100) / 100;
                      } else {
                        const sub = c.costoMateriales + c.costoDesperdicio + c.costoManoObra;
                        precioDynamic = Math.round(sub * (1 + margenUtilidadPct) * 100) / 100;
                      }

                      return (
                        <div 
                          key={idx} 
                          className={`flex justify-between items-center px-4 py-3 rounded-xl text-xs border transition-all ${
                            editingConceptIdx === idx
                              ? "bg-violet-50/70 dark:bg-violet-950/20 border-violet-500 dark:border-violet-500 shadow-sm ring-1 ring-violet-500"
                              : "bg-zinc-50 dark:bg-zinc-900 border-zinc-100 dark:border-zinc-800"
                          }`}
                        >
                          <div>
                            <p className="font-bold text-zinc-800 dark:text-zinc-200">{c.descripcion}</p>
                            <p className="text-[10px] text-zinc-400">
                              {(c.ancho / 1000).toFixed(2)}×{(c.alto / 1000).toFixed(2)}m | {c.cantidad} pza(s) · {
                                c.nestingLinear && c.nestingGlass
                                  ? 'Híbrido'
                                  : c.nestingLinear
                                    ? 'Aluminio'
                                    : 'Vidrio'
                              } ({c.tipoTrabajo.toUpperCase()})
                            </p>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="font-bold text-zinc-700 dark:text-zinc-300">
                              ${precioDynamic.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                            </span>
                            <button
                              type="button"
                              onClick={() => startEditConcepto(idx)}
                              title="Editar partida"
                              className="text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/20 p-1.5 rounded-lg transition-colors cursor-pointer"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeConcepto(idx)}
                              className="text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 p-1.5 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* SECCIÓN 3: CIERRE FINANCIERO Y CONTROL DE MARGEN (debajo de la cotización) */}
              <div className="space-y-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl">
                <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                  <Percent className="w-4 h-4" /> 3. Configuración y Margen de Utilidad
                </h4>

                {/* Slider de Utilidad comercial */}
                <div className="space-y-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 p-4 rounded-2xl shadow-inner">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-zinc-400 uppercase">Margen Comercial:</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="200"
                        step="1"
                        value={isNaN(margenUtilidadPct) ? 0 : Math.round(margenUtilidadPct * 100)}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            setMargenUtilidadPct(val / 100);
                          } else {
                            setMargenUtilidadPct(0);
                          }
                        }}
                        className="w-16 px-2 py-1 border border-zinc-200 dark:border-zinc-800 rounded-lg text-right font-black text-emerald-600 dark:text-emerald-400 text-sm bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="font-bold text-zinc-500 text-sm">%</span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.00"
                    max="1.50"
                    step="0.01"
                    value={margenUtilidadPct}
                    onChange={(e) => setMargenUtilidadPct(parseFloat(e.target.value))}
                    className="w-full h-2 bg-zinc-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[9px] text-zinc-400 font-bold">
                    <span>0% (Precio Base: $4,950)</span>
                    <span>100% (Doble Costo)</span>
                    <span>150% (Máximo)</span>
                  </div>
                </div>

                {/* Resumen del Cierre */}
                <div className="space-y-3">
                  <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Desglose Financiero</p>
                  
                  <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Costo Material Neto:</span>
                      <span>${quoteSummary.costoMaterial.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-amber-600 font-semibold">
                      <span>Costo Desperdicio (Nesting):</span>
                      <span>${quoteSummary.costoDesperdicio.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>Mano de Obra Directa:</span>
                      <span>${quoteSummary.costoManoObra.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-800 dark:text-zinc-200 font-black border-t border-dashed border-zinc-200 pt-2">
                      <span>Costo Acumulado (Fábrica):</span>
                      <span>${quoteSummary.subtotal.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-zinc-500 font-semibold">
                      <span>Precio Venta Sugerido:</span>
                      <span>${quoteSummary.precioSugerido.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    {quoteSummary.flete > 0 && (
                      <div className="flex justify-between text-cyan-600 dark:text-cyan-400 font-semibold">
                        <span>Costo Flete (Logística):</span>
                        <span>${quoteSummary.flete.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-zinc-500 font-medium">
                      <span>IVA Trasladado (16%):</span>
                      <span>${quoteSummary.iva.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                    </div>
                    
                    <div className="flex justify-between text-base font-black text-zinc-900 dark:text-white border-t border-zinc-200 pt-2">
                      <span>Total de Cotización:</span>
                      <span className="text-emerald-600">${quoteSummary.total.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN</span>
                    </div>
                  </div>
                </div>

                {/* Botones */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsFormOpen(false);
                      setEditingQuoteId(null);
                    }}
                    className="bg-zinc-200 hover:bg-zinc-300 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200 py-2.5 px-5 rounded-xl font-bold text-sm transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={!clienteId || conceptosTemp.length === 0}
                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-sm shadow-emerald-500/20 text-sm flex items-center gap-2"
                  >
                    <span>{editingQuoteId ? "Actualizar Cotización" : "Guardar Cotización"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
      {/* =========================================================================
          MODAL: CARGAR EVIDENCIA FOTOGRÁFICA MÚLTIPLE (GALERÍA/URL)
          ========================================================================= */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl p-6 space-y-5 flex flex-col text-xs">
            
            {/* Header del Modal */}
            <div className="flex justify-between items-center border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-zinc-950 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <UploadCloud className="w-5 h-5 text-emerald-600" />
                Cargar Imágenes: Evidencias de Obra (Área)
              </h3>
              <button 
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadUrlsSelected([]);
                }} 
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Opción 1: Subir por URL personalizada */}
            <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800 space-y-2 text-left">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block">
                Opción A: Agregar foto mediante URL de Imagen
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej: https://mi-servidor.com/imagen.jpg"
                  value={customImageUrl}
                  onChange={(e) => setCustomImageUrl(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-emerald-600 text-zinc-900 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleAddCustomImageUrl}
                  className="bg-zinc-800 hover:bg-zinc-900 text-white font-bold py-2 px-4 rounded-xl"
                >
                  Agregar URL
                </button>
              </div>
            </div>

            {/* Opción 2: Galería de Selección Múltiple */}
            <div className="space-y-2.5 flex-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block text-left">
                Opción B: Selecciona una o más fotos de la galería del dispositivo (Múltiple)
              </label>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 overflow-y-auto max-h-[300px] p-0.5">
                {GALERIA_FOTOS_EVIDENCIA.map((foto) => {
                  const isSelected = uploadUrlsSelected.includes(foto.url);
                  return (
                    <div
                      key={foto.id}
                      onClick={() => toggleUploadFotoSelection(foto.url)}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        isSelected 
                          ? "border-emerald-500 ring-2 ring-emerald-500/20" 
                          : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-400"
                      }`}
                    >
                      <img src={foto.url} alt={foto.label} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-2">
                        <span className="text-[9px] font-black text-white truncate w-full">{foto.label}</span>
                      </div>
                      
                      {/* Check indicador */}
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white p-1 rounded-full shadow-md">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resumen de Seleccionados */}
            {uploadUrlsSelected.length > 0 && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-600/20 p-3 rounded-xl flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-400">
                  {uploadUrlsSelected.length} imágenes seleccionadas listas para subir.
                </span>
                <button
                  type="button"
                  onClick={() => setUploadUrlsSelected([])}
                  className="text-red-500 hover:underline font-bold"
                >
                  Limpiar Selección
                </button>
              </div>
            )}

            {/* Acciones */}
            <div className="flex justify-end gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-3">
              <button
                type="button"
                onClick={() => {
                  setIsUploadModalOpen(false);
                  setUploadUrlsSelected([]);
                }}
                className="bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 font-bold px-4 py-2 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPhotosUpload}
                disabled={uploadUrlsSelected.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2 rounded-xl shadow-sm disabled:opacity-55"
              >
                Subir Fotos Seleccionadas
              </button>
            </div>

          </div>
        </div>
      )}

      {/* DIÁLOGO PREMIUM DE CONFIRMACIÓN (APROBAR/ELIMINAR) */}
      {confirmDialog.isOpen && confirmDialog.quote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-md p-6 space-y-6 transform scale-100 transition-all">
            
            <div className="text-center space-y-3">
              {/* Círculo de ícono dinámico */}
              <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full ${
                confirmDialog.tipo === "eliminar" 
                  ? "bg-red-50 dark:bg-red-950/30 text-red-500 border border-red-200/50 dark:border-red-900/50" 
                  : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-200/50 dark:border-emerald-900/50"
              }`}>
                {confirmDialog.tipo === "eliminar" ? (
                  <ShieldAlert className="h-6 w-6" />
                ) : (
                  <Check className="h-6 w-6" />
                )}
              </div>
              
              <h3 className="text-lg font-black text-zinc-900 dark:text-white uppercase tracking-wider text-xs">
                {confirmDialog.tipo === "eliminar" ? "Confirmar Eliminación" : "Confirmar Aprobación"}
              </h3>
              
              <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium leading-relaxed">
                {confirmDialog.tipo === "eliminar" ? (
                  <>
                    ¿Estás seguro de que deseas eliminar la cotización <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{confirmDialog.quote.folio}</span> del cliente <span className="font-extrabold text-zinc-800 dark:text-zinc-200">"{confirmDialog.quote.clienteNombre}"</span>? Esta acción es permanente y no se podrá deshacer.
                  </>
                ) : (
                  <>
                    ¿Estás seguro de que deseas aprobar la cotización <span className="font-extrabold text-zinc-800 dark:text-zinc-200">{confirmDialog.quote.folio}</span> del cliente <span className="font-extrabold text-zinc-800 dark:text-zinc-200">"{confirmDialog.quote.clienteNombre}"</span>? Esto generará automáticamente su respectiva orden de taller y guardará las hojas de cálculo en Drive.
                  </>
                )}
              </p>
            </div>

            {/* Botones de acción */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDialog({ isOpen: false, tipo: "aprobar", quote: null })}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  const q = confirmDialog.quote;
                  if (q) {
                    if (confirmDialog.tipo === "eliminar") {
                      eliminarCotizacion(q.id);
                      registrarActividad(
                        "quotes",
                        "eliminar",
                        `Eliminó la cotización ${q.folio} del cliente: ${q.clienteNombre}`
                      );
                      if (selectedQuoteId === q.id) {
                        setSelectedQuoteId(null);
                      }
                    } else {
                      handleAprobarCotizacion(q);
                    }
                  }
                  setConfirmDialog({ isOpen: false, tipo: "aprobar", quote: null });
                }}
                className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-black text-white shadow-md transition-colors ${
                  confirmDialog.tipo === "eliminar"
                    ? "bg-red-600 hover:bg-red-700 shadow-red-500/10"
                    : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10"
                }`}
              >
                {confirmDialog.tipo === "eliminar" ? "Confirmar y Eliminar" : "Confirmar y Aprobar"}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
}
