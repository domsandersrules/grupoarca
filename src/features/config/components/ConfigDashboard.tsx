"use client";

import React, { useState, useRef } from "react";
import { 
  Building2, Store, Paintbrush, Upload, Plus, Edit3, 
  Trash2, Check, X, Save, ShieldAlert, Laptop, Moon, Sun, 
  Mail, Phone, Info, Globe, LayoutDashboard
} from "lucide-react";
import { useConfigStore, EmpresaConfig, SucursalConfig, KpiConfig, ParametrosCotizacion } from "@/features/config/configStore";
import { useAuthStore } from "@/features/auth/authStore";

/**
 * Módulo de Configuración Principal para Grupo Arca 2.0.
 * Permite editar los datos generales de la empresa, subir logos en base64,
 * administrar sucursales dinámicamente y alternar entre temas claro/oscuro.
 */
export default function ConfigDashboard() {
  const { empresa, sucursales, tema, kpisConfig, parametrosCotizacion, toggleKpiVisibilidad, actualizarEmpresa, agregarSucursal, actualizarSucursal, eliminarSucursal, setTema, actualizarParametrosCotizacion } = useConfigStore();
  const { registrarActividad, usuarioActivo } = useAuthStore();
  
  // Pestaña activa
  const [activeTab, setActiveTab] = useState<"empresa" | "sucursales" | "preferencias" | "dashboard-kpis">("empresa");
  
  // Mensajes de retroalimentación
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // --- ESTADOS LOCALES: EMPRESA ---
  const [empresaForm, setEmpresaForm] = useState<EmpresaConfig>({ ...empresa });
  const [tempLogo, setTempLogo] = useState<string>(empresa.logoUrl || "");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- ESTADOS LOCALES: PARÁMETROS DE COTIZACIÓN ---
  const [paramsForm, setParamsForm] = useState<ParametrosCotizacion>({ ...parametrosCotizacion });

  // --- ESTADOS LOCALES: SUCURSALES ---
  const [isSucursalModalOpen, setIsSucursalModalOpen] = useState(false);
  const [editingSucursal, setEditingSucursal] = useState<SucursalConfig | null>(null);
  const [sucursalForm, setSucursalForm] = useState<Omit<SucursalConfig, "id">>({
    nombre: "",
    calle: "",
    numero: "",
    colonia: "",
    municipio: "",
    estado: "",
    codigoPostal: "",
    telefono: "",
    whatsapp: "",
    correo: "",
    encargado: "",
    activa: true
  });
  
  // Buscar en sucursales
  const [searchTerm, setSearchTerm] = useState("");

  // --- HANDLERS: EMPRESA ---
  const handleEmpresaFieldChange = (field: keyof EmpresaConfig, value: any) => {
    setEmpresaForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEmpresa = (e: React.FormEvent) => {
    e.preventDefault();
    actualizarEmpresa({
      ...empresaForm,
      logoUrl: tempLogo
    });
    
    registrarActividad(
      "quotes",
      "modificar",
      `Actualizó los datos generales de la empresa y configuración en el panel`
    );

    triggerSuccessAlert("¡Configuración de la empresa guardada con éxito!");
  };

  const triggerSuccessAlert = (message: string) => {
    setSaveSuccess(message);
    setTimeout(() => {
      setSaveSuccess(null);
    }, 4000);
  };

  // Convertir archivo subido a Base64
  const processFile = (file: File) => {
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setTempLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // --- HANDLERS: SUCURSALES ---
  const handleOpenNewSucursal = () => {
    setEditingSucursal(null);
    setSucursalForm({
      nombre: "",
      calle: "",
      numero: "",
      colonia: "",
      municipio: "",
      estado: "Guerrero",
      codigoPostal: "",
      telefono: "",
      whatsapp: "",
      correo: "",
      encargado: "",
      activa: true
    });
    setIsSucursalModalOpen(true);
  };

  const handleOpenEditSucursal = (suc: SucursalConfig) => {
    setEditingSucursal(suc);
    setSucursalForm({ ...suc });
    setIsSucursalModalOpen(true);
  };

  const handleSaveSucursal = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingSucursal) {
      actualizarSucursal(editingSucursal.id, sucursalForm);
      registrarActividad(
        "quotes",
        "modificar",
        `Modificó datos de la sucursal: ${sucursalForm.nombre}`
      );
      triggerSuccessAlert(`Sucursal "${sucursalForm.nombre}" actualizada con éxito.`);
    } else {
      agregarSucursal(sucursalForm);
      registrarActividad(
        "quotes",
        "crear",
        `Creó una nueva sucursal: ${sucursalForm.nombre}`
      );
      triggerSuccessAlert(`Sucursal "${sucursalForm.nombre}" creada e integrada.`);
    }
    setIsSucursalModalOpen(false);
  };

  const handleToggleSucursalActiva = (suc: SucursalConfig) => {
    actualizarSucursal(suc.id, { activa: !suc.activa });
    registrarActividad(
      "quotes",
      "modificar",
      `${suc.activa ? "Desactivó" : "Activó"} la sucursal: ${suc.nombre}`
    );
    triggerSuccessAlert(`Sucursal "${suc.nombre}" ${suc.activa ? "desactivada" : "activada"} correctamente.`);
  };

  const handleDeleteSucursal = (id: string, nombre: string) => {
    if (confirm(`¿Estás seguro de que deseas eliminar permanentemente la sucursal "${nombre}"? Esta acción no se puede deshacer.`)) {
      eliminarSucursal(id);
      registrarActividad(
        "quotes",
        "eliminar",
        `Eliminó permanentemente la sucursal: ${nombre}`
      );
      triggerSuccessAlert(`Sucursal "${nombre}" eliminada con éxito.`);
    }
  };

  const filteredSucursales = sucursales.filter((s) => 
    s.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.encargado.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.municipio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-[95vw] 2xl:max-w-[1500px] mx-auto px-4 md:px-8 space-y-6">
      
      {/* Alerta de Éxito Flotante */}
      {saveSuccess && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 bg-emerald-600 text-white font-bold py-3 px-6 rounded-2xl shadow-xl shadow-emerald-500/10 border border-emerald-500/20 animate-bounce">
          <Check className="w-5 h-5 shrink-0" />
          <span className="text-sm">{saveSuccess}</span>
        </div>
      )}

      {/* Encabezado */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors duration-300">
        <div className="space-y-1">
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white uppercase tracking-wider">
            Configuración General
          </h1>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
            Administra los datos de la empresa, sucursales y la personalización visual de tu Suite de Ingeniería.
          </p>
        </div>
        
        {/* Pestañas / Tabs */}
        <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-950 p-1.5 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/50">
          <button
            onClick={() => setActiveTab("empresa")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "empresa"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md shadow-zinc-200/50 dark:shadow-none"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <Building2 className="w-4 h-4" />
            Empresa
          </button>
          <button
            onClick={() => setActiveTab("sucursales")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "sucursales"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md shadow-zinc-200/50 dark:shadow-none"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <Store className="w-4 h-4" />
            Sucursales
          </button>
          <button
            onClick={() => setActiveTab("preferencias")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "preferencias"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md shadow-zinc-200/50 dark:shadow-none"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <Paintbrush className="w-4 h-4" />
            Tema & Preferencias
          </button>
          <button
            onClick={() => setActiveTab("dashboard-kpis")}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === "dashboard-kpis"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-md shadow-zinc-200/50 dark:shadow-none"
                : "text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Personalizar Dashboard
          </button>
        </div>
      </div>

      {/* Contenido Dinámico según pestaña */}
      <div className="transition-all duration-300">
        
        {/* TABS 1: PERFIL DE LA EMPRESA */}
        {activeTab === "empresa" && (
          <form onSubmit={handleSaveEmpresa} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Columna Izquierda: Logo y Previsualización */}
            <div className="bg-white dark:bg-zinc-900 p-6 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6 flex flex-col items-center">
              <div className="w-full text-left">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-2 flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-500" />
                  Logo Corporativo
                </h2>
                <p className="text-[10px] text-zinc-400 mt-1">Sube una imagen de tu logotipo corporativo en formato PNG, JPG o SVG.</p>
              </div>

              {/* Contenedor Preview */}
              <div className="relative group w-44 h-44 rounded-3xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 flex flex-col items-center justify-center p-3 overflow-hidden bg-zinc-50 dark:bg-zinc-950/60 shadow-inner">
                {tempLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={tempLogo} alt="Logo Empresa" className="max-w-full max-h-full object-contain rounded-xl" />
                ) : (
                  <div className="text-center text-zinc-400 space-y-1.5 p-3">
                    <Building2 className="w-10 h-10 mx-auto opacity-40 text-emerald-500" />
                    <span className="text-[9px] font-bold block leading-tight">Sin logo cargado</span>
                  </div>
                )}
                {tempLogo && (
                  <button
                    type="button"
                    onClick={() => setTempLogo("")}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none hover:bg-red-600 shadow-md shadow-red-500/20"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Zona de Drop para Carga de Imagen */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full py-6 px-4 rounded-2xl border border-dashed text-center cursor-pointer transition-all ${
                  dragOver 
                    ? "bg-emerald-50/50 border-emerald-500 text-emerald-600 dark:bg-emerald-950/20" 
                    : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
                }`}
              >
                <Upload className="w-5 h-5 mx-auto mb-1.5 text-zinc-400" />
                <span className="text-xs font-bold block">Arrastra una imagen aquí</span>
                <span className="text-[10px] text-zinc-400 block mt-0.5">o haz clic para explorar</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLogoUploadChange} 
                  accept="image/*" 
                  className="hidden" 
                />
              </div>

              {/* Nota sobre Logotipos Personalizados */}
              <div className="w-full bg-zinc-50 dark:bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-[10px] text-zinc-500 space-y-1 text-left">
                <span className="font-bold text-zinc-700 dark:text-zinc-300 block">Formato Recomendado:</span>
                <p className="leading-relaxed">Se sugiere utilizar imágenes con fondo transparente (PNG o SVG) para que se integren de forma estética en todos los membretes oficiales, cotizaciones y firmas de correo electrónico.</p>
              </div>
            </div>

            {/* Columna Derecha: Formulario General */}
            <div className="lg:col-span-2 bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest border-b border-zinc-100 dark:border-zinc-800 pb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-500" />
                Información Comercial y Fiscal
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Nombre Comercial:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.nombreComercial}
                    onChange={(e) => handleEmpresaFieldChange("nombreComercial", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Razón Social:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.razonSocial}
                    onChange={(e) => handleEmpresaFieldChange("razonSocial", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">RFC:</label>
                  <input
                    type="text"
                    required
                    maxLength={13}
                    value={empresaForm.rfc}
                    onChange={(e) => handleEmpresaFieldChange("rfc", e.target.value.toUpperCase())}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black uppercase text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Proveedor Certificado de Aluminio:</label>
                  <input
                    type="text"
                    value={empresaForm.proveedorCertificado}
                    onChange={(e) => handleEmpresaFieldChange("proveedorCertificado", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-2 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5" />
                Dirección Fiscal / Matriz
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Calle:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.calle}
                    onChange={(e) => handleEmpresaFieldChange("calle", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Número:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.numero}
                    onChange={(e) => handleEmpresaFieldChange("numero", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Colonia:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.colonia}
                    onChange={(e) => handleEmpresaFieldChange("colonia", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Municipio / Alcaldía:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.municipio}
                    onChange={(e) => handleEmpresaFieldChange("municipio", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Estado:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.estado}
                    onChange={(e) => handleEmpresaFieldChange("estado", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Código Postal:</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={empresaForm.codigoPostal}
                    onChange={(e) => handleEmpresaFieldChange("codigoPostal", e.target.value.replace(/\D/g, ""))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-widest"
                  />
                </div>
              </div>

              <h3 className="text-xs font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest pt-2 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                Medios de Contacto
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Teléfono Oficina:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.telefono}
                    onChange={(e) => handleEmpresaFieldChange("telefono", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">WhatsApp Oficial:</label>
                  <input
                    type="text"
                    required
                    value={empresaForm.whatsapp}
                    onChange={(e) => handleEmpresaFieldChange("whatsapp", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={empresaForm.correo}
                    onChange={(e) => handleEmpresaFieldChange("correo", e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Botón Guardar */}
              <div className="flex justify-end pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-2xl transition-all shadow-md shadow-emerald-500/10 text-xs focus:outline-none cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  Guardar Datos de Empresa
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TABS 2: GESTIÓN DE SUCURSALES */}
        {activeTab === "sucursales" && (
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-500" />
                  Sucursales Autorizadas
                </h2>
                <p className="text-[10px] text-zinc-400">Administra los puntos de venta y talleres de fabricación del grupo.</p>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Buscar sucursal..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 w-44 md:w-60"
                />
                <button
                  onClick={handleOpenNewSucursal}
                  className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl transition-all text-xs focus:outline-none"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Sucursal
                </button>
              </div>
            </div>

            {/* Listado de Sucursales */}
            <div className="overflow-x-auto border border-zinc-200/60 dark:border-zinc-800 rounded-2xl shadow-inner bg-zinc-50/50 dark:bg-zinc-950/20">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-950 text-zinc-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="px-6 py-4">Nombre Sucursal</th>
                    <th className="px-6 py-4">Dirección</th>
                    <th className="px-6 py-4">Contacto</th>
                    <th className="px-6 py-4">Encargado</th>
                    <th className="px-6 py-4 text-center">Estatus</th>
                    <th className="px-6 py-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50">
                  {filteredSucursales.length > 0 ? (
                    filteredSucursales.map((suc) => (
                      <tr 
                        key={suc.id} 
                        className={`hover:bg-zinc-50 dark:hover:bg-zinc-900/40 transition-colors ${
                          !suc.activa ? "opacity-60" : ""
                        }`}
                      >
                        <td className="px-6 py-4 font-black text-zinc-800 dark:text-zinc-100">
                          <span className="flex items-center gap-2">
                            <Store className="w-4 h-4 text-zinc-400 shrink-0" />
                            {suc.nombre}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-500 dark:text-zinc-400 leading-normal">
                          {suc.calle} #{suc.numero}, Col. {suc.colonia}, {suc.municipio}, {suc.estado}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 dark:text-zinc-300">
                          <div className="space-y-0.5">
                            <p className="font-semibold">{suc.telefono}</p>
                            <p className="text-[10px] text-zinc-400">{suc.correo}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-700 dark:text-zinc-300 font-bold">
                          {suc.encargado}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleSucursalActiva(suc)}
                            className={`mx-auto inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-[9px] font-black uppercase tracking-wider border focus:outline-none transition-all ${
                              suc.activa 
                                ? "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border-emerald-200/50 dark:border-emerald-900/30" 
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${suc.activa ? "bg-emerald-500" : "bg-zinc-400"}`}></span>
                            {suc.activa ? "Activa" : "Inactiva"}
                          </button>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="inline-flex items-center gap-1 bg-white dark:bg-zinc-950 p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm">
                            <button
                              onClick={() => handleOpenEditSucursal(suc)}
                              title="Editar datos de sucursal"
                              className="p-1.5 text-zinc-500 hover:text-emerald-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors focus:outline-none"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteSucursal(suc.id, suc.nombre)}
                              title="Eliminar sucursal"
                              className="p-1.5 text-zinc-500 hover:text-red-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 rounded-lg transition-colors focus:outline-none"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-zinc-400 dark:text-zinc-500 font-bold space-y-1.5">
                        <Store className="w-8 h-8 mx-auto opacity-30 text-emerald-500" />
                        <p>No se encontraron sucursales registradas</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TABS 3: PREFERENCIAS & TEMA */}
        {activeTab === "preferencias" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Columna Izquierda: Tema */}
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Paintbrush className="w-4 h-4 text-emerald-500" />
                  Tema de la Aplicación
                </h2>
                <p className="text-[10px] text-zinc-400">Personaliza la apariencia visual de la suite.</p>
              </div>

              {/* Grid Selector de Tema */}
              <div className="grid grid-cols-3 gap-4">
                
                {/* Claro */}
                <button
                  type="button"
                  onClick={() => setTema("light")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all focus:outline-none ${
                    tema === "light"
                      ? "bg-emerald-50/20 border-emerald-500 dark:bg-emerald-950/10 text-emerald-600 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Sun className={`w-8 h-8 ${tema === "light" ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-600"}`} />
                  <div className="space-y-0.5">
                    <span className="text-xs font-black block">Claro</span>
                    <span className="text-[9px] text-zinc-400 block font-semibold leading-none">Modo diurno</span>
                  </div>
                </button>

                {/* Oscuro */}
                <button
                  type="button"
                  onClick={() => setTema("dark")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all focus:outline-none ${
                    tema === "dark"
                      ? "bg-emerald-50/20 border-emerald-500 dark:bg-emerald-950/10 text-emerald-600 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Moon className={`w-8 h-8 ${tema === "dark" ? "text-emerald-400" : "text-zinc-400 dark:text-zinc-600"}`} />
                  <div className="space-y-0.5">
                    <span className="text-xs font-black block">Oscuro</span>
                    <span className="text-[9px] text-zinc-400 block font-semibold leading-none">Modo nocturno</span>
                  </div>
                </button>

                {/* Sistema */}
                <button
                  type="button"
                  onClick={() => setTema("system")}
                  className={`flex flex-col items-center gap-3 p-5 rounded-2xl border text-center transition-all focus:outline-none ${
                    tema === "system"
                      ? "bg-emerald-50/20 border-emerald-500 dark:bg-emerald-950/10 text-emerald-600 shadow-sm"
                      : "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900"
                  }`}
                >
                  <Laptop className={`w-8 h-8 ${tema === "system" ? "text-emerald-500" : "text-zinc-400 dark:text-zinc-600"}`} />
                  <div className="space-y-0.5">
                    <span className="text-xs font-black block">Automático</span>
                    <span className="text-[9px] text-zinc-400 block font-semibold leading-none">Sincroniza con SO</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Columna Derecha: Parámetros de Cotización — FUNCIONAL */}
            <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
              <div className="space-y-0.5">
                <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4 text-emerald-500" />
                  Parámetros de Cotización y Ventas
                </h2>
                <p className="text-[10px] text-zinc-400">Establece límites y valores comerciales para tus vendedores. Cambios se aplican en tiempo real al cotizador.</p>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  actualizarParametrosCotizacion(paramsForm);
                  triggerSuccessAlert("¡Parámetros de cotización guardados con éxito!");
                }}
                className="space-y-5"
              >
                <div className="grid grid-cols-2 gap-4">

                  {/* Margen Comercial */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Margen Comercial Sugerido (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={paramsForm.margenComercial}
                        onChange={(e) => setParamsForm(p => ({ ...p, margenComercial: Number(e.target.value) }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-black text-zinc-400">%</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block">Margen estándar al agregar conceptos de venta</span>
                  </div>

                  {/* IVA */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      IVA Aplicable (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={0.5}
                        value={paramsForm.ivaAplicable}
                        onChange={(e) => setParamsForm(p => ({ ...p, ivaAplicable: Number(e.target.value) }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-black text-zinc-400">%</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block">Tasa impositiva en territorio mexicano (SAT)</span>
                  </div>

                  {/* Descuento Máximo */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Descuento Máx. Vendedor (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={50}
                        step={0.5}
                        value={paramsForm.descuentoMaxVendedor}
                        onChange={(e) => setParamsForm(p => ({ ...p, descuentoMaxVendedor: Number(e.target.value) }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-black text-zinc-400">%</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block">Por encima de este % requiere autorización admin</span>
                  </div>

                  {/* Vigencia */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Vigencia Cotización (días)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        step={1}
                        value={paramsForm.vigenciaCotizacionDias}
                        onChange={(e) => setParamsForm(p => ({ ...p, vigenciaCotizacionDias: Number(e.target.value) }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-14 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-[10px] font-black text-zinc-400">días</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block">Tiempo de validez predeterminado en cotizaciones</span>
                  </div>

                  {/* Anticipo Mínimo */}
                  <div className="col-span-2 space-y-1.5">
                    <label className="block text-xs font-bold text-zinc-500 dark:text-zinc-400">
                      Anticipo Mínimo para Iniciar Fabricación (%)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={5}
                        value={paramsForm.anticipoMinimo}
                        onChange={(e) => setParamsForm(p => ({ ...p, anticipoMinimo: Number(e.target.value) }))}
                        className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 pr-10 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      <span className="absolute right-3 top-2.5 text-xs font-black text-zinc-400">%</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 block">Porcentaje de anticipo mínimo requerido para enviar la orden al taller</span>
                  </div>

                </div>

                {/* Botón Guardar */}
                <div className="flex justify-end pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-6 rounded-2xl transition-all shadow-md shadow-emerald-500/10 text-xs focus:outline-none cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Guardar Parámetros
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Pestaña: Personalizar Dashboard */}
        {activeTab === "dashboard-kpis" && (
          <div className="bg-white dark:bg-zinc-900 p-6 md:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="space-y-0.5 text-left">
              <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200 uppercase tracking-widest flex items-center gap-2">
                <LayoutDashboard className="w-4.5 h-4.5 text-emerald-500" />
                Personalizar Indicadores del Dashboard
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                Activa o desactiva qué métricas clave (KPIs) e históricos deseas visualizar en la pantalla de inicio.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              {(kpisConfig || []).map((kpi) => {
                // Color según categoría
                const categoryColors = 
                  kpi.categoria === "ventas" ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 dark:bg-emerald-950/10" :
                  kpi.categoria === "crm" ? "border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5 dark:bg-blue-950/10" :
                  kpi.categoria === "taller" ? "border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/5 dark:bg-amber-950/10" :
                  kpi.categoria === "logistica" ? "border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/5 dark:bg-purple-950/10" :
                  "border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/5 dark:bg-rose-950/10";

                return (
                  <div 
                    key={kpi.id} 
                    className={`p-5 rounded-2xl border transition-all duration-300 flex flex-col justify-between space-y-4 ${
                      kpi.visible
                        ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm hover:border-emerald-500/40"
                        : "bg-zinc-50/50 dark:bg-zinc-950/40 border-zinc-200/40 dark:border-zinc-900 opacity-60"
                    }`}
                  >
                    <div className="space-y-2 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider border ${categoryColors}`}>
                          {kpi.categoria}
                        </span>
                        
                        {/* Switch Premium */}
                        <button
                          type="button"
                          onClick={() => toggleKpiVisibilidad(kpi.id)}
                          className={`w-9 h-5 rounded-full relative transition-all duration-300 cursor-pointer focus:outline-none ${
                            kpi.visible ? "bg-emerald-600" : "bg-zinc-200 dark:bg-zinc-800"
                          }`}
                        >
                          <span className={`w-3.5 h-3.5 rounded-full bg-white absolute top-0.75 transition-all duration-300 ${
                            kpi.visible ? "left-4.75" : "left-0.75"
                          }`} />
                        </button>
                      </div>

                      <h3 className="text-xs font-black text-zinc-950 dark:text-white leading-tight">
                        {kpi.nombre}
                      </h3>
                      <p className="text-[10.5px] text-zinc-400 leading-normal font-semibold">
                        {kpi.descripcion}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* --- MODAL PARA AGREGAR/EDITAR SUCURSALES --- */}
      {isSucursalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl w-full max-w-xl p-6 space-y-6 transform scale-100 transition-all">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <Store className="w-5 h-5 text-emerald-500" />
                {editingSucursal ? "Editar Sucursal" : "Registrar Nueva Sucursal"}
              </h3>
              <button 
                type="button" 
                onClick={() => setIsSucursalModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSucursal} className="space-y-4 text-xs font-bold text-zinc-700 dark:text-zinc-300">
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 col-span-2">
                  <label className="block text-zinc-500 dark:text-zinc-400">Nombre de la Sucursal:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.nombre}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, nombre: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: Sucursal Norte (GDL)"
                  />
                </div>
              </div>

              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2">Dirección de la Sucursal</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2 space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Calle:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.calle}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, calle: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4.5 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Número:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.numero}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, numero: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Colonia:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.colonia}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, colonia: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Municipio:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.municipio}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, municipio: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Código Postal:</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={sucursalForm.codigoPostal}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, codigoPostal: e.target.value.replace(/\D/g, "") }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-black text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 tracking-wider"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Estado:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.estado}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, estado: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Nombre de Encargado:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.encargado}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, encargado: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-bold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Ej: Lic. Sofía Vergara"
                  />
                </div>
              </div>

              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest pt-2">Contacto de la Sucursal</p>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Teléfono:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.telefono}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, telefono: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">WhatsApp:</label>
                  <input
                    type="text"
                    required
                    value={sucursalForm.whatsapp}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-zinc-500 dark:text-zinc-400">Correo Electrónico:</label>
                  <input
                    type="email"
                    required
                    value={sucursalForm.correo}
                    onChange={(e) => setSucursalForm(prev => ({ ...prev, correo: e.target.value }))}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-xs font-semibold text-zinc-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSucursalModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors focus:outline-none"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 px-4 rounded-xl transition-all text-xs focus:outline-none"
                >
                  {editingSucursal ? "Actualizar Sucursal" : "Guardar Sucursal"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
